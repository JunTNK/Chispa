import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '@/lib/store';

describe('Anchor slice (habit stacking)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.getState().reset();
  });

  it('default: sin ancla y sin nudges vistos', () => {
    const { anchorRoutine, anchorNudgeShown } = useStore.getState();
    expect(anchorRoutine).toBeNull();
    expect(anchorNudgeShown).toBe('');
  });

  it('setAnchorRoutine guarda la rutina y resetea el nudge visto', () => {
    const { setAnchorRoutine } = useStore.getState();
    setAnchorRoutine({ anchorId: 'coffee', window: 'morning', minutes: 1 });
    let { anchorRoutine } = useStore.getState();
    expect(anchorRoutine).toEqual({ anchorId: 'coffee', window: 'morning', minutes: 1 });

    useStore.getState().markAnchorNudgeShown('2026-08-07:morning');
    expect(useStore.getState().anchorNudgeShown).toBe('2026-08-07:morning');

    setAnchorRoutine({ anchorId: 'dinner', window: 'evening', minutes: 5 });
    expect(useStore.getState().anchorRoutine?.anchorId).toBe('dinner');
    expect(useStore.getState().anchorNudgeShown).toBe('');
  });

  it('setAnchorRoutine(null) quita el ancla', () => {
    const { setAnchorRoutine } = useStore.getState();
    setAnchorRoutine({ anchorId: 'coffee', window: 'morning', minutes: 1 });
    setAnchorRoutine(null);
    expect(useStore.getState().anchorRoutine).toBeNull();
  });

  it('markAnchorNudgeShown registra la clave y no se repite', () => {
    const { markAnchorNudgeShown } = useStore.getState();
    markAnchorNudgeShown('2026-08-07:morning');
    markAnchorNudgeShown('2026-08-07:morning');
    expect(useStore.getState().anchorNudgeShown).toBe('2026-08-07:morning');
  });
});
