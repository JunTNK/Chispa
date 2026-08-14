import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeLevel,
  computeTotalXp,
  computeWorkoutXp,
  evaluateAchievement,
  evaluateAllAchievements,
  computeAchievementContext,
} from '../achievements';
import type { Workout, Achievement, UserAchievement } from '@/types';
import type { AchievementContext } from '../achievements';

/* ─── Helpers ─── */

function mockWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'wo-1',
    user_id: 'user-1',
    date: '2026-01-01',
    duration: 30,
    focus: 'full',
    intensity: 'standard',
    score: 70,
    completed_rate: 1,
    exercises: [],
    actual_minutes: 25,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/* ═══════════════════════════════════════════
   computeLevel
   ═══════════════════════════════════════════ */

describe('computeLevel', () => {
  it('returns level 1 for 0 XP', () => {
    expect(computeLevel(0)).toBe(1);
  });

  it('returns level 1 for XP below 200', () => {
    expect(computeLevel(50)).toBe(1);
    expect(computeLevel(199)).toBe(1);
  });

  it('returns level 2 for exactly 200 XP', () => {
    expect(computeLevel(200)).toBe(2);
  });

  it('returns level 3 for 400-599 XP', () => {
    expect(computeLevel(400)).toBe(3);
    expect(computeLevel(599)).toBe(3);
  });

  it('returns level 5 for 800-999 XP', () => {
    expect(computeLevel(800)).toBe(5);
    expect(computeLevel(999)).toBe(5);
  });

  it('returns level 6 for 1000 XP', () => {
    // floor(1000/200) + 1 = 5 + 1 = 6
    expect(computeLevel(1000)).toBe(6);
  });

  it('never returns level below 1 for negative XP', () => {
    expect(computeLevel(-100)).toBe(1);
    expect(computeLevel(-1)).toBe(1);
  });

  it('returns level for a large XP value', () => {
    expect(computeLevel(10000)).toBe(51); // floor(10000/200) + 1
  });
});

/* ═══════════════════════════════════════════
   computeWorkoutXp
   ═══════════════════════════════════════════ */

describe('computeWorkoutXp', () => {
  it('returns 0 for 0% completion and 0 minutes', () => {
    expect(computeWorkoutXp(0, 0)).toBe(0);
  });

  it('calculates partial XP for incomplete workout', () => {
    // 0.5 * 50 + 20 * 1 = 25 + 20 = 45
    expect(computeWorkoutXp(0.5, 20)).toBe(45);
  });

  it('calculates full XP for a complete workout', () => {
    // 1 * 50 + 30 * 1 + 20(perfect) = 50 + 30 + 20 = 100
    expect(computeWorkoutXp(1, 30)).toBe(100);
  });

  it('rounds fractional XP correctly', () => {
    // 0.75 * 50 + 15 * 1 = 37.5 + 15 = 52.5 → rounds to 53
    expect(computeWorkoutXp(0.75, 15)).toBe(53);
  });

  it('applies perfect bonus when completed rate is >= 1', () => {
    expect(computeWorkoutXp(1, 10)).toBe(80);  // 50 + 10 + 20
    expect(computeWorkoutXp(1.1, 10)).toBe(85); // 55 + 10 + 20
  });

  it('excludes perfect bonus when completed rate is 0.99', () => {
    // 0.99 * 50 + 5 * 1 = 49.5 + 5 = 54.5 → rounds to 55 (no bonus)
    expect(computeWorkoutXp(0.99, 5)).toBe(55);
  });

  it('handles a very short workout (1 minute) without perfect bonus', () => {
    // 1 * 50 + 1 * 1 + 0 = 51 (el bonus de sesión perfecta exige ≥ 5 min)
    expect(computeWorkoutXp(1, 1)).toBe(51);
  });

  it('does not apply the perfect bonus to micro sessions (< 5 min)', () => {
    expect(computeWorkoutXp(1, 4)).toBe(54); // 50 + 4 + 0
    expect(computeWorkoutXp(1, 5)).toBe(75); // 50 + 5 + 20 (frontera)
  });

  it('handles a very long workout (90 minutes)', () => {
    // 0.8 * 50 + 90 * 1 = 40 + 90 = 130
    expect(computeWorkoutXp(0.8, 90)).toBe(130);
  });
});

/* ═══════════════════════════════════════════
   computeTotalXp
   ═══════════════════════════════════════════ */

describe('computeTotalXp', () => {
  it('returns 0 for an empty workout list', () => {
    expect(computeTotalXp([])).toBe(0);
  });

  it('calculates XP for a single workout', () => {
    const wo = mockWorkout({ completed_rate: 0.5, actual_minutes: 20 });
    // 0.5 * 50 + 20 * 1 = 45
    expect(computeTotalXp([wo])).toBe(45);
  });

  it('applies perfect bonus for 100% completion', () => {
    const wo = mockWorkout({ completed_rate: 1, actual_minutes: 30 });
    // 1 * 50 + 30 * 1 + 20 = 100
    expect(computeTotalXp([wo])).toBe(100);
  });

  it('sums XP across multiple workouts', () => {
    const wo1 = mockWorkout({ id: 'wo-1', completed_rate: 1, actual_minutes: 30 });     // 100 XP
    const wo2 = mockWorkout({ id: 'wo-2', completed_rate: 0.5, actual_minutes: 20 });   // 45 XP
    const wo3 = mockWorkout({ id: 'wo-3', completed_rate: 0.8, actual_minutes: 15 });   // 40 + 15 = 55 XP
    // 100 + 45 + 55 = 200
    expect(computeTotalXp([wo1, wo2, wo3])).toBe(200);
  });

  it('uses duration field when actual_minutes is not available', () => {
    const wo = mockWorkout({ completed_rate: 0.5, actual_minutes: 0, duration: 30 });
    // actual_minutes is 0 (falsy), falls back to duration = 30
    // 0.5 * 50 + 30 * 1 = 55
    expect(computeTotalXp([wo])).toBe(55);
  });

  it('handles workouts completed at different rates and durations', () => {
    const workouts: Workout[] = [
      mockWorkout({ id: 'wo-1', completed_rate: 1, actual_minutes: 45 }),    // 50 + 45 + 20 = 115
      mockWorkout({ id: 'wo-2', completed_rate: 0.3, actual_minutes: 10 }),  // 15 + 10 = 25
      mockWorkout({ id: 'wo-3', completed_rate: 0.9, actual_minutes: 25 }),  // 45 + 25 = 70
      mockWorkout({ id: 'wo-4', completed_rate: 1, actual_minutes: 60 }),    // 50 + 60 + 20 = 130
    ];
    // 115 + 25 + 70 + 130 = 340
    expect(computeTotalXp(workouts)).toBe(340);
  });

  it('produces 0 total when all workouts have 0% completion and 0 minutes', () => {
    const wo = mockWorkout({ completed_rate: 0, actual_minutes: 0, duration: 0 });
    expect(computeTotalXp([wo])).toBe(0);
  });

  it('rounds each workout contribution independently before summing', () => {
    // 0.33 * 50 + 10 = 16.5 + 10 = 26.5 → rounds to 27
    const wo1 = mockWorkout({ id: 'wo-1', completed_rate: 0.33, actual_minutes: 10 });
    // 0.67 * 50 + 20 = 33.5 + 20 = 53.5 → rounds to 54
    const wo2 = mockWorkout({ id: 'wo-2', completed_rate: 0.67, actual_minutes: 20 });
    expect(computeTotalXp([wo1, wo2])).toBe(81); // 27 + 54
  });

  it('sums XP for many workouts (regression)', () => {
    // 50 identical workouts, each giving 50 XP → 2500
    const workouts = Array.from({ length: 50 }, (_, i) =>
      mockWorkout({ id: `wo-${i}`, completed_rate: 0.5, actual_minutes: 25 })
    );
    // Each: 0.5 * 50 + 25 = 25 + 25 = 50
    expect(computeTotalXp(workouts)).toBe(2500);
  });
});

/* ─── Helpers for evaluation tests ─── */

function makeAchievement(overrides: Partial<Achievement> = {}): Achievement {
  return {
    id: 'test_ach',
    category: 'workouts',
    name: 'Test',
    description: 'Test achievement',
    icon: 'CheckCircle',
    tier: 'common',
    condition_type: 'total_workouts',
    condition_value: { min: 5 },
    sort_order: 99,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    workouts: [],
    totalWorkouts: 0,
    streak: 0,
    currentLevel: 1,
    adaptationCount: 0,
    rpeJustoCount: 0,
    completedIntensities: new Set(),
    completedFocuses: {},
    ...overrides,
  };
}

/* ═══════════════════════════════════════════
   computeAchievementContext
   ═══════════════════════════════════════════ */

describe('computeAchievementContext', () => {
  it('returns 0 totalWorkouts for empty workouts', () => {
    const ctx = computeAchievementContext([]);
    expect(ctx.totalWorkouts).toBe(0);
    expect(ctx.streak).toBe(0);
    expect(ctx.currentLevel).toBe(1);
  });

  it('counts only workouts with completed_rate >= 0.5', () => {
    const w1 = mockWorkout({ id: 'w1', date: '2026-01-01', completed_rate: 1 });
    const w2 = mockWorkout({ id: 'w2', date: '2026-01-02', completed_rate: 0.3 }); // filtered out
    const w3 = mockWorkout({ id: 'w3', date: '2026-01-03', completed_rate: 0.5 }); // included (boundary)
    const w4 = mockWorkout({ id: 'w4', date: '2026-01-04', completed_rate: 0.49 }); // filtered out
    const ctx = computeAchievementContext([w1, w2, w3, w4]);
    expect(ctx.totalWorkouts).toBe(2);
  });

  it('calculates streak of consecutive days', () => {
    // Today = mocked later; instead, set dates relative to today
    const today = new Date();
    const days = [0, 1, 2].map((i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    });
    const workouts = days.map((date, i) =>
      mockWorkout({ id: `wo-${i}`, date, completed_rate: 1 })
    );
    const ctx = computeAchievementContext(workouts);
    expect(ctx.streak).toBe(3);
  });

  it('breaks streak when a day is missing', () => {
    const today = new Date();
    // Today and day before yesterday, but yesterday is missing
    const d0 = new Date(today);
    const d2 = new Date(today);
    d2.setDate(d2.getDate() - 2);
    const workouts = [
      mockWorkout({ id: 'wo-0', date: d0.toISOString().slice(0, 10), completed_rate: 1 }),
      mockWorkout({ id: 'wo-2', date: d2.toISOString().slice(0, 10), completed_rate: 1 }),
    ];
    const ctx = computeAchievementContext(workouts);
    expect(ctx.streak).toBe(1); // only today counts
  });

  it('calculates currentLevel as floor(completed / 5) + 1', () => {
    const workouts = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return mockWorkout({ id: `wo-${i}`, date: d.toISOString().slice(0, 10), completed_rate: 1 });
    });
    const ctx = computeAchievementContext(workouts);
    expect(ctx.totalWorkouts).toBe(12);
    expect(ctx.currentLevel).toBe(Math.floor(12 / 5) + 1); // floor(12/5)+1 = 3
  });

  it('builds completedIntensities set', () => {
    const today = new Date().toISOString().slice(0, 10);
    const w1 = mockWorkout({ id: 'w1', date: today, intensity: 'push', completed_rate: 1 });
    const w2 = mockWorkout({ id: 'w2', date: today, intensity: 'light', completed_rate: 1 });
    const ctx = computeAchievementContext([w1, w2]);
    expect(ctx.completedIntensities).toBeInstanceOf(Set);
    expect(ctx.completedIntensities?.has('push')).toBe(true);
    expect(ctx.completedIntensities?.has('light')).toBe(true);
    expect(ctx.completedIntensities?.has('standard')).toBe(false);
  });

  it('builds completedFocuses map', () => {
    const today = new Date().toISOString().slice(0, 10);
    const w1 = mockWorkout({ id: 'w1', date: today, focus: 'full', completed_rate: 1 });
    const w2 = mockWorkout({ id: 'w2', date: today, focus: 'upper', completed_rate: 1 });
    const w3 = mockWorkout({ id: 'w3', date: today, focus: 'full', completed_rate: 1 });
    const ctx = computeAchievementContext([w1, w2, w3]);
    expect(ctx.completedFocuses).toEqual({ full: 2, upper: 1 });
  });

  it('passes through extra params (bossDefeated, adaptationCount, rpeJustoCount)', () => {
    const ctx = computeAchievementContext([], {
      bossDefeated: 3,
      adaptationCount: 7,
      rpeJustoCount: 2,
    });
    expect(ctx.bossDefeated).toBe(3);
    expect(ctx.adaptationCount).toBe(7);
    expect(ctx.rpeJustoCount).toBe(2);
  });

  it('counts movement days as distinct workout dates (no streak required)', () => {
    const workouts = [
      mockWorkout({ id: 'w1', date: '2026-01-01', completed_rate: 1 }),
      mockWorkout({ id: 'w2', date: '2026-01-01', completed_rate: 0.9 }), // mismo día → no suma
      mockWorkout({ id: 'w3', date: '2026-01-03', completed_rate: 1 }),
      mockWorkout({ id: 'w4', date: '2026-01-08', completed_rate: 1 }),
    ];
    const ctx = computeAchievementContext(workouts);
    expect(ctx.movementDays).toBe(3); // 3 días distintos
  });

  it('counts focus variety as distinct routine types completed', () => {
    const workouts = [
      mockWorkout({ id: 'w1', date: '2026-01-01', focus: 'full', completed_rate: 1 }),
      mockWorkout({ id: 'w2', date: '2026-01-02', focus: 'upper', completed_rate: 1 }),
      mockWorkout({ id: 'w3', date: '2026-01-03', focus: 'full', completed_rate: 1 }),
    ];
    const ctx = computeAchievementContext(workouts);
    expect(ctx.focusVariety).toBe(2); // full + upper
  });

  it('unlocks movement achievements with 7 distinct days and variety', () => {
    const today = new Date();
    const workouts = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return mockWorkout({
        id: `wo-${i}`,
        date: d.toISOString().slice(0, 10),
        focus: ['full', 'upper', 'lower', 'core'][i % 4] as Workout['focus'],
        completed_rate: 1,
      });
    });
    const ctx = computeAchievementContext(workouts);
    expect(ctx.movementDays).toBe(7);
    expect(ctx.focusVariety).toBe(4);
    const result = evaluateAllAchievements(ctx, {});
    expect(result.progress.movimiento_7.unlocked).toBe(true);
    expect(result.progress.rutina_nueva.unlocked).toBe(true);
    expect(result.newlyUnlocked).toContain('movimiento_7');
    expect(result.newlyUnlocked).toContain('rutina_nueva');
  });

  it('counts mini victories (sessions of 1 minute or less)', () => {
    const workouts = [
      mockWorkout({ id: 'w1', date: '2026-01-01', actual_minutes: 1, completed_rate: 1 }),
      mockWorkout({ id: 'w2', date: '2026-01-02', actual_minutes: 0.5, completed_rate: 0.3 }),
      mockWorkout({ id: 'w3', date: '2026-01-03', actual_minutes: 20, completed_rate: 1 }),
      mockWorkout({ id: 'w4', date: '2026-01-04', completed_rate: 1 }), // sin actual_minutes
    ];
    const ctx = computeAchievementContext(workouts);
    expect(ctx.minSessions).toBe(2);
  });

  it('shows partial movement progress below the thresholds', () => {
    const today = new Date();
    const workouts = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return mockWorkout({
        id: `wo-${i}`,
        date: d.toISOString().slice(0, 10),
        focus: ['full', 'upper', 'core'][i] as Workout['focus'],
        completed_rate: 1,
      });
    });
    const ctx = computeAchievementContext(workouts);
    const result = evaluateAllAchievements(ctx, {});
    expect(result.progress.movimiento_7.unlocked).toBe(false);
    expect(result.progress.movimiento_7.progress_current).toBe(3);
    expect(result.progress.rutina_nueva.unlocked).toBe(true); // 3 focuses probados
  });

  it('defaults extra counts to 0', () => {
    const ctx = computeAchievementContext([]);
    expect(ctx.adaptationCount).toBe(0);
    expect(ctx.rpeJustoCount).toBe(0);
    expect(ctx.bossDefeated).toBeUndefined();
  });
});

/* ═══════════════════════════════════════════
   evaluateAchievement — individual conditions
   ═══════════════════════════════════════════ */

describe('evaluateAchievement', () => {
  // ── total_workouts ──
  describe('total_workouts', () => {
    it('unlocks when totalWorkouts >= min', () => {
      const ach = makeAchievement({ condition_type: 'total_workouts', condition_value: { min: 5 } });
      const ctx = makeCtx({ totalWorkouts: 5 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 5, progressTarget: 5 });
    });

    it('does not unlock when below min', () => {
      const ach = makeAchievement({ condition_type: 'total_workouts', condition_value: { min: 10 } });
      const ctx = makeCtx({ totalWorkouts: 7 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 7, progressTarget: 10 });
    });
  });

  // ── intensity_count ──
  describe('intensity_count', () => {
    it('counts completed workouts of a specific intensity', () => {
      const ach = makeAchievement({ condition_type: 'intensity_count', condition_value: { type: 'push', min: 3 } });
      const workouts = [
        mockWorkout({ id: 'w1', intensity: 'push', completed_rate: 1 }),
        mockWorkout({ id: 'w2', intensity: 'push', completed_rate: 1 }),
        mockWorkout({ id: 'w3', intensity: 'standard', completed_rate: 1 }),
        mockWorkout({ id: 'w4', intensity: 'push', completed_rate: 1 }),
      ];
      const ctx = makeCtx({ workouts });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 3, progressTarget: 3 });
    });

    it('excludes workouts with completed_rate < 0.5', () => {
      const ach = makeAchievement({ condition_type: 'intensity_count', condition_value: { type: 'push', min: 2 } });
      const workouts = [
        mockWorkout({ id: 'w1', intensity: 'push', completed_rate: 1 }),
        mockWorkout({ id: 'w2', intensity: 'push', completed_rate: 0.3 }), // excluded
      ];
      const ctx = makeCtx({ workouts });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 1, progressTarget: 2 });
    });
  });

  // ── all_intensities ──
  describe('all_intensities', () => {
    it('unlocks when all 4 intensities are completed', () => {
      const ach = makeAchievement({ condition_type: 'all_intensities', condition_value: { min: 1 } });
      const completedIntensities = new Set(['minimal', 'light', 'standard', 'push']);
      const ctx = makeCtx({ completedIntensities });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 4, progressTarget: 4 });
    });

    it('shows progress when some intensities are missing', () => {
      const ach = makeAchievement({ condition_type: 'all_intensities', condition_value: { min: 1 } });
      const completedIntensities = new Set(['minimal', 'standard']);
      const ctx = makeCtx({ completedIntensities });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 2, progressTarget: 4 });
    });
  });

  // ── focus_count ──
  describe('focus_count', () => {
    it('counts completed workouts of a specific focus', () => {
      const ach = makeAchievement({ condition_type: 'focus_count', condition_value: { type: 'full', min: 10 } });
      const completedFocuses = { full: 12, upper: 3 };
      const ctx = makeCtx({ completedFocuses });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 12, progressTarget: 10 });
    });

    it('returns 0 for unrecorded focus type', () => {
      const ach = makeAchievement({ condition_type: 'focus_count', condition_value: { type: 'core', min: 5 } });
      const ctx = makeCtx({ completedFocuses: { full: 10 } });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 0, progressTarget: 5 });
    });
  });

  // ── perfect_sessions ──
  describe('perfect_sessions', () => {
    it('unlocks when enough workouts have 100% completion', () => {
      const ach = makeAchievement({ condition_type: 'perfect_sessions', condition_value: { min: 3 } });
      const workouts = [
        mockWorkout({ id: 'w1', completed_rate: 1 }),
        mockWorkout({ id: 'w2', completed_rate: 1 }),
        mockWorkout({ id: 'w3', completed_rate: 0.8 }), // not perfect
        mockWorkout({ id: 'w4', completed_rate: 1 }),
      ];
      const ctx = makeCtx({ workouts });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 3, progressTarget: 3 });
    });
  });

  // ── comeback ──
  describe('comeback', () => {
    it('unlocks when latest 2 workouts have 3+ days gap', () => {
      const ach = makeAchievement({ condition_type: 'comeback', condition_value: { min_days_off: 3 } });
      const workouts = [
        mockWorkout({ id: 'w1', date: '2026-01-10', completed_rate: 1 }), // latest
        mockWorkout({ id: 'w2', date: '2026-01-03', completed_rate: 1 }), // 7 days before
      ];
      const ctx = makeCtx({ workouts });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 1, progressTarget: 1 });
    });

    it('does not unlock when gap is less than min_days_off', () => {
      const ach = makeAchievement({ condition_type: 'comeback', condition_value: { min_days_off: 3 } });
      const workouts = [
        mockWorkout({ id: 'w1', date: '2026-01-10', completed_rate: 1 }),
        mockWorkout({ id: 'w2', date: '2026-01-08', completed_rate: 1 }), // only 2 days gap
      ];
      const ctx = makeCtx({ workouts });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 0, progressTarget: 1 });
    });

    it('does not unlock when only 1 workout exists (no comparison)', () => {
      const ach = makeAchievement({ condition_type: 'comeback', condition_value: { min_days_off: 3 } });
      const workouts = [mockWorkout({ id: 'w1', date: '2026-01-10', completed_rate: 1 })];
      const ctx = makeCtx({ workouts });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 0, progressTarget: 1 });
    });
  });

  // ── level ──
  describe('level', () => {
    it('unlocks when currentLevel >= min', () => {
      const ach = makeAchievement({ condition_type: 'level', condition_value: { min: 5 } });
      const ctx = makeCtx({ currentLevel: 7 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 7, progressTarget: 5 });
    });

    it('does not unlock when below min', () => {
      const ach = makeAchievement({ condition_type: 'level', condition_value: { min: 10 } });
      const ctx = makeCtx({ currentLevel: 5 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 5, progressTarget: 10 });
    });
  });

  // ── boss_defeated ──
  describe('boss_defeated', () => {
    it('unlocks when bossDefeated >= min', () => {
      const ach = makeAchievement({ condition_type: 'boss_defeated', condition_value: { min: 5 } });
      const ctx = makeCtx({ bossDefeated: 5 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 5, progressTarget: 5 });
    });

    it('defaults to 0 when bossDefeated is undefined', () => {
      const ach = makeAchievement({ condition_type: 'boss_defeated', condition_value: { min: 1 } });
      const ctx = makeCtx({}); // bossDefeated not set
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 0, progressTarget: 1 });
    });
  });

  // ── time_based ──
  describe('time_based', () => {
    it('unlocks early_bird when current hour is before 7', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T06:00:00'));
      const ach = makeAchievement({ condition_type: 'time_based', condition_value: { before_hour: 7 } });
      const ctx = makeCtx({});
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 1, progressTarget: 1 });
      vi.useRealTimers();
    });

    it('does not unlock early_bird when current hour is after 7', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T08:30:00'));
      const ach = makeAchievement({ condition_type: 'time_based', condition_value: { before_hour: 7 } });
      const ctx = makeCtx({});
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 0, progressTarget: 1 });
      vi.useRealTimers();
    });

    it('unlocks night_owl when current hour is >= 22', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T23:00:00'));
      const ach = makeAchievement({ condition_type: 'time_based', condition_value: { after_hour: 22 } });
      const ctx = makeCtx({});
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 1, progressTarget: 1 });
      vi.useRealTimers();
    });
  });

  // ── adaptation_count ──
  describe('adaptation_count', () => {
    it('unlocks when adaptations >= min', () => {
      const ach = makeAchievement({ condition_type: 'adaptation_count', condition_value: { min: 5 } });
      const ctx = makeCtx({ adaptationCount: 7 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 7, progressTarget: 5 });
    });

    it('defaults to 0 when not set', () => {
      const ach = makeAchievement({ condition_type: 'adaptation_count', condition_value: { min: 5 } });
      const ctx = makeCtx({});
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 0, progressTarget: 5 });
    });
  });

  // ── rpe_justo_count ──
  describe('rpe_justo_count', () => {
    it('unlocks when rpeJustoCount >= min', () => {
      const ach = makeAchievement({ condition_type: 'rpe_justo_count', condition_value: { min: 10 } });
      const ctx = makeCtx({ rpeJustoCount: 10 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 10, progressTarget: 10 });
    });
  });

  // ── movement_days ──
  describe('movement_days', () => {
    it('unlocks when enough distinct movement days exist', () => {
      const ach = makeAchievement({ condition_type: 'movement_days', condition_value: { min: 7 } });
      const ctx = makeCtx({ movementDays: 7 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 7, progressTarget: 7 });
    });

    it('shows partial progress below the min', () => {
      const ach = makeAchievement({ condition_type: 'movement_days', condition_value: { min: 7 } });
      const ctx = makeCtx({ movementDays: 3 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 3, progressTarget: 7 });
    });

    it('defaults to 0 days', () => {
      const ach = makeAchievement({ condition_type: 'movement_days', condition_value: { min: 7 } });
      const ctx = makeCtx({});
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 0, progressTarget: 7 });
    });
  });

  // ── focus_variety ──
  describe('focus_variety', () => {
    it('unlocks when enough routine types have been tried', () => {
      const ach = makeAchievement({ condition_type: 'focus_variety', condition_value: { min: 3 } });
      const ctx = makeCtx({ focusVariety: 3 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 3, progressTarget: 3 });
    });

    it('shows partial progress below the min', () => {
      const ach = makeAchievement({ condition_type: 'focus_variety', condition_value: { min: 3 } });
      const ctx = makeCtx({ focusVariety: 1 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 1, progressTarget: 3 });
    });

    it('defaults to 0 types tried', () => {
      const ach = makeAchievement({ condition_type: 'focus_variety', condition_value: { min: 3 } });
      const ctx = makeCtx({});
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 0, progressTarget: 3 });
    });
  });

  // ── min_session ──
  describe('min_session', () => {
    it('unlocks with a 1-minute session (mini victoria)', () => {
      const ach = makeAchievement({ condition_type: 'min_session', condition_value: { min: 1 } });
      const ctx = makeCtx({ minSessions: 1 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 1, progressTarget: 1 });
    });

    it('stays locked without mini sessions', () => {
      const ach = makeAchievement({ condition_type: 'min_session', condition_value: { min: 1 } });
      const ctx = makeCtx({});
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 0, progressTarget: 1 });
    });
  });

  // ── windowed_days (cinco en movimiento) ──
  describe('windowed_days (cinco en movimiento)', () => {
    it('unlocks with 5 distinct movement days in a 7-day window', () => {
      const ach = makeAchievement({
        condition_type: 'windowed_days',
        condition_value: { min_days: 5, window_days: 7 },
      });
      const today = new Date();
      const dates: string[] = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      const workouts = dates.map((d, i) =>
        mockWorkout({ id: `w${i}`, date: d, completed_rate: 1 })
      );
      const ctx = makeCtx({ workouts });
      const result = evaluateAchievement(ach, ctx);
      expect(result.unlocked).toBe(true);
      expect(result.progressTarget).toBe(5);
    });

    it('does NOT unlock when movement is only 3 days in the window', () => {
      const ach = makeAchievement({
        condition_type: 'windowed_days',
        condition_value: { min_days: 5, window_days: 7 },
      });
      const today = new Date();
      const dates: string[] = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      const workouts = dates.map((d, i) =>
        mockWorkout({ id: `w${i}`, date: d, completed_rate: 1 })
      );
      const ctx = makeCtx({ workouts });
      const result = evaluateAchievement(ach, ctx);
      expect(result.unlocked).toBe(false);
      expect(result.progressCurrent).toBe(3);
    });

    it('ignores days outside the 7-day window', () => {
      const ach = makeAchievement({
        condition_type: 'windowed_days',
        condition_value: { min_days: 5, window_days: 7 },
      });
      const today = new Date();
      const dates: string[] = [];
      // 5 days in the window (last 7 days)
      for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      // Plus 3 old days outside the window
      for (let i = 8; i < 11; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      const workouts = dates.map((d, i) =>
        mockWorkout({ id: `w${i}`, date: d, completed_rate: 1 })
      );
      const ctx = makeCtx({ workouts });
      const result = evaluateAchievement(ach, ctx);
      expect(result.unlocked).toBe(true);
      expect(result.progressCurrent).toBe(5); // only 5 inside window
    });

    it('cuenta solo 1 día aunque haya múltiples sesiones en la misma fecha', () => {
      const ach = makeAchievement({
        condition_type: 'windowed_days',
        condition_value: { min_days: 5, window_days: 7 },
      });
      const today = new Date();
      const dates: string[] = [];
      // 5 días distintos: hoy + 4 días anteriores
      for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      // Dos sesiones en el mismo día (hoy)
      const workouts = [
        mockWorkout({ id: 'w1', date: dates[0], completed_rate: 1 }), // mañana
        mockWorkout({ id: 'w2', date: dates[0], completed_rate: 1 }), // tarde (mismo día)
        mockWorkout({ id: 'w3', date: dates[1], completed_rate: 1 }),
        mockWorkout({ id: 'w4', date: dates[2], completed_rate: 1 }),
        mockWorkout({ id: 'w5', date: dates[3], completed_rate: 1 }),
        mockWorkout({ id: 'w6', date: dates[4], completed_rate: 1 }),
      ];
      const ctx = makeCtx({ workouts });
      const result = evaluateAchievement(ach, ctx);
      expect(result.progressCurrent).toBe(5); // 5 días distintos, no 6
      expect(result.unlocked).toBe(true);
    });
  });

  // ── intensities_in_days ──
  describe('intensities_in_days', () => {
    it('unlocks when all 4 intensities are tried within the window', () => {
      const ach = makeAchievement({ condition_type: 'intensities_in_days', condition_value: { min_days: 14 } });
      const workouts = [
        mockWorkout({ id: 'w1', date: '2026-01-01', intensity: 'minimal', completed_rate: 1 }),
        mockWorkout({ id: 'w2', date: '2026-01-05', intensity: 'light', completed_rate: 1 }),
        mockWorkout({ id: 'w3', date: '2026-01-10', intensity: 'standard', completed_rate: 1 }),
        mockWorkout({ id: 'w4', date: '2026-01-12', intensity: 'push', completed_rate: 1 }),
      ];
      const ctx = makeCtx({ workouts });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 4, progressTarget: 4 });
    });

    it('unlocks exactly at the 14-day boundary', () => {
      const ach = makeAchievement({ condition_type: 'intensities_in_days', condition_value: { min_days: 14 } });
      // Día 1 → día 15: exactamente 14 días de diferencia
      const workouts = [
        mockWorkout({ id: 'w1', date: '2026-01-01', intensity: 'minimal', completed_rate: 1 }),
        mockWorkout({ id: 'w2', date: '2026-01-03', intensity: 'light', completed_rate: 1 }),
        mockWorkout({ id: 'w3', date: '2026-01-08', intensity: 'standard', completed_rate: 1 }),
        mockWorkout({ id: 'w4', date: '2026-01-15', intensity: 'push', completed_rate: 1 }),
      ];
      const ctx = makeCtx({ workouts });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: true, progressCurrent: 4, progressTarget: 4 });
    });

    it('stays locked when the span exceeds the window', () => {
      const ach = makeAchievement({ condition_type: 'intensities_in_days', condition_value: { min_days: 14 } });
      const workouts = [
        mockWorkout({ id: 'w1', date: '2026-01-01', intensity: 'minimal', completed_rate: 1 }),
        mockWorkout({ id: 'w2', date: '2026-01-05', intensity: 'light', completed_rate: 1 }),
        mockWorkout({ id: 'w3', date: '2026-01-10', intensity: 'standard', completed_rate: 1 }),
        mockWorkout({ id: 'w4', date: '2026-01-25', intensity: 'push', completed_rate: 1 }),
      ];
      const ctx = makeCtx({ workouts });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 4, progressTarget: 4 });
    });

    it('shows partial progress with some intensities tried', () => {
      const ach = makeAchievement({ condition_type: 'intensities_in_days', condition_value: { min_days: 14 } });
      const workouts = [
        mockWorkout({ id: 'w1', date: '2026-01-01', intensity: 'minimal', completed_rate: 1 }),
        mockWorkout({ id: 'w2', date: '2026-01-05', intensity: 'standard', completed_rate: 1 }),
      ];
      const ctx = makeCtx({ workouts });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 2, progressTarget: 4 });
    });
  });

  // ── unknown condition type ──
  describe('unknown condition type', () => {
    it('returns defaults (unlocked=false, progress=0)', () => {
      const ach = makeAchievement({ condition_type: 'unknown_type' as any, condition_value: { min: 5 } });
      const ctx = makeCtx({ totalWorkouts: 100 });
      expect(evaluateAchievement(ach, ctx)).toEqual({ unlocked: false, progressCurrent: 0, progressTarget: 5 });
    });
  });
});

/* ═══════════════════════════════════════════
   evaluateAllAchievements
   ═══════════════════════════════════════════ */

describe('evaluateAllAchievements', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns progress for all 32 achievements (sin rachas, rúbrica §7)', () => {
    const ctx = makeCtx({ totalWorkouts: 100 });
    const result = evaluateAllAchievements(ctx, {});
    expect(Object.keys(result.progress).length).toBe(32);
    // La categoría de rachas ya no existe
    expect(Object.keys(result.progress).some((id) => id.startsWith('streak_'))).toBe(false);
  });

  it('detects newly unlocked achievements', () => {
    // 100 workouts → unlocks several workout milestones
    const ctx = makeCtx({ totalWorkouts: 100 });
    const result = evaluateAllAchievements(ctx, {});
    expect(result.newlyUnlocked.length).toBeGreaterThanOrEqual(1);
    expect(result.newlyUnlocked).toContain('first_workout');
    expect(result.newlyUnlocked).toContain('hundred_workouts');
  });

  it('does not re-list already unlocked achievements', () => {
    const ctx = makeCtx({ totalWorkouts: 5 });
    const existing: Record<string, UserAchievement> = {
      first_workout: {
        achievement_id: 'first_workout',
        unlocked: true,
        unlocked_at: '2026-01-01T00:00:00Z',
        progress_current: 1,
        progress_target: 1,
      },
    };
    const result = evaluateAllAchievements(ctx, existing);
    expect(result.newlyUnlocked).not.toContain('first_workout');
    expect(result.newlyUnlocked).toContain('five_workouts');
  });

  it('preserves unlocked_at for already unlocked achievements', () => {
    const originalDate = '2026-01-01T00:00:00Z';
    const existing: Record<string, UserAchievement> = {
      first_workout: {
        achievement_id: 'first_workout',
        unlocked: true,
        unlocked_at: originalDate,
        progress_current: 1,
        progress_target: 1,
      },
    };
    const ctx = makeCtx({ totalWorkouts: 10 });
    const result = evaluateAllAchievements(ctx, existing);
    expect(result.progress.first_workout.unlocked_at).toBe(originalDate);
  });

  it('assigns current timestamp for newly unlocked achievements', () => {
    const ctx = makeCtx({ totalWorkouts: 1 });
    const result = evaluateAllAchievements(ctx, {});
    expect(result.progress.first_workout.unlocked_at).toBe('2026-06-15T12:00:00.000Z');
  });

  it('keeps unlocked_at as null for still-locked achievements', () => {
    const ctx = makeCtx({ totalWorkouts: 0 });
    const result = evaluateAllAchievements(ctx, {});
    expect(result.progress.first_workout.unlocked_at).toBeNull();
  });

  it('evaluates all 29 achievements correctly with 0 workouts', () => {
    const ctx = makeCtx({});
    const result = evaluateAllAchievements(ctx, {});

    // All should be locked
    for (const { progress } of [result]) {
      for (const id of Object.keys(progress)) {
        expect(progress[id].unlocked).toBe(false);
      }
    }
    expect(result.newlyUnlocked).toEqual([]);
  });

  it('never revokes an unlocked achievement when conditions regress (monotonic)', () => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    });
    // 1. Usuario desbloquea movimiento_7 con 7 días distintos
    const ctx7 = computeAchievementContext(
      days.map((date, i) => mockWorkout({ id: `wo-${i}`, date, completed_rate: 1 }))
    );
    const unlocked = evaluateAllAchievements(ctx7, {});
    expect(unlocked.progress.movimiento_7.unlocked).toBe(true);

    // 2. Solo quedan 3 días (progreso baja, logro NO se revoca)
    const ctx3 = computeAchievementContext(
      days.slice(0, 3).map((date, i) => mockWorkout({ id: `wo-${i}`, date, completed_rate: 1 }))
    );
    const reEval = evaluateAllAchievements(ctx3, unlocked.progress);
    expect(reEval.progress.movimiento_7.unlocked).toBe(true);
    expect(reEval.progress.movimiento_7.progress_current).toBe(3);
    expect(reEval.newlyUnlocked).not.toContain('movimiento_7');
  });

  it('updates progress_current for partial progress', () => {
    // 3 workouts total, streak of 3
    const today = new Date();
    const workouts = [0, 1, 2].map((i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return mockWorkout({ id: `wo-${i}`, date: d.toISOString().slice(0, 10), completed_rate: 1 });
    });
    const ctx = computeAchievementContext(workouts);
    const result = evaluateAllAchievements(ctx, {});

    // streak category is filtered out, so these don't exist in progress
    // first_workout should be unlocked
    expect(result.progress.first_workout.unlocked).toBe(true);
    expect(result.progress.first_workout.progress_current).toBe(3);
    // five_workouts should show progress
    expect(result.progress.five_workouts.unlocked).toBe(false);
    expect(result.progress.five_workouts.progress_current).toBe(3);
  });
});
