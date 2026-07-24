import {
  DecisionEngineInput,
  DecisionEngineOutput,
  CheckIn,
  HabitScore,
  DigitalTwin,
} from '@/types';
import { clamp, ema } from '@/lib/utils/helpers';
import { EXERCISE_CATALOG } from '@/lib/utils/exercises';
import { FOCUS_MUSCLES } from '@/lib/utils/constants';

/* === RECOVERY ENGINE === */

export function calculateRecoveryScore(
  checkin: CheckIn
): { score: number; sleep_contribution: number; energy_contribution: number; stress_contribution: number } {
  const sleep = clamp((checkin.sleep - 4) / 4.5, 0, 1) * 100;
  const energy = checkin.energy * 10;
  const stress = (10 - checkin.stress) * 10;
  return {
    sleep_contribution: Math.round(sleep * 0.4),
    energy_contribution: Math.round(energy * 0.3),
    stress_contribution: Math.round(stress * 0.3),
    score: Math.round(sleep * 0.4 + energy * 0.3 + stress * 0.3),
  };
}

/* === HABIT ENGINE === */

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

/* === DECISION ENGINE (80% determinista) === */

export class DecisionEngine {
  static decide(input: DecisionEngineInput): DecisionEngineOutput {
    const { checkin, consistency, twin, profile } = input;
    const rec = checkin ? calculateRecoveryScore(checkin) : null;
    const recScore = rec?.score ?? null;
    const reasons: string[] = [];
    let intensity: DecisionEngineOutput['intensity'] = 'standard';
    let action: DecisionEngineOutput['action'] = 'train';
    let duration = profile.preferred_duration;

    if (recScore === null) {
      reasons.push('Sin check-in hoy: asumimos estado neutro');
    } else if (recScore < 35) {
      intensity = 'minimal';
      action = 'restore';
      reasons.push(`Recuperación ${recScore}/100: el cuerpo pide suavidad`);
    } else if (recScore < 55) {
      intensity = 'light';
      reasons.push(`Recuperación ${recScore}/100: sesión ligera`);
    } else if (recScore >= 75 && consistency.consistency_pct >= 60) {
      intensity = 'push';
      reasons.push(`Recuperación ${recScore}/100 + consistencia ${consistency.consistency_pct}%: día para progresar`);
    } else {
      reasons.push(`Recuperación ${recScore}/100: sesión estándar`);
    }

    const ready = Object.values(twin.ex_progress).some((p) => (p.easy ?? 0) >= 2);
    if (ready && intensity !== 'minimal') {
      reasons.push('Progresión lista: +2 reps en ejercicios dominados');
    }

    if (twin.patterns.abandon_rate > 0.35 && duration > 15) {
      duration = 15;
      reasons.push('Sesión acortada a 15 min (patrón de abandono detectado)');
    }
    if (intensity === 'minimal') duration = Math.min(duration, 12);
    if (intensity === 'push') duration = Math.min(duration + 5, 40);

    const ageDays = Math.floor(
      (Date.now() - new Date(twin.created_at).getTime()) / 86400000
    );
    const confidence = Math.round(
      clamp(42 + (input.last_workout ? 14 : 0) + Math.min(ageDays, 10), 42, 94)
    );

    return {
      action,
      intensity,
      duration,
      reasons,
      confidence,
      recovery_score: recScore ?? undefined,
      consistency,
    };
  }
}

/* === TRAINING AGENT === */

/** Parse duration from exercise instructions (e.g. "30 segundos" → 30, "3 minutos" → 180) */
function parseDuration(instructions: string): number {
  const match = instructions.match(/(\d+)\s*(seg|s|min|m)/i);
  if (!match) return 30; // default
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  // If there's a second number in a range like "3-5 min", prefer the larger
  const rangeMatch = instructions.match(/-(\d+)\s*(seg|s|min|m)/i);
  const finalValue = rangeMatch ? Math.max(value, parseInt(rangeMatch[1], 10)) : value;
  return unit === 'min' || unit === 'm' ? finalValue * 60 : finalValue;
}

export class TrainingAgent {
  static generate(decision: DecisionEngineOutput, twin: DigitalTwin, equipment: string, lastFocus?: string) {
    const countMap: Record<string, number> = { minimal: 3, light: 4, standard: 5, push: 6 };
    const setsMap: Record<string, number> = { minimal: 2, light: 2, standard: 3, push: 4 };
    const repsMap: Record<string, number> = { minimal: 8, light: 10, standard: 12, push: 12 };
    const restMap: Record<string, number> = { minimal: 30, light: 40, standard: 50, push: 60 };

    const count = countMap[decision.intensity];
    const sets = setsMap[decision.intensity];
    const reps = repsMap[decision.intensity];
    const rest = restMap[decision.intensity];

    const focus = this._pickFocus(twin, lastFocus);
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
      };
    });

    const titleMap: Record<string, string> = {
      minimal: 'Movimiento suave',
      light: 'Sesión ligera',
      standard: 'Tu entrenamiento está listo',
      push: 'Día para progresar',
    };

    return {
      focus,
      intensity: decision.intensity,
      duration: decision.duration,
      exercises,
      title: titleMap[decision.intensity],
      sets,
      rest,
    };
  }

  private static _pickFocus(twin: DigitalTwin, lastFocusOverride?: string): 'full' | 'upper' | 'lower' | 'core' {
    const seq: ('full' | 'upper' | 'lower' | 'core')[] = ['full', 'upper', 'lower', 'core'];
    let last: string | null = lastFocusOverride ?? null;
    if (last === null && typeof localStorage !== 'undefined') {
      last = localStorage.getItem('chispa_last_focus');
    }
    const idx = last ? seq.indexOf(last as typeof seq[number]) : -1;
    const next = seq[(idx + 1) % 4];
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('chispa_last_focus', next);
    }
    return next;
  }

  private static _shouldProgress(exId: string, twin: DigitalTwin): boolean {
    const p = twin.ex_progress[exId];
    return p !== undefined && (p.easy ?? 0) >= 2;
  }

  private static _pickExercises(count: number, intensity: string, focus: string, equipment: string) {
    const eqList: string[] = equipment === 'ninguno' ? ['ninguno'] :
      equipment === 'mancuernas' ? ['ninguno', 'mancuernas'] :
        ['ninguno', 'mancuernas', 'gimnasio'];

    const loadCap = intensity === 'push' ? 2 : 1;
    const pool = EXERCISE_CATALOG.filter(
      (e) => eqList.includes(e.equipment) &&
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

/* === MOTIVATION ENGINE === */

export class MotivationEngine {
  static message(
    style: 'data' | 'energy' | 'direct' | 'calm',
    recovery: number,
    consistencyPct: number,
    duration: number
  ): string {
    const good = recovery >= 70;
    switch (style) {
      case 'data':
        return `Recuperación ${recovery}/100 · Consistencia ${consistencyPct}%. ${good ? 'Condiciones óptimas' : 'Condiciones gestionables'}: ${duration} min de sesión.`;
      case 'energy':
        return good
          ? `¡Hoy estás al ${recovery}%! ${duration} minutos y a encender la chispa ⚡`
          : `Un ${recovery}% basta para empezar. La chispa se enciende con el movimiento 🔥`;
      case 'direct':
        return `${recovery}/100. ${duration} minutos. Empieza.`;
      case 'calm':
        return `Tu cuerpo está al ${recovery}%. Sin prisa: ${duration} minutos a tu ritmo.`;
    }
  }

  static restMessage(style: string): string {
    switch (style) {
      case 'data':
        return 'Recuperación por debajo de 35. Los datos dicen: descanso activo hoy.';
      case 'energy':
        return 'Hoy la chispa se recarga descansando. Mañana vuelves con todo 🔋';
      case 'direct':
        return 'Recuperación baja. Hoy: moverse suave. Nada más.';
      case 'calm':
        return 'Tu cuerpo pide calma. Escucharlo también es entrenar.';
      default:
        return 'Hoy toca descanso activo. Mañana volvemos más fuertes.';
    }
  }
}

/* === DIGITAL TWIN UPDATER === */

export function updateTwin(twin: DigitalTwin, workout: any): DigitalTwin {
  const rpeN: Record<string, number> = { suave: 5, justo: 7, duro: 9 };
  const rpe = rpeN[workout.rpe] || 7;

  const updated = { ...twin, patterns: { ...twin.patterns } };
  updated.patterns.completion_rate = ema(updated.patterns.completion_rate, workout.completed_rate, 0.35);
  updated.patterns.avg_duration = ema(updated.patterns.avg_duration, Math.max(workout.actual_minutes, 5), 0.3);
  updated.patterns.abandon_rate = ema(updated.patterns.abandon_rate, workout.completed_rate < 0.5 ? 1 : 0, 0.3);

  const hour = new Date().getHours();
  updated.patterns.best_hours = {
    ...updated.patterns.best_hours,
    [hour]: (updated.patterns.best_hours[hour] || 0) + 1,
  };

  return updated;
}
