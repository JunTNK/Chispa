/**
 * Tests del sync del Digital Twin — persistencia de la inteligencia entrenada.
 *
 * El fix ensanchó el cast de exercise_progress en pull() para que el tipo
 * coincida con `DigitalTwin.ex_progress` ({ easy, last_rpe, hard, last_date,
 * total }). Como los casts son una construcción SOLO de TypeScript (no
 * cambian el runtime), el test verifica el comportamiento del pull (que el
 * twin restaurado expone los campos entrenados que consumen el Selector y el
 * Coach) y que las consultas no contaminan el payload.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SyncResult } from '@/lib/sync/supabase-sync';

/* ─── Mock del cliente Supabase (vi.hoisted: vi.mock se hoistea al top) ─── */

const { mockFrom, trainedTwin } = vi.hoisted(() => {
  const trainedTwin = {
    user_id: 'u1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    motivation_style: 'data',
    avoid_patterns: [],
    best_hours: { 18: 5 },
    patterns: { completion_rate: 0.7, avg_duration: 20, abandon_rate: 0.1 },
    // exercise_progress anotado como nullable: el caso de prueba con null
    // necesita que el tipo permita null (el pull usa `?? {}` como fallback).
    exercise_progress: {
      squat: { easy: 3, last_rpe: 8, hard: 2, last_date: '2026-07-30', total: 5 },
      pushup: { easy: 2, last_rpe: 2, hard: 0, last_date: '2026-07-29', total: 4 },
    } as Record<string, unknown> | null,
    preferred_duration: 20,
    lang: 'es',
  };

  const noData = { data: null, error: null };
  const emptyList = { data: [], error: null };

  /**
   * Builder consciente de la tabla: digital_twins devuelve el twin entrenado
   * y el resto sin datos. Soporta ambos patrones de consulta que usa pull():
   *   · single-row:  select('*').eq('user_id', uid).single()
   *   · colección:   select('*').eq('user_id', uid).gte('date', ...).order(...)
   */
  const mockFrom = vi.fn((table: string) => {
    const single = () =>
      table === 'digital_twins'
        ? Promise.resolve({ data: trainedTwin, error: null })
        : Promise.resolve(noData);

    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(single),
          single: vi.fn(single),
          gte: vi.fn(() => ({ order: vi.fn().mockResolvedValue(emptyList) })),
          order: vi.fn().mockResolvedValue(emptyList),
        })),
        order: vi.fn().mockResolvedValue(emptyList),
      })),
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(single),
        single: vi.fn(single),
        gte: vi.fn(() => ({ order: vi.fn().mockResolvedValue(emptyList) })),
        order: vi.fn().mockResolvedValue(emptyList),
      })),
      gte: vi.fn(() => ({ order: vi.fn().mockResolvedValue(emptyList) })),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue(noData),
      update: vi.fn().mockResolvedValue(noData),
    };
  });

  return { mockFrom, trainedTwin };
});

vi.mock('@/lib/db/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'u1' } } },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { email: 'ana@test.com', user_metadata: { full_name: 'Ana' } } },
        error: null,
      }),
    },
    from: mockFrom,
  },
}));

import { supabaseSync } from '@/lib/sync/supabase-sync';

describe('supabaseSync — persistencia de la inteligencia entrenada', () => {
  beforeEach(() => {
    supabaseSync.reset();
    mockFrom.mockClear();
  });

  it('pull() restaura el twin con los campos entrenados (hard, last_date, total)', async () => {
    const result: SyncResult = await supabaseSync.pull();

    expect(result.success).toBe(true);
    const ex = result.pulled!.twin!.ex_progress;

    expect(ex.squat).toMatchObject({ easy: 3, last_rpe: 8, hard: 2, last_date: '2026-07-30', total: 5 });
    expect(ex.pushup).toMatchObject({ easy: 2, last_rpe: 2, hard: 0, last_date: '2026-07-29', total: 4 });
  });

  it('las tablas que no son digital_twins no contaminan el payload', async () => {
    const result: SyncResult = await supabaseSync.pull();
    expect(result.success).toBe(true);
    // Sin perfiles/neuro/quest/checkins remotas → el payload no las incluye
    expect(result.pulled?.profile).toBeUndefined();
    expect(result.pulled?.neuro).toBeUndefined();
    expect(result.pulled?.questState).toBeUndefined();
    expect(result.pulled?.twin).toBeDefined();
  });

  it('no rompe con exercise_progress nulo (fallback a {})', async () => {
    mockFrom.mockImplementation((table: string) => {
      const single = () =>
        table === 'digital_twins'
          ? Promise.resolve({ data: { ...trainedTwin, exercise_progress: null }, error: null })
          : Promise.resolve({ data: null, error: null });
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(single),
            single: vi.fn(single),
            gte: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(single),
          single: vi.fn(single),
          gte: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        gte: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const result: SyncResult = await supabaseSync.pull();
    expect(result.success).toBe(true);
    // exercise_progress null → `?? {}` → ex_progress vacío, sin lanzar
    expect(result.pulled?.twin?.ex_progress).toEqual({});
  });
});
