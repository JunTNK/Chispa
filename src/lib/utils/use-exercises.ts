/**
 * Lazy-loaded exercise catalog.
 *
 * Uses a module-level cache with dynamic import so webpack extracts
 * the 1.62 MB exercises.json into a single shared chunk instead of
 * duplicating it into every screen's lazy chunk.
 *
 * For server-side usage (training-agent), import EXERCISE_CATALOG
 * directly from './exercises' — the static import is fine there.
 */
'use client';

import { useState, useEffect } from 'react';
import type { Exercise } from '@/types';

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

/** React hook: returns { exercises, isLoading } */
export function useExercises(): { exercises: Exercise[]; isLoading: boolean } {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getExercises().then((data) => {
      if (!cancelled) {
        setExercises(data);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return { exercises, isLoading };
}
