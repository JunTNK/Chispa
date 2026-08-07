import { describe, it, expect } from 'vitest';
import {
  kgToLbs,
  lbsToKg,
  cmToFtIn,
  ftInToCm,
  fmtMeasure,
  formatWeight,
  formatHeight,
} from '../units';

describe('kg ↔ lb', () => {
  it('converts kg to lb', () => {
    expect(kgToLbs(1)).toBeCloseTo(2.20462, 3);
    expect(kgToLbs(84)).toBeCloseTo(185.2, 0);
  });

  it('converts lb to kg (round-trip)', () => {
    expect(lbsToKg(185.188)).toBeCloseTo(84, 1);
    expect(lbsToKg(kgToLbs(70))).toBeCloseTo(70, 6);
  });
});

describe('cm ↔ ft+in', () => {
  it('converts cm to feet and inches', () => {
    expect(cmToFtIn(180.34)).toEqual({ feet: 5, inches: 11 });
    expect(cmToFtIn(152.4)).toEqual({ feet: 5, inches: 0 });
  });

  it('handles rounding overflow (12 inches → next foot)', () => {
    // 6'0" = 182.88 cm; values just below must not overflow
    expect(cmToFtIn(182.88)).toEqual({ feet: 6, inches: 0 });
    expect(cmToFtIn(182.7)).toEqual({ feet: 6, inches: 0 });
  });

  it('converts feet+inches back to cm', () => {
    expect(ftInToCm(5, 11)).toBeCloseTo(180.34, 1);
    expect(ftInToCm(6, 0)).toBeCloseTo(182.88, 1);
  });
});

describe('fmtMeasure', () => {
  it('strips trailing .0', () => {
    expect(fmtMeasure(84)).toBe('84');
    expect(fmtMeasure(180)).toBe('180');
  });

  it('rounds to 1 decimal', () => {
    expect(fmtMeasure(84.25)).toBe('84.3');
    expect(fmtMeasure(185.19)).toBe('185.2');
  });
});

describe('formatWeight / formatHeight', () => {
  it('formats weight in imperial by default (lb)', () => {
    expect(formatWeight(84, 'imperial')).toBe('185.2 lb');
  });

  it('formats weight in metric (kg)', () => {
    expect(formatWeight(84, 'metric')).toBe('84 kg');
  });

  it('formats height in imperial as ft+in', () => {
    expect(formatHeight(180.34, 'imperial')).toBe(`5'11"`);
  });

  it('formats height in metric as cm', () => {
    expect(formatHeight(180, 'metric')).toBe('180 cm');
  });

  it('returns null for missing values', () => {
    expect(formatWeight(undefined, 'imperial')).toBeNull();
    expect(formatHeight(null, 'metric')).toBeNull();
  });
});

