import { describe, it, expect } from 'vitest';
import { useStore } from '@/lib/store';

describe('store restPref', () => {
  it('default es auto', () => {
    useStore.getState().reset();
    expect(useStore.getState().prefs.restPref).toBe('auto');
  });

  it('setRestPref persiste el valor', () => {
    useStore.getState().reset();
    useStore.getState().setRestPref('manual');
    expect(useStore.getState().prefs.restPref).toBe('manual');
    useStore.getState().setRestPref(90);
    expect(useStore.getState().prefs.restPref).toBe(90);
  });
});