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
import { MUSCLE_ALIASES, type MuscleKey } from '@/lib/utils/muscles';
import type { Exercise } from '@/types';

// ═══════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════

/** Base URL — local public folder since we vendored free-exercise-db locally */
const IMAGE_BASE_URL = '/exercises/';

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

/** Músculo canónico → fallback (derivado del registry, una sola fuente de verdad). */
const FALLBACK_BY_MUSCLE: Record<MuscleKey, React.ComponentType<{ size?: number; className?: string }>> = {
  piernas: LegsFallback,
  gluteos: GlutesFallback,
  pecho: ChestFallback,
  espalda: BackFallback,
  hombros: ShouldersFallback,
  brazos: ArmsFallback,
  core: CoreFallback,
  cardio: CardioFallback,
};

/**
 * Mapping: alias de músculo (ES/EN, case-insensitive) → fallback icon.
 * Se deriva de MUSCLE_ALIASES (muscles.ts) — si se añade un alias ahí,
 * este mapa lo recoge automáticamente.
 */
const MUSCLE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> =
  Object.fromEntries(
    Object.entries(MUSCLE_ALIASES).map(([alias, key]) => [alias, FALLBACK_BY_MUSCLE[key]]),
  );

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
 * Resolve local GIF and static-JPG URLs for an exercise.
 * The free-exercise-db repo stores animations as `animation.gif` and
 * static previews as `0.jpg` in each exercise folder.
 *
 * Returns `null` if no image data is available.
 */
export function getExerciseMediaUrls(exercise: Exercise): { gifUrl: string; staticUrl: string } | null {
  if (!exercise.images || exercise.images.length === 0) return null;

  // images[0] format: "exercise_name/0.jpg" or "0.jpg" (flat)
  const imgPath = exercise.images[0];
  const slashIndex = imgPath.lastIndexOf('/');

  // Flat path (no folder) — images sit at the base URL directly
  if (slashIndex <= 0) {
    return {
      gifUrl: `${IMAGE_BASE_URL}animation.gif`,
      staticUrl: `${IMAGE_BASE_URL}${imgPath}`,
    };
  }

  const exName = imgPath.slice(0, slashIndex);

  return {
    gifUrl: `${IMAGE_BASE_URL}${exName}/animation.gif`,
    staticUrl: `${IMAGE_BASE_URL}${exName}/0.jpg`,
  };
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
 * const { src, fallbackIcon: FallbackIcon } = getExerciseVisual(ex);
 * if (src) return <img src={src} onError={...} />;
 * return <FallbackIcon size={18} />;
 * ```
 */
export function getExerciseVisual(exercise: Exercise): {
  src: string | null;
  fallbackIcon: React.ComponentType<{ size?: number; className?: string }>;
} {
  return {
    src: getExerciseImageUrl(exercise),
    fallbackIcon: getExerciseFallbackIcon(exercise),
  };
}

/**
 * ExerciseImage — shared <img> with icon fallback.
 *
 * Fills its parent container (w-full h-full). When there is no image or it
 * fails to load, renders the fallback icon instead — never a broken-image
 * flash (important for predictability). Reset its internal error state
 * whenever `src` changes so reusing the component across exercises works.
 *
 * Wrap it in a fixed-size, overflow-hidden container:
 * ```tsx
 * <div className="w-10 h-10 rounded-xl overflow-hidden">
 *   <ExerciseImage src={visual.src} fallbackIcon={visual.fallbackIcon} />
 * </div>
 * ```
 */
export const ExerciseImage = React.memo(function ExerciseImage({
  src,
  fallbackIcon: FallbackIcon,
  alt = '',
  size = 22,
  className = '',
  imgClassName = '',
}: {
  src: string | null;
  fallbackIcon: React.ComponentType<{ size?: number; className?: string }>;
  alt?: string;
  size?: number;
  className?: string;
  imgClassName?: string;
}) {
  const [error, setError] = React.useState(false);

  // Reset error state when the exercise image changes
  React.useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <FallbackIcon size={size} className="text-[var(--muted)]" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`w-full h-full object-cover ${imgClassName}`}
      onError={() => setError(true)}
    />
  );
});

/**
 * ExerciseMedia — static preview (0.jpg) with icon fallback.
 *
 * The vendored free-exercise-db assets only contain static JPG previews
 * (no `animation.gif`, see scripts/download-exercises.sh). We always render
 * the static image, which also satisfies reduceMotion users — no motion, no
 * broken-image flash. On an actual network/404 error we fall back to a
 * generic Dumbbell icon.
 *
 * @example
 * <div className="w-16 h-16 rounded-xl overflow-hidden">
 *   <ExerciseMedia
 *     gifUrl="/exercises/Ab_Crunch/animation.gif"
 *     staticUrl="/exercises/Ab_Crunch/0.jpg"
 *     alt="Abdominal Crunch"
 *   />
 * </div>
 */
export const ExerciseMedia = React.memo(function ExerciseMedia({
  staticUrl,
  alt,
  className = '',
  priority = false,
}: {
  gifUrl: string;
  staticUrl: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [error, setError] = React.useState(false);

  // Reset error state when the image URL changes
  React.useEffect(() => {
    setError(false);
  }, [staticUrl]);

  if (error) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-[var(--card-bg)] ${className}`}>
        <Dumbbell size={20} className="text-[var(--muted)]" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={staticUrl}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      className={`w-full h-full object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
});
