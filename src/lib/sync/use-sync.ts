'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store';
import { supabaseSync, applyPulledPayload, type SyncResult } from './supabase-sync';

/**
 * Hook that provides sync capabilities to components.
 * Syncs bidirectionally with Supabase using timestamp-based merge strategy.
 * Now includes achievements push/pull.
 */
export function useSync() {
  const profile = useStore((s) => s.profile);
  const lang = useStore((s) => s.lang);
  const twin = useStore((s) => s.twin);
  const neuro = useStore((s) => s.neuro);
  const checkins = useStore((s) => s.checkins);
  const workouts = useStore((s) => s.workouts);
  const achievements = useStore((s) => s.achievements);
  const questState = useStore((s) => s.questState);
  const communityPosts = useStore((s) => s.communityPosts);

  /**
   * Push current store data to Supabase.
   * Only pushes data that exists (ignores null values).
   */
  const pushData = useCallback(async (): Promise<SyncResult> => {
    return supabaseSync.push({
      profile: profile ?? undefined,
      lang,
      neuro: neuro ?? undefined,
      twin: twin ?? undefined,
      checkins: checkins ?? undefined,
      workouts: workouts ?? undefined,
      achievements: achievements ?? undefined,
      questState: questState ?? undefined,
      communityPosts: communityPosts ?? undefined,
    });
  }, [profile, lang, neuro, twin, checkins, workouts, achievements, questState, communityPosts]);

  /**
   * Pull data from Supabase and merge into local store.
   * Uses timestamp-based conflict resolution:
   * - Workouts: merge por ID, gana el más reciente por created_at
   * - Checkins: merge por fecha, gana el más reciente por created_at
   * - Profile/Twin: gana el más reciente por updated_at
   * - Achievements: remote unlocked wins
   */
  const pullData = useCallback(async (): Promise<SyncResult> => {
    const result = await supabaseSync.pull();
    applyPulledPayload(result);
    return result;
  }, []);

  return { pushData, pullData, sync: supabaseSync };
}
