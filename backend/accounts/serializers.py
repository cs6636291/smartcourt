import re
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'nickname', 'gender', 'std_id', 'avatar', 'created_at']
        read_only_fields = ['id', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

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

    def create(self, validated_data):
        password = validated_data.pop('password')
        email = validated_data.get('email')
        username = email.split('@')[0]
        user = User(
            username=username,
            **validated_data
        )
        user.set_password(password)
        user.save()
        return user
