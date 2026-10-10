import re
import random
import logging
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)

EMAIL_REGEX = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # แนบข้อมูล user กลับไปให้ React นำไปใช้งานได้ทันที
        data['user'] = UserSerializer(self.user).data
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class SendOTPView(APIView):
    """
    สร้างรหัส OTP แบบสุ่ม 6 หลัก บันทึกลง Cache (5 นาที) และส่งอีเมลจริงไปยังผู้ใช้
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email or not re.match(EMAIL_REGEX, email):
            return Response({'error': 'อีเมลไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'อีเมลนี้ถูกใช้งานในระบบแล้ว'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. สุ่มรหัส OTP 6 หลักจริง
        otp = f"{random.randint(100000, 999999)}"
        cache.set(f"otp_{email}", otp, timeout=300) # หมดอายุใน 5 นาที

        # 2. ส่งอีเมลจริง
        subject = f"[SmartCourt ตึก 40 KMUTNB] รหัส OTP สำหรับลงทะเบียน: {otp}"
        text_message = f"""สวัสดีครับ,

คุณได้ทำการขอรหัสยืนยันตัวตน (OTP) เพื่อลงทะเบียนเข้าใช้งานระบบจองสนามกีฬา ตึก 40 มจพ.

รหัส OTP ของคุณคือ: {otp}

* รหัสนี้มีอายุการใช้งาน 5 นาที
หากคุณไม่ได้เป็นผู้ขอรหัส กรุณาละเว้นอีเมลฉบับนี้

ขอบคุณครับ,
ทีมงาน SmartCourt ตึก 40 KMUTNB
"""
        html_message = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #b91c1c; margin: 0;">ระบบจองสนามกีฬา ตึก 40 KMUTNB</h2>
                <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
            <p style="color: #334155; font-size: 15px;">สวัสดีครับ,</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                คุณได้ทำการขอรหัส OTP เพื่อลงทะเบียนใช้งานระบบจองสนามกีฬา ตึก 40 รหัสยืนยันของคุณคือ:
            </p>
            <div style="text-align: center; margin: 25px 0;">
                <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #b91c1c; background-color: #fef2f2; border: 2px dashed #ef4444; padding: 12px 28px; border-radius: 8px;">
                    {otp}
                </span>
            </div>
            <p style="color: #64748b; font-size: 12px; text-align: center;">
                * รหัส OTP นี้จะหมดอายุภายใน <strong>5 นาที</strong>
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                หากคุณไม่ได้เป็นผู้ทำรายการนี้ กรุณาละเว้นอีเมลฉบับนี้
            </p>
        </div>
        """

        email_sent = False
        email_err_msg = ""

        # ตรวจสอบว่ามีการตั้งค่า SMTP หรือไม่
        if getattr(settings, 'EMAIL_HOST_USER', None) and getattr(settings, 'EMAIL_HOST_PASSWORD', None):
            sender = f"SmartCourt ตึก 40 <{settings.EMAIL_HOST_USER}>"
            try:
                send_mail(
                    subject=subject,
                    message=text_message,
                    from_email=sender,
                    recipient_list=[email],
                    html_message=html_message,
                    fail_silently=False,
                )
                email_sent = True
                print(f"[SUCCESS] Real OTP Email sent to {email}: {otp}")
            except Exception as e:
                email_err_msg = str(e)
                print(f"[EMAIL_ERROR] Failed to send real email: {e}")
        else:
            print(f"[INFO] SMTP credentials not set in backend/.env. OTP generated: {otp}")

        return Response({
            'message': 'ส่งรหัส OTP เรียบร้อยแล้ว กรุณาตรวจสอบกล่องข้อความในอีเมลของคุณ' if email_sent else 'สร้างรหัส OTP เรียบร้อยแล้ว',
            'email': email,
            'email_sent': email_sent,
            'otp': otp if not email_sent else None, # ถ้ายังไม่ได้ตั้ง SMTP หรือส่งไม่ผ่าน จะส่ง OTP ใน response เพื่อให้ทดสอบได้ทันที
            'error_detail': email_err_msg if email_err_msg else None,
            'hint': 'กรุณาตั้งค่า EMAIL_HOST_USER และ EMAIL_HOST_PASSWORD ใน backend/.env เพื่อส่งเมลจริง' if not email_sent else None
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()

        if not email or not otp:
            return Response({'error': 'กรุณาระบุอีเมลและรหัส OTP'}, status=status.HTTP_400_BAD_REQUEST)

        saved_otp = cache.get(f"otp_{email}")
        
        # ตรวจสอบความถูกต้องของรหัส
        if not saved_otp:
            return Response({'error': 'รหัส OTP หมดอายุแล้ว กรุณากดส่งใหม่อีกครั้ง'}, status=status.HTTP_400_BAD_REQUEST)

        if otp != saved_otp:
            return Response({'error': 'รหัส OTP ไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': 'ยืนยันรหัส OTP สำเร็จ'}, status=status.HTTP_200_OK)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "message": "สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ",
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
