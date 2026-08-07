/**
 * @jest-environment jsdom
 * Tests for JournalScreen component — render con workouts, empty state, grouping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JournalScreen } from '../journal-screen';
import type { Workout } from '@/types';
import type { ReactNode } from 'react';

const mockState = {
  workouts: [] as Workout[],
  lang: 'es' as 'es' | 'en',
  prefs: {},
  view: 'journal' as string,
  setView: vi.fn(),
  setPref: vi.fn(),
  checkins: {},
  profile: null,
  onboarded: false,
  plan: null,
  neuro: null,
  streak: 0,
  completedQuests: [],
  achievements: [],
  currentXp: 0,
  level: 1,
  title: '',
  lastSessionDate: '',
  goals: {},
  motivation: 0,
  energy: 0,
  focus: 0,
  weeklyTarget: 3,
  subscription: null,
  twins: {},
  systemMode: false,
};

vi.mock('@/lib/store', () => ({
  useStore: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    motion: {
      div: ({ children }: { children: React.ReactNode }) => children,
      button: ({ children }: { children: React.ReactNode }) => children,
    },
  };
});

vi.mock('@/components/training/session-screen', () => ({
  SessionScreen: () => <div>SessionScreen</div>,
}));

vi.mock('@/components/ui/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/lib/i18n/use-t', () => ({
  useT: () => (text: string) => text,
  useLocale: () => 'es-ES',
}));

describe('JournalScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no workouts exist', () => {
    mockState.workouts = [];

    render(<JournalScreen />);

    expect(screen.getByText(/Aún no hay sesiones/)).toBeInTheDocument();
    expect(screen.getByText('Bitácora')).toBeInTheDocument();
  });

  it('renders "Bitácora" heading when workouts exist', () => {
    mockState.workouts = [
      {
        id: 'w1',
        user_id: 'u1',
        date: '2025-08-04T10:00:00Z',
        duration: 20,
        focus: 'full',
        intensity: 'standard',
        score: 85,
        completed_rate: 0.9,
        exercises: [{ exercise_id: 'ex1', name: 'Sentadilla', muscle: 'piernas', sets: 3, reps: 12, rest: 60, completed_sets: 3, completed_reps: [12], rpe: 8, status: 'done' }],
        actual_minutes: 20,
        rpe: 'justo',
        created_at: '2025-08-04T10:00:00Z',
      },
    ];

    render(<JournalScreen />);

    expect(screen.getByText('Bitácora')).toBeInTheDocument();
    expect(screen.queryByText(/Aún no hay sesiones/)).not.toBeInTheDocument();
  });
});
