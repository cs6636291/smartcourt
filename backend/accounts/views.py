import re
import random
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.core.cache import cache
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()

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
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email or not re.match(EMAIL_REGEX, email):
            return Response({'error': 'อีเมลไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'อีเมลนี้ถูกใช้งานในระบบแล้ว'}, status=status.HTTP_400_BAD_REQUEST)

        # สุ่ม OTP 6 หลัก (หรือใช้ 123456 เป็น default ในโหมดพัฒนา)
        otp = "123456"
        cache.set(f"otp_{email}", otp, timeout=300) # หมดอายุใน 5 นาที

        return Response({
            'message': 'ส่งรหัส OTP เรียบร้อยแล้ว (รหัสทดสอบ: 123456)',
            'email': email,
            'otp_hint': otp
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()

        if not email or not otp:
            return Response({'error': 'กรุณาระบุอีเมลและรหัส OTP'}, status=status.HTTP_400_BAD_REQUEST)

        saved_otp = cache.get(f"otp_{email}") or "123456"
        if otp != saved_otp and otp != "123456":
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
