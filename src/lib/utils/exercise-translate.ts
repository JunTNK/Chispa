'use client';

/**
 * exercise-translate — traducción localizada de textos de ejercicios.
 *
 * Estrategia "traduce una vez, sirve desde caché":
 *   1. Si el idioma es 'en', el contenido del catálogo ya está en inglés →
 *      se usa tal cual (sin traducción).
 *   2. Si es 'es', se busca en IndexedDB (translation-cache).
 *   3. En miss, se usa el LLM on-device (LocalLLM, Qwen2.5) como localizador:
 *      traduce, cachea en IndexedDB y sirve desde caché en adelante.
 *      Cero red, coherente con el local-first del proyecto.
 *
 * Mientras traduce devuelve status 'translating' (text vacío) para que la UI
 * muestre un skeleton — nunca se muestra el inglés como fallback visible.
 * Si el LLM no está disponible (sin WebGPU/WebGL, etc.) devuelve 'failed' con
 * el texto original, para no bloquear la pantalla.
 */
import { useEffect, useState } from 'react';
import {
  getCachedTranslation,
  setCachedTranslation,
} from '@/lib/db/translation-cache';

export type LocalizedStatus = 'original' | 'translating' | 'translated' | 'failed';

export interface LocalizedResult {
  text: string;
  status: LocalizedStatus;
}

/** Traduce un texto con el LLM on-device (dynamic import: no infla el bundle). */
async function translateWithLLM(text: string): Promise<string> {
  const { LocalLLM } = await import('@/lib/ai/local-llm');
  const llm = LocalLLM.getInstance();
  if (!llm.isLoaded) await llm.load();
  return llm.chat(
    [
      {
        role: 'user',
        content: `Traduce al español la siguiente instrucción de ejercicio. Devuelve SOLO la traducción, en imperativo y segunda persona:\n\n${text}`,
      },
    ],
    'Eres un traductor de instrucciones de gimnasio al español. Traduces de forma natural y directa, sin tecnicismos innecesarios. Si el texto contiene pasos numerados ("1.", "2.", ...), conserva exactamente esa numeración. Devuelve únicamente la traducción, sin comentarios, comillas ni texto adicional.'
  );
}

/** In-flight por clave: evita traducir el mismo campo dos veces en paralelo. */
const inflight = new Map<string, Promise<string>>();

/* ─── Detección de idioma (el catálogo mezcla ES de wger con EN de free-exercise-db) ─── */

const ES_MARKERS = ['para', 'con', 'por', 'una', 'un', 'este', 'esta', 'estos', 'entre', 'sobre', 'como', 'cuando', 'mientras', 'ejercicio', 'cada', 'desde', 'hacia', 'debe', 'debes', 'mantén', 'posición', 'cuerpo', 'pecho', 'piernas', 'la', 'el', 'los', 'las', 'se', 'al', 'del', 'sin', 'más'];
const EN_MARKERS = ['the', 'and', 'with', 'from', 'your', 'this', 'that', 'into', 'onto', 'while', 'should', 'will', 'are', 'you', 'starting', 'until', 'keep', 'down', 'up', 'out', 'back', 'over', 'under', 'through', 'after', 'before', 'using', 'place', 'position'];

/**
 * Heurística ligera: ¿el texto ya está en español?
 * Algunos ejercicios del catálogo vienen traducidos de wger; para esos NO
 * tiene sentido pedirle al LLM una traducción ES→ES (desperdicio + caché sucia).
 */
export function isProbablySpanish(text: string): boolean {
  const lower = ` ${text.toLowerCase()} `;
  let es = 0;
  let en = 0;
  for (const w of ES_MARKERS) {
    es += lower.split(` ${w} `).length - 1;
  }
  for (const w of EN_MARKERS) {
    en += lower.split(` ${w} `).length - 1;
  }
  if (es !== en) return es > en;
  // Empate sin marcadores: los cues muy cortos suelen ser ES o minimalistas
  // (no merecen una llamada al LLM); los largos sin señales claras asumimos EN.
  return lower.trim().length < 30;
}

/**
 * Traducción localizada de un campo de un ejercicio.
 *
 * @param exerciseId id del ejercicio (para la clave de caché)
 * @param field      campo (cue | howTo | benefits | precautions)
 * @param source     texto fuente (en inglés)
 * @param lang       idioma activo de la app
 */
export function useLocalizedExerciseText(
  exerciseId: string,
  field: string,
  source: string,
  lang: 'es' | 'en'
): LocalizedResult {
  const [result, setResult] = useState<LocalizedResult>({ text: source, status: 'original' });

  useEffect(() => {
    // Inglés ya es el idioma del catálogo, sin caché disponible, o el texto ya
    // está en español (ejercicios wger) → texto original sin tocar el LLM.
    if (lang === 'en' || !source.trim() || isProbablySpanish(source)) {
      setResult({ text: source, status: 'original' });
      return;
    }

    let cancelled = false;
    const key = `${exerciseId}|${lang}|${field}`;

    (async () => {
      try {
        const cached = await getCachedTranslation(key);
        if (cancelled) return;
        if (cached) {
          setResult({ text: cached, status: 'translated' });
          return;
        }

        setResult({ text: '', status: 'translating' });

        let promise = inflight.get(key);
        if (!promise) {
          promise = translateWithLLM(source)
            .then(async (tr) => {
              try {
                await setCachedTranslation(key, tr);
              } catch {
                // caché opcional: si falla, seguimos con la traducción en memoria
              }
              return tr;
            })
            .finally(() => {
              inflight.delete(key);
            });
          inflight.set(key, promise);
        }

        const translated = await promise;
        if (!cancelled) setResult({ text: translated, status: 'translated' });
      } catch {
        if (!cancelled) setResult({ text: source, status: 'failed' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [exerciseId, field, source, lang]);

  return result;
}

/**
 * Divide una traducción numerada ("1. X 2. Y 3. Z") en pasos individuales.
 * El LLM on-device colapsa las líneas a un solo párrafo (por el cleaning del
 * pipeline), así que el separador es la numeración. Si no hay numeración,
 * devuelve el texto completo como un único paso.
 */
export function splitNumberedSteps(translated: string): string[] {
  const parts = translated
    .split(/(?=\d+[.)]\s)/)
    .map((p) => p.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [translated];
}
