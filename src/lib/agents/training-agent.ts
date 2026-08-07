import { DecisionEngineOutput, DigitalTwin, Exercise } from '@/types';
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

/** Orden de carga cognitiva: low primero (gancho) para neurodivergencia. */
const COG_LOAD_ORDER: Record<string, number> = { low: 0, med: 1, high: 2 };

/**
 * Training Agent — Genera una rutina de ejercicios completa.
 *
 * - Rotación muscular automática (full → upper → lower → core)
 * - Tablas de series/repeticiones según intensidad
 * - Soporte para 3 niveles de equipo
 * - Progresión automática (+2 reps en ejercicios dominados)
 * - Prioridad a ejercicios que el usuario ya domina (afinidad por maestría)
 * - Variedad: evita repetir los ejercicios de la última sesión
 * - Orden por carga cognitiva (low primero = arranque fácil, ADHD-friendly)
 * - Ajuste de reps por objetivo (grasa → más volumen)
 */
export class TrainingAgent {
  static generate(
    decision: DecisionEngineOutput,
    twin: DigitalTwin,
    equipment: string,
    lastFocusOverride?: string,
    clientLastFocus?: string,
    opts?: { recentExerciseIds?: string[]; goal?: string }
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
    const picked = this._pickExercises(
      count,
      decision.intensity,
      focus,
      equipment,
      twin,
      opts?.recentExerciseIds
    );

    // Meta de grasa → +2 reps (más volumen). No aplica a minimal (fijado por tests).
    const goalRepsBonus = opts?.goal === 'grasa' && decision.intensity !== 'minimal' ? 2 : 0;

    const exercises = picked.map((ex) => {
      const isTime = ex.load_type === 'time';
      const progressed = !isTime && this._shouldProgress(ex.id, twin);
      const difficultyBump =
        decision.intensity !== 'minimal' && ex.difficulty === 3 ? 10 : 0;
      return {
        exercise_id: ex.id,
        name: ex.name,
        muscle: ex.muscle,
        sets,
        reps: isTime
          ? parseDuration(ex.instructions)
          : progressed
            ? reps + 2 + goalRepsBonus
            : reps + goalRepsBonus,
        rest: rest + difficultyBump,
        completed_sets: 0,
        completed_reps: [],
        status: 'pending' as const,
        progressed,
        load_type: ex.load_type,
      };
    });

    // Arranque fácil: ejercicios de carga cognitiva baja primero.
    exercises.sort(
      (a, b) => this._cogLoadOf(a.exercise_id) - this._cogLoadOf(b.exercise_id)
    );

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

  /** El usuario domina un ejercicio: easy ≥ 2 y sin RPE alto reciente. */
  private static _shouldProgress(exId: string, twin: DigitalTwin): boolean {
    const p = twin.ex_progress[exId];
    if (!p) return false;
    return (p.easy ?? 0) >= 2 && (p.last_rpe === undefined || p.last_rpe <= 3);
  }

  private static _cogLoadOf(exId: string): number {
    const ex = EXERCISE_CATALOG.find((e) => e.id === exId);
    return COG_LOAD_ORDER[ex?.cognitive_load ?? 'med'] ?? 1;
  }

  private static _pickExercises(
    count: number,
    intensity: string,
    focus: string,
    equipment: string,
    twin: DigitalTwin,
    recentExerciseIds?: string[]
  ) {
    const recent = new Set(recentExerciseIds ?? []);
    const pool = EXERCISE_CATALOG.filter(
      (e) => matchesEquipment(equipment, e.equipment) &&
        (intensity === 'push' || e.cognitive_load !== 'high') &&
        !twin.avoid?.includes(e.id)
    );

    const muscles = FOCUS_MUSCLES[focus] || FOCUS_MUSCLES.full;
    const queues = muscles.map((m) =>
      this._shuffle(pool.filter((e) => e.muscle === m))
    );

    // Score de afinidad por maestría + variedad (no repetir la última sesión).
    const scoreCandidate = (e: Exercise) => {
      const p = twin.ex_progress[e.id];
      let score = 0;
      if (p) {
        if ((p.easy ?? 0) >= 2) score += 3;         // lo domina → alto
        else if ((p.easy ?? 0) >= 1) score += 1.5;  // familiar
        if ((p.last_rpe ?? 0) >= 7) score -= 2;     // le costó → bajar prioridad
      }
      if (recent.has(e.id)) score -= 3;              // variedad / novedad
      return score;
    };

    // Grupos por músculo (deduplicados: FOCUS_MUSCLES repite entradas),
    // cada uno ordenado por afinidad (maestría) + variedad.
    const groups = [...new Map(queues.map((q) => [q[0]?.muscle, q])).values()]
      .map((q) => [...q].sort((a, b) => scoreCandidate(b) - scoreCandidate(a)))
      .filter((g) => g.length > 0);

    // Selección round-robin por músculo: el mejor de cada grupo por turno,
    // máx. 2 por grupo → garantiza variedad muscular y el conteo exacto.
    const chosen: Exercise[] = [];
    const perGroup: number[] = groups.map(() => 0);
    let guard = 0;
    while (chosen.length < count && guard++ < 1000) {
      let added = false;
      for (let gi = 0; gi < groups.length; gi++) {
        if (chosen.length >= count) break;
        const g = groups[gi];
        if (perGroup[gi] >= 2 || g.length === 0) continue; // máx. 2 por músculo
        chosen.push(g.shift()!);
        perGroup[gi]++;
        added = true;
      }
      if (!added) break;
    }

    // Fallback: si los grupos de foco no cubren el conteo (pools pequeños o
    // pocos músculos distintos tras el cap de 2 por músculo), rellenar desde
    // el pool del FOCUS (nunca de músculos ajenos al foco), respetando
    // variedad (máx. 2 por músculo).
    if (chosen.length < count) {
      const allowed = new Set(
        [...new Map(queues.map((q) => [q[0]?.muscle, q])).values()].map((q) => q[0]!.muscle)
      );
      const focusPool = pool.filter((e) => allowed.has(e.muscle));
      const counts: Record<string, number> = {};
      for (const c of chosen) counts[c.muscle] = (counts[c.muscle] ?? 0) + 1;
      for (const e of this._shuffle(focusPool)) {
        if (chosen.some((c) => c.id === e.id)) continue;
        if ((counts[e.muscle] ?? 0) >= 2) continue;
        chosen.push(e);
        counts[e.muscle] = (counts[e.muscle] ?? 0) + 1;
        if (chosen.length >= count) break;
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
