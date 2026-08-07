import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';

describe('Store · adaptive skip signal (Fase 3)', () => {
  beforeEach(() => {
    useStore.setState({
      skipStreak: 0,
      suggestShortSession: false,
    });
  });

  it('activates suggestShortSession tras 2 skips consecutivos', () => {
    useStore.getState().trackSkip();
    expect(useStore.getState().skipStreak).toBe(1);
    expect(useStore.getState().suggestShortSession).toBe(false);

    useStore.getState().trackSkip();
    expect(useStore.getState().skipStreak).toBe(2);
    expect(useStore.getState().suggestShortSession).toBe(true);

    useStore.getState().trackSkip();
    expect(useStore.getState().skipStreak).toBe(3);
    expect(useStore.getState().suggestShortSession).toBe(true);
  });

  it('resetea el streak cuando la sesión se completa normalmente', () => {
    useStore.getState().trackSkip();
    useStore.getState().trackSkip();
    expect(useStore.getState().suggestShortSession).toBe(true);

    useStore.getState().resetSkipStreak();
    expect(useStore.getState().skipStreak).toBe(0);
    expect(useStore.getState().suggestShortSession).toBe(false);
  });
});
