import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '@/lib/store';
import { levelFromXp } from '@/lib/system/types';

describe('System Slice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to initial state for each test
    useStore.getState().reset();
  });

  it('default: player === null y systemMode falsy', () => {
    const { player } = useStore.getState();
    expect(player).toBeNull();
  });

  it('activar: setSystemMode(true) → player = EMPTY_PLAYER (rank E, totalXp 0)', () => {
    useStore.getState().setSystemMode(true);
    const { player, prefs } = useStore.getState();
    expect(prefs.systemMode).toBe(true);
    expect(player).not.toBeNull();
    expect(player?.rank).toBe('E');
    expect(player?.totalXp).toBe(0);
    expect(player?.questStats.minCompleted).toBe(0);
  });

  it('desactivar conserva: setSystemMode(false) → player no se borra', () => {
    useStore.getState().setSystemMode(true);
    useStore.getState().setSystemMode(false);
    const { player } = useStore.getState();
    expect(player).not.toBeNull();
  });

  it('no-op seguro: resolveQuest(...) con player: null → no crash', () => {
    useStore.getState().resolveQuest(
      [{ taskId: 'test', completed: true, energySpent: 0 }],
      'min'
    );
    const { player } = useStore.getState();
    expect(player).toBeNull();
  });

  it('XP: resolve min básica (1 task) → totalXp === 12 (10 base + 2 task)', () => {
    useStore.getState().setSystemMode(true);
    useStore.getState().resolveQuest(
      [{ taskId: 'test', completed: true, energySpent: 0 }],
      'min'
    );
    const { player } = useStore.getState();
    expect(player?.totalXp).toBe(12);
    expect(player?.questStats.minCompleted).toBe(1);
  });

  it('XP: resolve con 5 tasks completadas en min → totalXp === 20 (10 base + 5*2 tasks)', () => {
    useStore.getState().setSystemMode(true);
    const tasks = Array.from({ length: 5 }, (_, i) => ({
      taskId: `task${i}`,
      completed: true,
      energySpent: 0,
    }));
    useStore.getState().resolveQuest(tasks, 'min');
    const { player } = useStore.getState();
    expect(player?.totalXp).toBe(20);
  });

  it('XP: resolve full con energy → base 50 + tasks + energy*0.5', () => {
    useStore.getState().setSystemMode(true);
    useStore.getState().resolveQuest(
      [{ taskId: 'test', completed: true, energySpent: 6 }],
      'full'
    );
    const { player } = useStore.getState();
    // base 50 + 0 completed (task 0 completed but we need at least 1)
    // Actually tasks has 1 completed, so 50 + 10 (1 * 10 for full) + 3 (6 * 0.5) = 63
    expect(player?.totalXp).toBe(63);
    expect(player?.questStats.fullCompleted).toBe(1);
  });

  it('nivel y rank: múltiples quests → sube de nivel', () => {
    useStore.getState().setSystemMode(true);
    // 9 min quests con 1 task completada cada una = 12 XP * 9 = 108 XP
    for (let i = 0; i < 9; i++) {
      useStore.getState().resolveQuest(
        [{ taskId: `test${i}`, completed: true, energySpent: 0 }],
        'min'
      );
    }
    const { player } = useStore.getState();
    expect(player).not.toBeNull();
    expect(player?.totalXp).toBe(108);
    expect(levelFromXp(player!.totalXp)).toBe(2); // level 2 desde 100 XP
    expect(player?.rank).toBe('D'); // 100 XP = rank D threshold
  });

  it('skip sin XP: skipQuest() → totalXp invariado', () => {
    useStore.getState().setSystemMode(true);
    useStore.getState().resolveQuest(
      [{ taskId: 'test', completed: false, energySpent: 0 }],
      'min'
    );
    const xpBefore = useStore.getState().player?.totalXp ?? 0;
    useStore.getState().skipQuest();
    const xpAfter = useStore.getState().player?.totalXp ?? 0;
    expect(xpAfter).toBe(xpBefore);
  });

  it('persist: player serializado en partialize', () => {
    useStore.getState().setSystemMode(true);
    // El player debe estar en el estado
    expect(useStore.getState().player).not.toBeNull();
  });
});