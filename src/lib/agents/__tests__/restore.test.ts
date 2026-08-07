/**
 * Unit tests — Restore (recuperación / descanso activo).
 *
 * Cubre el camino de "día de recuperación" de principio a fin:
 *   DecisionEngine (action: 'restore') → TrainingAgent (plan minimal)
 *   → MotivationEngine (restMessage).
 *
 * Criterio central: recScore < 35 → restore + minimal + duración ≤ 12.
 */
import { describe, it, expect } from 'vitest';
import { DecisionEngine } from '@/lib/agents/decision-agent';
import { calculateRecoveryScore } from '@/lib/agents/recovery-engine';
import { TrainingAgent } from '@/lib/agents/training-agent';
import { MotivationEngine } from '@/lib/agents/motivation-engine';
import type { DigitalTwin, Profile, CheckIn, HabitScore } from '@/types';

// ═══════════════════════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════════════════════

const baseTwin: DigitalTwin = {
  user_id: 'test',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  training_style: 'adaptive',
  motivation_style: 'data',
  avoid: [],
  best_time: '',
  patterns: {
    completion_rate: 0.6,
    avg_duration: 20,
    abandon_rate: 0.1,
    best_hours: {},
  },
  ex_progress: {},
  motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
};

const baseProfile: Profile = {
  user_id: 'test',
  name: 'Test',
  goal: 'energia',
  level: 'medio',
  equipment: 'ninguno',
  limitations: [],
  days_per_week: '2-3',
  neurotype: 'adh-c',
  preferred_duration: 20,
  created_at: '',
  updated_at: '',
};

const baseConsistency: HabitScore = {
  user_id: '',
  period_start: '',
  period_end: '',
  consistency_pct: 65,
  sessions_done: 8,
  sessions_target: 13,
};

function checkin(sleep: number, energy: number, stress: number): CheckIn {
  return {
    user_id: 'test',
    date: new Date().toISOString().slice(0, 10),
    sleep,
    energy,
    stress,
    recovery_score: 0,
    created_at: '',
  };
}

function restoreDecision() {
  return DecisionEngine.decide({
    checkin: checkin(3, 1, 10), // rec ≈ 3 → restore
    consistency: baseConsistency,
    twin: baseTwin,
    profile: baseProfile,
  });
}

// ═══════════════════════════════════════════════════════════════
//  1. DECISION ENGINE — acción restore
// ═══════════════════════════════════════════════════════════════

describe('DecisionEngine — restore', () => {
  it('returns restore + minimal for very low recovery (< 35)', () => {
    const decision = restoreDecision();
    expect(decision.action).toBe('restore');
    expect(decision.intensity).toBe('minimal');
  });

  it('includes a recovery reason explaining the restore', () => {
    const decision = restoreDecision();
    expect(decision.reasons.some((r) => r.includes('Recuperación') && r.includes('suavidad'))).toBe(true);
  });

  it('caps duration at 12 min for minimal intensity', () => {
    const decision = DecisionEngine.decide({
      checkin: checkin(3, 1, 10),
      consistency: baseConsistency,
      twin: baseTwin,
      profile: { ...baseProfile, preferred_duration: 30 },
    });
    expect(decision.duration).toBeLessThanOrEqual(12);
  });

  it('caps duration at 12 even when abandon pattern would shorten further', () => {
    const highAbandon: DigitalTwin = {
      ...baseTwin,
      patterns: { ...baseTwin.patterns, abandon_rate: 0.5 },
    };
    const decision = DecisionEngine.decide({
      checkin: checkin(3, 1, 10),
      consistency: baseConsistency,
      twin: highAbandon,
      profile: { ...baseProfile, preferred_duration: 30 },
    });
    // abandon → 15, luego minimal → min(15, 12) = 12
    expect(decision.duration).toBe(12);
  });

  it('does NOT add progression reason at minimal intensity', () => {
    const progressedTwin: DigitalTwin = {
      ...baseTwin,
      ex_progress: { squat: { easy: 3 } },
    };
    const decision = DecisionEngine.decide({
      checkin: checkin(3, 1, 10),
      consistency: baseConsistency,
      twin: progressedTwin,
      profile: baseProfile,
    });
    expect(decision.reasons.filter((r) => r.includes('Progresión'))).toHaveLength(0);
  });

  it('exposes recovery_score on the output', () => {
    const decision = restoreDecision();
    expect(decision.recovery_score).toBeDefined();
    expect(decision.recovery_score!).toBeLessThan(35);
  });

  it('keeps confidence within the valid range', () => {
    const decision = restoreDecision();
    expect(decision.confidence).toBeGreaterThanOrEqual(42);
    expect(decision.confidence).toBeLessThanOrEqual(94);
  });
});

// ═══════════════════════════════════════════════════════════════
//  2. LÍMITE — transición restore ⇄ light
// ═══════════════════════════════════════════════════════════════

describe('DecisionEngine — restore boundary', () => {
  it('stays on restore below the threshold', () => {
    // sleep 4 → 0 · energy 3 → 9 · stress 10 → 0 · score = 9 < 35
    const decision = DecisionEngine.decide({
      checkin: checkin(4, 3, 10),
      consistency: baseConsistency,
      twin: baseTwin,
      profile: baseProfile,
    });
    expect(decision.action).toBe('restore');
  });

  it('switches to light train once recovery ≥ 35', () => {
    // sleep 6 → 17.78 + energy 3 → 9 + stress 6 → 12 = 38.78 → light
    const decision = DecisionEngine.decide({
      checkin: checkin(6, 3, 6),
      consistency: baseConsistency,
      twin: baseTwin,
      profile: baseProfile,
    });
    expect(decision.action).toBe('train');
    expect(decision.intensity).toBe('light');
    expect(decision.recovery_score).toBeGreaterThanOrEqual(35);
  });
});

// ═══════════════════════════════════════════════════════════════
//  3. RECOVERY ENGINE — score bajo
// ═══════════════════════════════════════════════════════════════

describe('calculateRecoveryScore — low recovery', () => {
  it('scores a rough night below the 35 threshold', () => {
    const r = calculateRecoveryScore(checkin(3, 2, 9));
    expect(r.score).toBeLessThan(35);
  });

  it('clamps extreme inputs without throwing', () => {
    expect(() => calculateRecoveryScore(checkin(0, 0, 10))).not.toThrow();
    expect(() => calculateRecoveryScore(checkin(12, 11, -2))).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
//  4. TRAINING AGENT — plan minimal (restore)
// ═══════════════════════════════════════════════════════════════

describe('TrainingAgent — restore plan', () => {
  it('generates a minimal plan: 3 exercises, 2 sets, rest 30', () => {
    const decision = restoreDecision();
    const plan = TrainingAgent.generate(decision, baseTwin, baseProfile.equipment);
    expect(plan.intensity).toBe('minimal');
    expect(plan.exercises.length).toBe(3);
    expect(plan.sets).toBe(2);
    expect(plan.rest).toBe(30);
  });

  it('sets low reps and never marks progression on minimal', () => {
    const decision = restoreDecision();
    const plan = TrainingAgent.generate(decision, baseTwin, baseProfile.equipment);
    for (const ex of plan.exercises) {
      if (ex.load_type === 'reps') {
        expect(ex.sets).toBe(2);
        expect(ex.reps).toBe(8);
      }
      expect(ex.progressed).toBe(false);
    }
  });

  it('keeps every exercise pending at generation time', () => {
    const plan = TrainingAgent.generate(restoreDecision(), baseTwin, baseProfile.equipment);
    for (const ex of plan.exercises) {
      expect(ex.status).toBe('pending');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
//  5. MOTIVATION ENGINE — mensajes de descanso
// ═══════════════════════════════════════════════════════════════

describe('MotivationEngine — rest messages', () => {
  it('returns a message for every style', () => {
    const styles: Array<'data' | 'energy' | 'direct' | 'calm'> = ['data', 'energy', 'direct', 'calm'];
    for (const s of styles) {
      const msg = MotivationEngine.restMessage(s);
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it('returns the generic fallback for unknown styles', () => {
    const msg = MotivationEngine.restMessage('unknown');
    expect(msg).toContain('descanso');
  });

  it('data style mentions recovery and rest', () => {
    expect(MotivationEngine.restMessage('data')).toContain('Recuperación');
    expect(MotivationEngine.restMessage('data')).toContain('descanso');
  });
});
