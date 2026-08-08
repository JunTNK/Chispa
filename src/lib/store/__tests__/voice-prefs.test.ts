import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '@/lib/store';

describe('Voz del coach (pref neural/sistema)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.getState().reset();
  });

  it('default: voz del sistema', () => {
    expect(useStore.getState().prefs.voice).toBe('system');
  });

  it('setVoice persiste en prefs y vuelve a system', () => {
    useStore.getState().setVoice('neural');
    expect(useStore.getState().prefs.voice).toBe('neural');
    useStore.getState().setVoice('system');
    expect(useStore.getState().prefs.voice).toBe('system');
  });
});