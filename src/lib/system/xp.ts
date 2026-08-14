import type { Rank } from './types';

/**
 * Tope diario de XP (rúbrica §7): previene binge → burnout.
 * Mecánica neuro-inclusiva: si el usuario entra en hiperfoco y hace 6 rutinas,
 * el tope le dice "hoy ya brillaste; guarda para mañana".
 */
export const DAILY_XP_CAP = 150;

/**
 * Aplica el tope diario considerando el XP ya ganado hoy.
 * @returns { awarded } XP efectivamente otorgado · { capped } si se recortó · { remaining } restante del día.
 */
export function applyDailyCap(xp: number, xpGanadoHoy: number): { awarded: number; capped: boolean; remaining: number } {
  const remaining = Math.max(0, DAILY_XP_CAP - xpGanadoHoy);
  const awarded = Math.min(xp, remaining);
  return { awarded, capped: awarded < xp, remaining: remaining - awarded };
}

export function levelFromTotalXp(xp: number): { level: number; xp: number } {
  if (xp <= 0) return { level: 1, xp: 0 };
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level++;
  }
  return { level, xp };
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * Math.pow(1.5, level - 2));
}

export function rankFromXp(xp: number) {
  if (xp >= 100000) return 'S';
  if (xp >= 20000) return 'A';
  if (xp >= 5000) return 'B';
  if (xp >= 1000) return 'C';
  if (xp >= 100) return 'D';
  return 'E';
}

export function rankToOrder(rank: Rank): number {
  const order: Record<string, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1 };
  return order[rank] ?? 1;
}

export function maxRank(a: Rank, b: Rank): Rank {
  return rankToOrder(a) >= rankToOrder(b) ? a : b;
}

export function xpForRank(rank: Rank): number {
  const thresholds: Record<string, number> = {
    E: 0,
    D: 100,
    C: 1000,
    B: 5000,
    A: 20000,
    S: 100000,
  };
  return thresholds[rank] ?? 0;
}

export function rankForLevel(level: number): Rank {
  if (level >= 50) return 'S';
  if (level >= 49) return 'A';
  if (level >= 20) return 'B';
  if (level >= 10) return 'C';
  if (level >= 5) return 'D';
  return 'E';
}