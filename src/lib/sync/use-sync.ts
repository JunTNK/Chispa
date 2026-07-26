'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store';
import { supabaseSync, type SyncResult } from './supabase-sync';

/**
 * Hook that provides sync capabilities to components.
 * Fires sync when user is authenticated and data changes.
 */
export function useSync() {
  const profile = useStore((s) => s.profile);
  const twin = useStore((s) => s.twin);
  const neuro = useStore((s) => s.neuro);
  const checkins = useStore((s) => s.checkins);
  const workouts = useStore((s) => s.workouts);

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
    });
  }, [profile, neuro, twin, checkins, workouts]);

  /**
   * Pull data from Supabase and load into store.
   */
  const pullData = useCallback(async (): Promise<SyncResult> => {
    const result = await supabaseSync.pull();
    if (result.success && result.pulled) {
      const store = useStore.getState();
      const p = result.pulled;

      if (p.profile) {
        store.setProfile(p.profile);
      }
      if (p.twin) {
        store.setTwin(p.twin);
      }
      if (p.workouts && p.workouts.length > 0) {
        // Merge: server data replaces local if local is empty
        const local = store.workouts;
        if (local.length === 0) {
          for (const w of p.workouts) {
            store.addWorkout(w);
          }
        }
      }
      if (p.checkins && Object.keys(p.checkins).length > 0) {
        const local = store.checkins;
        if (Object.keys(local).length === 0) {
          for (const [date, c] of Object.entries(p.checkins)) {
            store.setCheckin(date, c);
          }
        }
      }
    }
    return result;
  }, []);

  return { pushData, pullData, sync: supabaseSync };
}
