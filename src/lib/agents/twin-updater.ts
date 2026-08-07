import { DigitalTwin } from '@/types';
import { ema, todayKey } from '@/lib/utils/helpers';

/** Mapeo de RPE cualitativo (suave/justo/duro) a escala numérica 1–10. */
const RPE_SCALE: Record<string, number> = { suave: 2, justo: 5, duro: 8 };

/**
 * Digital Twin Updater — Actualiza el gemelo digital después de cada entrenamiento.
 *
 * Usa EMA (Exponential Moving Average) para:
 * - Tasa de finalización
 * - Duración promedio
 * - Tasa de abandono
 *
 * También registra la mejor franja horaria, la progresión por ejercicio y
 * — nuevo — el contador de sesiones "hard" (RPE ≥ 7) y la última fecha por
 * ejercicio, que alimentan la afinidad entrenada del Selector y el Coach.
 *
 * ⚠️ Los pesos EMA están fijados por full-flow.test.tsx — no tocarlos.
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
        const prev = updated.ex_progress[ex.exercise_id] || { easy: 0 };
        // Copia nueva: ex_progress es un spread superficial y mutar prev
        // corrompería el twin original.
        const current = { ...prev };
        const isEasy = workout.rpe === 'suave' || (ex.rpe !== undefined && ex.rpe <= 2);
        if (isEasy) {
          current.easy = (current.easy ?? 0) + 1;
        }
        // RPE percibido por ejercicio: alimenta la afinidad entrenada (capa 01)
        const rpe = typeof ex.rpe === 'number' ? ex.rpe : RPE_SCALE[workout.rpe ?? ''];
        if (rpe !== undefined) {
          current.last_rpe = rpe;
          // Sesión percibida como muy dura → contador hard (afinidad negativa)
          if (rpe >= 7) {
            current.hard = (current.hard ?? 0) + 1;
          }
        }
        current.total = (current.total ?? 0) + 1;
        current.last_date = todayKey();
        updated.ex_progress[ex.exercise_id] = current;
      }
    }
  }

  return updated;
}
