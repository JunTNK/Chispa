import { describe, it, expect } from 'vitest';
import {
  deduceEmotionalMode,
  mapTapCheckinToModel,
  needsEmotionalSafety,
  modeInfo,
  EMOTIONAL_MODES,
} from '@/lib/emotional-mode';
import type { CheckIn } from '@/types';

function checkin(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    user_id: '',
    date: '2026-01-01',
    sleep: 7,
    energy: 6,
    stress: 4,
    recovery_score: 60,
    created_at: '',
    ...overrides,
  };
}

describe('deduceEmotionalMode (spec §3: el algoritmo deduce, nunca es un menú)', () => {
  it('cabeza Caos → modo Caos (seguridad emocional, nunca HIIT)', () => {
    expect(deduceEmotionalMode(checkin({ head: 'caos', energy: 6 }))).toBe('caos');
    expect(needsEmotionalSafety('caos')).toBe(true);
  });

  it('Agotado o silla + baja energía → modo Silla/Cama', () => {
    expect(deduceEmotionalMode(checkin({ head: 'agotado', location: 'silla' }))).toBe('silla');
    expect(deduceEmotionalMode(checkin({ location: 'silla', energy: 3 }))).toBe('silla');
  });

  it('Silla/Cama como lugar → modo Silla/Cama', () => {
    expect(deduceEmotionalMode(checkin({ location: 'silla', energy: 9 }))).toBe('silla');
  });

  it('baja energía → Microhábito (lo mínimo viable)', () => {
    expect(deduceEmotionalMode(checkin({ energy: 3, location: 'casa' }))).toBe('micro');
    expect(needsEmotionalSafety('micro')).toBe(true);
  });

  it('cabeza Calma → modo Calma', () => {
    expect(deduceEmotionalMode(checkin({ head: 'calma', energy: 6 }))).toBe('calma');
  });

  it('2 min o cabeza Chispa → Chispa 2 min', () => {
    expect(deduceEmotionalMode(checkin({ time: 2, energy: 9 }))).toBe('chispa');
    expect(deduceEmotionalMode(checkin({ head: 'chispa', energy: 9 }))).toBe('chispa');
  });

  it('media energía → Calma; alta energía → Chispa', () => {
    expect(deduceEmotionalMode(checkin({ energy: 6 }))).toBe('calma');
    expect(deduceEmotionalMode(checkin({ energy: 9, time: 10 }))).toBe('chispa');
  });

  it('todos los modos tienen label y descripción para i18n', () => {
    for (const m of EMOTIONAL_MODES) {
      const info = modeInfo(m);
      expect(info.id).toBe(m);
      expect(info.labelKey.length).toBeGreaterThan(0);
      expect(info.descKey.length).toBeGreaterThan(0);
    }
  });
});

describe('mapTapCheckinToModel', () => {
  it('mapea los 3 toques al modelo numérico del motor', () => {
    expect(mapTapCheckinToModel({ energy: 'baja' })).toEqual({ sleep: 7, energy: 3, stress: 6 });
    expect(mapTapCheckinToModel({ energy: 'media' })).toEqual({ sleep: 7, energy: 6, stress: 4 });
    expect(mapTapCheckinToModel({ energy: 'alta' })).toEqual({ sleep: 7, energy: 9, stress: 3 });
  });

  it('la cabeza modula el estrés (Caos sube, Calma baja)', () => {
    expect(mapTapCheckinToModel({ energy: 'media', head: 'caos' }).stress).toBe(8);
    expect(mapTapCheckinToModel({ energy: 'media', head: 'calma' }).stress).toBe(2);
    expect(mapTapCheckinToModel({ energy: 'media', head: 'agotado' }).stress).toBe(9);
    expect(mapTapCheckinToModel({ energy: 'media', head: 'chispa' }).stress).toBe(3);
  });
});
