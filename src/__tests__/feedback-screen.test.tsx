import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedbackScreen } from '@/components/feedback/feedback-screen';

describe('FeedbackScreen · mailto channel (Fase 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      value: { assign: vi.fn(), href: '' },
      writable: true,
      configurable: true,
    });
  });

  it('envía al mailto con el texto escrito por el usuario', () => {
    render(<FeedbackScreen />);

    fireEvent.change(screen.getByPlaceholderText('¿Qué deberíamos mejorar?'), {
      target: { value: 'Me encanta la landing' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar por email/i }));

    const href = window.location.href as string;
    expect(href).toContain('mailto:feedback@chispa.app');
    expect(decodeURIComponent(href)).toContain('Me encanta la landing');
  });
});
