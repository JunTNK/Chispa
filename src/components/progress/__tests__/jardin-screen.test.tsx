import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JardinScreen, computeGardenStats } from '../jardin-screen';
import { useStore } from '@/lib/store';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

function w(date: string, actual_minutes: number, completed_rate = 1) {
  return { date, actual_minutes, completed_rate };
}

describe('computeGardenStats (spec §7: los días vacíos no matan el jardín)', () => {
  it('sin entrenamientos → brasa, sin días contados', () => {
    const s = computeGardenStats([]);
    expect(s.stage).toBe('brasa');
    expect(s.glow).toBe(1);
    expect(s.daysWithMovement30).toBe(0);
  });

  it('los días con movimiento hacen crecer la planta (días únicos)', () => {
    const s = computeGardenStats([
      w(daysAgo(0), 10),
      w(daysAgo(1), 8),
      w(daysAgo(1), 12), // mismo día no suma dos veces
      w(daysAgo(2), 15),
      w(daysAgo(3), 20),
      w(daysAgo(4), 30),
    ]);
    expect(s.daysWithMovement30).toBe(5);
    expect(s.totalMinutes90).toBe(95);
    expect(s.stage).toBe('arbusto'); // 5 días + 95 min → crecimiento sólido
  });

  it('volver tras una pausa de 7+ días cuenta como regreso (una por día)', () => {
    const s = computeGardenStats([
      w(daysAgo(20), 10), // …y un regreso tras 18 días de pausa
      w(daysAgo(2), 10),
      w(daysAgo(1), 10), // sin gap → no cuenta
    ]);
    expect(s.returnsAfterPause).toBe(1);
  });

  it('las pausas largas solo atenúan el brillo, no matan la planta', () => {
    const active = computeGardenStats([w(daysAgo(0), 10)]);
    const paused30 = computeGardenStats([w(daysAgo(31), 10)]);
    const paused10 = computeGardenStats([w(daysAgo(10), 10)]);

    expect(active.glow).toBe(1);
    expect(paused30.glow).toBe(0.35);
    expect(paused10.glow).toBe(0.8);
    // Sigue existiendo el jardín (misma etapa por minutos acumulados)
    expect(paused30.stage).not.toBe('');
  });

  it('cuenta las rutinas de 2 min completadas', () => {
    const s = computeGardenStats([
      w(daysAgo(0), 2, 1),
      w(daysAgo(1), 2, 0.4), // incompleta no cuenta
      w(daysAgo(2), 5, 1),
    ]);
    expect(s.twoMinRoutines).toBe(1);
  });
});

describe('JardinScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ workouts: [], quickLogs: [], view: 'home' });
  });

  it('estado vacío invita a encender la brasa con 2 minutos', () => {
    render(<JardinScreen />);
    expect(screen.getByText('Jardín de chispas')).toBeInTheDocument();
    expect(screen.getByText(/2 minutos de movimiento bastan/i)).toBeInTheDocument();
    expect(screen.getByText('Tu brasa está lista')).toBeInTheDocument();
  });

  it('muestra métricas reales con historial', () => {
    useStore.setState({
      workouts: [
        {
          id: 'a', user_id: '', date: daysAgo(0), duration: 2, focus: 'full',
          intensity: 'minimal', score: 80, completed_rate: 1, exercises: [],
          actual_minutes: 2, created_at: '',
        },
        {
          id: 'b', user_id: '', date: daysAgo(1), duration: 5, focus: 'full',
          intensity: 'light', score: 90, completed_rate: 1, exercises: [],
          actual_minutes: 5, created_at: '',
        },
      ],
    });
    render(<JardinScreen />);

    expect(screen.getByText('2')).toBeInTheDocument(); // días con movimiento
    expect(screen.getByText('7')).toBeInTheDocument(); // minutos reales
    expect(screen.getByText('0')).toBeInTheDocument(); // regresos tras pausa
    expect(screen.getByText('1')).toBeInTheDocument(); // rutina de 2 min
  });
});
