"""Run suites and assemble printable reports from actual current results."""
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
from generate_test_report import page

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
EVIDENCE = DOCS / 'test-evidence'

def run(command, cwd, log, env, timeout=150):
    print(f'Running {log.name}', flush=True)
    process = subprocess.Popen(command, cwd=cwd, env=env, stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace')
    try:
        output, _ = process.communicate(timeout=timeout)
        code = process.returncode
    except subprocess.TimeoutExpired:
        if os.name == 'nt':
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], capture_output=True)
        else:
            process.kill()
        output, _ = process.communicate()
        output += '\nTIMEOUT: no completed result\n'
        code = 124
    log.write_text(output, encoding='utf-8')
    return code, output

def flatten_specs(suites):
    for suite in suites:
        yield from suite.get('specs', [])
        yield from flatten_specs(suite.get('suites', []))

def backend_results(log):
    headers = list(re.finditer(r'(test_\w+) \(([^\n]+)\) \.\.\. ', log))
    for index, header in enumerate(headers):
        end = headers[index + 1].start() if index + 1 < len(headers) else log.find('\n---', header.end())
        body = log[header.end():end if end >= 0 else len(log)]
        outcomes = re.findall(r'^(ok|FAIL|ERROR|skipped[^\n]*)\s*$', body, re.MULTILINE)
        yield header.group(1), header.group(2), outcomes[-1] if outcomes else 'unknown'

def assemble(codes, logs, stamp):
    cases = []
    for name, source, state in backend_results(logs['backend']):
        cases.append(dict(id=f'TC-B{len(cases)+1:02}', name=name, source=source,
                          state={'ok':'ผ่าน','FAIL':'ไม่ผ่าน','ERROR':'ข้อผิดพลาด','unknown':'ไม่มีผลยืนยัน'}.get(state,'ข้าม'),
                          level='Django API/Admin · ฐานข้อมูลทดสอบ'))
    result = EVIDENCE / 'frontend-results.json'
    if result.exists() and codes['frontend'] != 124:
        count = 0
        for file in json.loads(result.read_text(encoding='utf-8')).get('testResults', []):
            for item in file.get('assertionResults', []):
                count += 1
                cases.append(dict(id=f'TC-F{count:02}', name=item['title'], source=file['name'],
                                  state={'passed':'ผ่าน','failed':'ไม่ผ่าน'}.get(item['status'],'ข้าม'),
                                  level='React/jsdom · API จำลอง'))
    result = DOCS / 'e2e-results.json'
    if result.exists() and codes.get('e2e') in (0, 1):
        count = 0
        for spec in flatten_specs(json.loads(result.read_text(encoding='utf-8')).get('suites', [])):
            for test in spec.get('tests', []):
                count += 1
                results = test.get('results', [])
                status = results[-1].get('status') if results else 'unknown'
                cases.append(dict(id=f'TC-E{count:02}', name=spec['title']+' ['+test.get('projectName','')+']',
                                  source=spec.get('file',''), state={'passed':'ผ่าน','failed':'ไม่ผ่าน','timedOut':'หมดเวลา'}.get(status,'ไม่มีผลยืนยัน'),
                                  level='Playwright · Chromium · Backend จริง/SQLite แยก · อีเมลลงไฟล์'))
    passed = sum(c['state'] == 'ผ่าน' for c in cases)
    summary = f'<p>ผลจริง ณ {html.escape(stamp)} (Asia/Bangkok): ผ่าน {passed}/{len(cases)} กรณีที่ได้รับผล</p>'
    summary += '<p>'+html.escape(' · '.join(f'{k}: exit {v}' for k,v in codes.items()))+'</p>'
    summary += '<p class="note">ผลผ่านไม่ใช่เปอร์เซ็นต์ coverage ไม่มีการส่งอีเมลจริงไปบุคคลภายนอก Backend และ E2E ใช้ฐานข้อมูลแยก การทดสอบ SMTP จำลองและ E2E อ่านอีเมลจากไฟล์ การยกเลิกเป็น Update สถานะ; CRUD สนามทดสอบผ่าน Django Admin</p>'
    coverage = []
    for title, path, extract, link in [
        ('Backend', EVIDENCE/'backend-coverage.json', lambda d:d['totals']['percent_covered'], 'test-evidence/backend-coverage/index.html'),
        ('Frontend', EVIDENCE/'frontend-coverage/coverage-summary.json', lambda d:d['total']['lines']['pct'], 'test-evidence/frontend-coverage/index.html'),
    ]:
        if path.exists():
            value = extract(json.loads(path.read_text(encoding='utf-8')))
            coverage.append(f'<li>{title}: {value:.2f}% ({"statements + branches" if title == "Backend" else "lines"}) · <a href="{link}">รายละเอียด</a></li>')
    table = '<table><thead><tr><th>TC</th><th>กรณีทดสอบ (ชื่อในโค้ด)</th><th>ระดับ/หลักฐาน</th><th>ผล</th></tr></thead><tbody>'
    for c in cases:
        table += f'<tr id="{c["id"]}"><td>{c["id"]}</td><td>{html.escape(c["name"])}</td><td>{html.escape(c["level"])}<br><code>{html.escape(c["source"])}</code></td><td>{c["state"]}</td></tr>'
    table += '</tbody></table>'
    evidence = '<h2>หลักฐานการรัน</h2><ul>'+''.join(f'<li><a href="test-evidence/{key}.txt">{key} log</a></li>' for key in logs)+'</ul>'
    report = summary+'<h2>Coverage ที่วัดจริง</h2><ul>'+''.join(coverage)+'</ul>'+table+evidence
    report += '<h2>ขอบเขตและข้อจำกัด</h2><p>Backend บางกรณี force_authenticate ไม่ผ่าน JWT แต่มีชุด JWT จริงเพิ่มเติม Frontend unit tests จำลอง API; E2E ต่อ Backend จริงและอีเมลไฟล์ มิได้ทดสอบ SMTP ภายนอกหรือโหลดหลายผู้ใช้ Browser อื่นและ accessibility เต็มรูปแบบยังไม่ทดสอบ</p>'
    frontend_coverage = EVIDENCE/'frontend-coverage/coverage-summary.json'
    if frontend_coverage.exists():
        metrics = json.loads(frontend_coverage.read_text(encoding='utf-8'))['total']
        report += '<p>Frontend: '+html.escape(' · '.join(f'{name} {metrics[name]["pct"]}%' for name in ('statements','lines','branches','functions')))+'</p>'
    report += '<p>Coverage frontend วัดไฟล์ที่ระบุใน vite.config.js ไม่รวม legacy/AuthLayout; backend ไม่รวม migrations/tests/apps ตัวเลขสองฝั่งใช้คนละ metric ต้องอ่านรายละเอียดประกอบ</p><p><a href="e2e-report/index.html">รายงาน E2E</a> · <a href="use-cases.html">Use Case</a> · <a href="database-design.html">ER/Data Dictionary</a> · <a href="student-assessment.html">บทประเมิน</a></p>'
    (DOCS/'test-report.html').write_text(page('SmartCourt — รายงานการทดสอบล่าสุด', report), encoding='utf-8')
    groups = [
        ('สมัครและ OTP', ['otp','registration','verification','email'], 'SMTP ภายนอกจริงและ cache สำหรับหลาย worker'),
        ('เข้าสู่ระบบ/ออกจากระบบ/JWT', ['login','logout','refresh','token','session'], 'Bearer token ยังอยู่ localStorage; production ควรพิจารณา HttpOnly cookie/CSRF'),
        ('โปรไฟล์และตรวจข้อมูล', ['profile','student','std_id','name','payload'], 'อีเมลล็อกไว้; ยังไม่มี flow เปลี่ยนอีเมลใหม่'),
        ('สถานะและรายการของตนเอง', ['status','schedule','bookings','owner','eligibility'], 'ปริมาณข้อมูลมากและโหลดหลายผู้ใช้'),
        ('จอง/ยกเลิก/คืนสิทธิ์', ['book','cancel','conflict','constraint','slot','journey','popup'], 'ข้อจำกัด SQLite เมื่อคำขอมากต้องประเมินเพิ่ม'),
        ('CRUD สนามและ Admin', ['admin','court_choice','cascades'], 'การลบสนาม CASCADE ลบประวัติ; ถ้าใช้งานจริงควรพิจารณาปิดสนามแทนลบ'),
    ]
    assessment = '<p class="note">ร่างช่วยจัดทำด้วย AI นักศึกษาต้องตรวจผล ทดลองจริง และเขียนบทสรุปของตนเองก่อนส่ง</p><p>ชื่อ/รหัสนักศึกษา: ................................ วันที่ประเมิน: ................................</p>'+summary
    assessment += '<h2>ฟังก์ชันเทียบกับ TC</h2><table><tr><th>ฟังก์ชัน</th><th>TC ที่เกี่ยวข้อง</th><th>สิ่งที่ยังต้องประเมิน</th></tr>'
    for label, terms, missing in groups:
        related = [c for c in cases if any(term in c['name'].lower() for term in terms)]
        links = ', '.join(f'<a href="test-report.html#{c["id"]}">{c["id"]}</a>' for c in related) or 'ยังไม่มีผล'
        assessment += f'<tr><td>{label}</td><td>{links}</td><td>{missing}</td></tr>'
    assessment += '</table><p>TC อาจเกี่ยวข้องหลายฟังก์ชัน จับคู่จากชื่อพฤติกรรมใน test; นักศึกษาควรอ่าน assertion และยืนยันก่อนส่ง</p><h2>วิเคราะห์ส่วนที่ยังขาด</h2><p>เพิ่ม CRUD/Admin, validation, OTP expiry/reuse/rate, profile, token และ E2E แล้ว โดยดูผลจริงข้างต้น ยังต้องทดสอบ SMTP จริง, การตั้งค่า server/shared cache, browser อื่น, accessibility, backup/restore และโหลดพร้อมกันจำนวนมาก ไม่อ้างความพร้อม production จากจำนวน test ผ่าน</p>'
    assessment += '<h2>บทประเมินที่นักศึกษาต้องเขียน</h2><p>ฟังก์ชันที่ทดลองด้วยตนเองและหลักฐาน: ................................................................</p><p>ปัญหาที่พบและวิธีแก้: ................................................................</p><p>เหตุผลที่ TC ครอบคลุม/ยังไม่ครอบคลุม: ................................................................</p><p>แผนปรับปรุงตามลำดับ: ................................................................</p><p>ลงชื่อ: ................................</p>'
    (DOCS/'student-assessment.html').write_text(page('SmartCourt — ตารางประเมินการทดสอบของนักศึกษา',assessment), encoding='utf-8')
    (EVIDENCE/'summary.json').write_text(json.dumps(dict(timestamp=stamp, exit_codes=codes, passed=passed,total=len(cases),cases=cases),ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Report generated: {passed}/{len(cases)} passed; exits {codes}',flush=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--node', default=shutil.which('node'))
    parser.add_argument('--e2e', action='store_true')
    args = parser.parse_args()
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    temp = ROOT/'frontend/.vitest-tmp'
    temp.mkdir(exist_ok=True)
    env = dict(os.environ,PYTHONIOENCODING='utf-8',TEMP=str(temp),TMP=str(temp))
    python = ROOT/'backend/venv/Scripts/python.exe'
    codes,logs = {},{}
    codes['backend'],logs['backend'] = run([str(python),'-m','coverage','run','manage.py','test','--verbosity','2'],ROOT/'backend',EVIDENCE/'backend.txt',env)
    run([str(python),'-m','coverage','html'],ROOT/'backend',EVIDENCE/'backend-coverage.txt',env)
    run([str(python),'-m','coverage','json'],ROOT/'backend',EVIDENCE/'backend-coverage-json.txt',env)
    result = EVIDENCE/'frontend-results.json'
    if result.exists(): result.unlink()
    command=[args.node,'node_modules/vitest/vitest.mjs','run','--coverage','--pool=threads','--maxWorkers=1','--reporter=default','--reporter=json',f'--outputFile.json={result}']
    codes['frontend'],logs['frontend'] = run(command,ROOT/'frontend',EVIDENCE/'frontend.txt',env)
    codes['build'],logs['build'] = run([args.node,'node_modules/vite/bin/vite.js','build'],ROOT/'frontend',EVIDENCE/'build.txt',env)
    result = DOCS/'e2e-results.json'
    if result.exists(): result.unlink()
    if args.e2e:
        codes['e2e'],logs['e2e'] = run([args.node,'node_modules/@playwright/test/cli.js','test'],ROOT/'frontend',EVIDENCE/'e2e.txt',env,timeout=240)
    else: codes['e2e']='ไม่ได้รันรอบนี้'
    assemble(codes,logs,datetime.now(ZoneInfo('Asia/Bangkok')).isoformat(timespec='seconds'))
    sys.exit(0 if all(code==0 for key,code in codes.items() if key!='e2e' or args.e2e) else 1)

if __name__=='__main__': main()
