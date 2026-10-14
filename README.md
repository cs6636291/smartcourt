# SmartCourt

ระบบจองสนามกีฬา ตึก 40 มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ พัฒนาด้วย **Django REST Framework, React และ SQLite** รองรับการดูสถานะสนาม สมัครสมาชิกด้วยอีเมลและ OTP จองสนาม ยกเลิกการจอง และจัดการข้อมูลผ่าน Django Admin

Django รับผิดชอบการตรวจข้อมูล การยืนยันตัวตน สิทธิ์ผู้ใช้ กฎการจอง และการบันทึกฐานข้อมูล ส่วน React แสดงผลและเรียก REST API

## ความสามารถหลัก

- ดูสถานะสนามชั้น 3 และชั้น 7 ตามวัน/เวลา โดยไม่ต้องเข้าสู่ระบบ
- สมัครตามขั้นตอนอีเมล → OTP → ข้อมูลสมาชิก และเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน
- เลือกเวลาว่างและตรวจรายละเอียดก่อนยืนยันจอง
- แสดงรายการของตนเองบนหน้าหลักและหน้าจองสนาม
- ยกเลิกผ่าน popup ยืนยัน เก็บประวัติและคืนสิทธิ์การจอง
- แก้โปรไฟล์ โดยล็อกอีเมลที่ยืนยันแล้ว
- จัดการสนามแบบ CRUD ผ่าน Django Admin พร้อมค้นหาและกรองข้อมูล
- ทดสอบ API, Admin, React components และขั้นตอนใช้งานจริงด้วย Playwright

## บทบาทและกฎธุรกิจ

| บทบาท | สิทธิ์ |
| --- | --- |
| Guest | ดูสถานะสนาม สมัครสมาชิก และเข้าสู่ระบบ |
| นักศึกษา | ดูตาราง จอง ดู/ยกเลิกรายการของตนเอง และแก้โปรไฟล์ |
| Admin | จัดการสนาม รายการจอง ผู้ใช้ และสิทธิ์ผ่าน `/admin/` |

Admin ต้องเป็น staff ที่มี model permissions ที่เกี่ยวข้อง หรือเป็น superuser สมาชิกทั่วไปไม่มีสิทธิ์จัดการ Admin

1. จองได้วันนี้ถึงอีก 4 วัน รวม 5 วัน ตามเขตเวลา `Asia/Bangkok`
2. เริ่มจองได้ 08:00–19:00 ช่วงละ 1 ชั่วโมง ช่วงสุดท้ายสิ้นสุด 20:00
3. ไม่อนุญาตให้จองช่วงเวลาที่เริ่มไปแล้วในวันปัจจุบัน
4. ผู้ใช้มีรายการ `confirmed` ได้สูงสุด 1 รายการต่อวัน
5. สนามเดียวกัน วันและเวลาเริ่มเดียวกันมีรายการ `confirmed` ได้เพียงรายการเดียว
6. ยกเลิกโดยเปลี่ยนเป็น `cancelled` และเก็บประวัติ ผู้ใช้จองใหม่ในวันนั้นได้
7. ผู้ใช้ดูและยกเลิกได้เฉพาะรายการของตนเอง

Backend ตรวจเงื่อนไขและใช้ conditional unique constraints ป้องกันจองซ้ำที่ฐานข้อมูล หาก SQLite ล็อกระหว่างจอง ตอบ `409` ให้โหลดข้อมูลใหม่และลองอีกครั้ง

## เทคโนโลยีและโครงสร้าง

| ส่วน | เทคโนโลยี |
| --- | --- |
| Backend | Django, Django REST Framework, SimpleJWT |
| Frontend | React 18, Vite, Tailwind CSS, Axios |
| Database | SQLite, Django ORM และ migrations |
| Authentication | JWT access/refresh, rotation และ blacklist |
| Testing | Django TestCase/APITestCase, coverage.py, Vitest, React Testing Library, Playwright |

Backend dependencies ระบุใน `backend/requirements.txt`; Frontend ใช้ `frontend/package.json` และ `frontend/package-lock.json`

```text
smartcourt/
├── backend/
│   ├── accounts/             # สมาชิก, OTP, โปรไฟล์ และ JWT
│   ├── courts/               # สนาม, การจอง, Admin และ tests
│   ├── smartcourt_config/    # Settings, URL หลัก และ E2E settings
│   ├── manage.py
│   ├── seed_data.py          # ข้อมูลสาธิตเฉพาะเครื่องพัฒนา
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── src/api/              # Axios และ refresh token
│   ├── src/pages/            # Login, Register, OTP, Profile
│   ├── src/components/       # หน้าหลัก, ตารางจอง, popup
│   ├── public/assets/        # โลโก้และรูปสนาม
│   ├── e2e/                  # Playwright กับ Backend จริง
│   └── playwright.config.js
├── scripts/                 # การตรวจระบบและสร้างเอกสาร
├── docs/                    # Use Case, ER, ผลทดสอบ และคู่มือ
├── run_backend.bat
└── run_frontend.bat
```

ตารางธุรกิจหลักคือ `User`, `Court` และ `Appointment` User/Court แต่ละรายการมี Appointment ได้ตั้งแต่ศูนย์ถึงหลายรายการ โดย Appointment เชื่อมกับ User/Court อย่างละหนึ่งผ่าน Foreign Key

## ติดตั้งบน Windows / PowerShell

### สิ่งที่ต้องเตรียม

- Python 3.12 ขึ้นไป; สภาพแวดล้อมที่ตรวจล่าสุดใช้ Python 3.14
- Node.js 24 และ npm เป็น runtime ของ Frontend/tests ที่ใช้ตรวจล่าสุด
- SMTP ที่ใช้งานได้สำหรับสมัครสมาชิกด้วยอีเมลจริง

### 1. Backend

เริ่มจากโฟลเดอร์โปรเจกต์:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

ไฟล์ dev requirements รวม dependencies ของแอปและเครื่องมือ coverage หากต้องการเฉพาะแอป ใช้ `requirements.txt`

สร้าง `backend/.env` ด้วย Editor และปรับค่าตัวอย่างให้ตรงกับเครื่องพัฒนา:

```dotenv
DJANGO_DEBUG=true
SECRET_KEY=replace-with-a-generated-secret
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,testserver
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.your-provider.example
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-sender@example.com
EMAIL_HOST_PASSWORD=replace-with-provider-issued-credential
DEFAULT_FROM_EMAIL=SmartCourt <your-sender@example.com>
```

สร้าง SECRET_KEY แล้วบันทึกค่าที่ได้ใน `.env` โดยไม่เผยแพร่:

```powershell
.\venv\Scripts\python.exe -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

อย่า commit `.env` หรือรหัส SMTP หากไม่ตั้ง SECRET_KEY ขณะเปิด DEBUG ระบบใช้ค่าสุ่มชั่วคราวและ token เดิมอาจใช้ไม่ได้หลัง restart เมื่อปิด DEBUG จะบังคับต้องตั้งค่านี้

สร้างฐานข้อมูลและผู้ดูแล:

```powershell
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py createsuperuser
.\venv\Scripts\python.exe manage.py check
```

Migration รวมตาราง blacklist ของ refresh token หลังสร้างผู้ดูแลแล้วเพิ่มสนามผ่าน Django Admin ได้ สำหรับข้อมูลสาธิตบนเครื่องพัฒนา มีคำสั่งเพิ่มเติม:

```powershell
.\venv\Scripts\python.exe seed_data.py
```

Seed สร้างสนาม บัญชีสาธิต และการจองตัวอย่างของวันนั้น มีรหัสผ่านสาธิตกำหนดในสคริปต์ จึงใช้เฉพาะฐานข้อมูลพัฒนา ไม่รันบน production การรันซ้ำไม่ใช่การล้างหรือ reset ฐานข้อมูล

### 2. Frontend

เปิด Terminal อีกหน้าต่างจากโฟลเดอร์โปรเจกต์:

```powershell
cd frontend
npm ci
```

API เริ่มต้นคือ `http://localhost:8000/api` เปลี่ยนได้ผ่าน `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api
```

Restart Vite หลังเปลี่ยนค่า และตั้ง Backend CORS ให้ตรงกับ origin ของ Frontend

## รันระบบ

จาก `backend`:

```powershell
.\venv\Scripts\python.exe manage.py runserver
```

จาก `frontend` ในอีก Terminal:

```powershell
npm run dev
```

| หน้า | URL เริ่มต้น |
| --- | --- |
| Frontend | http://localhost:5173 |
| Django Admin | http://127.0.0.1:8000/admin/ |
| API | http://localhost:8000/api/ |

หลังติดตั้งครบแล้ว ใช้ `run_backend.bat` และ `run_frontend.bat` โดยเริ่มจากโฟลเดอร์โปรเจกต์ได้ Backend launcher รัน migrations ก่อนเริ่ม development server

สร้าง Frontend production build จาก `frontend`:

```powershell
npm run build
```

ผลอยู่ใน `frontend/dist/` คำสั่งนี้ยังไม่ได้ deploy Django หรือเผยแพร่ระบบ

## API หลัก

ทุกเส้นทางอยู่ใต้ `/api/`

| Method | Endpoint | การทำงาน | สิทธิ์ |
| --- | --- | --- | --- |
| POST | `accounts/send-otp/` | ส่ง OTP | Public พร้อม rate limit |
| POST | `accounts/verify-otp/` | รับ `verification_token` หลังยืนยัน | Public พร้อม rate limit |
| POST | `accounts/register/` | สมัครด้วยข้อมูลและหลักฐาน OTP | ต้องมี proof ที่ถูกต้อง |
| POST | `accounts/login/` | รับ access/refresh และข้อมูลผู้ใช้ | Public |
| POST | `accounts/token/refresh/` | หมุน refresh และรับ access ใหม่ | Refresh ที่ถูกต้อง |
| POST | `accounts/logout/` | Blacklist refresh ของเจ้าของ | JWT |
| GET, PUT, PATCH | `accounts/profile/` | ดู/แก้โปรไฟล์ของตนเอง | JWT |
| GET | `courts/status/` | สถานะตาม `date` และ `time` | Public |
| GET | `courts/schedule/` | ตารางจอง 5 วัน | JWT |
| POST | `courts/book/` | ยืนยันจอง | JWT |
| GET | `courts/my-bookings/` | รายการเฉพาะเจ้าของ | JWT |
| POST | `courts/cancel/<id>/` | ยกเลิกรายการของตนเอง | JWT |

API ที่ยืนยันตัวตนใช้ `Authorization: Bearer <access_token>` ส่วน Django Admin ใช้ session authentication ของ Django

## OTP และการตรวจข้อมูล

- OTP อายุ5นาที กรอกผิดครบ5ครั้งต้องขอใหม่ ขอซ้ำต้องรอ60วินาที
- จำกัดการขอ5ครั้งต่ออีเมล/ชั่วโมง และ20ครั้งต่อ IP/ชั่วโมง; ตรวจ OTP60ครั้งต่อ IP/10นาที
- `verification_token` ผูกอีเมล อายุ10นาที ใช้สมัครสำเร็จได้ครั้งเดียว
- ไม่ส่ง OTP กลับใน API และไม่บันทึกรหัสใน application log ส่งเมลไม่ได้ตอบ `503`
- Backend ตรวจชื่อ/นามสกุลไม่ว่าง รหัสนักศึกษา ASCII13หลัก และอีเมล/รหัสนักศึกษาไม่ซ้ำ
- รหัสผ่านอย่างน้อย8ตัว มีตัวอักษรอังกฤษและตัวเลข เก็บด้วย password hashing ของ Django
- Access token อายุ30นาที Refresh7วัน พร้อม rotation/blacklist

## การทดสอบและรายงาน

### Backend / Django Admin

จาก `backend`:

```powershell
.\venv\Scripts\python.exe manage.py test --verbosity 2
```

ตรวจ CRUD ผ่าน Admin, permissions, OTP, JWT, โปรไฟล์ และกฎการจอง โดยใช้ฐานข้อมูลทดสอบแยก

### Frontend / Coverage

จาก `frontend`:

```powershell
npm test
npm run test:coverage
```

Component tests ใช้ Vitest/React Testing Library ใน jsdom และจำลอง API กำหนด coverage ขั้นต่ำ80% สำหรับ statements, branches, functions และ lines ของไฟล์ที่ระบุใน `vite.config.js`

### E2E กับ Backend จริง

จาก `frontend` ติดตั้ง browser ครั้งแรก แล้วรัน:

```powershell
npx playwright install chromium --only-shell
npm run test:e2e
```

E2E เปิด Frontend5199 และ Backend8099 แยก สร้าง SQLiteและกล่องอีเมลแบบไฟล์ในโฟลเดอร์ชั่วคราวใหม่ ไม่ใช้ API จำลองหรือฐานข้อมูลใช้งาน ตรวจสมัคร/OTP/login, จองแล้ว reload, รายการทั้งสองหน้า, ยกเลิก/จองใหม่, โปรไฟล์, คำขอพร้อมกันสองบัญชี และ popup มือถือ ดูตัวเลือก runtime/browser ใน [คู่มือ E2E](frontend/e2e/README.md)

### สร้างรายงานและ ER

จากโฟลเดอร์โปรเจกต์:

```powershell
.\backend\venv\Scripts\python.exe scripts/verify_project.py --e2e
.\backend\venv\Scripts\python.exe scripts/generate_database_docs.py
```

ระบุ Node executable เพิ่มได้ด้วย `--node 'C:\path\to\node.exe'` รายงานรวมผลจริง, coverage, build และหลักฐาน เปิด HTML ได้โดยไม่ต้องเปิด server

การสร้างรายงานซ้ำเขียนทับรายงานและร่างบทประเมิน ควรเก็บฉบับที่นักศึกษาแก้เองเป็นอีกไฟล์ก่อนรันใหม่

### ผลตรวจล่าสุด

ผลรอบ **14 ตุลาคม 2569 เวลา02:01น. (Asia/Bangkok)** อ้างอิงโค้ดในรอบนั้น ไม่รับรองการแก้ไขภายหลัง:

| ชุด | ผล |
| --- | --- |
| Django API / Admin | 47/47 ผ่าน |
| Frontend components | 58/58 ผ่าน |
| Playwright E2E | 5/5 ผ่าน |
| รวม | **110/110 ผ่าน** |
| Frontend build | ผ่าน |

Backend coverage รวม statements/branches **93.41%**; Frontend statements **90.03%**, branches **83.23%**, functions **84.13%**, lines **92.93%** ขอบเขตไฟล์และหลักฐานอยู่ใน [รายงาน](docs/test-report.html) ผล tests และ coverage เป็นคนละตัวชี้วัด

## เอกสารประกอบ

| เอกสาร | เนื้อหา |
| --- | --- |
| [Use Case](docs/use-cases.html) | บทบาท ขอบเขต ขั้นตอน และกฎธุรกิจ |
| [ER / Data Dictionary](docs/database-design.html) | ความสัมพันธ์และฟิลด์จากโมเดลจริง |
| [รายงานทดสอบ](docs/test-report.html) | TC ผลรัน coverage และข้อจำกัด |
| [รายงาน E2E](docs/e2e-report/index.html) | ผลขั้นตอนใช้งานจริง |
| [บทประเมินนักศึกษา](docs/student-assessment.html) | ร่างตารางฟังก์ชันกับ TC และบทประเมิน |
| [คู่มือเอกสาร](docs/README.md) | วิธีสร้าง เปิด และเตรียมเอกสารส่ง |
| [คู่มือการตั้งค่า](docs/operations.md) | SMTP, JWT, production และข้อจำกัด |

HTML มีปุ่มพิมพ์/บันทึก PDF นักศึกษาต้องตรวจและเขียนบทประเมินของตนเองก่อนส่ง

## ข้อจำกัดและการนำไปใช้งานจริง

- Tests ใช้อีเมลจำลอง/อีเมลไฟล์ ไม่ยืนยันการรับเมลผ่าน SMTP ภายนอก
- Cache เริ่มต้นเป็น locmem สำหรับ process เดียว หลาย worker ต้องตั้ง shared cache และทดสอบเพิ่มเติม
- Bearer tokens ยังอยู่ localStorage; ก่อน production ควรประเมิน HttpOnly cookie/CSRF และ XSS
- Logout ล้าง session หน้าเว็บและพยายามเพิกถอน refresh หาก access หมดอายุหรือเครือข่ายล้มเหลว การเพิกถอนอาจไม่สำเร็จและหน้าเว็บแจ้งเตือน Access ที่ออกแล้วอาจใช้ได้จนหมดอายุ
- ลบ User/Court ใน Admin จะ CASCADE ลบ Appointment ที่สัมพันธ์ หากต้องรักษาประวัติระยะยาวควรออกแบบปิดใช้งานแทนลบ
- ทดสอบพร้อมกันสองคำขอไม่ใช่ load test และยังไม่ครอบคลุมทุก browser/accessibility
- ก่อน deployment ตั้ง `DJANGO_DEBUG=false`, SECRET_KEY, hosts, CORS และ HTTPS พร้อม backup/restore และ static files ตาม [คู่มือ](docs/operations.md)

## แก้ปัญหาเบื้องต้น

| อาการ | สิ่งที่ควรตรวจ |
| --- | --- |
| ส่ง OTP ไม่ได้ | SMTP credentials, host/port/TLS และผล503 |
| API401 | เข้าสู่ระบบใหม่ ตรวจ token/SECRET_KEY หลัง restart |
| CORS error | Origin ต้องอยู่ใน CORS_ALLOWED_ORIGINS; restart Backend |
| จองไม่ได้ | วัน/เวลาต้องยังอยู่ในขอบเขต และไม่มี confirmed ของตนเองในวันนั้น |
| จอง409 | โหลดสถานะล่าสุดและเลือกเวลาว่าง |
| ตาราง logout/refresh ไม่พบ | รัน migrations โดยเฉพาะ token blacklist |
| E2E เปิด browser ไม่ได้ | ติดตั้ง Chromium หรือกำหนด E2E_BROWSER_EXECUTABLE |
| Test runtime ค้าง | ใช้ Node24 ที่ตรวจรอบล่าสุด แล้วรันใหม่พร้อมเก็บ log |
