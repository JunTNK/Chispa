import { DigitalTwin } from '@/types';
import { ema } from '@/lib/utils/helpers';

/**
 * Digital Twin Updater — Actualiza el gemelo digital después de cada entrenamiento.
 *
 * Usa EMA (Exponential Moving Average) para:
 * - Tasa de finalización
 * - Duración promedio
 * - Tasa de abandono
 *
 * También registra la mejor franja horaria y la progresión por ejercicio.
 */
export function updateTwin(
  twin: DigitalTwin,
  workout: { completed_rate: number; actual_minutes: number; exercises?: any[]; rpe?: string }
): DigitalTwin {
  const updated = { ...twin, patterns: { ...twin.patterns }, ex_progress: { ...twin.ex_progress } };

  updated.patterns.completion_rate = ema(updated.patterns.completion_rate, workout.completed_rate, 0.35);
  updated.patterns.avg_duration = ema(updated.patterns.avg_duration, Math.max(workout.actual_minutes, 5), 0.3);
  updated.patterns.abandon_rate = ema(updated.patterns.abandon_rate, workout.completed_rate < 0.5 ? 1 : 0, 0.3);

  const hour = new Date().getHours();
  updated.patterns.best_hours = {
    ...updated.patterns.best_hours,
    [hour]: (updated.patterns.best_hours[hour] || 0) + 1,
  };

  if (workout.exercises) {
    for (const ex of workout.exercises) {
      if (ex.status === 'done' && ex.exercise_id) {
        const current = updated.ex_progress[ex.exercise_id] || { easy: 0 };
        const isEasy = workout.rpe === 'suave' || (ex.rpe !== undefined && ex.rpe <= 2);
        if (isEasy) {
          current.easy = (current.easy ?? 0) + 1;
        }
        updated.ex_progress[ex.exercise_id] = current;
      }
    }
  }

  return updated;
}
