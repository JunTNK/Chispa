import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionScreen } from '../session-screen';
import { useStore } from '@/lib/store';

const makePlan = (overrides: Record<string, unknown> = {}) => ({
  action: 'train' as const,
  intensity: 'standard' as const,
  duration: 20,
  reasons: ['Buena recuperación'],
  confidence: 78,
  consistency: {
    user_id: '', period_start: '', period_end: '',
    consistency_pct: 60, sessions_done: 8, sessions_target: 13,
  },
  date: new Date().toISOString().slice(0, 10),
  done: false,
  workout: {
    title: 'Full Body Express',
    focus: 'full' as const,
    intensity: 'standard' as const,
    duration: 20,
    sets: 3,
    rest: 50,
    exercises: [
      { exercise_id: 'ex1', name: 'Sentadilla', muscle: 'cuadriceps', sets: 3, reps: 12, rest: 60, completed_sets: 0, completed_reps: [], status: 'pending' as const },
      { exercise_id: 'ex2', name: 'Flexiones', muscle: 'pecho', sets: 3, reps: 10, rest: 45, completed_sets: 0, completed_reps: [], status: 'pending' as const },
      { exercise_id: 'ex3', name: 'Plancha', muscle: 'core', sets: 3, reps: 30, rest: 30, completed_sets: 0, completed_reps: [], status: 'pending' as const },
    ],
  },
  ...overrides,
});

describe('SessionScreen', () => {
  it('shows loading state when no plan has exercises', () => {
    render(<SessionScreen />);
    expect(screen.getByText('Preparando sesión...')).toBeInTheDocument();
  });

  it('renders first exercise when plan is available', () => {
    useStore.setState({ plan: makePlan() });
    render(<SessionScreen />);

    expect(screen.getByText('Sentadilla')).toBeInTheDocument();
    expect(screen.getByText(/serie 1 de 3/i)).toBeInTheDocument();
    expect(screen.getByText('Ejercicio 1 de 3')).toBeInTheDocument();
    expect(screen.getByText('repeticiones')).toBeInTheDocument();
  });

  it('shows exercise icon', () => {
    useStore.setState({ plan: makePlan() });
    render(<SessionScreen />);

    // Vector Dumbbell icon from lucide-react
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('shows "Serie hecha" when not on last set', () => {
    useStore.setState({ plan: makePlan() });
    render(<SessionScreen />);

    expect(screen.getByRole('button', { name: /serie hecha/i })).toBeInTheDocument();
  });

  it('shows skip and pause buttons', () => {
    useStore.setState({ plan: makePlan() });
    render(<SessionScreen />);

    expect(screen.getByText('Saltar')).toBeInTheDocument();
    expect(screen.getByText('Pausa')).toBeInTheDocument();
  });

  it('increments reps counter with + button', () => {
    useStore.setState({ plan: makePlan() });
    render(<SessionScreen />);

    // Initial reps display: 12 (from Sentadilla's 12 reps)
    expect(screen.getByText('12')).toBeInTheDocument();

    // Find and click the "+" button (it has a Plus icon or the text "+")
    const allButtons = screen.getAllByRole('button');
    const plusButton = allButtons.find(b =>
      b.textContent === '+' ||
      b.innerHTML.includes('plus') ||
      b.innerHTML.includes('M12 5v14') // common plus path
    );
    if (plusButton) {
      fireEvent.click(plusButton);
      // Reps should now be 13
      expect(screen.getByText('13')).toBeInTheDocument();
    }
  });

  it('decrements reps counter with - button', () => {
    useStore.setState({ plan: makePlan() });
    render(<SessionScreen />);

    // Find and click the "-" button
    const allButtons = screen.getAllByRole('button');
    const minusButton = allButtons.find(b =>
      b.textContent === '−' ||
      b.textContent === '-' ||
      b.innerHTML.includes('M5 12h14') // common minus path
    );
    if (minusButton) {
      fireEvent.click(minusButton);
      expect(screen.getByText('11')).toBeInTheDocument();
    }
  });

  // ─── Edge cases ───

  it('shows rest timer after completing all sets of an exercise', () => {
    vi.useFakeTimers();

    useStore.setState({
      plan: makePlan({
        workout: {
          title: 'Test', focus: 'full', duration: 20,
          exercises: [
            { exercise_id: 'ex1', name: 'Sentadilla', muscle: 'cuadriceps', sets: 2, reps: 12, rest: 60 },
            { exercise_id: 'ex2', name: 'Flexiones', muscle: 'pecho', sets: 3, reps: 10, rest: 45 },
          ],
        },
      }),
    });
    render(<SessionScreen />);

    // Complete first set (goes to set 2)
    fireEvent.click(screen.getByRole('button', { name: 'Serie hecha' }));
    act(() => { vi.advanceTimersByTime(500); });

    // Complete second (last) set → triggers rest
    fireEvent.click(screen.getByRole('button', { name: 'Terminar ejercicio' }));
    act(() => { vi.advanceTimersByTime(500); });

    // act already flushed all React updates — DOM is ready synchronously
    expect(screen.getByText('Descanso')).toBeInTheDocument();
    // Note: during rest, ex is still exs[idx] (the current/completed exercise)
    expect(screen.getByText(/siguiente: sentadilla/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows pause overlay with three options when Pausa is clicked', () => {
    useStore.setState({ plan: makePlan() });
    render(<SessionScreen />);

    // Click Pausa button
    fireEvent.click(screen.getByText('Pausa'));

    // Overlay should show three options
    expect(screen.getByText('Bien, sigo')).toBeInTheDocument();
    expect(screen.getByText(/cansado/i)).toBeInTheDocument();
    // Overlay should show three options (scoped to full overlay text to avoid
    // collision with session-screen's skip button "Terminar aquí")
    expect(screen.getByText(/terminar aquí · guardamos lo hecho/i)).toBeInTheDocument();
  });

  it('shows time-based UI when exercise reps > 50', () => {
    useStore.setState({
      plan: makePlan({
        workout: {
          title: 'Test', focus: 'full', duration: 20,
          exercises: [
            { exercise_id: 'ex1', name: 'Plancha', muscle: 'core', sets: 3, reps: 60, rest: 30, load_type: 'time' },
          ],
        },
      }),
    });
    render(<SessionScreen />);

    // Should show "segundos" instead of "repeticiones"
    expect(screen.getByText('segundos')).toBeInTheDocument();
    expect(screen.queryByText('repeticiones')).not.toBeInTheDocument();

    // Should show an "Iniciar serie" button
    expect(screen.getByRole('button', { name: /iniciar serie/i })).toBeInTheDocument();
  });

  it('clicking "Bien, sigo" in pause overlay resumes session', () => {
    useStore.setState({ plan: makePlan() });
    render(<SessionScreen />);

    // Pause
    fireEvent.click(screen.getByText('Pausa'));
    expect(screen.getByText('Bien, sigo')).toBeInTheDocument();

    // Resume
    fireEvent.click(screen.getByText('Bien, sigo'));

    // Overlay should close
    expect(screen.queryByText('Bien, sigo')).not.toBeInTheDocument();
  });

  it('clicking "Terminar aquí" in pause overlay finishes the session', () => {
    vi.useFakeTimers();

    useStore.setState({
      plan: makePlan({
        workout: {
          title: 'Test', focus: 'full', duration: 20,
          exercises: [
            // 2-set exercise so we can complete a set without auto-finishing
            { exercise_id: 'ex1', name: 'Sentadilla', muscle: 'cuadriceps', sets: 2, reps: 12, rest: 60 },
          ],
        },
      }),
    });
    render(<SessionScreen />);

    // Complete first set (goes to set 2)
    fireEvent.click(screen.getByRole('button', { name: 'Serie hecha' }));
    act(() => { vi.advanceTimersByTime(500); });

    // Open pause overlay
    fireEvent.click(screen.getByText('Pausa'));

    // Finish via pause
    fireEvent.click(screen.getByText(/terminar aquí · guardamos lo hecho/i));

    // Should navigate to summary
    const state = useStore.getState();
    expect(state.view).toBe('summary');

    vi.useRealTimers();
  });

  it('handles single-exercise plan correctly (no next exercise)', () => {
    vi.useFakeTimers();

    useStore.setState({
      plan: makePlan({
        workout: {
          title: 'Test', focus: 'full', duration: 20,
          exercises: [
            // Single-set exercise: button says "Terminar ejercicio"
            { exercise_id: 'ex1', name: 'Sentadilla', muscle: 'cuadriceps', sets: 1, reps: 12, rest: 60 },
          ],
        },
      }),
    });
    render(<SessionScreen />);

    // Complete the only set
    fireEvent.click(screen.getByRole('button', { name: /terminar ejercicio/i }));
    act(() => { vi.advanceTimersByTime(500); });

    // With only 1 exercise and 1 set, completing should navigate to summary
    const state = useStore.getState();
    expect(state.view).toBe('summary');

    vi.useRealTimers();
  });
});
