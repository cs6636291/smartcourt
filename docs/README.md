# เอกสารประกอบการส่ง SmartCourt

เปิด HTML ด้วยเบราว์เซอร์ได้โดยไม่ต้องเปิด Backend หรือ Frontend และไม่ต้องเชื่อมต่ออินเทอร์เน็ต กดปุ่มพิมพ์ หรือ Ctrl+P เพื่อพิมพ์กระดาษ/บันทึก PDF

- `use-cases.html`: แผนภาพ Use Case แบบ SVG, บทบาท Guest/นักศึกษา/Admin, ขอบเขต กฎธุรกิจ ขั้นตอน ผลสำเร็จ และกรณีผิดพลาด
- `database-design.html`: ER และ Data Dictionary จากโมเดลจริง พร้อมข้อจำกัดฐานข้อมูลและความสัมพันธ์ Django
- `test-report.html`: รายงานผลการรันจริงพร้อมรหัส TC และข้อจำกัดของการทดสอบ
- `student-assessment.html`: **ร่างสำหรับนักศึกษาตรวจทาน** ตารางเทียบฟังก์ชันกับ TC วิเคราะห์สิ่งที่ขาด และช่องบันทึกผลสาธิต/ข้อสรุปของตนเอง
- `test-evidence/`: log การรัน Backend/Frontend, สรุป JSON และผล Vitest JSON เมื่อการรันเสร็จสมบูรณ์
- `e2e-report/index.html`: รายงาน Playwright ขั้นตอนใช้งานจริงกับฐานข้อมูลและอีเมลทดสอบแยก
- `operations.md`: วิธีตั้งค่า SMTP/JWT/HTTPS และข้อจำกัด production

## สร้างรายงานใหม่

จากโฟลเดอร์โปรเจกต์:

```powershell
.\backend\venv\Scripts\python.exe scripts/verify_project.py --e2e
```

ระบุ Node executable ได้เมื่อ runtime ปกติรัน Vitest ไม่สำเร็จ:

```powershell
.\backend\venv\Scripts\python.exe scripts/verify_project.py --node 'C:\path\to\node.exe' --e2e
```

ติดตั้ง dev dependencies ตาม frontend/package-lock.json และ `backend/requirements-dev.txt` ก่อนรัน ชุด API/component จำกัด150วินาทีและ E2E240วินาที ถ้าค้างบันทึก TIMEOUT ไม่แสดงเป็นผ่าน APIใช้ฐานข้อมูล Django แยก component ใช้ jsdom/APIจำลอง E2Eใช้ Backend/Frontendจริงกับ SQLiteและอีเมลไฟล์แยก

ติดตั้ง Chromium สำหรับ Playwright ด้วย `npx playwright install chromium` หรือระบุ browser ที่ติดตั้งอยู่ผ่าน `E2E_BROWSER_EXECUTABLE` อ่านรายละเอียดใน `frontend/e2e/README.md` รายงาน E2E อยู่ `docs/e2e-report/index.html`

สร้างเอกสาร ER จากโมเดลปัจจุบันด้วย `.\backend\venv\Scripts\python.exe scripts/generate_database_docs.py` ได้ `docs/database-design.html`

**การรันสคริปต์ซ้ำจะเขียนทับรายงาน หลักฐาน และร่าง student-assessment.html** ก่อนนักศึกษาแก้บทประเมิน ให้คัดลอกเป็นไฟล์ฉบับส่งอีกชื่อหนึ่ง เพื่อเก็บการเขียนของตนเอง

## สิ่งที่นักศึกษาต้องทำก่อนส่ง

1. ตรวจ Use Case กับขอบเขตที่ตกลงกับอาจารย์ โดยเฉพาะ CRUD สนามผ่าน Django Admin
2. อ่านผลจริงและข้อจำกัด ห้ามตีความผลผ่านทั้งหมดเป็นการครอบคลุมระบบทั้งหมดหรือ coverage 80%
3. ทดลองใช้งานจริงและบันทึกผลของตนเองในฉบับประเมิน เช่น CRUD Admin, การจอง/ยกเลิก, สิทธิ์ต่างบัญชี และจอมือถือ
4. เขียนข้อสรุปและสิ่งที่ยังไม่ได้ทดสอบด้วยตนเอง ใส่ชื่อ รหัสนักศึกษา และวันที่
5. แนบเอกสาร Requirement และ ER ที่ตรวจแก้ให้ตรงกับโค้ด แล้วพิมพ์เอกสารที่อาจารย์กำหนด

เอกสารที่ AI ช่วยจัดทำไม่ใช่หลักฐานว่านักศึกษาได้ประเมินระบบด้วยตนเอง จึงต้องตรวจและเติมก่อนส่ง
