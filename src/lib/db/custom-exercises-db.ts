/**
 * Custom Exercises — IndexedDB persistence layer
 *
 * Stores user-created exercises in IndexedDB so they survive
 * localStorage clears and are available offline.
 *
 * DB: chispa_custom_exercises
 * Store: exercises (keyPath: 'id')
 */
import type { Exercise } from '@/types';

const DB_NAME = 'chispa_custom_exercises';
const DB_VERSION = 1;
const STORE_NAME = 'exercises';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txMode(mode: IDBTransactionMode): IDBTransactionMode {
  return mode;
}

/**
 * Custom exercise stored in IndexedDB.
 * Extends Exercise with metadata fields.
 */
export interface CustomExercise extends Exercise {
  /** Always true — marks this as user-created */
  isCustom: true;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════
//  CRUD Operations
// ═══════════════════════════════════════════════════════════

/** Get all custom exercises from IndexedDB */
export async function getAllCustomExercises(): Promise<CustomExercise[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, txMode('readonly'));
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as CustomExercise[]);
    req.onerror = () => reject(req.error);
  });
}

/** Get a single custom exercise by ID */
export async function getCustomExercise(id: string): Promise<CustomExercise | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, txMode('readonly'));
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as CustomExercise | undefined);
    req.onerror = () => reject(req.error);
  });
}

/** Save a custom exercise (create or update) */
export async function saveCustomExercise(
  exercise: Omit<CustomExercise, 'isCustom' | 'createdAt' | 'updatedAt'> & {
    isCustom?: boolean;
    createdAt?: string;
    updatedAt?: string;
  }
): Promise<CustomExercise> {
  const now = new Date().toISOString();
  const entry: CustomExercise = {
    ...exercise,
    isCustom: true,
    createdAt: exercise.createdAt || now,
    updatedAt: now,
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, txMode('readwrite'));
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(entry);
    req.onsuccess = () => resolve(entry);
    req.onerror = () => reject(req.error);
  });
}

/** Delete a custom exercise by ID */
export async function deleteCustomExercise(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, txMode('readwrite'));
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Count custom exercises */
export async function countCustomExercises(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, txMode('readonly'));
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
