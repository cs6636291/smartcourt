from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
    ]

    email = models.EmailField(unique=True, verbose_name="อีเมล")
    nickname = models.CharField(max_length=50, blank=True, default='', verbose_name="ชื่อเล่น")
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='male', verbose_name="เพศ")
    std_id = models.CharField(max_length=13, unique=True, null=True, blank=True, verbose_name="รหัสนักศึกษา")
    avatar = models.CharField(max_length=255, blank=True, default='', verbose_name="รูปโปรไฟล์")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="วันที่สมัคร")

    # Set email as username field for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    def save(self, *args, **kwargs):
        # Auto-set default avatar based on gender if avatar is not provided
        if not self.avatar:
            if self.gender == 'female':
                self.avatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=female_student'
            else:
                self.avatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=male_student'
        # If username is empty, fallback to email prefix
        if not self.username:
            self.username = self.email.split('@')[0]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.std_id or self.email})"
