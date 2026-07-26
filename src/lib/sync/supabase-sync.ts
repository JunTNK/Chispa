'use client';

import { supabase as rawSupabase } from '@/lib/db/supabase';
import type { Profile, DigitalTwin, CheckIn, Workout, ChatMessage } from '@/types';

// Safe cast: the Proxy pattern in supabase.ts doesn't resolve types correctly for chained calls
const supabase = rawSupabase as any;

/* ─── Types ─── */

export interface SyncPayload {
  profile?: Profile;
  neuro?: { type: string; duration: number };
  twin?: DigitalTwin;
  workouts?: Workout[];
  checkins?: Record<string, CheckIn>;
  chat?: ChatMessage[];
}

export interface SyncResult {
  success: boolean;
  pushed: string[];
  pulled?: SyncPayload;
  error?: string;
}

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

type SyncListener = (status: SyncStatus, result?: SyncResult) => void;

/* ─── Sync Service ─── */

class SupabaseSyncService {
  private _listeners: Set<SyncListener> = new Set();
  private _status: SyncStatus = 'idle';
  private _lastResult: SyncResult | null = null;
  private _syncInProgress = false;

  /* ─── Status ─── */

  get status() { return this._status; }
  get lastResult() { return this._lastResult; }

  subscribe(cb: SyncListener): () => void {
    this._listeners.add(cb);
    return () => { this._listeners.delete(cb); };
  }

  private _notify(result?: SyncResult) {
    for (const cb of this._listeners) {
      try { cb(this._status, result); } catch { /* ignore */ }
    }
  }

  /* ─── Auth ─── */

  private async _getUserId(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.user?.id ?? null;
    } catch {
      return null;
    }
  }

  /** Returns true if user is authenticated with Supabase */
  async isAuthenticated(): Promise<boolean> {
    const uid = await this._getUserId();
    return uid !== null;
  }

  /* ─── Push ─── */

  /**
   * Push local data to Supabase. Uses upsert (INSERT ON CONFLICT UPDATE).
   * Falls back gracefully if not authenticated or Supabase not configured.
   */
  async push(payload: SyncPayload): Promise<SyncResult> {
    const uid = await this._getUserId();
    if (!uid) {
      return { success: false, pushed: [], error: 'Not authenticated' };
    }

    this._status = 'syncing';
    this._notify();
    const pushed: string[] = [];

    try {
      // 1. Profile
      if (payload.profile) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            user_id: uid,
            goal: payload.profile.goal,
            level: payload.profile.level,
            equipment: payload.profile.equipment,
            days_per_week: payload.profile.days_per_week,
            limitations: payload.profile.limitations ?? [],
            updated_at: new Date().toISOString(),
          });
        if (!error) pushed.push('profile');
      }

      // 2. Neuro profile
      if (payload.neuro) {
        const { error } = await supabase
          .from('neuro_profiles')
          .upsert({
            user_id: uid,
            type: payload.neuro.type,
            duration_minutes: payload.neuro.duration,
            updated_at: new Date().toISOString(),
          });
        if (!error) pushed.push('neuro_profile');
      }

      // 3. Digital Twin
      if (payload.twin) {
        const { error } = await supabase
          .from('digital_twins')
          .upsert({
            user_id: uid,
            preferred_duration: payload.twin.patterns.avg_duration,
            motivation_style: payload.twin.motivation_style,
            avoid_patterns: payload.twin.avoid ?? [],
            best_hours: payload.twin.patterns.best_hours,
            patterns: payload.twin.patterns as any,
            exercise_progress: payload.twin.ex_progress as any,
            confidence: Math.round(payload.twin.patterns.completion_rate * 100),
            updated_at: new Date().toISOString(),
          });
        if (!error) pushed.push('digital_twin');
      }

      // 4. Workouts (batch upsert - last 30)
      if (payload.workouts && payload.workouts.length > 0) {
        const recent = payload.workouts.slice(-30).map((w) => ({
          id: w.id || `workout_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          user_id: uid,
          date: w.date,
          focus: w.focus,
          intensity: w.intensity,
          planned_minutes: w.duration,
          actual_minutes: w.actual_minutes ?? w.duration,
          completed_rate: w.completed_rate,
          planned_sets: w.exercises?.reduce((a: number, e: any) => a + (e.sets ?? 0), 0) ?? 0,
          done_sets: w.exercises?.filter((e: any) => e.status === 'done').length ?? 0,
          rpe: (w as any).rpe ?? null,
          adapted: (w as any).adapted ?? false,
          exercises: w.exercises as any,
        }));

        const { error } = await supabase.from('workouts').upsert(recent, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });
        if (!error) pushed.push(`workouts (${recent.length})`);
      }

      // 5. Check-ins (batch upsert)
      if (payload.checkins && Object.keys(payload.checkins).length > 0) {
        const entries = Object.entries(payload.checkins).map(([date, c]) => ({
          user_id: uid,
          date,
          sleep_hours: c.sleep,
          energy: c.energy,
          stress: c.stress,
          recovery_score: c.recovery_score,
        }));

        const { error } = await supabase.from('checkins').upsert(entries, {
          onConflict: 'user_id, date',
          ignoreDuplicates: false,
        });
        if (!error) pushed.push(`checkins (${entries.length})`);
      }

      this._status = 'synced';
      const result: SyncResult = { success: true, pushed };
      this._lastResult = result;
      this._notify(result);
      return result;
    } catch (err: any) {
      this._status = 'error';
      const result: SyncResult = {
        success: false,
        pushed,
        error: err?.message ?? 'Sync push failed',
      };
      this._lastResult = result;
      this._notify(result);
      return result;
    }
  }

  /* ─── Pull ─── */

  /**
   * Pull all user data from Supabase.
   * Returns data that can be loaded into the Zustand store.
   */
  async pull(): Promise<SyncResult> {
    const uid = await this._getUserId();
    if (!uid) {
      return { success: false, pushed: [], error: 'Not authenticated' };
    }

    this._status = 'syncing';
    this._notify();
    const pushed: string[] = [];

    try {
      const payload: SyncPayload = {};

      // 1. Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', uid)
        .single();
      if (profile) {
        const { data: { user } } = await supabase.auth.getUser();
        const name = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '';
        payload.profile = {
          user_id: uid,
          name,
          goal: profile.goal,
          level: profile.level,
          equipment: profile.equipment,
          limitations: profile.limitations ?? [],
          days_per_week: profile.days_per_week,
          neurotype: 'nose', // neurotype is in neuro_profiles
          preferred_duration: 20,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };
        pushed.push('profile');
      }

      // 2. Neuro profile
      const { data: neuro } = await supabase
        .from('neuro_profiles')
        .select('*')
        .eq('user_id', uid)
        .single();
      if (neuro) {
        payload.neuro = { type: neuro.type, duration: neuro.duration_minutes };
        pushed.push('neuro_profile');
        if (payload.profile) {
          payload.profile.neurotype = neuro.type;
          payload.profile.preferred_duration = neuro.duration_minutes;
        }
      }

      // 3. Digital Twin
      const { data: twin } = await supabase
        .from('digital_twins')
        .select('*')
        .eq('user_id', uid)
        .single();
      if (twin) {
        const patterns = (twin.patterns as any) ?? {};
        payload.twin = {
          user_id: uid,
          created_at: twin.created_at,
          updated_at: twin.updated_at,
          training_style: 'adaptive',
          motivation_style: twin.motivation_style,
          avoid: twin.avoid_patterns ?? [],
          best_time: '',
          patterns: {
            completion_rate: patterns.completion_rate ?? 0.5,
            avg_duration: patterns.avg_duration ?? twin.preferred_duration,
            abandon_rate: patterns.abandon_rate ?? 0.2,
            best_hours: (twin.best_hours as Record<number, number>) ?? {},
          },
          ex_progress: (twin.exercise_progress as Record<string, { easy: number; last_rpe?: number }>) ?? {},
          motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
        };
        pushed.push('digital_twin');
      }

      // 4. Workouts (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: workouts } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', uid)
        .gte('date', ninetyDaysAgo.toISOString().slice(0, 10))
        .order('date', { ascending: false });

      if (workouts && workouts.length > 0) {
        payload.workouts = workouts.map((w: any) => ({
          id: w.id ?? '',
          user_id: uid,
          date: w.date,
          focus: w.focus,
          intensity: w.intensity,
          duration: w.planned_minutes,
          score: w.completed_rate * 100,
          completed_rate: w.completed_rate,
          exercises: w.exercises ?? [],
          actual_minutes: w.actual_minutes,
          rpe: w.rpe,
          created_at: w.created_at,
        }));
        pushed.push(`workouts (${payload.workouts!.length})`);
      }

      // 5. Check-ins (last 90 days)
      const { data: checkins } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', uid)
        .gte('date', ninetyDaysAgo.toISOString().slice(0, 10));

      if (checkins && checkins.length > 0) {
        payload.checkins = {};
        for (const c of checkins) {
          payload.checkins[c.date] = {
            user_id: uid,
            date: c.date,
            sleep: c.sleep_hours,
            energy: c.energy,
            stress: c.stress,
            recovery_score: c.recovery_score,
            created_at: c.created_at ?? '',
          };
        }
        pushed.push(`checkins (${Object.keys(payload.checkins).length})`);
      }

      this._status = 'synced';
      const result: SyncResult = { success: true, pushed, pulled: payload };
      this._lastResult = result;
      this._notify(result);
      return result;
    } catch (err: any) {
      this._status = 'error';
      const result: SyncResult = {
        success: false,
        pushed,
        error: err?.message ?? 'Sync pull failed',
      };
      this._lastResult = result;
      this._notify(result);
      return result;
    }
  }

  /** Convenience: push then pull */
  async sync(payload: SyncPayload): Promise<SyncResult> {
    const pushResult = await this.push(payload);
    if (!pushResult.success) return pushResult;
    return this.pull();
  }

  /** Reset status */
  reset() {
    this._status = 'idle';
    this._lastResult = null;
    this._notify();
  }
}

/* ─── Singleton Export ─── */

export const supabaseSync = new SupabaseSyncService();
