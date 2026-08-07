/**
 * ─── Units — medidas corporales ───
 *
 * El perfil almacena SIEMPRE valores canónicos en métrico (kg / cm).
 * La UI muestra según el sistema preferido:
 *   • imperial (default): peso en lb · estatura en ft+in
 *   • metric:             peso en kg · estatura en cm
 */

export type UnitSystem = 'imperial' | 'metric';

/** 1 kg ≈ 2.20462 lb */
const KG_TO_LB = 2.20462;
/** 1 inch = 2.54 cm */
const IN_TO_CM = 2.54;

export function kgToLbs(kg: number): number {
  return kg * KG_TO_LB;
}

export function lbsToKg(lbs: number): number {
  return lbs / KG_TO_LB;
}

export interface FeetInches {
  feet: number;
  inches: number;
}

/** Convierte cm a pies + pulgadas (redondeando pulgadas, corrige overflow 12″). */
export function cmToFtIn(cm: number): FeetInches {
  const totalIn = cm / IN_TO_CM;
  let feet = Math.floor(totalIn / 12);
  let inches = Math.round(totalIn - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function ftInToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * IN_TO_CM;
}

/** Redondea a 1 decimal y quita un '.0' sobrante para mostrar. */
export function fmtMeasure(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Peso formateado según el sistema de unidades (null si no hay valor). */
export function formatWeight(kg: number | null | undefined, units: UnitSystem): string | null {
  if (kg == null) return null;
  return units === 'imperial'
    ? `${fmtMeasure(kgToLbs(kg))} lb`
    : `${fmtMeasure(kg)} kg`;
}

/** Estatura formateada según el sistema de unidades (null si no hay valor). */
export function formatHeight(cm: number | null | undefined, units: UnitSystem): string | null {
  if (cm == null) return null;
  if (units === 'imperial') {
    const { feet, inches } = cmToFtIn(cm);
    return `${feet}'${inches}"`;
  }
  return `${fmtMeasure(cm)} cm`;
}

