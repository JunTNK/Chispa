import { describe, it, expect } from 'vitest';
import {
  ANCHOR_OPTIONS,
  ANCHOR_WINDOWS,
  ANCHOR_MINUTES,
  anchorLabel,
  anchorWindowLabel,
  currentAnchorWindow,
  anchorNudgeKey,
} from '../anchor-utils';

describe('anchor-utils', () => {
  it('trae etiquetas ES y EN según idioma', () => {
    expect(anchorLabel('coffee', 'es')).toBe('tu café');
    expect(anchorLabel('coffee', 'en')).toBe('your coffee');
    expect(anchorLabel('nope', 'es')).toBe('nope');
    expect(anchorWindowLabel('morning', 'es')).toBe('en la mañana');
    expect(anchorWindowLabel('morning', 'en')).toBe('in the morning');
  });

  it('ofrece 6 anclas, 3 ventanas y duraciones de 1/2/5 min', () => {
    expect(ANCHOR_OPTIONS).toHaveLength(6);
    expect(ANCHOR_WINDOWS).toHaveLength(3);
    expect([...ANCHOR_MINUTES]).toEqual([1, 2, 5]);
  });

  it('detecta la ventana por hora local', () => {
    expect(currentAnchorWindow(new Date('2026-01-01T09:00:00'))).toBe('morning');
    expect(currentAnchorWindow(new Date('2026-01-01T14:00:00'))).toBe('afternoon');
    expect(currentAnchorWindow(new Date('2026-01-01T20:00:00'))).toBe('evening');
  });

  it('la clave de nudge es única por fecha y ventana', () => {
    expect(anchorNudgeKey('2026-08-07', 'morning')).toBe('2026-08-07:morning');
    expect(anchorNudgeKey('2026-08-07', 'morning')).not.toBe(
      anchorNudgeKey('2026-08-07', 'evening'),
    );
  });
});
