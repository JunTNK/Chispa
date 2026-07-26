import { describe, it, expect } from 'vitest';
import { decisionRequestSchema, workoutRequestSchema } from '@/lib/api/schemas';

/* ─── decisionRequestSchema ─── */

describe('decisionRequestSchema', () => {
  const validPayload = {
    profile: {
      equipment: 'ninguno',
      days_per_week: '2-3',
      preferred_duration: 20,
    },
    twin: {
      user_id: '',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
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
      motiv_weights: { data: 1 },
    },
    workouts_last_30_days: 8,
  };

  it('accepts a valid payload', () => {
    const result = decisionRequestSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('accepts payload with checkin', () => {
    const result = decisionRequestSchema.safeParse({
      ...validPayload,
      checkin: { sleep: 7, energy: 6, stress: 4 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects payload without profile', () => {
    const { profile: _profile, ...rest } = validPayload as any;
    const result = decisionRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects payload without twin', () => {
    const { twin: _twin, ...rest } = validPayload as any;
    const result = decisionRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid equipment value', () => {
    const result = decisionRequestSchema.safeParse({
      ...validPayload,
      profile: { ...validPayload.profile, equipment: 'invalid' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects sleep outside range', () => {
    const result = decisionRequestSchema.safeParse({
      ...validPayload,
      checkin: { sleep: 15, energy: 6, stress: 4 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects stress outside range', () => {
    const result = decisionRequestSchema.safeParse({
      ...validPayload,
      checkin: { sleep: 7, energy: 6, stress: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts payload without workouts_last_30_days', () => {
    const { workouts_last_30_days: _workouts_last_30_days, ...rest } = validPayload as any;
    const result = decisionRequestSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });
});

/* ─── workoutRequestSchema ─── */

describe('workoutRequestSchema', () => {
  const validPayload = {
    decision: {
      action: 'train' as const,
      intensity: 'standard' as const,
      duration: 20,
      reasons: ['Razón 1', 'Razón 2'],
      confidence: 78,
    },
    twin: {
      user_id: '',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
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
      motiv_weights: { data: 1 },
    },
    profile: {
      equipment: 'mancuernas' as const,
    },
  };

  it('accepts a valid payload', () => {
    const result = workoutRequestSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('accepts restore action', () => {
    const result = workoutRequestSchema.safeParse({
      ...validPayload,
      decision: { ...validPayload.decision, action: 'restore' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid intensity', () => {
    const result = workoutRequestSchema.safeParse({
      ...validPayload,
      decision: { ...validPayload.decision, intensity: 'super' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration below 5', () => {
    const result = workoutRequestSchema.safeParse({
      ...validPayload,
      decision: { ...validPayload.decision, duration: 3 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional last_focus', () => {
    const result = workoutRequestSchema.safeParse({
      ...validPayload,
      last_focus: 'upper',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid last_focus value', () => {
    const result = workoutRequestSchema.safeParse({
      ...validPayload,
      last_focus: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts payload with recovery_score', () => {
    const result = workoutRequestSchema.safeParse({
      ...validPayload,
      decision: { ...validPayload.decision, recovery_score: 72 },
    });
    expect(result.success).toBe(true);
  });
});
