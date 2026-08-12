'use client';

import { supabase } from '@/lib/db/supabase';
import { useStore } from '@/lib/store';
import { uid as genUid } from '@/lib/utils/helpers';
import type { Profile, DigitalTwin, CheckIn, Workout, WorkoutExercise, ChatMessage, UserAchievement, QuestState, FriendEntry, WeightEntry, CommunityPost } from '@/types';

/* ─── Types ─── */

export interface SyncPayload {
  profile?: Profile;
  neuro?: { type: string; duration: number };
  /** UI language: 'es' | 'en' — vive en el Digital Twin para seguir al usuario entre dispositivos */
  lang?: 'es' | 'en';
  twin?: DigitalTwin;
  workouts?: Workout[];
  checkins?: Record<string, CheckIn>;
  chat?: ChatMessage[];
   achievements?: Record<string, UserAchievement>;
  questState?: QuestState;
  /** Historial de peso (migration 010) — canónico en kg */
  weightHistory?: WeightEntry[];
  /** Fechas (YYYY-MM-DD) de entradas de peso borradas localmente — se borran en el servidor */
  weightHistoryDeleted?: string[];
  /** Social graph (local-first; synced when coopMode != 'none') */
  friends?: FriendEntry[];
  coopMode?: 'none' | 'friends' | 'public';
  /** Feed cooperativo — chispas de movimiento (push propio; pull de la comunidad) */
  communityPosts?: CommunityPost[];
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

export class SupabaseSyncService {
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
        const { error } = await (supabase as any)
          .from('profiles')
          .upsert({
            user_id: uid,
            goal: payload.profile.goal,
            level: payload.profile.level,
            equipment: payload.profile.equipment,
            days_per_week: payload.profile.days_per_week,
            limitations: payload.profile.limitations ?? [],
            // Optional fields from onboarding v3.0
            ...(payload.profile.chronotype && { chronotype: payload.profile.chronotype }),
            ...(payload.profile.medication && { medication: payload.profile.medication }),
            ...(payload.profile.medication_time && { medication_time: payload.profile.medication_time }),
            // Body metrics (migration 009) — canónicas en métrico.
            // Se envían SIEMPRE (null si vacío) para que borrar una medida
            // también se propague al servidor y no quede un valor obsoleto.
            sex: payload.profile.sex ?? null,
            height_cm: payload.profile.height_cm ?? null,
            weight_kg: payload.profile.weight_kg ?? null,
            units: payload.profile.units ?? 'imperial',
            updated_at: new Date().toISOString(),
          });
        if (!error) pushed.push('profile');
      }

      // 2. Neuro profile
      if (payload.neuro) {
        const { error } = await (supabase as any)
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
        const { error } = await (supabase as any)
          .from('digital_twins')
          .upsert({
            user_id: uid,
            // La columna es integer: el EMA de avg_duration puede ser decimal (15.5)
            preferred_duration: Math.round(payload.twin.patterns.avg_duration),
            motivation_style: payload.twin.motivation_style,
            avoid_patterns: payload.twin.avoid ?? [],
            best_hours: payload.twin.patterns.best_hours,
            patterns: payload.twin.patterns as unknown as Record<string, unknown>,
            exercise_progress: payload.twin.ex_progress as unknown as Record<string, unknown>,
            confidence: Math.round(payload.twin.patterns.completion_rate * 100),
            // lang sin default: si el push no lo trae (home/summary/quick-log),
            // supabase omite la clave → INSERT usa 'es', UPDATE no pisa la preferencia
            lang: payload.lang,
            updated_at: new Date().toISOString(),
          });
        if (!error) pushed.push('digital_twin');
      } else if (payload.lang) {
        // Idioma sin twin completo: upsert mínimo (las columnas restantes
        // tienen defaults en el schema, así que el INSERT es válido)
        const { error } = await (supabase as any)
          .from('digital_twins')
          .upsert({
            user_id: uid,
            lang: payload.lang,
            updated_at: new Date().toISOString(),
          });
        if (!error) pushed.push('lang');
      }

      // 4. Workouts (batch upsert - last 30)
      if (payload.workouts && payload.workouts.length > 0) {
        // Dedupe por id: summary manda [...currentWorkouts, w] donde w ya está
        // en currentWorkouts tras addWorkout — un ON CONFLICT no puede tocar
        // la misma fila dos veces en un mismo comando (error 21000).
        const seen = new Set<string>();
        const unique = payload.workouts.filter((w) => {
          const key = w.id || w.date;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const recent = unique.slice(-30).map((w) => {
          // La columna workouts.id es uuid: los workouts locales antiguos
          // (base36, pre-UUID) no caben — se les asigna un UUID nuevo para
          // que el push no falle (no existen filas previas con esos ids).
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(w.id || '');
          const id = isUuid ? w.id : (crypto?.randomUUID?.() ?? genUid());
          return {
            id,
            user_id: uid,
            date: w.date,
            focus: w.focus,
            intensity: w.intensity,
            planned_minutes: w.duration,
            actual_minutes: w.actual_minutes ?? w.duration,
            completed_rate: w.completed_rate,
            planned_sets: w.exercises?.reduce((a: number, e: WorkoutExercise) => a + (e.sets ?? 0), 0) ?? 0,
            done_sets: w.exercises?.filter((e: WorkoutExercise) => e.status === 'done').length ?? 0,
            rpe: w.rpe ?? null,
            adapted: (w as Workout & { adapted?: boolean }).adapted ?? false,
            exercises: w.exercises as unknown as Record<string, unknown>[],
          };
        });

        const { error } = await (supabase as any).from('workouts').upsert(recent, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });
        if (!error) pushed.push(`workouts (${recent.length})`);
      }

      // 5. Quest State
      if (payload.questState) {
        const { error } = await (supabase as any)
          .from('quest_states')
          .upsert({
            user_id: uid,
            selected_theme: payload.questState.selectedTheme,
            vault_claims: payload.questState.vaultClaims,
            boss_defeated_this_week: payload.questState.bossDefeatedThisWeek,
            boss_defeated_count: payload.questState.bossDefeatedCount,
            last_boss_defeat_date: payload.questState.lastBossDefeatDate,
            updated_at: new Date().toISOString(),
          });
        if (!error) pushed.push('quest_state');
      }

      // 6. User Achievements
      if (payload.achievements && Object.keys(payload.achievements).length > 0) {
        const entries = Object.entries(payload.achievements).map(([id, ua]) => ({
          user_id: uid,
          achievement_id: id,
          unlocked: ua.unlocked,
          unlocked_at: ua.unlocked_at,
          progress_current: ua.progress_current,
          progress_target: ua.progress_target,
          updated_at: new Date().toISOString(),
        }));

        const { error } = await (supabase as any).from('user_achievements').upsert(entries, {
          onConflict: 'user_id, achievement_id',
          ignoreDuplicates: false,
        });
        if (!error) pushed.push(`achievements (${entries.length})`);
      }

      // 7. Check-ins (batch upsert)
      if (payload.checkins && Object.keys(payload.checkins).length > 0) {
        const entries = Object.entries(payload.checkins).map(([date, c]) => ({
          user_id: uid,
          date,
          sleep_hours: c.sleep,
          energy: c.energy,
          stress: c.stress,
          recovery_score: c.recovery_score,
        }));

        const { error } = await (supabase as any).from('checkins').upsert(entries, {
          onConflict: 'user_id, date',
          ignoreDuplicates: false,
        });
        if (!error) pushed.push(`checkins (${entries.length})`);
      }

      // 8. Weight history (migration 010)
      // Borrados primero: las fechas eliminadas localmente se borran en el servidor
      // para que un pull posterior no las resucite (local-first, ver profile nulls).
      if (payload.weightHistoryDeleted && payload.weightHistoryDeleted.length > 0) {
        const { error } = await (supabase as any)
          .from('weight_log')
          .delete()
          .eq('user_id', uid)
          .in('date', payload.weightHistoryDeleted);
        if (!error) pushed.push(`weight_log deleted (${payload.weightHistoryDeleted.length})`);
      }
      if (payload.weightHistory && payload.weightHistory.length > 0) {
        const entries = payload.weightHistory.map((e) => ({
          user_id: uid,
          date: e.date,
          weight_kg: e.weight_kg,
        }));
        const { error } = await (supabase as any).from('weight_log').upsert(entries, {
          onConflict: 'user_id, date',
          ignoreDuplicates: false,
        });
        if (!error) pushed.push(`weight_log (${entries.length})`);
      }

      // 9. Community feed — solo mis chispas (la de los demás llegan por pull)
      if (payload.communityPosts && payload.communityPosts.length > 0) {
        const own = payload.communityPosts.filter(
          (p) => p.author_id === '' || p.author_id === uid
        );
        if (own.length > 0) {
          const entries = own.map((p) => ({
            id: p.id,
            user_id: uid,
            author_id: uid,
            kind: p.kind,
            focus: p.focus ?? null,
            duration_min: p.durationMin ?? null,
            created_at: p.created_at,
          }));
          // Tolerante: si la tabla 015 aún no está aplicada, el paso se omite.
          const { error: cpErr } = await (supabase as any)
            .from('community_posts')
            .upsert(entries, { onConflict: 'id', ignoreDuplicates: true });
          if (!cpErr) pushed.push(`community_posts (${entries.length})`);
        }
      }

      // 10. Social graph (friends + coopMode)
      if (payload.coopMode && payload.coopMode !== 'none') {
        const { error: cErr } = await (supabase as any)
          .from('user_profiles')
          .update({ coop_mode: payload.coopMode })
          .eq('user_id', uid);
        if (!cErr) pushed.push('coop_mode');
      }
      if (payload.friends && payload.friends.length > 0) {
        const entries = payload.friends.map((f) => ({
          user_id: uid,
          peer_code: f.id,
          peer_name: f.name,
          joined_at: f.joined_at,
          status: f.status,
        }));
        const { error: fErr } = await (supabase as any).from('friends').upsert(entries, {
          onConflict: 'user_id, peer_code',
          ignoreDuplicates: true,
        });
        if (!fErr) pushed.push(`friends (${entries.length})`);
      }

      this._status = 'synced';
      const result: SyncResult = { success: true, pushed };
      this._lastResult = result;
      this._notify(result);
      return result;
    } catch (err: unknown) {
      this._status = 'error';
      const result: SyncResult = {
        success: false,
        pushed,
        error: err instanceof Error ? err.message : 'Sync push failed',
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
      // maybeSingle: si el usuario no tiene fila, devuelve null en vez del 406
      // (PGRST116) que generaría ruido de consola en cada primer login.
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
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
          neurotype: 'other', // neurotype is in neuro_profiles
          preferred_duration: 20,
          // Body metrics (migration 009)
          sex: profile.sex ?? undefined,
          height_cm: profile.height_cm ?? undefined,
          weight_kg: profile.weight_kg ?? undefined,
          units: profile.units ?? 'imperial',
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };
        pushed.push('profile');
      }

      // 2. Neuro profile
      const { data: neuro } = await (supabase as any)
        .from('neuro_profiles')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      if (neuro) {
        payload.neuro = { type: neuro.type, duration: neuro.duration_minutes };
        pushed.push('neuro_profile');
        if (payload.profile) {
          payload.profile.neurotype = neuro.type;
          payload.profile.preferred_duration = neuro.duration_minutes;
        }
      }

      // 3. Digital Twin
      const { data: twin } = await (supabase as any)
        .from('digital_twins')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      if (twin) {
        const p = twin.patterns as Record<string, unknown> | null;
        payload.twin = {
          user_id: uid,
          created_at: twin.created_at,
          updated_at: twin.updated_at,
          training_style: 'adaptive',
          motivation_style: twin.motivation_style,
          avoid: twin.avoid_patterns ?? [],
          best_time: '',
          patterns: {
            completion_rate: (p?.completion_rate as number) ?? 0.5,
            avg_duration: (p?.avg_duration as number) ?? twin.preferred_duration,
            abandon_rate: (p?.abandon_rate as number) ?? 0.2,
            best_hours: (twin.best_hours ?? {}) as Record<number, number>,
          },
          // Cast ancho: exercise_progress es JSONB y ya guarda los campos de
          // inteligencia (hard, last_date, total) — el pull debe conservarlos
          // para que la afinidad entrenada sobreviva entre sesiones.
          ex_progress: (twin.exercise_progress as Record<string, { easy: number; last_rpe?: number; hard?: number; last_date?: string; total?: number }>) ?? {},
          motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
        };
        pushed.push('digital_twin');
        // El idioma vive en el twin: se restaura al volver a entrar
        if (twin.lang === 'en' || twin.lang === 'es') {
          payload.lang = twin.lang;
        }
      }

      // 4. Workouts (last 90 days)
      // Nota: `last_workout` (usado por el DecisionEngine para fatiga/reentrada)
      // se deriva de este array en la UI (workouts[workouts.length - 1]) —
      // no necesita columna propia en el twin, ya persiste vía esta tabla.
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: workouts } = await (supabase as any)
        .from('workouts')
        .select('*')
        .eq('user_id', uid)
        .gte('date', ninetyDaysAgo.toISOString().slice(0, 10))
        .order('date', { ascending: false });

      if (workouts && workouts.length > 0) {
        payload.workouts = workouts.map((w: Record<string, unknown>) => ({
          id: (w.id as string) ?? '',
          user_id: uid,
          date: w.date as string,
          focus: w.focus as string,
          intensity: w.intensity as string,
          duration: w.planned_minutes as number,
          score: (w.completed_rate as number) * 100,
          completed_rate: w.completed_rate as number,
          exercises: w.exercises ?? [],
          actual_minutes: w.actual_minutes,
          rpe: w.rpe,
          created_at: w.created_at,
        }));
        pushed.push(`workouts (${payload.workouts!.length})`);
      }

      // 5. Quest State
      const { data: questState } = await (supabase as any)
        .from('quest_states')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      if (questState) {
        payload.questState = {
          selectedTheme: questState.selected_theme ?? 'fitness_iniciacion',
          vaultClaims: questState.vault_claims ?? {},
          bossDefeatedThisWeek: questState.boss_defeated_this_week ?? false,
          bossDefeatedCount: questState.boss_defeated_count ?? 0,
          lastBossDefeatDate: questState.last_boss_defeat_date ?? null,
        };
        pushed.push('quest_state');
      }

      // 6. User Achievements
      const { data: achievements } = await (supabase as any)
        .from('user_achievements')
        .select('*')
        .eq('user_id', uid);

      if (achievements && achievements.length > 0) {
        payload.achievements = {};
        for (const ua of achievements) {
          payload.achievements[ua.achievement_id] = {
            achievement_id: ua.achievement_id,
            unlocked: ua.unlocked,
            unlocked_at: ua.unlocked_at,
            progress_current: ua.progress_current,
            progress_target: ua.progress_target,
          };
        }
        pushed.push(`achievements (${Object.keys(payload.achievements).length})`);
      }

      // 7. Check-ins (last 90 days)
      const { data: checkins } = await (supabase as any)
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

      // 8. Weight history (migration 010)
      const { data: weightLog } = await (supabase as any)
        .from('weight_log')
        .select('*')
        .eq('user_id', uid)
        .order('date', { ascending: true });

      if (weightLog && weightLog.length > 0) {
        payload.weightHistory = weightLog.map((w: Record<string, unknown>) => ({
          date: w.date as string,
          weight_kg: Number(w.weight_kg),
        }));
        pushed.push(`weight_log (${payload.weightHistory!.length})`);
      }

      // 9. Community feed (cooperativo — últimas 50 chispas de la comunidad)
      // select-all vía RLS (015): todos leen, cada quien inserta las suyas.
      const { data: communityPosts } = await (supabase as any)
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (communityPosts && communityPosts.length > 0) {
        payload.communityPosts = communityPosts.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          // Las chispas propias se muestran en primera persona; el resto anónimo
          author_id: (p.author_id as string) === uid ? '' : 'anon',
          kind: (p.kind as CommunityPost['kind']),
          focus: (p.focus as CommunityPost['focus']) ?? undefined,
          durationMin: (p.duration_min as number | null) ?? undefined,
          created_at: p.created_at as string,
          reactions: 0,
          myReacted: false,
        }));
        pushed.push(`community_posts (${payload.communityPosts!.length})`);
      }

      this._status = 'synced';
      const result: SyncResult = { success: true, pushed, pulled: payload };
      this._lastResult = result;
      this._notify(result);
      return result;
    } catch (err: unknown) {
      this._status = 'error';
      const result: SyncResult = {
        success: false,
        pushed,
        error: err instanceof Error ? err.message : 'Sync pull failed',
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

  /**
   * Accept a 6-digit invite code via the backend RPC `friends_accept(code)`.
   * Devuelve el perfil del peer si el código es válido, o `null` si falla
   * (RPC no desplegada, code inválido, usuario no autenticado, etc.).
   */
  async acceptInvite(code: string): Promise<Partial<FriendEntry> | null> {
    try {
      const { data, error } = await (supabase as any).rpc('friends_accept', { code });
      if (error) return null;
      return data?.[0] ?? data ?? null;
    } catch {
      return null;
    }
  }

  /* ─── Merge helpers ─── */

  /**
   * Merge local and remote workouts by ID.
   * - Conflicto (mismo ID): gana el que tiene `created_at` más reciente.
   * - Workouts únicos de cada lado: se conservan ambos.
   */
  static mergeWorkouts(local: Workout[], remote: Workout[]): Workout[] {
    const byId = new Map<string, Workout>();

    // Index local workouts
    for (const w of local) {
      byId.set(w.id || w.date, w);
    }

    // Merge remote — si existe conflicto, gana el más reciente
    for (const w of remote) {
      const key = w.id;
      const existing = byId.get(key);
      if (!existing) {
        byId.set(key, w);
      } else if (w.created_at > existing.created_at) {
        byId.set(key, w);
      }
    }

    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  /**
   * Merge local and remote checkins by date.
   * - Conflicto (misma fecha): gana el que tiene `created_at` más reciente.
   * - Check-ins únicos de cada lado: se conservan ambos.
   */
  static mergeCheckins(
    local: Record<string, CheckIn>,
    remote: Record<string, CheckIn>
  ): Record<string, CheckIn> {
    const merged: Record<string, CheckIn> = { ...local };

    for (const [date, rc] of Object.entries(remote)) {
      const lc = merged[date];
      if (!lc) {
        // No existe localmente — agregar
        merged[date] = rc;
      } else if (rc.created_at > lc.created_at) {
        // Conflicto: gana el más reciente
        merged[date] = rc;
      }
    }

    return merged;
  }

  /**
   * Merge local and remote profile.
   * Gana el que tiene `updated_at` más reciente.
   */
  static mergeProfile(local: Profile | null, remote: Profile | null): Profile | null {
    if (!local) return remote;
    if (!remote) return local;
    return remote.updated_at >= local.updated_at ? remote : local;
  }

  /**
   * Merge local and remote Digital Twin.
   * Gana el que tiene `updated_at` más reciente.
   */
  static mergeTwin(local: DigitalTwin | null, remote: DigitalTwin | null): DigitalTwin | null {
    if (!local) return remote;
    if (!remote) return local;
    return remote.updated_at >= local.updated_at ? remote : local;
  }

  /**
   * Merge del feed cooperativo por id (posts inmutables: unión simple).
   * El local gana en conflicto para conservar aplausos y reacciones propias.
   */
  static mergePosts(local: CommunityPost[], remote: CommunityPost[]): CommunityPost[] {
    const byId = new Map<string, CommunityPost>();
    for (const p of local) byId.set(p.id, p);
    for (const p of remote) if (!byId.has(p.id)) byId.set(p.id, p);
    return Array.from(byId.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100);
  }

  /**
   * Merge completo: aplica todas las estrategias a un payload remoto contra el store local.
   * Retorna los datos ya mergeados, listos para cargar en el store.
   */
  static mergePayload(remote: SyncPayload, local: {
    profile: Profile | null;
    twin: DigitalTwin | null;
    workouts: Workout[];
    checkins: Record<string, CheckIn>;
    weightHistory: WeightEntry[];
    communityPosts: CommunityPost[];
  }): SyncPayload {
    const result: SyncPayload = {};

    // Idioma: el remoto gana (sigue al usuario entre dispositivos)
    if (remote.lang) {
      result.lang = remote.lang;
    }

    // Profile: gana el más reciente
    result.profile = SupabaseSyncService.mergeProfile(local.profile, remote.profile ?? null) ?? undefined;

    // Digital Twin: gana el más reciente
    result.twin = SupabaseSyncService.mergeTwin(local.twin, remote.twin ?? null) ?? undefined;

    // Workouts: merge por ID + created_at
    if (remote.workouts || local.workouts.length > 0) {
      result.workouts = SupabaseSyncService.mergeWorkouts(
        local.workouts,
        remote.workouts ?? []
      );
    }

    // Checkins: merge por fecha + created_at
    if (remote.checkins || Object.keys(local.checkins).length > 0) {
      result.checkins = SupabaseSyncService.mergeCheckins(
        local.checkins,
        remote.checkins ?? {}
      );
    }

    // Neuro: solo se actualiza si no existe localmente
    // (se configura una vez durante el onboarding)
    if (remote.neuro && !local.profile) {
      result.neuro = remote.neuro;
    }

    // Weight history: unión por fecha (una entrada por día) — remoto gana
    if (remote.weightHistory || local.weightHistory.length > 0) {
      const byDate = new Map<string, WeightEntry>();
      for (const e of local.weightHistory) byDate.set(e.date, e);
      for (const e of remote.weightHistory ?? []) byDate.set(e.date, e);
      result.weightHistory = Array.from(byDate.values()).sort((a, b) =>
        a.date < b.date ? -1 : 1
      );
    }

    // Feed cooperativo: unión por id (posts inmutables)
    if (remote.communityPosts || local.communityPosts.length > 0) {
      result.communityPosts = SupabaseSyncService.mergePosts(
        local.communityPosts,
        remote.communityPosts ?? []
      );
    }

    // Achievements: merge sync — gana remote si está unlocked, sino local
    if (remote.achievements) {
      result.achievements = {};
      for (const [id, ua] of Object.entries(remote.achievements)) {
        if (ua.unlocked) {
          result.achievements[id] = ua;
        }
      }
    }

    return result;
  }
}

/* ─── Singleton Export ─── */

export const supabaseSync = new SupabaseSyncService();

/* ─── Apply pulled payload to store ─── */

/**
 * Aplica un payload remoto (pull) al store local, con las mismas reglas de
 * merge por timestamp que useSync.pullData. Compartido para que la restauración
 * de sesión (supabase-auth) restaure TODO el estado del usuario — no solo el
 * idioma — y el round-trip (guardar → recargar) conserve el twin entrenado.
 */
export function applyPulledPayload(result: SyncResult): void {
  if (!result.success || !result.pulled) return;
  const store = useStore.getState();

  const mergedData = SupabaseSyncService.mergePayload(result.pulled, {
    profile: store.profile,
    twin: store.twin,
    workouts: store.workouts,
    checkins: store.checkins,
    weightHistory: store.weightHistory,
    communityPosts: store.communityPosts,
  });

  if (mergedData.lang) {
    store.setLang(mergedData.lang);
  }
  if (mergedData.profile) {
    store.setProfile(mergedData.profile);
  }
  if (mergedData.twin) {
    store.setTwin(mergedData.twin);
  }
  if (mergedData.workouts && mergedData.workouts.length > 0) {
    useStore.setState({ workouts: mergedData.workouts });
  }
  if (mergedData.checkins && Object.keys(mergedData.checkins).length > 0) {
    useStore.setState({ checkins: mergedData.checkins });
  }
  if (mergedData.weightHistory && mergedData.weightHistory.length > 0) {
    useStore.setState({ weightHistory: mergedData.weightHistory });
  }
  if (mergedData.neuro) {
    store.setNeuro(mergedData.neuro);
  }
  if (mergedData.achievements && Object.keys(mergedData.achievements).length > 0) {
    store.setAchievements(mergedData.achievements);
  }
  if (mergedData.questState) {
    store.setQuestState(mergedData.questState);
  }
  if (mergedData.communityPosts) {
    useStore.setState({ communityPosts: mergedData.communityPosts });
  }
}
