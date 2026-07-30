import { DecisionEngineOutput, DigitalTwin } from '@/types';
import { EXERCISE_CATALOG } from '@/lib/utils/exercises';
import { matchesEquipment } from '@/lib/utils/helpers';
import { FOCUS_MUSCLES, TITLES } from '@/lib/utils/constants';

/**
 * Parse duration from exercise instructions (e.g. "30 segundos" → 30, "3 minutos" → 180)
 */
function parseDuration(instructions: string): number {
  const match = instructions.match(/(\d+)\s*(seg|segundo|s|min|m)/i);
  if (!match) return 30; // default
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  // If there's a second number in a range like "3-5 min", prefer the larger
  const rangeMatch = instructions.match(/-(\d+)\s*(seg|segundo|s|min|m)/i);
  const finalValue = rangeMatch ? Math.max(value, parseInt(rangeMatch[1], 10)) : value;
  return unit.startsWith('min') || unit === 'm' ? finalValue * 60 : finalValue;
}

/**
 * Training Agent — Genera una rutina de ejercicios completa.
 *
 * - Rotación muscular automática (full → upper → lower → core)
 * - Tablas de series/repeticiones según intensidad
 * - Soporte para 3 niveles de equipo
 * - Progresión automática (+2 reps en ejercicios dominados)
 */
export class TrainingAgent {
  static generate(
    decision: DecisionEngineOutput,
    twin: DigitalTwin,
    equipment: string,
    lastFocusOverride?: string,
    clientLastFocus?: string
  ) {
    const countMap: Record<string, number> = { minimal: 3, light: 4, standard: 5, push: 6 };
    const setsMap: Record<string, number> = { minimal: 2, light: 2, standard: 3, push: 4 };
    const repsMap: Record<string, number> = { minimal: 8, light: 10, standard: 12, push: 12 };
    const restMap: Record<string, number> = { minimal: 30, light: 40, standard: 50, push: 60 };

    const count = countMap[decision.intensity];
    const sets = setsMap[decision.intensity];
    const reps = repsMap[decision.intensity];
    const rest = restMap[decision.intensity];

    const focus = this._pickFocus(twin, lastFocusOverride, clientLastFocus);
    const picked = this._pickExercises(count, decision.intensity, focus, equipment);
    const exercises = picked.map((ex) => {
      const isTime = ex.load_type === 'time';
      const progressed = !isTime && this._shouldProgress(ex.id, twin);
      return {
        exercise_id: ex.id,
        name: ex.name,
        muscle: ex.muscle,
        sets,
        reps: isTime ? parseDuration(ex.instructions) : progressed ? reps + 2 : reps,
        rest,
        completed_sets: 0,
        completed_reps: [],
        status: 'pending' as const,
        progressed,
        load_type: ex.load_type,
      };
    });

    return {
      focus,
      intensity: decision.intensity,
      duration: decision.duration,
      exercises,
      title: TITLES[decision.intensity],
      sets,
      rest,
    };
  }

  private static _pickFocus(
    twin: DigitalTwin,
    lastFocusOverride?: string,
    clientLastFocus?: string
  ): 'full' | 'upper' | 'lower' | 'core' {
    const seq: ('full' | 'upper' | 'lower' | 'core')[] = ['full', 'upper', 'lower', 'core'];
    let last: string | null = lastFocusOverride ?? clientLastFocus ?? null;
    if (last === null && typeof window !== 'undefined') {
      last = localStorage.getItem('chispa_last_focus');
    }
    const idx = last ? seq.indexOf(last as typeof seq[number]) : -1;
    const next = seq[(idx + 1) % 4];
    if (typeof window !== 'undefined') {
      localStorage.setItem('chispa_last_focus', next);
    }
    return next;
  }

  private static _shouldProgress(exId: string, twin: DigitalTwin): boolean {
    const p = twin.ex_progress[exId];
    return p !== undefined && (p.easy ?? 0) >= 2;
  }

  private static _pickExercises(count: number, intensity: string, focus: string, equipment: string) {
    const pool = EXERCISE_CATALOG.filter(
      (e) => matchesEquipment(equipment, e.equipment) &&
        (intensity === 'push' || (e.cognitive_load !== 'high'))
    );

    const muscles = FOCUS_MUSCLES[focus] || FOCUS_MUSCLES.full;
    const queues = muscles.map((m) => this._shuffle(pool.filter((e) => e.muscle === m)));
    const chosen: typeof pool = [];
    const used = new Set<string>();
    let guard = 0;

    while (chosen.length < count && guard++ < 200) {
      let added = false;
      for (const q of queues) {
        if (q.length && chosen.length < count) {
          const ex = q.shift()!;
          if (!used.has(ex.id)) {
            chosen.push(ex);
            used.add(ex.id);
            added = true;
          }
        }
      }
      if (!added) break;
    }

    if (chosen.length < count) {
      for (const e of this._shuffle(pool)) {
        if (!used.has(e.id)) {
          chosen.push(e);
          used.add(e.id);
          if (chosen.length >= count) break;
        }
      }
    }

    return chosen;
  }

  private static _shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
