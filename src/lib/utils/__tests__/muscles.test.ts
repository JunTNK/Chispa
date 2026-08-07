/**
 * Test del dominio muscular unificado (muscles.ts).
 *
 * Garantiza que el registro canónico de músculos se mantiene coherente:
 *   1. Exactamente los 8 músculos canónicos que usa el catálogo.
 *   2. Todos los aliases ES/EN resuelven a una key canónica (case-insensitive).
 *   3. Todos los `fitnessIcon` existen en el pack fitness (ICONS).
 *   4. FOCUS_MUSCLES cubre los 8 músculos sin duplicar keys inválidas.
 *   5. Helpers (color / mark / label) con fallback seguro para músculos desconocidos.
 */
import { describe, it, expect } from 'vitest';
import {
  MUSCLES,
  MUSCLE_KEYS,
  MUSCLE_ALIASES,
  FOCUS_MUSCLES,
  MUSCLE_LABEL_EN,
  normalizeMuscle,
  muscleColor,
  muscleMark,
  muscleLabel,
  muscleFitnessIcon,
} from '@/lib/utils/muscles';
import { ICONS } from '@/lib/utils/fitness-icons';

describe('MUSCLES · registro canónico', () => {
  it('tiene exactamente los 8 músculos canónicos del catálogo', () => {
    expect(MUSCLE_KEYS.sort()).toEqual(
      ['piernas', 'gluteos', 'pecho', 'espalda', 'hombros', 'brazos', 'core', 'cardio'].sort(),
    );
  });

  it('cada músculo tiene metadata completa (label, labelEn, color, mark, fitnessIcon)', () => {
    for (const key of MUSCLE_KEYS) {
      const meta = MUSCLES[key];
      expect(meta.label.length, `${key}: label`).toBeGreaterThan(0);
      expect(meta.labelEn.length, `${key}: labelEn`).toBeGreaterThan(0);
      expect(meta.color, `${key}: color`).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(meta.mark.length, `${key}: mark`).toBeGreaterThan(0);
      expect(meta.fitnessIcon.length, `${key}: fitnessIcon`).toBeGreaterThan(0);
    }
  });

  it('todos los fitnessIcon existen en el pack fitness (ICONS)', () => {
    for (const key of MUSCLE_KEYS) {
      expect(ICONS[MUSCLES[key].fitnessIcon], `${key} → ${MUSCLES[key].fitnessIcon}`).toBeDefined();
    }
  });

  it('MUSCLE_LABEL_EN cubre los 8 músculos', () => {
    expect(Object.keys(MUSCLE_LABEL_EN).sort()).toEqual([...MUSCLE_KEYS].sort());
    for (const key of MUSCLE_KEYS) {
      expect(MUSCLE_LABEL_EN[key].length).toBeGreaterThan(0);
    }
  });
});

describe('MUSCLE_ALIASES · normalización', () => {
  it('resuelve los aliases ES canónicos (case-insensitive)', () => {
    expect(normalizeMuscle('PECHO')).toBe('pecho');
    expect(normalizeMuscle('  Cardio ')).toBe('cardio');
    expect(normalizeMuscle('gluteos')).toBe('gluteos');
  });

  it('resuelve los aliases EN / primaryMuscles de free-exercise-db', () => {
    expect(normalizeMuscle('quadriceps')).toBe('piernas');
    expect(normalizeMuscle('hamstrings')).toBe('piernas');
    expect(normalizeMuscle('chest')).toBe('pecho');
    expect(normalizeMuscle('back')).toBe('espalda');
    expect(normalizeMuscle('deltoids')).toBe('hombros');
    expect(normalizeMuscle('biceps')).toBe('brazos');
    expect(normalizeMuscle('abdominals')).toBe('core');
    expect(normalizeMuscle('glutes')).toBe('gluteos');
  });

  it('devuelve null para músculos desconocidos (sin lanzar)', () => {
    expect(normalizeMuscle('cualquier-cosa')).toBeNull();
    expect(normalizeMuscle('')).toBeNull();
  });

  it('todo alias mapea a una key canónica válida', () => {
    for (const [alias, key] of Object.entries(MUSCLE_ALIASES)) {
      expect(MUSCLE_KEYS, `alias "${alias}" → ${key}`).toContain(key);
      // Redondeo: alias normalizado == key canónica
      expect(normalizeMuscle(alias), `normalizeMuscle("${alias}")`).toBe(key);
    }
  });
});

describe('FOCUS_MUSCLES · foco → músculos', () => {
  it('cubre todos los músculos canónicos entre los 4 focos', () => {
    const covered = new Set(Object.values(FOCUS_MUSCLES).flat());
    for (const key of MUSCLE_KEYS) {
      expect(covered.has(key), `${key} no está en ningún foco`).toBe(true);
    }
  });

  it('solo contiene keys canónicas válidas', () => {
    for (const [focus, muscles] of Object.entries(FOCUS_MUSCLES)) {
      for (const m of muscles) {
        expect(MUSCLE_KEYS, `${focus} → ${m}`).toContain(m);
      }
    }
  });
});

describe('Helpers · fallback seguro', () => {
  it('muscleColor usa el color del registro y gris neutro para desconocidos', () => {
    expect(muscleColor('pecho')).toBe(MUSCLES.pecho.color);
    expect(muscleColor('no-existe')).toBe('#94a0b8');
  });

  it('muscleMark usa la abreviatura del registro y la inicial para desconocidos', () => {
    expect(muscleMark('gluteos')).toBe('GLU');
    expect(muscleMark('no-existe')).toBe('N');
  });

  it('muscleLabel devuelve la etiqueta ES y el propio string para desconocidos', () => {
    expect(muscleLabel('espalda')).toBe('Espalda');
    expect(muscleLabel('no-existe')).toBe('no-existe');
  });

  it('muscleFitnessIcon devuelve el icono del registro y dumbbell para desconocidos', () => {
    expect(muscleFitnessIcon('core')).toBe('core');
    expect(muscleFitnessIcon('no-existe')).toBe('dumbbell');
  });
});
