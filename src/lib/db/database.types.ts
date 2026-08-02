/**
 * CHISPA — Database types for typed Supabase queries.
 *
 * These types match the SQL schema defined in supabase/migrations/.
 * They enable type-safe `.from<TableName>()` calls in supabase-js v2.
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          birthdate: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          birthdate?: string | null;
        };
        Update: {
          email?: string;
          name?: string;
          birthdate?: string | null;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          user_id: string;
          goal: 'fuerza' | 'energia' | 'grasa';
          level: 'inicio' | 'medio' | 'regular';
          equipment: 'ninguno' | 'mancuernas' | 'gimnasio';
          limitations: string[];
          days_per_week: '2-3' | '4-5' | 'flex';
          neurotype: 'adh-c' | 'adh-i' | 'audhd' | 'spd' | 'curious' | 'other';
          preferred_duration: 10 | 20 | 30;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          goal: 'fuerza' | 'energia' | 'grasa';
          level: 'inicio' | 'medio' | 'regular';
          equipment: 'ninguno' | 'mancuernas' | 'gimnasio';
          limitations?: string[];
          days_per_week: '2-3' | '4-5' | 'flex';
          neurotype?: 'adh-c' | 'adh-i' | 'audhd' | 'spd' | 'curious' | 'other';
          preferred_duration?: 10 | 20 | 30;
        };
        Update: {
          goal?: 'fuerza' | 'energia' | 'grasa';
          level?: 'inicio' | 'medio' | 'regular';
          equipment?: 'ninguno' | 'mancuernas' | 'gimnasio';
          limitations?: string[];
          days_per_week?: '2-3' | '4-5' | 'flex';
          neurotype?: 'adh-c' | 'adh-i' | 'audhd' | 'spd' | 'curious' | 'other';
          preferred_duration?: 10 | 20 | 30;
          updated_at?: string;
        };
      };
      neuro_profiles: {
        Row: {
          user_id: string;
          type: string;
          duration_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          type: string;
          duration_minutes: number;
        };
        Update: {
          type?: string;
          duration_minutes?: number;
          updated_at?: string;
        };
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          duration: number;
          focus: 'full' | 'upper' | 'lower' | 'core';
          intensity: 'minimal' | 'light' | 'standard' | 'push';
          score: number;
          completed_rate: number;
          exercises: Record<string, unknown>[];
          actual_minutes: number;
          rpe: 'suave' | 'justo' | 'duro' | null;
          planned_minutes?: number;
          done_sets?: number;
          planned_sets?: number;
          adapted?: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          duration: number;
          focus: 'full' | 'upper' | 'lower' | 'core';
          intensity: 'minimal' | 'light' | 'standard' | 'push';
          score?: number;
          completed_rate?: number;
          exercises: Record<string, unknown>[];
          actual_minutes?: number;
          rpe?: 'suave' | 'justo' | 'duro' | null;
          planned_minutes?: number;
          done_sets?: number;
          planned_sets?: number;
          adapted?: boolean;
        };
        Update: {
          duration?: number;
          focus?: 'full' | 'upper' | 'lower' | 'core';
          intensity?: 'minimal' | 'light' | 'standard' | 'push';
          score?: number;
          completed_rate?: number;
          exercises?: Record<string, unknown>[];
          actual_minutes?: number;
          rpe?: 'suave' | 'justo' | 'duro' | null;
          adapted?: boolean;
        };
      };
      checkins: {
        Row: {
          user_id: string;
          date: string;
          sleep_hours: number;
          energy: number;
          stress: number;
          recovery_score: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          sleep_hours: number;
          energy: number;
          stress: number;
          recovery_score: number;
        };
        Update: {
          sleep_hours?: number;
          energy?: number;
          stress?: number;
          recovery_score?: number;
        };
      };
      digital_twins: {
        Row: {
          user_id: string;
          created_at: string;
          updated_at: string;
          training_style: string | null;
          motivation_style: 'data' | 'energy' | 'direct' | 'calm';
          avoid_patterns: string[];
          best_time: string | null;
          patterns: Record<string, unknown>;
          exercise_progress: Record<string, unknown>;
          motiv_weights: Record<string, number>;
          preferred_duration: number;
          confidence: number;
          best_hours: Record<string, number>;
          /** UI language: 'es' (default) or 'en' — follows the user across devices */
          lang: 'es' | 'en';
        };
        Insert: {
          user_id: string;
          training_style?: string;
          motivation_style?: 'data' | 'energy' | 'direct' | 'calm';
          avoid_patterns?: string[];
          best_time?: string | null;
          patterns?: Record<string, unknown>;
          exercise_progress?: Record<string, unknown>;
          motiv_weights?: Record<string, number>;
          preferred_duration?: number;
          confidence?: number;
          best_hours?: Record<string, number>;
          lang?: 'es' | 'en';
        };
        Update: {
          training_style?: string;
          motivation_style?: 'data' | 'energy' | 'direct' | 'calm';
          avoid_patterns?: string[];
          best_time?: string | null;
          patterns?: Record<string, unknown>;
          exercise_progress?: Record<string, unknown>;
          motiv_weights?: Record<string, number>;
          preferred_duration?: number;
          confidence?: number;
          best_hours?: Record<string, number>;
          lang?: 'es' | 'en';
          updated_at?: string;
        };
      };
      quest_states: {
        Row: {
          user_id: string;
          selected_theme: string;
          vault_claims: Record<string, boolean>;
          boss_defeated_this_week: boolean;
          boss_defeated_count: number;
          last_boss_defeat_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          selected_theme?: string;
          vault_claims?: Record<string, boolean>;
          boss_defeated_this_week?: boolean;
          boss_defeated_count?: number;
          last_boss_defeat_date?: string | null;
        };
        Update: {
          selected_theme?: string;
          vault_claims?: Record<string, boolean>;
          boss_defeated_this_week?: boolean;
          boss_defeated_count?: number;
          last_boss_defeat_date?: string | null;
          updated_at?: string;
        };
      };
      leaderboard: {
        Row: {
          user_id: string;
          total_xp: number;
          level: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_xp?: number;
          level?: number;
        };
        Update: {
          total_xp?: number;
          level?: number;
          updated_at?: string;
        };
      };
      user_achievements: {
        Row: {
          user_id: string;
          achievement_id: string;
          unlocked: boolean;
          unlocked_at: string | null;
          progress_current: number;
          progress_target: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          achievement_id: string;
          unlocked?: boolean;
          unlocked_at?: string | null;
          progress_current?: number;
          progress_target: number;
        };
        Update: {
          unlocked?: boolean;
          unlocked_at?: string | null;
          progress_current?: number;
          progress_target?: number;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
