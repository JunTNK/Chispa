/**
 * Translation Cache — IndexedDB persistence layer
 *
 * Guarda las traducciones de ejercicios generadas por el LLM on-device para
 * traducir UNA vez y servir desde caché (cero red, coherente con local-first).
 *
 * Clave: `${exerciseId}|${lang}|${field}` (ej: "Bodyweight_Squat|es|howTo").
 * El catálogo es un JSON estático versionado, así que la clave no necesita
 * incluir el texto fuente.
 *
 * DB: chispa_exercise_translations
 * Store: translations (keyPath: 'key')
 */

const DB_NAME = 'chispa_exercise_translations';
const DB_VERSION = 1;
const STORE_NAME = 'translations';

/** True solo cuando IndexedDB está disponible (no en SSR ni en jsdom). */
export function translationCacheSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.indexedDB !== 'undefined' &&
    !!window.indexedDB
  );
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Devuelve la traducción cacheada o `null` si no existe. */
export async function getCachedTranslation(key: string): Promise<string | null> {
  if (!translationCacheSupported()) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => {
      const row = req.result as { key: string; text: string } | undefined;
      resolve(row?.text ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Guarda (o actualiza) una traducción en caché. */
export async function setCachedTranslation(key: string, text: string): Promise<void> {
  if (!translationCacheSupported()) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ key, text });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
