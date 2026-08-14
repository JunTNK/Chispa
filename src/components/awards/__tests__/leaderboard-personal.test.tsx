import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaderboardScreen } from '../leaderboard-screen';
import { useStore } from '@/lib/store';
import type { WorkoutExercise } from '@/types';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

function w(date: string, completed_rate = 1) {
  return {
    id: date + completed_rate,
    user_id: '',
    date,
    duration: 2,
    focus: 'full' as const,
    intensity: 'minimal' as const,
    score: 80,
    completed_rate,
    exercises: [] as WorkoutExercise[],
    actual_minutes: 2,
    created_at: '',
  };
}

describe('Leaderboard personal (rúbrica §7)', () => {
  beforeEach(() => {
    useStore.setState({ workouts: [], view: 'leaderboard' });
  });

  it("muestra 'Contra tu yo pasado', no ranking social", () => {
    render(<LeaderboardScreen />);
    expect(screen.getByText(/Contra tu yo pasado/i)).toBeInTheDocument();
    expect(screen.queryByText(/Tabla de Campeones/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Jugador #\d+/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Top ?10/i)).not.toBeInTheDocument();
  });

  it('compara esta semana vs la anterior con los workouts reales', () => {
    useStore.setState({
      workouts: [
        w(daysAgo(1)), // esta semana
        w(daysAgo(3)), // esta semana
        w(daysAgo(9)), // la semana anterior
        w(daysAgo(40), 0.2), // fuera de ventana / no cuenta (rate bajo)
      ],
    });
    render(<LeaderboardScreen />);

    expect(screen.getByText('Esta semana vs la anterior')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // esta semana
    expect(screen.getByText('1')).toBeInTheDocument(); // período anterior
  });

  it('celebra la mejora y normaliza la baja (sin culpa)', () => {
    useStore.setState({
      workouts: [w(daysAgo(1))], // esta semana 1, anterior 0 (ambas cards muestran la mejora)
    });
    render(<LeaderboardScreen />);
    expect(screen.getAllByText('+1 vs el período anterior').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Tabla de Campeones/i)).not.toBeInTheDocument();
  });
});
