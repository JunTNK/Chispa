// ═══════════════════════════════════════════════════════════════
//  EXERCISE CATALOG — TypeScript wrapper
//  Merged from:
//    - wger/wger-data (Spanish names & descriptions)
//    - free-exercise-db (equipment, difficulty, images, force, mechanic)
//
//  Sources:
//    https://github.com/wger-project/wger
//    https://github.com/yuhonas/free-exercise-db
//
//  Generated: 2026-07-31
//  Exercises: 1110
// ═══════════════════════════════════════════════════════════════

import { Exercise } from '@/types';
import raw from './exercises.json';

export const EXERCISE_CATALOG: Exercise[] = raw as Exercise[];
