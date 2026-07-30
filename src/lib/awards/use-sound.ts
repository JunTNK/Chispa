'use client';

import { useCallback, useRef } from 'react';

/* ─── Audio Context singleton ─── */

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (_ctx.state === 'suspended') {
    _ctx.resume();
  }
  return _ctx;
}

/* ─── Helpers ─── */

function playNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'square',
  volume: number = 0.08,
  rampDown: boolean = true
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(volume, startTime);
  if (rampDown) {
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  }
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playNoiseBurst(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  volume: number = 0.04
) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Bandpass filter to make it sound like shimmer
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(4000, startTime);
  filter.Q.setValueAtTime(0.5, startTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(startTime);
  source.stop(startTime + duration);
}

/* ─── Sound Presets ─── */

const SOUNDS = {
  /**
   * Classic RPG level-up fanfare: ascending arpeggio C5 → E5 → G5 → C6
   * Square wave for retro feel, with slight volume fade per note.
   */
  levelUp: () => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const noteDuration = 0.2;
    const gap = 0.08;

    // Ascending arpeggio — each note rings then fades
    notes.forEach((freq, i) => {
      const t = now + i * (noteDuration + gap);
      playNote(ctx, freq, t, noteDuration + 0.1, 'square', 0.06, true);
    });

    // Final chord (C5 + E5 + G5) held briefly
    const chordTime = now + notes.length * (noteDuration + gap) - 0.05;
    [523.25, 659.25, 783.99].forEach((freq) => {
      playNote(ctx, freq, chordTime, 0.4, 'triangle', 0.035);
    });
  },

  /**
   * Confetti sparkle: rapid high-pitched shimmer + chime
   */
  confetti: () => {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Fast shimmer (noise burst)
    playNoiseBurst(ctx, now, 0.4, 0.03);

    // High chime notes (randomized pentatonic)
    const chimes = [1046.5, 1174.66, 1318.51, 1567.98, 1760]; // C6, D6, E6, G6, A6
    for (let i = 0; i < 6; i++) {
      const freq = chimes[Math.floor(Math.random() * chimes.length)];
      const t = now + 0.05 + i * 0.06;
      playNote(ctx, freq, t, 0.3 + Math.random() * 0.2, 'sine', 0.015 + Math.random() * 0.01);
    }
  },

  /**
   * Achievement unlock: magical ascending chime
   */
  /**
   * UI hover: tiny soft tick — very short, quiet triangle blip
   * Throttled locally at ~200ms to avoid rapid-fire noise.
   */
  hover: () => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // Quick high-pitched tick (sine, almost inaudible)
    playNote(ctx, 1200, now, 0.05, 'sine', 0.02);
  },

  /**
   * UI click: satisfying pop — quick two-note descending interval
   */
  click: () => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // Quick pop: sine blip at 800Hz, then 600Hz for confirmation feel
    playNote(ctx, 800, now, 0.07, 'sine', 0.04);
    playNote(ctx, 600, now + 0.04, 0.09, 'sine', 0.035);
  },

  achievement: () => {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Two ascending octaves of a major triad (C major)
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]; // C5 → G6
    notes.forEach((freq, i) => {
      const t = now + i * 0.08;
      playNote(ctx, freq, t, 0.35, 'triangle', 0.05 - i * 0.005);
    });

    // Soft pad chord in background
    [523.25, 659.25, 783.99].forEach((freq) => {
      playNote(ctx, freq, now, 0.8, 'sine', 0.015);
    });
  },
};

/* ─── Hook ─── */

export type SoundName = keyof typeof SOUNDS;

/**
 * Hook that provides RPG-style sound effects via Web Audio API.
 * No audio files needed — uses oscillators and noise generators.
 *
 * Usage:
 *   const { play } = useSound();
 *   play('levelUp');  // Level-up fanfare
 *   play('confetti'); // Confetti sparkle
 *   play('achievement'); // Achievement chime
 */
export function useSound() {
  const lastPlayRef = useRef<Record<string, number>>({});

  const play = useCallback((name: SoundName) => {
    // Throttle: prevent playing the same sound more than once per 500ms
    const now = Date.now();
    const last = lastPlayRef.current[name] ?? 0;
    if (now - last < 500) return;
    lastPlayRef.current[name] = now;

    try {
      SOUNDS[name]?.();
    } catch {
      // Web Audio API can throw if called before user gesture
      // Silently ignore — sounds are purely cosmetic
    }
  }, []);

  return { play };
}
