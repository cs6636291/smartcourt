import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegistrationDetails from './RegistrationDetails';
import client from '../api/client';
vi.mock('../api/client', () => ({ default: { post: vi.fn() } }));
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); });
function fillProfile() {
  [['ชื่อ', 'First'], ['นามสกุล', 'Last'], ['รหัสนักศึกษา', '1234567890123'], ['รหัสผ่าน', 'Password123']].forEach(([label, value]) => fireEvent.change(screen.getByLabelText(label), { target: { value } }));
}

describe('RegistrationDetails', () => {
  it('keeps the email from the first step visible and locked', () => {
    render(
      <RegistrationDetails
        email="student@example.com"
        onBack={vi.fn()}
        onLogin={vi.fn()}
        onAuthSuccess={vi.fn()}
      />,
    );

    const email = screen.getByLabelText('อีเมล');
    expect(email).toHaveValue('student@example.com');
    expect(email).toHaveAttribute('readonly');
  });
  it('submits bound email and verification proof then saves the login session', async () => {
    const authenticated = vi.fn();
    client.post.mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce({ data: { access: 'access', refresh: 'refresh', user: { first_name: 'First' } } });
    render(<RegistrationDetails email="student@example.com" verificationToken="proof" onAuthSuccess={authenticated} />);
    fillProfile(); fireEvent.click(screen.getByRole('button', { name: 'สมัครสมาชิก' }));
    await waitFor(() => expect(authenticated).toHaveBeenCalledWith({ first_name: 'First' }));
    expect(client.post).toHaveBeenNthCalledWith(1, '/accounts/register/', expect.objectContaining({ email: 'student@example.com', verification_token: 'proof', std_id: '1234567890123' }));
    expect(localStorage.getItem('access_token')).toBe('access');
  });
  it('blocks registration when verification proof is missing', async () => {
    render(<RegistrationDetails email="student@example.com" onAuthSuccess={vi.fn()} />);
    fillProfile(); fireEvent.click(screen.getByRole('button', { name: 'สมัครสมาชิก' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('กรุณายืนยัน OTP');
    expect(client.post).not.toHaveBeenCalled();
  });
  it('retries login without reusing consumed verification proof when login initially fails', async () => {
    const authenticated = vi.fn();
    client.post.mockResolvedValueOnce({ data: {} }).mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({ data: { access: 'access', refresh: 'refresh', user: { first_name: 'First' } } });
    render(<RegistrationDetails email="student@example.com" verificationToken="proof" onAuthSuccess={authenticated} />);
    fillProfile(); fireEvent.click(screen.getByRole('button', { name: 'สมัครสมาชิก' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('สมัครสมาชิกแล้ว');
    fireEvent.click(screen.getByRole('button', { name: 'ลองเข้าสู่ระบบอีกครั้ง' }));
    await waitFor(() => expect(authenticated).toHaveBeenCalled());
    expect(client.post.mock.calls.filter(([url]) => url === '/accounts/register/')).toHaveLength(1);
  });
  it.each([['รหัสนักศึกษา', '123', '13 หลัก'], ['รหัสผ่าน', 'password', 'ตัวอักษรกับตัวเลข']])('validates %s without calling registration', async (label, value, expected) => {
    render(<RegistrationDetails email="student@example.com" verificationToken="proof" onAuthSuccess={vi.fn()} />);
    fillProfile(); fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'สมัครสมาชิก' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(expected);
    expect(client.post).not.toHaveBeenCalled();
  });
  it('displays server rejection and retains profile values for correction', async () => {
    client.post.mockRejectedValueOnce({ response: { data: { std_id: ['รหัสนักศึกษาซ้ำ'] } } });
    render(<RegistrationDetails email="student@example.com" verificationToken="proof" onAuthSuccess={vi.fn()} />);
    fillProfile(); fireEvent.click(screen.getByRole('button', { name: 'สมัครสมาชิก' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('รหัสนักศึกษาซ้ำ');
    expect(screen.getByLabelText('ชื่อ')).toHaveValue('First');
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
