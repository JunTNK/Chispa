/**
 * rest — descanso preconfigurable entre series.
 *
 * Principio ND:
 * - Auto = comportamiento del motor (ex.rest, con difficulty bump) — cero regresión.
 * - Fixed = countdown fijo para quien prefiere estructura (time blindness).
 * - Manual = sin cronómetro ("Descansa lo que necesites") — el que el countdown
 *   le genera presión. Nunca es un timer de culpa; un solo tap para avanzar.
 */

export type RestPref = 'auto' | 'manual' | 30 | 60 | 90 | 120;

/**
 * Resuelve los segundos de descanso según la preferencia.
 * - auto   → engineRest (lo que ya calculó el motor por intensidad/dificultad)
 * - manual → null (sin cronómetro)
 * - 30/60/90/120 → valor fijo literal
 */
export function resolveRestSeconds(pref: RestPref, engineRest: number): number | null {
  if (pref === 'manual') return null;
  if (pref === 'auto') return engineRest;
  return pref;
}