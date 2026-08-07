/**
 * Tests de inteligencia añadida a los agentes (capa 2).
 *
 * Cubre comportamientos NUEVOS, sin tocar los tests heredados que fijan la
 * fórmula transparente:
 *   - recoveryInsights (interpretación cualitativa del check-in)
 *   - consistencyMomentum (inercia semanal)
 *   - DecisionEngine: fatiga post-entreno, reentrada tras pausa,
 *     modulación por consistencia, momentum, confianza por completitud de datos
 *   - TrainingAgent: bonus de reps por objetivo, progresión con last_rpe
 *   - MotivationEngine: checkinPrompt / sessionMessage
 *   - SelectorEngine: afinidad por historial hard + novedad (recentIds)
 */
import { describe, it, expect } from 'vitest';
import { DecisionEngine } from '@/lib/agents/decision-agent';
import { recoveryInsights } from '@/lib/agents/recovery-engine';
import { calculateConsistency, consistencyMomentum } from '@/lib/agents/habit-engine';
import { TrainingAgent } from '@/lib/agents/training-agent';
import { MotivationEngine } from '@/lib/agents/motivation-engine';
import { personalAffinity, historyWeight, rankSuggestions } from '../selector-engine';
import type { DigitalTwin, Profile, HabitScore, CheckIn } from '@/types';

/* ─── Fixtures ─── */

const baseTwin: DigitalTwin = {
  user_id: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  training_style: 'adaptive',
  motivation_style: 'data',
  avoid: [],
  best_time: '',
  patterns: { completion_rate: 0.7, avg_duration: 20, abandon_rate: 0.1, best_hours: {} },
  ex_progress: {},
  motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
};

const baseProfile: Profile = {
  user_id: '', name: 'Test', goal: 'energia', level: 'medio',
  equipment: 'ninguno', limitations: [], days_per_week: '2-3',
  neurotype: 'adh-c', preferred_duration: 20, created_at: '', updated_at: '',
};

const cons = (pct: number, momentum?: number): HabitScore => ({
  user_id: '', period_start: '', period_end: '',
  consistency_pct: pct, sessions_done: Math.round(pct / 100 * 13), sessions_target: 13,
  momentum,
});

const checkin = (sleep: number, energy: number, stress: number): CheckIn => ({
  user_id: '', date: new Date().toISOString().slice(0, 10),
  sleep, energy, stress, recovery_score: 0, created_at: '',
});

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/* ─── Recovery Insights ─── */

describe('recoveryInsights — interpretación cualitativa', () => {
  it('identifica el factor más débil del check-in', () => {
    // Sueño bajo, energía y estrés bien → weakest = sleep
    expect(recoveryInsights(checkin(4, 8, 3)).weakest).toBe('sleep');
    // Estrés alto domina → weakest = stress
    expect(recoveryInsights(checkin(9, 8, 9)).weakest).toBe('stress');
  });

  it('etiqueta correctamente cada dimensión', () => {
    const good = recoveryInsights(checkin(9, 9, 1));
    expect(good.sleepLabel).toBe('sueño reparador');
    expect(good.energyLabel).toBe('energía alta');
    expect(good.stressLabel).toBe('estrés bajo');
  });
});

/* ─── Habit Momentum ─── */

describe('consistencyMomentum — inercia semanal', () => {
  it('en objetivo → 0, por encima → positivo, por debajo → negativo', () => {
    expect(consistencyMomentum(3, 3)).toBe(0);
    expect(consistencyMomentum(6, 3)).toBeGreaterThan(0);
    expect(consistencyMomentum(0, 3)).toBe(-1);
    expect(consistencyMomentum(2, 3)).toBeLessThan(0);
  });

  it('calculateConsistency lo expone cuando recibe sesiones de 7 días', () => {
    const c = calculateConsistency(12, 3, 4);
    expect(c.momentum).toBeGreaterThan(0);
    expect(calculateConsistency(12, 3).momentum).toBeUndefined();
  });
});

/* ─── DecisionEngine — contexto enriquecido ─── */

describe('DecisionEngine — inteligencia contextual', () => {
  it('baja de push a standard por fatiga cuando ayer hubo estímulo fuerte', () => {
    const d = DecisionEngine.decide({
      checkin: checkin(9, 9, 1),        // recovery alta
      consistency: cons(72),
      twin: baseTwin,
      profile: baseProfile,
      last_workout: {
        id: 'w', user_id: '', date: daysAgo(1), duration: 25,
        focus: 'full', intensity: 'push', score: 95, completed_rate: 0.9,
        exercises: [], actual_minutes: 25, created_at: '',
      },
    });
    // Base sería push, pero la fatiga de ayer lo baja a standard
    expect(d.intensity).toBe('standard');
    expect(d.reasons.some((r) => r.includes('estímulo fuerte'))).toBe(true);
  });

  it('reentrada: no lanza push tras 4+ días sin entrenar', () => {
    const d = DecisionEngine.decide({
      checkin: checkin(9, 9, 1),
      consistency: cons(72),
      twin: baseTwin,
      profile: baseProfile,
      last_workout: {
        id: 'w', user_id: '', date: daysAgo(6), duration: 20,
        focus: 'full', intensity: 'standard', score: 80, completed_rate: 0.8,
        exercises: [], actual_minutes: 18, created_at: '',
      },
    });
    expect(d.intensity).toBe('standard');
    expect(d.reasons.some((r) => r.includes('pausa'))).toBe(true);
  });

  it('reenganche: consistencia baja + buena recuperación → light, no exigir', () => {
    const d = DecisionEngine.decide({
      checkin: checkin(7, 6, 4),       // recovery ~63 → standard base
      consistency: cons(20),
      twin: baseTwin,
      profile: baseProfile,
    });
    expect(d.intensity).toBe('light');
    expect(d.reasons.some((r) => r.includes('reconectamos'))).toBe(true);
  });

  it('momentum negativo frena un push planeado', () => {
    const d = DecisionEngine.decide({
      checkin: checkin(9, 9, 1),
      consistency: cons(72, -0.7),
      twin: baseTwin,
      profile: baseProfile,
    });
    expect(d.intensity).toBe('standard');
    expect(d.reasons.some((r) => r.includes('Última semana floja'))).toBe(true);
  });

  it('momentum positivo añade refuerzo sin cambiar intensidad', () => {
    const d = DecisionEngine.decide({
      checkin: checkin(9, 9, 1),
      consistency: cons(72, 0.7),
      twin: baseTwin,
      profile: baseProfile,
    });
    expect(d.intensity).toBe('push');
    expect(d.reasons.some((r) => r.includes('Inercia semanal positiva'))).toBe(true);
  });

  it('confianza crece con la completitud de datos', () => {
    const sparse = DecisionEngine.decide({
      consistency: cons(30), twin: baseTwin, profile: baseProfile,
    });
    const rich = DecisionEngine.decide({
      checkin: checkin(9, 9, 1),
      consistency: cons(80, 0.5),
      twin: baseTwin,
      profile: baseProfile,
      last_workout: {
        id: 'w', user_id: '', date: daysAgo(1), duration: 20,
        focus: 'full', intensity: 'standard', score: 80, completed_rate: 0.8,
        exercises: [], actual_minutes: 18, created_at: '',
      },
    });
    expect(rich.confidence).toBeGreaterThanOrEqual(sparse.confidence + 10);
    expect(rich.confidence).toBeLessThanOrEqual(94);
  });

  it('el factor más débil aparece como razón cuando recovery < 70', () => {
    const d = DecisionEngine.decide({
      checkin: checkin(5, 8, 3),      // sueño bajo → recovery < 70
      consistency: cons(60),
      twin: baseTwin,
      profile: baseProfile,
    });
    expect(d.reasons.some((r) => r.includes('pesa el'))).toBe(true);
  });
});

/* ─── TrainingAgent — objetivo y maestría ─── */

describe('TrainingAgent — inteligencia añadida', () => {
  it('meta grasa suma +2 reps (volumen) en intensidades no-minimal', () => {
    const decision = DecisionEngine.decide({
      checkin: checkin(7, 6, 4),
      consistency: cons(65),
      twin: baseTwin,
      profile: { ...baseProfile, goal: 'grasa' },
    });
    const plan = TrainingAgent.generate(decision, baseTwin, 'ninguno', undefined, undefined, { goal: 'grasa' });
    expect(plan.intensity).toBe('standard');
    for (const ex of plan.exercises) {
      if (ex.load_type === 'reps' && !ex.progressed) {
        expect(ex.reps).toBeGreaterThanOrEqual(12 + 2);
      }
    }
  });

  it('no progresa ejercicios con RPE reciente alto (last_rpe > 3)', () => {
    const masteredTwin: DigitalTwin = {
      ...baseTwin,
      ex_progress: { squat: { easy: 3, last_rpe: 9 }, pushup: { easy: 3, last_rpe: 9 } },
    };
    const decision = DecisionEngine.decide({
      checkin: checkin(9, 9, 1),
      consistency: cons(72),
      twin: masteredTwin,
      profile: baseProfile,
    });
    const plan = TrainingAgent.generate(decision, masteredTwin, 'ninguno');
    for (const ex of plan.exercises) {
      expect(ex.progressed).toBe(false);
    }
  });

  it('respeta la lista de ejercicios a evitar del twin', () => {
    const avoidTwin: DigitalTwin = { ...baseTwin, avoid: ['squat', 'deadlift'] };
    const decision = DecisionEngine.decide({
      checkin: checkin(9, 9, 1),
      consistency: cons(72),
      twin: avoidTwin,
      profile: baseProfile,
    });
    const plan = TrainingAgent.generate(decision, avoidTwin, 'gimnasio');
    for (const ex of plan.exercises) {
      expect(['squat', 'deadlift']).not.toContain(ex.exercise_id);
    }
  });
});

/* ─── MotivationEngine — nuevos mensajes ─── */

describe('MotivationEngine — mensajes nuevos', () => {
  it('checkinPrompt existe para cada estilo y no está vacío', () => {
    for (const s of ['data', 'energy', 'direct', 'calm']) {
      expect(MotivationEngine.checkinPrompt(s).length).toBeGreaterThan(10);
    }
  });

  it('sessionMessage refleja la tasa de finalización', () => {
    expect(MotivationEngine.sessionMessage('data', 0.8)).toContain('80%');
    expect(MotivationEngine.sessionMessage('direct', 0.5)).toContain('50%');
  });

  it('message mantiene los substrings clave que fijan los tests heredados', () => {
    expect(MotivationEngine.message('data', 75, 65, 20)).toContain('Recuperación 75');
    expect(MotivationEngine.message('data', 75, 65, 20)).toContain('Consistencia 65');
    expect(MotivationEngine.message('energy', 75, 65, 20)).toContain('75%');
    expect(MotivationEngine.message('energy', 75, 65, 20)).toContain('chispa');
    expect(MotivationEngine.message('calm', 50, 40, 15)).toContain('Sin prisa');
  });
});

/* ─── SelectorEngine — hard + novedad ─── */

describe('SelectorEngine — afinidad por historial y novedad', () => {
  it('historial hard (RPE ≥ 7 repetido) resta afinidad entrenada', () => {
    const soft = personalAffinity(3, { easy: 2, last_rpe: 3 });
    const hard = personalAffinity(3, { easy: 2, last_rpe: 8, hard: 3 });
    expect(hard).toBeLessThan(soft);
  });

  it('historyWeight cuenta interacciones hard como datos', () => {
    expect(historyWeight({ easy: 2, last_rpe: 8, hard: 1 })).toBeGreaterThan(
      historyWeight({ easy: 2 })
    );
  });

  it('rankSuggestions penaliza ejercicios de la última sesión (novedad)', () => {
    const catalog = [
      { id: 'squat', name: 'Sentadilla', muscle: 'piernas', difficulty: 2, equipment: 'ninguno', instructions: '', load_type: 'reps', cognitive_load: 'low', emoji: '', cue: '' },
      { id: 'bench', name: 'Press banca', muscle: 'pecho', difficulty: 2, equipment: 'ninguno', instructions: '', load_type: 'reps', cognitive_load: 'low', emoji: '', cue: '' },
      { id: 'row', name: 'Remo', muscle: 'espalda', difficulty: 2, equipment: 'ninguno', instructions: '', load_type: 'reps', cognitive_load: 'low', emoji: '', cue: '' },
      { id: 'plank', name: 'Plancha', muscle: 'core', difficulty: 2, equipment: 'ninguno', instructions: '', load_type: 'reps', cognitive_load: 'low', emoji: '', cue: '' },
    ];
    const fresh = rankSuggestions(catalog as any, 'full', ['push', 'pull', 'squat'], new Set(), 4, undefined);
    const withRecent = rankSuggestions(catalog as any, 'full', ['push', 'pull', 'squat'], new Set(), 4, undefined, new Set(['squat', 'bench']));
    // El reciente 'squat' ya no puede quedar por delante del resto cubriendo huecos
    const recentRank = withRecent.findIndex((s) => s.exercise.id === 'squat');
    const freshRank = fresh.findIndex((s) => s.exercise.id === 'squat');
    expect(recentRank).toBeGreaterThanOrEqual(freshRank);
  });
});
