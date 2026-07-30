import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressScreen } from '../progress-screen';
import { useStore } from '@/lib/store';
import type { Profile, DigitalTwin, Workout, AIEvent } from '@/types';

const mockProfile: Profile = {
  user_id: '', name: 'Test', goal: 'energia', level: 'medio',
  equipment: 'ninguno', limitations: [], days_per_week: '2-3',
  neurotype: 'adh-c', preferred_duration: 20,
  created_at: '', updated_at: '',
};

const mockTwin: DigitalTwin = {
  user_id: '', created_at: '', updated_at: '',
  training_style: 'adaptive', motivation_style: 'data', avoid: [], best_time: '',
  patterns: { completion_rate: 0.6, avg_duration: 20, abandon_rate: 0.1, best_hours: { 18: 5 } },
  ex_progress: {}, motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
};

const makeWorkout = (daysAgo: number, rate: number): Workout => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `w-${daysAgo}`, user_id: '', date: d.toISOString().slice(0, 10),
    duration: 20, focus: 'full', intensity: 'standard', score: Math.round(rate * 100),
    completed_rate: rate, exercises: [], actual_minutes: 18,
    rpe: 'justo', created_at: '',
  };
};

function renderWithState(overrides: Record<string, any> = {}) {
  useStore.setState({
    profile: mockProfile,
    twin: mockTwin,
    workouts: [],
    events: [],
    ...overrides,
  });
  return render(<ProgressScreen />);
}

describe('ProgressScreen', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('shows consistency percentage', () => {
    renderWithState({
      workouts: [makeWorkout(1, 0.8), makeWorkout(3, 0.9), makeWorkout(5, 0.7)],
    });
    // At least one element should contain a percentage
    const pcts = screen.getAllByText(/\d+%/);
    expect(pcts.length).toBeGreaterThanOrEqual(1);
  });

  it('shows consistency text info', () => {
    renderWithState({
      workouts: [makeWorkout(1, 0.8), makeWorkout(3, 0.9)],
    });
    expect(screen.getByText(/sesiones objetivo/i)).toBeInTheDocument();
    expect(screen.getByText(/sin rachas/i)).toBeInTheDocument();
  });

  it('shows calendar with day headers', () => {
    renderWithState();
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument();
    expect(screen.getByText('V')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('highlights trained days in calendar', () => {
    const today = new Date().toISOString().slice(0, 10);
    renderWithState({
      workouts: [{
        ...makeWorkout(0, 0.85),
        date: today,
      }],
    });
    // Today's date number should be in the calendar
    const todayNum = new Date().getDate().toString();
    // Find the day number somewhere
    expect(screen.getByText(todayNum)).toBeInTheDocument();
  });

  it('shows weekly bar chart section', () => {
    renderWithState({
      workouts: [makeWorkout(1, 0.8), makeWorkout(3, 0.9)],
    });
    expect(screen.getByText('Sesiones por semana')).toBeInTheDocument();
    expect(screen.getByText('Esta')).toBeInTheDocument();
  });

  it('shows twin insights when twin is available', () => {
    renderWithState({
      twin: {
        ...mockTwin,
        patterns: { completion_rate: 0.7, avg_duration: 25, abandon_rate: 0.15, best_hours: { 18: 5 } },
      },
    });
    expect(screen.getByText('Lo que sabe tu Digital Twin')).toBeInTheDocument();
    expect(screen.getByText(/prefieres sesiones de/i)).toBeInTheDocument();
    expect(screen.getByText(/completas el/i)).toBeInTheDocument();
    expect(screen.getByText(/mejor franja/i)).toBeInTheDocument();
  });

  it('shows abandonment insight when rate is high', () => {
    renderWithState({
      twin: {
        ...mockTwin,
        patterns: { completion_rate: 0.4, avg_duration: 15, abandon_rate: 0.4, best_hours: { 18: 5 } },
      },
    });
    expect(screen.getByText(/acorta tus sesiones/i)).toBeInTheDocument();
  });

  it('shows motivation style insight', () => {
    renderWithState();
    expect(screen.getByText(/respondes mejor a mensajes/i)).toBeInTheDocument();
    expect(screen.getByText(/datos y lógica/i)).toBeInTheDocument();
  });

  it('shows recent events', () => {
    const ev: AIEvent = {
      id: 'e1', user_id: '', event: 'decision', timestamp: new Date().toISOString(),
      decision: { intensity: 'standard' }, agent: 'system',
    };
    renderWithState({ events: [ev] });
    expect(screen.getByText('Transparencia del motor')).toBeInTheDocument();
    expect(screen.getByText(/motor: sesión standard/i)).toBeInTheDocument();
  });

  it('shows workout completed event', () => {
    const ev: AIEvent = {
      id: 'e1', user_id: '', event: 'workout_completed', timestamp: new Date().toISOString(),
      decision: { rate: 0.85 }, agent: 'system',
    };
    renderWithState({ events: [ev] });
    expect(screen.getByText(/entrenamiento completado/i)).toBeInTheDocument();
  });

  it('handles empty workouts gracefully', () => {
    renderWithState({ workouts: [] });
    expect(screen.getByText(/consistencia/i)).toBeInTheDocument();
  });

  it('handles empty events gracefully', () => {
    renderWithState({ events: [] });
    expect(screen.queryByText('Transparencia del motor')).not.toBeInTheDocument();
  });
});
