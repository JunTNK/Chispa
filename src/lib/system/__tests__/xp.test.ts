import { describe, it, expect } from 'vitest';
import { xpForLevel, rankFromXp, maxRank } from '../xp';

describe('xp.ts', () => {
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

  describe('maxRank', () => {
    it('returns higher rank between two', () => {
      expect(maxRank('C', 'E')).toBe('C');
      expect(maxRank('E', 'C')).toBe('C');
      expect(maxRank('S', 'A')).toBe('S');
      expect(maxRank('D', 'D')).toBe('D');
    });
  });
});
