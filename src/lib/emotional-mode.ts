/**
 * CHISPA — Modos emocionales DEDUCIDOS (spec CHISPA-UX §3).
 *
 * Los modos (Chispa 2 min, Caos, Calma, Silla/Cama, Microhábito) NUNCA se
 * muestran como menú: el usuario informa con el check-in de 3 taps y el
 * algoritmo deduce el modo. CHISPA decide; el usuario solo reporta.
 *
 * El modo alimenta el plan del día (título, mensaje y salvaguardas de
 * intensidad) y se muestra como una etiqueta de contexto, no como elección.
 */
import type { CheckIn, EmotionalMode } from '@/types';

export interface ModeInfo {
  id: EmotionalMode;
  /** Clave de traducción del nombre visible (ej. "Chispa 2 min"). */
  labelKey: string;
  /** Clave de traducción de la descripción/mensaje del modo. */
  descKey: string;
  /** Clave de traducción de la salvaguarda emocional (si aplica). */
  safetyKey?: string;
}

const MODE_META: Record<EmotionalMode, ModeInfo> = {
  chispa: {
    id: 'chispa',
    labelKey: 'Chispa 2 min',
    descKey: 'Un solo movimiento para encender. Dos minutos bastan.',
  },
  caos: {
    id: 'caos',
    labelKey: 'Caos',
    descKey: 'Cabeza a mil. Movimiento simple y repetitivo para bajar el ruido.',
    safetyKey: 'Caos',
  },
  calma: {
    id: 'calma',
    labelKey: 'Calma',
    descKey: 'Sesión tranquila, sin prisa ni exigencia.',
  },
  silla: {
    id: 'silla',
    labelKey: 'Silla/Cama',
    descKey: 'Todo desde sentado o acostado. Sin levantarte.',
    safetyKey: 'Silla/Cama',
  },
  micro: {
    id: 'micro',
    labelKey: 'Microhábito',
    descKey: 'Lo mínimo: un ejercicio, una serie. Eso ya es mucho.',
    safetyKey: 'Microhábito',
  },
};

export const EMOTIONAL_MODES: readonly EmotionalMode[] = [
  'chispa',
  'caos',
  'calma',
  'silla',
  'micro',
];

/**
 * Deduce el modo emocional del check-in. El orden importa (de lo más intenso
 * a lo más suave) para que la salvaguarda emocional gane siempre.
 *
 * Reglas:
 * - Caos (cabeza a mil) → nunca HIIT; el motor propone calma/recarga.
 * - Agotado / silla-cama + baja energía → Modo Silla/Cama (movimiento sentado).
 * - Baja energía → Microhábito (lo mínimo viable, victoria asegurada).
 * - Silla/Cama como lugar → Modo Silla/Cama.
 * - Calma → Modo Calma.
 * - 2 min o cabeza Chispa → Chispa 2 min (entrada mínima).
 * - Media energía → Calma. Alta energía → Chispa (energía disponible).
 */
export function deduceEmotionalMode(checkin: Pick<CheckIn, 'location' | 'time' | 'head' | 'energy'>): EmotionalMode {
  if (checkin.head === 'caos') return 'caos';
  if (
    checkin.head === 'agotado' ||
    (checkin.location === 'silla' && checkin.energy <= 3)
  ) {
    return 'silla';
  }
  if (checkin.location === 'silla') return 'silla';
  if (checkin.energy <= 3) return 'micro';
  if (checkin.head === 'calma') return 'calma';
  if (checkin.time === 2 || checkin.head === 'chispa') return 'chispa';
  if (checkin.energy <= 6) return 'calma';
  return 'chispa';
}

/** Información de traducción para un modo dado. */
export function modeInfo(mode: EmotionalMode): ModeInfo {
  return MODE_META[mode];
}

/**
 * Salvaguarda emocional (spec §3): ciertos estados NUNCA reciben HIIT.
 * El motor propone respiración, estiramiento suave, movimiento en silla o
 * grounding, y recuerda que la app no reemplaza apoyo profesional.
 */
export function needsEmotionalSafety(mode: EmotionalMode): boolean {
  return mode === 'caos' || mode === 'silla' || mode === 'micro';
}

/**
 * Traduce el check-in de 3 taps al modelo numérico del motor de decisión
 * (sleep/energy/stress 1–10). El sueño no se pregunta: se usa el default 7h
 * (la energía y la cabeza son las señales dominantes del día).
 */
export function mapTapCheckinToModel(
  tap: { energy: 'baja' | 'media' | 'alta'; head?: 'chispa' | 'caos' | 'calma' | 'agotado' },
): { sleep: number; energy: number; stress: number } {
  const energy = tap.energy === 'baja' ? 3 : tap.energy === 'media' ? 6 : 9;
  let stress = 4;
  if (tap.head === 'chispa') stress = 3;
  else if (tap.head === 'caos') stress = 8;
  else if (tap.head === 'calma') stress = 2;
  else if (tap.head === 'agotado') stress = 9;
  else if (tap.energy === 'baja') stress = 6;
  else if (tap.energy === 'alta') stress = 3;
  return { sleep: 7, energy, stress };
}
