import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BookingModal from './BookingModal';
import client from '../api/client';
vi.mock('../api/client', () => ({ default: { post: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

const baseProps = {
  date: '2026-10-13',
  time: '08:00',
  currentUser: null,
  isOpen: true,
  onClose: vi.fn(),
  onOpenLogin: vi.fn(),
  onBookingSuccess: vi.fn(),
};

const renderCourt = (court) => render(<BookingModal {...baseProps} court={court} />);

describe('BookingModal court image', () => {
  it.each([
    ['futsal', 'สนามฟุตซอล ชั้น 3', '/assets/futsal-court.jpg'],
    ['basketball', 'แป้นบาสเกตบอล 2 ชั้น 3', '/assets/basketball-court.jpg'],
    ['volleyball', 'สนามวอลเลย์บอล 1 ชั้น 7', '/assets/volleyball-court.jpg'],
    ['badminton', 'สนามแบดมินตัน 3 ชั้น 7', '/assets/badminton-court-3.jpg'],
  ])('uses the homepage image for %s', (sportType, name, expectedSrc) => {
    renderCourt({ id: 1, name, floor: sportType === 'badminton' || sportType === 'volleyball' ? '7' : '3', sport_type: sportType });

    expect(screen.getByRole('img', { name })).toHaveAttribute('src', expectedSrc);
  });
  it('saves court/date/time, refreshes booking data and closes after success', async () => {
    client.post.mockResolvedValueOnce({ data: {} });
    const close = vi.fn(); const success = vi.fn().mockResolvedValue(undefined);
    const court = { id: 1, name: 'Futsal', sport_type: 'futsal', floor: '3' };
    render(<BookingModal {...baseProps} court={court} currentUser={{ email: 'student@example.com' }} onClose={close} onBookingSuccess={success} />);
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));
    expect(await screen.findByRole('heading', { name: 'การจองสำเร็จ' })).toBeVisible();
    expect(client.post).toHaveBeenCalledWith('/courts/book/', { court: 1, date: baseProps.date, start_time: baseProps.time });
    expect(success).toHaveBeenCalledWith({ court, date: baseProps.date, time: baseProps.time });
    fireEvent.click(screen.getByRole('button', { name: 'กลับสู่หน้าหลัก' }));
    expect(close).toHaveBeenCalledOnce();
  });
  it.each([{ error: 'ช่วงเวลาถูกจองแล้ว' }, { detail: 'สิทธิ์จองหมดแล้ว' }, null])('keeps booking confirmation editable when API fails: %s', async (data) => {
    client.post.mockRejectedValueOnce(data ? { response: { data } } : new Error('offline'));
    const success = vi.fn(); const close = vi.fn();
    render(<BookingModal {...baseProps} court={{ id: 1, name: 'Futsal', sport_type: 'futsal', floor: '3' }} currentUser={{ email: 'student@example.com' }} onBookingSuccess={success} onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(data?.error || data?.detail || 'ไม่สามารถทำการจองได้');
    expect(success).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'ยืนยัน' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'ต้องการแก้ไขข้อมูล' }));
    expect(close).toHaveBeenCalledOnce();
  });
  it('sends guests to login without creating a booking', () => {
    const close = vi.fn(); const login = vi.fn();
    render(<BookingModal {...baseProps} court={{ id: 1, name: 'Futsal', sport_type: 'futsal', floor: '3' }} onClose={close} onOpenLogin={login} />);
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบเพื่อจอง' }));
    expect(close).toHaveBeenCalledOnce(); expect(login).toHaveBeenCalledOnce(); expect(client.post).not.toHaveBeenCalled();
  });
});
