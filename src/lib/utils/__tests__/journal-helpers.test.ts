import { describe, it, expect } from 'vitest';
import {
  groupByWeek,
  formatWorkoutDate,
  intensityChipClass,
  rpeEmoji,
  weekSessionCount,
} from '../journal-helpers';
import type { Workout } from '@/types';

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 't1',
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
    ...overrides,
  };
}

describe('journal-helpers', () => {
  describe('intensityChipClass', () => {
    it('returns correct class for each intensity', () => {
      expect(intensityChipClass('minimal')).toContain('a78bfa');
      expect(intensityChipClass('light')).toContain('fbbf24');
      expect(intensityChipClass('standard')).toContain('34d399');
      expect(intensityChipClass('push')).toContain('f87171');
    });

    it('returns muted for unknown intensity', () => {
      const cls = intensityChipClass('minimal' as Workout['intensity']);
      expect(typeof cls).toBe('string');
    });
  });

  describe('rpeEmoji', () => {
    it('returns correct emoji for each RPE', () => {
      expect(rpeEmoji('suave')).toBe('😊');
      expect(rpeEmoji('justo')).toBe('👍');
      expect(rpeEmoji('duro')).toBe('😓');
    });

    it('returns sparkle for undefined RPE', () => {
      expect(rpeEmoji(undefined)).toBe('✨');
    });
  });

  describe('formatWorkoutDate', () => {
    it('formats ISO date to friendly string in ES', () => {
      expect(formatWorkoutDate('2025-08-04T10:00:00Z', 'es')).toMatch(/ago|ene|feb|mar|abr|may|jun|jul|sep|oct|nov|dic/);
    });

    it('formats ISO date to friendly string in EN', () => {
      expect(formatWorkoutDate('2025-08-04T10:00:00Z', 'en')).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    });
  });

  describe('weekSessionCount', () => {
    it('returns number of sessions', () => {
      const sessions = [makeWorkout({}), makeWorkout({ id: 't2' })];
      expect(weekSessionCount(sessions)).toBe(2);
    });

    it('returns 0 for empty array', () => {
      expect(weekSessionCount([])).toBe(0);
    });
  });

  describe('groupByWeek', () => {
    it('groups workouts by week, sorted newest first', () => {
      const workouts = [
        makeWorkout({ date: '2025-08-04T10:00:00Z', id: 'w1' }), // Monday
        makeWorkout({ date: '2025-08-02T10:00:00Z', id: 'w2' }), // Saturday (previous week)
        makeWorkout({ date: '2025-08-06T10:00:00Z', id: 'w3' }), // Wednesday (same week as w1)
      ];
      const weeks = groupByWeek(workouts, 'es');
      expect(weeks.length).toBe(2);
    });

    it('calculates total duration per week', () => {
      const workouts = [
        makeWorkout({ date: '2025-08-04T10:00:00Z', id: 'w1', actual_minutes: 20 }),
        makeWorkout({ date: '2025-08-06T10:00:00Z', id: 'w2', actual_minutes: 30 }),
      ];
      const weeks = groupByWeek(workouts, 'es');
      expect(weeks[0].duration).toBe(50);
    });

    it('returns empty array for no workouts', () => {
      expect(groupByWeek([], 'es')).toEqual([]);
    });

    it('sorts sessions newest-first within week', () => {
      const workouts = [
        makeWorkout({ date: '2025-08-04T10:00:00Z', id: 'w1' }),
        makeWorkout({ date: '2025-08-06T10:00:00Z', id: 'w2' }),
      ];
      const weeks = groupByWeek(workouts, 'es');
      expect(weeks[0].sessions[0].id).toBe('w2');
    });
  });
});
