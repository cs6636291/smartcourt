import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BookingModal from './BookingModal';

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
});
