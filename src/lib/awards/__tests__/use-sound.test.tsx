/**
 * Unit tests for the useSound hook (use-sound.ts).
 *
 * The hook synthesizes SFX with the Web Audio API. jsdom has no
 * AudioContext, so we stub it with a minimal fake and assert on the
 * oscillator/gain nodes the preset creates. Key behaviors:
 *   - Quiet Mode (sensory.quiet) suppresses ALL sounds
 *   - Same sound throttled to once per 500ms
 *   - Different sounds are not throttled against each other
 *
 * NOTE: use-sound.ts caches the AudioContext in a module-level singleton
 * (getCtx()), so we register ONE shared fake AudioContext for the whole
 * file instead of one per test — otherwise later tests would keep hitting
 * the stale first context and see 0 oscillator calls.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSound } from '../use-sound';
import { useStore } from '@/lib/store';

/* ─── Minimal AudioContext stub (single shared instance) ─── */

function createFakeAudioContext() {
  const ctx = {
    currentTime: 0,
    sampleRate: 44100,
    state: 'running',
    destination: {},
    resume: vi.fn(),
    createOscillator: vi.fn(() => {
      const osc = {
        type: '',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      return osc;
    }),
    createGain: vi.fn(() => {
      const gain = {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      };
      return gain;
    }),
    createBuffer: vi.fn(() => ({
      getChannelData: () => new Float32Array(44100),
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => ({
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      Q: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
    })),
  };

  return ctx;
}

// One fake for the whole file — getCtx() caches the context in a module
// singleton, so all tests must share the same instance.
const fakeCtx = createFakeAudioContext();

beforeAll(() => {
  // Must be a plain constructor function, NOT an arrow function: getCtx()
  // calls `new AudioContext()`, and `new` on an arrow throws
  // "not a constructor" (silently swallowed by play()'s try/catch, which is
  // why this bug was invisible). Returning fakeCtx from the constructor
  // makes `new AudioContext()` yield the shared fake.
  (globalThis as any).AudioContext = function () {
    return fakeCtx;
  };
  (globalThis as any).webkitAudioContext = undefined;
});

beforeEach(() => {
  // Reset call counters on the shared fake
  vi.clearAllMocks();
  // Anchor the clock to a realistic epoch value. With fake timers starting
  // at 0, the first play() would be throttled (now - last = 0 < 500) and
  // produce no sound — the exact behavior these tests exercise.
  vi.useFakeTimers({ now: 1_000_000 });
  // Quiet mode off by default
  useStore.setState({ sensory: { quiet: false, dim: false, swap: false } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSound', () => {
  it('plays a sound (creates oscillators) when quiet mode is off', () => {
    const { result } = renderHook(() => useSound());

    act(() => result.current.play('click'));

    // 'click' = two sine blips → two oscillators + two gains
    expect(fakeCtx.createOscillator).toHaveBeenCalledTimes(2);
    expect(fakeCtx.createGain).toHaveBeenCalledTimes(2);
  });

  it('plays nothing when quiet mode is on', () => {
    useStore.setState({ sensory: { quiet: true, dim: false, swap: false } });
    const { result } = renderHook(() => useSound());

    act(() => result.current.play('click'));

    expect(fakeCtx.createOscillator).not.toHaveBeenCalled();
    expect(fakeCtx.createGain).not.toHaveBeenCalled();
  });

  it('suppresses every sound name in quiet mode (achievement, levelUp, confetti)', () => {
    useStore.setState({ sensory: { quiet: true, dim: false, swap: false } });
    const { result } = renderHook(() => useSound());

    act(() => result.current.play('achievement'));
    act(() => result.current.play('levelUp'));
    act(() => result.current.play('confetti'));

    expect(fakeCtx.createOscillator).not.toHaveBeenCalled();
  });

  it('does not crash when the persisted state lacks the sensory field', () => {
    // Simulate old persisted state (before sensory existed) — zustand
    // persist rehydration could leave it undefined.
    useStore.setState({ sensory: undefined as any });
    const { result } = renderHook(() => useSound());

    expect(() => act(() => result.current.play('click'))).not.toThrow();
    expect(fakeCtx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('throttles the same sound to once per 500ms', () => {
    const { result } = renderHook(() => useSound());

    act(() => result.current.play('hover'));
    const afterFirst = fakeCtx.createOscillator.mock.calls.length;

    // Immediately again → throttled (no new oscillator)
    act(() => result.current.play('hover'));
    expect(fakeCtx.createOscillator.mock.calls.length).toBe(afterFirst);

    // After 500ms it can play again
    act(() => vi.advanceTimersByTime(500));
    act(() => result.current.play('hover'));
    expect(fakeCtx.createOscillator.mock.calls.length).toBeGreaterThan(afterFirst);
  });

  it('does not throttle different sounds against each other', () => {
    const { result } = renderHook(() => useSound());

    act(() => result.current.play('hover'));
    act(() => result.current.play('click'));

    // hover (1 osc) + click (2 osc) both scheduled despite the throttle
    expect(fakeCtx.createOscillator).toHaveBeenCalledTimes(3);
  });

  it('plays the bossDefeated victory fanfare (9 oscillators + noise burst)', () => {
    const { result } = renderHook(() => useSound());

    act(() => result.current.play('bossDefeated'));

    // impact (1) + rising arpeggio (5) + held chord (3) = 9 oscillators
    expect(fakeCtx.createOscillator).toHaveBeenCalledTimes(9);
    // percussive noise burst uses a buffer source + bandpass filter
    expect(fakeCtx.createBufferSource).toHaveBeenCalledTimes(1);
    expect(fakeCtx.createBiquadFilter).toHaveBeenCalledTimes(1);
  });
});
