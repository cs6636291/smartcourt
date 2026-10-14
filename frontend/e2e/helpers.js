import { expect } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const API = 'http://127.0.0.1:8099/api';
export const PASSWORD = 'E2eTestPassword123!';

export async function login(page, email = 'member1@example.test') {
  await page.goto('/');
  await page.getByRole('button', { name: 'เข้าสู่ระบบ / สมัครสมาชิก' }).click();
  await page.getByLabel('อีเมล', { exact: true }).fill(email);
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'โปรไฟล์', exact: true })).toBeVisible();
}

export async function token(request, email) {
  const response = await request.post(`${API}/accounts/login/`, { data: { email, password: PASSWORD } });
  expect(response.status()).toBe(200);
  return (await response.json()).access;
}

export async function readMailOtp(email) {
  let otp;
  await expect.poll(async () => {
    const mailbox = path.join(process.env.E2E_DATA_DIR, 'mail');
    const files = await readdir(mailbox).catch(() => []);
    for (const file of files) {
      const content = await readFile(path.join(mailbox, file), 'utf8');
      if (!content.includes(`To: ${email}`)) continue;
      const decoded = [...content.matchAll(/\r?\n\r?\n([A-Za-z0-9+/=\r\n]+)/g)]
        .map((match) => Buffer.from(match[1].replace(/\s/g, ''), 'base64').toString('utf8'));
      // Django may write UTF-8 using 8bit or quoted-printable rather than base64.
      otp = [content, ...decoded].join('\n').match(/\b\d{6}\b/)?.[0];
      if (otp) return true;
    }
    return false;
  }, { message: 'OTP arrived in isolated file email backend' }).toBe(true);
  return otp;
}

export async function selectFutureSlot(page, offset = 1) {
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/courts/schedule/') && response.status() === 200);
  await page.locator('header').getByRole('button', { name: 'จองสนาม', exact: true }).click();
  const schedule = await (await responsePromise).json();
  const day = schedule.dates[offset];
  const court = day.courts.find((item) => item.floor === '3' && item.available_slots.length);
  expect(court).toBeTruthy();
  const displayedDate = new Date(`${day.date}T00:00:00`).toLocaleDateString('th-TH', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
  await page.getByRole('button', { name: `จอง ${court.name} วันที่ ${displayedDate} เวลา ${court.available_slots[0]} -`, exact: false }).click();
  await expect(page.getByRole('heading', { name: 'ยืนยันการจองสนาม' })).toBeVisible();
  return { date: day.date, court: court.id, start_time: court.available_slots[0] };
}

export async function confirmBooking(page) {
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'การจองสำเร็จ' })).toBeVisible();
  await page.getByRole('button', { name: 'กลับสู่หน้าหลัก', exact: true }).click();
}
