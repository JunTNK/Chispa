/**
 * Unit tests for the loading.tsx screen (App Router streaming fallback).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import Loading from '@/app/loading';

describe('Loading', () => {
  it('renders the loading text', () => {
    render(<Loading />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.getByText('Un momento...')).toBeInTheDocument();
  });

  it('announces its state to assistive tech (role=status, aria-live)', () => {
    render(<Loading />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-label', 'Cargando...');
  });

  it('renders a visual spinner', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('matches the error-pages container style (centered, dark bg)', () => {
    const { container } = render(<Loading />);
    const main = container.querySelector('main');
    expect(main).toHaveClass('min-h-dvh');
    expect(main).toHaveClass('bg-[#0a0d14]');
  });
});
