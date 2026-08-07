import { describe, it, expect } from 'vitest';
import { evaluateTitles, getTitleById } from '../titles';
import { PlayerState } from '../types';

const EMPTY_PLAYER: PlayerState = {
  totalXp: 0,
  rank: 'E',
  unlockedTitles: {},
  questStats: { minCompleted: 0, midCompleted: 0, fullCompleted: 0 },
};

function makeEvent(type: string, ts: string, detail: any = {}) {
  return { type, timestamp: ts, detail };
}

function sessionsToEvents(sessions: Array<{ date: string; duration: number; intensity?: string }>) {
  return sessions.map((s) =>
    makeEvent('session_complete', s.date, { duration: s.duration, intensity: s.intensity || 'standard' })
  );
}

describe('titles.ts', () => {
  describe('evaluateTitles', () => {
    it('retorno_monarca: última sesión hace 4 días → desbloquea', () => {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      
      // Última sesión fue hace 4 días (gap >= 3)
      const events = [
        makeEvent('session_complete', fourDaysAgo.toISOString(), { duration: 20, intensity: 'standard' }),
      ];
      
      const result = evaluateTitles(EMPTY_PLAYER, events);
      expect(result).toContain('retorno_monarca');
    });

    it('retorno_monarca: última sesión hace 2 días → NO desbloquea', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const events = [
        makeEvent('session_complete', twoDaysAgo.toISOString(), { duration: 20, intensity: 'standard' }),
      ];
      
      const result = evaluateTitles(EMPTY_PLAYER, events);
      expect(result).not.toContain('retorno_monarca');
    });

    it('chispa_minima: 3 sesiones de 1 min en 7 días → desbloquea', () => {
      const today = new Date().toISOString();
      const events = sessionsToEvents([
        { date: today, duration: 1 },
        { date: today, duration: 1 },
        { date: today, duration: 1 },
      ]);
      
      const result = evaluateTitles(EMPTY_PLAYER, events);
      expect(result).toContain('chispa_minima');
    });

    it('chispa_minima: 2 sesiones de 1 min → NO desbloquea', () => {
      const today = new Date().toISOString();
      const events = sessionsToEvents([
        { date: today, duration: 1 },
        { date: today, duration: 1 },
      ]);
      
      const result = evaluateTitles(EMPTY_PLAYER, events);
      expect(result).not.toContain('chispa_minima');
    });

    it('evaluateTitles no re-desbloquea ids ya en unlockedTitles', () => {
      const today = new Date().toISOString();
      const unlockedPlayer: PlayerState = {
        ...EMPTY_PLAYER,
        unlockedTitles: {
          chispa_minima: { unlocked: true, unlockedAt: today },
          retorno_monarca: { unlocked: true, unlockedAt: today },
        },
      };
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      
      const events = [
        makeEvent('session_complete', fourDaysAgo.toISOString(), { duration: 20, intensity: 'standard' }),
        makeEvent('session_complete', today, { duration: 1, intensity: 'standard' }),
        makeEvent('session_complete', today, { duration: 1, intensity: 'standard' }),
        makeEvent('session_complete', today, { duration: 1, intensity: 'standard' }),
      ];
      
      const result = evaluateTitles(unlockedPlayer, events);
      expect(result).not.toContain('chispa_minima');
      expect(result).not.toContain('retorno_monarca');
    });

    it('variedad_semanal: 4 intensidades en 7 días → desbloquea', () => {
      const today = new Date().toISOString();
      const events = sessionsToEvents([
        { date: today, duration: 5, intensity: 'minimal' },
        { date: today, duration: 5, intensity: 'light' },
        { date: today, duration: 5, intensity: 'standard' },
        { date: today, duration: 5, intensity: 'push' },
      ]);
      
      const result = evaluateTitles(EMPTY_PLAYER, events);
      expect(result).toContain('variedad_semanal');
    });

    it('constancia_silenciosa: 7 días movimiento en ventana 14 → desbloquea', () => {
      const events: any[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        events.push(makeEvent('session_complete', d.toISOString(), { duration: 5, intensity: 'standard' }));
      }
      
      const result = evaluateTitles(EMPTY_PLAYER, events);
      expect(result).toContain('constancia_silenciosa');
    });
  });

  describe('getTitleById', () => {
    it('returns title for valid id', () => {
      const title = getTitleById('retorno_monarca');
      expect(title).toBeDefined();
      expect(title?.id).toBe('retorno_monarca');
      expect(title?.name).toBe('Retorno Monarca');
    });

    it('returns undefined for invalid id', () => {
      expect(getTitleById('no_existe')).toBeUndefined();
    });
  });
});