import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MicroFeedback } from '../micro-feedback';
import type { MicroFeedbackAnswers } from '@/types';

function empty(): MicroFeedbackAnswers {
  return { effort: null, liked: null, tomorrow: null };
}

describe('MicroFeedback (spec §5: 3 preguntas de 1 tap)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('muestra las 3 preguntas y nunca pide texto libre', () => {
    render(<MicroFeedback value={empty()} onChange={vi.fn()} />);

    expect(screen.getByText('¿Fue mucho, justo o poco?')).toBeInTheDocument();
    expect(screen.getByText('¿Te gustó este movimiento?')).toBeInTheDocument();
    expect(screen.getByText('¿Podrías hacerlo mañana?')).toBeInTheDocument();
    // No hay inputs de texto
    expect(document.querySelectorAll('input, textarea').length).toBe(0);
  });

  it('un toque responde una pregunta y alimenta al algoritmo', () => {
    const onChange = vi.fn();
    render(<MicroFeedback value={empty()} onChange={onChange} />);

    // Q1: esfuerzo
    fireEvent.click(screen.getByRole('button', { name: /al punto perfecto/i }));
    expect(onChange).toHaveBeenCalledWith({ effort: 'justo' });

    // Q2: gustó
    fireEvent.click(screen.getByRole('button', { name: /lo repetiría/i }));
    expect(onChange).toHaveBeenCalledWith({ liked: 'si' });

    // Q3: mañana
    fireEvent.click(screen.getByRole('button', { name: /cuenta conmigo/i }));
    expect(onChange).toHaveBeenCalledWith({ tomorrow: 'si' });
  });

  it('marca como seleccionada la respuesta elegida', () => {
    render(
      <MicroFeedback
        value={{ effort: 'mucho', liked: null, tomorrow: null }}
        onChange={vi.fn()}
      />
    );

    const muchoBtn = screen.getByRole('button', { name: /me pedí de más/i });
    expect(muchoBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('todas las preguntas son opcionales (se puede saltar)', () => {
    render(<MicroFeedback value={empty()} onChange={vi.fn()} />);
    // No hay botón obligatorio: no existe ningún requerimiento de completar
    expect(screen.queryByText(/obligatorio/i)).not.toBeInTheDocument();
  });
});
