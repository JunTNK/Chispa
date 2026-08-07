export interface User {
  id: string;
  email: string;
  name: string;
  birthdate: string;
  created_at: string;
  updated_at: string;
}

/** Social graph (local-first MVP, zero-blame). */
export interface FriendEntry {
  id: string;            // 6-digit invite code
  name: string;          // peer display name (local label)
  joined_at: string;     // ISO
  status: 'active' | 'pending';
}

export interface InviteCode {
  code: string;          // 6 digits
  expires_at: string;    // ISO, 48h
}

export interface Profile {
  user_id: string;
  name: string;
  goal: 'fuerza' | 'energia' | 'grasa';
  level: 'inicio' | 'medio' | 'regular';
  equipment: 'ninguno' | 'mancuernas' | 'gimnasio';
  limitations: string[];
  days_per_week: '2-3' | '4-5' | 'flex';
  neurotype: 'adh-c' | 'adh-i' | 'audhd' | 'spd' | 'curious' | 'other';

  /** 🌅 Chronotype: león (morning person) or lobo (night person) */
  chronotype?: 'leon' | 'lobo';
  /** 💊 Medication type: none, short-acting (3-4h), or long-acting (6-8h) */
  medication?: 'no' | 'short' | 'long';
  /** ⏰ Medication intake time in HH:MM format */
  medication_time?: string;

  /** ⚧️ Sexo registrado por el usuario (opcional) */
  sex?: 'masculino' | 'femenino';
  /** 📏 Estatura en centímetros — almacenada SIEMPRE en métrico (canónico) */
  height_cm?: number;
  /** ⚖️ Peso en kilogramos — almacenado SIEMPRE en métrico (canónico) */
  weight_kg?: number;
  /** 📐 Sistema de unidades preferido para mostrar medidas: imperial (default) o métrico */
  units?: 'imperial' | 'metric';

  preferred_duration: number;
  created_at: string;
  updated_at: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'lifetime';

export interface UserSubscription {
  tier: SubscriptionTier;
  activatedAt?: string | null;
  trialEndsAt?: string | null;
  isInTrial: boolean;
  trialDaysLeft: number;
  stripeCustomerId?: string | null;
}

export const PRO_TIER_PRICE_USD = 4.99;
export const LIFETIME_FOUNDERS_PRICE_USD = 49;
export const TRIAL_DAYS = 7;

export const PRO_FEATURES = [
  'analytics_advanced',
  'plan_custom',
  'themes_all',
  'sound_packs',
  'export_data',
  'priority_support',
] as const;
export type ProFeature = (typeof PRO_FEATURES)[number];

export function hasFeature(
  sub: UserSubscription | undefined,
  feature: ProFeature,
): boolean {
  if (!sub || sub.tier === 'free') return false;
  if (sub.tier === 'lifetime') return true;
  // analytics_advanced and plan_custom require paid Pro (not trial) for compute cost justification
  if (feature === 'analytics_advanced' || feature === 'plan_custom') {
    return sub.tier === 'pro' && !sub.isInTrial;
  }
  // Other Pro features available during trial
  if (sub.tier === 'pro' && sub.isInTrial && sub.trialDaysLeft > 0) return true;
  return sub.tier === 'pro';
}

export function getTrialDaysLeft(activatedAt?: string | null): number {
  if (!activatedAt) return 0;
  const diff = Date.now() - new Date(activatedAt).getTime();
  const days = Math.ceil(TRIAL_DAYS - diff / 86440000);
  return Math.max(0, Math.min(days, TRIAL_DAYS));
}

export interface Exercise {
  /** Unique identifier (slug from free-exercise-db) */
  id: string;
  /** Display name (Spanish where available, English as fallback) */
  name: string;
  /** Primary muscle group (Spanish) — kept for backward compatibility */
  muscle: string;
  /** All primary muscles worked */
  primaryMuscles?: string[];
  /** Secondary / synergistic muscles */
  secondaryMuscles?: string[];
  /** Difficulty level: 1=beginner, 2=intermediate, 3=expert */
  difficulty: 1 | 2 | 3;
  /** Equipment needed */
  equipment: string;
  /** Video URL (optional) */
  video_url?: string;
  /** Full instructions as joined text (backward-compatible) */
  instructions: string;
  /** Step-by-step instructions array */
  instructionsSteps?: string[];
  /** 'reps' for counted movements, 'time' for timed holds */
  load_type: 'reps' | 'time';
  /** Cognitive load for neurodivergent users */
  cognitive_load: 'low' | 'med' | 'high';
  /** Emoji for visual recognition */
  emoji: string;
  /** Short coaching cue */
  cue: string;
  /** Exercise category */
  category?: string;
  /** Force type */
  force?: 'push' | 'pull' | 'static' | null;
  /** Mechanics: compound or isolation */
  mechanic?: 'compound' | 'isolation' | null;
  /** Image paths from free-exercise-db */
  images?: string[];
  /** Benefits / "Para qué sirve" — functional purpose, muscles trained */
  benefits?: string;
  /** Precautions / warnings — safety notes, common mistakes */
  precautions?: string;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  duration: number;
  focus: 'full' | 'upper' | 'lower' | 'core';
  intensity: 'minimal' | 'light' | 'standard' | 'push';
  score: number;
  completed_rate: number;
  exercises: WorkoutExercise[];
  actual_minutes: number;
  rpe?: 'suave' | 'justo' | 'duro';
  created_at: string;
}

export interface WorkoutExercise {
  exercise_id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  rest: number;
  completed_sets: number;
  completed_reps: number[];
  rpe?: number;
  status: 'pending' | 'done' | 'skipped';
  progressed?: boolean;
}

export interface CheckIn {
  user_id: string;
  date: string;
  sleep: number;
  energy: number;
  stress: number;
  recovery_score: number;
  created_at: string;
}

export interface DigitalTwin {
  user_id: string;
  created_at: string;
  updated_at: string;
  training_style: string;
  motivation_style: 'data' | 'energy' | 'direct' | 'calm';
  avoid: string[];
  best_time: string;
  patterns: {
    completion_rate: number;
    avg_duration: number;
    abandon_rate: number;
    best_hours: Record<string, number>;
  };
  ex_progress: Record<string, { easy: number; last_rpe?: number; hard?: number; last_date?: string; total?: number }>;
  motiv_weights: Record<string, number>;
}

export interface RecoveryScore {
  user_id: string;
  date: string;
  score: number;
  sleep_contribution: number;
  energy_contribution: number;
  stress_contribution: number;
  hrv?: number;
}

export interface HabitScore {
  user_id: string;
  period_start: string;
  period_end: string;
  consistency_pct: number;
  sessions_done: number;
  sessions_target: number;
  /** Inercia reciente (-1 … +1): si las últimas sesiones van por encima o debajo del ritmo objetivo */
  momentum?: number;
}

export interface BehaviorMemory {
  user_id: string;
  pattern: string;
  confidence: number;
  data: Record<string, unknown>;
  updated_at: string;
}

export interface AIEvent {
  id: string;
  user_id: string;
  event: string;
  timestamp: string;
  decision: Record<string, unknown>;
  agent: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Achievement {
  id: string;
  category: 'workouts' | 'streak' | 'intensity' | 'focus' | 'completion' | 'level' | 'boss' | 'hidden' | 'movimiento';
  name: string;
  description: string;
  icon: string;
  tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  condition_type: string;
  condition_value: Record<string, unknown>;
  sort_order: number;
}

export interface UserAchievement {
  achievement_id: string;
  unlocked: boolean;
  unlocked_at: string | null;
  progress_current: number;
  progress_target: number;
}

export interface DecisionEngineInput {
  checkin?: CheckIn;
  last_workout?: Workout;
  consistency: HabitScore;
  recovery?: RecoveryScore;
  twin: DigitalTwin;
  profile: Profile;
}

export interface DecisionEngineOutput {
  action: 'train' | 'restore';
  intensity: 'minimal' | 'light' | 'standard' | 'push';
  duration: number;
  reasons: string[];
  confidence: number;
  recovery_score?: number;
  consistency: HabitScore;
  date?: string;
}

/** Output of TrainingAgent.generate() */
export interface WorkoutPlan {
  focus: 'full' | 'upper' | 'lower' | 'core';
  intensity: 'minimal' | 'light' | 'standard' | 'push';
  duration: number;
  exercises: WorkoutExercise[];
  title: string;
  sets: number;
  rest: number;
}

/** Result saved after completing a session */
export interface SessionResult {
  minutes: number;
  rate: number;
  doneEx: number;
  totalEx: number;
  exs: WorkoutExercise[];
  adapted: boolean;
  rpe?: string;
  motiv?: string;
}

/** 
 * Snapshot del coach de balance capturado al guardar una plantilla
 * (spec CHISPA-UX-002 · capa 02). Patrones como string[] para no acoplar
 * types con selector-engine.
 */
export interface TemplateBalance {
  /** Patrones del enfoque ya cubiertos por la rutina */
  present: string[];
  /** Patrones del enfoque que faltaban al guardar */
  missing: string[];
  /** Score de dopamina 0–100 */
  dopa: number;
  /** Duración total estimada (trabajo + descanso) en minutos */
  durationMin: number;
  /** True si cruzaba el umbral de "ya está bien" al guardar */
  sufficient: boolean;
}

/** 
 * A saved workout template created by the user.
 * Allows neurodivergent users to reduce decision fatigue
 * by reusing their favorite workout structures.
 */
export interface WorkoutTemplate {
  id: string;
  name: string;
  focus: 'full' | 'upper' | 'lower' | 'core';
  exercises: WorkoutExercise[];
  created_at: string;
  last_used?: string;
  /** Balance de patrones y dopamina al guardar (spec CHISPA-UX-002) */
  balance?: TemplateBalance;
}

/**
 * A dated body-weight entry (historial de peso).
 * Almacenado SIEMPRE en métrico canónico (kg); la UI muestra según units.
 */
export interface WeightEntry {
  /** YYYY-MM-DD (una entrada por día) */
  date: string;
  /** Peso en kg */
  weight_kg: number;
}

/**
 * A quick workout log entry — minimal info for "vitacorizar" (log what you did).
 */
export interface QuickLogEntry {
  id: string;
  user_id: string;
  date: string;
  duration: number;
  exercises: { name: string; muscle?: string; sets?: number; reps?: number }[];
  rpe?: 'suave' | 'justo' | 'duro';
  mood?: string;
  notes?: string;
  created_at: string;
}

export interface QuestState {
  selectedTheme: string;
  vaultClaims: Record<string, boolean>;
  bossDefeatedThisWeek: boolean;
  bossDefeatedCount: number;
  lastBossDefeatDate: string | null;
}
/** Ventana horaria del ancla de rutina (habit stacking). */
export type AnchorWindow = 'morning' | 'afternoon' | 'evening';

/** Ancla de rutina configurada: "después de {anchor}, en {ventana}, {minutes} min de movimiento". */
export interface AnchorRoutine {
  anchorId: string;
  window: AnchorWindow;
  minutes: number;
}
