'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store';
import {
  computeAchievementContext,
  evaluateAllAchievements,
} from '@/lib/awards/achievements';

/**
 * Hook that evaluates achievements against workout data.
 * Call `evaluate()` after completing a workout to:
 * 1. Compute progress for all achievements
 * 2. Detect newly unlocked achievements
 * 3. Enqueue them for the AchievementToast
 * 4. Persist progress to the store (which syncs to Supabase)
 *
 * Note: Reads state directly from useStore.getState() to avoid stale closures
 * when called from event handlers (e.g., after addWorkout in handleSave).
 */
export function useAchievementEval() {
  const setAchievements = useStore((s) => s.setAchievements);
  const enqueueAchievement = useStore((s) => s.enqueueAchievement);

  const evaluate = useCallback(
    (extra?: {
      adaptationCount?: number;
      rpeJustoCount?: number;
    }) => {
      // Read fresh state to avoid stale closures
      const state = useStore.getState();
      const ctx = computeAchievementContext(state.workouts, extra);
      const { progress, newlyUnlocked } = evaluateAllAchievements(ctx, state.achievements);

      // Persist progress
      setAchievements(progress);

      // Enqueue notifications for newly unlocked achievements
      for (const id of newlyUnlocked) {
        enqueueAchievement(id);
      }

      return { progress, newlyUnlocked };
    },
    [setAchievements, enqueueAchievement]
  );

  return { evaluate };
}
