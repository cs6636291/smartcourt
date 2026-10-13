import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import client from '../api/client';
import CurrentBookings from './CurrentBookings';

vi.mock('../api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const booking = {
  id: 91,
  date: '2026-10-13',
  start_time: '08:00:00',
  end_time: '09:00:00',
  status: 'confirmed',
  court_detail: {
    id: 2,
    name: 'แป้นบาส 1',
    floor: '3',
    sport_type: 'basketball',
  },
};

describe('CurrentBookings cancellation confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.get.mockResolvedValue({ data: [booking] });
    client.post.mockResolvedValue({ data: { message: 'ยกเลิกแล้ว' } });
  });

  it('asks for confirmation before cancelling and returns without cancelling', async () => {
    render(<CurrentBookings refreshKey={0} onChanged={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /ยกเลิกการจอง แป้นบาส/ }));

    expect(screen.getByRole('heading', { name: 'ยืนยันการยกเลิกการจอง' })).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'ยืนยันการยกเลิกการจอง' }))
      .toHaveClass('max-h-[calc(100dvh-2rem)]', 'overflow-y-auto');
    expect(screen.getByTestId('cancel-booking-backdrop'))
      .toHaveClass('items-center', 'justify-center');
    expect(screen.getByRole('dialog', { name: 'ยืนยันการยกเลิกการจอง' }))
      .toHaveClass('max-h-[calc(100dvh-2rem)]', 'overflow-y-auto');
    expect(screen.getByTestId('cancel-booking-backdrop')).toHaveClass('items-center', 'justify-center');
    expect(screen.getByText('แป้นบาส 1')).toBeVisible();
    expect(screen.getByText('08:00 - 09:00')).toBeVisible();
    expect(client.post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'ย้อนกลับ' }));

    expect(screen.queryByRole('heading', { name: 'ยืนยันการยกเลิกการจอง' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ยกเลิกการจอง แป้นบาส/ })).toBeVisible();
    expect(client.post).not.toHaveBeenCalled();
  });

  it('cancels only after the confirmation button is pressed', async () => {
    const onChanged = vi.fn();
    render(<CurrentBookings refreshKey={0} onChanged={onChanged} />);

    fireEvent.click(await screen.findByRole('button', { name: /ยกเลิกการจอง แป้นบาส/ }));
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));

    await waitFor(() => expect(client.post).toHaveBeenCalledWith('/courts/cancel/91/'));
    expect(onChanged).toHaveBeenCalledOnce();
    expect(await screen.findByRole('heading', { name: 'ยกเลิกการจองแล้ว' })).toBeVisible();
  });
});
