import os
import sys
import django
from datetime import date, time

sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartcourt_config.settings')
django.setup()

from django.contrib.auth import get_user_model
from courts.models import Court, Appointment

User = get_user_model()

def seed():
    print("Seeding sports court data for Building 40...")
    
    # 1. สร้าง Admin & Demo Student
    admin_user, created = User.objects.get_or_create(
        email="admin@kmutnb.ac.th",
        defaults={
            "username": "admin",
            "first_name": "Admin",
            "last_name": "System",
            "is_staff": True,
            "is_superuser": True,
            "gender": "male"
        }
    )
    if created:
        admin_user.set_password("admin1234")
        admin_user.save()
        print(f"[OK] Admin created: admin@kmutnb.ac.th / admin1234")

    student_user, created = User.objects.get_or_create(
        email="student@kmutnb.ac.th",
        defaults={
            "username": "student",
            "first_name": "สมชาย",
            "last_name": "ใจดี",
            "nickname": "กาย",
            "gender": "male",
            "std_id": "6501012345678"
        }
    )
    if created:
        student_user.set_password("student1234")
        student_user.save()
        print(f"[OK] Student created: student@kmutnb.ac.th / student1234")

    # 2. สร้างรายการสนาม ชั้น 3 และ ชั้น 7 ตาม Mockup
    courts_data = [
        # ชั้น 3
        {"name": "สนามฟุตซอล ชั้น 3", "floor": "3", "sport_type": "futsal", "description": "สนามฟุตซอลมาตรฐานในร่ม ตึก 40"},
        {"name": "แป้นบาสเกตบอล 1 ชั้น 3", "floor": "3", "sport_type": "basketball", "description": "แป้นบาสเกตบอลครึ่งสนาม โซน A"},
        {"name": "แป้นบาสเกตบอล 2 ชั้น 3", "floor": "3", "sport_type": "basketball", "description": "แป้นบาสเกตบอลครึ่งสนาม โซน B"},
        {"name": "แป้นบาสเกตบอล 3 ชั้น 3", "floor": "3", "sport_type": "basketball", "description": "แป้นบาสเกตบอลครึ่งสนาม โซน C"},
        {"name": "แป้นบาสเกตบอล 4 ชั้น 3", "floor": "3", "sport_type": "basketball", "description": "แป้นบาสเกตบอลครึ่งสนาม โซน D"},
        {"name": "แป้นบาสเกตบอล 5 ชั้น 3", "floor": "3", "sport_type": "basketball", "description": "แป้นบาสเกตบอลครึ่งสนาม โซน E"},
        # ชั้น 7
        {"name": "สนามวอลเลย์บอล 1 ชั้น 7", "floor": "7", "sport_type": "volleyball", "description": "สนามวอลเลย์บอลมาตรฐาน ชั้น 7"},
        {"name": "สนามแบดมินตัน 1 ชั้น 7", "floor": "7", "sport_type": "badminton", "description": "คอร์ทแบดมินตัน คอร์ทที่ 1"},
        {"name": "สนามแบดมินตัน 2 ชั้น 7", "floor": "7", "sport_type": "badminton", "description": "คอร์ทแบดมินตัน คอร์ทที่ 2"},
        {"name": "สนามแบดมินตัน 3 ชั้น 7", "floor": "7", "sport_type": "badminton", "description": "คอร์ทแบดมินตัน คอร์ทที่ 3"},
        {"name": "สนามแบดมินตัน 4 ชั้น 7", "floor": "7", "sport_type": "badminton", "description": "คอร์ทแบดมินตัน คอร์ทที่ 4"},
    ]

    for item in courts_data:
        court, cr = Court.objects.get_or_create(name=item["name"], defaults=item)
        if cr:
            print(f"[OK] Court created: {court.name}")

    # 3. ตัวอย่างการจองสำหรับเวลา 08:00 ของวันนี้ (ตามรูปตัวอย่างที่บางสนามว่าง บางสนามเต็ม)
    # จำลองนักศึกษาหลายคนเพื่อให้ผ่านเงื่อนไข 1 คน/ 1 ครั้ง / 1 วัน
    today = date.today()
    sample_targets = [
        ("แป้นบาสเกตบอล 1 ชั้น 3", "std1@kmutnb.ac.th", "กอล์ฟ", "6501000100011"),
        ("แป้นบาสเกตบอล 5 ชั้น 3", "std2@kmutnb.ac.th", "บาส", "6501000200022"),
        ("สนามแบดมินตัน 2 ชั้น 7", "std3@kmutnb.ac.th", "นัท", "6501000300033"),
        ("สนามแบดมินตัน 3 ชั้น 7", "std4@kmutnb.ac.th", "มิว", "6501000400044"),
    ]

    for court_name, email, nickname, std_id in sample_targets:
        c = Court.objects.filter(name=court_name).first()
        if c and not Appointment.objects.filter(court=c, date=today, start_time=time(8, 0), status='confirmed').exists():
            u, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": email.split('@')[0],
                    "first_name": nickname,
                    "last_name": "นักศึกษา",
                    "nickname": nickname,
                    "std_id": std_id,
                    "gender": "female" if nickname == "มิว" else "male"
                }
            )
            Appointment.objects.create(
                user=u,
                court=c,
                date=today,
                start_time=time(8, 0),
                end_time=time(9, 0),
                status='confirmed'
            )
            print(f"[OK] Sample booking: {c.name} at 08:00 booked by {nickname}")

    print("[SUCCESS] Seed data completed successfully!")

if __name__ == '__main__':
    seed()
