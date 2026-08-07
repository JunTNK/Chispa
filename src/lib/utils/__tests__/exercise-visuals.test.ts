/**
 * Unit tests for exercise-visuals.ts
 *
 * Tests image URL resolution, fallback icon selection,
 * and getExerciseVisual helper function.
 */
import { describe, it, expect } from 'vitest';
import {
  getExerciseImageUrl,
  getExerciseImageUrls,
  getExerciseFallbackIcon,
  getExerciseVisual,
} from '../exercise-visuals';
import { Dumbbell, Heart, Sprout, Zap, Repeat, PersonStanding } from 'lucide-react';
import {
  LegsFallback,
  ChestFallback,
  BackFallback,
  ShouldersFallback,
  ArmsFallback,
  CoreFallback,
} from '../exercise-visuals';
import type { Exercise } from '@/types';

// ═══════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════

function makeEx(overrides: Partial<Exercise>): Exercise {
  return {
    id: 'test',
    name: 'Test Exercise',
    muscle: 'core',
    difficulty: 2,
    equipment: 'body only',
    instructions: 'Do the thing',
    load_type: 'reps',
    cognitive_load: 'low',
    emoji: '💪',
    cue: '',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
//  Tests
// ═══════════════════════════════════════════════════════════════

describe('getExerciseImageUrl', () => {
  it('returns null when exercise has no images array', () => {
    const ex = makeEx({});
    expect(getExerciseImageUrl(ex)).toBeNull();
  });

  it('returns null when images array is empty', () => {
    const ex = makeEx({ images: [] });
    expect(getExerciseImageUrl(ex)).toBeNull();
  });

  it('returns local public URL from relative image path', () => {
    const ex = makeEx({ images: ['Barbell_Squat/0.jpg'] });
    const url = getExerciseImageUrl(ex);
    expect(url).toBe('/exercises/Barbell_Squat/0.jpg');
  });

  it('uses first image when multiple are available', () => {
    const ex = makeEx({ images: ['Barbell_Squat/0.jpg', 'Barbell_Squat/1.jpg'] });
    const url = getExerciseImageUrl(ex);
    expect(url).toContain('/0.jpg');
    expect(url).not.toContain('/1.jpg');
  });

  it('handles nested folder paths correctly', () => {
    const ex = makeEx({ images: ['Bench_Press_-_Medium_Grip/0.jpg'] });
    const url = getExerciseImageUrl(ex);
    expect(url).toBe(
      '/exercises/Bench_Press_-_Medium_Grip/0.jpg'
    );
  });
});

describe('getExerciseImageUrls', () => {
  it('returns all image URLs', () => {
    const ex = makeEx({ images: ['Squat/0.jpg', 'Squat/1.jpg'] });
    const urls = getExerciseImageUrls(ex);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('Squat/0.jpg');
    expect(urls[1]).toContain('Squat/1.jpg');
  });

  it('returns empty array when no images', () => {
    const ex = makeEx({});
    expect(getExerciseImageUrls(ex)).toEqual([]);
  });
});

describe('getExerciseFallbackIcon', () => {
  it('1a — returns LegsFallback for quadriceps primary muscle', () => {
    const ex = makeEx({ primaryMuscles: ['quadriceps'], muscle: 'piernas' });
    expect(getExerciseFallbackIcon(ex)).toBe(LegsFallback);
  });

  it('1b — returns ChestFallback for pectoral primary muscle', () => {
    const ex = makeEx({ primaryMuscles: ['pectoral'] });
    expect(getExerciseFallbackIcon(ex)).toBe(ChestFallback);
  });

  it('1c — returns BackFallback for espalda muscle field', () => {
    const ex = makeEx({ muscle: 'espalda' });
    expect(getExerciseFallbackIcon(ex)).toBe(BackFallback);
  });

  it('1d — returns CoreFallback for abdominales muscle', () => {
    const ex = makeEx({ primaryMuscles: ['abdominales'] });
    expect(getExerciseFallbackIcon(ex)).toBe(CoreFallback);
  });

  it('1e — returns ArmsFallback for biceps', () => {
    const ex = makeEx({ primaryMuscles: ['biceps'] });
    expect(getExerciseFallbackIcon(ex)).toBe(ArmsFallback);
  });

  it('1f — returns ShouldersFallback for hombros', () => {
    const ex = makeEx({ primaryMuscles: ['hombros'] });
    expect(getExerciseFallbackIcon(ex)).toBe(ShouldersFallback);
  });

  it('2 — falls back to category icon when no muscle match', () => {
    const ex = makeEx({ muscle: 'unknown_muscle', category: 'stretching' });
    expect(getExerciseFallbackIcon(ex)).toBe(Sprout);
  });

  it('3 — falls back to equipment icon when no muscle or category match', () => {
    const ex = makeEx({ muscle: 'unknown', category: 'unknown', equipment: 'barbell' });
    expect(getExerciseFallbackIcon(ex)).toBe(Dumbbell);
  });

  it('4 — falls back to force icon when no other match', () => {
    const ex = makeEx({ muscle: 'unknown', equipment: 'unknown', force: 'push' });
    expect(getExerciseFallbackIcon(ex)).toBe(Zap);
  });

  it('5 — returns generic Dumbbell as ultimate fallback', () => {
    const ex = makeEx({ muscle: 'unknown', category: 'unknown', equipment: 'unknown', force: null });
    expect(getExerciseFallbackIcon(ex)).toBe(Dumbbell);
  });

  it('handles Spanish muscle names for primaryMuscles', () => {
    const ex = makeEx({ primaryMuscles: ['isquiotibiales'] });
    expect(getExerciseFallbackIcon(ex)).toBe(LegsFallback);
  });

  it('is case-insensitive for muscle matching', () => {
    const ex = makeEx({ primaryMuscles: ['QUADRICEPS'] });
    expect(getExerciseFallbackIcon(ex)).toBe(LegsFallback);
  });

  it('prefers primaryMuscles over muscle field', () => {
    const ex = makeEx({ primaryMuscles: ['quadriceps'], muscle: 'brazos' });
    expect(getExerciseFallbackIcon(ex)).toBe(LegsFallback);
  });

  it('returns Heart icon for cardio category', () => {
    const ex = makeEx({ muscle: 'unknown', category: 'cardio' });
    expect(getExerciseFallbackIcon(ex)).toBe(Heart);
  });

  it('returns PersonStanding for body only equipment', () => {
    const ex = makeEx({ muscle: 'unknown', category: 'unknown', equipment: 'body only' });
    expect(getExerciseFallbackIcon(ex)).toBe(PersonStanding);
  });

  it('returns Repeat icon for pull force', () => {
    const ex = makeEx({ muscle: 'unknown', equipment: 'unknown', force: 'pull' });
    expect(getExerciseFallbackIcon(ex)).toBe(Repeat);
  });
});

describe('getExerciseVisual', () => {
  it('returns src + fallback when exercise has images', () => {
    const ex = makeEx({ images: ['Squat/0.jpg'], primaryMuscles: ['quadriceps'] });
    const visual = getExerciseVisual(ex);
    expect(visual.src).toBeTruthy();
    expect(visual.src).toContain('Squat/0.jpg');
    expect(visual.fallbackIcon).toBe(LegsFallback);
  });

  it('returns null src + fallback when exercise has no images', () => {
    const ex = makeEx({ muscle: 'pecho' });
    const visual = getExerciseVisual(ex);
    expect(visual.src).toBeNull();
    expect(visual.fallbackIcon).toBe(ChestFallback);
  });
});
