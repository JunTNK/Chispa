'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store';
import { supabaseSync, SupabaseSyncService, type SyncResult } from './supabase-sync';

/**
 * Hook that provides sync capabilities to components.
 * Syncs bidirectionally with Supabase using timestamp-based merge strategy.
 * Now includes achievements push/pull.
 */
export function useSync() {
  const profile = useStore((s) => s.profile);
  const twin = useStore((s) => s.twin);
  const neuro = useStore((s) => s.neuro);
  const checkins = useStore((s) => s.checkins);
  const workouts = useStore((s) => s.workouts);
  const achievements = useStore((s) => s.achievements);
  const questState = useStore((s) => s.questState);

  /**
   * Push current store data to Supabase.
   * Only pushes data that exists (ignores null values).
   */
  const pushData = useCallback(async (): Promise<SyncResult> => {
    return supabaseSync.push({
      profile: profile ?? undefined,
      neuro: neuro ?? undefined,
      twin: twin ?? undefined,
      checkins: checkins ?? undefined,
      workouts: workouts ?? undefined,
      achievements: achievements ?? undefined,
      questState: questState ?? undefined,
    });
  }, [profile, neuro, twin, checkins, workouts, achievements, questState]);

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
    if (result.success && result.pulled) {
      const store = useStore.getState();

      const mergedData = SupabaseSyncService.mergePayload(result.pulled, {
        profile: store.profile,
        twin: store.twin,
        workouts: store.workouts,
        checkins: store.checkins,
      });

      // Apply merged data to store
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
      if (mergedData.neuro) {
        store.setNeuro(mergedData.neuro);
      }
      if (mergedData.achievements && Object.keys(mergedData.achievements).length > 0) {
        store.setAchievements(mergedData.achievements);
      }
      if (mergedData.questState) {
        store.setQuestState(mergedData.questState);
      }
    }
    return result;
  }, []);

  return { pushData, pullData, sync: supabaseSync };
}
