import { describe, it, expect } from 'vitest';
import { exerciseIntro, restIntro, nextSetIntro, sessionEndIntro, lineFor } from '../voice-lines';

describe('voice-lines (frases del modo audio)', () => {
  it('exerciseIntro: incluye posición, nombre y reps/tiempo', () => {
    const es = lineFor(exerciseIntro(1, 4, 'Sentadilla', 10, false, 'es'), 'es');
    expect(es).toContain('Ejercicio 1 de 4');
    expect(es).toContain('Sentadilla');
    expect(es).toContain('repeticiones');
    const en = lineFor(exerciseIntro(2, 4, 'Plank', 20, true, 'en'), 'en');
    expect(en).toContain('Exercise 2 of 4');
    expect(en).toContain('seconds');
  });

  it('restIntro menciona los segundos, sin cuenta regresiva', () => {
    expect(lineFor(restIntro(30), 'es')).toBe('Descanso. 30 segundos');
    expect(lineFor(restIntro(30), 'en')).toBe('Rest. 30 seconds');
  });

  it('nextIntro indica el número de serie', () => {
    const es = lineFor(nextSetIntro(2, 'Sentadillas', 25, false, 'es'), 'es');
    expect(es).toContain('Serie 2');
    const en = lineFor(nextSetIntro(3, 'Push-ups', 10, false, 'en'), 'en');
    expect(en).toContain('Set 3');
  });

  it('sessionEndIntro cierra sin presión', () => {
    expect(lineFor(sessionEndIntro(), 'es')).toBe('Sesión terminada');
    expect(lineFor(sessionEndIntro(), 'en')).toBe('Session complete');
  });

  it('lineFor resuelve por idioma', () => {
    expect(lineFor({ es: 'a', en: 'b' }, 'es')).toBe('a');
    expect(lineFor({ es: 'a', en: 'b' }, 'en')).toBe('b');
  });
});