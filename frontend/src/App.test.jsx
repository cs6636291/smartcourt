import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import client from './api/client';

vi.mock('./api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const court = (id, name, floor, sportType, isAvailable) => ({
  id, name, floor, sport_type: sportType, is_available: isAvailable,
  status_text: isAvailable ? 'ว่าง' : 'จองแล้ว',
});

const statusResponse = {
  selected_date: '2026-10-13', selected_time: '08:00', user_has_booking: false,
  allowed_dates: ['2026-10-13'], time_slots: ['08:00'],
  floor_3: [
    court(1, 'สนามฟุตซอล ชั้น 3', '3', 'futsal', true),
    court(2, 'แป้นบาสเกตบอล 1 ชั้น 3', '3', 'basketball', false),
  ],
  floor_7: [
    court(3, 'สนามวอลเลย์บอล 1 ชั้น 7', '7', 'volleyball', true),
    ...[1, 2, 3, 4].map((number) => court(3 + number, `สนามแบดมินตัน ${number} ชั้น 7`, '7', 'badminton', true)),
  ],
};

const scheduleResponse = {
  time_slots: ['08:00', '09:00'],
  dates: [
    {
      date: '2026-10-13', user_has_booking: true,
      courts: [
        { ...court(1, 'สนามฟุตซอล ชั้น 3', '3', 'futsal', true), available_slots: [] },
        { ...court(2, 'แป้นบาสเกตบอล 1 ชั้น 3', '3', 'basketball', true), available_slots: ['08:00', '09:00'] },
        { ...court(3, 'สนามวอลเลย์บอล 1 ชั้น 7', '7', 'volleyball', true), available_slots: ['08:00'] },
      ],
    },
  ],
};

const myBookingsResponse = [{
  id: 91,
  date: '2026-10-13',
  start_time: '08:00:00',
  end_time: '09:00:00',
  status: 'confirmed',
  court_detail: court(2, 'แป้นบาสเกตบอล 1 ชั้น 3', '3', 'basketball', false),
}];

const mockGet = (url) => Promise.resolve({
  data: url === '/courts/schedule/'
    ? scheduleResponse
    : url === '/courts/my-bookings/' ? myBookingsResponse : statusResponse,
});

describe('unauthenticated home page', () => {
  beforeEach(() => {
    localStorage.clear();
    client.get.mockImplementation(mockGet);
  });

  it('shows the guest header and status overview from the reference design', async () => {
    render(<App />);
    expect(screen.getByRole('img', { name: 'KMUTNB Logo' }))
      .toHaveAttribute('src', '/assets/kmutnb-logo.png');
    expect(screen.getByRole('button', { name: 'เข้าสู่ระบบ / สมัครสมาชิก' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'สถานะสนามกีฬา' })).toBeVisible();
    expect(screen.getByText('เลือกวันและเวลาเพื่อดูสถานะ แล้วกดจองสนามที่ว่าง')).toBeVisible();
    await waitFor(() => expect(screen.getByText('1 สนามว่าง • 1 สนามไม่ว่าง')).toBeVisible());
  });

  it('renders every court as an independent card and uses the supplied basketball photo', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('court-card-2')).toBeVisible());
    expect(screen.getAllByTestId(/court-card-/)).toHaveLength(7);
    expect(screen.getByRole('img', { name: 'สนามฟุตซอล ชั้น 3' }))
      .toHaveAttribute('src', '/assets/futsal-court.jpg');
    expect(screen.getAllByRole('button', { name: 'จองสนาม' }).length).toBeGreaterThan(0);
    screen.getAllByRole('img', { name: 'แป้นบาสเกตบอล 1 ชั้น 3' })
      .forEach((image) => expect(image).toHaveAttribute('src', '/assets/basketball-court.jpg'));
    expect(screen.getByRole('img', { name: 'สนามวอลเลย์บอล 1 ชั้น 7' }))
      .toHaveAttribute('src', '/assets/volleyball-court.jpg');
    [1, 2, 3, 4].forEach((number) => {
      expect(screen.getByRole('img', { name: `สนามแบดมินตัน ${number} ชั้น 7` }))
        .toHaveAttribute('src', `/assets/badminton-court-${number}.jpg`);
    });
  });

  it('refreshes booking eligibility after login before showing home booking actions', async () => {
    client.get.mockImplementation((url) => Promise.resolve({
      data: url === '/courts/my-bookings/'
        ? myBookingsResponse
        : { ...statusResponse, user_has_booking: Boolean(localStorage.getItem('access_token')) },
    }));
    client.post.mockResolvedValueOnce({
      data: {
        access: 'access-token',
        refresh: 'refresh-token',
        user: { email: 'student@example.com', first_name: 'นักศึกษา' },
      },
    });
    render(<App />);

    await waitFor(() => expect(screen.getByTestId('court-card-1')).toBeVisible());
    expect(within(screen.getByTestId('court-card-1')).getByRole('button', { name: 'จองสนาม' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ / สมัครสมาชิก' }));
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'student@example.com' } });
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'โปรไฟล์' })).toBeVisible();
      expect(within(screen.getByTestId('court-card-1')).queryByRole('button', { name: 'จองสนาม' })).not.toBeInTheDocument();
    });
    const dailyLimitButton = within(screen.getByTestId('court-card-1')).getByRole('button', { name: 'วันนี้สิทธิ์การจองของคุณหมดแล้ว' });
    expect(dailyLimitButton).toBeDisabled();
  });
});

describe('authenticated home page', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('user_info', JSON.stringify({
      email: 'student@example.com',
      first_name: 'นักศึกษา',
    }));
    client.get.mockImplementation(mockGet);
  });

  it('keeps the real court photos after login', async () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'หน้าหลัก' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'จองสนาม' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'โปรไฟล์' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'ออกจากระบบ' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'ประวัติการจอง' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'หน้าหลัก' })).toHaveClass('bg-[#ff8733]');
    await waitFor(() => expect(screen.getByTestId('court-card-1')).toBeVisible());
    expect(screen.getByRole('img', { name: 'สนามฟุตซอล ชั้น 3' }))
      .toHaveAttribute('src', '/assets/futsal-court.jpg');
    screen.getAllByRole('img', { name: 'แป้นบาสเกตบอล 1 ชั้น 3' })
      .forEach((image) => expect(image).toHaveAttribute('src', '/assets/basketball-court.jpg'));
    expect(screen.getByRole('img', { name: 'สนามวอลเลย์บอล 1 ชั้น 7' }))
      .toHaveAttribute('src', '/assets/volleyball-court.jpg');
    expect(screen.getByRole('img', { name: 'สนามแบดมินตัน 4 ชั้น 7' }))
      .toHaveAttribute('src', '/assets/badminton-court-4.jpg');
    expect(await screen.findByRole('heading', { name: 'คุณจองแล้ว' })).toBeVisible();
    expect(within(screen.getByTestId('current-bookings')).getByText(/แป้นบาสเกตบอล 1 ชั้น 3/)).toBeVisible();
    expect(screen.getByRole('button', { name: /ยกเลิกการจอง แป้นบาส/ })).toBeVisible();
  });

  it('opens the booking schedule and highlights its navigation button', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'จองสนาม' }));

    expect(screen.getByRole('button', { name: 'จองสนาม' })).toHaveClass('bg-[#ff8733]');
    expect(await screen.findByRole('heading', { name: 'จองสนามกีฬา ชั้น 3' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'ชั้น 3' })).toHaveAttribute('aria-selected', 'true');
    screen.getAllByRole('img', { name: 'แป้นบาสเกตบอล 1 ชั้น 3' })
      .forEach((image) => expect(image).toHaveAttribute('src', '/assets/basketball-court.jpg'));
    const dailyLimitButtons = screen.getAllByRole('button', { name: 'วันนี้สิทธิ์การจองของคุณหมดแล้ว' });
    expect(dailyLimitButtons.length).toBeGreaterThan(0);
    dailyLimitButtons.forEach((button) => expect(button).toBeDisabled());
    expect(screen.queryByRole('button', { name: /จอง แป้นบาสเกตบอล 1 ชั้น 3 .+ 08:00 - 09:00/ })).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'คุณจองแล้ว' })).toBeVisible();
  });
});
