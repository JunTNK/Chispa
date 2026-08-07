import {
  DecisionEngineInput,
  DecisionEngineOutput,
} from '@/types';
import { clamp, daysBetween } from '@/lib/utils/helpers';
import { calculateRecoveryScore, recoveryInsights } from './recovery-engine';

/**
 * Decision Engine — 80% determinista.
 *
 * Decide la acción del día (train | restore), la intensidad y la duración
 * basándose en: recuperación, consistencia, patrones de abandono, progresión
 * disponible, fatiga del último entrenamiento y tiempo desde la última sesión.
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

    const last = input.last_workout;
    const daysSinceLast = last ? Math.max(0, daysBetween(last.date)) : null;

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

    // ── Inteligencia contextual ──────────────────────────────────────────

    // 1 · Fatiga post-entreno: si hoy o ayer hubo estímulo fuerte y el usuario
    // lo completó, hoy bajamos un cambio para asimilar (evita sobreentrenar).
    if (
      last &&
      daysSinceLast !== null &&
      daysSinceLast <= 1 &&
      (last.intensity === 'push' || last.intensity === 'standard') &&
      (last.completed_rate ?? 0) >= 0.7 &&
      intensity === 'push'
    ) {
      intensity = 'standard';
      reasons.push('Ayer hubo estímulo fuerte: hoy bajamos a estándar para asimilar');
    } else if (
      last &&
      daysSinceLast !== null &&
      daysSinceLast <= 1 &&
      (last.intensity === 'push' || last.intensity === 'standard') &&
      intensity === 'standard'
    ) {
      intensity = 'light';
      reasons.push('Fatiga de ayer: hoy tocamos ligero y dejamos asimilar');
    }

    // 2 · Reentrada tras pausa: si no entrena hace 4+ días, no lanzamos push
    // el primer día de vuelta (reaclimatación gradual).
    if (daysSinceLast !== null && daysSinceLast >= 4 && intensity === 'push') {
      intensity = 'standard';
      reasons.push('Vuelta tras una pausa: hoy reaclimatación, no récord');
    }

    // 3 · Reenganche por consistencia: si la constancia es baja pero la
    // recuperación es buena, evitamos exigir demasiado — el hábito primero.
    if (
      recScore !== null &&
      recScore >= 55 &&
      consistency.consistency_pct < 35 &&
      (intensity === 'standard' || intensity === 'push')
    ) {
      intensity = 'light';
      reasons.push(`Consistencia ${consistency.consistency_pct}%: hoy reconectamos con el hábito, sin exigir`);
    }

    // 4 · Razones ricas: el factor más débil del check-in informa el porqué.
    if (rec && recScore !== null && recScore < 70) {
      const insight = recoveryInsights(checkin!);
      if (insight.weakest === 'sleep') {
        reasons.push(`Hoy pesa el ${insight.sleepLabel}: priorizamos descanso dentro del plan`);
      } else if (insight.weakest === 'stress') {
        reasons.push(`Hoy pesa el ${insight.stressLabel}: sesión para soltar, no para exigir`);
      } else if (insight.weakest === 'energy') {
        reasons.push(`Hoy pesa la ${insight.energyLabel}: ajustamos carga a tu energía real`);
      }
    }

    // 5 · Momentum del hábito: la inercia reciente refuerza (o matiza) el plan.
    if (consistency.momentum !== undefined && consistency.momentum >= 0.5) {
      reasons.push('Inercia semanal positiva: el hábito ya empuja solo');
    } else if (consistency.momentum !== undefined && consistency.momentum <= -0.5 && intensity === 'push') {
      intensity = 'standard';
      reasons.push('Última semana floja: hoy construimos base, no pico');
    }

    // 6 · Progresión lista (solo si la intensidad lo permite).
    const ready = Object.values(twin.ex_progress).some((p) => (p.easy ?? 0) >= 2);
    if (ready && intensity !== 'minimal') {
      reasons.push('Progresión lista: +2 reps en ejercicios dominados');
    }

    // ── Duración ─────────────────────────────────────────────────────────
    if (twin.patterns.abandon_rate > 0.35 && duration > 15) {
      duration = 15;
      reasons.push('Sesión acortada a 15 min (patrón de abandono detectado)');
    }
    if (intensity === 'minimal') duration = Math.min(duration, 12);
    if (intensity === 'push') duration = Math.min(duration + 5, 40);

    // Meta de grasa: volumen un poco mayor para quemar; meta de fuerza: dosis
    // justa. No rompe los límites del pipeline (5–45 min).
    if (profile.goal === 'grasa' && intensity !== 'minimal') {
      duration = Math.min(duration + 3, 45);
      reasons.push('Meta de grasa: sumamos 3 min de volumen de trabajo');
    }

    const ageDays = Math.floor(
      (Date.now() - Date.parse(twin.created_at)) / 86400000
    );

    // ── Confianza: más datos → más confianza, nunca menos de 42 ──
    const baseConfidence = 42;
    const dataCompleteness =
      (checkin ? 8 : 0) +
      (input.last_workout ? 14 : 0) +
      Math.min(ageDays, 10) +
      (consistency.consistency_pct >= 60 ? 8 : 0) +
      (twin.patterns.completion_rate >= 0.6 ? 6 : 0);
    const confidence = Math.round(
      clamp(baseConfidence + dataCompleteness, 42, 94)
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
