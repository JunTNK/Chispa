'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store';
import { EN } from './translations/index';

export type Lang = 'es' | 'en';

/**
 * useT — hook de internacionalización ligero.
 *
 * Uso:
 *   const t = useT();
 *   t('Iniciar sesión')                 → traduce a EN si lang==='en', si no devuelve el original
 *   t('{n} ejercicios', { n: 5 })       → interpolación con llaves `{nombre}`
 *
 * La clave del diccionario es SIEMPRE el string en español (con `{var}` para
 * partes dinámicas). Si no hay traducción EN registrada, devuelve el original.
 */
export function useT(): (text: string, vars?: Record<string, string | number>) => string {
  const lang = useStore((s) => s.lang);

  return useCallback(
    (text: string, vars?: Record<string, string | number>): string => {
      let out = lang === 'en' ? (EN[text] ?? text) : text;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.split(`{${k}}`).join(String(v));
        }
      }
      return out;
    },
    [lang]
  );
}

/** Locale BCP-47 según el idioma activo (para fechas, Intl, etc.) */
export function useLocale(): string {
  const lang = useStore((s) => s.lang);
  return lang === 'en' ? 'en-US' : 'es-ES';
}
