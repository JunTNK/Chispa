import { PlayerState, QuestTier, ResolvedTask } from './types';

export interface QuestState {
  energy: number;
  totalXp: number;
  rank: 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
  stats: {
    focus: number;
    adaptability: number;
    consistency: number;
  };
}

export function tierForEnergy(energy: number): QuestTier {
  if (energy <= 3) return 'min';
  if (energy <= 6) return 'mid';
  return 'full';
}

export function baseXpForTier(tier: QuestTier): number {
  switch (tier) {
    case 'min':
      return 10;
    case 'mid':
      return 25;
    case 'full':
      return 50;
    default:
      return 10;
  }
}

export function xpPerTask(tier: QuestTier): number {
  return tier === 'min' ? 2 : tier === 'mid' ? 5 : 10;
}

export function applyQuestResult(
  player: PlayerState,
  tasks: ResolvedTask[],
  tier: QuestTier
): PlayerState {
  const baseXp = baseXpForTier(tier);
  const completedCount = tasks.filter((t) => t.completed).length;
  const taskXp = xpPerTask(tier) * completedCount;
  const totalEnergy = tasks.filter((t) => t.completed).reduce((sum, t) => sum + t.energySpent, 0);
  const energyXp = totalEnergy * 0.5;
  const totalXpGain = Math.round(baseXp + taskXp + energyXp);

  const newTotalXp = player.totalXp + totalXpGain;
  const newRank = rankFromXp(newTotalXp);

  const newQuestStats = { ...player.questStats };
  if (tier === 'min') newQuestStats.minCompleted += 1;
  if (tier === 'mid') newQuestStats.midCompleted += 1;
  if (tier === 'full') newQuestStats.fullCompleted += 1;

  return {
    ...player,
    totalXp: newTotalXp,
    rank: maxRank(player.rank, newRank),
    questStats: newQuestStats,
  };
}

function rankFromXp(xp: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'E' {
  if (xp >= 100000) return 'S';
  if (xp >= 20000) return 'A';
  if (xp >= 5000) return 'B';
  if (xp >= 1000) return 'C';
  if (xp >= 100) return 'D';
  return 'E';
}

function maxRank(a: 'S' | 'A' | 'B' | 'C' | 'D' | 'E', b: 'S' | 'A' | 'B' | 'C' | 'D' | 'E'): 'S' | 'A' | 'B' | 'C' | 'D' | 'E' {
  const order: Record<string, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1 };
  return order[a] >= order[b] ? a : b;
}

export const EMPTY_PLAYER: PlayerState = {
  totalXp: 0,
  rank: 'E',
  unlockedTitles: {},
  questStats: {
    minCompleted: 0,
    midCompleted: 0,
    fullCompleted: 0,
  },
};