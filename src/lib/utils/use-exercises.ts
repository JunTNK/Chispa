/**
 * Lazy-loaded exercise catalog + custom exercises from IndexedDB.
 *
 * Uses a module-level cache with dynamic import so webpack extracts
 * the 1.62 MB exercises.json into a single shared chunk instead of
 * duplicating it into every screen's lazy chunk.
 *
 * Custom exercises are stored in IndexedDB and merged with the
 * catalog at load time. Custom exercises appear first in the list.
 *
 * For server-side usage (training-agent), import EXERCISE_CATALOG
 * directly from './exercises' — the static import is fine there.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Exercise } from '@/types';
import { getAllCustomExercises, type CustomExercise } from '@/lib/db/custom-exercises-db';

// Module-level cache: shared across all components on the page
let _catalog: Exercise[] | null = null;
let _loadPromise: Promise<Exercise[]> | null = null;

/** Async loader — shared across all callers via module-level cache */
export async function getExercises(): Promise<Exercise[]> {
  if (_catalog) return _catalog;
  if (!_loadPromise) {
    _loadPromise = import('./exercises').then((mod) => {
      _catalog = mod.EXERCISE_CATALOG;
      return _catalog;
    });
  }
  return _loadPromise;
}

/** React hook: returns { exercises, isLoading, reloadCustom } */
export function useExercises(): {
  exercises: Exercise[];
  isLoading: boolean;
  /** Reload custom exercises from IndexedDB (call after create/edit/delete) */
  reloadCustom: () => void;
} {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customSeed, setCustomSeed] = useState(0);

  const loadAll = useCallback(async () => {
    let cancelled = false;
    try {
      const [catalog, custom] = await Promise.all([
        getExercises(),
        getAllCustomExercises().catch(() => [] as CustomExercise[]),
      ]);
      if (!cancelled) {
        // Custom exercises first (user-created, higher relevance)
        setExercises([...custom, ...catalog]);
        setIsLoading(false);
      }
    } catch {
      if (!cancelled) {
        setExercises([]);
        setIsLoading(false);
      }
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const cleanup = loadAll();
    return () => { cleanup.then((fn) => fn?.()); };
  }, [customSeed, loadAll]);

  const reloadCustom = useCallback(() => {
    setCustomSeed((s) => s + 1);
  }, []);

  return { exercises, isLoading, reloadCustom };
}
