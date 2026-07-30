#!/usr/bin/env node

/**
 * fetch-exercises.mjs
 *
 * Downloads free-exercise-db (https://github.com/yuhonas/free-exercise-db)
 * and transforms each exercise to the CHISPA Exercise type with Spanish-friendly fields.
 *
 * Usage: node scripts/fetch-exercises.mjs
 * Output: Writes to src/lib/utils/exercises.ts (overwrites EXERCISE_CATALOG)
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const OUTPUT = path.resolve(__dirname, '..', 'src', 'lib', 'utils', 'exercises.ts');

/* ─── Translation maps ─── */

const MUSCLE_ES = {
  abdominals: 'abdominales',
  abductors: 'abductores',
  adductors: 'aductores',
  biceps: 'bíceps',
  calves: 'gemelos',
  chest: 'pecho',
  forearms: 'antebrazos',
  glutes: 'glúteos',
  hamstrings: 'isquiotibiales',
  lats: 'dorsales',
  'lower back': 'espalda baja',
  'middle back': 'espalda media',
  neck: 'cuello',
  quadriceps: 'cuádriceps',
  shoulders: 'hombros',
  traps: 'trapecios',
  triceps: 'tríceps',
};

const MUSCLE_GROUP = {
  abdominals: 'core',
  abductors: 'piernas',
  adductors: 'piernas',
  biceps: 'brazos',
  calves: 'piernas',
  chest: 'pecho',
  forearms: 'brazos',
  glutes: 'gluteos',
  hamstrings: 'piernas',
  lats: 'espalda',
  'lower back': 'espalda',
  'middle back': 'espalda',
  neck: 'cuello',
  quadriceps: 'piernas',
  shoulders: 'hombros',
  traps: 'espalda',
  triceps: 'brazos',
};

const EQUIPMENT_ES = {
  'body only': 'ninguno',
  machine: 'máquina',
  other: 'otro',
  'foam roll': 'rodillo',
  kettlebells: 'kettlebell',
  dumbbell: 'mancuernas',
  cable: 'polea',
  barbell: 'barra',
  bands: 'bandas',
  'medicine ball': 'balón medicinal',
  'exercise ball': 'pelota suiza',
  'e-z curl bar': 'barra Z',
};

const CATEGORY_ES = {
  strength: 'fuerza',
  stretching: 'estiramiento',
  plyometrics: 'pliometría',
  strongman: 'strongman',
  powerlifting: 'powerlifting',
  cardio: 'cardio',
  'olympic weightlifting': 'halterofilia',
};

const EMOJI_BY_MUSCLE = {
  abdominals: '🧠',
  abductors: '🦵',
  adductors: '🦵',
  biceps: '💪',
  calves: '🦵',
  chest: '🏋️',
  forearms: '💪',
  glutes: '🍑',
  hamstrings: '🦵',
  lats: '🔙',
  'lower back': '🔙',
  'middle back': '🔙',
  neck: '🧘',
  quadriceps: '🦵',
  shoulders: '🔺',
  traps: '🔙',
  triceps: '💪',
};

const CATEGORY_LOAD_TYPE = {
  strength: 'reps',
  stretching: 'time',
  plyometrics: 'reps',
  strongman: 'reps',
  powerlifting: 'reps',
  cardio: 'time',
  'olympic weightlifting': 'reps',
};

const LEVEL_DIFFICULTY = {
  beginner: 1,
  intermediate: 2,
  expert: 3,
};

const LEVEL_COG_LOAD = {
  beginner: 'low',
  intermediate: 'med',
  expert: 'high',
};

/* ─── Helpers ─── */

function slugFromName(name) {
  return name
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function translateMuscle(en) {
  return MUSCLE_ES[en] || en;
}

function muscleEmoji(muscles) {
  for (const m of muscles) {
    if (EMOJI_BY_MUSCLE[m]) return EMOJI_BY_MUSCLE[m];
  }
  return '🏃';
}

function primaryMuscleGroup(muscles) {
  for (const m of muscles) {
    if (MUSCLE_GROUP[m]) return MUSCLE_GROUP[m];
  }
  return 'full_body';
}

/* ─── Fetch ─── */

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'chispa/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/* ─── Transform ─── */

async function main() {
  console.log('⬇️  Downloading free-exercise-db...');
  const raw = await fetchJSON(DATA_URL);
  console.log(`✅  Downloaded ${raw.length} exercises`);

  const exercises = raw
    .filter((ex) => ex.name && ex.primaryMuscles?.length > 0)
    .map((ex) => {
      const primary = ex.primaryMuscles || [];
      const secondary = ex.secondaryMuscles || [];
      const eq = (ex.equipment || '').toLowerCase();
      const cat = (ex.category || '').toLowerCase();
      const level = (ex.level || 'beginner').toLowerCase();

      const translatedPrimary = primary.map(translateMuscle);

      return {
        id: ex.id || slugFromName(ex.name),
        name: ex.name,
        muscle: primaryMuscleGroup(primary),
        primaryMuscles: translatedPrimary,
        secondaryMuscles: secondary.map(translateMuscle),
        difficulty: LEVEL_DIFFICULTY[level] || 1,
        equipment: EQUIPMENT_ES[eq] || eq || 'ninguno',
        instructions: (ex.instructions || []).join(' '),
        instructionsSteps: (ex.instructions || []),
        load_type: CATEGORY_LOAD_TYPE[cat] || 'reps',
        cognitive_load: LEVEL_COG_LOAD[level] || 'low',
        emoji: muscleEmoji(primary),
        cue: (ex.instructions || [])[0] || '',
        category: CATEGORY_ES[cat] || cat,
        force: ex.force || null,
        mechanic: ex.mechanic || null,
        images: (ex.images || []).map((img) =>
          `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${img}`
        ),
      };
    });

  console.log(`✅  Transformed ${exercises.length} exercises`);

  /* ─── Write JSON file ─── */
  // Store as .json to avoid bloating the client bundle with TS source.
  // The .ts file re-exports it with proper typing.

  const jsonPath = path.resolve(__dirname, '..', 'src', 'lib', 'utils', 'exercises.json');
  fs.writeFileSync(jsonPath, JSON.stringify(exercises), 'utf-8');
  console.log(`✅  Written to ${jsonPath}`);

  /* ─── Write thin TS wrapper ─── */

  const ts = `// ═══════════════════════════════════════════════════════════════
//  EXERCISE CATALOG — TypeScript wrapper
//  Data lives in exercises.json (auto-generated from free-exercise-db)
//  Source: https://github.com/yuhonas/free-exercise-db
//  Generated: ${new Date().toISOString().slice(0, 10)}
//  Exercises: ${exercises.length}
// ═══════════════════════════════════════════════════════════════

import { Exercise } from '@/types';
import raw from './exercises.json';

export const EXERCISE_CATALOG: Exercise[] = raw as Exercise[];
`;

  fs.writeFileSync(OUTPUT, ts, 'utf-8');
  console.log(`✅  Written to ${OUTPUT}`);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
