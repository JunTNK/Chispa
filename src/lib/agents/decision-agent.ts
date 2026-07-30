import {
  DecisionEngineInput,
  DecisionEngineOutput,
} from '@/types';
import { clamp } from '@/lib/utils/helpers';
import { calculateRecoveryScore } from './recovery-engine';

/**
 * Decision Engine — 80% determinista.
 *
 * Decide la acción del día (train | restore), la intensidad y la duración
 * basándose en: recuperación, consistencia, patrones de abandono y progresión disponible.
 *
 * El LLM solo comunica — nunca decide.
 */
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
      (Date.now() - Date.parse(twin.created_at)) / 86400000
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
