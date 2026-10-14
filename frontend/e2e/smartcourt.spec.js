import { test, expect } from '@playwright/test';
import { API, PASSWORD, login, token, readMailOtp, selectFutureSlot, confirmBooking } from './helpers.js';

test('E2E01 registration through emailed OTP, locked email, logout and login', async ({ page }) => {
  const email = 'registration@example.test';
  await page.goto('/');
  await page.getByRole('button', { name: 'เข้าสู่ระบบ / สมัครสมาชิก' }).click();
  await page.getByRole('button', { name: 'สมัครสมาชิก', exact: true }).click();
  await page.getByLabel('กรอกอีเมล').fill(email);
  const sent = page.waitForResponse((response) => response.url().endsWith('/accounts/send-otp/'));
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  const payload = await (await sent).json();
  expect(payload).not.toHaveProperty('otp');
  const otp = await readMailOtp(email);
  for (let index = 0; index < 6; index += 1) await page.getByLabel(`OTP หลักที่ ${index + 1}`).fill(otp[index]);
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'กรอกข้อมูลสมาชิก' })).toBeVisible();
  await expect(page.getByLabel('อีเมล', { exact: true })).toHaveValue(email);
  await expect(page.getByLabel('อีเมล', { exact: true })).toHaveAttribute('readonly', '');
  await page.getByLabel('ชื่อ', { exact: true }).fill('สมาชิก');
  await page.getByLabel('นามสกุล', { exact: true }).fill('ทดสอบ');
  await page.getByLabel('รหัสนักศึกษา').fill('9900000000003');
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'สมัครสมาชิก', exact: true }).click();
  await expect(page.getByRole('button', { name: 'โปรไฟล์', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  await login(page, email);
});

test('E2E02 book, persist after reload, summaries on both pages, cancel and book again', async ({ page, request }) => {
  await login(page);
  const slot = await selectFutureSlot(page, 1);
  await confirmBooking(page);
  await expect(page.getByTestId('current-bookings')).toContainText('สนามฟุตซอล E2E');
  await page.getByRole('button', { name: 'หน้าหลัก', exact: true }).click();
  await expect(page.getByTestId('current-bookings')).toContainText('สนามฟุตซอล E2E');
  await page.reload();
  await expect(page.getByTestId('current-bookings')).toContainText('สนามฟุตซอล E2E');
  await page.getByRole('button', { name: /^ยกเลิกการจอง สนามฟุตซอล/ }).click();
  const dialog = page.getByRole('dialog', { name: 'ยืนยันการยกเลิกการจอง' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'ย้อนกลับ' }).click();
  await expect(page.getByTestId('current-bookings')).toBeVisible();
  await page.getByRole('button', { name: /^ยกเลิกการจอง สนามฟุตซอล/ }).click();
  await dialog.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ยกเลิกการจองแล้ว' })).toBeVisible();
  await page.getByRole('button', { name: 'กลับ', exact: true }).click();
  await expect(page.getByTestId('current-bookings')).toHaveCount(0);
  await selectFutureSlot(page, 1);
  await confirmBooking(page);
  const access = await page.evaluate(() => localStorage.getItem('access_token'));
  const history = await request.get(`${API}/courts/my-bookings/`, { headers: { Authorization: `Bearer ${access}` } });
  const rows = (await history.json()).filter((row) => row.date === slot.date);
  expect(rows.filter((row) => row.status === 'confirmed')).toHaveLength(1);
  expect(rows.filter((row) => row.status === 'cancelled')).toHaveLength(1);
});

test('E2E03 profile saves to real database, survives reload, email remains locked', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'โปรไฟล์', exact: true }).click();
  await expect(page.getByLabel('ชื่อ', { exact: true })).toHaveValue('ทดสอบ');
  await expect(page.getByLabel('อีเมล', { exact: true })).toHaveAttribute('readonly', '');
  await page.getByLabel('ชื่อเล่น', { exact: true }).fill('บันทึกจริง');
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('บันทึกข้อมูลโปรไฟล์แล้ว');
  await page.reload();
  await page.getByRole('button', { name: 'โปรไฟล์', exact: true }).click();
  await expect(page.getByLabel('ชื่อเล่น', { exact: true })).toHaveValue('บันทึกจริง');
});

test('E2E04 two authenticated accounts race for one slot; foreign cancellation denied', async ({ request }) => {
  const first = await token(request, 'member1@example.test');
  const second = await token(request, 'member2@example.test');
  const status = await (await request.get(`${API}/courts/status/`)).json();
  const data = { court: status.floor_3[0].id, date: status.allowed_dates[2], start_time: '09:00' };
  const responses = await Promise.all([first, second].map((access) => request.post(`${API}/courts/book/`, {
    headers: { Authorization: `Bearer ${access}` }, data,
  })));
  expect(responses.map((response) => response.status()).filter((code) => code === 201)).toHaveLength(1);
  const loserIndex = responses.findIndex((response) => response.status() !== 201);
  expect([400, 409]).toContain(responses[loserIndex].status());
  const booking = (await responses[1 - loserIndex].json()).appointment;
  const forbidden = await request.post(`${API}/courts/cancel/${booking.id}/`, {
    headers: { Authorization: `Bearer ${[first, second][loserIndex]}` },
  });
  expect(forbidden.status()).toBe(404);
  const hidden = await request.get(`${API}/courts/my-bookings/`, {
    headers: { Authorization: `Bearer ${[first, second][loserIndex]}` },
  });
  expect((await hidden.json()).some((row) => row.id === booking.id)).toBe(false);
});

test('E2E05 mobile booking and centered cancellation popup scrolls internally', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await login(page, 'member2@example.test');
  await selectFutureSlot(page, 3);
  await confirmBooking(page);
  await page.getByRole('button', { name: /^ยกเลิกการจอง สนามฟุตซอล/ }).filter({ hasText: 'ยกเลิกการจอง' }).last().click();
  const dialog = page.getByRole('dialog', { name: 'ยืนยันการยกเลิกการจอง' });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(481);
  const scroll = await dialog.evaluate((element) => {
    const overflow = element.scrollHeight > element.clientHeight;
    element.scrollTop = element.scrollHeight;
    return { overflow, scrolled: element.scrollTop > 0 };
  });
  expect(scroll).toEqual({ overflow: true, scrolled: true });
  await expect(dialog.getByRole('button', { name: 'ยืนยัน', exact: true })).toBeInViewport();
  await dialog.getByRole('button', { name: 'ย้อนกลับ' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
