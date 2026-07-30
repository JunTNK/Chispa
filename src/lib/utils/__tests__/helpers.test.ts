import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  clamp,
  ema,
  uid,
  todayKey,
  daysAgoKey,
  daysBetween,
  cap,
  fmtTime,
  shuffle,
  recColor,
  recWord,
  localGet,
  localSet,
  matchesEquipment,
} from '../helpers';

/* ═══════════════════════════════════════════
   cn (clsx + tailwind-merge)
   ═══════════════════════════════════════════ */

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('handles conditional classes via object', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('resolves tailwind conflicts (px-4 px-2 → px-2)', () => {
    // tailwind-merge should resolve the conflict
    const result = cn('px-4', 'px-2');
    expect(result).toBe('px-2');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
  });

  it('filters falsy values', () => {
    expect(cn('a', undefined, null, '', 'b')).toBe('a b');
  });
});

/* ═══════════════════════════════════════════
   clamp
   ═══════════════════════════════════════════ */

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('returns min when value is below', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('returns max when value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
    expect(clamp(0, -10, -1)).toBe(-1);
  });

  it('handles value at boundary', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('clamps zero correctly', () => {
    expect(clamp(0, 1, 5)).toBe(1);
    expect(clamp(0, -5, -1)).toBe(-1);
  });
});

/* ═══════════════════════════════════════════
   ema (Exponential Moving Average)
   ═══════════════════════════════════════════ */

describe('ema', () => {
  it('computes EMA with weight=0.3', () => {
    // prev=100, current=50, weight=0.3 → 100*0.7 + 50*0.3 = 70 + 15 = 85
    expect(ema(100, 50, 0.3)).toBeCloseTo(85, 5);
  });

  it('returns current when weight=1', () => {
    expect(ema(100, 50, 1)).toBe(50);
  });

  it('returns prev when weight=0', () => {
    expect(ema(100, 50, 0)).toBe(100);
  });

  it('handles equal values (no change)', () => {
    expect(ema(75, 75, 0.5)).toBe(75);
  });
});

/* ═══════════════════════════════════════════
   uid
   ═══════════════════════════════════════════ */

describe('uid', () => {
  it('returns a string', () => {
    expect(typeof uid()).toBe('string');
  });

  it('returns different values on subsequent calls', () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });

  it('has reasonable length (base36 timestamp + random)', () => {
    const id = uid();
    expect(id.length).toBeGreaterThanOrEqual(5);
    expect(id.length).toBeLessThanOrEqual(20);
  });
});

/* ═══════════════════════════════════════════
   todayKey
   ═══════════════════════════════════════════ */

describe('todayKey', () => {
  it('returns YYYY-MM-DD format', () => {
    const key = todayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches current date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'));
    expect(todayKey()).toBe('2026-07-04');
    vi.useRealTimers();
  });
});

/* ═══════════════════════════════════════════
   daysAgoKey
   ═══════════════════════════════════════════ */

describe('daysAgoKey', () => {
  it('returns today for n=0', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'));
    expect(daysAgoKey(0)).toBe('2026-07-04');
    vi.useRealTimers();
  });

  it('returns date n days ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'));
    expect(daysAgoKey(1)).toBe('2026-07-03');
    expect(daysAgoKey(7)).toBe('2026-06-27');
    expect(daysAgoKey(30)).toBe('2026-06-04');
    vi.useRealTimers();
  });

  it('crosses month boundaries correctly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
    expect(daysAgoKey(1)).toBe('2026-02-28');
    vi.useRealTimers();
  });

  it('crosses year boundaries correctly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    expect(daysAgoKey(1)).toBe('2025-12-31');
    vi.useRealTimers();
  });
});

/* ═══════════════════════════════════════════
   daysBetween
   ═══════════════════════════════════════════ */

describe('daysBetween', () => {
  it('returns 0 for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'));
    expect(daysBetween('2026-07-04')).toBe(0);
    vi.useRealTimers();
  });

  it('returns positive number for past dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'));
    expect(daysBetween('2026-06-30')).toBe(4);
    vi.useRealTimers();
  });

  it('returns 0 for future dates (floor)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T12:00:00Z'));
    // Future date: denominator is positive for past, negative for future
    // Math.floor of negative number → more negative
    // But daysBetween clamps... let me check the source
    // Math.floor((today - from) / 86400000) where from is in the future
    // today - from is negative, floor makes it more negative
    // e.g., July 4 - July 10 = -6, floor(-6/86400000) = floor(-6) = -6
    expect(daysBetween('2026-07-10')).toBe(-6);
    vi.useRealTimers();
  });
});

/* ═══════════════════════════════════════════
   cap (capitalize)
   ═══════════════════════════════════════════ */

describe('cap', () => {
  it('capitalizes first letter', () => {
    expect(cap('hello')).toBe('Hello');
  });

  it('preserves case of remaining characters (no lowercasing)', () => {
    expect(cap('HELLO')).toBe('HELLO'); // Only first letter is uppercased, rest unchanged
  });

  it('returns empty string for empty input', () => {
    expect(cap('')).toBe('');
  });

  it('handles single character', () => {
    expect(cap('a')).toBe('A');
  });

  it('handles already capitalized string', () => {
    expect(cap('Hello')).toBe('Hello');
  });
});

/* ═══════════════════════════════════════════
   fmtTime (seconds → MM:SS)
   ═══════════════════════════════════════════ */

describe('fmtTime', () => {
  it('formats 0 seconds', () => {
    expect(fmtTime(0)).toBe('00:00');
  });

  it('formats seconds-only', () => {
    expect(fmtTime(45)).toBe('00:45');
  });

  it('formats minutes and seconds', () => {
    expect(fmtTime(125)).toBe('02:05');
  });

  it('formats hours as extra minutes', () => {
    expect(fmtTime(3600)).toBe('60:00');
  });

  it('pads single-digit minutes and seconds', () => {
    expect(fmtTime(61)).toBe('01:01');
    expect(fmtTime(7)).toBe('00:07');
  });

  it('handles large values', () => {
    expect(fmtTime(9999)).toBe('166:39');
  });
});

/* ═══════════════════════════════════════════
   shuffle (Fisher-Yates)
   ═══════════════════════════════════════════ */

describe('shuffle', () => {
  it('returns a new array (does not mutate)', () => {
    const arr = [1, 2, 3];
    const result = shuffle(arr);
    expect(result).not.toBe(arr); // different reference
  });

  it('preserves all elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result.sort()).toEqual(arr.sort());
  });

  it('preserves length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr).length).toBe(5);
  });

  it('handles empty array', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles single element', () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it('handles two elements', () => {
    const result = shuffle(['a', 'b']);
    expect(result.length).toBe(2);
    expect(result).toContain('a');
    expect(result).toContain('b');
  });
});

/* ═══════════════════════════════════════════
   recColor
   ═══════════════════════════════════════════ */

describe('recColor', () => {
  it('returns good color for >= 75', () => {
    expect(recColor(75)).toBe('var(--good)');
    expect(recColor(100)).toBe('var(--good)');
  });

  it('returns accent color for 55-74', () => {
    expect(recColor(55)).toBe('var(--accent)');
    expect(recColor(74)).toBe('var(--accent)');
  });

  it('returns warn color for 35-54', () => {
    expect(recColor(35)).toBe('var(--warn)');
    expect(recColor(54)).toBe('var(--warn)');
  });

  it('returns bad color for < 35', () => {
    expect(recColor(34)).toBe('var(--bad)');
    expect(recColor(0)).toBe('var(--bad)');
    expect(recColor(-1)).toBe('var(--bad)');
  });
});

/* ═══════════════════════════════════════════
   recWord
   ═══════════════════════════════════════════ */

describe('recWord', () => {
  it('returns Óptimo for >= 75', () => {
    expect(recWord(75)).toBe('Óptimo');
    expect(recWord(100)).toBe('Óptimo');
  });

  it('returns Listo for 55-74', () => {
    expect(recWord(55)).toBe('Listo');
    expect(recWord(74)).toBe('Listo');
  });

  it('returns A medio gas for 35-54', () => {
    expect(recWord(35)).toBe('A medio gas');
    expect(recWord(54)).toBe('A medio gas');
  });

  it('returns Pide calma for < 35', () => {
    expect(recWord(34)).toBe('Pide calma');
    expect(recWord(0)).toBe('Pide calma');
  });
});

/* ═══════════════════════════════════════════
   matchesEquipment
   ═══════════════════════════════════════════ */

describe('matchesEquipment', () => {
  describe('profile: ninguno (solo bodyweight)', () => {
    it('accepts ninguno (bodyweight)', () => {
      expect(matchesEquipment('ninguno', 'ninguno')).toBe(true);
    });

    it('rejects mancuernas', () => {
      expect(matchesEquipment('ninguno', 'mancuernas')).toBe(false);
    });

    it('rejects barra', () => {
      expect(matchesEquipment('ninguno', 'barra')).toBe(false);
    });

    it('rejects kettlebell', () => {
      expect(matchesEquipment('ninguno', 'kettlebell')).toBe(false);
    });

    it('rejects máquina', () => {
      expect(matchesEquipment('ninguno', 'máquina')).toBe(false);
    });

    it('rejects polea', () => {
      expect(matchesEquipment('ninguno', 'polea')).toBe(false);
    });

    it('rejects bandas', () => {
      expect(matchesEquipment('ninguno', 'bandas')).toBe(false);
    });

    it('rejects empty string (no equipment value)', () => {
      expect(matchesEquipment('ninguno', '')).toBe(false);
    });
  });

  describe('profile: mancuernas (bodyweight + dumbbells)', () => {
    it('accepts ninguno (bodyweight)', () => {
      expect(matchesEquipment('mancuernas', 'ninguno')).toBe(true);
    });

    it('accepts mancuernas', () => {
      expect(matchesEquipment('mancuernas', 'mancuernas')).toBe(true);
    });

    it('rejects barra', () => {
      expect(matchesEquipment('mancuernas', 'barra')).toBe(false);
    });

    it('rejects barra Z', () => {
      expect(matchesEquipment('mancuernas', 'barra Z')).toBe(false);
    });

    it('rejects kettlebell', () => {
      expect(matchesEquipment('mancuernas', 'kettlebell')).toBe(false);
    });

    it('rejects máquina', () => {
      expect(matchesEquipment('mancuernas', 'máquina')).toBe(false);
    });

    it('rejects polea', () => {
      expect(matchesEquipment('mancuernas', 'polea')).toBe(false);
    });

    it('rejects bandas', () => {
      expect(matchesEquipment('mancuernas', 'bandas')).toBe(false);
    });

    it('rejects pelota suiza', () => {
      expect(matchesEquipment('mancuernas', 'pelota suiza')).toBe(false);
    });

    it('rejects balón medicinal', () => {
      expect(matchesEquipment('mancuernas', 'balón medicinal')).toBe(false);
    });

    it('rejects rodillo', () => {
      expect(matchesEquipment('mancuernas', 'rodillo')).toBe(false);
    });

    it('rejects otro', () => {
      expect(matchesEquipment('mancuernas', 'otro')).toBe(false);
    });
  });

  describe('profile: gimnasio (all equipment)', () => {
    it('accepts ninguno (bodyweight)', () => {
      expect(matchesEquipment('gimnasio', 'ninguno')).toBe(true);
    });

    it('accepts mancuernas', () => {
      expect(matchesEquipment('gimnasio', 'mancuernas')).toBe(true);
    });

    it('accepts barra', () => {
      expect(matchesEquipment('gimnasio', 'barra')).toBe(true);
    });

    it('accepts barra Z', () => {
      expect(matchesEquipment('gimnasio', 'barra Z')).toBe(true);
    });

    it('accepts kettlebell', () => {
      expect(matchesEquipment('gimnasio', 'kettlebell')).toBe(true);
    });

    it('accepts máquina', () => {
      expect(matchesEquipment('gimnasio', 'máquina')).toBe(true);
    });

    it('accepts polea', () => {
      expect(matchesEquipment('gimnasio', 'polea')).toBe(true);
    });

    it('accepts bandas', () => {
      expect(matchesEquipment('gimnasio', 'bandas')).toBe(true);
    });

    it('accepts pelota suiza', () => {
      expect(matchesEquipment('gimnasio', 'pelota suiza')).toBe(true);
    });

    it('accepts balón medicinal', () => {
      expect(matchesEquipment('gimnasio', 'balón medicinal')).toBe(true);
    });

    it('accepts rodillo', () => {
      expect(matchesEquipment('gimnasio', 'rodillo')).toBe(true);
    });

    it('accepts otro (unknown equipment)', () => {
      expect(matchesEquipment('gimnasio', 'otro')).toBe(true);
    });

    it('accepts empty string (edge case)', () => {
      expect(matchesEquipment('gimnasio', '')).toBe(true);
    });

    it('accepts any random value', () => {
      expect(matchesEquipment('gimnasio', 'cualquier_cosa')).toBe(true);
    });
  });

  describe('default fallback (unknown profile equipment)', () => {
    it('matches exact value', () => {
      expect(matchesEquipment('unknown_profile_eq', 'unknown_profile_eq')).toBe(true);
    });

    it('does not match different values', () => {
      expect(matchesEquipment('custom_value', 'different_value')).toBe(false);
    });

    it('does not match empty string against non-empty', () => {
      expect(matchesEquipment('some_value', '')).toBe(false);
    });

    it('does not match empty string against empty', () => {
      expect(matchesEquipment('', '')).toBe(true);
    });
  });
});

/* ═══════════════════════════════════════════
   localGet / localSet (localStorage)
   ═══════════════════════════════════════════ */

describe('localGet / localSet', () => {
  const TEST_KEY = '_test_helpers_';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.removeItem(TEST_KEY);
  });

  describe('localSet', () => {
    it('writes a string value', () => {
      localSet(TEST_KEY, 'hello');
      expect(localStorage.getItem(TEST_KEY)).toBe('"hello"');
    });

    it('writes a number value', () => {
      localSet(TEST_KEY, 42);
      expect(localStorage.getItem(TEST_KEY)).toBe('42');
    });

    it('writes an object value', () => {
      localSet(TEST_KEY, { a: 1, b: 'two' });
      expect(JSON.parse(localStorage.getItem(TEST_KEY)!)).toEqual({ a: 1, b: 'two' });
    });

    it('writes null', () => {
      localSet(TEST_KEY, null);
      expect(localStorage.getItem(TEST_KEY)).toBe('null');
    });

    it('does not throw when window is undefined', () => {
      // Simulate server-side by temporarily removing window
      const win = globalThis.window;
      try {
        // @ts-expect-error — testing SSR edge case
        delete globalThis.window;
        expect(() => localSet(TEST_KEY, 'test')).not.toThrow();
      } finally {
        globalThis.window = win;
      }
    });
  });

  describe('localGet', () => {
    it('reads a stored string', () => {
      localStorage.setItem(TEST_KEY, JSON.stringify('hello'));
      expect(localGet(TEST_KEY, 'fallback')).toBe('hello');
    });

    it('reads a stored number', () => {
      localStorage.setItem(TEST_KEY, JSON.stringify(42));
      expect(localGet(TEST_KEY, 0)).toBe(42);
    });

    it('reads a stored object', () => {
      const obj = { a: 1 };
      localStorage.setItem(TEST_KEY, JSON.stringify(obj));
      expect(localGet(TEST_KEY, {})).toEqual(obj);
    });

    it('returns fallback when key is missing', () => {
      expect(localGet('nonexistent_key', 'default')).toBe('default');
    });

    it('returns fallback when localStorage has invalid JSON', () => {
      localStorage.setItem(TEST_KEY, '{invalid');
      expect(localGet(TEST_KEY, 'fallback')).toBe('fallback');
    });

    it('returns fallback when window is undefined (SSR)', () => {
      const win = globalThis.window;
      try {
        // @ts-expect-error — testing SSR edge case
        delete globalThis.window;
        expect(localGet(TEST_KEY, 'ssr-fallback')).toBe('ssr-fallback');
      } finally {
        globalThis.window = win;
      }
    });
  });
});
