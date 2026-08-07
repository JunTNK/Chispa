/**
 * Tests for custom exercises IndexedDB service
 *
 * Uses fake-indexeddb to simulate IndexedDB in the test environment.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock IndexedDB with fake-indexeddb polyfill
import 'fake-indexeddb/auto';

import {
  saveCustomExercise,
  getAllCustomExercises,
  getCustomExercise,
  deleteCustomExercise,
  countCustomExercises,
  type CustomExercise,
} from '../custom-exercises-db';

function makeExercise(overrides: Partial<CustomExercise> = {}): CustomExercise {
  return {
    id: `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: 'Sentadilla con banda',
    muscle: 'piernas',
    difficulty: 2,
    equipment: 'bandas',
    instructions: 'Ponte la banda y haz sentadilla',
    load_type: 'reps',
    cognitive_load: 'low',
    emoji: '🏋️',
    cue: 'Sentadilla con banda',
    isCustom: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('custom-exercises-db', () => {
  beforeEach(async () => {
    // Clean up all entries
    const all = await getAllCustomExercises();
    for (const ex of all) {
      await deleteCustomExercise(ex.id);
    }
  });

  it('saves and retrieves a custom exercise', async () => {
    const exercise = makeExercise({ id: 'test_1', name: 'Mi ejercicio' });
    await saveCustomExercise(exercise);

    const retrieved = await getCustomExercise('test_1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('Mi ejercicio');
    expect(retrieved!.isCustom).toBe(true);
  });

  it('returns undefined for non-existent exercise', async () => {
    const result = await getCustomExercise('nonexistent');
    expect(result).toBeUndefined();
  });

  it('lists all custom exercises', async () => {
    await saveCustomExercise(makeExercise({ id: 'test_a', name: 'Exercise A' }));
    await saveCustomExercise(makeExercise({ id: 'test_b', name: 'Exercise B' }));

    const all = await getAllCustomExercises();
    expect(all.length).toBeGreaterThanOrEqual(2);
    const names = all.map((e) => e.name);
    expect(names).toContain('Exercise A');
    expect(names).toContain('Exercise B');
  });

  it('updates an existing exercise', async () => {
    const exercise = makeExercise({ id: 'test_update', name: 'Original' });
    await saveCustomExercise(exercise);

    await saveCustomExercise({ ...exercise, name: 'Updated' });

    const retrieved = await getCustomExercise('test_update');
    expect(retrieved!.name).toBe('Updated');
  });

  it('deletes a custom exercise', async () => {
    const exercise = makeExercise({ id: 'test_delete', name: 'To delete' });
    await saveCustomExercise(exercise);

    let count = await countCustomExercises();
    expect(count).toBeGreaterThanOrEqual(1);

    await deleteCustomExercise('test_delete');

    const retrieved = await getCustomExercise('test_delete');
    expect(retrieved).toBeUndefined();
  });

  it('counts custom exercises', async () => {
    const initial = await countCustomExercises();
    await saveCustomExercise(makeExercise({ id: 'test_count_1', name: 'Count me 1' }));
    await saveCustomExercise(makeExercise({ id: 'test_count_2', name: 'Count me 2' }));

    const after = await countCustomExercises();
    expect(after).toBe(initial + 2);
  });

  it('sets createdAt and updatedAt timestamps', async () => {
    const before = Date.now();
    const exercise = makeExercise({ id: 'test_timestamps' });
    await saveCustomExercise(exercise);

    const retrieved = await getCustomExercise('test_timestamps');
    expect(retrieved!.createdAt).toBeDefined();
    expect(retrieved!.updatedAt).toBeDefined();
    expect(new Date(retrieved!.createdAt).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('updates only updatedAt on re-save', async () => {
    const exercise = makeExercise({ id: 'test_timestamp_update' });
    await saveCustomExercise(exercise);

    const first = await getCustomExercise('test_timestamp_update');
    const originalCreatedAt = first!.createdAt;

    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 10));

    await saveCustomExercise({ ...first!, name: 'Updated name' });

    const updated = await getCustomExercise('test_timestamp_update');
    expect(updated!.createdAt).toBe(originalCreatedAt);
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
      new Date(first!.updatedAt).getTime()
    );
  });
});
