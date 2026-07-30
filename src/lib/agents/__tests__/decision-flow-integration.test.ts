/**
 * Integration tests: check-in → decision engine → training agent.
 *
 * Tests the complete pipeline end-to-end with real data (1222 exercises).
 * No mocks, no React — pure algorithm-level integration.
 */
import { describe, it, expect } from 'vitest';
import { DecisionEngine } from '@/lib/agents/decision-agent';
import { calculateRecoveryScore } from '@/lib/agents/recovery-engine';
import { calculateConsistency } from '@/lib/agents/habit-engine';
import { TrainingAgent } from '@/lib/agents/training-agent';
import { MotivationEngine } from '@/lib/agents/motivation-engine';
import { EXERCISE_CATALOG } from '@/lib/utils/exercises';
import { matchesEquipment } from '@/lib/utils/helpers';
import type { DigitalTwin, Profile, CheckIn } from '@/types';

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

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

/** Build a check-in from raw values */
function checkin(
  sleep: number,
  energy: number,
  stress: number,
): CheckIn {
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

/** Assert every exercise in the plan matches the user's equipment profile */
function expectAllMatchEquipment(
  plan: ReturnType<typeof TrainingAgent.generate>,
  equipment: string,
) {
  for (const ex of plan.exercises) {
    const catalogEntry = EXERCISE_CATALOG.find((e) => e.id === ex.exercise_id);
    expect(catalogEntry).toBeDefined();
    const match = matchesEquipment(equipment, catalogEntry!.equipment);
    expect(match).toBe(true);
  }
}

// ═══════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════

describe('Decision Flow Integration', () => {
  // ─── 1. RECOVERY SCORE ──────────────────────────────────
  describe('RecoveryEngine', () => {
    it('computes score components from check-in values', () => {
      const r = calculateRecoveryScore(checkin(8, 7, 3));
      // sleep: (8-4)/4.5*100*0.4 = 35.56
      // energy: 7*10*0.3 = 21
      // stress: (10-3)*10*0.3 = 21
      expect(r.sleep_contribution).toBeGreaterThanOrEqual(30);
      expect(r.energy_contribution).toBe(21);
      expect(r.stress_contribution).toBe(21);
      expect(r.score).toBeGreaterThanOrEqual(72);
      expect(r.score).toBeLessThanOrEqual(85);
    });

    it('handles extreme check-in values gracefully', () => {
      const worst = calculateRecoveryScore(checkin(2, 1, 10));
      expect(worst.score).toBeGreaterThanOrEqual(0);
      expect(worst.score).toBeLessThanOrEqual(20);

      const best = calculateRecoveryScore(checkin(10, 10, 1));
      expect(best.score).toBeGreaterThanOrEqual(85);
      expect(best.score).toBeLessThanOrEqual(100);
    });
  });

  // ─── 2. CONSISTENCY ─────────────────────────────────────
  describe('HabitEngine', () => {
    it('calculates consistency for 2-3 days/week goal', () => {
      const c = calculateConsistency(8, 3);
      expect(c.sessions_target).toBe(13);
      expect(c.consistency_pct).toBeGreaterThanOrEqual(55);
      expect(c.consistency_pct).toBeLessThanOrEqual(65);
    });

    it('caps at 100% even when exceeding target', () => {
      const c = calculateConsistency(20, 3);
      expect(c.consistency_pct).toBe(100);
    });

    it('returns 0% when no sessions', () => {
      const c = calculateConsistency(0, 3);
      expect(c.consistency_pct).toBe(0);
    });
  });

  // ─── 3. DECISION ENGINE × RECOVERY ─────────────────────
  describe('DecisionEngine × Recovery (integration)', () => {
    it('HIGH recovery + good consistency → push intensity', () => {
      const cons = calculateConsistency(10, 3);
      const pushTwin: DigitalTwin = {
        ...baseTwin,
        ex_progress: { squat: { easy: 2 }, pushup: { easy: 3 } },
      };
      const decision = DecisionEngine.decide({
        checkin: checkin(9, 9, 1),
        consistency: cons,
        twin: pushTwin,
        profile: baseProfile,
      });
      expect(decision.intensity).toBe('push');
      expect(decision.action).toBe('train');
      expect(decision.reasons.some((r) => r.includes('día para progresar'))).toBe(true);
      expect(decision.reasons.some((r) => r.includes('Progresión lista'))).toBe(true);
    });

    it('LOW recovery (< 35) → restore action with minimal intensity', () => {
      const cons = calculateConsistency(5, 3);
      const decision = DecisionEngine.decide({
        checkin: checkin(3, 1, 10),
        consistency: cons,
        twin: baseTwin,
        profile: baseProfile,
      });
      expect(decision.action).toBe('restore');
      expect(decision.intensity).toBe('minimal');
      expect(decision.duration).toBeLessThanOrEqual(12);
    });

    it('MODERATE recovery (35-55) → light intensity', () => {
      // stress 7, energy 4, sleep 5 → score ≈ 29 (borderline)
      // Bump to sleep=6, energy=3, stress=6 →  (6-4)/4.5*100*0.4 + 3*10*0.3 + (10-6)*10*0.3
      // = 17.78 + 9 + 12 = 38.78 (light)
      const cons = calculateConsistency(6, 3);
      const decision = DecisionEngine.decide({
        checkin: checkin(6, 3, 6),
        consistency: cons,
        twin: baseTwin,
        profile: baseProfile,
      });
      // recovery ~39 → < 55 → light
      expect(['light', 'minimal']).toContain(decision.intensity);
      expect(decision.action).toBe('train');
    });

    it('GOOD recovery (55-74) → standard intensity', () => {
      // sleep=7, energy=6, stress=4 → score ≈ 63
      const cons = calculateConsistency(7, 3);
      const decision = DecisionEngine.decide({
        checkin: checkin(7, 6, 4),
        consistency: cons,
        twin: baseTwin,
        profile: baseProfile,
      });
      expect(decision.intensity).toBe('standard');
      expect(decision.action).toBe('train');
    });

    it('NO check-in → standard train', () => {
      const cons = calculateConsistency(6, 3);
      const decision = DecisionEngine.decide({
        consistency: cons,
        twin: baseTwin,
        profile: baseProfile,
      });
      expect(decision.action).toBe('train');
      expect(decision.intensity).toBe('standard');
      expect(decision.reasons.some((r) => r.includes('Sin check-in'))).toBe(true);
    });
  });

  // ─── 4. DECISION ENGINE × TWIN PATTERNS ────────────────
  describe('DecisionEngine × Twin Patterns', () => {
    it('shortens duration when abandon rate > 35%', () => {
      const highAbandonTwin: DigitalTwin = {
        ...baseTwin,
        patterns: { ...baseTwin.patterns, abandon_rate: 0.45 },
      };
      const cons = calculateConsistency(6, 3);
      const decision = DecisionEngine.decide({
        consistency: cons,
        twin: highAbandonTwin,
        profile: { ...baseProfile, preferred_duration: 30 },
      });
      expect(decision.duration).toBeLessThanOrEqual(15);
      expect(decision.reasons.some((r) => r.includes('abandono'))).toBe(true);
    });

    it('adds progression reason when exercises are ready', () => {
      const progressedTwin: DigitalTwin = {
        ...baseTwin,
        ex_progress: { squat: { easy: 2 }, pushup: { easy: 3 } },
      };
      const cons = calculateConsistency(8, 3);
      const decision = DecisionEngine.decide({
        checkin: checkin(8, 7, 3),
        consistency: cons,
        twin: progressedTwin,
        profile: baseProfile,
      });
      expect(decision.reasons.some((r) => r.includes('Progresión'))).toBe(true);
    });

    it('does NOT add progression reason with minimal intensity', () => {
      const progressedTwin: DigitalTwin = {
        ...baseTwin,
        ex_progress: { squat: { easy: 2 } },
      };
      const decision = DecisionEngine.decide({
        checkin: checkin(3, 1, 10),
        consistency: calculateConsistency(1, 3),
        twin: progressedTwin,
        profile: baseProfile,
      });
      // minimal intensity = no progression reason
      expect(decision.reasons.filter((r) => r.includes('Progresión'))).toHaveLength(0);
    });

    it('computes confidence within [42, 94]', () => {
      const cons = calculateConsistency(6, 3);
      const decision = DecisionEngine.decide({
        consistency: cons,
        twin: baseTwin,
        profile: baseProfile,
      });
      expect(decision.confidence).toBeGreaterThanOrEqual(42);
      expect(decision.confidence).toBeLessThanOrEqual(94);
    });

    it('boosts confidence when last_workout exists', () => {
      const cons = calculateConsistency(6, 3);
      const without = DecisionEngine.decide({
        consistency: cons,
        twin: baseTwin,
        profile: baseProfile,
      });
      const withWorkout = DecisionEngine.decide({
        consistency: cons,
        twin: baseTwin,
        profile: baseProfile,
        last_workout: {
          id: 'w1', user_id: 'test', date: '2026-07-27', duration: 20,
          focus: 'full', intensity: 'standard', score: 80, completed_rate: 0.9,
          exercises: [], actual_minutes: 18, created_at: '',
        },
      });
      expect(withWorkout.confidence).toBeGreaterThanOrEqual(without.confidence + 10);
    });
  });

  // ─── 5. TRAINING AGENT × DECISION ──────────────────────
  describe('TrainingAgent × Decision (workout generation)', () => {
    it('generates correct exercise count per intensity level', () => {
      const cons = calculateConsistency(8, 3);
      const intensities: Array<{
        label: string;
        checkin: CheckIn;
        expectedCount: number;
      }> = [
        { label: 'minimal (restore)', checkin: checkin(3, 1, 10), expectedCount: 3 },
        { label: 'light', checkin: checkin(6, 5, 6), expectedCount: 4 },
        { label: 'standard', checkin: checkin(7, 6, 4), expectedCount: 5 },
        { label: 'push', checkin: checkin(9, 9, 1), expectedCount: 6 },
      ];

      for (const { checkin: ci, expectedCount } of intensities) {
        const decision = DecisionEngine.decide({
          checkin: ci,
          consistency: cons,
          twin: baseTwin,
          profile: baseProfile,
        });
        // Force push if high recovery but consistency might be low
        const workout = TrainingAgent.generate(
          decision,
          baseTwin,
          baseProfile.equipment,
        );
        expect(workout.exercises.length).toBe(expectedCount);
      }
    });

    it('all exercises match user equipment profile', () => {
      const cons = calculateConsistency(8, 3);
      const decision = DecisionEngine.decide({
        checkin: checkin(8, 7, 3),
        consistency: cons,
        twin: baseTwin,
        profile: baseProfile,
      });
      const workout = TrainingAgent.generate(
        decision,
        baseTwin,
        baseProfile.equipment,
      );
      expectAllMatchEquipment(workout, 'ninguno');
    });

    it('generates different exercises for mancuernas vs gimnasio equipment', () => {
      const cons = calculateConsistency(8, 3);
      const decision = DecisionEngine.decide({
        checkin: checkin(8, 7, 3),
        consistency: cons,
        twin: baseTwin,
        profile: { ...baseProfile, equipment: 'gimnasio' },
      });

      const gimnasioWorkout = TrainingAgent.generate(
        decision,
        baseTwin,
        'gimnasio',
      );

      const mancuernasWorkout = TrainingAgent.generate(
        decision,
        baseTwin,
        'mancuernas',
      );

      // Different equipment profiles should yield different exercise IDs
      const gimnasioIds = new Set(gimnasioWorkout.exercises.map((e) => e.exercise_id));
      const mancuernasIds = new Set(mancuernasWorkout.exercises.map((e) => e.exercise_id));
      // At least some difference (they won't all overlap since pool sizes differ)
      const overlap = [...gimnasioIds].filter((id) => mancuernasIds.has(id));
      expect(overlap.length).toBeLessThan(gimnasioIds.size);
    });

    it('skips high-cognitive-load exercises unless intensity is push', () => {
      const cons = calculateConsistency(8, 3);

      // Standard intensity → no high cognitive load exercises
      const stdDecision = DecisionEngine.decide({
        checkin: checkin(7, 6, 4),
        consistency: cons,
        twin: baseTwin,
        profile: baseProfile,
      });
      expect(stdDecision.intensity).toBe('standard');
      const stdWorkout = TrainingAgent.generate(
        stdDecision,
        baseTwin,
        baseProfile.equipment,
      );
      for (const ex of stdWorkout.exercises) {
        const cat = EXERCISE_CATALOG.find((e) => e.id === ex.exercise_id);
        if (cat) {
          expect(cat.cognitive_load).not.toBe('high');
        }
      }

      // Push intensity → may include high cognitive load exercises
      const pushDecision = DecisionEngine.decide({
        checkin: checkin(9, 9, 1),
        consistency: { ...cons, consistency_pct: 72 },
        twin: baseTwin,
        profile: baseProfile,
      });
      const pushWorkout = TrainingAgent.generate(
        pushDecision,
        baseTwin,
        baseProfile.equipment,
      );
      // Only verify: no crash, exercises exist (filter is relaxed for push)
      expect(pushWorkout.exercises.length).toBe(6);
    });

    it('sets and reps match intensity level', () => {
      const cons = calculateConsistency(8, 3);
      const scenarios = [
        { checkin: checkin(3, 1, 10), expectedSets: 2, expectedReps: 8 },
        { checkin: checkin(6, 5, 6), expectedSets: 2, expectedReps: 10 },
        { checkin: checkin(7, 6, 4), expectedSets: 3, expectedReps: 12 },
        { checkin: checkin(9, 9, 1), expectedSets: 4, expectedReps: 12 },
      ];

      for (const { checkin: ci, expectedSets, expectedReps } of scenarios) {
        const decision = DecisionEngine.decide({
          checkin: ci,
          consistency: cons,
          twin: baseTwin,
          profile: baseProfile,
        });
        const workout = TrainingAgent.generate(
          decision,
          baseTwin,
          baseProfile.equipment,
        );
        for (const ex of workout.exercises) {
          if (ex.load_type === 'reps') {
            expect(ex.sets).toBe(expectedSets);
            expect(ex.reps).toBeGreaterThanOrEqual(expectedReps);
          }
        }
        expect(workout.sets).toBe(expectedSets);
        expect(workout.rest).toBeGreaterThanOrEqual(30);
      }
    });
  });

  // ─── 6. MUSCLE FOCUS ROTATION ──────────────────────────
  describe('TrainingAgent × Focus Rotation', () => {
    it('cycles through full → upper → lower → core', () => {
      const cons = calculateConsistency(8, 3);
      const decision = DecisionEngine.decide({
        checkin: checkin(8, 7, 3),
        consistency: cons,
        twin: baseTwin,
        profile: baseProfile,
      });

      // First call (no previous focus) → should be 'full'
      const w1 = TrainingAgent.generate(decision, baseTwin, baseProfile.equipment);
      expect(w1.focus).toBe('full');

      // Second call (last_focus = 'full') → should be 'upper'
      const w2 = TrainingAgent.generate(decision, baseTwin, baseProfile.equipment, 'full');
      expect(w2.focus).toBe('upper');

      // Third call → 'lower'
      const w3 = TrainingAgent.generate(decision, baseTwin, baseProfile.equipment, 'upper');
      expect(w3.focus).toBe('lower');

      // Fourth call → 'core'
      const w4 = TrainingAgent.generate(decision, baseTwin, baseProfile.equipment, 'lower');
      expect(w4.focus).toBe('core');

      // Fifth call → wraps around to 'full'
      const w5 = TrainingAgent.generate(decision, baseTwin, baseProfile.equipment, 'core');
      expect(w5.focus).toBe('full');
    });

    it('selects different exercises for different focus areas', () => {
      const cons = calculateConsistency(8, 3);
      const decision = DecisionEngine.decide({
        checkin: checkin(8, 7, 3),
        consistency: cons,
        twin: baseTwin,
        profile: baseProfile,
      });

      const fullW = TrainingAgent.generate(decision, baseTwin, baseProfile.equipment, undefined, 'core');
      const lowerW = TrainingAgent.generate(decision, baseTwin, baseProfile.equipment, 'upper');

      expect(fullW.focus).toBe('full');
      expect(lowerW.focus).toBe('lower');

      // Should use different muscle groups (not asserting all different since pool can overlap)
      const lowerMuscles = new Set(lowerW.exercises.map((e) => e.muscle));
      // Full body exercises include piernas, but lower body should NOT include pecho/espalda
      if (lowerW.focus === 'lower') {
        for (const m of lowerMuscles) {
          expect(['piernas', 'gluteos', 'core', 'full_body']).toContain(m);
        }
      }
    });
  });

  // ─── 7. MOTIVATION ENGINE ──────────────────────────────
  describe('MotivationEngine × Decision (context)', () => {
    it('tailors message to recovery score', () => {
      const msg = MotivationEngine.message('energy', 75, 65, 20);
      expect(msg).toContain('75%');
      expect(msg).toContain('chispa');
    });

    it('rest message for low recovery', () => {
      const msg = MotivationEngine.restMessage('data');
      expect(msg).toContain('Recuperación');
      expect(msg).toContain('descanso');
    });

    it('all 4 motivation styles produce different messages', () => {
      const styles: Array<'data' | 'energy' | 'direct' | 'calm'> = [
        'data', 'energy', 'direct', 'calm',
      ];
      const messages = styles.map((s) => MotivationEngine.message(s, 60, 50, 20));
      const unique = new Set(messages);
      expect(unique.size).toBe(4);
    });
  });

  // ─── 8. FULL PIPELINE (data sanity checks) ─────────────
  describe('Complete pipeline (check-in → decision → workout)', () => {
    it('produces realistic workout for each recovery level', () => {
      const scenarios = [
        { label: 'alta', sleep: 9, energy: 9, stress: 1 },
        { label: 'media', sleep: 7, energy: 6, stress: 4 },
        { label: 'baja', sleep: 4, energy: 3, stress: 8 },
      ];

      for (const { sleep, energy, stress } of scenarios) {
        const cons = calculateConsistency(8, 3);
        const decision = DecisionEngine.decide({
          checkin: checkin(sleep, energy, stress),
          consistency: cons,
          twin: baseTwin,
          profile: baseProfile,
        });
        const workout = TrainingAgent.generate(
          decision,
          baseTwin,
          baseProfile.equipment,
        );

        // Every exercise must be valid
        for (const ex of workout.exercises) {
          expect(ex.exercise_id).toBeTruthy();
          expect(ex.name).toBeTruthy();
          expect(ex.sets).toBeGreaterThanOrEqual(1);
          expect(ex.reps).toBeGreaterThanOrEqual(1);
          expect(ex.rest).toBeGreaterThanOrEqual(20);
          expect(ex.status).toBe('pending');
        }

        // Duration matches intensity
        expect(workout.duration).toBeGreaterThanOrEqual(5);
        expect(workout.duration).toBeLessThanOrEqual(45);

        // Title is non-empty
        expect(workout.title).toBeTruthy();

        // Equipment match
        expectAllMatchEquipment(workout, 'ninguno');
      }
    });
  });
});
