/**
 * Unit tests for the hardened error pages:
 *   - global-error.tsx (root boundary, crash-proof, no store)
 *   - error.tsx (segment boundary within the layout)
 *   - not-found.tsx (404)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Sentry must never crash the error pages in tests ───
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

import { captureException } from '@sentry/nextjs';
import GlobalError from '@/app/global-error';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';

const mockedCapture = vi.mocked(captureException);

// ─── Helpers ───

function makeError(message = 'boom', digest?: string): Error & { digest?: string } {
  const err = new Error(message) as Error & { digest?: string };
  if (digest) err.digest = digest;
  return err;
}

const originalLocation = window.location;

beforeEach(() => {
  // Stub navigation (jsdom doesn't implement it)
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...originalLocation, assign: vi.fn(), reload: vi.fn(), href: 'http://localhost/' },
  });
  // Stub clipboard
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', { configurable: true, writable: true, value: originalLocation });
});

// ═══════════════════════════════════════════════════════════════
//  GlobalError (global-error.tsx)
// ═══════════════════════════════════════════════════════════════

describe('GlobalError', () => {
  it('renders title, body and action buttons', () => {
    render(<GlobalError error={makeError('x')} reset={vi.fn()} />);
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.getByText(/tu progreso está guardado localmente/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver al inicio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recargar la página' })).toBeInTheDocument();
  });

  it('calls reset() when retry is pressed', () => {
    const reset = vi.fn();
    render(<GlobalError error={makeError('x')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('falls back to a full reload if reset() throws', () => {
    const reset = vi.fn(() => { throw new Error('reset failed'); });
    render(<GlobalError error={makeError('x')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('goes home when "Volver al inicio" is pressed', () => {
    render(<GlobalError error={makeError('x')} reset={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio' }));
    expect(window.location.assign).toHaveBeenCalledWith('/');
  });

  it('shows the digest and copies it to the clipboard', async () => {
    render(<GlobalError error={makeError('x', 'abc123')} reset={vi.fn()} />);
    const copyBtn = screen.getByRole('button', { name: /abc123/ });
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('abc123');
    });
    await waitFor(() => {
      expect(screen.getByText('¡Copiado!')).toBeInTheDocument();
    });
  });

  it('omits the support line when there is no digest', () => {
    render(<GlobalError error={new Error('x')} reset={vi.fn()} />);
    expect(screen.queryByText(/contacta a soporte/)).not.toBeInTheDocument();
  });

  it('captures the error to Sentry when configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');
    render(<GlobalError error={makeError('kaboom', 'd1')} reset={vi.fn()} />);
    await waitFor(() => {
      expect(mockedCapture).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'kaboom' }),
        expect.objectContaining({ tags: expect.objectContaining({ source: 'global-error-boundary', digest: 'd1' }) })
      );
    });
  });

  it('never crashes when localStorage is corrupted (crash-proof i18n)', () => {
    // Corrupt persisted store — detectLang() must fall back gracefully
    window.localStorage.setItem('chispa_store', '{not valid json');
    expect(() =>
      render(<GlobalError error={makeError('x')} reset={vi.fn()} />)
    ).not.toThrow();
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
//  ErrorPage (error.tsx — segment boundary)
// ═══════════════════════════════════════════════════════════════

describe('ErrorPage (error.tsx)', () => {
  it('renders inside the layout with i18n text', () => {
    render(<ErrorPage error={makeError('x')} reset={vi.fn()} />);
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver al inicio' })).toBeInTheDocument();
  });

  it('calls reset() on retry', () => {
    const reset = vi.fn();
    render(<ErrorPage error={makeError('x')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('shows and copies the error code', async () => {
    render(<ErrorPage error={makeError('x', 'seg-42')} reset={vi.fn()} />);
    const copyBtn = screen.getByRole('button', { name: /seg-42/ });
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('seg-42');
    });
  });

  it('captures the error to Sentry when configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');
    render(<ErrorPage error={makeError('boom', 'd2')} reset={vi.fn()} />);
    await waitFor(() => {
      expect(mockedCapture).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'boom' }),
        expect.objectContaining({ tags: expect.objectContaining({ source: 'segment-error-boundary', digest: 'd2' }) })
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════
//  NotFound (not-found.tsx — 404)
// ═══════════════════════════════════════════════════════════════

describe('NotFound', () => {
  it('renders a 404 message', () => {
    render(<NotFound />);
    expect(screen.getByText(/404/)).toBeInTheDocument();
    // The heading is split by the interpolation: "404 — {t(...)}"
    expect(screen.getByText(/Página no encontrada/)).toBeInTheDocument();
  });

  it('navigates home on button press', () => {
    render(<NotFound />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio' }));
    expect(window.location.assign).toHaveBeenCalledWith('/');
  });
});
