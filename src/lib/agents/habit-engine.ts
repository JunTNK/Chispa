import { HabitScore } from '@/types';
import { clamp } from '@/lib/utils/helpers';

/**
 * Habit Engine — Calcula la consistencia de entrenamiento en una ventana móvil de 30 días.
 *
 * No usa rachas tradicionales: solo porcentaje de sesiones completadas vs objetivo mensual.
 */
export function calculateConsistency(
  sessionsPast30Days: number,
  targetPerWeek: number
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
  };
}
