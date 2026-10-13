import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RegistrationDetails from './RegistrationDetails';

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
});
