/**
 * Exercise Visuals — Image URLs + Icon Fallbacks
 *
 * Resolves relative image paths from free-exercise-db to GitHub raw URLs
 * and provides Lucide/RPG icon fallbacks based on exercise metadata.
 *
 * Sources:
 *   https://github.com/yuhonas/free-exercise-db/tree/main/exercises
 *   Base URL: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/
 */
'use client';

import React from 'react';
import {
  Dumbbell,
  Heart,
  Sprout,
  PersonStanding,
  Zap,
  Activity,
  Repeat,
  Cog,
  Circle,
  Move,
} from 'lucide-react';
import { FitnessIcon } from '@/components/ui/fitness-icon';
import type { Exercise } from '@/types';

// ═══════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════

/** Base URL for exercise images on free-exercise-db */
const IMAGE_BASE_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

/**
 * Wrappers para que FitnessIcon (que requiere `name`) cumpla con la firma
 * `ComponentType<{ size?: number; className?: string }>` que espera el catálogo.
 */
export const LegsFallback = (p: { size?: number; className?: string }) => <FitnessIcon name="lower-body" {...p} />;
LegsFallback.displayName = 'LegsFallback';
export const ChestFallback = (p: { size?: number; className?: string }) => <FitnessIcon name="bench-press" {...p} />;
ChestFallback.displayName = 'ChestFallback';
export const BackFallback = (p: { size?: number; className?: string }) => <FitnessIcon name="upper-body" {...p} />;
BackFallback.displayName = 'BackFallback';
export const ShouldersFallback = (p: { size?: number; className?: string }) => <FitnessIcon name="upper-body" {...p} />;
ShouldersFallback.displayName = 'ShouldersFallback';
export const ArmsFallback = (p: { size?: number; className?: string }) => <FitnessIcon name="biceps" {...p} />;
ArmsFallback.displayName = 'ArmsFallback';
export const CoreFallback = (p: { size?: number; className?: string }) => <FitnessIcon name="core" {...p} />;
CoreFallback.displayName = 'CoreFallback';
export const CardioFallback = (p: { size?: number; className?: string }) => <FitnessIcon name="running" {...p} />;
CardioFallback.displayName = 'CardioFallback';
export const GlutesFallback = (p: { size?: number; className?: string }) => <FitnessIcon name="lower-body" {...p} />;
GlutesFallback.displayName = 'GlutesFallback';

/** Mapping: muscle → custom SVG icon component */
const MUSCLE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  quadriceps: LegsFallback,
  'quadriceps femoris': LegsFallback,
  piernas: LegsFallback,
  isquiotibiales: LegsFallback,
  hamstrings: LegsFallback,
  gemelos: LegsFallback,
  calves: LegsFallback,
  glutes: GlutesFallback,
  gluteos: GlutesFallback,
  pectoral: ChestFallback,
  pectorals: ChestFallback,
  pecho: ChestFallback,
  chest: ChestFallback,
  espalda: BackFallback,
  back: BackFallback,
  dorsales: BackFallback,
  hombros: ShouldersFallback,
  shoulders: ShouldersFallback,
  deltoids: ShouldersFallback,
  bíceps: ArmsFallback,
  biceps: ArmsFallback,
  tríceps: ArmsFallback,
  triceps: ArmsFallback,
  brazos: ArmsFallback,
  forearms: ArmsFallback,
  antebrazos: ArmsFallback,
  abdominales: CoreFallback,
  abdominals: CoreFallback,
  core: CoreFallback,
  oblicuos: CoreFallback,
  obliques: CoreFallback,
  cardio: CardioFallback,
};

/** Mapping: category → Lucide icon */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  strength: Dumbbell,
  stretching: Sprout,
  cardio: Heart,
  olympic_weightlifting: Dumbbell,
  powerlifting: Dumbbell,
  strongman: Dumbbell,
  crossfit: Activity,
  plyometrics: Zap,
  bodyweight: PersonStanding,
};

/** Mapping: force type → Lucide icon */
const FORCE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  push: Zap,
  pull: Repeat,
  static: Circle,
};

/** Mapping: equipment → Lucide icon */
const EQUIPMENT_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'body only': PersonStanding,
  'body weight': PersonStanding,
  dumbbell: Dumbbell,
  barbell: Dumbbell,
  'e-z curl bar': Dumbbell,
  machine: Cog,
  cable: Move,
  kettlebell: Dumbbell,
  bands: Repeat,
  'foam roll': Activity,
  'medicine ball': Circle,
  'exercise ball': Circle,
  'swiss ball': Circle,
};

// ═══════════════════════════════════════════════════════════════
//  Public Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve the first available image URL for an exercise.
 * Returns `null` if the exercise has no images array.
 */
export function getExerciseImageUrl(exercise: Exercise): string | null {
  if (!exercise.images || exercise.images.length === 0) return null;
  return `${IMAGE_BASE_URL}${exercise.images[0]}`;
}

/**
 * Get all available image URLs for an exercise.
 * Returns empty array if no images.
 */
export function getExerciseImageUrls(exercise: Exercise): string[] {
  if (!exercise.images || exercise.images.length === 0) return [];
  return exercise.images.map((img) => `${IMAGE_BASE_URL}${img}`);
}

/**
 * Choose the best fallback icon component based on exercise metadata.
 *
 * Priority order:
 *   1. Primary muscle (custom SVG body part icon)
 *   2. Category (Lucide: strength, cardio, stretching…)
 *   3. Equipment type
 *   4. Force direction (push/pull/static)
 *   5. Fallback: generic Dumbbell
 */
export function getExerciseFallbackIcon(
  exercise: Exercise,
): React.ComponentType<{ size?: number; className?: string }> {
  // 1 — Try primary muscle
  if (exercise.primaryMuscles && exercise.primaryMuscles.length > 0) {
    const primary = exercise.primaryMuscles[0].toLowerCase().trim();
    const muscleIcon = MUSCLE_ICONS[primary];
    if (muscleIcon) return muscleIcon;
  }

  // Also try the 'muscle' field (Spanish shorthand)
  if (exercise.muscle) {
    const m = exercise.muscle.toLowerCase().trim();
    const muscleIcon = MUSCLE_ICONS[m];
    if (muscleIcon) return muscleIcon;
  }

  // 2 — Try category
  if (exercise.category) {
    const catIcon = CATEGORY_ICONS[exercise.category.toLowerCase().trim()];
    if (catIcon) return catIcon;
  }

  // 3 — Try equipment
  if (exercise.equipment) {
    const eq = exercise.equipment.toLowerCase().trim();
    const eqIcon = EQUIPMENT_ICONS[eq];
    if (eqIcon) return eqIcon;
  }

  // 4 — Try force
  if (exercise.force) {
    const forceIcon = FORCE_ICONS[exercise.force];
    if (forceIcon) return forceIcon;
  }

  // 5 — Generic fallback
  return Dumbbell;
}

/**
 * Return both the image URL (if available) and the fallback icon component.
 *
 * Example usage in a component:
 * ```tsx
 * const { src, FallbackIcon } = getExerciseVisual(ex);
 * if (src) return <img src={src} onError={...} />;
 * return <FallbackIcon size={18} />;
 * ```
 */
export function getExerciseVisual(exercise: Exercise): {
  src: string | null;
  FallbackIcon: React.ComponentType<{ size?: number; className?: string }>;
} {
  return {
    src: getExerciseImageUrl(exercise),
    FallbackIcon: getExerciseFallbackIcon(exercise),
  };
}
