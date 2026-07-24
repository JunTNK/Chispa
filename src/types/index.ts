export interface User {
  id: string;
  email: string;
  name: string;
  birthdate: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  name: string;
  goal: 'fuerza' | 'energia' | 'grasa';
  level: 'inicio' | 'medio' | 'regular';
  equipment: 'ninguno' | 'mancuernas' | 'gimnasio';
  limitations: string[];
  days_per_week: '2-3' | '4-5' | 'flex';
  neurotype: 'tdah' | 'neuro' | 'nose';
  preferred_duration: number;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  difficulty: 1 | 2 | 3;
  equipment: 'ninguno' | 'mancuernas' | 'gimnasio';
  video_url?: string;
  instructions: string;
  load_type: 'reps' | 'time';
  cognitive_load: 'low' | 'med' | 'high';
  emoji: string;
  cue: string;
  secondary_muscles?: string[];
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
    best_hours: Record<number, number>;
  };
  ex_progress: Record<string, { easy: number; last_rpe?: number }>;
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