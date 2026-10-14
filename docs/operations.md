# การตั้งค่าและข้อจำกัด SmartCourt

## ใช้งานบนเครื่องพัฒนา

หลังติดตั้ง requirements ให้รัน `python manage.py migrate` จาก backend เพื่อสร้างตาราง blacklist ของ refresh token แล้วเริ่ม Backend ใหม่ การเปลี่ยนโค้ด/ตั้งค่า JWT อาจต้องเข้าสู่ระบบใหม่ บัญชีและการจองเดิมยังอยู่

กำหนด `SECRET_KEY` ใน backend/.env เป็นค่าลับสุ่มที่คงเดิมทุกครั้งที่เริ่ม server ไม่ใส่ค่าจริงใน Git ถ้าไม่ตั้งค่าและเปิด DEBUG แอปใช้ค่าสุ่มชั่วคราวและ token จะไม่คงอยู่หลัง restart ถ้า `DJANGO_DEBUG=false` จะบังคับต้องมี SECRET_KEY

Frontend เปลี่ยน API ผ่าน `VITE_API_BASE_URL` (ค่าเริ่มต้น localhost:8000/api) สำหรับ E2E config ใช้พอร์ต5199/8099 แยกและไม่ใช้ฐานข้อมูลพัฒนา

## OTP และอีเมล

SMTP ใช้ EMAIL_HOST, EMAIL_PORT, EMAIL_USE_TLS, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD และ DEFAULT_FROM_EMAIL ผ่าน .env ส่งไม่ได้ตอบ503พร้อมข้อความทั่วไป และไม่ส่ง OTP กลับผ่าน API ค่า EMAIL_BACKEND เริ่มต้นเป็น SMTP

การทดสอบ Django ใช้ locmem email; E2E ใช้ filebased email ในโฟลเดอร์ชั่วคราว จึงไม่พิสูจน์ว่ารับอีเมลจริงที่ปลายทาง ระบบ cache เริ่มต้น locmem สำหรับการรัน process เดียว ถ้าใช้หลาย worker ต้องเปลี่ยนเป็น shared cache ที่รองรับ atomic add/incr เช่น Redis และทดสอบ rate limit/challenge consumption ภายใต้ concurrency อีกครั้ง

OTP 5นาที ขอซ้ำ cooldown60วินาที จำกัด email5ครั้ง/ชั่วโมง IP20ครั้ง/ชั่วโมง; verify จำกัด IP60ครั้ง/10นาที และรหัสผิด5ครั้งต่อchallenge เมื่อผ่านได้รับ proof อายุ10นาทีใช้ได้ครั้งเดียวและผูกอีเมล

## Token และสิทธิ์

Access JWT อายุ30นาที Refresh7วัน หมุนและ blacklist refresh เก่า ออกจากระบบ blacklist refresh ที่เป็นของผู้ใช้และล้าง session ของหน้าเว็บ Access ที่ออกไปแล้วอาจยังใช้ได้จนหมดอายุ ระบบยังเก็บ Bearer token ใน localStorage; ก่อน production ควรออกแบบ HttpOnly cookie/CSRF ตามความต้องการและตรวจ XSS/HTTPS

โปรไฟล์ล็อกอีเมลที่ยืนยันแล้ว ไม่มี flow เปลี่ยนอีเมลใหม่ นักศึกษาต้องติดต่อผู้ดูแล

## ก่อนเผยแพร่จริง

ตั้ง DJANGO_DEBUG=false, SECRET_KEY, DJANGO_ALLOWED_HOSTS และ CORS_ALLOWED_ORIGINS ให้ตรง domain production (คั่น comma) HTTPS/session secure เปิดเมื่อปิด DEBUG กรณี reverse proxy ให้ตั้ง trusted proxy header ตามระบบจริง ห้ามตั้งแบบเชื่อ header จากอินเทอร์เน็ตทั้งหมด

Admin /admin/ ใช้ staff พร้อม model permissions หรือ superuser การลบสนาม/ผู้ใช้ CASCADE ลบ Appointment ที่สัมพันธ์หลังยืนยัน ถ้าต้องเก็บประวัติระยะยาวควรเพิ่มการปิดใช้งานแทนลบ

SQLite เหมาะงานขนาดเล็ก การจองพร้อมกันสองบัญชีมี E2E ตรวจแล้ว SQL lock ตอบ409ให้ลองใหม่ และ unique constraints ป้องกันซ้ำ ไม่ใช่ผลทดสอบโหลดจำนวนมาก ควรทดสอบ PostgreSQL/โหลดจริงก่อนเพิ่มผู้ใช้จำนวนมาก

## เอกสารส่งอาจารย์

Use Case, ER, report และตารางประเมินเปิด offline/พิมพ์ได้ รายงานผลผ่านและ coverage เป็นหลักฐานคนละประเภท นักศึกษาต้องอ่าน assertion ทดลองด้วยตนเองและเขียนบทประเมิน ไม่ควรอ้าง SMTP/browserทุกชนิด/production security ครบจากชุดทดสอบนี้
