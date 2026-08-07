/**
 * voice-lines — construye las frases habladas del modo audio (pure functions).
 *
 * Principio ND:
 * - Una frase por transición (inicio de ejercicio, descanso, siguiente serie,
 *   fin de sesión) — nunca se repite.
 * - Sin números 'saludados' que presionen: la voz informa, el usuario decide.
 */

export type VoiceLang = 'es' | 'en';

/** Anuncio al comenzar un ejercicio. */
export function exerciseIntro(
  n: number,
  total: number,
  name: string,
  reps: number,
  isTime: boolean,
  lang: VoiceLang,
): { es: string; en: string } {
  const t = lang === 'es'
    ? `Ejercicio ${n} de ${total}. ${name}. ${reps} ${isTime ? 'segundos' : 'repeticiones'}`
    : `Exercise ${n} of ${total}. ${name}. ${reps} ${isTime ? 'seconds' : 'repetitions'}`;
  return { es: t, en: t };
}

/** Anuncio al empezar el descanso (solo audible, sin cuenta regresiva spam). */
export function restIntro(seconds: number): { es: string; en: string } {
  return {
    es: `Descanso. ${seconds} segundos`,
    en: `Rest. ${seconds} seconds`,
  };
}

/** Anuncio al retomar una serie del mismo ejercicio (rest = 0). */
export function nextSetIntro(setNum: number, name: string, reps: number, isTime: boolean, lang: VoiceLang): { es: string; en: string } {
  const t =
    lang === 'es'
      ? `Serie ${setNum}. ${name}. ${reps} ${isTime ? 'segundos' : 'repeticiones'}`
      : `Set ${setNum}. ${name}. ${reps} ${isTime ? 'seconds' : 'repetitions'}`;
  return { es: t, en: t };
}

/** Anuncio de fin de sesión. */
export function sessionEndIntro(): { es: string; en: string } {
  return {
    es: 'Sesión terminada',
    en: 'Session complete',
  };
}

/** Devuelve la frase según idioma. */
export function lineFor(l: { es: string; en: string }, lang: VoiceLang): string {
  return l[lang];
}