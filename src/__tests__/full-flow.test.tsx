import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useStore } from '@/lib/store';
import { todayKey } from '@/lib/utils/helpers';
import {
  DecisionEngine,
  TrainingAgent,
  MotivationEngine,
  calculateConsistency,
} from '@/lib/agents/decision-engine';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { HomeScreen } from '@/components/training/home-screen';
import { SessionScreen } from '@/components/training/session-screen';
import { SummaryScreen } from '@/components/training/summary-screen';
import type { Profile, DigitalTwin } from '@/types';

// ─── Shared test data ───

const mockProfile: Profile = {
  user_id: '', name: 'Ana', goal: 'energia', level: 'medio',
  equipment: 'ninguno', limitations: [], days_per_week: '2-3',
  neurotype: 'adh-c', preferred_duration: 20,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const mockTwin: DigitalTwin = {
  user_id: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  training_style: 'adaptive', motivation_style: 'data', avoid: [], best_time: '',
  patterns: { completion_rate: 0.5, avg_duration: 20, abandon_rate: 0.2, best_hours: {} },
  ex_progress: {}, motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
};

function makePlan(overrides: Record<string, unknown> = {}) {
  return {
    action: 'train' as const,
    intensity: 'standard' as const,
    duration: 20,
    reasons: ['Buena recuperación', 'Consistencia activa'],
    confidence: 78,
    consistency: {
      user_id: '', period_start: '', period_end: '',
      consistency_pct: 60, sessions_done: 8, sessions_target: 13,
    },
    date: todayKey(),
    done: false,
    workout: {
      title: 'Full Body Express',
      focus: 'full' as const,
      intensity: 'standard' as const,
      duration: 20,
      sets: 3,
      rest: 50,
      exercises: [
        { exercise_id: 'squat', name: 'Sentadilla', muscle: 'piernas', sets: 2, reps: 12, rest: 50, completed_sets: 0, completed_reps: [], status: 'pending' as const },
        { exercise_id: 'pushup', name: 'Flexiones', muscle: 'pecho', sets: 2, reps: 10, rest: 50, completed_sets: 0, completed_reps: [], status: 'pending' as const },
      ],
    },
    ...overrides,
  };
}

/** Set a Radix slider value by focusing the thumb and using keyboard arrows */
function setSliderValue(slider: HTMLElement, target: number, current: number, step: number) {
  slider.focus();
  const diff = Math.round((target - current) / step);
  if (diff === 0) return;
  const key = diff > 0 ? 'ArrowRight' : 'ArrowLeft';
  for (let i = 0; i < Math.abs(diff); i++) {
    fireEvent.keyDown(slider, { key });
  }
}

/** Complete onboarding through all 9 UI steps. Must be cleaned up after. */
function completeOnboarding() {
  render(<OnboardingScreen />);

  // Step 1: Name
  fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

  // Step 2: Goal + Duration
  fireEvent.click(screen.getByText('Fuerza y músculo'));
  fireEvent.click(screen.getByText('20 min'));
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

  // Step 3: Level
  fireEvent.click(screen.getByText('Estoy empezando'));
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

  // Step 4: Neurotype
  fireEvent.click(screen.getByText('TDAH combinado'));
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

  // Step 5: Chronotype
  fireEvent.click(screen.getByText('León (mañana)'));
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

  // Step 6: Equipment + Days
  fireEvent.click(screen.getByText('Sin equipo'));
  fireEvent.click(screen.getByText('2-3 días'));
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

  // Step 7: Medication
  fireEvent.click(screen.getByText('No aplica'));
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

  // Step 8: Theme
  fireEvent.click(screen.getByText('David'));
  fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

  // Step 9: Sensory → Create twin
  // Skip toggling (default off) and create directly
  fireEvent.click(screen.getByRole('button', { name: /crear mi digital twin/i }));
}

// ═══════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════

describe('Full Flow Integration', () => {
  // ───── Phase 1: Onboarding ─────
  describe('Phase 1: Onboarding', () => {
    afterEach(() => {
      cleanup();
    });

    it('completes all 9 steps and sets up store correctly', () => {
      completeOnboarding();

      const s = useStore.getState();
      expect(s.onboarded).toBe(true);
      expect(s.profile?.name).toBe('Ana');
      expect(s.profile?.goal).toBe('fuerza');
      expect(s.profile?.level).toBe('inicio');
      expect(s.profile?.neurotype).toBe('adh-c');
      expect(s.profile?.chronotype).toBe('leon');
      expect(s.profile?.medication).toBe('no');
      expect(s.profile?.equipment).toBe('ninguno');
      expect(s.profile?.days_per_week).toBe('2-3');
      expect(s.profile?.preferred_duration).toBe(20);
      expect(s.questState.selectedTheme).toBe('david');
      expect(s.sensory.quiet).toBe(false);
      expect(s.sensory.dim).toBe(false);
      expect(s.sensory.swap).toBe(false);
      expect(s.twin?.training_style).toBe('adaptive');
      expect(s.twin?.motivation_style).toBe('data');
      expect(s.twin?.patterns.avg_duration).toBe(20);
      // Boot sequence now plays asynchronously; view stays at current value until boot completes
    });

    it('creates neuro state with type and duration', () => {
      completeOnboarding();
      expect(useStore.getState().neuro?.type).toBe('adh-c');
      // duration is now stored as number (Fix #5)
      expect(useStore.getState().neuro?.duration).toBe(20);
    });

    it('initializes twin with default motivation weights', () => {
      completeOnboarding();
      const twin = useStore.getState().twin!;
      expect(twin.motiv_weights).toEqual({ data: 1, energy: 1, direct: 1, calm: 1 });
      expect(twin.patterns.completion_rate).toBe(0.5);
      expect(twin.patterns.abandon_rate).toBe(0.2);
    });
  });

  // ───── Phase 2: Check-in → Plan Creation ─────
  describe('Phase 2: Check-in and Plan', () => {
    afterEach(() => {
      cleanup();
    });

    it('HomeScreen shows CheckInCard when no check-in exists for today', async () => {
      useStore.setState({
        onboarded: true,
        profile: mockProfile,
        twin: mockTwin,
        view: 'home',
      });

      render(<HomeScreen />);

      // Wait for skeleton loading to finish
      const checkin = await screen.findByText('Check-in diario');
      expect(checkin).toBeInTheDocument();
      expect(screen.getByText(/30s/i)).toBeInTheDocument();

      // Verify ring displays the computed recovery score (sleep=7,energy=6,stress=4 → ~63)
      expect(screen.getByText('63')).toBeInTheDocument();
      expect(screen.getByText('recovery')).toBeInTheDocument();

      // Three sliders: sleep, energy, stress
      expect(screen.getAllByRole('slider').length).toBe(3);
    });

    it('high check-in values create a push-intensity train plan', async () => {
      useStore.setState({
        onboarded: true,
        profile: { ...mockProfile, goal: 'fuerza' },
        twin: {
          ...mockTwin,
          patterns: { ...mockTwin.patterns, completion_rate: 0.7 },
          created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
        view: 'home',
      });

      render(<HomeScreen />);

      await screen.findByText('Check-in diario');

      const [sleepSlider, energySlider, stressSlider] = screen.getAllByRole('slider');

      // High recovery: sleep=9, energy=8, stress=2
      // recovery = (9-4)/4.5*100*0.4 + 8*10*0.3 + (10-2)*10*0.3
      //          = 44.4 + 24 + 24 = 92.4 (≥ 75 → push with consistency >= 60%)
      setSliderValue(sleepSlider, 9, 7, 0.5);
      setSliderValue(energySlider, 8, 6, 1);
      setSliderValue(stressSlider, 2, 4, 1);

      expect(screen.getByText('9h')).toBeInTheDocument();
      expect(screen.getByText('8/10')).toBeInTheDocument();
      expect(screen.getByText('2/10')).toBeInTheDocument();

      // Trigger plan creation
      fireEvent.click(screen.getByRole('button', { name: /calcular mi día/i }));

      // Wait for plan card
      await screen.findByText(/tu entrenamiento está listo|movimiento suave|sesión ligera/i);

      const plan = useStore.getState().plan;
      expect(plan).not.toBeNull();
      expect(plan?.date).toBe(todayKey());
      expect(plan?.action).toBe('train');
      expect(plan?.workout).toBeDefined();
      expect(plan?.workout?.exercises.length).toBeGreaterThanOrEqual(1);

      // Check-in saved to store
      const ci = useStore.getState().checkins[todayKey()];
      expect(ci).toBeDefined();
      expect(ci.sleep).toBe(9);
      expect(ci.energy).toBe(8);
      expect(ci.stress).toBe(2);

      // "Empezar ahora" button visible
      expect(screen.getByRole('button', { name: /empezar ahora/i })).toBeInTheDocument();
    });

    it('low check-in values create a restore plan', async () => {
      useStore.setState({
        onboarded: true,
        profile: mockProfile,
        twin: mockTwin,
        view: 'home',
      });

      cleanup();
      render(<HomeScreen />);

      await screen.findByText('Check-in diario');

      const [sleepSlider, energySlider, stressSlider] = screen.getAllByRole('slider');

      // Very low recovery: sleep=4, energy=2, stress=8
      // recovery = 0 + 6 + 6 = 12 (< 35 → restore)
      setSliderValue(sleepSlider, 4, 7, 0.5);
      setSliderValue(energySlider, 2, 6, 1);
      setSliderValue(stressSlider, 8, 4, 1);

      expect(screen.getByText('4h')).toBeInTheDocument();
      expect(screen.getByText('2/10')).toBeInTheDocument();
      expect(screen.getByText('8/10')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /calcular mi día/i }));

      const plan = useStore.getState().plan;
      expect(plan).not.toBeNull();
      expect(plan?.action).toBe('restore');

      // Should show restore card with title
      expect(screen.getByText('Hoy toca recargar')).toBeInTheDocument();
    });
  });

  // ───── Phase 3: Session ─────
  describe('Phase 3: Session', () => {
    afterEach(() => {
      vi.useRealTimers();
      cleanup();
    });

    it('completes 2 exercises with 2 sets each and navigates to summary', async () => {
      vi.useFakeTimers();

      useStore.setState({
        onboarded: true,
        profile: mockProfile,
        twin: mockTwin,
        plan: makePlan({ workout: { title: 'Test', focus: 'full', duration: 20, exercises: [
          { exercise_id: 'squat', name: 'Sentadilla', muscle: 'piernas', sets: 2, reps: 12, rest: 50 },
          { exercise_id: 'pushup', name: 'Flexiones', muscle: 'pecho', sets: 2, reps: 10, rest: 50 },
        ]}}),
        view: 'session',
      });

      await act(async () => {
        render(<SessionScreen />);
      });

      // ── Exercise 1: Sentadilla (2 sets) ──
      expect(screen.getByText('Sentadilla')).toBeInTheDocument();
      expect(screen.getByText(/serie 1 de 2/i)).toBeInTheDocument();
      expect(screen.getByText('Ejercicio 1 de 2')).toBeInTheDocument();

      // Set 1 → "Serie hecha"
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /serie hecha/i }));
      });
      act(() => { vi.advanceTimersByTime(500); });

      // Set 2 (last) → "Terminar ejercicio"
      expect(screen.getByText(/serie 2 de 2/i)).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /terminar ejercicio/i }));
      });
      act(() => { vi.advanceTimersByTime(500); });

      // Rest timer appears: advance timers past 50s rest to trigger endRest
      act(() => { vi.advanceTimersByTime(51000); });

      // ── Exercise 2: Flexiones (2 sets) ──
      expect(screen.getByText('Flexiones')).toBeInTheDocument();
      expect(screen.getByText(/serie 1 de 2/i)).toBeInTheDocument();
      expect(screen.getByText('Ejercicio 2 de 2')).toBeInTheDocument();

      // Set 1
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /serie hecha/i }));
      });
      act(() => { vi.advanceTimersByTime(500); });

      // Set 2 (last) → finish session
      expect(screen.getByText(/serie 2 de 2/i)).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /terminar ejercicio/i }));
      });
      act(() => { vi.advanceTimersByTime(500); });

      // All exercises done → navigates to summary
      expect(useStore.getState().view).toBe('summary');
    });

    it('pause overlay can finish session early', async () => {
      vi.useFakeTimers();

      useStore.setState({
        onboarded: true,
        profile: mockProfile,
        twin: mockTwin,
        plan: makePlan(),
        view: 'session',
      });

      await act(async () => {
        render(<SessionScreen />);
      });

      // Complete one set
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /serie hecha/i }));
      });
      act(() => { vi.advanceTimersByTime(500); });

      // Open pause overlay
      await act(async () => {
        fireEvent.click(screen.getByText('Pausa'));
      });
      expect(screen.getByText('Bien, sigo')).toBeInTheDocument();

      // Finish early
      await act(async () => {
        fireEvent.click(screen.getByText(/terminar aquí/i));
      });

      expect(useStore.getState().view).toBe('summary');
    });
  });

  // ───── Phase 4: Summary ─────
  describe('Phase 4: Summary and Save', () => {
    afterEach(() => {
      cleanup();
    });

    it('renders high completion title and metrics', () => {
      useStore.setState({
        onboarded: true,
        profile: mockProfile,
        twin: mockTwin,
        plan: makePlan({
          result: { minutes: 18, rate: 0.85, doneEx: 2, totalEx: 2, exs: [], adapted: false },
        }),
        view: 'summary',
      });

      render(<SummaryScreen />);

      expect(screen.getByText(/hecho/i)).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
      expect(screen.getByText('2/2')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('saves workout, updates twin, and navigates home', () => {
      useStore.setState({
        onboarded: true,
        profile: mockProfile,
        twin: mockTwin,
        plan: makePlan({
          result: { minutes: 15, rate: 0.6, doneEx: 1, totalEx: 2, exs: [], adapted: false },
        }),
        view: 'summary',
      });

      render(<SummaryScreen />);

      // Medium completion title
      expect(screen.getByText(/buen movimiento/i)).toBeInTheDocument();

      // Select RPE = "justo"
      fireEvent.click(screen.getByText(/justo/i));

      // Select motivation = "energy"
      fireEvent.click(screen.getByText(/chispa se enciende/i));

      // Save
      fireEvent.click(screen.getByRole('button', { name: /guardar entrenamiento/i }));

      const state = useStore.getState();
      expect(state.view).toBe('home');
      expect(state.plan?.done).toBe(true);
      expect(state.workouts.length).toBe(1);
      expect(state.workouts[0].completed_rate).toBe(0.6);
      expect(state.workouts[0].rpe).toBe('justo');

      // Twin motivation style updated
      expect(state.twin?.motivation_style).toBe('energy');
      // Twin patterns updated via updateTwin EMA
      expect(state.twin?.patterns.completion_rate).not.toBe(0.5);
    });

    it('shows adaptation banner for low-completion sessions', () => {
      useStore.setState({
        onboarded: true,
        profile: mockProfile,
        twin: mockTwin,
        plan: makePlan({
          // rate < 0.4 → "Guardamos lo de hoy" title
          result: { minutes: 8, rate: 0.3, doneEx: 1, totalEx: 3, exs: [], adapted: true },
        }),
        view: 'summary',
      });

      render(<SummaryScreen />);

      expect(screen.getByText(/motor redujo la intensidad/i)).toBeInTheDocument();
      // rate=0.3 < 0.4 → shows "Guardamos lo de hoy"
      expect(screen.getByText(/guardamos lo de hoy/i)).toBeInTheDocument();
    });
  });

  // ───── End-to-end: Full sequential flow ─────
  describe('Complete End-to-End Flow', () => {
    afterEach(() => {
      vi.useRealTimers();
      cleanup();
    });

    it('onboarding → check-in → session → summary (store state transitions)', async () => {
      // ═══════════ PHASE 1: Onboarding ═══════════
      completeOnboarding();

      let s = useStore.getState();
      expect(s.onboarded).toBe(true);
      expect(s.profile).not.toBeNull();
      expect(s.twin).not.toBeNull();
      // Boot sequence plays asynchronously; view will change to 'home' after ~4.5s
      cleanup();

      // ═══════════ PHASE 2: Check-in ═══════════
      // Use DecisionEngine (same logic as HomeScreen) to create a realistic plan
      const checkinRec = {
        user_id: '',
        date: todayKey(),
        sleep: 8,
        energy: 7,
        stress: 3,
        recovery_score: 75,
        created_at: new Date().toISOString(),
      };

      s = useStore.getState();
      const cons = calculateConsistency(0, 3);
      const decision = DecisionEngine.decide({
        checkin: checkinRec,
        consistency: cons,
        twin: s.twin!,
        profile: s.profile!,
      });

      const workout = TrainingAgent.generate(decision, s.twin!, s.profile!.equipment, undefined, undefined);
      const plan = {
        ...decision,
        date: todayKey(),
        done: false,
        workout,
        message: MotivationEngine.message(
          s.twin!.motivation_style,
          decision.recovery_score ?? 50,
          decision.consistency.consistency_pct,
          decision.duration,
        ),
      };

      useStore.setState({ checkins: { [todayKey()]: checkinRec }, plan, view: 'home' });

      // Verify plan is realistic
      const exercises = workout.exercises;
      expect(exercises.length).toBeGreaterThanOrEqual(1);
      expect(exercises[0].name).toBeTruthy();
      expect(exercises[0].sets).toBeGreaterThanOrEqual(1);

      // ═══════════ PHASE 3: Session ═══════════
      vi.useFakeTimers();
      useStore.setState({ view: 'session' });
      await act(async () => {
        render(<SessionScreen />);
      });

      // Complete all exercises manually (not in a loop — the variable sets counts
      // from TrainingAgent make a loop fragile)
      for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
        const ex = exercises[exIdx];
        const isLastEx = exIdx === exercises.length - 1;

        // Complete each set
        for (let setNum = 1; setNum <= ex.sets; setNum++) {
          const isLastSet = setNum === ex.sets;
          const btnLabel = isLastSet ? /terminar ejercicio/i : /serie hecha/i;

          const btn = screen.getByRole('button', { name: btnLabel });
          await act(async () => {
            fireEvent.click(btn);
          });
          act(() => { vi.advanceTimersByTime(500); });
        }

        // Skip rest by advancing past it (skip button just sets restLeft=0 but doesn't
        // call endRest; the natural countdown from the timer does)
        if (!isLastEx) {
          act(() => { vi.advanceTimersByTime(51000); });
        }
      }

      expect(useStore.getState().view).toBe('summary');
      // Flush remaining state updates before cleanup and switching to real timers
      await act(async () => {
        cleanup();
      });
      vi.useRealTimers();

      // ═══════════ PHASE 4: Summary ═══════════
      // SessionScreen now sets plan.result automatically (Fix #16)
      // For this isolated test, we set it manually to test SummaryScreen
      const sessionResult = {
        minutes: 15,
        rate: 1.0,
        doneEx: exercises.length,
        totalEx: exercises.length,
        exs: exercises.map((e) => ({
          ...e,
          completed_sets: e.sets,
          status: 'done',
        })),
        adapted: false,
      };

      const currentPlan = useStore.getState().plan;
      useStore.setState({
        plan: { ...(currentPlan ?? {}), result: sessionResult } as typeof currentPlan,
        view: 'summary',
      });

      cleanup();
      render(<SummaryScreen />);

      expect(screen.getByText(/hecho/i)).toBeInTheDocument();

      // Select RPE and motivation
      await act(async () => {
        fireEvent.click(screen.getByText(/justo/i));
      });
      await act(async () => {
        fireEvent.click(screen.getByText(/recuperación/i));
      });

      // Save
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /guardar entrenamiento/i }));
      });

      s = useStore.getState();
      expect(s.view).toBe('home');
      expect(s.plan?.done).toBe(true);
      expect(s.workouts.length).toBe(1);
      expect(s.workouts[0].completed_rate).toBe(1.0);

      // Twin was updated by updateTwin
      expect(s.twin?.patterns.avg_duration).toBeGreaterThan(0);
      expect(s.twin?.patterns.completion_rate).toBeGreaterThan(0.5);
    });
  });
});
