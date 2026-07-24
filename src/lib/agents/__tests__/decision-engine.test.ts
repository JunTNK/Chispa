import { describe, it, expect } from 'vitest';
import { DecisionEngine, calculateRecoveryScore, calculateConsistency } from '@/lib/agents/decision-engine';
import type { DigitalTwin, Profile, HabitScore } from '@/types';

const mockTwin: DigitalTwin = {
  user_id: '',
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

const mockProfile: Profile = {
  user_id: '',
  name: 'Test',
  goal: 'energia',
  level: 'medio',
  equipment: 'ninguno',
  limitations: [],
  days_per_week: '2-3',
  neurotype: 'tdah',
  preferred_duration: 20,
  created_at: '',
  updated_at: '',
};

const mockConsistency: HabitScore = {
  user_id: '',
  period_start: '',
  period_end: '',
  consistency_pct: 65,
  sessions_done: 8,
  sessions_target: 13,
};

/* ─── calculateRecoveryScore ─── */

describe('calculateRecoveryScore', () => {
  it('returns 50 for neutral input (sleep 7, energy 6, stress 4)', () => {
    const result = calculateRecoveryScore({
      user_id: '', date: '', sleep: 7, energy: 6, stress: 4, recovery_score: 0, created_at: '',
    });
    // sleep: (7-4)/4.5*100*0.4 = 26.67
    // energy: 6*10*0.3 = 18
    // stress: (10-4)*10*0.3 = 18
    // total ≈ 63
    expect(result.score).toBeGreaterThanOrEqual(55);
    expect(result.score).toBeLessThanOrEqual(75);
  });

  it('returns high score for good sleep, high energy, low stress', () => {
    const result = calculateRecoveryScore({
      user_id: '', date: '', sleep: 9, energy: 9, stress: 2, recovery_score: 0, created_at: '',
    });
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('returns low score for poor sleep, low energy, high stress', () => {
    const result = calculateRecoveryScore({
      user_id: '', date: '', sleep: 4, energy: 2, stress: 9, recovery_score: 0, created_at: '',
    });
    expect(result.score).toBeLessThanOrEqual(40);
  });

  it('clamps sleep values outside 3-10 range', () => {
    const sleep1 = calculateRecoveryScore({
      user_id: '', date: '', sleep: 1, energy: 5, stress: 5, recovery_score: 0, created_at: '',
    });
    const sleep2 = calculateRecoveryScore({
      user_id: '', date: '', sleep: 12, energy: 5, stress: 5, recovery_score: 0, created_at: '',
    });
    expect(sleep1.score).toBeGreaterThanOrEqual(0);
    expect(sleep2.score).toBeLessThanOrEqual(100);
  });
});

/* ─── calculateConsistency ─── */

describe('calculateConsistency', () => {
  it('returns 100% when all sessions completed', () => {
    const result = calculateConsistency(13, 3);
    expect(result.consistency_pct).toBeGreaterThanOrEqual(95);
    expect(result.sessions_done).toBe(13);
  });

  it('returns 0% when no sessions completed', () => {
    const result = calculateConsistency(0, 3);
    expect(result.consistency_pct).toBe(0);
    expect(result.sessions_done).toBe(0);
  });

  it('calculates correct percentage for partial completion', () => {
    const result = calculateConsistency(6, 3);
    // target = 3 * 4.33 = 13, pct = (6/13)*100 ≈ 46
    expect(result.consistency_pct).toBeGreaterThanOrEqual(40);
    expect(result.consistency_pct).toBeLessThanOrEqual(55);
  });
});

/* ─── DecisionEngine.decide ─── */

describe('DecisionEngine.decide', () => {
  it('returns standard intensity with no check-in', () => {
    const result = DecisionEngine.decide({
      consistency: mockConsistency,
      twin: mockTwin,
      profile: mockProfile,
    });
    expect(result.action).toBe('train');
    expect(result.intensity).toBe('standard');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('returns minimal/restore when recovery is very low', () => {
    const result = DecisionEngine.decide({
      checkin: { user_id: '', date: '', sleep: 3.5, energy: 2, stress: 9, recovery_score: 0, created_at: '' },
      consistency: mockConsistency,
      twin: mockTwin,
      profile: mockProfile,
    });
    // Recovery will be very low (< 35)
    expect(result.action).toBe('restore');
    expect(result.intensity).toBe('minimal');
  });

  it('returns push when recovery is high and consistency is good', () => {
    const highConsistency: HabitScore = { ...mockConsistency, consistency_pct: 72 };
    const result = DecisionEngine.decide({
      checkin: { user_id: '', date: '', sleep: 9, energy: 9, stress: 1, recovery_score: 0, created_at: '' },
      consistency: highConsistency,
      twin: mockTwin,
      profile: mockProfile,
    });
    expect(result.intensity).toBe('push');
  });

  it('shortens duration when abandon rate is high', () => {
    const highAbandonTwin: DigitalTwin = {
      ...mockTwin,
      patterns: { ...mockTwin.patterns, abandon_rate: 0.45 },
    };
    const result = DecisionEngine.decide({
      consistency: mockConsistency,
      twin: highAbandonTwin,
      profile: { ...mockProfile, preferred_duration: 30 },
    });
    expect(result.duration).toBeLessThanOrEqual(15);
  });

  it('calculates confidence between 42 and 94', () => {
    const result = DecisionEngine.decide({
      consistency: mockConsistency,
      twin: mockTwin,
      profile: mockProfile,
    });
    expect(result.confidence).toBeGreaterThanOrEqual(42);
    expect(result.confidence).toBeLessThanOrEqual(94);
  });
});

/* ─── MotivationEngine ─── */

import { MotivationEngine } from '@/lib/agents/decision-engine';

describe('MotivationEngine', () => {
  it('returns data-style message', () => {
    const msg = MotivationEngine.message('data', 75, 65, 20);
    expect(msg).toContain('Recuperación 75');
    expect(msg).toContain('Consistencia 65');
  });

  it('returns energy-style message', () => {
    const msg = MotivationEngine.message('energy', 75, 65, 20);
    expect(msg).toContain('75%');
    expect(msg).toContain('⚡');
  });

  it('returns calm-style message', () => {
    const msg = MotivationEngine.message('calm', 50, 40, 15);
    expect(msg).toContain('Sin prisa');
  });

  it('returns rest message for low recovery', () => {
    const msg = MotivationEngine.restMessage('data');
    expect(msg).toContain('Recuperación');
    expect(msg).toContain('descanso');
  });
});
