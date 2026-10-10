# ระบบจองสนามกีฬา ตึก 40 KMUTNB (SmartCourt)

ระบบจองสนามกีฬาในร่ม ตึก 40 มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ พัฒนาด้วยสถาปัตยกรรม **Full-Stack (Frontend: React + Backend: Django REST Framework + Database: SQLite3)** อ้างอิงตามเอกสารความต้องการและสไลด์วิชา Web Framework

---

## 🏛️ สถาปัตยกรรมและเทคโนโลยีที่ใช้

1. **Frontend (React + Vite + Tailwind CSS)**:
   - ออกแบบ UI หน้าแรกตามแบบ Mockup ตึก 40 ครบถ้วน (ชั้น 3 และ ชั้น 7)
   - เชื่อมต่อ API ด้วย Axios Interceptor จัดการ JWT Access & Refresh Token
   - สลับวันที่จองล่วงหน้าได้ 5 วัน และเลือกช่วงเวลาสำเร็จรูป 08:00 - 20:00 (ห่างกัน 1 ชม.)
   - แขกทั่วไป (Guest) ดูสถานะ "ว่าง" / "เต็ม" ได้แบบ Real-time, เมื่อคลิกจองจะแจ้งเตือนให้เข้าสู่ระบบ

2. **Backend (Django 6.x + Django REST Framework + SimpleJWT)**:
   - **Custom User Model**: สืบทอดจาก `AbstractUser` รองรับ Email Login, รหัสนักศึกษา 13 หลัก (`std_id`), ชื่อเล่น, เพศ, และ Avatar อัตโนมัติ
   - **Validation Rules**:
     - ตรวจสอบความถูกต้องของ Pattern Email และรหัสผ่าน (≥ 8 ตัวอักษร มีตัวอักษร + ตัวเลข)
     - ระบบจำลองยืนยัน OTP สำหรับการสมัครสมาชิกครั้งแรก
     - ป้องกันการจองซ้ำ: สนามและเวลาเดียวกันจองได้เพียง 1 คน
     - กฎควบคุม: **สงวนสิทธิ์การจองสนามได้สูงสุด 1 ครั้ง / 1 ผู้ใช้ / 1 วัน**
     - รองรับการยกเลิกการจองสนาม
   - **CORS Support**: ติดตั้ง `django-cors-headers` เพื่อให้ React สื่อสารกับ Django API ได้

3. **Database (SQLite3)**:
   - ไฟล์ฐานข้อมูล: `backend/db.sqlite3`
   - ตารางตาม ER Diagram: `User`, `Court`, `Appointment`

---

## 📁 โครงสร้างโปรเจกต์

```text
smartcourt/
├── backend/
│   ├── venv/                       # Virtual Environment
│   ├── db.sqlite3                  # ฐานข้อมูล SQLite3
│   ├── manage.py
│   ├── seed_data.py                # Script เพิ่มข้อมูลสนามและบัญชีทดสอบ
│   ├── smartcourt_config/          # Settings & URLs หลัก
│   │   ├── settings.py
│   │   └── urls.py
│   ├── accounts/                   # App ระบบสมาชิก, User, JWT Auth
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   └── courts/                     # App ข้อมูลสนาม และการจอง Appointment
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       └── urls.py
│
├── frontend/
│   ├── src/
│   │   ├── api/client.js           # Axios Instance + JWT Interceptor
│   │   ├── components/
│   │   │   ├── CourtGraphics.jsx   # กราฟิกสนามฟุตซอล, บาส, วอลเลย์, แบดมินตัน
│   │   │   ├── AuthModal.jsx       # Modal เข้าสู่ระบบ / สมัครสมาชิก + OTP
│   │   │   ├── BookingModal.jsx    # Modal ยืนยันการจองสนาม
│   │   │   └── MyBookingsModal.jsx # Modal ดูประวัติและกดยกเลิกการจอง
│   │   ├── App.jsx                 # หน้าแรกตาม Mockup
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── run_backend.bat                 # ดับเบิ้ลคลิกเพื่อรัน Backend
├── run_frontend.bat                # ดับเบิ้ลคลิกเพื่อรัน Frontend
└── README.md
```

---

## 🚀 วิธีการรันโปรเจกต์

### วิธีที่ 1: ดับเบิ้ลคลิกไฟล์ Launcher (สะดวกที่สุดบน Windows)
1. ดับเบิ้ลคลิกไฟล์ `run_backend.bat` เพื่อรัน Backend Server (พอร์ต 8000)
2. ดับเบิ้ลคลิกไฟล์ `run_frontend.bat` เพื่อรัน Frontend React (พอร์ต 5173)
3. เปิดเบราว์เซอร์ไปที่: `http://localhost:5173`

---

### วิธีที่ 2: รันผ่าน Terminal

#### 1. ฝั่ง Backend:
```powershell
cd backend
.\venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
```
- API Base URL: `http://127.0.0.1:8000/api/`
- Django Admin: `http://127.0.0.1:8000/admin/`

#### 2. ฝั่ง Frontend:
```powershell
cd frontend
npm run dev
```
- เข้าใช้งานเว็บ: `http://localhost:5173`

---

## 🔑 ข้อมูลบัญชีผู้ใช้สำหรับทดสอบ (Seed Data)

| ประเภทบัญชี | อีเมล | รหัสผ่าน | หมายเหตุ |
|---|---|---|---|
| **Admin** | `admin@kmutnb.ac.th` | `admin1234` | เข้าจัดการใน Django Admin ได้ |
| **นักศึกษา (Demo)** | `student@kmutnb.ac.th` | `student1234` | นายสมชาย ใจดี (รหัส: 6501012345678) |
