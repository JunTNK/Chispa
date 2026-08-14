import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SummaryScreen } from '../summary-screen';
import { useStore } from '@/lib/store';
import type { Profile, DigitalTwin } from '@/types';

const mockProfile: Profile = {
  user_id: '', name: 'Test', goal: 'energia', level: 'medio',
  equipment: 'ninguno', limitations: [], days_per_week: '2-3',
  neurotype: 'adh-c', preferred_duration: 20,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const mockTwin: DigitalTwin = {
  user_id: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  training_style: 'adaptive', motivation_style: 'data', avoid: [], best_time: '',
  patterns: { completion_rate: 0.6, avg_duration: 20, abandon_rate: 0.1, best_hours: {} },
  ex_progress: {}, motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
};

function makeResult(overrides = {}) {
  return {
    minutes: 18,
    rate: 0.85,
    doneEx: 4,
    totalEx: 5,
    exs: [],
    adapted: false,
    ...overrides,
  };
}

/** Botón RPE "Justo" — desambigua del MicroFeedback (desc 'Al punto perfecto'). */
function rpeJustoButton(): HTMLElement | undefined {
  return screen
    .getAllByRole('button', { name: /justo/i })
    .find((b) => b.textContent?.includes('Al punto') && !b.textContent?.includes('perfecto'));
}

function renderWithPlan(result: any) {
  useStore.setState({
    profile: mockProfile,
    twin: mockTwin,
    plan: {
      action: 'train' as const,
      intensity: 'standard' as const,
      duration: 20,
      reasons: ['Test'],
      confidence: 78,
      consistency: {
        user_id: '', period_start: '', period_end: '',
        consistency_pct: 60, sessions_done: 8, sessions_target: 13,
      },
      date: new Date().toISOString().slice(0, 10),
      done: false,
      result,
    },
    view: 'summary',
  });
  return render(<SummaryScreen />);
}

describe('SummaryScreen', () => {
  it('returns null when no result in plan', () => {
    useStore.setState({
      profile: mockProfile,
      twin: mockTwin,
      plan: {
        action: 'train', intensity: 'standard', duration: 20,
        reasons: ['Test'], confidence: 78,
        consistency: { user_id: '', period_start: '', period_end: '', consistency_pct: 60, sessions_done: 8, sessions_target: 13 },
        date: new Date().toISOString().slice(0, 10), done: false,
        result: undefined,
      },
    });
    const { container } = render(<SummaryScreen />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "¡Hecho!" title for high completion rate (>= 0.8)', () => {
    renderWithPlan(makeResult({ rate: 0.9 }));
    expect(screen.getByText(/hecho/i)).toBeInTheDocument();
    expect(screen.getByText('Sesión completa. El motor ya está aprendiendo de ti.')).toBeInTheDocument();
  });

  it('shows "Buen movimiento" for medium completion rate (0.4-0.79)', () => {
    renderWithPlan(makeResult({ rate: 0.6 }));
    expect(screen.getByText(/buen movimiento/i)).toBeInTheDocument();
  });

  it('shows "Guardamos lo de hoy" for low completion rate (< 0.4)', () => {
    renderWithPlan(makeResult({ rate: 0.3 }));
    expect(screen.getByText(/guardamos lo de hoy/i)).toBeInTheDocument();
  });

  it('displays workout metrics', () => {
    renderWithPlan(makeResult({ minutes: 18, doneEx: 4, totalEx: 5, rate: 0.85 }));
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('minutos')).toBeInTheDocument();
    expect(screen.getByText('4/5')).toBeInTheDocument();
    expect(screen.getByText('ejercicios')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('completado')).toBeInTheDocument();
  });

  it('shows adaptation banner when adapted', () => {
    renderWithPlan(makeResult({ adapted: true }));
    expect(screen.getByText(/motor redujo la intensidad/i)).toBeInTheDocument();
  });

  it('does not show adaptation banner when not adapted', () => {
    renderWithPlan(makeResult({ adapted: false }));
    expect(screen.queryByText(/motor redujo la intensidad/i)).not.toBeInTheDocument();
  });

  it('shows RPE selection buttons', () => {
    renderWithPlan(makeResult());
    expect(screen.getByText(/suave/i)).toBeInTheDocument();
    expect(rpeJustoButton()).toBeTruthy();
    expect(screen.getByText(/duro/i)).toBeInTheDocument();
  });

  it('selects RPE on click', () => {
    renderWithPlan(makeResult());
    fireEvent.click(screen.getByText(/suave/i));
    // After clicking, the suave button should have the "selected" styling.
    // We can verify by finding the button that was clicked and checking it has the selected class
    const suaveBtn = screen.getByText(/suave/i).closest('button');
    expect(suaveBtn?.className).toContain('border-[#ffb454]');
  });

  it('shows motivation message options', () => {
    renderWithPlan(makeResult());
    expect(screen.getByText(/recuperación 78/i)).toBeInTheDocument();
    expect(screen.getByText(/chispa se enciende/i)).toBeInTheDocument();
    expect(screen.getByText(/sin prisa/i)).toBeInTheDocument();
  });

  it('selects motivation style on click', () => {
    renderWithPlan(makeResult());
    fireEvent.click(screen.getByText(/recuperación 78/i));
    const motivBtn = screen.getByText(/recuperación 78/i).closest('button');
    expect(motivBtn?.className).toContain('border-[#ffb454]');
  });

  it('shows "Guardar entrenamiento" button', () => {
    renderWithPlan(makeResult());
    expect(screen.getByRole('button', { name: /guardar entrenamiento/i })).toBeInTheDocument();
  });

  it('saves workout and navigates to home on save', () => {
    renderWithPlan(makeResult({ rate: 0.85, minutes: 18, doneEx: 4, totalEx: 5, exs: [] }));

    // Select RPE and motivation
    fireEvent.click(rpeJustoButton()!);
    fireEvent.click(screen.getByText(/recuperación 78/i));

    // Click save
    fireEvent.click(screen.getByRole('button', { name: /guardar entrenamiento/i }));

    const state = useStore.getState();
    expect(state.view).toBe('home');
    expect(state.plan?.done).toBe(true);
    expect(state.workouts.length).toBeGreaterThanOrEqual(1);
  });

  it('motivación y micro-feedback se aplican juntos sin pisarse', () => {
    renderWithPlan(
      makeResult({
        rate: 0.85,
        exs: [
          { exercise_id: 'squat', name: 'Sentadilla', muscle: 'piernas' as const, sets: 2, reps: 12, rest: 50, completed_sets: 2, completed_reps: [12, 12], status: 'done' as const },
        ],
      })
    );

    // Motivación (energy) + micro-feedback (liked = sí) en la misma sesión
    fireEvent.click(screen.getByText(/chispa se enciende/i));
    fireEvent.click(screen.getByRole('button', { name: /lo repetiría/i }));

    fireEvent.click(screen.getByRole('button', { name: /guardar entrenamiento/i }));

    const twin = useStore.getState().twin!;
    // Ambos cambios sobreviven: la motivación NO pisa el micro-feedback ni al revés
    expect(twin.motivation_style).toBe('energy');
    expect(twin.ex_progress['squat']?.easy).toBe(1);
    expect(twin.ex_progress['squat']?.last_date).toBe(new Date().toISOString().slice(0, 10));
  });
});
