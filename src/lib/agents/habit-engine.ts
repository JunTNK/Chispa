import { HabitScore } from '@/types';
import { clamp } from '@/lib/utils/helpers';

/**
 * Habit Engine — Calcula la consistencia de entrenamiento en una ventana móvil de 30 días.
 *
 * No usa rachas tradicionales: solo porcentaje de sesiones completadas vs objetivo mensual.
 */
export function calculateConsistency(
  sessionsPast30Days: number,
  targetPerWeek: number,
  sessionsPast7Days?: number
): HabitScore {
  const targetPerMonth = Math.round(targetPerWeek * 4.33);
  const pct = clamp(Math.round((sessionsPast30Days / targetPerMonth) * 100), 0, 100);
  return {
    user_id: '',
    period_start: '',
    period_end: '',
    consistency_pct: pct,
    sessions_done: Math.min(sessionsPast30Days, targetPerMonth),
    sessions_target: targetPerMonth,
    momentum: sessionsPast7Days !== undefined
      ? consistencyMomentum(sessionsPast7Days, targetPerWeek)
      : undefined,
  };
}

/**
 * Inercia reciente (-1 … +1): compara las sesiones de la última semana con el
 * ritmo objetivo semanal. Positivo = vas por encima (momento a favor),
 * negativo = por debajo (señal de desenganche temprana, antes de que se
 * convierta en abandono).
 */
export function consistencyMomentum(
  sessionsPast7Days: number,
  targetPerWeek: number
): number {
  if (targetPerWeek <= 0) return 0;
  const ratio = sessionsPast7Days / targetPerWeek;
  // ratio 1 (en objetivo) → 0 · ratio 1.5+ → +1 · ratio 0.5 → -0.5 · ratio 0 → -1
  return clamp(Math.round((ratio - 1) * 2 * 10) / 10, -1, 1);
}
