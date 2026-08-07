export type Rank = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export type ThemeCategory = 'fitness' | 'taino' | 'arquetipo' | 'elemental' | 'biblico' | 'none';

export type QuestTier = 'min' | 'mid' | 'full';

export interface ResolvedTask {
  taskId: string;
  completed: boolean;
  energySpent: number;
}

export interface Title {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface QuestResult {
  tier: 'min' | 'mid' | 'full';
  tasksCompleted: number;
  energySpent: number;
}

export interface TitleState {
  unlocked: boolean;
  unlockedAt?: string;
}

export interface PlayerState {
  totalXp: number;
  rank: Rank;
  unlockedTitles: Record<string, TitleState>;
  questStats: {
    minCompleted: number;
    midCompleted: number;
    fullCompleted: number;
  };
}

export const RANK_THRESHOLDS: Record<Rank, number> = {
  E: 0,
  D: 100,
  C: 1000,
  B: 5000,
  A: 20000,
  S: 100000,
};

export const RANK_ORDER: Rank[] = ['S', 'A', 'B', 'C', 'D', 'E'];

export function rankFromXp(xp: number): Rank {
  if (xp >= RANK_THRESHOLDS.S) return 'S';
  if (xp >= RANK_THRESHOLDS.A) return 'A';
  if (xp >= RANK_THRESHOLDS.B) return 'B';
  if (xp >= RANK_THRESHOLDS.C) return 'C';
  if (xp >= RANK_THRESHOLDS.D) return 'D';
  return 'E';
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // XP curve: level 2 = 100, then exponential
  return Math.round(100 * Math.pow(1.5, level - 2));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}