/**
 * Test de resolución i18n — error.tsx / not-found.tsx / loading.tsx.
 *
 * Garantiza que TODAS las claves ES usadas por los boundaries de error, el
 * 404 y la pantalla de carga resuelven en el diccionario EN mergeado
 * (index.ts → EN, que expande enCommon + enErrors + enOnboarding + …). Si
 * alguien elimina, renombra o mueve una clave a otro módulo y esta deja de
 * llegar al merge, el usuario EN vería el texto en español en lugar de la
 * traducción — este test lo detecta antes.
 */
import { describe, it, expect } from 'vitest';
import { EN } from '@/lib/i18n/translations/index';
import { enErrors } from '@/lib/i18n/translations/errors';

/** Claves ES usadas por src/app/error.tsx (vía t()). */
const ERROR_PAGE_KEYS = [
  'Algo salió mal',
  'CHISPA encontró un error inesperado. No te preocupes — tu progreso está guardado localmente en tu dispositivo.',
  'Intentar de nuevo',
  'Volver al inicio',
  'Recargar la página',
  'Si el error persiste, contacta a soporte con el código:',
  'Copiar código',
  '¡Copiado!',
] as const;

/** Claves ES usadas por src/app/not-found.tsx (vía t()). */
const NOT_FOUND_KEYS = [
  'Página no encontrada',
  'La página que buscas no existe o fue movida.',
  'Volver al inicio',
] as const;

/** Claves ES usadas por src/app/loading.tsx (vía t()). */
const LOADING_KEYS = ['Cargando...', 'Un momento...'] as const;

const ALL_KEYS = [...ERROR_PAGE_KEYS, ...NOT_FOUND_KEYS, ...LOADING_KEYS];

describe('i18n · claves de las páginas de error resuelven en EN', () => {
  it.each(ERROR_PAGE_KEYS)('error.tsx: "%s" resuelve en el diccionario EN mergeado', (key) => {
    expect(EN[key], `Falta traducción EN para "${key}"`).toBeDefined();
    expect(EN[key], `Traducción EN vacía para "${key}"`).not.toBe('');
  });

  it.each(NOT_FOUND_KEYS)('not-found.tsx: "%s" resuelve en el diccionario EN mergeado', (key) => {
    expect(EN[key], `Falta traducción EN para "${key}"`).toBeDefined();
    expect(EN[key], `Traducción EN vacía para "${key}"`).not.toBe('');
  });

  it.each(LOADING_KEYS)('loading.tsx: "%s" resuelve en el diccionario EN mergeado', (key) => {
    expect(EN[key], `Falta traducción EN para "${key}"`).toBeDefined();
    expect(EN[key], `Traducción EN vacía para "${key}"`).not.toBe('');
  });

  it('la traducción EN nunca es un passthrough de la clave ES', () => {
    for (const key of ALL_KEYS) {
      expect(EN[key], `"${key}" cayó al passthrough (sin traducción real)`).not.toBe(key);
    }
  });

  it('las traducciones EN de global-error derivadas de enErrors coinciden con el diccionario', () => {
    // global-error.tsx deriva su EN de enErrors usando los strings ES como
    // claves; aquí confirmamos que esa derivación produce el mismo texto que
    // el diccionario mergeado (ambos deben apuntar a enErrors).
    for (const key of ALL_KEYS) {
      if (enErrors[key]) {
        expect(EN[key], `Mismatch EN entre enErrors y el dict mergeado para "${key}"`).toBe(enErrors[key]);
      }
    }
  });
});
