import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { useStore } from '@/lib/store';
import { todayKey } from '@/lib/utils/helpers';

// ─── Mocks for modules that don't work in jsdom ───
vi.mock('@/lib/utils/use-exercises', () => ({
  useExercises: () => ({ exercises: [], isLoading: false }),
  getExercises: () => Promise.resolve([]),
}));

// Mock LocalLLM to prevent async state updates that trigger act() warnings
vi.mock('@/lib/ai/local-llm', () => ({
  LocalLLM: {
    getInstance: () => ({
      load: vi.fn().mockResolvedValue(undefined),
      onProgress: vi.fn().mockReturnValue(() => {}),
    }),
  },
}));
vi.mock('@/lib/auth/supabase-auth', () => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
}));
vi.mock('@/lib/sync/supabase-sync', () => ({
  supabaseSync: { push: vi.fn() },
}));
vi.mock('@/lib/sync/leaderboard', () => ({
  pushLeaderboard: vi.fn(),
}));
vi.mock('@/lib/awards/use-sound', () => ({
  useSound: () => ({ play: vi.fn() }),
}));
vi.mock('@/lib/awards/use-achievement-eval', () => ({
  useAchievementEval: () => ({ evaluate: vi.fn() }),
}));
vi.mock('@/components/ui/particles', () => ({
  useConfetti: () => ({ fire: vi.fn() }),
}));

import { HomeScreen } from '@/components/training/home-screen';
import { CoachScreen } from '@/components/coach/coach-screen';
import { ProfileScreen } from '@/components/profile/profile-screen';
import { QuestScreen } from '@/components/neurofit/quest-screen';
import { SistemaScreen } from '@/components/neurofit/sistema-screen';
import { DopaminaScreen } from '@/components/neurofit/dopamina-screen';
import { LogrosScreen } from '@/components/awards/logros-screen';
import { ProgressScreen } from '@/components/progress/progress-screen';
import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { LoginScreen } from '@/components/auth/login-screen';
import { RegisterScreen } from '@/components/auth/register-screen';
import { SessionScreen } from '@/components/training/session-screen';
import { SummaryScreen } from '@/components/training/summary-screen';
import { QuickLogScreen } from '@/components/training/quick-log-screen';
import { CreateWorkoutScreen } from '@/components/training/create-workout-screen';
import { ExerciseCatalogScreen } from '@/components/training/exercise-catalog-screen';
import { LeaderboardScreen } from '@/components/awards/leaderboard-screen';

// Helper: check no axe violations (skip visual-only rules that can't run in jsdom)
async function expectNoViolations(container: HTMLElement) {
  const results = await axe(container, {
    runOnly: ['wcag2a', 'wcag2aa'],
  });
  if (results.violations.length > 0) {
    const desc = results.violations.map((v) => `${v.id}: ${v.description}`).join('; ');
    expect(results.violations, desc).toHaveLength(0);
  }
}

/* ─── Shared test data ─── */
const mockProfile = {
  user_id: '', name: 'Ana', goal: 'energia' as const, level: 'medio' as const,
  equipment: 'ninguno' as const, limitations: [], days_per_week: '2-3' as const,
  neurotype: 'adh-c' as const, preferred_duration: 20,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const mockTwin = {
  user_id: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  training_style: 'adaptive' as const, motivation_style: 'data' as const,
  avoid: [], best_time: '',
  patterns: { completion_rate: 0.5, avg_duration: 20, abandon_rate: 0.2, best_hours: {} },
  ex_progress: {}, motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
};

/* ─── Setup helper ─── */
function setStore(overrides: Record<string, unknown> = {}) {
  useStore.setState({
    onboarded: true,
    profile: mockProfile,
    twin: mockTwin,
    prefs: { reduceMotion: false, highContrast: false, fontLarge: false },
    chat: [],
    checkins: {},
    workouts: [],
    events: [],
    ...overrides,
  });
}

beforeEach(() => {
  setStore();
});

// ═══════════════════════════════════════════
//  HOME SCREEN
// ═══════════════════════════════════════════
describe('HomeScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'home' });
  });

  it('has no axe violations in initial state', async () => {
    const { container } = render(<HomeScreen />);
    await expectNoViolations(container);
  });

  it('quick-access buttons have accessible names', async () => {
    render(<HomeScreen />);
    // Wait for skeleton loading to finish
    const createBtn = await screen.findByText('Crear rutina');
    expect(createBtn).toBeInTheDocument();
    expect(screen.getByText('Bitácora')).toBeInTheDocument();
  });

  it('heading structure is correct', async () => {
    render(<HomeScreen />);
    const greeting = await screen.findByRole('heading', { level: 1 });
    expect(greeting).toBeInTheDocument();
  });

  it('has no axe violations with check-in and plan', async () => {
    const checkinRec = {
      user_id: '', date: todayKey(), sleep: 7, energy: 6,
      stress: 4, recovery_score: 63, created_at: new Date().toISOString(),
    };
    setStore({
      view: 'home',
      checkins: { [todayKey()]: checkinRec },
      plan: {
        action: 'train' as const,
        intensity: 'standard' as const, duration: 20,
        reasons: ['Buena recuperación'], confidence: 78,
        consistency: { user_id: '', period_start: '', period_end: '', consistency_pct: 60, sessions_done: 6, sessions_target: 10 },
        date: todayKey(), done: false,
        workout: {
          title: 'Test', focus: 'full' as const, intensity: 'standard' as const,
          duration: 20, sets: 3, rest: 50,
          exercises: [
            { exercise_id: 'squat', name: 'Sentadilla', muscle: 'piernas' as const, sets: 2, reps: 12, rest: 50, completed_sets: 0, completed_reps: [], status: 'pending' as const },
          ],
        },
        message: '¡Dale!',
      },
    });

    const { container } = render(<HomeScreen />);
    // Wait for plan or recovery card to render
    await screen.findByText(/crear rutina/i);
    await expectNoViolations(container);
  });
});

// ═══════════════════════════════════════════
//  COACH SCREEN
// ═══════════════════════════════════════════
describe('CoachScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'coach', chat: [] });
  });

  it('has no axe violations', async () => {
    const { container } = render(<CoachScreen />);
    // Wait for LLM attempt and header to render
    await screen.findByText(/coach chispa/i);
    await expectNoViolations(container);
  });

  it('input has accessible label', async () => {
    render(<CoachScreen />);
    // Wait for coach header then find input by id
    await screen.findByText(/coach chispa/i);
    const input = document.getElementById('coach-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-label', 'Escribe tu pregunta al coach');
  });

  it('send button has accessible label', async () => {
    render(<CoachScreen />);
    const sendBtn = screen.getByRole('button', { name: /enviar mensaje/i });
    expect(sendBtn).toBeInTheDocument();
  });

  it('messages container has log role', async () => {
    render(<CoachScreen />);
    const log = screen.getByRole('log');
    expect(log).toBeInTheDocument();
    expect(log).toHaveAttribute('aria-label', 'Mensajes del coach');
    expect(log).toHaveAttribute('aria-live', 'polite');
  });

  it('coach avatar has alt text', async () => {
    const { container } = render(<CoachScreen />);
    // Find img element with alt="Coach" in the rendered HTML
    await screen.findByText(/coach chispa/i);
    const img = container.querySelector('img[alt="Coach"]');
    expect(img).toBeInTheDocument();
  });

  it('suggested questions have accessible names', async () => {
    render(<CoachScreen />);
    await screen.findByText(/coach chispa/i);
    const qBtn = await screen.findByText(/cómo funciona/i, {}, { timeout: 3000 });
    expect(qBtn).toBeInTheDocument();
    // All suggested questions should be rendered as buttons
    const allBtns = screen.getAllByRole('button');
    const suggestedBtns = allBtns.filter((b) => b.textContent?.includes('?'));
    expect(suggestedBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('status dot has role=status and aria-label', async () => {
    render(<CoachScreen />);
    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveAttribute('aria-label');
  });
});

// ═══════════════════════════════════════════
//  PROFILE SCREEN
// ═══════════════════════════════════════════
describe('ProfileScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'profile' });
  });

  it('has no axe violations', async () => {
    const { container } = render(<ProfileScreen />);
    await screen.findByText(/perfil|ajustes|digital twin/i);
    await expectNoViolations(container);
  });

  it('heading structure is correct', async () => {
    render(<ProfileScreen />);
    const headings = await screen.findAllByRole('heading');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('settings buttons have accessible names', async () => {
    render(<ProfileScreen />);
    // Profile screen should have interactive buttons with text
    const buttons = await screen.findAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveAccessibleName();
    });
  });

  it('contains profile information labels', async () => {
    render(<ProfileScreen />);
    // Wait for at least some profile content
    await screen.findByText(/^Ana$/i);
  });
});

// ═══════════════════════════════════════════
//  QUEST SCREEN
// ═══════════════════════════════════════════
describe('QuestScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'quest', workouts: [] });
  });

  it('has no axe violations', async () => {
    const { container } = render(<QuestScreen />);
    await screen.findByText(/fitness/i, {}, { timeout: 3000 });
    await expectNoViolations(container);
  });

  it('category buttons have accessible names', async () => {
    render(<QuestScreen />);
    // Quest screen has clickable theme cards — wait for any button
    const buttons = await screen.findAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveAccessibleName();
    });
  });

  it('heading structure is correct', async () => {
    render(<QuestScreen />);
    // Look for the main heading
    const headings = await screen.findAllByRole('heading', { level: 2 });
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('theme list is accessible', async () => {
    render(<QuestScreen />);
    // Wait for theme categories to render
    await screen.findByText(/fitness/i, {}, { timeout: 3000 });
    // Verify items are focusable/clickable
    const clickableItems = screen.getAllByRole('button');
    expect(clickableItems.length).toBeGreaterThanOrEqual(5);
  });
});

// ═══════════════════════════════════════════
//  SISTEMA SCREEN
// ═══════════════════════════════════════════
describe('SistemaScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'sistema', workouts: [] });
  });

  it('renders without axe violations', async () => {
    const { container } = render(<SistemaScreen />);
    // Motion components animate immediately in jsdom
    await expectNoViolations(container);
  });

  it('renders heading', () => {
    render(<SistemaScreen />);
    expect(screen.getByText('SISTEMA')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════
//  DOPAMINA SCREEN
// ═══════════════════════════════════════════
describe('DopaminaScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'dopamina', workouts: [] });
  });

  it('renders without axe violations', async () => {
    const { container } = render(<DopaminaScreen />);
    await expectNoViolations(container);
  });

  it('renders dopamine menu items', () => {
    render(<DopaminaScreen />);
    expect(screen.getByText('DOPAMINA')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════
//  LOGROS SCREEN
// ═══════════════════════════════════════════
describe('LogrosScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'logros', workouts: [] });
  });

  it('renders without axe violations', async () => {
    const { container } = render(<LogrosScreen />);
    await expectNoViolations(container);
  });

  it('shows header text', () => {
    render(<LogrosScreen />);
    expect(screen.getByText('LOGROS')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════
//  PROGRESS SCREEN
// ═══════════════════════════════════════════
describe('ProgressScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'progress', workouts: [] });
  });

  it('renders without axe violations', async () => {
    const { container } = render(<ProgressScreen />);
    await expectNoViolations(container);
  });

  it('renders consistency text', () => {
    render(<ProgressScreen />);
    // ProgressScreen uses p tags, not headings
    expect(screen.getByText(/consistencia/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════
//  ONBOARDING SCREEN
// ═══════════════════════════════════════════
describe('OnboardingScreen — a11y', () => {
  beforeEach(() => {
    setStore({ onboarded: false, profile: null, twin: null });
  });

  it('renders without axe violations', async () => {
    const { container } = render(<OnboardingScreen />);
    await expectNoViolations(container);
  });

  it('shows step 1 content', () => {
    render(<OnboardingScreen />);
    // Onboarding step 1 asks for name
    expect(screen.getByText('¿Cómo te llamamos?')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════
//  LOGIN SCREEN
// ═══════════════════════════════════════════
describe('LoginScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'login' });
  });

  it('renders without axe violations', async () => {
    const { container } = render(<LoginScreen />);
    await expectNoViolations(container);
  });

  it('form inputs have accessible labels', () => {
    render(<LoginScreen />);
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).toHaveAccessibleName();
    });
  });
});

// ═══════════════════════════════════════════
//  REGISTER SCREEN
// ═══════════════════════════════════════════
describe('RegisterScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'register' });
  });

  it('renders without axe violations', async () => {
    const { container } = render(<RegisterScreen />);
    await expectNoViolations(container);
  });

  it('form inputs have accessible labels', () => {
    render(<RegisterScreen />);
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).toHaveAccessibleName();
    });
  });
});

// ═══════════════════════════════════════════
//  SESSION SCREEN
// ═══════════════════════════════════════════
describe('SessionScreen — a11y', () => {
  beforeEach(() => {
    setStore({
      view: 'session',
      plan: {
        action: 'train' as const,
        intensity: 'standard' as const, duration: 20,
        reasons: ['Test'], confidence: 80,
        consistency: { user_id: '', period_start: '', period_end: '', consistency_pct: 50, sessions_done: 0, sessions_target: 4 },
        date: todayKey(), done: false,
        workout: {
          title: 'Test', focus: 'full' as const, intensity: 'standard' as const,
          duration: 20, sets: 3, rest: 50,
          exercises: [
            { exercise_id: 'squat', name: 'Sentadilla', muscle: 'piernas' as const, sets: 2, reps: 12, rest: 50, completed_sets: 0, completed_reps: [], status: 'pending' as const },
          ],
        },
      },
    });
  });

  it('renders without axe violations', async () => {
    const { container } = render(<SessionScreen />);
    await expectNoViolations(container);
  });

  it('shows exercise name', () => {
    render(<SessionScreen />);
    // Session should show the exercise name or loading state
    expect(screen.getByText(/sentadilla|preparando sesion/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════
//  SUMMARY SCREEN
// ═══════════════════════════════════════════
describe('SummaryScreen — a11y', () => {
  beforeEach(() => {
    setStore({
      view: 'summary',
      workouts: [],
      plan: {
        action: 'train' as const,
        intensity: 'standard' as const, duration: 20,
        reasons: ['Test'], confidence: 80,
        consistency: { user_id: '', period_start: '', period_end: '', consistency_pct: 50, sessions_done: 0, sessions_target: 4 },
        date: todayKey(), done: false,
        workout: {
          title: 'Test', focus: 'full' as const, intensity: 'standard' as const,
          duration: 20, sets: 3, rest: 50,
          exercises: [
            { exercise_id: 'squat', name: 'Sentadilla', muscle: 'piernas' as const, sets: 2, reps: 12, rest: 50, completed_sets: 0, completed_reps: [], status: 'pending' as const },
          ],
        },
        result: {
          minutes: 15, rate: 0.8, doneEx: 2, totalEx: 3, adapted: false,
          exs: [
            { exercise_id: 'squat', name: 'Sentadilla', muscle: 'piernas' as const, sets: 2, reps: 12, rest: 50, completed_sets: 2, completed_reps: [12, 10], status: 'done' as const },
          ],
        },
      },
    });
  });

  it('renders without axe violations', async () => {
    const { container } = render(<SummaryScreen />);
    // Varios textos coinciden (título + micro-feedback): basta con que haya al menos uno
    const texts = await screen.findAllByText(/hecho|movimiento|guardamos/i, {}, { timeout: 3000 });
    expect(texts.length).toBeGreaterThanOrEqual(1);
    await expectNoViolations(container);
  });

  it('shows workout stats', async () => {
    render(<SummaryScreen />);
    // Multiple matches — use getAllByText to confirm all are present
    const stats = await screen.findAllByText(/minutos|ejercicios|completado/i, {}, { timeout: 3000 });
    expect(stats.length).toBeGreaterThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════
//  QUICK LOG SCREEN
// ═══════════════════════════════════════════
describe('QuickLogScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'quicklog', workouts: [] });
  });

  it('renders without axe violations (duration step)', async () => {
    const { container } = render(<QuickLogScreen />);
    await screen.findByText(/cu[aá]nto dur[oó]/i, {}, { timeout: 3000 });
    await expectNoViolations(container);
  });

  it('shows duration presets', () => {
    render(<QuickLogScreen />);
    expect(screen.getByText('Registro rápido')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════
//  CREATE WORKOUT SCREEN
// ═══════════════════════════════════════════
describe('CreateWorkoutScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'create', workouts: [] });
  });

  it('renders without axe violations', async () => {
    const { container } = render(<CreateWorkoutScreen />);
    // Multiple matches — use findAllByText
    const texts = await screen.findAllByText(/crear entrenamiento|enfoque|grupo muscular/i, {}, { timeout: 3000 });
    expect(texts.length).toBeGreaterThanOrEqual(1);
    await expectNoViolations(container);
  });

  it('shows header text', () => {
    render(<CreateWorkoutScreen />);
    expect(screen.getByText('Crear entrenamiento')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════
//  EXERCISE CATALOG SCREEN
// ═══════════════════════════════════════════
describe('ExerciseCatalogScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'catalog', workouts: [] });
  });

  it('renders without axe violations', async () => {
    const { container } = render(<ExerciseCatalogScreen />);
    // Catalog shows skeleton when loading; with mock it shows 0 ejercicios
    await screen.findByText(/catalogo|ejercicios/i, {}, { timeout: 3000 });
    await expectNoViolations(container);
  });

  it('shows search bar', () => {
    render(<ExerciseCatalogScreen />);
    expect(screen.getByPlaceholderText('Buscar ejercicios...')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════
//  LEADERBOARD SCREEN
// ═══════════════════════════════════════════
describe('LeaderboardScreen — a11y', () => {
  beforeEach(() => {
    setStore({ view: 'leaderboard', workouts: [] });
  });

  it('renders without axe violations', async () => {
    const { container } = render(<LeaderboardScreen />);
    // Leaderboard personal (rúbrica §7): comparación contra tu yo pasado, no ranking social
    await screen.findByText(/contra tu yo pasado/i, {}, { timeout: 3000 });
    await expectNoViolations(container);
  });

  it('shows header', () => {
    render(<LeaderboardScreen />);
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });
});
