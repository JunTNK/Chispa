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

/* ─── free-exercise-db value maps (current dist schema) ───
 * The dist/exercises.json uses `level` (beginner|intermediate|expert),
 * English `equipment` and English `category`. These maps normalize them
 * to CHISPA's Spanish-friendly fields so matchesEquipment() and the
 * catalog filters work correctly.
 */

const EQUIPMENT_ES = {
  'body only': 'ninguno',
  'body weight': 'ninguno',
  'gym mat': 'ninguno',
  'pull-up bar': 'ninguno',
  bench: 'ninguno',
  'incline bench': 'ninguno',
  'none (bodyweight exercise)': 'ninguno',
  'assisted bodyweight': 'ninguno',
  machine: 'máquina',
  other: 'otro',
  'foam roll': 'rodillo',
  kettlebells: 'kettlebell',
  dumbbell: 'mancuernas',
  cable: 'polea',
  'cable machine': 'polea',
  barbell: 'barra',
  trapbar: 'barra',
  'trap bar': 'barra',
  'ez-bar': 'barra Z',
  'sz-bar': 'barra Z',
  'e-z curl bar': 'barra Z',
  bands: 'bandas',
  'resistance band': 'bandas',
  'medicine ball': 'balón medicinal',
  'exercise ball': 'pelota suiza',
  'swiss ball': 'pelota suiza',
  weighted: 'otro',
  rope: 'otro',
  sled: 'otro',
};

const CATEGORY_ES_FREEDB = {
  strength: 'fuerza',
  stretching: 'estiramiento',
  plyometrics: 'pliometría',
  strongman: 'strongman',
  powerlifting: 'powerlifting',
  cardio: 'cardio',
  'olympic weightlifting': 'halterofilia',
};

const LEVEL_DIFFICULTY = { beginner: 1, intermediate: 2, expert: 3 };

const LEVEL_COG_LOAD = { beginner: 'low', intermediate: 'med', expert: 'high' };

const CATEGORY_LOAD_TYPE = {
  strength: 'reps',
  stretching: 'time',
  plyometrics: 'reps',
  strongman: 'reps',
  powerlifting: 'reps',
  cardio: 'time',
  'olympic weightlifting': 'reps',
};

/* ─── Curated Spanish name dictionary ───
 * free-exercise-db / wger names are mostly English. For a Spanish-language
 * app (especially for neurodivergent users who benefit from familiar names),
 * the most common movements get native names here.
 * Keys are normalizeName() output of the English name; applied only when the
 * entry is not already Spanish (has no accented chars).
 */
const NAME_ES = {
  // ── Sentadillas / piernas ──
  squat: 'Sentadilla',
  'barbell squat': 'Sentadilla con barra',
  'barbell full squat': 'Sentadilla profunda con barra',
  'barbell back squat': 'Sentadilla trasera con barra',
  'front squat': 'Sentadilla frontal',
  'barbell front squat': 'Sentadilla frontal con barra',
  'goblet squat': 'Sentadilla goblet',
  'dumbbell goblet squat': 'Sentadilla goblet con mancuerna',
  'box squat': 'Sentadilla a cajón',
  'pistol squat': 'Sentadilla pistola',
  'sumo squat': 'Sentadilla sumo',
  'dumbbell squat': 'Sentadilla con mancuernas',
  'split squat': 'Sentadilla búlgara',
  'single leg squat': 'Sentadilla a una pierna',
  'wall sit': 'Sentadilla contra la pared',
  lunge: 'Zancada',
  'walking lunge': 'Zancada caminando',
  'reverse lunge': 'Zancada inversa',
  'lateral lunge': 'Zancada lateral',
  'dumbbell lunge': 'Zancada con mancuernas',
  'barbell lunge': 'Zancada con barra',
  'split lunge': 'Zancada dividida',
  'curtsy lunge': 'Zancada cruzada',
  'leg press': 'Prensa de piernas',
  'leg extension': 'Extensión de cuádriceps',
  'seated leg curl': 'Curl femoral sentado',
  'lying leg curl': 'Curl femoral acostado',
  'calf raise': 'Elevación de gemelos',
  'standing calf raise': 'Elevación de gemelos de pie',
  'seated calf raise': 'Elevación de gemelos sentado',
  'step up': 'Paso al banco',
  'barbell step ups': 'Paso al banco con barra',
  'hip abduction': 'Abducción de cadera',
  'hip adduction': 'Aducción de cadera',
  'glute kickback': 'Patada de glúteo',
  'glute bridge': 'Puente de glúteos',
  'barbell glute bridge': 'Puente de glúteos con barra',
  'single leg glute bridge': 'Puente de glúteos a una pierna',
  'hip thrust': 'Empuje de cadera',
  'barbell hip thrust': 'Empuje de cadera con barra',
  'pull through': 'Empuje de cadera en polea',
  'donkey kick': 'Patada de burro',
  // ── Peso muerto / cadena posterior ──
  deadlift: 'Peso muerto',
  'barbell deadlift': 'Peso muerto con barra',
  'sumo deadlift': 'Peso muerto sumo',
  'romanian deadlift': 'Peso muerto rumano',
  'straight leg deadlift': 'Peso muerto piernas rectas',
  'trap bar deadlift': 'Peso muerto con barra trampa',
  'rack pull': 'Peso muerto en rack',
  'good morning': 'Buenos días',
  'barbell good morning': 'Buenos días con barra',
  'superman': 'Superman',
  'hyperextension': 'Hiperextensiones',
  'back extension': 'Extensiones de espalda',
  // ── Press / pecho ──
  'bench press': 'Press de banca',
  'barbell bench press': 'Press de banca con barra',
  'dumbbell bench press': 'Press de banca con mancuernas',
  'incline bench press': 'Press inclinado',
  'barbell incline bench press': 'Press inclinado con barra',
  'dumbbell incline bench press': 'Press inclinado con mancuernas',
  'decline bench press': 'Press declinado',
  'dumbbell decline bench press': 'Press declinado con mancuernas',
  'close grip bench press': 'Press de banca agarre cerrado',
  'floor press': 'Press en suelo',
  'dumbbell floor press': 'Press en suelo con mancuernas',
  'overhead press': 'Press de hombros',
  'barbell overhead press': 'Press militar con barra',
  'military press': 'Press militar',
  'shoulder press': 'Press de hombros',
  'dumbbell shoulder press': 'Press de hombros con mancuernas',
  'arnold press': 'Press Arnold',
  'push press': 'Push press',
  'dumbbell press': 'Press con mancuernas',
  'fly': 'Aperturas de pecho',
  'chest fly': 'Aperturas de pecho',
  'dumbbell fly': 'Aperturas con mancuernas',
  'cable fly': 'Aperturas en polea',
  'incline fly': 'Aperturas inclinadas',
  // ── Flexiones ──
  'push up': 'Flexiones',
  'push ups': 'Flexiones',
  pushups: 'Flexiones',
  'push-up': 'Flexiones',
  'diamond push up': 'Flexiones diamante',
  'wide push up': 'Flexiones abiertas',
  'incline push up': 'Flexiones inclinadas',
  'decline push up': 'Flexiones declinadas',
  'knee push up': 'Flexiones de rodillas',
  'clap push up': 'Flexiones con palmada',
  'one arm push up': 'Flexiones a un brazo',
  // ── Remos / espalda ──
  'bent over row': 'Remo inclinado',
  'bent over barbell row': 'Remo inclinado con barra',
  'barbell row': 'Remo con barra',
  'seated cable row': 'Remo en polea sentado',
  'one arm dumbbell row': 'Remo con mancuerna a un brazo',
  'dumbbell row': 'Remo con mancuerna',
  'inverted row': 'Remo invertido',
  'pendlay row': 'Remo Pendlay',
  'face pull': 'Remo al rostro',
  't bar row': 'Remo T',
  'upright row': 'Remo al mentón',
  'band pull apart': 'Aperturas con banda',
  // ── Dominadas / jalones ──
  'pull up': 'Dominadas',
  'pull ups': 'Dominadas',
  'pull-up': 'Dominadas',
  'chin up': 'Dominadas supinas',
  'chin-up': 'Dominadas supinas',
  'lat pulldown': 'Jalón al pecho',
  'wide grip lat pulldown': 'Jalón al pecho agarre ancho',
  'close grip lat pulldown': 'Jalón agarre cerrado',
  'straight arm pulldown': 'Jalón con brazos rectos',
  // ── Bíceps ──
  'bicep curl': 'Curl de bíceps',
  'biceps curl': 'Curl de bíceps',
  'barbell curl': 'Curl con barra',
  'dumbbell curl': 'Curl con mancuernas',
  'hammer curl': 'Curl martillo',
  'alternate hammer curl': 'Curl martillo alternado',
  'preacher curl': 'Curl predicador',
  'concentration curl': 'Curl concentrado',
  'incline curl': 'Curl inclinado',
  'zottman curl': 'Curl Zottman',
  'cable curl': 'Curl en polea',
  // ── Tríceps ──
  'tricep extension': 'Extensión de tríceps',
  'triceps pushdown': 'Pushdown de tríceps',
  'cable pushdown': 'Pushdown en polea',
  'skull crusher': 'Extensión de tríceps acostado',
  'triceps dip': 'Fondos de tríceps',
  dips: 'Fondos',
  'bench dip': 'Fondos en banco',
  // ── Core ──
  plank: 'Plancha',
  'side plank': 'Plancha lateral',
  crunch: 'Abdominales',
  'sit up': 'Abdominales',
  'sit-ups': 'Abdominales',
  'leg raise': 'Elevación de piernas',
  'hanging leg raise': 'Elevación de piernas colgado',
  'russian twist': 'Giros rusos',
  'cable crunch': 'Abdominales en polea',
  'ab rollout': 'Rodillo abdominal',
  'ab roller': 'Rodillo abdominal',
  'dead bug': 'Bicho muerto',
  'bird dog': 'Pájaro perro',
  'jackknife sit up': 'Abdominales navaja',
  'reverse crunch': 'Abdominales inversos',
  'elbow to knee': 'Codo a rodilla',
  'bicycle crunch': 'Abdominales bicicleta',
  'v up': 'Abdominales en V',
  'mountain climbers': 'Escaladores',
  'plank with arm raise': 'Plancha con elevación de brazo',
  // ── Cardio ──
  burpee: 'Burpees',
  burpies: 'Burpees',
  'jumping jack': 'Saltos de tijera',
  'jumping jacks': 'Saltos de tijera',
  'high knees': 'Rodillas arriba',
  'box jump': 'Salto al cajón',
  'broad jump': 'Salto de longitud',
  'jump rope': 'Saltar la cuerda',
  'jump squat': 'Sentadilla con salto',
  sprint: 'Sprint',
  running: 'Carrera',
  treadmill: 'Cinta de correr',
  'stationary bike': 'Bicicleta estática',
  'bike': 'Bicicleta',
  'stair climber': 'Escalera',
  elliptical: 'Elíptica',
  'jumping lunge': 'Zancadas con salto',
  'star jump': 'Salto estrella',
  // ── Hombros ──
  'lateral raise': 'Elevaciones laterales',
  'dumbbell lateral raise': 'Elevaciones laterales con mancuernas',
  'front raise': 'Elevaciones frontales',
  'rear delt fly': 'Vuelos posteriores',
  'reverse fly': 'Vuelos posteriores',
  shrug: 'Encogimientos de hombros',
  'barbell shrug': 'Encogimientos con barra',
  'dumbbell shrug': 'Encogimientos con mancuernas',
  'arm circle': 'Círculos de brazos',
  'arm circles': 'Círculos de brazos',
  // ── Kettlebell ──
  'kettlebell swing': 'Balanceo con kettlebell',
  'turkish get up': 'Levantamiento turco',
  'kettlebell clean': 'Clean con kettlebell',
  'kettlebell snatch': 'Snatch con kettlebell',
  'kettlebell press': 'Press con kettlebell',
  'windmill': 'Molino',
  // ── Varios ──
  'farmer walk': 'Paseo del granjero',
  'farmers walk': 'Paseo del granjero',
  'bear crawl': 'Caminata de oso',
  'crab walk': 'Caminata de cangrejo',
  'walking on an incline treadmill': 'Caminata en cinta inclinada',
  'side to side push ups': 'Flexiones laterales',
  // ── Press de banca y variantes ──
  'bench press powerlifting': 'Press de banca powerlifting',
  'bench press with bands': 'Press de banca con bandas',
  'bench press with chains': 'Press de banca con cadenas',
  'board press': 'Press en tabla',
  'pin presses': 'Press desde seguros',
  'chain press': 'Press con cadenas',
  'close grip barbell bench press': 'Press de banca agarre cerrado',
  'close grip dumbbell press': 'Press con mancuernas agarre cerrado',
  'wide grip barbell bench press': 'Press de banca agarre ancho',
  'wide grip decline barbell bench press': 'Press declinado agarre ancho',
  'decline barbell bench press': 'Press declinado con barra',
  'decline dumbbell bench press': 'Press declinado con mancuernas',
  'decline dumbbell flyes': 'Aperturas declinadas con mancuernas',
  'decline smith press': 'Press declinado en multipower',
  'machine bench press': 'Press de banca en máquina',
  'smith machine bench press': 'Press de banca en multipower',
  'smith machine close grip bench press': 'Press de banca agarre cerrado en multipower',
  'smith machine decline press': 'Press declinado en multipower',
  'smith machine incline bench press': 'Press inclinado en multipower',
  'leverage chest press': 'Press de pecho en máquina',
  'leverage decline chest press': 'Press de pecho declinado en máquina',
  'leverage incline chest press': 'Press de pecho inclinado en máquina',
  'reverse band bench press': 'Press de banca con bandas invertidas',
  'reverse triceps bench press': 'Press de tríceps de banca',
  'svend press': 'Press Svend',
  'tate press': 'Press Tate',
  'jm press': 'Press JM',
  'neck press': 'Press al cuello',
  'press sit up': 'Abdominales con press',
  'cuban press': 'Press cubano',
  'bradford rocky presses': 'Press Bradford/Rocky',
  'standing bradford press': 'Press Bradford de pie',
  'bent press': 'Bent press',
  'anti gravity press': 'Press antigravedad',
  'crucifix': 'Cristo',
  'floor press with chains': 'Press en suelo con cadenas',
  'leg over floor press': 'Press en suelo con pierna cruzada',
  'one arm floor press': 'Press en suelo a un brazo',
  'alternating floor press': 'Press en suelo alterno',
  // ── Polea / pecho ──
  'cable chest press': 'Press de pecho en polea',
  'cable crossover': 'Cruce de poleas',
  'flat bench cable flyes': 'Aperturas en polea en banco plano',
  'incline cable chest press': 'Press de pecho en polea inclinado',
  'incline cable flye': 'Aperturas en polea inclinadas',
  'low cable crossover': 'Cruce de poleas bajo',
  'single arm cable crossover': 'Cruce de poleas a un brazo',
  'bodyweight flyes': 'Aperturas con peso corporal',
  'isometric chest squeezes': 'Compresiones isométricas de pecho',
  'bosu ball cable crunch with side bends': 'Abdominales en polea con bosu',
  // ── Press de hombros ──
  'cable shoulder press': 'Press de hombros en polea',
  'seated cable shoulder press': 'Press de hombros en polea sentado',
  'machine shoulder military press': 'Press militar en máquina',
  'leverage shoulder press': 'Press de hombros en máquina',
  'smith machine overhead shoulder press': 'Press de hombros en multipower',
  'standing military press': 'Press militar de pie',
  'seated barbell military press': 'Press militar sentado',
  'standing barbell press behind neck': 'Press tras nuca de pie',
  'arnold dumbbell press': 'Press Arnold con mancuernas',
  'dumbbell one arm shoulder press': 'Press de hombros a un brazo',
  'alternating cable shoulder press': 'Press de hombros alterno en polea',
  'dumbbell scaption': 'Elevaciones escapulares con mancuernas',
  'dumbbell raise': 'Elevación con mancuerna',
  'standing dumbbell press': 'Press con mancuernas de pie',
  'standing alternating dumbbell press': 'Press con mancuernas alterno',
  'standing palms in dumbbell press': 'Press con mancuernas agarre neutral',
  'standing palm in one arm dumbbell press': 'Press con mancuerna a un brazo',
  'see saw press alternating side press': 'Press alternado',
  'standing front barbell raise over head': 'Elevación frontal con barra sobre la cabeza',
  'front dumbbell raise': 'Elevaciones frontales con mancuernas',
  'front cable raise': 'Elevaciones frontales en polea',
  'front plate raise': 'Elevaciones frontales con disco',
  'front incline dumbbell raise': 'Elevaciones frontales inclinadas',
  'front two dumbbell raise': 'Elevaciones frontales con dos mancuernas',
  'front raise and pullover': 'Elevación frontal y pullover',
  'side laterals to front raise': 'Elevaciones laterales a frontales',
  'one arm incline lateral raise': 'Elevación lateral inclinada a un brazo',
  'one arm side laterals': 'Elevaciones laterales a un brazo',
  'standing low pulley deltoid raise': 'Elevación de hombro en polea baja',
  'seated front deltoid': 'Deltoides frontal sentado',
  'dumbbell lying pronation': 'Pronación acostado con mancuerna',
  'dumbbell lying supination': 'Supinación acostado con mancuerna',
  'dumbbell lying rear lateral raise': 'Vuelos posteriores acostado con mancuernas',
  'dumbbell lying one arm rear lateral raise': 'Vuelos posteriores a un brazo acostado',
  'lying rear delt raise': 'Vuelos posteriores acostado',
  'reverse flyes': 'Vuelos posteriores',
  'reverse flyes with external rotation': 'Vuelos posteriores con rotación externa',
  'reverse machine flyes': 'Vuelos posteriores en máquina',
  'seated bent over rear delt raise': 'Vuelos posteriores sentado',
  'bent over dumbbell rear delt raise with head on bench': 'Vuelos posteriores apoyado en banco',
  'cable rope rear delt rows': 'Remo de deltoides posterior en polea',
  'smith incline shoulder raise': 'Elevación de hombros en multipower',
  'shoulder raise': 'Elevación de hombros',
  // ── Tríceps ──
  'body tricep press': 'Press de tríceps con peso corporal',
  'cable incline pushdown': 'Pushdown inclinado en polea',
  'cable incline triceps extension': 'Extensión de tríceps inclinado en polea',
  'cable lying triceps extension': 'Extensión de tríceps acostado en polea',
  'cable one arm tricep extension': 'Extensión de tríceps a un brazo en polea',
  'cable rope overhead triceps extension': 'Extensión de tríceps sobre la cabeza en polea',
  'decline dumbbell triceps extension': 'Extensión de tríceps declinado',
  'decline ez bar triceps extension': 'Extensión de tríceps con barra Z declinada',
  'dumbbell lying tricep extension': 'Extensión de tríceps acostado con mancuernas',
  'dumbbell one arm triceps extension': 'Extensión de tríceps a un brazo con mancuerna',
  'ez bar skullcrusher': 'Extensión de tríceps acostado con barra Z',
  'incline barbell triceps extension': 'Extensión de tríceps inclinado con barra',
  'kneeling cable triceps extension': 'Extensión de tríceps de rodillas en polea',
  'low cable triceps extension': 'Extensión de tríceps en polea baja',
  'lying close grip barbell triceps extension behind the head': 'Extensión de tríceps tras la cabeza',
  'lying close grip barbell triceps press to chin': 'Press de tríceps al mentón',
  'lying triceps press': 'Press de tríceps acostado',
  'machine triceps extension': 'Extensión de tríceps en máquina',
  'overhead triceps': 'Tríceps sobre la cabeza',
  'reverse grip triceps pushdown': 'Pushdown de tríceps agarre supino',
  'seated bent over one arm dumbbell triceps extension': 'Extensión de tríceps sentado a un brazo',
  'seated bent over two arm dumbbell triceps extension': 'Extensión de tríceps sentado con dos mancuernas',
  'sled overhead triceps extension': 'Extensión de tríceps sobre la cabeza con trineo',
  'speed band overhead triceps': 'Tríceps sobre la cabeza con banda',
  'standing bent over one arm dumbbell triceps extension': 'Extensión de tríceps inclinado a un brazo',
  'standing bent over two arm dumbbell triceps extension': 'Extensión de tríceps inclinado',
  'standing dumbbell triceps extension': 'Extensión de tríceps de pie',
  'standing one arm dumbbell triceps extension': 'Extensión de tríceps a un brazo de pie',
  'standing overhead barbell triceps extension': 'Extensión de tríceps sobre la cabeza con barra',
  'standing low pulley one arm triceps extension': 'Extensión de tríceps a un brazo en polea baja',
  'standing towel triceps extension': 'Extensión de tríceps con toalla',
  'triceps overhead extension with rope': 'Extensión de tríceps sobre la cabeza con cuerda',
  'triceps pushdown rope attachment': 'Pushdown de tríceps con cuerda',
  'triceps pushdown v bar attachment': 'Pushdown de tríceps con barra V',
  'dips chest version': 'Fondos para pecho',
  'dips triceps version': 'Fondos para tríceps',
  'dip machine': 'Máquina de fondos',
  'parallel bar dip': 'Fondos en paralelas',
  'ring dips': 'Fondos en anillas',
  'weighted bench dip': 'Fondos en banco con peso',
  // ── Bíceps y antebrazo ──
  'dumbbell alternate bicep curl': 'Curl de bíceps alterno',
  'dumbbell bicep curl': 'Curl de bíceps con mancuernas',
  'cable hammer curls rope attachment': 'Curl martillo en polea con cuerda',
  'cable preacher curl': 'Curl predicador en polea',
  'cable wrist curl': 'Curl de muñeca en polea',
  'close grip ez bar curl': 'Curl con barra Z agarre cerrado',
  'close grip ez bar curl with band': 'Curl con barra Z agarre cerrado con banda',
  'close grip standing barbell curl': 'Curl con barra agarre cerrado',
  'concentration curls': 'Curl concentrado',
  'cross body hammer curl': 'Curl martillo cruzado',
  'drag curl': 'Curl drag',
  'ez bar curl': 'Curl con barra Z',
  'flexor incline dumbbell curls': 'Curl inclinado para flexores',
  'high cable curls': 'Curl en polea alta',
  'incline dumbbell curl': 'Curl inclinado con mancuernas',
  'incline hammer curls': 'Curl martillo inclinado',
  'incline inner biceps curl': 'Curl de bíceps interno inclinado',
  'lying cable curl': 'Curl en polea acostado',
  'lying close grip bar curl on high pulley': 'Curl en polea alta acostado',
  'lying high bench barbell curl': 'Curl con barra en banco alto',
  'lying supine dumbbell curl': 'Curl supino con mancuernas',
  'machine bicep curl': 'Curl de bíceps en máquina',
  'machine preacher curls': 'Curl predicador en máquina',
  'overhead cable curl': 'Curl sobre la cabeza en polea',
  'preacher hammer dumbbell curl': 'Curl predicador martillo',
  'reverse barbell curl': 'Curl inverso con barra',
  'reverse barbell preacher curls': 'Curl predicador inverso con barra',
  'reverse cable curl': 'Curl inverso en polea',
  'reverse plate curls': 'Curl inverso con disco',
  'seated close grip concentration barbell curl': 'Curl concentrado sentado',
  'seated dumbbell curl': 'Curl con mancuernas sentado',
  'seated dumbbell inner biceps curl': 'Curl interno sentado',
  'seated biceps': 'Bíceps sentado',
  'standing biceps cable curl': 'Curl de bíceps en polea',
  'standing concentration curl': 'Curl concentrado de pie',
  'standing dumbbell reverse curl': 'Curl inverso con mancuernas',
  'standing inner biceps curl': 'Curl interno de pie',
  'standing one arm cable curl': 'Curl a un brazo en polea',
  'standing one arm dumbbell curl over incline bench': 'Curl a un brazo sobre banco inclinado',
  'two arm dumbbell preacher curl': 'Curl predicador con dos mancuernas',
  'wide grip standing barbell curl': 'Curl con barra agarre ancho',
  'zottman preacher curl': 'Curl Zottman predicador',
  'barbell curls lying against an incline': 'Curl con barra sobre banco inclinado',
  'dumbbell prone incline curl': 'Curl prono inclinado',
  'palms down dumbbell wrist curl over a bench': 'Curl de muñeca prono sobre banco',
  'palms up barbell wrist curl over a bench': 'Curl de muñeca supino con barra',
  'palms up dumbbell wrist curl over a bench': 'Curl de muñeca supino con mancuerna',
  'seated palm up barbell wrist curl': 'Curl de muñeca supino con barra sentado',
  'seated one arm dumbbell palms up wrist curl': 'Curl de muñeca a un brazo',
  'standing palms up barbell behind the back wrist curl': 'Curl de muñeca tras la espalda',
  'wrist roller': 'Rodillo de muñeca',
  'wrist rotations with straight bar': 'Rotaciones de muñeca con barra',
  'finger curls': 'Curl de dedos',
  'palms down wrist curl over a bench': 'Curl de muñeca prono',
  'seated two arm palms up low pulley wrist curl': 'Curl de muñeca en polea baja',
  'seated dumbbell palms down wrist curl': 'Curl de muñeca prono sentado con mancuerna',
  'seated dumbbell palms up wrist curl': 'Curl de muñeca supino sentado con mancuerna',
  // ── Espalda / remos ──
  'barbell rear delt row': 'Remo de deltoides posterior con barra',
  'bent over one arm long bar row': 'Remo con barra larga a un brazo',
  'bent over two arm long bar row': 'Remo con barra larga',
  'bent over two dumbbell row': 'Remo con dos mancuernas',
  'bent over two dumbbell row with palms in': 'Remo con dos mancuernas agarre neutral',
  'bodyweight mid row': 'Remo medio con peso corporal',
  'cable deadlifts': 'Peso muerto en polea',
  'elevated cable rows': 'Remo en polea elevado',
  'incline bench pull': 'Remo en banco inclinado',
  'inverted row with straps': 'Remo invertido con agarres',
  'kneeling high pulley row': 'Remo en polea alta de rodillas',
  'kneeling single arm high pulley row': 'Remo en polea alta a un brazo',
  'leverage high row': 'Remo alto en máquina',
  'leverage iso row': 'Remo isométrico en máquina',
  'low pulley row to neck': 'Remo en polea baja al cuello',
  'lying cambered barbell row': 'Remo con barra acostado',
  'lying t bar row': 'Remo T acostado',
  'one arm long bar row': 'Remo con barra larga a un brazo',
  'seated one arm cable pulley rows': 'Remo en polea a un brazo sentado',
  'shotgun row': 'Remo escopeta',
  'sled row': 'Remo con trineo',
  'smith machine bent over row': 'Remo inclinado en multipower',
  'straight bar bench mid rows': 'Remo medio en banco',
  't bar row with handle': 'Remo T con agarre',
  'two arm kettlebell row': 'Remo con dos kettlebell',
  'alternating kettlebell row': 'Remo alterno con kettlebell',
  'reverse grip bent over rows': 'Remo inclinado agarre supino',
  'dumbbell incline row': 'Remo inclinado con mancuernas',
  'landmine linear jammer': 'Jammer lineal con landmine',
  'single arm linear jammer': 'Jammer lineal a un brazo',
  // ── Dominadas / jalones ──
  'band assisted pull up': 'Dominadas asistidas con banda',
  'wide grip rear pull up': 'Dominadas tras nuca',
  'scapular pull up': 'Dominadas escapulares',
  'one arm chin up': 'Dominadas supinas a un brazo',
  'one arm lat pulldown': 'Jalón a un brazo',
  'close grip front lat pulldown': 'Jalón agarre cerrado',
  'full range of motion lat pulldown': 'Jalón de recorrido completo',
  'gironda sternum chins': 'Dominadas Gironda',
  'mixed grip chin': 'Dominadas supinas agarre mixto',
  'rocky pull ups pulldowns': 'Dominadas y jalones estilo Rocky',
  'side to side chins': 'Dominadas supinas laterales',
  'underhand cable pulldowns': 'Jalón en polea agarre supino',
  'v bar pulldown': 'Jalón con barra V',
  'v bar pullup': 'Dominadas con barra V',
  'wide grip pulldown behind the neck': 'Jalón tras nuca',
  'weighted pull ups': 'Dominadas con peso',
  'rope straight arm pulldown': 'Jalón con brazos rectos y cuerda',
  'straight arm pulldown cable': 'Jalón con brazos rectos en polea',
  'kipping muscle up': 'Muscle up con kipping',
  'muscle up': 'Muscle up',
  // ── Peso muerto / cadena posterior ──
  'car deadlift': 'Peso muerto con coche',
  'clean deadlift': 'Peso muerto para clean',
  'deadlift with bands': 'Peso muerto con bandas',
  'deadlift with chains': 'Peso muerto con cadenas',
  'axle deadlift': 'Peso muerto con barra gruesa',
  'leverage deadlift': 'Peso muerto en máquina',
  'rack pulls': 'Peso muerto en rack',
  'rack pull with bands': 'Peso muerto en rack con bandas',
  'reverse band deadlift': 'Peso muerto con bandas invertidas',
  'reverse band sumo deadlift': 'Peso muerto sumo con bandas invertidas',
  'rickshaw deadlift': 'Peso muerto rickshaw',
  'romanian deadlift from deficit': 'Peso muerto rumano desde déficit',
  'smith machine stiff legged deadlift': 'Peso muerto piernas rígidas en multipower',
  'snatch deadlift': 'Peso muerto para snatch',
  'stiff legged barbell deadlift': 'Peso muerto piernas rígidas con barra',
  'stiff legged dumbbell deadlift': 'Peso muerto piernas rígidas con mancuernas',
  'sumo deadlift with bands': 'Peso muerto sumo con bandas',
  'sumo deadlift with chains': 'Peso muerto sumo con cadenas',
  'good morning off pins': 'Buenos días desde seguros',
  'hanging bar good morning': 'Buenos días colgado de la barra',
  'seated good mornings': 'Buenos días sentado',
  'stiff leg barbell good morning': 'Buenos días piernas rígidas',
  'band good morning': 'Buenos días con banda',
  'floor glute ham raise': 'Elevación de glúteo y femoral en suelo',
  'glute ham raise': 'Elevación de glúteo y femoral',
  'natural glute ham raise': 'Elevación de glúteo y femoral natural',
  'weighted ball hyperextension': 'Hiperextensiones con balón',
  'hyperextensions': 'Hiperextensiones',
  'hyperextensions with no hyperextension bench': 'Hiperextensiones sin banco',
  'reverse hyperextension': 'Hiperextensiones inversas',
  'barbell side bend': 'Flexión lateral con barra',
  'dumbbell side bend': 'Flexión lateral con mancuerna',
  'standing cable lift': 'Elevación en polea de pie',
  'standing cable wood chop': 'Leñador en polea de pie',
  'torso rotation': 'Rotación de torso',
  'plate twist': 'Giros con disco',
  'weighted ball side bend': 'Flexión lateral con balón',
  'cable judo flip': 'Judo flip en polea',
  'cable iron cross': 'Cruz de hierro en polea',
  'cable internal rotation': 'Rotación interna en polea',
  'cable reverse crunch': 'Abdominales inversos en polea',
  'external rotation': 'Rotación externa',
  'external rotation with band': 'Rotación externa con banda',
  'external rotation with cable': 'Rotación externa en polea',
  'internal rotation with band': 'Rotación interna con banda',
  'landmine 180s': 'Giros de 180 con landmine',
  'spell caster': 'Lanzador de hechizos',
  'lying crossover': 'Cruce acostado',
  // ── Sentadillas / piernas ──
  'barbell squat to a bench': 'Sentadilla con barra al banco',
  'barbell hack squat': 'Sentadilla hack con barra',
  'barbell side split squat': 'Sentadilla lateral con barra',
  'bodyweight squat': 'Sentadilla con peso corporal',
  'box squat with bands': 'Sentadilla a cajón con bandas',
  'box squat with chains': 'Sentadilla a cajón con cadenas',
  'chair squat': 'Sentadilla en silla',
  'dumbbell squat to a bench': 'Sentadilla con mancuernas al banco',
  'frankenstein squat': 'Sentadilla Frankenstein',
  'freehand jump squat': 'Sentadilla con salto sin peso',
  'front barbell squat': 'Sentadilla frontal con barra',
  'front barbell squat to a bench': 'Sentadilla frontal al banco',
  'front squats with two kettlebells': 'Sentadilla frontal con dos kettlebell',
  'hack squat': 'Sentadilla hack',
  'jefferson squats': 'Sentadillas Jefferson',
  'kettlebell pistol squat': 'Sentadilla pistola con kettlebell',
  'kneeling jump squat': 'Sentadilla con salto de rodillas',
  'kneeling squat': 'Sentadilla de rodillas',
  'lying machine squat': 'Sentadilla en máquina acostado',
  'narrow stance hack squats': 'Sentadilla hack estrecha',
  'narrow stance squats': 'Sentadillas estrechas',
  'olympic squat': 'Sentadilla olímpica',
  'one arm overhead kettlebell squats': 'Sentadilla con kettlebell sobre la cabeza',
  'one leg barbell squat': 'Sentadilla a una pierna con barra',
  'overhead squat': 'Sentadilla sobre la cabeza',
  'reverse band box squat': 'Sentadilla a cajón con bandas invertidas',
  'reverse band power squat': 'Sentadilla power con bandas invertidas',
  'sit squats': 'Sentadillas en silla',
  'smith machine pistol squat': 'Sentadilla pistola en multipower',
  'smith single leg split squat': 'Sentadilla búlgara en multipower',
  'speed box squat': 'Sentadilla a cajón explosiva',
  'speed squats': 'Sentadillas explosivas',
  'split squat with dumbbells': 'Sentadilla búlgara con mancuernas',
  'split squats': 'Sentadillas búlgaras',
  'squat with bands': 'Sentadilla con bandas',
  'squat with chains': 'Sentadilla con cadenas',
  'squat with plate movers': 'Sentadilla con discos deslizantes',
  'squats with bands': 'Sentadillas con bandas',
  'weighted jump squat': 'Sentadilla con salto y peso',
  'weighted sissy squat': 'Sentadilla sissy con peso',
  'weighted squat': 'Sentadilla con peso',
  'wide stance barbell squat': 'Sentadilla ancha con barra',
  'zercher squats': 'Sentadillas Zercher',
  'plie dumbbell squat': 'Sentadilla plié con mancuerna',
  'single leg high box squat': 'Sentadilla alta a una pierna',
  'smith machine leg press': 'Prensa de piernas en multipower',
  'narrow stance leg press': 'Prensa estrecha',
  'single leg leg extension': 'Extensión de cuádriceps a una pierna',
  'seated leg tucks': 'Flexiones de piernas sentado',
  'lying leg curls': 'Curl femoral acostado',
  'standing leg curl': 'Curl femoral de pie',
  'seated band hamstring curl': 'Curl femoral con banda sentado',
  'ball leg curl': 'Curl femoral con pelota',
  'platform hamstring slides': 'Deslizamientos femorales en plataforma',
  'prone manual hamstring': 'Isquiotibial manual prono',
  'dumbbell seated one leg calf raise': 'Elevación de gemelos sentado a una pierna',
  'standing barbell calf raise': 'Elevación de gemelos con barra',
  'standing dumbbell calf raise': 'Elevación de gemelos con mancuernas',
  'barbell seated calf raise': 'Elevación de gemelos sentado con barra',
  'donkey calf raises': 'Elevación de gemelos burro',
  'rocking standing calf raise': 'Elevación de gemelos balanceada',
  'smith machine calf raise': 'Elevación de gemelos en multipower',
  'smith machine reverse calf raises': 'Elevación de gemelos inversa en multipower',
  'standing gastrocnemius calf stretch': 'Estiramiento de gemelos de pie',
  'standing soleus and achilles stretch': 'Estiramiento de sóleo y Aquiles',
  'seated calf stretch': 'Estiramiento de gemelos sentado',
  'calf stretch elbows against wall': 'Estiramiento de gemelos contra la pared',
  'calf stretch hands against wall': 'Estiramiento de gemelos con manos en la pared',
  'calf press': 'Press de gemelos',
  'calf press on the leg press machine': 'Press de gemelos en prensa',
  'calf raise on a dumbbell': 'Elevación de gemelos sobre mancuerna',
  'calf raises with bands': 'Elevación de gemelos con bandas',
  'standing hip circles': 'Círculos de cadera de pie',
  'hip circles': 'Círculos de cadera',
  'hip extension with bands': 'Extensión de cadera con bandas',
  'hip flexion with band': 'Flexión de cadera con banda',
  'hip lift with band': 'Elevación de cadera con banda',
  'thigh abductor': 'Abductor de muslo',
  'thigh adductor': 'Aductor de muslo',
  'cable hip adduction': 'Aducción de cadera en polea',
  'one legged cable kickback': 'Patada de glúteo en polea a una pierna',
  'physioball hip bridge': 'Puente de glúteos con pelota',
  'pelvic tilt into bridge': 'Inclinación pélvica a puente',
  'standing pelvic tilt': 'Inclinación pélvica de pie',
  'bent knee hip raise': 'Elevación de cadera rodillas flexionadas',
  'butt lift bridge': 'Elevación de glúteos',
  'butt ups': 'Elevaciones de glúteo',
  'lying glute': 'Glúteo acostado',
  'seated glute': 'Glúteo sentado',
  'single leg push off': 'Empuje a una pierna',
  'monster walk': 'Caminata monstruo',
  'bodyweight walking lunge': 'Zancadas caminando con peso corporal',
  'barbell walking lunge': 'Zancadas caminando con barra',
  'crossover reverse lunge': 'Zancada inversa cruzada',
  'dumbbell lunges': 'Zancadas con mancuernas',
  'dumbbell rear lunge': 'Zancada inversa con mancuernas',
  'elevated back lunge': 'Zancada inversa elevada',
  'lunge pass through': 'Pase en zancada',
  'lunge sprint': 'Zancada con sprint',
  // ── Cardio / agilidad / strongman ──
  'battling ropes': 'Cuerdas de batalla',
  'bench jump': 'Salto al banco',
  'bench sprint': 'Sprint en banco',
  'box skip': 'Skip en cajón',
  'carioca quick step': 'Paso carioca',
  'fast skipping': 'Skip rápido',
  'frog hops': 'Saltos de rana',
  'front box jump': 'Salto frontal al cajón',
  'front cone hops or hurdle hops': 'Saltos a conos',
  'hurdle hops': 'Saltos a vallas',
  'knee tuck jump': 'Salto con rodillas al pecho',
  'lateral bound': 'Salto lateral',
  'lateral box jump': 'Salto lateral al cajón',
  'lateral cone hops': 'Saltos laterales a conos',
  'linear depth jump': 'Salto en profundidad',
  'depth jump leap': 'Salto en profundidad con impulso',
  'power stairs': 'Escaleras de potencia',
  'quick leap': 'Salto rápido',
  'rocket jump': 'Salto cohete',
  'scissors jump': 'Saltos de tijera',
  'side hop sprint': 'Saltos laterales con sprint',
  'side to side box shuffle': 'Shuffle lateral',
  'single cone sprint drill': 'Sprint a un cono',
  'single leg hop progression': 'Saltos a una pierna progresivos',
  'single leg lateral hop': 'Salto lateral a una pierna',
  'single leg stride jump': 'Salto de zancada a una pierna',
  'single leg butt kick': 'Patada de glúteo a una pierna',
  'double leg butt kick': 'Patada de glúteo',
  'skating': 'Patinaje',
  'sled drag harness': 'Arrastre de trineo con arnés',
  'sled push': 'Empuje de trineo',
  'prowler sprint': 'Sprint con prowler',
  'backward drag': 'Arrastre hacia atrás',
  'backward medicine ball throw': 'Lanzamiento de balón medicinal hacia atrás',
  'keg load': 'Carga de barril',
  'sandbag load': 'Carga de saco',
  'tire flip': 'Voltereta de neumático',
  'log lift': 'Levantamiento de tronco',
  'atlas stones': 'Piedras de Atlas',
  'atlas stone trainer': 'Entrenador de piedras de Atlas',
  'yoke walk': 'Caminata con yugo',
  'rickshaw carry': 'Caminata rickshaw',
  'sledgehammer swings': 'Golpes de mazo',
  'heavy bag thrust': 'Empuje de saco pesado',
  'vertical swing': 'Swing vertical',
  'spider crawl': 'Caminata de araña',
  'inchworm': 'Oruga',
  'gorilla chin crunch': 'Dominada gorila con crunch',
  'groiners': 'Groiners',
  'wind sprints': 'Sprints',
  'bicycling': 'Ciclismo',
  'bicycling stationary': 'Ciclismo estático',
  'elliptical trainer': 'Elíptica',
  'rowing stationary': 'Remo estático',
  'stairmaster': 'Escaladora',
  'step mill': 'Escalera',
  'jogging treadmill': 'Trotar en cinta',
  'running treadmill': 'Correr en cinta',
  'walking treadmill': 'Caminar en cinta',
  'trail running walking': 'Carrera o caminata de montaña',
  'recumbent bike': 'Bicicleta reclinada',
  'forward drag with press': 'Arrastre hacia delante con press',
  'side standing long jump': 'Salto de longitud lateral',
  'standing long jump': 'Salto de longitud de pie',
  'stride jump crossover': 'Salto cruzado',
  'split jump': 'Salto dividido',
  'rope jumping': 'Saltar la cuerda',
  'rope climb': 'Trepar la cuerda',
  // ── Estiramientos / movilidad ──
  'ankle circles': 'Círculos de tobillo',
  'wrist circles': 'Círculos de muñeca',
  'elbow circles': 'Círculos de codo',
  'knee circles': 'Círculos de rodilla',
  'shoulder circles': 'Círculos de hombro',
  'cat stretch': 'Estiramiento de gato',
  'behind head chest stretch': 'Estiramiento de pecho tras la cabeza',
  'chair leg extended stretch': 'Estiramiento de pierna en silla',
  'chair lower back stretch': 'Estiramiento de espalda baja en silla',
  'chair upper body stretch': 'Estiramiento de torso en silla',
  'chest and front of shoulder stretch': 'Estiramiento de pecho y hombro',
  'chest stretch on stability ball': 'Estiramiento de pecho sobre pelota',
  'chin to chest stretch': 'Estiramiento de mentón al pecho',
  'dancers stretch': 'Estiramiento de bailarina',
  'downward facing balance': 'Equilibrio hacia abajo',
  'dynamic back stretch': 'Estiramiento dinámico de espalda',
  'dynamic chest stretch': 'Estiramiento dinámico de pecho',
  'groin and back stretch': 'Estiramiento de ingle y espalda',
  'hamstring stretch': 'Estiramiento de isquiotibiales',
  'hug a ball': 'Abraza la pelota',
  'hug knees to chest': 'Rodillas al pecho',
  'intermediate groin stretch': 'Estiramiento de ingle intermedio',
  'intermediate hip flexor and quad stretch': 'Estiramiento de flexores y cuádriceps',
  'it band and glute stretch': 'Estiramiento de banda iliotibial y glúteo',
  'knee across the body': 'Rodilla cruzada',
  'kneeling forearm stretch': 'Estiramiento de antebrazo de rodillas',
  'kneeling hip flexor': 'Estiramiento de flexor de cadera',
  'leg up hamstring stretch': 'Estiramiento de isquiotibiales con pierna elevada',
  'looking at ceiling': 'Mirando al techo',
  'lying bent leg groin': 'Estiramiento de ingle acostado',
  'lying prone quadriceps': 'Cuádriceps prono',
  'middle back stretch': 'Estiramiento de espalda media',
  'on your back quad stretch': 'Estiramiento de cuádriceps boca arriba',
  'on your side quad stretch': 'Estiramiento de cuádriceps de lado',
  'one arm against wall': 'Un brazo contra la pared',
  'one half locust': 'Media langosta',
  'one knee to chest': 'Una rodilla al pecho',
  'overhead stretch': 'Estiramiento sobre la cabeza',
  'peroneals stretch': 'Estiramiento de peroneos',
  'posterior tibialis stretch': 'Estiramiento de tibial posterior',
  'quad stretch': 'Estiramiento de cuádriceps',
  'round the world shoulder stretch': 'Estiramiento de hombro alrededor del mundo',
  'runners stretch': 'Estiramiento del corredor',
  'seated floor hamstring stretch': 'Estiramiento de isquiotibiales sentado',
  'seated hamstring': 'Isquiotibial sentado',
  'seated hamstring and calf stretch': 'Estiramiento de isquiotibial y gemelo',
  'seated overhead stretch': 'Estiramiento sobre la cabeza sentado',
  'shoulder stretch': 'Estiramiento de hombro',
  'side lying floor stretch': 'Estiramiento en el suelo de lado',
  'side lying groin stretch': 'Estiramiento de ingle de lado',
  'side neck stretch': 'Estiramiento de cuello lateral',
  'side wrist pull': 'Tirón lateral de muñeca',
  'spinal stretch': 'Estiramiento espinal',
  'standing biceps stretch': 'Estiramiento de bíceps de pie',
  'standing elevated quad stretch': 'Estiramiento de cuádriceps elevado',
  'standing hamstring and calf stretch': 'Estiramiento de isquiotibial y gemelo de pie',
  'standing hip flexors': 'Flexores de cadera de pie',
  'standing lateral stretch': 'Estiramiento lateral de pie',
  'standing toe touches': 'Toques de puntillas de pie',
  'tricep side stretch': 'Estiramiento lateral de tríceps',
  'triceps stretch': 'Estiramiento de tríceps',
  'upper back leg grab': 'Agarre de pierna superior',
  'upper back stretch': 'Estiramiento de espalda alta',
  'upward stretch': 'Estiramiento hacia arriba',
  'worlds greatest stretch': 'El mejor estiramiento del mundo',
  'ankle on the knee': 'Tobillo sobre la rodilla',
  'all fours quad stretch': 'Cuádriceps a cuatro patas',
  'the straddle': 'El split',
  'foot smr': 'Foam roller de pie',
  'neck smr': 'Foam roller de cuello',
  'lower back smr': 'Foam roller de espalda baja',
  'hamstring smr': 'Foam roller de isquiotibiales',
  'quadriceps smr': 'Foam roller de cuádriceps',
  'calves smr': 'Foam roller de gemelos',
  'latissimus dorsi smr': 'Foam roller de dorsales',
  'iliotibial tract smr': 'Foam roller de cintilla iliotibial',
  'brachialis smr': 'Foam roller de braquial',
  'rhomboids smr': 'Foam roller de romboides',
  'piriformis smr': 'Foam roller de piriforme',
  'anterior tibialis smr': 'Foam roller de tibial anterior',
  'peroneals smr': 'Foam roller de peroneos',
  // ── Core ──
  'ab crunch machine': 'Máquina de abdominales',
  'cable seated crunch': 'Abdominales sentado en polea',
  'cable russian twists': 'Giros rusos en polea',
  'cocoons': 'Capullos',
  'cross body crunch': 'Abdominales cruzados',
  'crunch hands overhead': 'Abdominales con manos arriba',
  'crunch legs on exercise ball': 'Abdominales con piernas en pelota',
  'decline crunch': 'Abdominales declinados',
  'decline oblique crunch': 'Abdominales oblicuos declinados',
  'decline reverse crunch': 'Abdominales inversos declinados',
  'exercise ball crunch': 'Abdominales con pelota',
  'exercise ball pull in': 'Flexión de piernas con pelota',
  'flat bench leg pull in': 'Flexión de piernas en banco',
  'flat bench lying leg raise': 'Elevación de piernas en banco',
  'frog sit ups': 'Abdominales de rana',
  'front leg raises': 'Elevaciones de pierna frontales',
  'hanging pike': 'Pica colgado',
  'iron cross': 'Cruz de hierro',
  'iron crosses stretch': 'Cruces de hierro',
  'isometric wipers': 'Limpiaparabrisas isométricos',
  'janda sit up': 'Abdominales Janda',
  'leg pull in': 'Flexión de piernas',
  'london bridges': 'Puentes de Londres',
  'lower back curl': 'Curl lumbar',
  'medicine ball full twist': 'Giro completo con balón',
  'oblique crunches': 'Abdominales oblicuos',
  'oblique crunches on the floor': 'Abdominales oblicuos en suelo',
  'otis up': 'Abdominales Otis',
  'plate pinch': 'Pinza de disco',
  'rope crunch': 'Abdominales con cuerda',
  'seated barbell twist': 'Giros con barra sentado',
  'side bridge': 'Puente lateral',
  'side jackknife': 'Navaja lateral',
  'side leg raises': 'Elevaciones de pierna laterales',
  'standing rope crunch': 'Abdominales con cuerda de pie',
  'stomach vacuum': 'Vacío abdominal',
  'suspended fallout': 'Caída suspendida',
  'suspended reverse crunch': 'Abdominales inversos suspendidos',
  'toe touchers': 'Toques de puntillas',
  'tuck crunch': 'Abdominales encogido',
  'weighted crunches': 'Abdominales con peso',
  'weighted sit ups with bands': 'Abdominales con peso y bandas',
  // ── Flexiones (variantes) ──
  'body up': 'Flexión con elevación',
  'clock push up': 'Flexiones de reloj',
  'close grip push up off of a dumbbell': 'Flexiones con agarre cerrado sobre mancuerna',
  'drop push': 'Flexiones de caída',
  'handstand push ups': 'Flexiones de pino',
  'hindu pushups': 'Flexiones hindú',
  'incline push up close grip': 'Flexiones inclinadas agarre cerrado',
  'incline push up depth jump': 'Flexiones inclinadas con salto',
  'incline push up medium': 'Flexiones inclinadas medias',
  'incline push up reverse grip': 'Flexiones inclinadas agarre supino',
  'incline push up wide': 'Flexiones inclinadas abiertas',
  'kneeling arm drill': 'Brazos de rodillas',
  'plyo kettlebell pushups': 'Flexiones pliométricas con kettlebell',
  'plyo push up': 'Flexiones pliométricas',
  'push up wide': 'Flexiones abiertas',
  'push ups close triceps position': 'Flexiones de tríceps',
  'push ups with feet elevated': 'Flexiones con pies elevados',
  'push ups with feet on an exercise ball': 'Flexiones con pies en pelota',
  'push up to side plank': 'Flexión a plancha lateral',
  'return push from stance': 'Empuje de vuelta desde posición',
  'suspended push up': 'Flexiones suspendidas',
  'single arm push up': 'Flexiones a un brazo',
  // ── Halterofilia (clean/snatch/jerk) ──
  'clean': 'Clean',
  'clean and jerk': 'Clean and jerk',
  'clean and press': 'Clean y press',
  'clean from blocks': 'Clean desde bloques',
  'clean pull': 'Tirón de clean',
  'clean shrug': 'Encogimiento de clean',
  'hang clean': 'Clean colgado',
  'hang clean below the knees': 'Clean colgado bajo rodilla',
  'hang snatch': 'Snatch colgado',
  'hang snatch below knees': 'Snatch colgado bajo rodilla',
  'power clean': 'Power clean',
  'power clean from blocks': 'Power clean desde bloques',
  'power jerk': 'Power jerk',
  'power snatch': 'Power snatch',
  'power snatch from blocks': 'Power snatch desde bloques',
  'snatch': 'Snatch',
  'snatch balance': 'Snatch balance',
  'snatch from blocks': 'Snatch desde bloques',
  'snatch pull': 'Tirón de snatch',
  'snatch shrug': 'Encogimiento de snatch',
  'split clean': 'Clean en split',
  'split jerk': 'Jerk en split',
  'split snatch': 'Snatch en split',
  'squat jerk': 'Jerk en sentadilla',
  'heaving snatch balance': 'Snatch balance con impulso',
  'jerk balance': 'Jerk balance',
  'jerk dip squat': 'Sentadilla de dip para jerk',
  'muscle snatch': 'Snatch a fuerza',
  'bottoms up clean from the hang position': 'Clean colgado al revés',
  'alternating hang clean': 'Clean colgado alterno',
  'double kettlebell alternating hang clean': 'Clean colgado alterno con dos kettlebell',
  'alternating kettlebell press': 'Press alterno con kettlebell',
  'kettlebell dead clean': 'Clean muerto con kettlebell',
  'kettlebell hang clean': 'Clean colgado con kettlebell',
  'open palm kettlebell clean': 'Clean con kettlebell con palma abierta',
  'one arm open palm kettlebell clean': 'Clean a un brazo con palma abierta',
  'one arm kettlebell clean': 'Clean a un brazo con kettlebell',
  'one arm kettlebell clean and jerk': 'Clean and jerk a un brazo con kettlebell',
  'one arm kettlebell snatch': 'Snatch a un brazo con kettlebell',
  'one arm kettlebell swings': 'Swings a un brazo con kettlebell',
  'double kettlebell snatch': 'Snatch con dos kettlebell',
  'double kettlebell push press': 'Push press con dos kettlebell',
  'double kettlebell jerk': 'Jerk con dos kettlebell',
  'two arm kettlebell clean': 'Clean con dos kettlebell',
  'two arm kettlebell jerk': 'Jerk con dos kettlebell',
  'two arm kettlebell military press': 'Press militar con dos kettlebell',
  'kettlebell arnold press': 'Press Arnold con kettlebell',
  'kettlebell seesaw press': 'Press alternado con kettlebell',
  'kettlebell seated press': 'Press sentado con kettlebell',
  'kettlebell sumo high pull': 'Remo alto sumo con kettlebell',
  'kettlebell thruster': 'Thruster con kettlebell',
  'kettlebell turkish get up lunge style': 'Levantamiento turco con zancada',
  'kettlebell windmill': 'Molino con kettlebell',
  'double kettlebell windmill': 'Molino con dos kettlebell',
  'advanced kettlebell windmill': 'Molino avanzado con kettlebell',
  'kettlebell figure 8': 'Ocho con kettlebell',
  'kettlebell pass between the legs': 'Pase entre piernas con kettlebell',
  'kettlebell pirate ships': 'Barcos pirata con kettlebell',
  'kettlebell one legged deadlift': 'Peso muerto a una pierna con kettlebell',
  'one arm kettlebell military press to the side': 'Press militar lateral a un brazo',
  'one arm kettlebell para press': 'Press para a un brazo',
  'one arm kettlebell push press': 'Push press a un brazo',
  'one arm kettlebell split jerk': 'Split jerk a un brazo',
  'one arm kettlebell split snatch': 'Split snatch a un brazo',
  'one arm kettlebell row': 'Remo a un brazo con kettlebell',
  'one arm kettlebell floor press': 'Press en suelo a un brazo con kettlebell',
  'extended range one arm kettlebell floor press': 'Press en suelo con kettlebell de recorrido amplio',
  'one arm medicine ball slam': 'Golpe de balón medicinal a un brazo',
  'medicine ball chest pass': 'Pase de pecho con balón',
  'medicine ball scoop throw': 'Lanzamiento de cuchara con balón',
  'catch and overhead throw': 'Lanzamiento sobre la cabeza',
  'supine chest throw': 'Lanzamiento de pecho supino',
  'supine one arm overhead throw': 'Lanzamiento a un brazo supino',
  'supine two arm overhead throw': 'Lanzamiento a dos brazos supino',
  'standing two arm overhead throw': 'Lanzamiento sobre la cabeza de pie',
  // ── Máquinas y otros ──
  'smith machine behind the back shrug': 'Encogimientos tras la espalda en multipower',
  'smith machine hang power clean': 'Power clean colgado en multipower',
  'smith machine hip raise': 'Elevación de cadera en multipower',
  'smith machine one arm upright row': 'Remo al mentón a un brazo en multipower',
  'smith machine upright row': 'Remo al mentón en multipower',
  'chain handle extension': 'Extensión con agarre de cadena',
  'conans wheel': 'Rueda de Conan',
  'circus bell': 'Campana de circo',
  'car drivers': 'Volante de coche',
  'around the worlds': 'Círculos alrededor del mundo',
  'isometric neck exercise front and back': 'Isométrico de cuello frontal y posterior',
  'isometric neck exercise sides': 'Isométrico de cuello lateral',
  'seated head harness neck resistance': 'Resistencia de cuello con arnés',
  'lying face down plate neck resistance': 'Resistencia de cuello con disco boca abajo',
  'lying face up plate neck resistance': 'Resistencia de cuello con disco boca arriba',
  'standing olympic plate hand squeeze': 'Apretón de disco olímpico',
  'suspended row': 'Remo suspendido',
  'suspended split squat': 'Sentadilla búlgara suspendida',
  'straight arm dumbbell pullover': 'Pullover con mancuerna brazos rectos',
  'wide grip decline barbell pullover': 'Pullover declinado agarre ancho',
  'bent arm barbell pullover': 'Pullover con barra',
  'bent arm dumbbell pullover': 'Pullover con mancuerna',
  'alternate heel touchers': 'Toques de talón alternos',
  'alternate incline dumbbell curl': 'Curl inclinado alterno con mancuernas',
  'alternate leg diagonal bound': 'Saltos diagonales alternos',
  'alternating deltoid raise': 'Elevación de hombro alterna',
  'alternating renegade row': 'Remo renegado alternado',
  '90 90 hamstring': 'Isquiotibial 90/90',
  'adductor groin': 'Aductor/ingle',
  'adductor': 'Aductor',
  'balance board': 'Tabla de equilibrio',
};

/** Apply the curated Spanish dictionary to a catalog list */
function applySpanishNames(list) {
  return list.map((ex) => {
    const key = normalizeName(ex.name);
    // normalizeName() keeps hyphens (e.g. "Handstand Push-Ups" →
    // "handstand push-ups", or "Bench Press - With Bands" →
    // "bench press - with bands"), while the dictionary keys use spaces.
    // Try spaced + hyphenated variants (collapsing whitespace so
    // " - " separators collapse into single spaces) so they match.
    const spaced = key.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    const es = NAME_ES[key] || NAME_ES[spaced] || NAME_ES[spaced.replace(/ /g, '-')];
    if (es && !/[áéíóúñü]/i.test(ex.name)) {
      return { ...ex, name: es };
    }
    return ex;
  });
}

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
    .replace(/[^a-záéíóúüñ0-9\s-]/g, ' ')  // keep only letters, digits and spaces
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

  for (const [pk, entry] of wgerExercisesMap) {
    const enName = entry.en?.name;
    const esName = entry.es?.name;
    const matchName = enName || esName || '';
    if (!matchName) continue;

    const norm = normalizeName(matchName);
    const slug = slugify(matchName);

    wgerByName.set(norm, { pk, entry });
    wgerBySlug.set(slug, { pk, entry });

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
    // EXACT MATCHING ONLY — fuzzy word-overlap produced false positives
    // (e.g. "Alternating Renegade Row" was matched to a different exercise
    // "Alternating High Cable Row", corrupting names and images). Exact
    // matches are guaranteed to be the same exercise; everything else stays
    // free-db-only and keeps its original name + image.
    if (!freeDbEx || !freeDbEx.name) return null;
    const norm = normalizeName(freeDbEx.name);
    const slug = slugify(freeDbEx.name);

    // Exact match by normalized name (covers slugs too)
    return wgerByName.get(norm) || wgerBySlug.get(slug) || null;
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
      const eq = (freeEx.equipment || '').toLowerCase();
      const equipment = EQUIPMENT_ES[eq] || wgerEq || 'ninguno';

      // Difficulty / cognitive load / load type from free-exercise-db schema
      const level = (freeEx.level || 'beginner').toLowerCase();
      const cat = (freeEx.category || '').toLowerCase();
      const difficulty = LEVEL_DIFFICULTY[level] || 2;
      const cognitiveLoad = LEVEL_COG_LOAD[level] || 'low';
      const loadType = CATEGORY_LOAD_TYPE[cat] || 'reps';

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
        difficulty,
        equipment,
        instructions: description || (Array.isArray(freeEx.instructions) ? freeEx.instructions.join(' ') : ''),
        instructionsSteps: stepsToUse.length > 0 ? stepsToUse : undefined,
        load_type: loadType,
        cognitive_load: cognitiveLoad,
        emoji: muscleEmoji(primaryMuscles) || freeEx.emoji || '🏃',
        cue: firstStep,
        category: CATEGORY_ES[catName] || CATEGORY_ES_FREEDB[cat] || cat || 'fuerza',
        force: freeEx.force || null,
        mechanic: freeEx.mechanic || null,
        images: (freeEx.images || []).filter(Boolean).length > 0 ? freeEx.images : undefined,
        video_url: freeEx.video_url || undefined,
      });
      matchLog.push(`✅ Matched: "${freeEx.name}" → "${name}"`);
    } else {
      // FREE-DB ONLY
      const level = (freeEx.level || 'beginner').toLowerCase();
      const cat = (freeEx.category || '').toLowerCase();
      const eq = (freeEx.equipment || '').toLowerCase();
      merged.push({
        id: freeEx.id || slugify(freeEx.name),
        name: freeEx.name,
        muscle: firstMuscleGroup(freeEx.primaryMuscles || []) || freeEx.muscle || 'full_body',
        primaryMuscles: (freeEx.primaryMuscles || []).filter(Boolean).map(translateMuscleName),
        secondaryMuscles: (freeEx.secondaryMuscles || []).filter(Boolean).map(translateMuscleName),
        difficulty: LEVEL_DIFFICULTY[level] || 2,
        equipment: EQUIPMENT_ES[eq] || eq || 'ninguno',
        instructions: Array.isArray(freeEx.instructions) ? freeEx.instructions.join(' ') : (freeEx.instructions || ''),
        instructionsSteps: (freeEx.instructions || []).length > 0 ? freeEx.instructions : undefined,
        load_type: CATEGORY_LOAD_TYPE[cat] || 'reps',
        cognitive_load: LEVEL_COG_LOAD[level] || 'low',
        emoji: muscleEmoji((freeEx.primaryMuscles || [])) || '🏃',
        cue: (freeEx.instructions || [])[0] || '',
        category: CATEGORY_ES_FREEDB[cat] || cat || 'fuerza',
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

    const base = entry.base;
    const es = entry.es;
    const en = entry.en;

    // Only keep wger-only exercises that have a Spanish translation.
    // English-only wger entries mostly duplicate free-exercise-db without
    // adding images or value, and would bloat the catalog with image-less
    // entries (bad UX when the app showcases exercise images).
    if (!es) continue;
    wgerOnlyCount++;

    const name = es.name;
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
      // Keep the best version: Spanish name wins, then the one with images
      const existing = deduped[seen.get(key)];
      const existingHasEs = /[áéíóúñü]/i.test(existing.name);
      const newHasEs = /[áéíóúñü]/i.test(ex.name);
      const existingHasImg = !!(existing.images && existing.images.length > 0);
      const newHasImg = !!(ex.images && ex.images.length > 0);
      if ((newHasEs && !existingHasEs) || (newHasImg && !existingHasImg)) {
        deduped[seen.get(key)] = ex;
      }
      dupsRemoved++;
    }
  }

  // ─── Guarantee unique ids (saved workouts reference exercise_id) ───
  const seenIds = new Map(); // id -> index
  const idDeduped = [];
  let idDups = 0;
  for (const ex of deduped) {
    const idKey = ex.id || normalizeName(ex.name);
    if (!seenIds.has(idKey)) {
      seenIds.set(idKey, idDeduped.length);
      idDeduped.push(ex);
    } else {
      const existing = idDeduped[seenIds.get(idKey)];
      // Prefer the entry with images (free-db) over a wger-only duplicate
      const existingHasImg = !!(existing.images && existing.images.length > 0);
      const newHasImg = !!(ex.images && ex.images.length > 0);
      if (newHasImg && !existingHasImg) {
        idDeduped[seenIds.get(idKey)] = ex;
      }
      idDups++;
    }
  }
  if (idDups > 0) console.log(`   ⚠️  Id duplicates removed: ${idDups}`);

  console.log(`   ⚠️  Duplicates removed: ${dupsRemoved}`);

  // ─── Apply curated Spanish names ───
  const finalCatalog = applySpanishNames(idDeduped);
  const finalSpanish = finalCatalog.filter(e => /[áéíóúñü]/i.test(e.name)).length;
  console.log(`   🎯 Final catalog: ${finalCatalog.length} exercises (🇪🇸 ${finalSpanish} Spanish names)`);

  // ─── Write JSON ───
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(finalCatalog), 'utf-8');
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
//  Exercises: ${finalCatalog.length}
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
