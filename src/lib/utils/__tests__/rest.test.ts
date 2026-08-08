import { describe, it, expect } from 'vitest';
import { resolveRestSeconds } from '@/lib/utils/rest';

describe('resolveRestSeconds', () => {
  it('auto usa el rest del motor (ex.rest, con difficulty bump)', () => {
    expect(resolveRestSeconds('auto', 60)).toBe(60);
    expect(resolveRestSeconds('auto', 90)).toBe(90);
  });

  it('manual devuelve null (sin cronómetro)', () => {
    expect(resolveRestSeconds('manual', 60)).toBeNull();
  });

  it('valores fijos se usan literalmente', () => {
    expect(resolveRestSeconds(30, 60)).toBe(30);
    expect(resolveRestSeconds(60, 60)).toBe(60);
    expect(resolveRestSeconds(90, 45)).toBe(90);
    expect(resolveRestSeconds(120, 60)).toBe(120);
  });
});