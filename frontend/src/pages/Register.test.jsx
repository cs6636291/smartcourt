import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import client from '../api/client';
import Register from './Register';

vi.mock('../api/client', () => ({ default: { post: vi.fn() } }));

describe('Register email step', () => {
  it('asks for email only and sends OTP before continuing', async () => {
    const onContinue = vi.fn();
    client.post.mockResolvedValueOnce({ data: { message: 'ส่ง OTP แล้ว' } });
    render(<Register initialData={null} onBack={vi.fn()} onContinue={onContinue} onLogin={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'สมัครสมาชิก' })).toBeVisible();
    expect(screen.getByTestId('register-card')).toHaveClass('max-w-md', 'mt-5', 'px-5', 'py-5', 'border');
    expect(screen.getByLabelText('กรอกอีเมล')).toBeVisible();
    expect(screen.queryByLabelText('รหัสนักศึกษา')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('กรอกอีเมล'), { target: { value: 'student@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));

    await waitFor(() => expect(client.post).toHaveBeenCalledWith('/accounts/send-otp/', { email: 'student@example.com' }));
    expect(onContinue).toHaveBeenCalledWith({ email: 'student@example.com' });
  });
});
