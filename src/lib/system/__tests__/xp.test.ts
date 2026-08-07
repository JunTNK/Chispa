import { describe, it, expect } from 'vitest';
import { levelFromTotalXp, xpForLevel, rankFromXp, rankForLevel, maxRank, xpForRank } from '../xp';

describe('xp.ts', () => {
  describe('levelFromTotalXp', () => {
    it('returns level 1 for 0 XP', () => {
      expect(levelFromTotalXp(0)).toEqual({ level: 1, xp: 0 });
    });

    it('returns level 1 for XP below 100', () => {
      expect(levelFromTotalXp(50)).toEqual({ level: 1, xp: 50 });
      expect(levelFromTotalXp(99)).toEqual({ level: 1, xp: 99 });
    });

    it('returns level 2 for exactly 100 XP', () => {
      expect(levelFromTotalXp(100)).toEqual({ level: 2, xp: 100 });
    });

    it('returns level 4 for 250 XP', () => {
      expect(levelFromTotalXp(250)).toEqual({ level: 4, xp: 250 });
    });

    it('monotonicity: level never decreases as XP increases', () => {
      let prevLevel = 1;
      for (let xp = 0; xp <= 200000; xp += 173) {
        const { level } = levelFromTotalXp(xp);
        expect(level).toBeGreaterThanOrEqual(prevLevel);
        prevLevel = level;
      }
    });
  });

  describe('xpForLevel', () => {
    it('returns 0 for level 1', () => {
      expect(xpForLevel(1)).toBe(0);
    });

    it('returns 100 for level 2', () => {
      expect(xpForLevel(2)).toBe(100);
    });

    it('returns 150 for level 3 (100 * 1.5)', () => {
      expect(xpForLevel(3)).toBe(150);
    });

    it('returns 225 for level 4 (150 * 1.5)', () => {
      expect(xpForLevel(4)).toBe(225);
    });
  });

  describe('rankFromXp', () => {
    it('returns E for 0 XP', () => {
      expect(rankFromXp(0)).toBe('E');
    });

    it('returns D for 100 XP', () => {
      expect(rankFromXp(100)).toBe('D');
    });

    it('returns C for 1000 XP', () => {
      expect(rankFromXp(1000)).toBe('C');
    });

    it('returns B for 5000 XP', () => {
      expect(rankFromXp(5000)).toBe('B');
    });

    it('returns A for 20000 XP', () => {
      expect(rankFromXp(20000)).toBe('A');
    });

    it('returns S for 100000 XP', () => {
      expect(rankFromXp(100000)).toBe('S');
    });
  });

  describe('rankForLevel', () => {
    it('returns E for level 1', () => {
      expect(rankForLevel(1)).toBe('E');
    });

    it('returns D for level 5', () => {
      expect(rankForLevel(5)).toBe('D');
    });

    it('returns C for level 10', () => {
      expect(rankForLevel(10)).toBe('C');
    });

    it('returns B for level 20', () => {
      expect(rankForLevel(20)).toBe('B');
    });

    it('returns A for level 49', () => {
      expect(rankForLevel(49)).toBe('A');
    });

    it('returns S for level 50', () => {
      expect(rankForLevel(50)).toBe('S');
    });
  });

  describe('maxRank', () => {
    it('returns higher rank between two', () => {
      expect(maxRank('C', 'E')).toBe('C');
      expect(maxRank('E', 'C')).toBe('C');
      expect(maxRank('S', 'A')).toBe('S');
      expect(maxRank('D', 'D')).toBe('D');
    });
  });

  describe('xpForRank', () => {
    it('returns threshold for each rank', () => {
      expect(xpForRank('E')).toBe(0);
      expect(xpForRank('D')).toBe(100);
      expect(xpForRank('C')).toBe(1000);
      expect(xpForRank('B')).toBe(5000);
      expect(xpForRank('A')).toBe(20000);
      expect(xpForRank('S')).toBe(100000);
    });
  });
});