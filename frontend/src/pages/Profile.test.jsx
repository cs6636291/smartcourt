import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import Profile from './Profile';
import client from '../api/client';
vi.mock('../api/client', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
const profile = { first_name: 'First', last_name: 'Last', nickname: 'Nick', email: 'student@example.com', std_id: '1234567890123' };
beforeEach(() => { vi.clearAllMocks(); client.get.mockResolvedValue({ data: profile }); });
it('locks verified email and saves editable fields using the server response', async () => {
  const update = vi.fn();
  client.patch.mockResolvedValue({ data: { ...profile, first_name: 'Updated' } });
  render(<Profile user={profile} onBack={vi.fn()} onProfileUpdate={update} />);
  expect(await screen.findByLabelText('อีเมล')).toHaveAttribute('readonly');
  fireEvent.change(screen.getByLabelText('ชื่อ'), { target: { value: 'Updated' } });
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));
  expect(await screen.findByRole('status')).toHaveTextContent('บันทึกข้อมูลโปรไฟล์แล้ว');
  expect(client.patch).toHaveBeenCalledWith('/accounts/profile/', { first_name: 'Updated', last_name: 'Last', nickname: 'Nick', std_id: '1234567890123' });
  expect(update).toHaveBeenLastCalledWith({ ...profile, first_name: 'Updated' });
});
it('retains edits and displays server validation errors without claiming saved', async () => {
  client.patch.mockRejectedValue({ response: { data: { std_id: ['รหัสนักศึกษาซ้ำ'] } } });
  render(<Profile user={profile} onBack={vi.fn()} onProfileUpdate={vi.fn()} />);
  await screen.findByLabelText('ชื่อ');
  fireEvent.change(screen.getByLabelText('ชื่อ'), { target: { value: 'Draft' } });
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('รหัสนักศึกษาซ้ำ');
  expect(screen.getByLabelText('ชื่อ')).toHaveValue('Draft');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('rejects an invalid student ID before sending a profile update', async () => {
  render(<Profile user={profile} onBack={vi.fn()} onProfileUpdate={vi.fn()} />);
  await screen.findByLabelText('รหัสนักศึกษา');
  fireEvent.change(screen.getByLabelText('รหัสนักศึกษา'), { target: { value: '123' } });
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('13 หลัก'));
  expect(client.patch).not.toHaveBeenCalled();
});
