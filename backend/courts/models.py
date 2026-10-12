from datetime import time, timedelta

from django.db import models
from django.db.models import Q
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

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
        constraints = [
            models.UniqueConstraint(
                fields=['court', 'date', 'start_time'],
                condition=Q(status='confirmed'),
                name='uniq_confirmed_court_slot',
            ),
            models.UniqueConstraint(
                fields=['user', 'date'],
                condition=Q(status='confirmed'),
                name='uniq_confirmed_user_day',
            ),
        ]

    def clean(self):
        errors = {}
        valid_start_times = {time(hour, 0) for hour in range(8, 20)}

        if self.start_time and self.start_time not in valid_start_times:
            errors['start_time'] = 'เวลาเริ่มต้นต้องอยู่ระหว่าง 08:00 ถึง 19:00 และตรงชั่วโมง'
        elif self.start_time and self.end_time:
            expected_end_time = time(self.start_time.hour + 1, 0)
            if self.end_time != expected_end_time:
                errors['end_time'] = 'ระยะเวลาการจองต้องเท่ากับ 1 ชั่วโมง'

        if self.status == 'confirmed' and self.date:
            today = timezone.localdate()
            if not today <= self.date <= today + timedelta(days=4):
                errors['date'] = 'สามารถจองได้ตั้งแต่วันนี้ถึง 4 วันข้างหน้า'

        if errors:
            raise ValidationError(errors)

        if self.status != 'confirmed' or not all((
            self.court_id,
            self.user_id,
            self.date,
            self.start_time,
            self.end_time,
        )):
            return

        overlapping = Appointment.objects.filter(
            court_id=self.court_id,
            date=self.date,
            status='confirmed',
            start_time__lt=self.end_time,
            end_time__gt=self.start_time,
        )
        user_existing = Appointment.objects.filter(
            user_id=self.user_id,
            date=self.date,
            status='confirmed',
        )
        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)
            user_existing = user_existing.exclude(pk=self.pk)

        if overlapping.exists():
            raise ValidationError('สนามนี้ในช่วงเวลาดังกล่าวถูกจองไปแล้ว กรุณาเลือกช่วงเวลาอื่น')
        if user_existing.exists():
            raise ValidationError('คุณสามารถจองสนามได้สูงสุด 1 ครั้ง ต่อ 1 วันเท่านั้น')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.status}] {self.court.name} - {self.date} {self.start_time}-{self.end_time} โดย {self.user}"
