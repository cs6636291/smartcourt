from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class Court(models.Model):
    FLOOR_CHOICES = [
        ('3', 'ชั้น 3'),
        ('7', 'ชั้น 7'),
    ]

    SPORT_CHOICES = [
        ('futsal', 'ฟุตซอล'),
        ('basketball', 'บาสเกตบอล'),
        ('volleyball', 'วอลเลย์บอล'),
        ('badminton', 'แบดมินตัน'),
    ]

    name = models.CharField(max_length=100, verbose_name="ชื่อสนาม")
    floor = models.CharField(max_length=5, choices=FLOOR_CHOICES, verbose_name="ชั้น")
    sport_type = models.CharField(max_length=20, choices=SPORT_CHOICES, default='futsal', verbose_name="ประเภทกีฬา")
    description = models.TextField(blank=True, default="", verbose_name="รายละเอียดเพิ่มเติม")

    def __str__(self):
        return f"{self.name} (ชั้น {self.floor})"


class Appointment(models.Model):
    STATUS_CHOICES = [
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='appointments',
        verbose_name="ผู้จอง"
    )
    court = models.ForeignKey(
        Court,
        on_delete=models.CASCADE,
        related_name='appointments',
        verbose_name="สนามที่จอง"
    )
    date = models.DateField(verbose_name="วันที่จอง")
    start_time = models.TimeField(verbose_name="เวลาเริ่มต้น")
    end_time = models.TimeField(verbose_name="เวลาสิ้นสุด")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='confirmed',
        verbose_name="สถานะการจอง"
    )
    booked_at = models.DateTimeField(auto_now_add=True, verbose_name="เวลาที่ทำรายการ")

    class Meta:
        ordering = ['date', 'start_time']

    def clean(self):
        # 1. ตรวจสอบว่าช่วงเวลานั้นมีคนจองไว้แล้วหรือไม่ (ถ้า status == confirmed)
        if self.status == 'confirmed':
            overlapping = Appointment.objects.filter(
                court=self.court,
                date=self.date,
                start_time=self.start_time,
                status='confirmed'
            )
            if self.pk:
                overlapping = overlapping.exclude(pk=self.pk)
            if overlapping.exists():
                raise ValidationError("สนามนี้ในช่วงเวลาดังกล่าวถูกจองไปแล้ว กรุณาเลือกช่วงเวลาอื่น")

            # 2. กฎ 1 ครั้ง / 1 user / 1 วัน
            user_existing = Appointment.objects.filter(
                user=self.user,
                date=self.date,
                status='confirmed'
            )
            if self.pk:
                user_existing = user_existing.exclude(pk=self.pk)
            if user_existing.exists():
                raise ValidationError("คุณสามารถจองสนามได้สูงสุด 1 ครั้ง ต่อ 1 วันเท่านั้น")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.status}] {self.court.name} - {self.date} {self.start_time}-{self.end_time} โดย {self.user}"
