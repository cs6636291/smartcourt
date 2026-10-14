"""Generate ER and data dictionary directly from the current Django models."""
import os
from pathlib import Path
import sys
from html import escape
from generate_test_report import page

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE','smartcourt_config.settings')
import django
django.setup()
from accounts.models import User
from courts.models import Court, Appointment

diagram = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 350" role="img" aria-label="ER User หนึ่งต่อศูนย์หรือหลาย Appointment และ Court หนึ่งต่อศูนย์หรือหลาย Appointment"><g fill="#edf3fb" stroke="#5274a5" stroke-width="2"><rect x="10" y="45" width="260" height="240" rx="10"/><rect x="370" y="45" width="260" height="240" rx="10"/><rect x="730" y="45" width="260" height="240" rx="10"/></g><g font-family="Tahoma,sans-serif" font-size="17" fill="#17243b"><text x="30" y="80">accounts_user</text><text x="30" y="115">PK id (BigAutoField)</text><text x="30" y="150">email (unique), std_id (unique)</text><text x="30" y="185">ชื่อ/เพศ/avatar/username</text><text x="30" y="220">password hash / สิทธิ์ Django</text><text x="390" y="80">courts_appointment</text><text x="390" y="115">PK id</text><text x="390" y="150">FK user_id → accounts_user.id</text><text x="390" y="185">FK court_id → courts_court.id</text><text x="390" y="220">date/start_time/end_time</text><text x="390" y="255">status/booked_at</text><text x="750" y="80">courts_court</text><text x="750" y="115">PK id</text><text x="750" y="150">name / floor</text><text x="750" y="185">sport_type / description</text></g><g stroke="#5274a5" stroke-width="2"><path d="M270 170H370 M630 170H730"/></g><g font-family="Tahoma,sans-serif" font-size="17"><text x="280" y="155">1</text><text x="325" y="155">0..*</text><text x="635" y="155">0..*</text><text x="705" y="155">1</text></g></svg>'''
body = '<p>สร้างจากโมเดลในโค้ดปัจจุบัน · ฉบับร่าง AI สำหรับนักศึกษาตรวจทานก่อนส่ง</p><h2>ER ระบบธุรกิจ</h2>'+diagram
body += '<p>User และ Court แต่ละรายการมี Appointment ได้ตั้งแต่ศูนย์ถึงหลายรายการ Appointment แต่ละรายการมีเจ้าของและสนามอย่างละหนึ่ง การจำกัดหนึ่งครั้งต่อวันใช้ constraint ของ confirmed ไม่ได้ทำให้ความสัมพันธ์ User–Appointment กลายเป็น 1:1</p>'
for model in (User,Court,Appointment):
    body += f'<h2>{model.__name__} · {model._meta.db_table}</h2><table><thead><tr><th>Field/column</th><th>ชนิด/ความยาว</th><th>PK/FK/unique</th><th>NULL/blank/default</th></tr></thead><tbody>'
    for field in model._meta.fields:
        flags = ['PK'] if field.primary_key else []
        if field.unique: flags.append('unique')
        if field.is_relation: flags.append('FK → '+field.related_model._meta.db_table+'.id; on_delete='+field.remote_field.on_delete.__name__)
        kind = field.get_internal_type() + (f'({field.max_length})' if field.max_length else '')
        default = str(field.default) if field.has_default() and not callable(field.default) else 'auto/callable' if field.has_default() else '-'
        if getattr(field,'auto_now_add',False): default = 'auto_now_add'
        body += f'<tr><td>{escape(field.name)} / {escape(field.column)}</td><td>{escape(kind)}</td><td>{escape(", ".join(flags) or "-")}</td><td>null={field.null}; blank={field.blank}; default={escape(default)}</td></tr>'
    body += '</tbody></table>'
    for field in model._meta.many_to_many:
        body += f'<p>M:N {field.name} → {field.related_model._meta.db_table} ผ่าน {field.remote_field.through._meta.db_table}</p>'
body += '<h2>ข้อกำหนดความถูกต้อง</h2><ul><li>email และ std_id ไม่ซ้ำ; Backend สมัครบังคับ std_id ตัวเลข ASCII 13 หลัก ชื่อและนามสกุลต้องไม่ว่าง</li><li>status: confirmed/cancelled; ยกเลิกเก็บประวัติและคืนสิทธิ์</li><li>uniq_confirmed_court_slot: court + date + start_time ไม่ซ้ำเมื่อ confirmed</li><li>uniq_confirmed_user_day: user + date ไม่ซ้ำเมื่อ confirmed</li><li>เวลาจองครั้งละหนึ่งชั่วโมง เริ่ม 08:00–19:00 จองได้วันนี้ถึงอีก4วัน ห้ามช่วงที่ผ่านแล้ว</li><li>ลบ User/Court ด้วย Admin จะ CASCADE ลบ Appointment ที่สัมพันธ์ มีหน้าจอยืนยันและการทดสอบผลนี้ หากต้องรักษาประวัติระยะยาวควรออกแบบปิดใช้งานสนามแทนลบ</li></ul>'
body += '<h2>ตารางระบบ Django เพิ่มเติม</h2><p>นอกจากสามตารางธุรกิจ มีตาราง groups/permissions, admin log, sessions, migrations และ outstanding/blacklisted token สำหรับยกเลิก refresh token OTP และหลักฐานสมัครเก็บใน cache พร้อม TTL มิใช่คอลัมน์ password และไม่คืน OTP ผ่าน API</p><p><a href="use-cases.html">Use Case</a> · <a href="test-report.html">ผลทดสอบ</a></p>'
(ROOT/'docs/database-design.html').write_text(page('SmartCourt — ER และ Data Dictionary',body),encoding='utf-8')
print('Generated docs/database-design.html from current models')
