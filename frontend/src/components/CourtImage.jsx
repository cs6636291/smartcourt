import React from 'react';

export function getCourtImagePath(court) {
  if (court.sport_type === 'basketball') {
    const courtNumber = court.name.match(/บาส(?:เกตบอล)?\s*([1-5])(?=\D|$)/)?.[1];
    return courtNumber ? `/assets/basketball-court-${courtNumber}.jpg` : '/assets/basketball-court.jpg';
  }
  if (court.sport_type === 'volleyball') return '/assets/volleyball-court.jpg';
  if (court.sport_type === 'badminton') {
    const courtNumber = court.name.match(/\d+/)?.[0] || '1';
    return `/assets/badminton-court-${courtNumber}.jpg`;
  }
  return '/assets/futsal-court.jpg';
}

export default function CourtImage({ court, className = '' }) {
  return (
    <img
      src={getCourtImagePath(court)}
      alt={court.name}
      className={`h-full w-full object-cover ${className}`.trim()}
    />
  );
}
