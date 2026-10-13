import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import client from '../api/client';
import Login from './Login';

vi.mock('../api/client', () => ({ default: { post: vi.fn() } }));

const renderLogin = () => render(
  <Login onBack={vi.fn()} onRegister={vi.fn()} onAuthSuccess={vi.fn()} />,
);

describe('Login page', () => {
  it('matches the compact Figma login layout and uses the local logo', () => {
    renderLogin();

    expect(screen.getByRole('img', { name: /ตราสัญลักษณ์/ }))
      .toHaveAttribute('src', '/assets/kmutnb-logo.png');
    expect(screen.getByTestId('login-card')).toHaveClass('max-w-md', 'mt-5', 'px-5', 'py-5', 'border');
    expect(screen.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeVisible();
  });

  it('shows the failed-login message inside the form card', async () => {
    client.post.mockRejectedValueOnce({ response: { data: { detail: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' } } });
    renderLogin();

    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('อีเมลหรือรหัสผ่านไม่ถูกต้อง'));
    expect(screen.getByTestId('login-card')).toContainElement(screen.getByRole('alert'));
  });
});
