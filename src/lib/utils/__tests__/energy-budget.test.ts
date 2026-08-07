import { describe, it, expect } from 'vitest';
import { energyBudget } from '../energy-budget';

describe('energyBudget', () => {
  it('rec < 35 → restore/minimal, corta y ≤ 12 min', () => {
    const b = energyBudget(30, 20, 0);
    expect(b.kind).toBe('restore');
    expect(b.intensity).toBe('minimal');
    expect(b.duration).toBeGreaterThanOrEqual(5);
    expect(b.duration).toBeLessThanOrEqual(12);
  });

  it('rec < 55 → train/light, cap a 20 min', () => {
    const b = energyBudget(45, 60, 80);
    expect(b.kind).toBe('train');
    expect(b.intensity).toBe('light');
    expect(b.duration).toBe(20);
  });

  it('rec ≥ 75 y consistencia ≥ 60 → push con +5 min (máx 40)', () => {
    const b = energyBudget(80, 30, 75);
    expect(b.intensity).toBe('push');
    expect(b.duration).toBe(35);
    const capped = energyBudget(80, 60, 75);
    expect(capped.duration).toBe(40);
  });

  it('cualquier otro caso → train/standard con duración preferida', () => {
    const b = energyBudget(60, 25, 50);
    expect(b.intensity).toBe('standard');
    expect(b.duration).toBe(25);
  });

  it('umbrales iguales a los de DecisionEngine (30/45/80)', () => {
    expect(energyBudget(30, 20, 0).intensity).toBe('minimal');
    expect(energyBudget(45, 20, 0).intensity).toBe('light');
    expect(energyBudget(80, 20, 60).intensity).toBe('push');
    expect(energyBudget(60, 20, 60).intensity).toBe('standard');
  });
});
