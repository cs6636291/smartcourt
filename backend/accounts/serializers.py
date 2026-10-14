import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
import uuid
from .otp import normalize_email

User = get_user_model()

class StudentValidationMixin:
    def validate_std_id(self, value):
        if not isinstance(value, str) or not re.fullmatch(r'[0-9]{13}', value):
            raise serializers.ValidationError('รหัสนักศึกษาต้องเป็นตัวเลข 13 หลัก')
        return value

    def validate_first_name(self, value):
        if not value.strip():
            raise serializers.ValidationError('กรุณาระบุชื่อ')
        return value.strip()

    def validate_last_name(self, value):
        if not value.strip():
            raise serializers.ValidationError('กรุณาระบุนามสกุล')
        return value.strip()


class UserSerializer(StudentValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'nickname', 'gender', 'std_id', 'avatar', 'created_at']
        read_only_fields = ['id', 'created_at', 'email', 'username']

    def validate(self, attrs):
        if self.instance and 'email' in self.initial_data and normalize_email(self.initial_data['email']) != self.instance.email.lower():
            raise serializers.ValidationError({'email': 'อีเมลที่ยืนยันแล้วไม่สามารถเปลี่ยนได้ กรุณาติดต่อผู้ดูแลระบบ'})
        if self.instance and 'username' in self.initial_data and self.initial_data['username'] != self.instance.username:
            raise serializers.ValidationError({'username': 'ไม่สามารถเปลี่ยนชื่อผู้ใช้ได้'})
        return attrs


class RegisterSerializer(StudentValidationMixin, serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    first_name = serializers.CharField(required=True, max_length=150, allow_blank=False)
    last_name = serializers.CharField(required=True, max_length=150, allow_blank=False)
    std_id = serializers.CharField(required=True, max_length=13)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 'nickname', 'gender', 'std_id']

    def validate_password(self, value):
        # รหัสผ่านต้องไม่ต่ำกว่า 8 ตัว และมีอักขระ + ตัวเลข
        if len(value) < 8:
            raise serializers.ValidationError("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร")
        if not re.search(r'[A-Za-z]', value) or not re.search(r'[0-9]', value):
            raise serializers.ValidationError("รหัสผ่านต้องประกอบด้วยตัวอักษรและตัวเลขผสมกัน")
        return value

    def validate_email(self, value):
        email = normalize_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('อีเมลนี้ถูกใช้งานแล้ว')
        return email

    def validate_std_id(self, value):
        value = super().validate_std_id(value)
        if User.objects.filter(std_id=value).exists():
            raise serializers.ValidationError('รหัสนักศึกษานี้ถูกใช้งานแล้ว')
        return value

    def create(self, validated_data):
        password = validated_data['password']
        username = 'student_' + uuid.uuid4().hex
        user = User(
            username=username,
            **{key: value for key, value in validated_data.items() if key != 'password'}
        )
        user.set_password(password)
        user.save()
        return user
