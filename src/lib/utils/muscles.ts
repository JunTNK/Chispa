/**
 * CHISPA — Dominio muscular: UNA sola fuente de verdad.
 *
 * Antes el mismo concepto (músculo) vivía duplicado en 5 sitios:
 *   - MUSCLE_ICONS   (exercise-visuals.tsx)   → alias → fallback icon
 *   - MUSCLE_COLOR   (exercise-selector.tsx)  → color de marca
 *   - MUSCLE_FILTERS (create-workout-screen.tsx) → foco → músculos
 *   - MUSCLE_GROUPS + MUSCLE_LABEL_EN (exercise-catalog-screen.tsx)
 *   - MUSCLE_ICON    (quick-log-screen.tsx)
 *
 * Cada definición podía divergir (¿`lower` o `piernas`? ¿dónde vive
 * `gluteos`?). Este módulo es el registro canónico: los 8 músculos que usa el
 * catálogo (exercises.json → `Exercise.muscle`) con etiqueta ES/EN, color de
 * marca, abreviatura, icono del pack fitness y aliases ES/EN de
 * free-exercise-db. Todo lo demás deriva de aquí.
 */

import type { FitnessIconName } from '@/lib/utils/fitness-icons';

export interface MuscleMeta {
  /** Etiqueta en español (canónica, la que usa la UI). */
  label: string;
  /** Etiqueta en inglés (filters EN / catálogo). */
  labelEn: string;
  /** Color de marca: badges, MuscleMark, chips. */
  color: string;
  /** Abreviatura de 3 letras para la marca tipográfica (MuscleMark). */
  mark: string;
  /** Icono del pack fitness asociado (FitnessIcon name). */
  fitnessIcon: FitnessIconName;
}

export const MUSCLES = {
  piernas: { label: 'Piernas', labelEn: 'Legs', color: '#34d399', mark: 'PIE', fitnessIcon: 'lower-body' },
  gluteos: { label: 'Glúteos', labelEn: 'Glutes', color: '#34d399', mark: 'GLU', fitnessIcon: 'lower-body' },
  pecho: { label: 'Pecho', labelEn: 'Chest', color: '#4CC9F0', mark: 'PEC', fitnessIcon: 'bench-press' },
  espalda: { label: 'Espalda', labelEn: 'Back', color: '#a78bfa', mark: 'ESP', fitnessIcon: 'upper-body' },
  hombros: { label: 'Hombros', labelEn: 'Shoulders', color: '#ffb454', mark: 'HOM', fitnessIcon: 'upper-body' },
  brazos: { label: 'Brazos', labelEn: 'Arms', color: '#f472b6', mark: 'BRA', fitnessIcon: 'biceps' },
  core: { label: 'Core', labelEn: 'Core', color: '#fbbf24', mark: 'COR', fitnessIcon: 'core' },
  cardio: { label: 'Cardio', labelEn: 'Cardio', color: '#f87171', mark: 'CAR', fitnessIcon: 'running' },
} as const satisfies Record<string, MuscleMeta>;

export type MuscleKey = keyof typeof MUSCLES;

export const MUSCLE_KEYS = Object.keys(MUSCLES) as MuscleKey[];

/** Aliases ES/EN → músculo canónico (cubre `Exercise.muscle` y `primaryMuscles`). */
export const MUSCLE_ALIASES: Record<string, MuscleKey> = {
  // ES canónicos
  piernas: 'piernas',
  gluteos: 'gluteos',
  pecho: 'pecho',
  espalda: 'espalda',
  hombros: 'hombros',
  brazos: 'brazos',
  core: 'core',
  cardio: 'cardio',
  // EN / free-exercise-db primaryMuscles
  quadriceps: 'piernas',
  'quadriceps femoris': 'piernas',
  isquiotibiales: 'piernas',
  hamstrings: 'piernas',
  gemelos: 'piernas',
  calves: 'piernas',
  glutes: 'gluteos',
  pectoral: 'pecho',
  pectorals: 'pecho',
  chest: 'pecho',
  back: 'espalda',
  dorsales: 'espalda',
  shoulders: 'hombros',
  deltoids: 'hombros',
  bíceps: 'brazos',
  biceps: 'brazos',
  tríceps: 'brazos',
  triceps: 'brazos',
  forearms: 'brazos',
  antebrazos: 'brazos',
  abdominales: 'core',
  abdominals: 'core',
  oblicuos: 'core',
  obliques: 'core',
};

/** Normaliza cualquier nombre de músculo (ES/EN, case-insensitive) a la key canónica. */
export function normalizeMuscle(muscle: string): MuscleKey | null {
  return MUSCLE_ALIASES[muscle.toLowerCase().trim()] ?? null;
}

/** Color de marca de un músculo; gris neutro si es desconocido. */
export function muscleColor(muscle: string): string {
  const key = normalizeMuscle(muscle);
  return key ? MUSCLES[key].color : '#94a0b8';
}

/** Abreviatura de marca; inicial si el músculo no está registrado. */
export function muscleMark(muscle: string): string {
  const key = normalizeMuscle(muscle);
  return key ? MUSCLES[key].mark : (muscle.charAt(0) || '?').toUpperCase();
}

/** Etiqueta ES canónica (o el propio string si no está registrado). */
export function muscleLabel(muscle: string): string {
  const key = normalizeMuscle(muscle);
  return key ? MUSCLES[key].label : muscle;
}

/** Etiquetas EN por key (para filtros del catálogo y modo inglés). */
export const MUSCLE_LABEL_EN: Record<MuscleKey, string> = Object.fromEntries(
  MUSCLE_KEYS.map((k) => [k, MUSCLES[k].labelEn]),
) as Record<MuscleKey, string>;

/** Foco de entrenamiento → músculos que lo componen (ex MUSCLE_FILTERS). */
export const FOCUS_MUSCLES: Record<'full' | 'upper' | 'lower' | 'core', MuscleKey[]> = {
  full: ['piernas', 'gluteos', 'pecho', 'espalda', 'hombros', 'brazos', 'core', 'cardio'],
  upper: ['pecho', 'espalda', 'hombros', 'brazos'],
  lower: ['piernas', 'gluteos'],
  core: ['core', 'cardio'],
};

/** Icono fitness de un músculo (null-safe para músculos desconocidos). */
export function muscleFitnessIcon(muscle: string): FitnessIconName {
  const key = normalizeMuscle(muscle);
  return key ? MUSCLES[key].fitnessIcon : 'dumbbell';
}
