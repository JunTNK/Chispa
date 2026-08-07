import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AchievementToast } from '../achievement-toast';
import { useStore } from '@/lib/store';

// ─── Mock useSound (depends on AudioContext, not available in jsdom) ───
vi.mock('@/lib/awards/use-sound', () => ({
  useSound: () => ({ play: vi.fn() }),
}));

/* ─── Helpers ─── */

function setStoreState(overrides: Record<string, unknown> = {}) {
  useStore.setState({
    achievements: {},
    achievementQueue: [],
    ...overrides,
  });
}

beforeEach(() => {
  setStoreState();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/* ─── Tests ─── */

describe('AchievementToast', () => {
  // ── Initial State ──
  describe('initial state', () => {
    it('returns null when queue is empty', () => {
      setStoreState({ achievementQueue: [] });
      const { container } = render(<AchievementToast />);
      expect(container.innerHTML).toBe('');
    });

    it('returns null when queue has an invalid achievement ID', () => {
      setStoreState({ achievementQueue: ['non_existent_id'] });
      const { container } = render(<AchievementToast />);
      expect(container.innerHTML).toBe('');
    });
  });

  // ── Queue → Show ──
  describe('queue → show', () => {
    it('shows toast when a valid achievement is enqueued', () => {
      setStoreState({ achievementQueue: ['first_workout'] });
      render(<AchievementToast />);

      expect(screen.getByText('Primer Paso')).toBeInTheDocument();
      expect(screen.getByText('Completa tu primer entrenamiento')).toBeInTheDocument();
      expect(screen.getByText('Común')).toBeInTheDocument();
    });

    it('displays the correct tier label for uncommon achievements', () => {
      setStoreState({ achievementQueue: ['five_workouts'] });
      render(<AchievementToast />);

      expect(screen.getByText('Constancia')).toBeInTheDocument();
      expect(screen.getByText('Poco común')).toBeInTheDocument();
    });

    it('displays the correct tier label for rare achievements', () => {
      setStoreState({ achievementQueue: ['ten_workouts'] });
      render(<AchievementToast />);

      expect(screen.getByText('Dedicación')).toBeInTheDocument();
      expect(screen.getByText('Raro')).toBeInTheDocument();
    });

    it('displays the correct tier label for epic achievements', () => {
      setStoreState({ achievementQueue: ['twentyfive_workouts'] });
      render(<AchievementToast />);

      expect(screen.getByText('Atleta')).toBeInTheDocument();
      expect(screen.getByText('Épico')).toBeInTheDocument();
    });

    it('displays the correct tier label for legendary achievements', () => {
      setStoreState({ achievementQueue: ['hundred_workouts'] });
      render(<AchievementToast />);

      // "Legendario" appears as both the achievement name and tier label
      const legendarioElements = screen.getAllByText('Legendario');
      expect(legendarioElements.length).toBeGreaterThanOrEqual(2);
    });

    it('renders the achievement description', () => {
      setStoreState({ achievementQueue: ['streak_7'] });
      render(<AchievementToast />);

      expect(screen.getByText('Imparable')).toBeInTheDocument();
      expect(screen.getByText('Mantén una racha de 7 días seguidos')).toBeInTheDocument();
    });

    it('renders the sparkles icon container', () => {
      setStoreState({ achievementQueue: ['first_workout'] });
      const { container } = render(<AchievementToast />);
      // The sparkles icon is rendered in a span inside the toast
      const sparkleSvg = container.querySelector('svg');
      expect(sparkleSvg).toBeInTheDocument();
    });

    it('shows the special mini-victory toast with the reinforced message', () => {
      setStoreState({ achievementQueue: ['mini_victoria'] });
      render(<AchievementToast />);

      // Variante especial: badge + mensaje de refuerzo
      expect(screen.getByText('Mini victoria')).toBeInTheDocument();
      expect(screen.getByText('Un minuto ya es ganar.')).toBeInTheDocument();
      expect(screen.getByText('Hoy te moviste un minuto. Mañana pueden ser dos. Hacer algo vence a hacerlo perfecto.')).toBeInTheDocument();
      // La descripción genérica del catálogo no aparece en la variante especial
      expect(screen.queryByText('Completa una sesión de 1 minuto. Un minuto cuenta.')).not.toBeInTheDocument();
    });

    it('removes the achievement from the queue after showing', () => {
      setStoreState({ achievementQueue: ['first_workout'] });
      render(<AchievementToast />);

      // After render, the store should have dequeued the achievement
      const queue = useStore.getState().achievementQueue;
      expect(queue).toEqual([]);
    });
  });

  // ── Timeout → Hide ──
  describe('timeout → hide', () => {
    it('hides the toast after 3500ms', async () => {
      setStoreState({ achievementQueue: ['first_workout'] });
      render(<AchievementToast />);

      // Initially visible
      expect(screen.getByText('Primer Paso')).toBeInTheDocument();

      // Advance past the 3500ms timeout using async version to flush microtasks
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500);
      });

      // The toast should be hidden
      expect(screen.queryByText('Primer Paso')).not.toBeInTheDocument();
    });

    it('cleans up the timeout when component unmounts', async () => {
      setStoreState({ achievementQueue: ['first_workout'] });
      const { unmount } = render(<AchievementToast />);

      expect(screen.getByText('Primer Paso')).toBeInTheDocument();

      // Unmount while toast is showing — timeout should be cleared
      unmount();

      // Advance time to ensure no lingering state updates
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });
      // No crash = cleanup was successful
    });
  });

  // ── Sequential Queue ──
  describe('sequential queue handling', () => {
    it('shows multiple achievements one at a time', async () => {
      setStoreState({ achievementQueue: ['first_workout', 'five_workouts'] });
      render(<AchievementToast />);

      // First achievement visible
      expect(screen.getByText('Primer Paso')).toBeInTheDocument();
      expect(screen.queryByText('Constancia')).not.toBeInTheDocument();

      // Advance past the 3500ms timeout
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500);
      });

      // First achievement hidden, second now appears
      expect(screen.queryByText('Primer Paso')).not.toBeInTheDocument();
      expect(screen.getByText('Constancia')).toBeInTheDocument();
    });

    it('processes three achievements sequentially', async () => {
      setStoreState({ achievementQueue: ['first_workout', 'five_workouts', 'ten_workouts'] });
      render(<AchievementToast />);

      // #1 visible
      expect(screen.getByText('Primer Paso')).toBeInTheDocument();

      // #1 → #2
      await act(async () => { await vi.advanceTimersByTimeAsync(3500); });
      expect(screen.queryByText('Primer Paso')).not.toBeInTheDocument();
      expect(screen.getByText('Constancia')).toBeInTheDocument();

      // #2 → #3
      await act(async () => { await vi.advanceTimersByTimeAsync(3500); });
      expect(screen.queryByText('Constancia')).not.toBeInTheDocument();
      expect(screen.getByText('Dedicación')).toBeInTheDocument();

      // #3 done
      await act(async () => { await vi.advanceTimersByTimeAsync(3500); });
      expect(screen.queryByText('Dedicación')).not.toBeInTheDocument();
    });

    it('handles queue that grows while displaying', async () => {
      setStoreState({ achievementQueue: ['first_workout'] });
      render(<AchievementToast />);

      expect(screen.getByText('Primer Paso')).toBeInTheDocument();

      // Add more achievements to the queue while toast is showing
      act(() => {
        useStore.getState().enqueueAchievement('five_workouts');
        useStore.getState().enqueueAchievement('ten_workouts');
      });

      // First achievement still showing
      expect(screen.getByText('Primer Paso')).toBeInTheDocument();

      await act(async () => { await vi.advanceTimersByTimeAsync(3500); });

      // Second achievement shows (was added during first display)
      expect(screen.getByText('Constancia')).toBeInTheDocument();
    });

    it('clears the queue after processing all achievements', async () => {
      setStoreState({ achievementQueue: ['first_workout', 'five_workouts'] });
      render(<AchievementToast />);

      await act(async () => { await vi.advanceTimersByTimeAsync(3500); });
      expect(screen.queryByText('Primer Paso')).not.toBeInTheDocument();

      await act(async () => { await vi.advanceTimersByTimeAsync(3500); });
      expect(screen.queryByText('Constancia')).not.toBeInTheDocument();

      const queue = useStore.getState().achievementQueue;
      expect(queue).toEqual([]);
    });
  });

  // ── Edge Cases ──
  describe('edge cases', () => {
    it('does not show a new toast while one is already visible', async () => {
      setStoreState({ achievementQueue: ['first_workout'] });
      render(<AchievementToast />);

      expect(screen.getByText('Primer Paso')).toBeInTheDocument();

      // Enqueue another while visible
      act(() => {
        useStore.getState().enqueueAchievement('five_workouts');
      });

      // First still showing, second not yet
      expect(screen.getByText('Primer Paso')).toBeInTheDocument();
      expect(screen.queryByText('Constancia')).not.toBeInTheDocument();

      // Advance timer to hide first
      await act(async () => { await vi.advanceTimersByTimeAsync(3500); });

      // Second now appears
      expect(screen.getByText('Constancia')).toBeInTheDocument();
    });

    it('handles rapid enqueue during display', async () => {
      setStoreState({ achievementQueue: ['first_workout'] });
      render(<AchievementToast />);

      // Rapidly add to queue while showing
      act(() => {
        useStore.getState().enqueueAchievement('five_workouts');
        useStore.getState().enqueueAchievement('ten_workouts');
      });

      await act(async () => { await vi.advanceTimersByTimeAsync(3500); });

      // Next in queue shows
      expect(screen.getByText('Constancia')).toBeInTheDocument();
    });

    it('re-renders correctly when store updates achievements', () => {
      setStoreState({ achievementQueue: ['first_workout'] });
      const { rerender } = render(<AchievementToast />);

      expect(screen.getByText('Primer Paso')).toBeInTheDocument();

      // Update store achievements (simulates background evaluation)
      act(() => {
        useStore.setState({
          achievements: {
            first_workout: {
              achievement_id: 'first_workout',
              unlocked: true,
              unlocked_at: new Date().toISOString(),
              progress_current: 1,
              progress_target: 1,
            },
          },
        });
      });

      // Toast still showing with dequeued achievement from local state
      rerender(<AchievementToast />);
      expect(screen.getByText('Primer Paso')).toBeInTheDocument();
    });
  });
});
