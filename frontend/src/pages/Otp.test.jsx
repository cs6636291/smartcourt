import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import Otp from './Otp';
import client from '../api/client';
vi.mock('../api/client', () => ({ default: { post: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
function enterCode() { [1,2,3,4,5,6].forEach((n) => fireEvent.change(screen.getByLabelText(`OTP หลักที่ ${n}`), { target: { value: String(n) } })); }
it('passes the verified email and opaque proof to registration', async () => {
  client.post.mockResolvedValue({ data: { verification_token: 'opaque-proof' } });
  const verified = vi.fn();
  render(<Otp registration={{ email: 'student@example.com' }} onBack={vi.fn()} onLogin={vi.fn()} onVerified={verified} />);
  enterCode(); fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));
  await screen.findByRole('button', { name: 'ยืนยัน' });
  expect(verified).toHaveBeenCalledWith({ email: 'student@example.com', verification_token: 'opaque-proof' });
});
it.each(['OTP หมดอายุ', 'OTP นี้ถูกใช้แล้ว'])('keeps the OTP step on API failure: %s', async (detail) => {
  client.post.mockRejectedValue({ response: { data: { detail } } });
  const verified = vi.fn();
  render(<Otp registration={{ email: 'student@example.com' }} onBack={vi.fn()} onLogin={vi.fn()} onVerified={verified} />);
  enterCode(); fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(detail);
  expect(verified).not.toHaveBeenCalled();
});
it('resends an OTP and clears the previously entered digits', async () => {
  client.post.mockResolvedValue({ data: { message: 'ส่งรหัสใหม่แล้ว' } });
  render(<Otp registration={{ email: 'student@example.com' }} onVerified={vi.fn()} />);
  enterCode(); fireEvent.click(screen.getByRole('button', { name: 'ส่ง OTP อีกครั้ง' }));
  expect(await screen.findByRole('status')).toHaveTextContent('ส่งรหัสใหม่แล้ว');
  expect(client.post).toHaveBeenCalledWith('/accounts/send-otp/', { email: 'student@example.com' });
  expect(screen.getByLabelText('OTP หลักที่ 1')).toHaveValue('');
});
it('shows resend network errors and does not advance', async () => {
  client.post.mockRejectedValue(new Error('offline'));
  const verified = vi.fn(); render(<Otp registration={{ email: 'student@example.com' }} onVerified={verified} />);
  fireEvent.click(screen.getByRole('button', { name: 'ส่ง OTP อีกครั้ง' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('ส่งรหัส OTP ไม่สำเร็จ');
  expect(verified).not.toHaveBeenCalled();
});
it('rejects incomplete codes and missing registration before making API requests', async () => {
  const { rerender } = render(<Otp registration={null} onVerified={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));
  expect(screen.getByRole('alert')).toHaveTextContent('ครบ 6 หลัก');
  fireEvent.click(screen.getByRole('button', { name: 'ส่ง OTP อีกครั้ง' }));
  expect(screen.getByRole('alert')).toHaveTextContent('ไม่พบอีเมล');
  enterCode(); fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));
  expect(screen.getByRole('alert')).toHaveTextContent('ไม่พบข้อมูลสมัครสมาชิก');
  expect(client.post).not.toHaveBeenCalled();
});
it('accepts a pasted code, supports keyboard navigation and refuses missing server proof', async () => {
  client.post.mockResolvedValue({ data: {} });
  const verified = vi.fn(); render(<Otp registration={{ email: 'student@example.com' }} onVerified={verified} />);
  fireEvent.paste(screen.getByLabelText('OTP หลักที่ 1'), { clipboardData: { getData: () => '12 34 56' } });
  expect(screen.getByLabelText('OTP หลักที่ 6')).toHaveValue('6');
  fireEvent.keyDown(screen.getByLabelText('OTP หลักที่ 6'), { key: 'ArrowLeft' });
  expect(screen.getByLabelText('OTP หลักที่ 5')).toHaveFocus();
  fireEvent.keyDown(screen.getByLabelText('OTP หลักที่ 5'), { key: 'ArrowRight' });
  expect(screen.getByLabelText('OTP หลักที่ 6')).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('ยืนยัน OTP');
  expect(verified).not.toHaveBeenCalled();
});
