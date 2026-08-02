import { z } from 'zod';

/* ─── Shared primitives ─── */

const intensityEnum = z.enum(['minimal', 'light', 'standard', 'push']);
const actionEnum = z.enum(['train', 'restore']);
const equipmentEnum = z.enum(['ninguno', 'mancuernas', 'gimnasio']);
const daysEnum = z.enum(['2-3', '4-5', 'flex']);
const motivationStyleEnum = z.enum(['data', 'energy', 'direct', 'calm']);
const focusEnum = z.enum(['full', 'upper', 'lower', 'core']);

/* ─── Check-in schema ─── */

const checkinSchema = z.object({
  sleep: z.number().min(3).max(10).step(0.5),
  energy: z.number().min(1).max(10).int(),
  stress: z.number().min(1).max(10).int(),
});

/* ─── Profile schema ─── */

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.enum(['fuerza', 'energia', 'grasa']).optional(),
  level: z.enum(['inicio', 'medio', 'regular']).optional(),
  equipment: equipmentEnum,
  limitations: z.array(z.string()).optional(),
  days_per_week: daysEnum,
  neurotype: z.enum(['adh-c', 'adh-i', 'audhd', 'spd', 'curious', 'other']).optional(),
  preferred_duration: z.number().min(5).max(60).int(),
});

/* ─── Digital Twin schema (matches DigitalTwin type exactly) ─── */

const digitalTwinSchema = z.object({
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  training_style: z.string(),
  motivation_style: motivationStyleEnum,
  avoid: z.array(z.string()),
  best_time: z.string(),
  patterns: z.object({
    completion_rate: z.number().min(0).max(1),
    avg_duration: z.number().min(0),
    abandon_rate: z.number().min(0).max(1),
    best_hours: z.record(z.string(), z.number()),
  }),
  ex_progress: z.record(z.string(), z.object({
    easy: z.number().optional().default(0),
    last_rpe: z.number().optional(),
    // Inteligencia entrenada (persistida vía JSONB en digital_twins.exercise_progress)
    hard: z.number().optional(),
    last_date: z.string().optional(),
    total: z.number().optional(),
  })),
  motiv_weights: z.record(z.string(), z.number()),
});

/* ─── Decision Engine Output schema ─── */

const decisionOutputSchema = z.object({
  action: actionEnum,
  intensity: intensityEnum,
  duration: z.number().min(5).max(60).int(),
  reasons: z.array(z.string()),
  confidence: z.number().min(0).max(100),
  recovery_score: z.number().optional(),
  consistency: z.object({
    consistency_pct: z.number().min(0).max(100),
    sessions_done: z.number().min(0).int(),
    sessions_target: z.number().min(1).int(),
  }).optional(),
  date: z.string().optional(),
});

/* ─── Workout profile schema (partial for API) ─── */

const workoutProfileSchema = z.object({
  equipment: equipmentEnum,
  preferred_duration: z.number().optional(),
  days_per_week: daysEnum.optional(),
  name: z.string().optional(),
});

/* ═══════════════════════════════════════════
   REQUEST SCHEMAS
   ═══════════════════════════════════════════ */

/**
 * POST /api/decision — request body
 */
export const decisionRequestSchema = z.object({
  checkin: checkinSchema.optional(),
  profile: profileSchema,
  twin: digitalTwinSchema,
  workouts_last_30_days: z.number().min(0).int().optional(),
  workouts_last_7_days: z.number().min(0).int().optional(),
  last_workout: z.any().optional(),
});

/**
 * POST /api/workout — request body
 */
export const workoutRequestSchema = z.object({
  decision: decisionOutputSchema,
  twin: digitalTwinSchema,
  profile: workoutProfileSchema,
  last_focus: focusEnum.optional(),
  client_last_focus: z.string().optional(),
  goal: z.enum(['fuerza', 'energia', 'grasa']).optional(),
  recent_exercise_ids: z.array(z.string()).optional(),
});

/* ═══════════════════════════════════════════
   TYPE INFERENCES
   ═══════════════════════════════════════════ */

export type DecisionRequest = z.infer<typeof decisionRequestSchema>;
export type WorkoutRequest = z.infer<typeof workoutRequestSchema>;
