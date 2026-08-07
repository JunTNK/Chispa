/**
 * Tests del Selector Engine — capa determinista del "Elige ejercicios".
 *
 * Cubre: clasificación de patrones, score de relevancia (afinidad + bonus por
 * hueco + gancho), ranking del modo Guíame, balance, duración, dopamina y
 * suficiencia (umbrales del spec §04).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { Exercise } from '@/types';
import {
  getPatterns,
  scoreExercise,
  rankSuggestions,
  deriveBalance,
  computeDopamine,
  isSufficient,
  buildPatternIndex,
  clearSelectorCache,
  personalAffinity,
  historyWeight,
  DESIRED_PATTERNS,
  GAP_BONUS,
  SUFFICIENT,
  type ExProgressMap,
} from '../selector-engine';

const ex = (partial: Partial<Exercise>): Exercise => ({
  id: partial.id ?? 'x',
  name: partial.name ?? 'X',
  muscle: partial.muscle ?? 'piernas',
  difficulty: partial.difficulty ?? 2,
  equipment: partial.equipment ?? 'ninguno',
  instructions: '',
  load_type: partial.load_type ?? 'reps',
  cognitive_load: partial.cognitive_load ?? 'low',
  emoji: '',
  cue: '',
  ...partial,
});

const catalog = [
  ex({ id: 'squat', name: 'Sentadilla', muscle: 'piernas' }),
  ex({ id: 'bench', name: 'Press de banca', muscle: 'pecho' }),
  ex({ id: 'row', name: 'Remo mancuernas', muscle: 'espalda' }),
  ex({ id: 'deadlift', name: 'Peso muerto', muscle: 'espalda', cognitive_load: 'high' }),
  ex({ id: 'curl', name: 'Curl martillo', muscle: 'brazos' }),
  ex({ id: 'plank', name: 'Plancha', muscle: 'core' }),
  ex({ id: 'run', name: 'Cinta de correr', muscle: 'cardio' }),
  ex({ id: 'stretch', name: 'Estiramiento isquiotibial', muscle: 'piernas', category: 'estiramiento', load_type: 'time' }),
  ex({ id: 'machine_crunch', name: 'Máquina de abdominales', muscle: 'core', force: 'pull' as const, cognitive_load: 'med' }),
];

beforeEach(() => clearSelectorCache());

describe('getPatterns — clasificación determinista', () => {
  it('clasifica por grupo muscular', () => {
    expect(getPatterns(catalog[0])).toContain('squat');
    expect(getPatterns(catalog[1])).toContain('push');
    expect(getPatterns(catalog[2])).toContain('pull');
    expect(getPatterns(catalog[5])).toContain('core');
  });

  it('clasifica bisagra por nombre (peso muerto) y glúteos', () => {
    expect(getPatterns(catalog[3])).toContain('hinge');
  });

  it('clasifica estiramientos como movilidad', () => {
    expect(getPatterns(catalog[7])).toContain('mobility');
  });

  it('máquina de abdominales es core (señal muscular gana a la fuerza)', () => {
    const pats = getPatterns(catalog[8]);
    expect(pats).toContain('core');
    expect(pats).not.toContain('pull');
  });

  it('caché: misma referencia para el mismo id', () => {
    expect(getPatterns(catalog[0])).toBe(getPatterns(catalog[0]));
  });
});

describe('scoreExercise — afinidad + bonus por hueco + gancho', () => {
  it('bonus por hueco domina: sentadilla sube cuando falta squat', () => {
    const sc = scoreExercise(catalog[0], 'full', ['squat']);
    expect(sc.coversGap).toBe(true);
    expect(sc.reasons.some((r) => r.kind === 'gap' && r.pattern === 'squat')).toBe(true);
  });

  it('sin hueco, manda la afinidad', () => {
    const sc = scoreExercise(catalog[0], 'full', []);
    expect(sc.coversGap).toBe(false);
    expect(sc.score).toBe(3 + 0 + 1); // afinidad squat full=3, sin gap, hook low=1
  });

  it('gancho negativo para carga cognitiva alta', () => {
    const heavy = ex({ id: 'hip', name: 'Hip thrust', muscle: 'gluteos', cognitive_load: 'high' });
    const sc = scoreExercise(heavy, 'full', []);
    expect(sc.pattern).toBe('hinge');
    expect(sc.score).toBe(2 + 0 - 1); // hinge full=2, hook high=-1
  });

  it('GAP_BONUS es deliberadamente dominante', () => {
    const push = scoreExercise(catalog[1], 'full', []);
    const squat = scoreExercise(catalog[0], 'full', ['squat']);
    // squat (3+5+1=9) supera a press (3+1=4) aunque la afinidad sea igual
    expect(squat.score).toBeGreaterThan(push.score);
    expect(GAP_BONUS).toBe(5);
  });
});

describe('afinidad entrenada — ex_progress del Digital Twin (capa 01)', () => {
  it('sin historial: devuelve exactamente la base (arranque en frío)', () => {
    expect(historyWeight(undefined)).toBe(0);
    expect(personalAffinity(3, undefined)).toBe(3);
    // scoreExercise sin historial es idéntico al anterior (compatibilidad)
    const sc = scoreExercise(catalog[0], 'full', []);
    expect(sc.score).toBe(3 + 0 + 1); // afinidad squat full=3, hook low=1
  });

  it('el peso crece con las interacciones y satura ~4', () => {
    expect(historyWeight({ easy: 0 })).toBe(0);
    expect(historyWeight({ easy: 1 })).toBe(0.25);
    expect(historyWeight({ easy: 4 })).toBe(1);
    expect(historyWeight({ easy: 10 })).toBe(1);
    expect(historyWeight({ easy: 2, last_rpe: 5 })).toBe(0.75);
  });

  it('dominar un ejercicio (easy alto) eleva su afinidad', () => {
    const mastered = personalAffinity(3, { easy: 4 });
    expect(mastered).toBeGreaterThan(3);
    expect(mastered).toBeLessThanOrEqual(6);
  });

  it('RPE alto resta y RPE bajo suma al componente aprendido', () => {
    const hard = personalAffinity(3, { easy: 2, last_rpe: 9 });
    const soft = personalAffinity(3, { easy: 2, last_rpe: 2 });
    expect(hard).toBeLessThan(soft);
  });

  it('scoreExercise con historial: el ejercicio dominado sube en el ranking', () => {
    const cold: ExProgressMap = {};
    const warm: ExProgressMap = { bench: { easy: 5, last_rpe: 2 } };
    const coldTop = rankSuggestions(catalog, 'full', [], new Set(), 6, cold);
    const warmTop = rankSuggestions(catalog, 'full', [], new Set(), 6, warm);
    const coldRank = coldTop.findIndex((s) => s.exercise.id === 'bench');
    const warmRank = warmTop.findIndex((s) => s.exercise.id === 'bench');
    expect(coldRank).toBeGreaterThanOrEqual(0);
    // El press de banca, dominado, escala posiciones frente al frío
    expect(warmRank).toBeLessThanOrEqual(coldRank);
    const sc = scoreExercise(catalog[1], 'full', [], warm);
    expect(sc.reasons.some((r) => r.kind === 'easy')).toBe(true);
  });

  it('el bonus por hueco sigue dominando sobre la afinidad entrenada', () => {
    const warm: ExProgressMap = { bench: { easy: 6, last_rpe: 1 } };
    const squatGap = scoreExercise(catalog[0], 'full', ['squat'], warm); // 3+5+1=9
    const benchNoGap = scoreExercise(catalog[1], 'full', [], warm);
    expect(squatGap.coversGap).toBe(true);
    expect(squatGap.score).toBeGreaterThan(benchNoGap.score);
    expect(benchNoGap.score).toBeLessThan(9);
  });
});

describe('rankSuggestions — top-k del modo Guíame', () => {
  it('proponer los 4 primeros del score, excluyendo ya elegidos', () => {
    const missing = DESIRED_PATTERNS.full.filter(() => true); // todos faltan
    const top = rankSuggestions(catalog, 'full', missing, new Set(['squat']), 4);
    expect(top).toHaveLength(4);
    expect(top.some((s) => s.exercise.id === 'squat')).toBe(false);
    // Los que cubren hueco (pull, squat…) puntúan por encima de los que no
    expect(top[0].score).toBeGreaterThanOrEqual(top[top.length - 1].score);
  });

  it('respeta el count', () => {
    expect(rankSuggestions(catalog, 'full', [], new Set(), 3)).toHaveLength(3);
  });
});

describe('deriveBalance — mapa de balance + duración + dopamina', () => {
  it('vacío: nada cubierto, todo missing, suficiencia false', () => {
    const b = deriveBalance([], catalog, 'full');
    expect(b.count).toBe(0);
    expect(b.present).toHaveLength(0);
    expect(b.missing).toEqual(DESIRED_PATTERNS.full);
    expect(b.sufficient).toBe(false);
    expect(b.dopa).toBe(0);
  });

  it('calcula duración total (trabajo + descanso) al alza', () => {
    // 3 series × (12 reps × 3s + 60s descanso) = 3×96s = 288s → 5 min
    const b = deriveBalance([{ exercise_id: 'squat', sets: 3, reps: 12, rest: 60 }], catalog, 'full');
    expect(b.durationMin).toBe(5);
    expect(b.workMin).toBe(2); // 3×36s=108s → 2 min
  });

  it('tiempo (load_type=time) cuenta los segundos tal cual', () => {
    // 1 serie × (30s + 30s descanso) = 60s → 1 min
    const b = deriveBalance([{ exercise_id: 'stretch', sets: 1, reps: 30, rest: 30 }], catalog, 'full');
    expect(b.durationMin).toBe(1);
  });

  it('marca presentes y ausentes según el enfoque', () => {
    const items = [
      { exercise_id: 'squat', sets: 2, reps: 10, rest: 60 },
      { exercise_id: 'bench', sets: 3, reps: 8, rest: 60 },
      { exercise_id: 'row', sets: 3, reps: 8, rest: 60 },
      { exercise_id: 'plank', sets: 2, reps: 30, rest: 30 },
    ];
    const b = deriveBalance(items, catalog, 'full');
    expect(b.present.sort()).toEqual(['core', 'pull', 'push', 'squat']);
    expect(b.missing).toHaveLength(0);
  });
});

describe('computeDopamine', () => {
  it('0 con rutina vacía', () => {
    expect(computeDopamine([], new Map(), 'full')).toBe(0);
  });

  it('sube con variedad de patrones y gancho bajo', () => {
    const map = new Map(catalog.map((e) => [e.id, e]));
    const varied = [
      { exercise_id: 'squat', sets: 2, reps: 10, rest: 60 },
      { exercise_id: 'bench', sets: 2, reps: 8, rest: 60 },
      { exercise_id: 'row', sets: 2, reps: 8, rest: 60 },
      { exercise_id: 'plank', sets: 2, reps: 30, rest: 30 },
    ];
    const flat = [
      { exercise_id: 'deadlift', sets: 2, reps: 5, rest: 90 },
      { exercise_id: 'deadlift', sets: 2, reps: 5, rest: 90 },
      { exercise_id: 'deadlift', sets: 2, reps: 5, rest: 90 },
    ];
    expect(computeDopamine(varied, map, 'full')).toBeGreaterThan(
      computeDopamine(flat, map, 'full')
    );
  });
});

describe('isSufficient — umbrales del spec §04', () => {
  // 4 patrones del enfoque full → min(3, 4) = 3

  it('ex ≥ 4 y cubiertos ≥ 3 y duración en rango → suficiente', () => {
    expect(isSufficient(4, ['push', 'pull', 'squat'], 20, 'full')).toBe(true);
  });

  it('menos de 4 ejercicios → no', () => {
    expect(isSufficient(3, ['push', 'pull', 'squat'], 20, 'full')).toBe(false);
  });

  it('menos de 3 patrones cubiertos → no', () => {
    expect(isSufficient(4, ['push', 'pull'], 20, 'full')).toBe(false);
  });

  it('fuera de rango de duración → no', () => {
    expect(isSufficient(4, ['push', 'pull', 'squat'], 60, 'full')).toBe(false);
    expect(isSufficient(4, ['push', 'pull', 'squat'], 8, 'full')).toBe(false);
  });

  it('enfoque core exige solo min(3, 2) = 2 patrones', () => {
    expect(isSufficient(4, ['core', 'cardio'], 20, 'core')).toBe(true);
  });

  it('constantes del spec expuestas', () => {
    expect(SUFFICIENT.minExercises).toBe(4);
    expect(SUFFICIENT.minDuration).toBe(12);
    expect(SUFFICIENT.maxDuration).toBe(50);
  });
});

describe('buildPatternIndex — índice invertido', () => {
  it('agrupa ejercicios por patrón', () => {
    const index = buildPatternIndex(catalog);
    expect(index.get('push')).toHaveLength(1); // solo press de banca
    expect(index.get('core')!.map((e) => e.id)).toContain('plank');
    expect(index.get('mobility')!.map((e) => e.id)).toContain('stretch');
  });
});
