import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WelcomeScreen } from '@/components/onboarding/welcome-screen';

// jsdom no implementa matchMedia; SparksBg lo usa → mockeamos reduce-motion: false
beforeAll(() => {
  window.matchMedia = window.matchMedia || ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  })) as any;
});

// ─────────────────────────────────────────────────────────────────────────────
// ND "5-second test" automatizado: el usuario debe ver la acción principal y
// las FAQs de confianza sin hacer scroll ni interactuar. Garantiza que la
// landing no vuelva a esconder el CTA bajo 5 pantallas de texto.
// ─────────────────────────────────────────────────────────────────────────────
describe('WelcomeScreen · 5-second test (acción visible sin scroll)', () => {
  it('renderiza el CTA hero, el footbar thumb-reachable y las FAQs de confianza abiertas', () => {
    const { container } = render(<WelcomeScreen />);

    // Hero CTA (above the fold) + footbar fijo (misma acción, siempre visible)
    expect(screen.getAllByRole('button', { name: /ver mi rutina de hoy sin registro/i })).toHaveLength(2);
    expect(container.querySelector('#cta-btn')).not.toBeNull();
    expect(container.querySelector('#cta-btn-foot')).not.toBeNull();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();

    // Preview del producto (reduce ansiedad del "¿y cómo será?")
    expect(screen.getByText('Qué verás al entrar')).toBeInTheDocument();
    expect(container.querySelector('svg[viewBox="0 0 252 504"]')).not.toBeNull();

    // FAQs de confianza (datos + IA real) abiertas por defecto
    const dataQ = screen.getByText('¿Salen mis datos del dispositivo?').closest('details');
    const aiQ = screen.getByText('¿Es IA real o marketing?').closest('details');
    expect(dataQ).toHaveAttribute('open');
    expect(aiQ).toHaveAttribute('open');

    // Las demás FAQs quedan colapsadas (menos ruido, ND)
    const priceQ = screen.getByText('¿Cuánta cuesta?').closest('details');
    expect(priceQ).not.toHaveAttribute('open');
  });
});
