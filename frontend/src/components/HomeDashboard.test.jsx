import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import HomeDashboard from './HomeDashboard';
const court = { id: 1, floor: '3', name: 'Futsal', sport_type: 'futsal', is_available: true, status_text: 'ว่าง' };
const data = { user_has_booking: false, floor_3: [court, { ...court, id: 2, name: 'Full', is_available: false, status_text: 'เต็ม' }], floor_7: [], time_slots: ['08:00','09:00'], allowed_dates: [] };
const props = { data, loading: false, currentUser: null, selectedDate: '', selectedTime: '08:00', onDateChange: vi.fn(), onTimeChange: vi.fn(), onRefresh: vi.fn(), onCourtClick: vi.fn() };
it.each([null, { email: 'student@example.com' }])('allows a guest or eligible member to start booking an available court: %s', (currentUser) => {
  const click = vi.fn(); render(<HomeDashboard {...props} currentUser={currentUser} onCourtClick={click} />);
  fireEvent.click(screen.getByRole('button', { name: 'จองสนาม' }));
  expect(click).toHaveBeenCalledWith(court);
  expect(within(screen.getByTestId('court-card-2')).queryByRole('button')).not.toBeInTheDocument();
});
it.each([[true, false, 'วันนี้สิทธิ์การจองของคุณหมดแล้ว'], [null, true, 'กำลังตรวจสอบสิทธิ์'], [null, false, 'ตรวจสอบสถานะไม่สำเร็จ']])('blocks booking if eligibility is %s loading %s', (eligibility, loading, message) => {
  render(<HomeDashboard {...props} data={{ ...data, user_has_booking: eligibility }} currentUser={{ email: 'member@example.com' }} loading={loading} />);
  expect(screen.getByRole('button', { name: message })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'จองสนาม' })).not.toBeInTheDocument();
});
it('forwards refresh and time-selection actions', () => {
  const refresh = vi.fn(); const time = vi.fn(); render(<HomeDashboard {...props} onRefresh={refresh} onTimeChange={time} />);
  fireEvent.click(screen.getByRole('button', { name: 'รีเฟรชข้อมูล' }));
  fireEvent.change(screen.getByLabelText('เลือกเวลา'), { target: { value: '09:00' } });
  expect(refresh).toHaveBeenCalledOnce(); expect(time).toHaveBeenCalledOnce();
});
