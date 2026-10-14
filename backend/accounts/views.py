import logging
import secrets
import time
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from django.db import IntegrityError, transaction
from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import RegisterSerializer, UserSerializer
from .otp import cache_key, limited, normalize_email

User = get_user_model()
logger = logging.getLogger(__name__)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate({**attrs, 'email': normalize_email(attrs.get('email'))})
        data['user'] = UserSerializer(self.user).data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


def error(message, code=400):
    return Response({'error': message}, status=code)


class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = normalize_email(request.data.get('email'))
        try:
            serializers.EmailField().run_validation(email)
        except serializers.ValidationError:
            return error('อีเมลไม่ถูกต้อง')
        ip = request.META.get('REMOTE_ADDR', '')
        if limited('send-ip', ip, 20, 3600) or limited('send-email', email, 5, 3600):
            return error('ขอรหัสบ่อยเกินไป กรุณาลองใหม่ภายหลัง', 429)
        if User.objects.filter(email__iexact=email).exists():
            return error('อีเมลนี้ถูกใช้งานในระบบแล้ว')
        if not cache.add(cache_key('cooldown', email), True, 60):
            return error('กรุณารอ 60 วินาทีก่อนขอรหัสใหม่', 429)
        otp = f'{secrets.randbelow(1000000):06d}'
        challenge_key = cache_key('challenge', email)
        cache.delete(challenge_key)
        try:
            sent = send_mail(
                subject='[SmartCourt ตึก 40 KMUTNB] รหัสยืนยันการสมัครสมาชิก',
                message=f'รหัส OTP ของคุณคือ: {otp}\nรหัสมีอายุ 5 นาที หากไม่ได้ขอรหัส กรุณาละเว้นอีเมลนี้',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email], fail_silently=False,
            )
            if sent != 1:
                raise RuntimeError('mail not delivered')
        except Exception:
            logger.warning('OTP email delivery failed')
            return error('ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่ภายหลัง', 503)
        cache.set(challenge_key, {'digest': cache_key('code', otp), 'attempts': 0, 'expires': time.time() + 300}, 300)
        return Response({'message': 'ส่งรหัส OTP เรียบร้อยแล้ว กรุณาตรวจสอบอีเมล', 'email': email, 'email_sent': True})


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = normalize_email(request.data.get('email'))
        otp = request.data.get('otp', '')
        if limited('verify-ip', request.META.get('REMOTE_ADDR', ''), 60, 600):
            return error('ตรวจสอบรหัสบ่อยเกินไป กรุณาลองใหม่ภายหลัง', 429)
        if not email or not isinstance(otp, str) or len(otp) != 6 or not otp.isascii() or not otp.isdigit():
            return error('กรุณาระบุอีเมลและรหัส OTP 6 หลัก')
        key = cache_key('challenge', email)
        lock = cache_key('verify-lock', email)
        if not cache.add(lock, True, 30):
            return error('กำลังตรวจสอบรหัส กรุณาลองอีกครั้ง', 429)
        try:
            challenge = cache.get(key)
            if not challenge or challenge['expires'] <= time.time():
                cache.delete(key)
                return error('รหัส OTP หมดอายุหรือถูกใช้แล้ว กรุณาขอรหัสใหม่')
            if not secrets.compare_digest(challenge['digest'], cache_key('code', otp)):
                attempts = challenge['attempts'] + 1
                if attempts >= 5:
                    cache.delete(key)
                    return error('กรอกรหัสผิดครบ 5 ครั้ง กรุณาขอรหัสใหม่', 429)
                cache.set(key, {**challenge, 'attempts': attempts}, timeout=max(1, challenge['expires'] - time.time()))
                return error('รหัส OTP ไม่ถูกต้อง')
            cache.delete(key)
            token = secrets.token_urlsafe(32)
            cache.set(cache_key('verified', token), email, 600)
            return Response({'message': 'ยืนยันรหัส OTP สำเร็จ', 'verification_token': token})
        finally:
            cache.delete(lock)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        email = normalize_email(request.data.get('email'))
        token = request.data.get('verification_token')
        if not isinstance(token, str) or len(token) > 128:
            return error('กรุณายืนยันอีเมลด้วย OTP ก่อนสมัครสมาชิก')
        key = cache_key('verified', token)
        if cache.get(key) != email:
            return error('กรุณายืนยันอีเมลด้วย OTP ก่อนสมัครสมาชิก')
        lock = cache_key('register-lock', token)
        if not cache.add(lock, True, 30):
            return error('กำลังสมัครสมาชิก กรุณาลองอีกครั้ง', 429)
        try:
            if cache.get(key) != email:
                return error('กรุณายืนยันอีเมลด้วย OTP ก่อนสมัครสมาชิก')
            serializer = self.get_serializer(data={**{field: request.data.get(field) for field in request.data}, 'email': email})
            serializer.is_valid(raise_exception=True)
            try:
                with transaction.atomic():
                    user = serializer.save()
            except IntegrityError:
                return error('อีเมลหรือรหัสนักศึกษาถูกใช้แล้ว กรุณาตรวจสอบข้อมูล')
            cache.delete(key)
            return Response({'message': 'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ', 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)
        finally:
            cache.delete(lock)


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        raw = request.data.get('refresh')
        if not isinstance(raw, str):
            return error('กรุณาระบุ refresh token')
        try:
            token = RefreshToken(raw)
            if str(token['user_id']) != str(request.user.pk):
                return error('ไม่สามารถออกจากระบบของผู้ใช้อื่นได้', 403)
            token.blacklist()
        except TokenError:
            return error('refresh token ไม่ถูกต้องหรือหมดอายุ')
        return Response({'message': 'ออกจากระบบแล้ว'})
