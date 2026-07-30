#!/usr/bin/env node

/**
 * merge-exercises.mjs
 *
 * Merges two exercise datasets into one rich catalog:
 *   1. wger/wger-data (Django fixtures) — primary for Spanish names & descriptions
 *   2. free-exercise-db — primary for equipment, difficulty, force, mechanic, images
 *
 * Matching strategy:
 *   - Use wger ENGLISH translations (language=2) to match against free-db names
 *   - Apply Spanish name overlay (language=4) where available
 *   - Fuzzy match: normalize names, remove parentheticals, numbers, special chars
 *
 * Usage: node scripts/merge-exercises.mjs
 * Output: Overwrites src/lib/utils/exercises.json + exercises.ts
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_JSON = path.resolve(__dirname, '..', 'src', 'lib', 'utils', 'exercises.json');
const OUTPUT_TS = path.resolve(__dirname, '..', 'src', 'lib', 'utils', 'exercises.ts');

// ─── wger fixture URLs ───

const WGER_BASE = 'https://raw.githubusercontent.com/wger-project/wger/master/wger/exercises/fixtures';
const WGER_URLS = {
  exercises: `${WGER_BASE}/exercise-base-data.json`,
  translations: `${WGER_BASE}/translations.json`,
  muscles: `${WGER_BASE}/muscles.json`,
  equipment: `${WGER_BASE}/equipment.json`,
  categories: `${WGER_BASE}/categories.json`,
};

const FREEDB_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

// ─── Translation maps ───

const MUSCLE_ES = {
  // Upper case (wger name_en format)
  Biceps: 'bíceps',
  Shoulders: 'hombros',
  Chest: 'pecho',
  Triceps: 'tríceps',
  Abs: 'abdominales',
  Calves: 'gemelos',
  Glutes: 'glúteos',
  Quads: 'cuádriceps',
  Hamstrings: 'isquiotibiales',
  Lats: 'dorsales',
  // Lower case (free-exercise-db format)
  biceps: 'bíceps',
  shoulders: 'hombros',
  chest: 'pecho',
  triceps: 'tríceps',
  abs: 'abdominales',
  calves: 'gemelos',
  glutes: 'glúteos',
  quads: 'cuádriceps',
  quadriceps: 'cuádriceps',
  hamstrings: 'isquiotibiales',
  lats: 'dorsales',
  // Additional muscle names found in free-exercise-db
  abdominals: 'abdominales',
  adductors: 'aductores',
  abductors: 'abductores',
  forearms: 'antebrazos',
  'lower back': 'espalda baja',
  'middle back': 'espalda media',
  neck: 'cuello',
  traps: 'trapecios',
  trapezius: 'trapecios',
};

const MUSCLE_GROUP = {
  bíceps: 'brazos',
  hombros: 'hombros',
  pecho: 'pecho',
  tríceps: 'brazos',
  abdominales: 'core',
  gemelos: 'piernas',
  glúteos: 'gluteos',
  glutes: 'gluteos',
  cuádriceps: 'piernas',
  isquiotibiales: 'piernas',
  dorsales: 'espalda',
  // Additional mappings for muscles that reach firstMuscleGroup
  aductores: 'piernas',
  abductores: 'piernas',
  antebrazos: 'brazos',
  'espalda baja': 'espalda',
  'espalda media': 'espalda',
  cuello: 'espalda',
  trapecios: 'espalda',
  // Latin muscle names from wger (fallback safety)
  brachialis: 'brazos',
  'serratus anterior': 'pecho',
  soleus: 'piernas',
  infraspinatus: 'espalda',
  'obliquus externus abdominis': 'core',
};

const CATEGORY_GROUP = {
  Arms: 'brazos',
  Legs: 'piernas',
  Abs: 'core',
  Chest: 'pecho',
  Back: 'espalda',
  Shoulders: 'hombros',
  Calves: 'piernas',
  Cardio: 'cardio',
};

const CATEGORY_ES = {
  Arms: 'brazos',
  Legs: 'piernas',
  Abs: 'abdominales',
  Chest: 'pecho',
  Back: 'espalda',
  Shoulders: 'hombros',
  Calves: 'gemelos',
  Cardio: 'cardio',
};

const EQUIPMENT_MAP = {
  Barbell: 'barra',
  'SZ-Bar': 'barra Z',
  Dumbbell: 'mancuernas',
  'Gym mat': 'ninguno',
  'Swiss Ball': 'pelota suiza',
  'Pull-up bar': 'ninguno',
  'none (bodyweight exercise)': 'ninguno',
  Bench: 'ninguno',
  'Incline bench': 'ninguno',
  Kettlebell: 'kettlebell',
  'Resistance band': 'bandas',
  'Cable machine': 'polea',
};

const EMOJI_BY_MUSCLE = {
  bíceps: '💪',
  hombros: '🔺',
  pecho: '🏋️',
  tríceps: '💪',
  abdominales: '🧠',
  gemelos: '🦵',
  glúteos: '🍑',
  cuádriceps: '🦵',
  isquiotibiales: '🦵',
  dorsales: '🔙',
};

// ─── Helpers ───

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'chispa/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error from ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Normalize name for matching: lowercase, remove special chars, numbers, extra spaces */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/\(.*?\)/g, '')  // remove parentheticals
    .replace(/[^a-záéíóúüñ\s-]/g, ' ')  // keep only letters and spaces
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í').replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMuscleGroup(names) {
  for (const n of names) {
    const es = MUSCLE_ES[n] || n.toLowerCase();
    if (MUSCLE_GROUP[es]) return MUSCLE_GROUP[es];
  }
  return 'full_body';
}

function muscleEmoji(names) {
  for (const n of names) {
    const es = MUSCLE_ES[n] || n.toLowerCase();
    if (EMOJI_BY_MUSCLE[es]) return EMOJI_BY_MUSCLE[es];
  }
  return '🏃';
}

function translateMuscleName(name) {
  return MUSCLE_ES[name] || name.toLowerCase();
}

function splitInstructions(text) {
  if (!text) return [];
  const steps = text
    .split(/(?<=\.)\s+|\n+|<\/li>\s*<li>|<br\s*\/?>/i)
    .map((s) => stripHtml(s))
    .filter((s) => s.length > 10);
  return steps.length > 1 ? steps : [];
}

// ─── Main ───

async function main() {
  console.log('⬇️  Downloading wger data...');
  const [wgerExercisesRaw, wgerTranslations, wgerMuscles, wgerEquipment, wgerCategories] =
    await Promise.all([
      fetchJSON(WGER_URLS.exercises),
      fetchJSON(WGER_URLS.translations),
      fetchJSON(WGER_URLS.muscles),
      fetchJSON(WGER_URLS.equipment),
      fetchJSON(WGER_URLS.categories),
    ]);

  console.log('⬇️  Downloading free-exercise-db...');
  const freeDbRaw = await fetchJSON(FREEDB_URL);

  // ─── Index wger lookup tables ───

  const muscleIndex = {};
  for (const item of wgerMuscles) {
    if (item.model === 'exercises.muscle') {
      muscleIndex[item.pk] = {
        name: item.fields.name,
        name_en: item.fields.name_en,
        is_front: item.fields.is_front,
      };
    }
  }

  const equipmentIndex = {};
  for (const item of wgerEquipment) {
    if (item.model === 'exercises.equipment') {
      equipmentIndex[item.pk] = item.fields.name;
    }
  }

  const categoryIndex = {};
  for (const item of wgerCategories) {
    if (item.model === 'exercises.exercisecategory') {
      categoryIndex[item.pk] = item.fields.name;
    }
  }

  // ─── Index wger exercises with translations ───

  const wgerExercisesMap = new Map(); // exercise PK -> { base, es, en }
  for (const item of wgerExercisesRaw) {
    if (item.model === 'exercises.exercise') {
      wgerExercisesMap.set(item.pk, { base: item.fields, es: null, en: null });
    }
  }

  for (const item of wgerTranslations) {
    if (item.model === 'exercises.translation') {
      const lang = item.fields.language;
      const exPk = item.fields.exercise;
      const entry = wgerExercisesMap.get(exPk);
      if (entry) {
        if (lang === 4) entry.es = item.fields;
        if (lang === 2) entry.en = item.fields;
      }
    }
  }

  // Also track aliases for matching
  const wgerAliases = {}; // pk -> alias names
  for (const item of wgerTranslations) {
    if (item.model === 'exercises.alias') {
      const pk = item.fields.exercise;
      if (!wgerAliases[pk]) wgerAliases[pk] = [];
      wgerAliases[pk].push(item.fields.name);
    }
  }

  console.log(`📦  wger: ${wgerExercisesMap.size} exercises`);

  // ─── Index free-exercise-db ───

  const freeDbIndex = new Map(); // normalized name -> exercise
  for (const ex of freeDbRaw) {
    if (!ex.name) continue;
    const norm = normalizeName(ex.name);
    freeDbIndex.set(norm, ex);
    // Also store by slug
    freeDbIndex.set(slugify(ex.name), ex);
  }

  console.log(`📦  free-exercise-db: ${freeDbRaw.length} exercises`);

  // ─── Build wger name index ───

  const wgerByName = new Map(); // normalized name -> {pk, entry}
  const wgerBySlug = new Map(); // slug -> {pk, entry}
  const wgerByWordSet = new Map(); // word -> [pk]

  for (const [pk, entry] of wgerExercisesMap) {
    const enName = entry.en?.name;
    const esName = entry.es?.name;
    const matchName = enName || esName || '';
    if (!matchName) continue;

    const norm = normalizeName(matchName);
    const slug = slugify(matchName);

    wgerByName.set(norm, { pk, entry });
    wgerBySlug.set(slug, { pk, entry });

    // Index by words for partial matching
    const words = norm.split(' ').filter(w => w.length > 2);
    for (const word of words) {
      if (!wgerByWordSet.has(word)) wgerByWordSet.set(word, []);
      wgerByWordSet.get(word).push({ pk, entry, norm });
    }

    // Also index aliases
    const aliases = wgerAliases[pk] || [];
    for (const alias of aliases) {
      wgerByName.set(normalizeName(alias), { pk, entry });
      wgerBySlug.set(slugify(alias), { pk, entry });
    }
  }

  // ─── Match exercises ───

  const merged = [];
  const matchedWger = new Set();
  const matchedFreeDbSlugs = new Set();
  const matchLog = [];

  function tryMatch(freeDbEx) {
    if (!freeDbEx || !freeDbEx.name) return null;
    const norm = normalizeName(freeDbEx.name);
    const slug = slugify(freeDbEx.name);

    // Exact match by normalized name
    let match = wgerByName.get(norm);
    if (match) return match;

    match = wgerBySlug.get(slug);
    if (match) return match;

    // Try without numbers
    const noNumbers = norm.replace(/[0-9]+/g, '').replace(/\s+/g, ' ').trim();
    if (noNumbers !== norm) {
      match = wgerByName.get(noNumbers);
      if (match) return match;
    }

    // Try by word overlap (at least 2 significant words match)
    const words = norm.split(' ').filter(w => w.length > 2);
    if (words.length >= 3) {
      const candidates = new Map(); // pk -> score
      for (const word of words) {
        const matches = wgerByWordSet.get(word) || [];
        for (const m of matches) {
          const score = candidates.get(m.pk) || 0;
          candidates.set(m.pk, score + 1);
        }
      }
      // Best candidate with at least 2 matching words
      let best = null;
      let bestScore = 1; // need at least 2
      for (const [pk, score] of candidates) {
        if (score > bestScore) {
          bestScore = score;
          best = wgerByName.get(normalizeName(wgerExercisesMap.get(pk)?.en?.name || ''));
        }
      }
      if (best) return best;
    }

    return null;
  }

  // Process: for each free-db exercise, try to match with wger
  for (const freeEx of freeDbRaw) {
    if (!freeEx.name) continue;

    const match = tryMatch(freeEx);
    const freeDbSlug = freeEx.id || slugify(freeEx.name);

    if (match) {
      // MERGED: prefer wger names, keep free-db fields
      const { pk, entry } = match;
      matchedWger.add(pk);
      matchedFreeDbSlugs.add(freeDbSlug);

      const base = entry.base;
      const es = entry.es;
      const en = entry.en;

      const name = es?.name || en?.name || freeEx.name;
      const descHtml = es?.description || '';
      const descSource = es?.description_source || '';
      const description = descSource || stripHtml(descHtml) || (freeEx.instructions || []).join(' ') || '';

      // Map wger muscles
      const primaryMusclePks = base.muscles || [];
      const wgerPrimary = primaryMusclePks.map(pk => {
        const m = muscleIndex[pk];
        return m ? translateMuscleName(m.name_en || m.name) : '';
      }).filter(Boolean);

      const secondaryMusclePks = base.muscles_secondary || [];
      const wgerSecondary = secondaryMusclePks.map(pk => {
        const m = muscleIndex[pk];
        return m ? translateMuscleName(m.name_en || m.name) : '';
      }).filter(Boolean);

      const primaryMuscles = wgerPrimary.length > 0 ? wgerPrimary : (freeEx.primaryMuscles || []).map(translateMuscleName);
      const secondaryMuscles = wgerSecondary.length > 0 ? wgerSecondary : (freeEx.secondaryMuscles || []).map(translateMuscleName);

      // Category
      const catName = categoryIndex[base.category] || '';
      const muscleGroup = CATEGORY_GROUP[catName] || firstMuscleGroup(primaryMuscles) || freeEx.muscle || 'full_body';

      // Equipment — merge both
      const eqPks = base.equipment || [];
      const wgerEq = eqPks.length > 0 ? EQUIPMENT_MAP[equipmentIndex[eqPks[0]]] || 'ninguno' : null;
      const equipment = freeEx.equipment || wgerEq || 'ninguno';

      // Steps
      const steps = splitInstructions(description);
      const stepsToUse = steps.length > 0 ? steps : (freeEx.instructions || []);
      const firstStep = steps[0] || (freeEx.instructions || [])[0] || description.slice(0, 120);

      merged.push({
        id: freeEx.id || slugify(name),
        name,
        muscle: muscleGroup,
        primaryMuscles,
        secondaryMuscles,
        difficulty: freeEx.difficulty || 2,
        equipment,
        instructions: description || (Array.isArray(freeEx.instructions) ? freeEx.instructions.join(' ') : ''),
        instructionsSteps: stepsToUse.length > 0 ? stepsToUse : undefined,
        load_type: freeEx.load_type || 'reps',
        cognitive_load: freeEx.cognitive_load || 'low',
        emoji: muscleEmoji(primaryMuscles) || freeEx.emoji || '🏃',
        cue: firstStep,
        category: CATEGORY_ES[catName] || freeEx.category || catName.toLowerCase() || 'fuerza',
        force: freeEx.force || null,
        mechanic: freeEx.mechanic || null,
        images: (freeEx.images || []).filter(Boolean).length > 0 ? freeEx.images : undefined,
        video_url: freeEx.video_url || undefined,
      });
      matchLog.push(`✅ Matched: "${freeEx.name}" → "${name}"`);
    } else {
      // FREE-DB ONLY
      merged.push({
        id: freeEx.id || slugify(freeEx.name),
        name: freeEx.name,
        muscle: firstMuscleGroup(freeEx.primaryMuscles || []) || freeEx.muscle || 'full_body',
        primaryMuscles: (freeEx.primaryMuscles || []).filter(Boolean).map(translateMuscleName),
        secondaryMuscles: (freeEx.secondaryMuscles || []).filter(Boolean).map(translateMuscleName),
        difficulty: freeEx.difficulty || 2,
        equipment: freeEx.equipment || 'ninguno',
        instructions: Array.isArray(freeEx.instructions) ? freeEx.instructions.join(' ') : (freeEx.instructions || ''),
        instructionsSteps: (freeEx.instructions || []).length > 0 ? freeEx.instructions : undefined,
        load_type: freeEx.load_type || 'reps',
        cognitive_load: freeEx.cognitive_load || 'low',
        emoji: freeEx.emoji || '🏃',
        cue: freeEx.cue || '',
        category: freeEx.category || 'fuerza',
        force: freeEx.force || null,
        mechanic: freeEx.mechanic || null,
        images: (freeEx.images || []).filter(Boolean).length > 0 ? freeEx.images : undefined,
        video_url: freeEx.video_url || undefined,
      });
    }
  }

  // Add wger-only exercises (not matched to any free-db exercise)
  let wgerOnlyCount = 0;
  for (const [pk, entry] of wgerExercisesMap) {
    if (matchedWger.has(pk)) continue;
    wgerOnlyCount++;

    const base = entry.base;
    const es = entry.es;
    const en = entry.en;

    const name = es?.name || en?.name || '(unknown)';
    const descHtml = es?.description || en?.description || '';
    const descSource = es?.description_source || '';
    const description = descSource || stripHtml(descHtml);

    const primaryMusclePks = base.muscles || [];
    const primaryMuscles = primaryMusclePks.map(pk => {
      const m = muscleIndex[pk];
      return m ? translateMuscleName(m.name_en || m.name) : '';
    }).filter(Boolean);

    const secondaryMusclePks = base.muscles_secondary || [];
    const secondaryMuscles = secondaryMusclePks.map(pk => {
      const m = muscleIndex[pk];
      return m ? translateMuscleName(m.name_en || m.name) : '';
    }).filter(Boolean);

    const catName = categoryIndex[base.category] || '';
    const muscleGroup = CATEGORY_GROUP[catName] || firstMuscleGroup(primaryMuscles);

    const eqPks = base.equipment || [];
    const equipmentName = eqPks.length > 0
      ? EQUIPMENT_MAP[equipmentIndex[eqPks[0]]] || 'ninguno'
      : 'ninguno';

    const steps = splitInstructions(description);
    const firstStep = steps[0] || description.slice(0, 120);

    merged.push({
      id: base.uuid || `wger_${pk}`,
      name,
      muscle: muscleGroup,
      primaryMuscles,
      secondaryMuscles,
      difficulty: 2,
      equipment: equipmentName,
      instructions: description,
      instructionsSteps: steps.length > 0 ? steps : undefined,
      load_type: 'reps',
      cognitive_load: 'low',
      emoji: muscleEmoji(primaryMuscles),
      cue: firstStep,
      category: CATEGORY_ES[catName] || catName.toLowerCase() || 'fuerza',
      force: null,
      mechanic: null,
      images: undefined,
      video_url: undefined,
    });
  }

  // ─── Results ───

  console.log(`\n📊 Merge results:`);
  const matched = merged.length - wgerOnlyCount - (freeDbRaw.length - matchedFreeDbSlugs.size);
  const freeDbOnly = freeDbRaw.length - matchedFreeDbSlugs.size;
  console.log(`   ✅ Matched (wger + free-db): ${matchedFreeDbSlugs.size}`);
  console.log(`   📝 wger-only: ${wgerOnlyCount}`);
  console.log(`   📝 free-db-only: ${freeDbOnly}`);
  console.log(`   📦 Total pre-dedup: ${merged.length}`);

  // Show some match examples
  console.log(`\n📋 Match samples:`);
  for (const log of matchLog.slice(0, 5)) console.log(`   ${log}`);

  // Show some wger-only with Spanish names
  const wgerOnlySpanish = merged.filter(e => matchedWger.size === 0 && /[áéíóúñü]/i.test(e.name)).slice(0, 3);
  if (wgerOnlySpanish.length > 0) {
    console.log(`\n🌍 wger-only with Spanish names:`);
    for (const e of wgerOnlySpanish) console.log(`   ${e.name} (${e.muscle}, ${e.equipment})`);
  }

  // Stats
  const withSpanish = merged.filter(e => /[áéíóúñü]/i.test(e.name)).length;
  console.log(`\n🇪🇸 Spanish names: ${withSpanish} / ${merged.length}`);

  // ─── Deduplicate by normalized name ───

  const seen = new Map(); // normalized name -> index
  const deduped = [];
  let dupsRemoved = 0;

  for (const ex of merged) {
    const key = normalizeName(ex.name);
    if (!seen.has(key)) {
      seen.set(key, deduped.length);
      deduped.push(ex);
    } else {
      // Keep the version with Spanish name if available
      const existing = deduped[seen.get(key)];
      const existingHasEs = /[áéíóúñü]/i.test(existing.name);
      const newHasEs = /[áéíóúñü]/i.test(ex.name);
      if (newHasEs && !existingHasEs) {
        deduped[seen.get(key)] = ex;
      }
      dupsRemoved++;
    }
  }

  console.log(`   ⚠️  Duplicates removed: ${dupsRemoved}`);
  console.log(`   🎯 Final catalog: ${deduped.length} exercises`);

  // ─── Write JSON ───
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(deduped), 'utf-8');
  console.log(`\n✅  Written to ${OUTPUT_JSON}`);

  const fileSize = (fs.statSync(OUTPUT_JSON).size / 1024 / 1024).toFixed(1);
  console.log(`   Size: ${fileSize} MB`);

  // ─── Write TS wrapper ───
  const ts = `// ═══════════════════════════════════════════════════════════════
//  EXERCISE CATALOG — TypeScript wrapper
//  Merged from:
//    - wger/wger-data (Spanish names & descriptions)
//    - free-exercise-db (equipment, difficulty, images, force, mechanic)
//
//  Sources:
//    https://github.com/wger-project/wger
//    https://github.com/yuhonas/free-exercise-db
//
//  Generated: ${new Date().toISOString().slice(0, 10)}
//  Exercises: ${deduped.length}
// ═══════════════════════════════════════════════════════════════

import { Exercise } from '@/types';
import raw from './exercises.json';

export const EXERCISE_CATALOG: Exercise[] = raw as Exercise[];
`;

  fs.writeFileSync(OUTPUT_TS, ts, 'utf-8');
  console.log(`✅  Written to ${OUTPUT_TS}`);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
