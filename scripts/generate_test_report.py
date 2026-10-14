"""Run existing tests and write offline, printable reports without changing app data."""
import argparse
import html
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
EVIDENCE = DOCS / 'test-evidence'
BACKEND = [
    ('registration_rejects_email_without_verified_otp', 'สมัครโดยยังไม่ผ่าน OTP', 'HTTP 400 และแจ้งให้ยืนยัน OTP ก่อน'),
    ('registration_accepts_email_after_verified_otp', 'สมัครหลังยืนยัน OTP', 'ยืนยันสำเร็จ HTTP 200 สมัคร HTTP 201 และล้างสิทธิ์ OTP'),
    ('guest_can_view_status_but_cannot_book', 'Guest ดูสถานะ แต่จองไม่ได้', 'สถานะ HTTP 200 จอง HTTP 401 พร้อม 12 ช่วงเวลาและ 5 วัน'),
    ('status_filters_booked_slot_and_rejects_invalid_time', 'กรองสถานะตามเวลา', 'ช่วงที่จองไม่ว่าง ช่วงถัดไปว่าง เวลา 08:30 ถูกปฏิเสธ'),
    ('schedule_returns_five_dates_with_available_slots_per_court', 'ตารางห้าวันและสิทธิ์รายวัน', '5 วัน วันที่จองแล้วปิดสิทธิ์ วันถัดไปมี 12 ช่วงเวลา'),
    ('guest_cannot_view_booking_schedule', 'Guest เรียกตารางจอง', 'HTTP 401'),
    ('past_slots_are_hidden_and_rejected_for_today', 'ห้ามจองเวลาที่ผ่านแล้ว', 'จำลองเวลา 10:30 ไม่แสดง 10:00 แสดง 11:00 และปฏิเสธจอง 10:00'),
    ('booking_rejects_invalid_slot_and_date_outside_five_days', 'เวลาและวันที่นอกขอบเขต', '20:00 และวันนี้+5 วัน HTTP 400 ไม่มีข้อมูลจองเพิ่ม'),
    ('user_can_book_once_per_day_and_cancel_to_release_slot', 'จอง/จำกัดสิทธิ์/ยกเลิก/จองใหม่', 'ครั้งแรก HTTP 201 ครั้งที่สอง 400 ยกเลิก 200 จองใหม่ 201 เหลือ confirmed 1 รายการ'),
    ('user_cannot_cancel_another_users_booking', 'ห้ามยกเลิกของผู้อื่น', 'HTTP 404 และรายการเดิมยัง confirmed'),
]
FRONTEND = [
    ('shows the guest header', 'หน้าหลัก Guest', 'โลโก้ ปุ่มเข้าสู่ระบบ และจำนวนสนามตามข้อมูลจำลอง'),
    ('renders every court', 'รูปสนามในหน้าหลัก', 'การ์ดแยกสนามและ path รูปที่ถูกต้อง'),
    ('refreshes booking eligibility', 'เข้าสู่ระบบแล้วโหลดสิทธิ์ใหม่', 'จำลอง login สำเร็จ ปุ่มจองเปลี่ยนเป็นปิดสิทธิ์รายวัน'),
    ('keeps the real court photos', 'หน้าหลักสมาชิก', 'เมนู รูปสนาม และรายการจองของตนเอง'),
    ('opens the booking schedule', 'เปิดหน้าจองสนาม', 'เมนูจองสีส้ม เลือกชั้น และปิดปุ่มวันที่หมดสิทธิ์'),
    ('matches the compact Figma login', 'แบบฟอร์มเข้าสู่ระบบ', 'การ์ดและโลโก้ตรงค่าที่กำหนด'),
    ('shows the failed-login message', 'แสดง login ผิด', 'แสดงข้อความ API จำลองภายในแบบฟอร์ม'),
    ('asks for email only', 'อีเมลก่อน OTP', 'เรียก send-otp ด้วยอีเมลและส่งต่อขั้นถัดไป'),
    ('keeps the email from the first step', 'ล็อกอีเมลขั้นข้อมูลสมาชิก', 'ค่าอีเมลเดิมและ readonly'),
    ('asks for confirmation before cancelling', 'popup ยกเลิกและย้อนกลับ', 'แสดงรายละเอียดและไม่เรียก cancel เมื่อกดย้อนกลับ; ตรวจ class การจัดวาง'),
    ('cancels only after the confirmation', 'ยืนยันยกเลิกในหน้าเว็บ', 'เรียก cancel ตาม ID แจ้งโหลดใหม่และแสดงสำเร็จ'),
    ('uses the homepage image for futsal', 'รูปยืนยันฟุตซอล', 'path รูปเหมือนหน้าหลัก'),
    ('uses the homepage image for basketball', 'รูปยืนยันบาส', 'path รูปเหมือนหน้าหลัก'),
    ('uses the homepage image for volleyball', 'รูปยืนยันวอลเลย์บอล', 'path รูปเหมือนหน้าหลัก'),
    ('uses the homepage image for badminton', 'รูปยืนยันแบดมินตัน', 'path รูปเหมือนหน้าหลัก'),
]
CSS = '''body{font:15px/1.7 Tahoma,sans-serif;background:#f4f7fb;color:#17243b;margin:0}main{max-width:1150px;margin:25px auto;padding:32px;background:white}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #bdcadd;padding:9px;vertical-align:top;text-align:left}th{background:#edf3fb}pre,code{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}.note{background:#fff3df;padding:15px}.pass{color:#146c43}.missing{color:#a34b00}button{padding:10px 20px}@media print{body{background:white}main{padding:0;margin:0}button{display:none}thead{display:table-header-group}tr{break-inside:avoid}h2{break-after:avoid}pre{font-size:9px}}@page{size:A4;margin:12mm}'''

def esc(value):
    return html.escape(str(value))

def page(title, body):
    return f'<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><style>{CSS}</style><main><button onclick="window.print()">พิมพ์ / บันทึก PDF</button><h1>{esc(title)}</h1>{body}</main></html>'

def run(command, cwd, env):
    process = subprocess.Popen(command, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace')
    try:
        output, _ = process.communicate(timeout=60)
        return process.returncode, output
    except subprocess.TimeoutExpired:
        if os.name == 'nt':
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], capture_output=True)
        else:
            process.kill()
        output, _ = process.communicate()
        return 124, output + '\nTIMEOUT: exceeded 60 seconds. No completed result.\n'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--node', help='Optional Node executable for Vitest')
    args = parser.parse_args()
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    temp = ROOT / 'frontend' / '.vitest-tmp'
    temp.mkdir(exist_ok=True)
    env.update(TEMP=str(temp), TMP=str(temp))
    python = ROOT / 'backend' / 'venv' / 'Scripts' / 'python.exe'
    if not python.exists():
        python = Path(sys.executable)
    backend_command = [str(python), 'manage.py', 'test', '--verbosity', '2']
    print('Running Django tests...', flush=True)
    backend_code, backend_log = run(backend_command, ROOT / 'backend', env)
    (EVIDENCE / 'backend.txt').write_text(backend_log, encoding='utf-8')
    print('Running frontend tests (60-second limit)...', flush=True)
    node = args.node or shutil.which('node')
    if not node:
        raise RuntimeError('Node executable unavailable')
    json_path = EVIDENCE / 'frontend-results.json'
    # Prevent a stale report from a prior run being interpreted as this run.
    if json_path.exists():
        json_path.unlink()
    frontend_command = [node, 'node_modules/vitest/vitest.mjs', 'run', '--pool=threads', '--maxWorkers=1', '--reporter=default', '--reporter=json', f'--outputFile.json={json_path}']
    frontend_code, frontend_log = run(frontend_command, ROOT / 'frontend', env)
    (EVIDENCE / 'frontend.txt').write_text(frontend_log, encoding='utf-8')
    assertions = []
    if json_path.exists() and frontend_code != 124:
        data = json.loads(json_path.read_text(encoding='utf-8'))
        assertions = [assertion for result in data.get('testResults', []) for assertion in result.get('assertionResults', [])]
    rows = []
    for i, (name, label, expected) in enumerate(BACKEND, 1):
        match = re.search(r'test_' + re.escape(name) + r' \([^\n]*\) \.\.\. (ok|FAIL|ERROR|skipped[^\n]*)', backend_log)
        state = {'ok': 'ผ่าน', 'FAIL': 'ไม่ผ่าน', 'ERROR': 'ข้อผิดพลาด'}.get(match.group(1), 'ข้าม') if match else 'ไม่มีผลยืนยัน'
        rows.append((f'TC-B{i:02}', label, expected, state, f'test_{name}', 'Django API / ฐานข้อมูลทดสอบ'))
    for i, (name, label, expected) in enumerate(FRONTEND, 1):
        found = [a for a in assertions if name in a.get('title', '')]
        state = 'ผ่าน' if found and all(a['status'] == 'passed' for a in found) else 'ไม่ผ่าน' if any(a.get('status') == 'failed' for a in found) else 'ไม่มีผลยืนยัน'
        rows.append((f'TC-F{i:02}', label, expected, state, name, 'React / jsdom / API จำลอง'))
    stamp = datetime.now(ZoneInfo('Asia/Bangkok')).isoformat(timespec='seconds')
    passed = sum(r[3] == 'ผ่าน' for r in rows)
    summary = f'<p>เวลารัน (Asia/Bangkok): {esc(stamp)}</p><p>ผ่าน {passed}/{len(rows)} กรณีในทะเบียน TC · Backend exit code {backend_code} · Frontend exit code {frontend_code}</p>'
    summary += '<p class="note">ผลผ่านนับจากผลทดสอบจริงเท่านั้น “ไม่มีผลยืนยัน” หมายถึงไม่ได้รับผล ไม่ใช่ผ่านและไม่ใช่หลักฐานว่าฟังก์ชันเสีย การทดสอบ Backend ใช้ SQLite ทดสอบแยกจากฐานข้อมูลใช้งาน; frontend ใช้ API จำลอง ไม่มี E2E เบราว์เซอร์จริง ไม่มีผลวัด code coverage จึงไม่อ้างว่าครอบคลุม 80% หรือครบทั้งระบบ</p>'
    table = '<table><thead><tr><th>TC</th><th>ฟังก์ชัน/กรณีทดสอบ</th><th>ผลที่คาดหวัง</th><th>ผลจริง</th><th>หลักฐาน/ระดับ</th></tr></thead><tbody>'
    for tc, label, expected, state, name, level in rows:
        table += f'<tr id="{tc}"><td>{tc}</td><td>{esc(label)}</td><td>{esc(expected)}</td><td class="{"pass" if state == "ผ่าน" else "missing"}">{state}</td><td>{esc(level)}<br><code>{esc(name)}</code></td></tr>'
    table += '</tbody></table>'
    report = summary + '<h2>ทะเบียนกรณีทดสอบและผล</h2>' + table
    report += '<h2>คำสั่งรันและผลดิบ</h2><p>เปิด <a href="test-evidence/backend.txt">Backend log</a> และ <a href="test-evidence/frontend.txt">Frontend log</a></p>'
    report += f'<pre>Backend cwd: backend\n{esc(subprocess.list2cmdline(backend_command))}\nFrontend cwd: frontend\n{esc(subprocess.list2cmdline(frontend_command))}</pre>'
    report += '<h2>การอ่านผลและข้อจำกัด</h2><p>API tests บางกรณีใช้ force_authenticate จึงไม่ได้พิสูจน์ JWT login จริง การสมัครผ่าน OTP ใช้ cache ที่เตรียมไว้ ไม่ได้ส่ง SMTP จริง การตรวจ class และ path รูปไม่ได้พิสูจน์ภาพแสดงสำเร็จหรือ popup เลื่อนได้จริงทุกขนาดจอ การทดสอบหลายเงื่อนไขอยู่ในหนึ่ง TC จึงจำนวน TC ไม่ใช่จำนวน assertion</p>'
    report += '<p>ที่มาของโค้ดทดสอบ: backend/accounts/tests.py, backend/courts/tests.py และ frontend/src/**/*.test.jsx</p><p><a href="use-cases.html">Use Case</a> · <a href="student-assessment.html">เอกสารประเมิน</a></p>'
    (DOCS / 'test-report.html').write_text(page('SmartCourt — รายงานการทดสอบ', report), encoding='utf-8')
    mapping = [
        ('UC01 ดู/กรองสถานะสนาม', 'TC-B03, TC-B04, TC-F01, TC-F02', 'API และ UI จำลอง; ยังขาดวันที่ผิดรูปแบบและ API ล้มเหลว'),
        ('UC02 ขอ/ยืนยัน OTP', 'TC-B01, TC-B02, TC-F08', 'ครอบคลุมก่อน/หลังยืนยันบางส่วน; ยังขาด OTP ผิด หมดอายุ ใช้ซ้ำ และ SMTP จริง'),
        ('UC03 สมัครสมาชิก', 'TC-B01, TC-B02, TC-F09', 'สมัครผ่าน API และล็อกอีเมล; ยังขาดข้อมูลซ้ำ รหัสผ่านอ่อน และข้อมูลผิดรูปแบบ'),
        ('UC04 เข้าสู่ระบบ', 'TC-F03, TC-F06, TC-F07', 'UI/API จำลอง; ยังขาด JWT login จริง refresh และ logout/token หมดอายุ'),
        ('UC05 ตารางจอง', 'TC-B05, TC-B06, TC-B07, TC-F05', 'สิทธิ์รายวัน ห้าวัน และเวลาที่ผ่าน; ยังขาด filter ทุกชั้น/วัน/เวลาในเบราว์เซอร์'),
        ('UC06 ยืนยันจอง', 'TC-B03, TC-B07, TC-B08, TC-B09, TC-F12–TC-F15', 'API บันทึกและกฎบางส่วน; frontend ตรวจรูปเท่านั้น ยังขาดจองชนกันต่างผู้ใช้และ E2E'),
        ('UC07 ดูรายการของตนเอง', 'TC-F04, TC-F05', 'UI ใช้รายการจำลอง; ยังขาด API my-bookings แยกเจ้าของและประวัติ cancelled'),
        ('UC08 ยกเลิก', 'TC-B09, TC-B10, TC-F10, TC-F11', 'เจ้าของ ยืนยัน/ย้อนกลับ คืนสิทธิ์; ยังขาดยกเลิกซ้ำ API ล้มเหลวและข้อมูลรีเฟรชจริง'),
        ('UC09 โปรไฟล์/ออกจากระบบ', 'ยังไม่มี TC โดยตรง', 'ต้องเพิ่มบันทึกและอ่านกลับ ข้อมูลซ้ำ ผู้ไม่ล็อกอิน และการล้าง session'),
        ('UC10 CRUD สนาม Admin', 'ยังไม่มี TC โดยตรง', 'ต้องเพิ่ม Create/Read/Update/Delete และสิทธิ์ผู้ดูแล รวมผล CASCADE'),
        ('UC11 จัดการรายการจอง Admin', 'ยังไม่มี TC โดยตรง', 'ต้องเพิ่มแก้สถานะ validation และการเข้าถึงตาม permission'),
        ('UC12 จัดการผู้ใช้/สิทธิ์', 'ยังไม่มี TC โดยตรง', 'ต้องเพิ่มสร้าง/แก้/ลบ และการป้องกันสมาชิกเข้าถึง Admin'),
    ]
    assessment = '<p>ฉบับร่างช่วยจัดทำด้วย AI · นักศึกษาต้องตรวจผล ทดลองใช้งานจริง และเขียนข้อสรุปของตนเองก่อนส่ง</p><p>ชื่อ: ................................ รหัสนักศึกษา: ................................ วันที่ประเมิน: ................................</p>'
    assessment += summary + '<h2>ตารางเทียบฟังก์ชันกับกรณีทดสอบ</h2><table><thead><tr><th>ฟังก์ชัน</th><th>TC ที่เกี่ยวข้อง</th><th>การประเมินและสิ่งที่ยังขาด</th></tr></thead><tbody>'
    for function, ids, judgement in mapping:
        assessment += f'<tr><td>{esc(function)}</td><td>{esc(ids)}</td><td>{esc(judgement)}</td></tr>'
    assessment += '</tbody></table><h2>วิเคราะห์ส่วนที่ยังไม่ได้ทดสอบ</h2><p>ชุดปัจจุบันเน้นการจองและ UI มีประโยชน์ในการตรวจการเปลี่ยนโค้ด แต่ไม่ครอบคลุม CRUD ของผู้ดูแล โปรไฟล์ หรือการใช้งานเต็ม flow กับ Backend จริง จึงยังใช้ยืนยันว่าระบบครบทุกฟังก์ชันไม่ได้</p>'
    assessment += '<ol><li>ทดสอบจองชนกันสองบัญชีและคำขอพร้อมกัน เพื่อยืนยันว่ามี confirmed เพียงหนึ่งรายการและตอบข้อผิดพลาดถูกต้อง</li><li>ทดสอบ CRUD สนามใน Admin และสิทธิ์ Guest/สมาชิก/staff โดยบันทึกและอ่านข้อมูลจริง รวมผลของการลบสนามที่มีรายการจอง</li><li>ทดสอบ OTP ผิด/หมดอายุ/ใช้ซ้ำ/ขอซ้ำ การส่งอีเมลจริง และการจำกัดความถี่ รวมประเด็นที่ API คืน OTP เมื่อส่งเมลไม่ได้</li><li>ทดสอบโปรไฟล์ ข้อมูลซ้ำ รหัสนักศึกษาผิดรูปแบบ และการเปลี่ยนอีเมลโดยยืนยันเจ้าของ</li><li>ทำ E2E สมัคร → เข้าสู่ระบบ → จอง → รายการของตนเอง → ยกเลิก → คืนเวลาและสิทธิ์ พร้อมตรวจหน้าจอมือถือและ popup</li><li>ทดสอบ token หมดอายุ refresh/logout รวมเครือข่ายล้มเหลวและการแสดงข้อความผิดพลาด</li><li>วัด coverage เพิ่ม และทบทวนว่าผลที่ผ่านตรวจพฤติกรรมธุรกิจจริงหรือเพียงรูปแบบ UI; ไม่ตีความจำนวน test ผ่านเป็นเปอร์เซ็นต์ coverage</li></ol>'
    assessment += '<h2>แผนตรวจด้วยตนเองก่อนส่ง</h2><table><tr><th>รายการสาธิต</th><th>ผล/หลักฐานที่นักศึกษาบันทึก</th></tr><tr><td>เพิ่ม/อ่าน/แก้/ลบสนามด้วย Admin</td><td>................................</td></tr><tr><td>จองจริงและอ่านรายการกลับจากฐานข้อมูล</td><td>................................</td></tr><tr><td>บัญชีอื่นเข้าถึงหรือยกเลิกรายการของเราไม่ได้</td><td>................................</td></tr><tr><td>ยกเลิกและตรวจหน้าหลัก/หน้าจองหลังรีเฟรช</td><td>................................</td></tr><tr><td>OTP และหน้าจอมือถือ/การเลื่อน popup</td><td>................................</td></tr></table>'
    assessment += '<h2>บทสรุปของนักศึกษา</h2><p>จากผลที่ตรวจด้วยตนเอง ระบบทำได้ครบในส่วน: ....................................................................</p><p>ข้อจำกัดที่พบและตัวอย่างหลักฐาน: ....................................................................</p><p>ลำดับการแก้ไขก่อนใช้งานจริง: ....................................................................</p><p>ลงชื่อผู้ประเมิน: ................................</p><p><a href="test-report.html">รายงานผลจริง</a> · <a href="use-cases.html">Use Case</a></p>'
    (DOCS / 'student-assessment.html').write_text(page('SmartCourt — ตารางประเมินการทดสอบของนักศึกษา', assessment), encoding='utf-8')
    manifest = dict(timestamp=stamp, backend_exit_code=backend_code, frontend_exit_code=frontend_code, passed=passed, total=len(rows), cases=[dict(id=r[0], name=r[1], status=r[3], test=r[4]) for r in rows])
    (EVIDENCE / 'summary.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Generated reports: {passed}/{len(rows)} confirmed passes. Backend={backend_code}, Frontend={frontend_code}', flush=True)

if __name__ == '__main__':
    from verify_project import main
    main()
