import { describe, it, expect } from 'vitest';
import {
  baseXpForTier,
  xpPerTask,
  applyQuestResult,
} from '../quest-engine';
import { PlayerState } from '../types';

const basePlayer: PlayerState = {
  totalXp: 0,
  rank: 'E',
  unlockedTitles: {},
  questStats: { minCompleted: 0, midCompleted: 0, fullCompleted: 0 },
};

describe('quest-engine.ts', () => {
  describe('baseXpForTier', () => {
    it('returns 10 for min tier', () => {
      expect(baseXpForTier('min')).toBe(10);
    });

    it('returns 25 for mid tier', () => {
      expect(baseXpForTier('mid')).toBe(25);
    });

    it('returns 50 for full tier', () => {
      expect(baseXpForTier('full')).toBe(50);
    });
  });

  describe('xpPerTask', () => {
    it('returns 2 for min tier', () => {
      expect(xpPerTask('min')).toBe(2);
    });

    it('returns 5 for mid tier', () => {
      expect(xpPerTask('mid')).toBe(5);
    });

    it('returns 10 for full tier', () => {
      expect(xpPerTask('full')).toBe(10);
    });
  });

  describe('applyQuestResult', () => {
    it('tier mínimo suma 10 XP base + 2 XP por tarea con 1 tarea', () => {
      const tasks = [{ taskId: 't1', completed: true, energySpent: 2 }];
      const newState = applyQuestResult(basePlayer, tasks, 'min');
      // baseXp(10) + taskXp(2*1) + energyXp(2*0.5) = 10 + 2 + 1 = 13
      expect(newState.totalXp).toBe(13);
      expect(newState.questStats.minCompleted).toBe(1);
    });

    it('applyQuestResult nunca baja totalXp ni rank', () => {
      const highRankPlayer: PlayerState = {
        ...basePlayer,
        totalXp: 10000,
        rank: 'C',
      };
      const tasks = [{ taskId: 't1', completed: true, energySpent: 1 }];
      const newState = applyQuestResult(highRankPlayer, tasks, 'min');
      expect(newState.totalXp).toBeGreaterThanOrEqual(10000);
      expect(['C', 'B', 'A', 'S']).toContain(newState.rank);
    });

    it('cada tarea completada suma +1 a questStats correspondiente', () => {
      const tasks = [
        { taskId: 't1', completed: true, energySpent: 4 },
        { taskId: 't2', completed: true, energySpent: 4 },
        { taskId: 't3', completed: true, energySpent: 4 },
      ];
      const newState = applyQuestResult(basePlayer, tasks, 'mid');
      expect(newState.questStats.midCompleted).toBe(1);
    });

    it('no baja rank aunque el resultado sea mínimo', () => {
      const highPlayer: PlayerState = {
        ...basePlayer,
        totalXp: 50000,
        rank: 'A',
      };
      const tasks = [{ taskId: 't1', completed: false, energySpent: 0 }];
      const newState = applyQuestResult(highPlayer, tasks, 'min');
      expect(newState.rank).toBe('A');
    });
  });
});