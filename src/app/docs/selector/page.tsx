'use client';

/**
 * CHISPA-UX-002 · Spec vivo del selector de ejercicios.
 *
 * Documento de ingeniería interactivo: diagnostica el "antes", documenta la
 * arquitectura por capas, la máquina de estados y el motor de relevancia —
 * y lo hace ejecutando el MISMO motor de producción (selector-engine.ts)
 * sobre el catálogo real. El simulador no es una demo: es el código vivo.
 */

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ChevronDown,
  Copy,
  Check,
  SlidersHorizontal,
  Eye,
  Cpu,
  Flag,
  Mic,
  Gauge,
  Feather,
  Target,
  Wand,
  Database,
  Inbox,
  Edit,
  Play,
  Zap,
  Dumbbell,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDown,
  MoveHorizontal,
  Circle,
  PersonStanding,
  ShieldCheck,
  List,
  Brain,
  Box,
  Watch,
  Puzzle,
  type LucideIcon,
} from 'lucide-react';
import type { Exercise } from '@/types';
import {
  PATTERN_LABEL,
  DESIRED_PATTERNS,
  rankSuggestions,
  GAP_BONUS,
  SUFFICIENT,
  type Pattern,
  type SelectorFocus,
  type ScoredExercise,
} from '@/lib/agents/selector-engine';
import { getExercises } from '@/lib/utils/use-exercises';
import { FOCUS_LABELS } from '@/lib/utils/constants';
import { useStore } from '@/lib/store';
import { supabaseSync } from '@/lib/sync/supabase-sync';
import { logError } from '@/lib/utils/logger';

// ─── Paleta y tipografía ───────────────────────────────────────────────────

const AMBER = '#ffb454';
const TEAL = '#34d399';
const VIOLET = '#a78bfa';
const BLUE = '#4CC9F0';
const RED = '#f87171';
const WARN = '#fbbf24';

const DISP = 'font-[family-name:var(--font-bricolage)]';
const SERIF = 'font-[family-name:var(--font-fraunces)]';

const PATTERN_ICON: Record<Pattern, LucideIcon> = {
  push: ArrowUpRight,
  pull: ArrowDownLeft,
  squat: ArrowDown,
  hinge: MoveHorizontal,
  core: Circle,
  cardio: Activity,
  mobility: PersonStanding,
  arms: Dumbbell,
};

const PATTERN_COLOR: Record<Pattern, string> = {
  push: BLUE,
  pull: VIOLET,
  squat: TEAL,
  hinge: WARN,
  core: AMBER,
  cardio: RED,
  mobility: BLUE,
  arms: '#f472b6',
};

const FOCUS_ICON: Record<SelectorFocus, LucideIcon> = {
  full: Dumbbell,
  upper: ArrowUpRight,
  lower: ArrowDown,
  core: Activity,
};

/** Versiones EN de los labels (los de la app viven en ES). */
const FOCUS_LABELS_EN: Record<SelectorFocus, string> = {
  full: 'Full body',
  upper: 'Upper body',
  lower: 'Lower body',
  core: 'Core & cardio',
};

const PATTERN_LABEL_EN: Record<Pattern, string> = {
  push: 'Push',
  pull: 'Pull',
  squat: 'Squat',
  hinge: 'Hinge',
  core: 'Core',
  cardio: 'Cardio',
  mobility: 'Mobility',
  arms: 'Arms',
};

const FOCUS_ORDER: SelectorFocus[] = ['full', 'upper', 'lower', 'core'];

// ─── Datos del documento ───────────────────────────────────────────────────

const SECTIONS: { id: string; n: string; t: { es: string; en: string } }[] = [
  { id: 's00', n: '00', t: { es: 'La tesis', en: 'The thesis' } },
  { id: 's01', n: '01', t: { es: 'Diagnóstico', en: 'Diagnosis' } },
  { id: 's02', n: '02', t: { es: 'Ocho principios', en: 'Eight principles' } },
  { id: 's03', n: '03', t: { es: 'Arquitectura', en: 'Architecture' } },
  { id: 's04', n: '04', t: { es: 'Workflow', en: 'Workflow' } },
  { id: 's05', n: '05', t: { es: 'Motor de relevancia', en: 'Relevance engine' } },
  { id: 's06', n: '06', t: { es: 'Integración', en: 'Integration' } },
  { id: 's07', n: '07', t: { es: 'Stack & roadmap', en: 'Stack & roadmap' } },
  { id: 's08', n: '08', t: { es: 'Manifiesto', en: 'Manifesto' } },
];

const WOUND: { k: string; before: { es: string; en: string }; after: { es: string; en: string }; d: { es: string; en: string } }[] = [
  { k: 'entrada', before: { es: 'Una sola', en: 'One way' }, after: { es: 'Dos modos', en: 'Two modes' }, d: { es: 'Buscar en 800+ items era parálisis; hoy Guíame propone 4 de un toque y "Yo elijo" da andamios.', en: 'Searching 800+ items was paralysis; today Guide Me offers 4 one-tap picks and “I choose” scaffolds the rest.' } },
  { k: 'visual', before: { es: 'Glifos', en: 'Glyphs' }, after: { es: 'Foto real', en: 'Real photo' }, d: { es: 'Iconos SVG inline en el grid; hoy foto con dos ángulos + marca por músculo de respaldo.', en: 'Inline SVG icons in the grid; today a photo with two angles + a muscle-mark fallback.' } },
  { k: 'feedback', before: { es: 'Mudo', en: 'Silent' }, after: { es: 'Mapa vivo', en: 'Live map' }, d: { es: 'Nadie decía si la rutina quedaba coja; hoy el balance de patrones es un mapa tocable.', en: 'Nobody told you if the routine was lopsided; today the pattern balance is a tappable map.' } },
  { k: 'cierre', before: { es: 'Todo-o-nada', en: 'All-or-nothing' }, after: { es: 'Suficiencia', en: 'Sufficiency' }, d: { es: '"~36 min descanso" asustaba; hoy un medidor dice "ya está bien" y el botón brilla solo.', en: '“~36 min rest” scared you; today a meter says “good enough” and the button glows on its own.' } },
  { k: 'números', before: { es: 'Culpa', en: 'Guilt' }, after: { es: 'Informan', en: 'They inform' }, d: { es: 'Series y descanso como castigo; hoy duración total y score de dopamina, sin moralizar.', en: 'Sets and rest as punishment; today total duration and a dopamine score, without moralizing.' } },
];

const DIAGNOSIS: { sev: string; sevColor: string; h: { es: string; en: string }; c: { es: string; en: string }; s: { es: string; en: string } }[] = [
  { sev: 'ROTO', sevColor: RED, h: { es: 'La entrada era decidir desde cero.', en: 'The entry point forced deciding from scratch.' }, c: { es: 'En "Elige ejercicios" el camino empezaba en un buscador sobre cientos de items; el grid "Toque para agregar" solo enseñaba los 12 primeros del enfoque.', en: 'In “Pick exercises” the path started at a search box over hundreds of items; the “Tap to add” grid only showed the first 12 of the focus.' }, s: { es: 'Un lienzo en blanco es una pared para un cerebro con TDAH: task initiation imposible.', en: 'A blank canvas is a wall for an ADHD brain: task initiation becomes impossible.' } },
  { sev: 'ALTO', sevColor: AMBER, h: { es: 'Sin andamiaje de decisión.', en: 'No decision scaffolding.' }, c: { es: 'Solo existía el filtro por grupo muscular del enfoque; nada de patrones de movimiento ni reducción progresiva del set.', en: 'Only the focus muscle-group filter existed; no movement patterns, no progressive set reduction.' }, s: { es: 'Sobrecarga de elección: demasiado a la vez, sin camino.', en: 'Choice overload: too much at once, with no path.' } },
  { sev: 'ALTO', sevColor: AMBER, h: { es: 'Glifos donde hace falta reconocer.', en: 'Glyphs where recognition is what matters.' }, c: { es: 'El grid de agregado usaba iconos SVG inline; la foto real solo aparecía al expandir la tarjeta en el catálogo.', en: 'The add grid used inline SVG icons; the real photo only appeared when expanding the catalog card.' }, s: { es: 'El ojo decide en ~200 ms con foto; con un glifo genérico no decide nada.', en: 'The eye decides in ~200 ms with a photo; with a generic glyph it decides nothing.' } },
  { sev: 'MEDIO', sevColor: BLUE, h: { es: 'Sin feedback de balance ni permiso para parar.', en: 'No balance feedback and no permission to stop.' }, c: { es: 'El coach determinista, sello de CHISPA, no aparecía en esta pantalla: nada señalaba los huecos ni cuándo ya estaba bien.', en: 'The deterministic coach, CHISPA’s hallmark, was absent here: nothing flagged the gaps or when it was good enough.' }, s: { es: 'Una rutina toda de core parece válida; nadie señala el hueco ni da permiso para acabar.', en: 'An all-core routine looks valid; nobody flags the gap or gives permission to finish.' } },
  { sev: 'MEDIO', sevColor: BLUE, h: { es: 'Resumen que asusta y no informa.', en: 'A summary that scares instead of informing.' }, c: { es: 'El badge mostraba "{n} series · ~{m} min descanso" — el descanso como castigo y sin duración total ni score de dopamina.', en: 'The badge showed “{n} sets · ~{m} min rest” — rest as punishment, with no total duration or dopamine score.' }, s: { es: '"~36 min descanso" suena a sanción; se activa el todo-o-nada.', en: '“~36 min rest” sounds like a penalty; it triggers all-or-nothing thinking.' } },
];

const PRINCIPLES: {
  no: string; color: string; icon: LucideIcon; t: { es: string; en: string }; cog: { es: string; en: string }; d: { es: React.ReactNode; en: React.ReactNode }; impl: { es: string; en: string }; serve: { es: string; en: string };
}[] = [
  {
    no: '01', color: AMBER, icon: Feather,
    t: { es: 'Nunca un lienzo en blanco', en: 'Never a blank canvas' },
    cog: { es: 'parálisis de arranque / task initiation', en: 'start paralysis / task initiation' },
    d: { es: <>El modo <b>Guíame</b> propone cuatro ejercicios de un toque, ordenados por el score de relevancia y por lo que la rutina deja cojo, cada uno con su razón en lenguaje humano. El usuario <b>empieza sin pensar nada</b>; pensar queda para después, opcional.</>, en: <><b>Guide Me</b> proposes four one-tap exercises, ranked by the relevance score and by what the routine is missing, each with its reason in plain language. The user <b>starts without thinking</b>; thinking comes later, optional.</> },
    impl: { es: 'rankSuggestions(pool, focus, missing, 4) + razón por plantilla tmpl_why_*', en: 'rankSuggestions(pool, focus, missing, 4) + template reason tmpl_why_*' },
    serve: { es: 'capa 01 · relevancia', en: 'layer 01 · relevance' },
  },
  {
    no: '02', color: TEAL, icon: SlidersHorizontal,
    t: { es: 'Andamios, no muros', en: 'Scaffolding, not walls' },
    cog: { es: 'sobrecarga de elección / working memory', en: 'choice overload / working memory' },
    d: { es: <>En el modo <b>Yo elijo</b>, chips por patrón de movimiento y por grupo muscular reducen cientos de ejercicios a unos pocos relevantes con un toque. Buscar existe, pero como <b>opción</b>, no como única puerta — y hay voz para manos ocupadas.</>, en: <>In <b>I choose</b> mode, chips by movement pattern and muscle group shrink hundreds of exercises to a few relevant ones with a tap. Search exists, but as an <b>option</b>, not the only door — and there is voice for busy hands.</> },
    impl: { es: 'índice invertido pattern→ex[] (buildPatternIndex) ∩ músculo ∩ equipo ∩ query', en: 'inverted index pattern→ex[] (buildPatternIndex) ∩ muscle ∩ equipment ∩ query' },
    serve: { es: 'capa 03 · filtrado', en: 'layer 03 · filtering' },
  },
  {
    no: '03', color: VIOLET, icon: Eye,
    t: { es: 'Ver antes que leer', en: 'See before you read' },
    cog: { es: 'coste de reconocimiento vs. recuerdo', en: 'recognition vs. recall cost' },
    d: { es: <>Foto real con <b>dos ángulos</b> que alternan al pasar el dedo; el ojo decide en ~200 ms y el texto solo confirma. Si la imagen no resuelve, el respaldo no es un icono roto sino una <b>marca por músculo</b>: inicial grande con el color del grupo.</>, en: <>A real photo with <b>two angles</b> that swap as you swipe; the eye decides in ~200 ms and the text only confirms. If the image fails, the fallback is not a broken icon but a <b>muscle mark</b>: a big initial in the group’s color.</> },
    impl: { es: 'getExerciseImageUrls() + fallback tipográfico determinista por muscle', en: 'getExerciseImageUrls() + deterministic typographic fallback per muscle' },
    serve: { es: 'capa 05 · assets', en: 'layer 05 · assets' },
  },
  {
    no: '04', color: AMBER, icon: Cpu,
    t: { es: 'Un mapa, no un juez', en: 'A map, not a judge' },
    cog: { es: 'rechazo sensible al fallo / RSD', en: 'rejection sensitivity / RSD' },
    d: { es: <>El coach pinta en verde lo cubierto y en ámbar lo que falta — y lo que falta es <b>tocable</b>: al pulsarlo, el catálogo se filtra por ese patrón y hace scroll hasta él. El sistema señala huecos como quien lee un mapa, nunca como quien regaña.</>, en: <>The coach paints covered patterns green and missing ones amber — and what is missing is <b>tappable</b>: tapping it filters the catalog by that pattern and scrolls to it. The system flags gaps the way you read a map, never like a scolding parent.</> },
    impl: { es: 'desired(focus) \\ present(routine) → chip ámbar dispara setPatternFilter(p)', en: 'desired(focus) \\ present(routine) → amber chip fires setPatternFilter(p)' },
    serve: { es: 'capa 02 · coach de balance', en: 'layer 02 · balance coach' },
  },
  {
    no: '05', color: TEAL, icon: Flag,
    t: { es: 'El permiso para parar', en: 'Permission to stop' },
    cog: { es: 'pensamiento todo-o-nada / perfeccionismo', en: 'all-or-nothing thinking / perfectionism' },
    d: { es: <>Un medidor de <b>suficiencia</b> siempre visible dice, sin culpa, cuándo ya está bien. El botón de empezar existe con un ejercicio, pero <b>brilla solo</b> (glow-pulse) al cruzar el umbral. Apaga el &ldquo;una serie más&rdquo; que roba la tarde.</>, en: <>An always-visible <b>sufficiency</b> meter says, without guilt, when it is good enough. The start button exists with one exercise, but it only <b>glows</b> (glow-pulse) once you cross the threshold. It silences the “one more set” that steals the afternoon.</> },
    impl: { es: `isSufficient(): ex≥${SUFFICIENT.minExercises} ∧ cubiertos≥min(3,|D|) ∧ ${SUFFICIENT.minDuration}≤min≤${SUFFICIENT.maxDuration}`, en: `isSufficient(): ex≥${SUFFICIENT.minExercises} ∧ covered≥min(3,|D|) ∧ ${SUFFICIENT.minDuration}≤min≤${SUFFICIENT.maxDuration}` },
    serve: { es: 'capa 03 · suficiencia', en: 'layer 03 · sufficiency' },
  },
  {
    no: '06', color: AMBER, icon: Zap,
    t: { es: 'Que se note', en: 'Make it visible' },
    cog: { es: 'baja sensibilidad a la propia agencia', en: 'low sensitivity to one’s own agency' },
    d: { es: <>Cada &ldquo;añadir&rdquo; vuela una <b>chispa</b> desde el punto tocado hasta el contador de métricas, y la fila nueva entra con un destello. La acción tiene una consecuencia que se ve y se siente; el cerebro registra &ldquo;yo hice esto&rdquo;.</>, en: <>Every “add” flies a <b>spark</b> from the tapped point to the metrics counter, and the new row slides in with a flash. The action has a consequence you can see and feel; the brain registers “I did this”.</> },
    impl: { es: 'partícula con framer-motion (fixed, anima del rect del botón al rect del contador)', en: 'framer-motion particle (fixed, animates from button rect to counter rect)' },
    serve: { es: 'capa UI · feedback', en: 'UI layer · feedback' },
  },
  {
    no: '07', color: VIOLET, icon: Mic,
    t: { es: 'Manos ocupadas, boca libre', en: 'Busy hands, free voice' },
    cog: { es: 'fricción motora en momentos de baja activación', en: 'motor friction in low-arousal moments' },
    d: { es: <>Añade por voz (&ldquo;añade sentadilla&rdquo;) para cuando el dedo no quiere pero la intención sí está. Si el reconocimiento no ubica el término, cae al <b>top-1 de relevancia</b> en vez de fallar en seco.</>, en: <>Add by voice (“add squat”) for when the finger refuses but the intention is there. If recognition cannot place the term, it falls back to the <b>top-1 relevance</b> pick instead of failing flat.</> },
    impl: { es: 'Web Speech API + matching por token sobre el pool; fallback a rankSuggestions(…,1)', en: 'Web Speech API + token matching over the pool; fallback to rankSuggestions(…,1)' },
    serve: { es: 'capa UI · voz', en: 'UI layer · voice' },
  },
  {
    no: '08', color: BLUE, icon: Gauge,
    t: { es: 'Números que no mienten ni asustan', en: 'Numbers that neither lie nor scare' },
    cog: { es: 'métricas que activan culpa o ansiedad', en: 'metrics that trigger guilt or anxiety' },
    d: { es: <>Duración <b>total</b> (trabajo + descanso), número de ejercicios y score de dopamina. Nada de &ldquo;~36 min de descanso&rdquo; que suena a castigo. El dato informa; no moraliza.</>, en: <>Total <b>duration</b> (work + rest), exercise count and dopamine score. Nothing like “~36 min of rest” that sounds like a punishment. Data informs; it does not moralize.</> },
    impl: { es: 'Σ sets·(reps·3 + rest) para trabajo+descanso · dopa = f(patrones, gancho, n)', en: 'Σ sets·(reps·3 + rest) for work+rest · dopa = f(patterns, hook, n)' },
    serve: { es: 'capa 01 · métricas', en: 'layer 01 · metrics' },
  },
];

const LAYERS: {
  color: string; icon: LucideIcon; t: { es: string; en: string }; sub: { es: string; en: string }; pct: string; d: { es: React.ReactNode; en: React.ReactNode }; tags: { es: string; en: string }[];
}[] = [
  {
    color: TEAL, icon: Target, t: { es: 'Relevancia + huecos', en: 'Relevance + gaps' }, sub: { es: 'determinista · selector-engine.ts', en: 'deterministic · selector-engine.ts' }, pct: '~40%',
    d: { es: <>Ordena el catálogo por <b>afinidad al enfoque</b> y empuja arriba los ejercicios que <b>cubren un patrón ausente</b> (bonus +{GAP_BONUS} deliberadamente dominante). Es la base del modo Guíame y del orden por defecto del catálogo. Formula transparente: <code>score = afinidad + bonus_hueco + gancho(carga)</code>.</>, en: <>Ranks the catalog by <b>focus affinity</b> and pushes up exercises that <b>cover a missing pattern</b> (a deliberately dominant +{GAP_BONUS} bonus). It is the backbone of Guide Me mode and the catalog’s default order. Transparent formula: <code>score = affinity + gap_bonus + hook(cognitive_load)</code>.</> },
    tags: [{ es: 'top-k', en: 'top-k' }, { es: 'afinidad(focus)', en: 'affinity(focus)' }, { es: 'bonus hueco', en: 'gap bonus' }, { es: 'gancho ADHD', en: 'ADHD hook' }],
  },
  {
    color: TEAL, icon: Cpu, t: { es: 'Coach de balance', en: 'Balance coach' }, sub: { es: 'reglas puras · deriveBalance()', en: 'pure rules · deriveBalance()' }, pct: '~25%',
    d: { es: <>Recalcula en cada toque los <b>patrones cubiertos</b>, la <b>duración total</b> (trabajo + descanso) y el <b>score de dopamina</b>, y deriva los huecos como chips ámbar tocables. No aprende: aplica invariantes del dominio.</>, en: <>Recomputes on every tap the <b>covered patterns</b>, <b>total duration</b> (work + rest) and the <b>dopamine score</b>, deriving gaps as tappable amber chips. It does not learn: it applies domain invariants.</> },
    tags: [{ es: 'present', en: 'present' }, { es: 'missing', en: 'missing' }, { es: 'durationMin', en: 'durationMin' }, { es: 'dopa 0–100', en: 'dopa 0–100' }],
  },
  {
    color: TEAL, icon: Flag, t: { es: 'Suficiencia + filtrado', en: 'Sufficiency + filtering' }, sub: { es: 'máquina de estados · isSufficient()', en: 'state machine · isSufficient()' }, pct: '~15%',
    d: { es: <>Evalúa el umbral de &ldquo;ya está bien&rdquo; y gobierna el brillo del CTA; además resuelve la intersección de filtros (patrón ∩ músculo ∩ equipo ∩ query) sobre índices invertidos. Todo en O(n), sin red y sin modelo.</>, en: <>Evaluates the “good enough” threshold and drives the CTA glow; it also resolves the filter intersection (pattern ∩ muscle ∩ equipment ∩ query) over inverted indexes. All in O(n), no network, no model.</> },
    tags: [{ es: `ex≥${SUFFICIENT.minExercises}`, en: `ex≥${SUFFICIENT.minExercises}` }, { es: `cubiertos≥min(3,|D|)`, en: `covered≥min(3,|D|)` }, { es: `${SUFFICIENT.minDuration}≤min≤${SUFFICIENT.maxDuration}`, en: `${SUFFICIENT.minDuration}≤min≤${SUFFICIENT.maxDuration}` }],
  },
  {
    color: VIOLET, icon: Wand, t: { es: 'Razones de plantilla', en: 'Template reasons' }, sub: { es: 'encadenadas · sin texto libre', en: 'chained · no free text' }, pct: '~15%',
    d: { es: <>El <b>&ldquo;por qué&rdquo;</b> de cada sugerencia se redacta rellenando plantillas deterministas (<code>tmpl_why_*</code>) que el UI traduce. En CHISPA el LLM (CoachAgent) <b>solo comunica</b> y nunca toca números: si cayera por completo, el selector seguiría al 100 %.</>, en: <>The <b>“why”</b> of each suggestion is written by filling deterministic templates (<code>tmpl_why_*</code>) that the UI translates. In CHISPA the LLM (CoachAgent) <b>only communicates</b> and never touches numbers: if it failed entirely, the selector would keep working 100%.</> },
    tags: [{ es: 'tmpl_why_gap', en: 'tmpl_why_gap' }, { es: 'tmpl_why_affinity', en: 'tmpl_why_affinity' }, { es: 'tmpl_why_easy', en: 'tmpl_why_easy' }, { es: 'i18n', en: 'i18n' }],
  },
  {
    color: BLUE, icon: Database, t: { es: 'Assets + persistencia', en: 'Assets + persistence' }, sub: { es: 'local-first · exercise-visuals.tsx', en: 'local-first · exercise-visuals.tsx' }, pct: '~5%',
    d: { es: <>Imágenes de <b>free-exercise-db</b> (dos ángulos) con marca por músculo como respaldo tipográfico; rutinas y preferencias en <b>Zustand persist</b> (localStorage) con sync opcional a Supabase. El equipo del onboarding filtra el pool; el enfoque filtra la relevancia.</>, en: <>Images from <b>free-exercise-db</b> (two angles) with a muscle mark as typographic fallback; routines and preferences in <b>Zustand persist</b> (localStorage) with optional Supabase sync. Onboarding equipment filters the pool; focus filters relevance.</> },
    tags: [{ es: 'free-exercise-db', en: 'free-exercise-db' }, { es: 'Zustand persist', en: 'Zustand persist' }, { es: 'offline-first', en: 'offline-first' }, { es: 'Supabase sync', en: 'Supabase sync' }],
  },
];

const SM_STATES: { id: string; icon: LucideIcon; l: { es: string; en: string }; ui: { es: React.ReactNode; en: React.ReactNode }; algo: { es: React.ReactNode; en: React.ReactNode }; go: { es: React.ReactNode; en: React.ReactNode } }[] = [
  {
    id: 'vacío', icon: Inbox, l: { es: 'Vacío', en: 'Empty' },
    ui: { es: <>Medidor en &ldquo;toca para empezar · sin prisa&rdquo;. El modo <b>Guíame</b> ya está precargado con el top-4; el catálogo, listo detrás.</>, en: <>Meter reads &ldquo;tap to start · no rush&rdquo;. <b>Guide Me</b> is already preloaded with the top-4; the catalog waits behind.</> },
    algo: { es: <>Score calculado con <code>rankSuggestions(pool, focus, DESIRED_PATTERNS[focus])</code>. <code>present=∅</code>, <code>missing=desired</code>, <code>sufficient=false</code>.</>, en: <>Score computed with <code>rankSuggestions(pool, focus, DESIRED_PATTERNS[focus])</code>. <code>present=∅</code>, <code>missing=desired</code>, <code>sufficient=false</code>.</> },
    go: { es: 'Entra siempre ofreciendo Guíame. Tocar un + o "Añadir los 4" → Construyendo.', en: 'Always enters offering Guide Me. Tapping + or “Add all 4” → Building.' },
  },
  {
    id: 'guiado', icon: Wand, l: { es: 'Guiado', en: 'Guided' },
    ui: { es: <>Cuatro tarjetas con foto de dos ángulos y su <b>&ldquo;por qué&rdquo;</b> (&ldquo;cubre tirón · te faltaba&rdquo;). Botón &ldquo;añadir los 4&rdquo;.</>, en: <>Four cards with two-angle photos and their <b>“why”</b> (“covers pull · you were missing it”). An “add all 4” button.</> },
    algo: { es: <>top-4 por score; razón por plantilla <code>tmpl_why_*</code> que el UI traduce. El bonus por hueco completa la rutina antes que repetirla.</>, en: <>top-4 by score; template reason <code>tmpl_why_*</code> the UI translates. The gap bonus completes the routine before repeating it.</> },
    go: { es: 'Añadir uno o los cuatro → Construyendo. El usuario nunca ve el catálogo vacío.', en: 'Add one or all four → Building. The user never sees an empty catalog.' },
  },
  {
    id: 'construyendo', icon: Edit, l: { es: 'Construyendo', en: 'Building' },
    ui: { es: <>Catálogo filtrable + lista &ldquo;tu rutina&rdquo; + mapa de balance. Cada toque recalcula todo al instante.</>, en: <>Filterable catalog + “your routine” list + balance map. Every tap recomputes everything instantly.</> },
    algo: { es: <>En cada mutación: <code>deriveBalance()</code> → <code>present/missing/durationMin/dopa</code>. Evalúa <code>isSufficient()</code>.</>, en: <>On every mutation: <code>deriveBalance()</code> → <code>present/missing/durationMin/dopa</code>. Evaluates <code>isSufficient()</code>.</> },
    go: { es: 'Cruzar el umbral → Suficiente. Seguir sin cruzarlo se queda aquí, sin culpa.', en: 'Crossing the threshold → Sufficient. Not crossing it stays here, without guilt.' },
  },
  {
    id: 'suficiente', icon: Flag, l: { es: 'Suficiente', en: 'Sufficient' },
    ui: { es: <>Medidor verde: &ldquo;ya está bien · empieza o sigue, tú mandas&rdquo;. El botón <b>brilla y se anima</b> (glow-pulse).</>, en: <>Green meter: &ldquo;good enough · start or keep going, your call&rdquo;. The button <b>glows and animates</b> (glow-pulse).</> },
    algo: { es: <><code>sufficient=true</code>; se habilita el estado live del CTA. El balance puede estar completo o no.</>, en: <><code>sufficient=true</code>; the CTA live state unlocks. The balance may or may not be complete.</> },
    go: { es: 'Pulsar empezar → Listo. Añadir más vuelve a Construyendo (reversible).', en: 'Tap start → Ready. Adding more goes back to Building (reversible).' },
  },
  {
    id: 'listo', icon: Play, l: { es: 'Listo', en: 'Ready' },
    ui: { es: <>Lanza el player con la rutina tal cual, o guarda la plantilla a Mis rutinas.</>, en: <>Launches the player with the routine as-is, or saves the template to My routines.</> },
    algo: { es: <>Serializa <code>{'{ focus, exercises[] }'}</code> al store (Zustand persist) y dispara el workflow de workout o de guardado.</>, en: <>Serializes <code>{'{ focus, exercises[] }'}</code> to the store (Zustand persist) and fires the workout or save workflow.</> },
    go: { es: 'Fin del selector. El player hereda assets, orden y foco sin regenerar nada.', en: 'End of the selector. The player inherits assets, order and focus without regenerating anything.' },
  },
];

const INTEGRATIONS: { fromK: { es: string; en: string }; fromT: { es: string; en: string }; fromD: { es: string; en: string }; toK: { es: string; en: string }; toT: { es: string; en: string }; toD: { es: string; en: string } }[] = [
  { fromK: { es: 'onboarding · equipo', en: 'onboarding · equipment' }, fromT: { es: 'Equipo disponible', en: 'Available equipment' }, fromD: { es: 'ninguno · mancuernas · gimnasio', en: 'none · dumbbells · gym' }, toK: { es: 'selector · pool', en: 'selector · pool' }, toT: { es: 'Filtro de catálogo', en: 'Catalog filter' }, toD: { es: 'matchesEquipment() atenúa o excluye; el grid nunca miente.', en: 'matchesEquipment() dims or excludes; the grid never lies.' } },
  { fromK: { es: 'onboarding / home · enfoque', en: 'onboarding / home · focus' }, fromT: { es: 'Focus elegido', en: 'Chosen focus' }, fromD: { es: 'full · upper · lower · core', en: 'full · upper · lower · core' }, toK: { es: 'selector · relevancia', en: 'selector · relevance' }, toT: { es: 'Patrón deseado + huecos', en: 'Desired pattern + gaps' }, toD: { es: 'DESIRED_PATTERNS + AFFINITY definen el top-4 y el mapa de balance.', en: 'DESIRED_PATTERNS + AFFINITY define the top-4 and the balance map.' } },
  { fromK: { es: 'selector · rutina', en: 'selector · routine' }, fromT: { es: 'Guardar plantilla', en: 'Save template' }, fromD: { es: 'Serializa foco + items al store local', en: 'Serializes focus + items to the local store' }, toK: { es: 'home · Mis rutinas', en: 'home · My routines' }, toT: { es: 'Cargar como plan', en: 'Load as plan' }, toD: { es: 'workoutTemplates → plan del día sin regenerar.', en: 'workoutTemplates → plan of the day without regenerating.' } },
  { fromK: { es: 'selector · suficiente', en: 'selector · sufficient' }, fromT: { es: 'Empezar ahora', en: 'Start now' }, fromD: { es: 'Lanza el player con la rutina tal cual', en: 'Launches the player with the routine as-is' }, toK: { es: 'workout · player', en: 'workout · player' }, toT: { es: 'Foto + ángulos + timer', en: 'Photo + angles + timer' }, toD: { es: 'Los mismos assets y el mismo orden viajan al entrenamiento.', en: 'The same assets and order travel into the workout.' } },
  { fromK: { es: 'selector · cada toque', en: 'selector · every tap' }, fromT: { es: 'Trazabilidad', en: 'Traceability' }, fromD: { es: 'logEvent + twin-updater registran la interacción', en: 'logEvent + twin-updater record the interaction' }, toK: { es: 'sistema · pipeline', en: 'system · pipeline' }, toT: { es: 'El twin aprende', en: 'The twin learns' }, toD: { es: 'ex_progress (easy + last_rpe) alimenta la afinidad entrenada del selector en tiempo real.', en: 'ex_progress (easy + last_rpe) feeds the selector’s trained affinity in real time.' } },
];

const STACK: { color: string; icon: LucideIcon; n: { es: string; en: string }; src: string; role: { es: string; en: string }; d: { es: React.ReactNode; en: React.ReactNode }; tags: { es: string; en: string }[] }[] = [
  { color: VIOLET, icon: Brain, n: { es: 'Motor determinista', en: 'Deterministic engine' }, src: 'selector-engine.ts + decision-engine.ts', role: { es: 'capas 01–03 · el 80%', en: 'layers 01–03 · the 80%' }, d: { es: <>Toda la lógica de relevancia, balance y suficiencia es <b>código puro, auditable y sin alucinaciones</b>: el mismo módulo que corre en el simulador de esta página. Sin red, sin modelo, O(n).</>, en: <>All relevance, balance and sufficiency logic is <b>pure, auditable, hallucination-free code</b>: the same module running in this page’s simulator. No network, no model, O(n).</> }, tags: [{ es: 'TypeScript puro', en: 'Pure TypeScript' }, { es: 'O(n)', en: 'O(n)' }, { es: 'testeado (24 tests)', en: 'tested (24 tests)' }] },
  { color: TEAL, icon: Box, n: { es: 'UI + i18n', en: 'UI + i18n' }, src: 'exercise-selector.tsx', role: { es: 'modos · balance · voz', en: 'modes · balance · voice' }, d: { es: <>React 19 + Tailwind + Framer Motion materializan los dos modos, el mapa de balance, el medidor de suficiencia, la chispa y la voz. Todos los strings pasan por <b>useT()</b> (ES/EN).</>, en: <>React 19 + Tailwind + Framer Motion bring the two modes, balance map, sufficiency meter, spark and voice to life. Every string goes through <b>useT()</b> (ES/EN).</> }, tags: [{ es: 'React 19', en: 'React 19' }, { es: 'Tailwind', en: 'Tailwind' }, { es: 'Framer Motion', en: 'Framer Motion' }, { es: 'Web Speech API', en: 'Web Speech API' }] },
  { color: BLUE, icon: Activity, n: { es: 'Persistencia local-first', en: 'Local-first persistence' }, src: 'store/index.ts · Zustand persist', role: { es: 'capa 05', en: 'layer 05' }, d: { es: <>Rutinas, equipo y preferencias viven en el dispositivo; nada sube a la nube sin pedirlo. Sync opcional con Supabase en background.</>, en: <>Routines, equipment and preferences live on the device; nothing goes to the cloud unless asked. Optional Supabase sync in the background.</> }, tags: [{ es: 'Zustand persist', en: 'Zustand persist' }, { es: 'localStorage', en: 'localStorage' }, { es: 'offline-first', en: 'offline-first' }, { es: 'Supabase sync', en: 'Supabase sync' }] },
  { color: AMBER, icon: Database, n: { es: 'IA on-device', en: 'On-device AI' }, src: 'LocalLLM (Qwen2.5) + pose-engine', role: { es: 'solo comunica + forma', en: 'only communicates + form' }, d: { es: <>El CoachAgent (Transformers.js) <b>comunica decisiones, nunca decide números</b>; MediaPipe Pose vigila la forma dentro del player. El 5 % que no puede romper el 95 % restante.</>, en: <>The CoachAgent (Transformers.js) <b>communicates decisions, never decides numbers</b>; MediaPipe Pose watches form inside the player. The 5% that cannot break the remaining 95%.</> }, tags: [{ es: 'Transformers.js', en: 'Transformers.js' }, { es: 'MediaPipe Pose', en: 'MediaPipe Pose' }, { es: '5%', en: '5%' }] },
];

const ROADMAP: { q: string; st: { es: string; en: string }; stClass: string; icon: LucideIcon; items: { es: string; en: string }[] }[] = [
  { q: 'Q3 2026', st: { es: '✓ HECHO', en: '✓ DONE' }, stClass: 'text-[#34d399]', icon: Check, items: [
    { es: 'Catálogo separado de rutina, con fotos de dos ángulos y marca por músculo de respaldo.', en: 'Catalog separated from the routine, with two-angle photos and a muscle-mark fallback.' },
    { es: 'Modos Guíame / Yo elijo, filtros por patrón y músculo, coach de balance tocable.', en: 'Guide Me / I choose modes, pattern and muscle filters, tappable balance coach.' },
    { es: 'Medidor de suficiencia, CTA que brilla y feedback perceptible (chispa, destello de fila).', en: 'Sufficiency meter, glowing CTA and perceptible feedback (spark, row flash).' },
  ] },
  { q: 'Q4 2026', st: { es: '◐ EN CURSO', en: '◐ IN PROGRESS' }, stClass: 'text-[#ffb454]', icon: Watch, items: [
    { es: 'Afinidad entrenada sobre el historial real (ex_progress: easy + last_rpe), sustituyendo gradualmente la fórmula transparente con arranque en frío.', en: 'Affinity trained on real history (ex_progress: easy + last_rpe), gradually replacing the transparent formula with a cold start.' },
    { es: 'Form check on-device con MediaPipe + cues rule-based dentro del player.', en: 'On-device form check with MediaPipe + rule-based cues inside the player.' },
    { es: 'Closed-loop wearable: HRV de Whoop/Oura ajusta el umbral de suficiencia.', en: 'Closed-loop wearable: HRV from Whoop/Oura adjusts the sufficiency threshold.' },
  ] },
  { q: '2027', st: { es: '○ VISIÓN', en: '○ VISION' }, stClass: 'text-[#a78bfa]', icon: Puzzle, items: [
    { es: 'Agente DQN que refina sugerencias con reward de forma, fatiga y progreso.', en: 'DQN agent refining suggestions with form, fatigue and progress rewards.' },
    { es: 'Digital twin de adherencia que predice el abandono y reajusta el selector antes de que ocurra.', en: 'An adherence digital twin that predicts dropout and readjusts the selector before it happens.' },
  ] },
];

const MANIFEST: { es: string; en: string }[] = [
  { es: 'Catálogo y rutina son entidades distintas: el grid nunca refleja la selección, refleja el pool filtrado.', en: 'Catalog and routine are separate entities: the grid never mirrors the selection, it mirrors the filtered pool.' },
  { es: 'Siempre hay un camino sin búsqueda: el modo Guíame propone cuatro ejercicios de un toque desde el primer render.', en: 'There is always a path without searching: Guide Me proposes four one-tap exercises from the first render.' },
  { es: 'La foto manda en el grid: dos ángulos con crossfade; el respaldo es una marca por músculo, nunca un icono roto.', en: 'The photo rules the grid: two angles with crossfade; the fallback is a muscle mark, never a broken icon.' },
  { es: 'El coach es determinista: patrones, duración y dopamina se calculan en código; el LLM no toca números.', en: 'The coach is deterministic: patterns, duration and dopamine are computed in code; the LLM never touches numbers.' },
  { es: 'Los huecos son tocables: cada patrón faltante filtra el catálogo al instante y hace scroll hasta él.', en: 'Gaps are tappable: every missing pattern instantly filters the catalog and scrolls to it.' },
  { es: 'Existe el permiso para parar: el medidor de suficiencia dice "ya está bien" sin culpa; el botón brilla solo al cruzar el umbral.', en: 'There is permission to stop: the sufficiency meter says “good enough” without guilt; the button glows only when the threshold is crossed.' },
  { es: 'Toda acción tiene consecuencia visible: chispa al contador, latido del contador, destello de la fila nueva.', en: 'Every action has a visible consequence: spark to the counter, counter pulse, flash of the new row.' },
  { es: 'El LLM está encadenado: en CHISPA las razones son plantillas deterministas y el CoachAgent solo comunica.', en: 'The LLM is chained: in CHISPA reasons are deterministic templates and the CoachAgent only communicates.' },
  { es: 'Local-first por defecto: rutinas, equipo y preferencias viven en el dispositivo; nada sube a la nube sin pedirlo.', en: 'Local-first by default: routines, equipment and preferences live on the device; nothing goes to the cloud unless asked.' },
  { es: 'Los números informan, no moralizan: duración total y dopamina; jamás un "~X min de descanso" que suene a castigo.', en: 'Numbers inform, they do not moralize: total duration and dopamine; never a “~X min of rest” that sounds like a punishment.' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/** Texto bilingüe ES/EN — pinta la variante según el idioma activo del store. */
function Bi({ es, en }: { es: React.ReactNode; en: React.ReactNode }) {
  const lang = useStore((s) => s.lang);
  return <>{lang === 'en' ? en : es}</>;
}

const plainManifest = (lang: 'es' | 'en') =>
  (lang === 'en'
    ? 'IMPLEMENTATION MANIFESTO · CHISPA SELECTOR\n\n'
    : 'MANIFIESTO DE IMPLEMENTACIÓN · SELECTOR CHISPA\n\n') +
  MANIFEST.map((m, i) => `${String(i + 1).padStart(2, '0')}. ${lang === 'en' ? m.en : m.es}`).join('\n');

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SecNo({ n, active }: { n: string; active: boolean }) {
  return (
    <div
      className="text-[64px] sm:text-[84px] leading-[0.85] font-black tracking-tighter transition-colors duration-500 text-transparent"
      style={{
        WebkitTextStroke: active ? '1.4px rgba(255,180,84,0.45)' : '1.4px rgba(255,255,255,0.14)',
      }}
    >
      {n}
    </div>
  );
}

// ─── Simulador: el motor real, el catálogo real ───────────────────────────

function Simulator() {
  const lang = useStore((s) => s.lang);
  const [focus, setFocus] = React.useState<SelectorFocus>('full');
  const [covered, setCovered] = React.useState<Pattern[]>([]);
  const [catalog, setCatalog] = React.useState<Exercise[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    getExercises().then((data) => {
      if (!cancelled) {
        setCatalog(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => setCovered([]), [focus]);

  const desired = DESIRED_PATTERNS[focus];
  // Memoizado: deseado es referencia estable por enfoque; solo cambia con `covered`
  const missing = React.useMemo(
    () => desired.filter((p) => !covered.includes(p)),
    [desired, covered]
  );
  const scored = React.useMemo(
    () => rankSuggestions(catalog, focus, missing, new Set(), 8),
    [catalog, focus, missing]
  );
  const max = scored[0]?.score ?? 1;

  const toggleCovered = (p: Pattern) =>
    setCovered((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  return (
    <div className="rounded-2xl border border-white/[.08] bg-[#161b23] p-4 sm:p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <p className="text-sm font-black tracking-tight">
          <Bi es="Score de relevancia" en="Relevance score" />
        </p>
        <span className="text-[10px] font-mono text-[#5d646d]">
          {catalog.length > 0
            ? <Bi es={`${catalog.length} ejercicios reales`} en={`${catalog.length} real exercises`} />
            : <Bi es="cargando catálogo…" en="loading catalog…" />}
        </span>
      </div>

      {/* Enfoque (taxonomía real de la app) */}
      <div className="flex gap-1.5 flex-wrap">
        {FOCUS_ORDER.map((f) => {
          const Icon = FOCUS_ICON[f];
          const active = focus === f;
          return (
            <button
              key={f}
              onClick={() => setFocus(f)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold border transition-all ${
                active
                  ? 'bg-[#ffb454] text-[#241309] border-transparent shadow-[0_4px_16px_rgba(255,180,84,0.35)]'
                  : 'bg-[#12161d] text-[#8b929b] border-white/[.09] hover:text-[#f3ede1]'
              }`}
            >
              <Icon size={12} /> {lang === 'en' ? FOCUS_LABELS_EN[f] : FOCUS_LABELS[f]}
            </button>
          );
        })}
      </div>

      {/* Patrones ya cubiertos: cambia el ranking en directo */}
      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        <span className="text-[10px] font-mono text-[#5d646d] uppercase tracking-wider">
          <Bi es="ya cubiertos" en="already covered" />
        </span>
        {desired.map((p) => {
          const on = covered.includes(p);
          const PIcon = PATTERN_ICON[p];
          return (
            <button
              key={p}
              onClick={() => toggleCovered(p)}
              aria-pressed={on}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-all ${
                on
                  ? 'bg-[rgba(52,211,153,0.14)] text-[#34d399] border-[rgba(52,211,153,0.5)]'
                  : 'bg-[#12161d] text-[#8b929b] border-white/[.09] hover:text-[#f3ede1]'
              }`}
            >
              <PIcon size={10} />
              {lang === 'en' ? PATTERN_LABEL_EN[p] : PATTERN_LABEL[p]}
              {on && <Check size={10} />}
            </button>
          );
        })}
      </div>

      {/* Huecos que el motor intenta completar */}
      <div className="flex items-center gap-1.5 flex-wrap mt-2 text-[10px]">
        <span className="font-mono text-[#5d646d] uppercase tracking-wider">
          <Bi es="huecos" en="gaps" />
        </span>
        {missing.length > 0 ? (
          missing.map((p) => (
            <span key={p} className="px-2 py-0.5 rounded-md bg-[rgba(251,191,36,0.12)] text-[#fbbf24] border border-[rgba(251,191,36,0.3)] font-bold">
              {lang === 'en' ? PATTERN_LABEL_EN[p] : PATTERN_LABEL[p]}
            </span>
          ))
        ) : (
          <span className="text-[#34d399] font-bold">
            <Bi es="ninguno — rutina completa" en="none — routine complete" />
          </span>
        )}
      </div>

      {/* Ranking del motor real */}
      <div className="mt-4 space-y-1.5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-full rounded-xl" style={{ animationDelay: `${i * 0.07}s` }} />
          ))
        ) : (
          scored.map((s: ScoredExercise, i) => {
            const PIcon = PATTERN_ICON[s.pattern];
            const width = Math.max(4, Math.round((s.score / max) * 100));
            return (
              <div key={s.exercise.id} className={`grid grid-cols-[20px_minmax(0,1fr)_52px] gap-2 items-center`}>
                <span className={`font-mono text-[11px] text-right ${i < 4 ? 'text-[#ffb454]' : 'text-[#5d646d]'}`}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12.5px] truncate">{s.exercise.name}</span>
                    <span
                      className="flex items-center gap-1 text-[8.5px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ color: PATTERN_COLOR[s.pattern], background: `${PATTERN_COLOR[s.pattern]}1a` }}
                    >
                      <PIcon size={8} /> {lang === 'en' ? PATTERN_LABEL_EN[s.pattern] : PATTERN_LABEL[s.pattern]}
                    </span>
                    {s.coversGap && (
                      <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-[rgba(52,211,153,0.14)] text-[#34d399]">
                        +{GAP_BONUS} <Bi es="hueco" en="gap" />
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[.07] overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${i < 4 ? 'bg-gradient-to-r from-[#ffb454] to-[#ff7a3d]' : 'bg-white/[.18]'}`}
                      style={{ width: `${width}%`, transition: 'width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                    />
                  </div>
                </div>
                <span className="font-mono text-[11px] text-right text-[#8b929b]">{s.score}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Por qué el nº1 */}
      {!loading && scored[0] && (
        <div className="mt-3 pt-3 border-t border-dashed border-white/[.08]">
          <p className="text-[10px] font-mono text-[#5d646d] uppercase tracking-wider mb-1">
            <Bi es="por qué el nº1 ·" en="why #1 ·" /> {scored[0].exercise.name}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {scored[0].reasons.map((r, ri) => (
              <span key={ri} className="text-[10px] px-2 py-1 rounded-md bg-white/[.05] border border-white/[.08] text-[#9aa7bd]">
                {r.kind === 'gap' && r.pattern
                  ? lang === 'en'
                    ? `Covers ${PATTERN_LABEL_EN[r.pattern]} · you were missing it`
                    : `Cubre ${PATTERN_LABEL[r.pattern]} · te faltaba`
                  : r.kind === 'affinity' && r.pattern
                    ? lang === 'en'
                      ? `Affinity · ${PATTERN_LABEL_EN[r.pattern]}`
                      : `Afinidad · ${PATTERN_LABEL[r.pattern]}`
                    : r.kind === 'easy'
                      ? <Bi es="Arranque fácil" en="Easy start" />
                      : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[11.5px] text-[#8b929b] leading-relaxed">
        <Bi
          es={<>Fórmula: <code className="text-[10.5px] text-[#34d399] bg-white/[.05] px-1.5 py-0.5 rounded">score = afinidad(focus) + (cubre_hueco ? +{GAP_BONUS} : 0) + gancho(carga)</code>. El término <b className="text-[#f3ede1]">+{GAP_BONUS}</b> es deliberadamente dominante: garantiza que Guíame <b className="text-[#f3ede1]">complete</b> la rutina antes que repetirla. Marca patrones como &ldquo;ya cubiertos&rdquo; y observa cómo el ranking se reordena. Esto no es una simulación: es <code className="text-[10.5px] text-[#ffb454] bg-white/[.05] px-1.5 py-0.5 rounded">rankSuggestions()</code> de producción.</>}
          en={<>Formula: <code className="text-[10.5px] text-[#34d399] bg-white/[.05] px-1.5 py-0.5 rounded">score = affinity(focus) + (covers_gap ? +{GAP_BONUS} : 0) + hook(load)</code>. The <b className="text-[#f3ede1]">+{GAP_BONUS}</b> term is deliberately dominant: it guarantees Guide Me <b className="text-[#f3ede1]">completes</b> the routine before repeating it. Mark patterns as &ldquo;already covered&rdquo; and watch the ranking reorder. This is not a simulation: it is the production <code className="text-[10.5px] text-[#ffb454] bg-white/[.05] px-1.5 py-0.5 rounded">rankSuggestions()</code>.</>}
        />
      </p>
    </div>
  );
}

// ─── Máquina de estados ────────────────────────────────────────────────────

function StateMachine() {
  const lang = useStore((s) => s.lang);
  const [active, setActive] = React.useState(2);
  const s = SM_STATES[active];

  return (
    <div className="rounded-2xl border border-white/[.08] bg-[#161b23] p-4 sm:p-5">
      <div className="flex items-center gap-0 overflow-x-auto scrollbar-none pb-2">
        {SM_STATES.map((st, i) => {
          const Icon = st.icon;
          const cls =
            i === active
              ? 'bg-gradient-to-br from-[#ffb454] to-[#ff7a3d] text-[#241309] border-transparent shadow-[0_8px_20px_rgba(255,122,61,0.45)] scale-105'
              : i < active
                ? 'bg-[rgba(52,211,153,0.12)] text-[#34d399] border-[rgba(52,211,153,0.4)]'
                : 'bg-[#12161d] text-[#5d646d] border-white/[.09] hover:text-[#f3ede1]';
          return (
            <React.Fragment key={st.id}>
              <button
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                className="flex flex-col items-center gap-1.5 min-w-[72px]"
              >
                <span className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-all ${cls}`}>
                  <Icon size={19} />
                </span>
                <span className={`text-[10px] font-bold ${i === active ? 'text-[#f3ede1]' : 'text-[#8b929b]'}`}>
                  {lang === 'en' ? st.l.en : st.l.es}
                </span>
              </button>
              {i < SM_STATES.length - 1 && (
                <div className={`flex-1 min-w-[10px] h-[2px] self-start mt-5 rounded-full ${i < active ? 'bg-[#34d399]' : 'bg-white/[.09]'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-dashed border-white/[.08] grid sm:grid-cols-3 gap-2.5">
        <div className="rounded-xl bg-[#12161d] border border-white/[.06] p-3">
          <p className="text-[9px] font-mono text-[#ffb454] uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Eye size={11} /> <Bi es="ve el usuario" en="the user sees" />
          </p>
          <p className="text-[12px] text-[#9aa7bd] leading-relaxed">{lang === 'en' ? s.ui.en : s.ui.es}</p>
        </div>
        <div className="rounded-xl bg-[#12161d] border border-white/[.06] p-3">
          <p className="text-[9px] font-mono text-[#34d399] uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Cpu size={11} /> <Bi es="hace el algoritmo" en="the algorithm does" />
          </p>
          <p className="text-[12px] text-[#9aa7bd] leading-relaxed">{lang === 'en' ? s.algo.en : s.algo.es}</p>
        </div>
        <div className="rounded-xl bg-[#12161d] border border-white/[.06] p-3">
          <p className="text-[9px] font-mono text-[#a78bfa] uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <ArrowRight size={11} /> <Bi es="transición" en="transition" />
          </p>
          <p className="text-[12px] text-[#9aa7bd] leading-relaxed">{lang === 'en' ? s.go.en : s.go.es}</p>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-[#0e1116] border border-white/[.06] px-3 py-2 font-mono text-[10.5px] text-[#8b929b] leading-relaxed">
        <span className="text-[#ffb454]"><Bi es="umbral de suficiencia ·" en="sufficiency threshold ·" /></span>{' '}
        <span className="text-[#34d399]">ex ≥ {SUFFICIENT.minExercises}</span> ∧{' '}
        <span className="text-[#34d399]"><Bi es="cubiertos ≥ min(3, |desired|)" en="covered ≥ min(3, |desired|)" /></span> ∧{' '}
        <span className="text-[#34d399]">{SUFFICIENT.minDuration} ≤ <Bi es="duración_min" en="duration_min" /> ≤ {SUFFICIENT.maxDuration}</span>{' '}
        → <Bi
          es={<>cuando se cumple, el estado pasa a <span className="text-[#ffb454]">SUFICIENTE</span> y el CTA entra en live.</>}
          en={<>when met, the state becomes <span className="text-[#ffb454]">SUFFICIENT</span> and the CTA goes live.</>}
        />
      </div>
    </div>
  );
}

// ─── Capas (acordeón) ──────────────────────────────────────────────────────

function Layers() {
  const lang = useStore((s) => s.lang);
  const [open, setOpen] = React.useState<number | null>(null);

  return (
    <div className="space-y-2">
      {LAYERS.map((ly, i) => {
        const Icon = ly.icon;
        const isOpen = open === i;
        return (
          <div
            key={i}
            className={`rounded-xl border bg-[#161b23] overflow-hidden transition-all ${
              isOpen ? 'border-white/[.16]' : 'border-white/[.07]'
            } ${open !== null && !isOpen ? 'opacity-55' : ''}`}
            style={{ borderLeft: `3px solid ${ly.color}` }}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-3 p-3 text-left"
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${ly.color}1f`, color: ly.color }}
              >
                <Icon size={17} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold leading-tight">{lang === 'en' ? ly.t.en : ly.t.es}</span>
                <span className="block text-[9.5px] font-mono text-[#5d646d] mt-0.5">{lang === 'en' ? ly.sub.en : ly.sub.es}</span>
              </span>
              <span className="font-black text-[15px]" style={{ color: ly.color }}>{ly.pct}</span>
              <ChevronDown size={15} className={`text-[#5d646d] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[420px]' : 'max-h-0'}`}>
              <div className="px-3 pb-3 pt-1">
                <div className="border-t border-dashed border-white/[.08] pt-2.5 text-[12px] text-[#9aa7bd] leading-relaxed">
                  {lang === 'en' ? ly.d.en : ly.d.es}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {ly.tags.map((tg) => (
                      <span
                        key={tg.es}
                        className="text-[9px] font-mono px-2 py-1 rounded-md"
                        style={{ color: ly.color, background: `${ly.color}14`, border: `1px solid ${ly.color}40` }}
                      >
                        {lang === 'en' ? tg.en : tg.es}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────

export default function SelectorSpecPage() {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const [active, setActive] = React.useState('s00');
  const [progress, setProgress] = React.useState(0);
  const [toast, setToast] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Scroll-spy
  React.useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: '-38% 0px -55% 0px', threshold: 0 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  // Barra de progreso de lectura
  React.useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toastTimer = React.useRef<number | null>(null);
  const copiedTimer = React.useRef<number | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };

  const copyManifest = async () => {
    const ok = await copyText(plainManifest(lang));
    if (ok) {
      setCopied(true);
      notify(lang === 'en' ? 'Manifesto copied to clipboard' : 'Manifiesto copiado al portapapeles');
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1700);
    }
  };

  return (
    <div className="min-h-dvh bg-[#0e1116] text-[#f3ede1]">
      {/* Barra de progreso de lectura */}
      <div className="fixed top-0 left-0 h-[2.5px] z-50 bg-gradient-to-r from-[#ffb454] to-[#ff7a3d] shadow-[0_0_12px_rgba(255,176,32,0.6)] transition-[width] duration-100" style={{ width: `${progress}%` }} />

      {/* Topbar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[rgba(14,17,22,0.82)] border-b border-white/[.08]">
        <div className="max-w-6xl mx-auto px-5 h-[56px] flex items-center gap-3">
          <Link href="/" className="text-[#8b929b] hover:text-[#ffb454] transition-colors inline-flex items-center gap-1.5 text-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            app
          </Link>
          <span className={`${DISP} font-extrabold text-[15px] tracking-tight`}>
            CHIS<b style={{ color: AMBER }}>PA</b>
          </span>
          <span className="hidden sm:block font-mono text-[9px] text-[#5d646d] uppercase tracking-[2px] border-l border-white/[.09] pl-3">
            <Bi es="spec vivo · selector" en="living spec · selector" />
          </span>
          <div className="flex-1" />
          <button
            onClick={() => {
              const next = lang === 'en' ? 'es' : 'en';
              setLang(next);
              supabaseSync.push({ lang: next }).catch(logError('lang:push'));
            }}
            aria-label={lang === 'en' ? 'Ver en español' : 'View in English'}
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-2 rounded-lg border border-white/[.12] text-[var(--muted)] hover:text-white hover:border-white/[.25] transition-all active:scale-95"
          >
            {lang === 'en' ? 'ES' : 'EN'}
          </button>
          <button
            onClick={copyManifest}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-lg bg-gradient-to-r from-[#ffb454] to-[#ff7a3d] text-[#241309] hover:brightness-110 transition-all active:scale-95"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? <Bi es="¡copiado!" en="copied!" /> : <Bi es="Copiar manifiesto" en="Copy manifesto" />}
          </button>
        </div>
      </header>

      {/* Meta */}
      <div className="max-w-6xl mx-auto px-5 pt-8 pb-2">
        <p className="font-mono text-[10.5px] text-[#5d646d] leading-[1.9]">
          DOC · <b className="text-[#ffb454] font-medium">CHISPA-UX-002</b> · REV <b>2.1</b> · <Bi es="estado" en="status" /> <b className="text-[#34d399]"><Bi es="implementado ✓" en="implemented ✓" /></b>
          <span className="inline-flex items-center gap-1.5 ml-3 text-[#34d399]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399] animate-pulse" /> <Bi es="spec vivo" en="living spec" />
          </span>
        </p>
        <h1 className={`${DISP} font-extrabold text-[26px] sm:text-[32px] leading-[1.05] tracking-tight mt-2 max-w-[20ch]`}>
          <Bi
            es={<>El selector de ejercicios, <em style={{ color: AMBER, fontStyle: 'normal' }}>por dentro</em>.</>}
            en={<>The exercise selector, <em style={{ color: AMBER, fontStyle: 'normal' }}>from the inside</em>.</>}
          />
        </h1>
        <p className={`${SERIF} italic text-[13.5px] text-[#8b929b] mt-1.5`}>
          <Bi
            es="Diagnóstico, arquitectura por capas y flujo de estados — el documento que explica cada decisión del área más delicada de CHISPA. El simulador ejecuta el motor de producción real."
            en="Diagnosis, layered architecture and state flow — the document that explains every decision in CHISPA’s most delicate area. The simulator runs the real production engine."
          />
        </p>
      </div>

      {/* Layout: índice + contenido */}
      <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-12">
        {/* Índice */}
        <nav className="lg:sticky lg:top-[72px] lg:self-start lg:py-6 pb-2 -mx-5 px-5 lg:mx-0 lg:px-0 lg:border-0 border-b border-white/[.06] overflow-x-auto scrollbar-none">
          <p className="hidden lg:block font-mono text-[9px] text-[#5d646d] uppercase tracking-[2px] mb-3">
            <Bi es="Índice del spec" en="Spec index" />
          </p>
          <div className="flex lg:flex-col gap-1 lg:gap-0.5">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`flex items-baseline gap-2 px-2.5 py-1.5 lg:py-2 rounded-lg whitespace-nowrap text-[12.5px] transition-colors ${
                  active === s.id
                    ? 'text-[#f3ede1] bg-[rgba(255,180,84,0.09)] lg:border-l-2 lg:border-[#ffb454] lg:rounded-l-none lg:rounded-r-lg'
                    : 'text-[#8b929b] hover:text-[#f3ede1] hover:bg-white/[.03]'
                }`}
              >
                <span className={`font-mono text-[9.5px] ${active === s.id ? 'text-[#ffb454]' : 'text-[#5d646d]'}`}>
                  {s.n}
                </span>
                {lang === 'en' ? s.t.en : s.t.es}
              </a>
            ))}
          </div>
        </nav>

        {/* Contenido */}
        <main className="min-w-0 pb-16">
          {/* 00 · Tesis */}
          <section id="s00" className="scroll-mt-24 pt-10 pb-2">
            <SecNo n="00" active={active === 's00'} />
            <p className="font-mono text-[10px] tracking-[2.5px] text-[#ffb454] uppercase mt-2"><Bi es="tesis rectora" en="governing thesis" /></p>
            <Reveal>
              <h2 className={`${DISP} font-extrabold text-[24px] sm:text-[30px] leading-tight tracking-tight mt-2`}>
                <Bi
                  es={<>El problema nunca fue <em style={{ color: AMBER, fontStyle: 'normal' }}>estético</em>.</>}
                  en={<>The problem was never <em style={{ color: AMBER, fontStyle: 'normal' }}>aesthetic</em>.</>}
                />
              </h2>
            </Reveal>
            <Reveal delay={0.05}>
              <p className={`${SERIF} text-[16px] leading-relaxed text-[#b9c2d0] mt-4 max-w-[60ch]`}>
                <Bi
                  es={<>Un lienzo en blanco con ochocientos ejercicios no es libertad: para un cerebro con TDAH es <i style={{ color: AMBER }}>una pared</i>. El selector original pedía al usuario hacer exactamente lo que menos puede en ese momento — <b>decidir desde cero</b> — y le escondía la ruta detrás de un buscador. Esta sección documenta cómo lo rehicimos: <b>menos decidir, más empezar</b>, y un permiso explícito para parar.</>}
                  en={<>A blank canvas with eight hundred exercises is not freedom: for an ADHD brain it is <i style={{ color: AMBER }}>a wall</i>. The original selector asked the user to do exactly what they can least do in that moment — <b>decide from scratch</b> — and hid the path behind a search box. This section documents how we rebuilt it: <b>less deciding, more starting</b>, and explicit permission to stop.</>}
                />
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="mt-6 rounded-2xl border border-white/[.08] overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_1fr] bg-[#0e1116] border-b border-white/[.06]">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#f87171] px-4 py-2"><Bi es="antes · roto" en="before · broken" /></span>
                  <span className="text-[#5d646d] text-[10px] self-center">→</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#34d399] px-4 py-2"><Bi es="después · neuro-first" en="after · neuro-first" /></span>
                </div>
                {WOUND.map((w) => (
                  <div key={w.k} className="grid grid-cols-[1fr_auto_1fr] border-t border-white/[.05] first:border-t-0">
                    <div className="px-4 py-3 bg-[rgba(248,113,113,0.05)]">
                      <p className="font-mono text-[8.5px] uppercase tracking-wider text-[#f87171]">{w.k}</p>
                      <p className="text-[12.5px] font-bold text-[#e8ecf4]">{lang === 'en' ? w.before.en : w.before.es}</p>
                    </div>
                    <div className="px-3 flex items-center justify-center">
                      <ArrowRight size={15} className="text-[#ffb454]" />
                    </div>
                    <div className="px-4 py-3 bg-[rgba(52,211,153,0.05)]">
                      <p className="font-mono text-[8.5px] uppercase tracking-wider text-[#34d399]">{w.k}</p>
                      <p className="text-[12.5px] font-bold text-[#e8ecf4]">{lang === 'en' ? w.after.en : w.after.es}</p>
                      <p className="text-[10.5px] text-[#8b929b] leading-snug mt-0.5">{lang === 'en' ? w.d.en : w.d.es}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </section>

          {/* 01 · Diagnóstico */}
          <section id="s01" className="scroll-mt-24 pt-12 pb-2">
            <SecNo n="01" active={active === 's01'} />
            <p className="font-mono text-[10px] tracking-[2.5px] text-[#ffb454] uppercase mt-2"><Bi es="diagnóstico" en="diagnosis" /></p>
            <Reveal>
              <h2 className={`${DISP} font-extrabold text-[24px] sm:text-[30px] leading-tight tracking-tight mt-2`}>
                <Bi
                  es={<>Qué estaba roto, y <em style={{ color: AMBER, fontStyle: 'normal' }}>por qué</em> se sentía así.</>}
                  en={<>What was broken, and <em style={{ color: AMBER, fontStyle: 'normal' }}>why</em> it felt that way.</>}
                />
              </h2>
            </Reveal>
            <Reveal delay={0.05}>
              <p className={`${SERIF} text-[15px] leading-relaxed text-[#b9c2d0] mt-3 max-w-[60ch]`}>
                <Bi
                  es={<>Conviene separar <b>síntoma</b> de <b>causa raíz</b>. El síntoma visible —la sensación de &ldquo;solo me deja unos pocos&rdquo;, los glifos genéricos, el badge de descanso que asusta— era consecuencia de decisiones de entrada y de jerarquía visual. Cuando un síntoma nace de la estructura de la pantalla, se arregla ahí primero; el resto es consecuencia.</>}
                  en={<>It helps to separate <b>symptom</b> from <b>root cause</b>. The visible symptom — the &ldquo;it only shows me a few&rdquo; feeling, the generic glyphs, the scary rest badge — followed from entry decisions and visual hierarchy. When a symptom comes from the screen’s structure, fix it there first; the rest follows.</>}
                />
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mt-5 rounded-2xl border border-white/[.08] overflow-hidden">
                <div className="grid grid-cols-[92px_1fr] sm:grid-cols-[92px_1.2fr_1fr] bg-[#0e1116] border-b border-white/[.06]">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#5d646d] px-4 py-2"><Bi es="severidad" en="severity" /></span>
                  <span className="hidden sm:block font-mono text-[9px] uppercase tracking-wider text-[#5d646d] px-4 py-2"><Bi es="causa raíz" en="root cause" /></span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#5d646d] px-4 py-2"><Bi es="síntoma" en="symptom" /></span>
                </div>
                {DIAGNOSIS.map((d) => (
                  <div key={d.h.es} className="grid grid-cols-[92px_1fr] sm:grid-cols-[92px_1.2fr_1fr] border-t border-white/[.05]">
                    <div className="px-4 py-3">
                      <span className="font-mono text-[8.5px] font-bold px-2 py-1 rounded-md inline-block" style={{ color: d.sevColor, background: `${d.sevColor}1a` }}>
                        {d.sev}
                      </span>
                    </div>
                    <div className="px-4 py-3 hidden sm:block">
                      <p className="text-[11px] text-[#9aa7bd] leading-relaxed">{lang === 'en' ? d.c.en : d.c.es}</p>
                    </div>
                    <div className="px-4 py-3 sm:border-l sm:border-white/[.05]">
                      <p className="text-[12.5px] font-bold text-[#e8ecf4] leading-snug">{lang === 'en' ? d.h.en : d.h.es}</p>
                      <p className="text-[11px] text-[#9aa7bd] leading-relaxed mt-1">{lang === 'en' ? d.s.en : d.s.es}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </section>

          {/* 02 · Principios */}
          <section id="s02" className="scroll-mt-24 pt-12 pb-2">
            <SecNo n="02" active={active === 's02'} />
            <p className="font-mono text-[10px] tracking-[2.5px] text-[#ffb454] uppercase mt-2"><Bi es="decisiones de diseño" en="design decisions" /></p>
            <Reveal>
              <h2 className={`${DISP} font-extrabold text-[24px] sm:text-[30px] leading-tight tracking-tight mt-2`}>
                <Bi
                  es={<>Ocho principios <em style={{ color: AMBER, fontStyle: 'normal' }}>invisibles</em>.</>}
                  en={<>Eight <em style={{ color: AMBER, fontStyle: 'normal' }}>invisible</em> principles.</>}
                />
              </h2>
            </Reveal>
            <div className="mt-4">
              {PRINCIPLES.map((p, i) => {
                const Icon = p.icon;
                return (
                  <Reveal key={p.no} delay={Math.min(i * 0.03, 0.15)}>
                    <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 py-4 border-t border-white/[.05] first:border-t-0 group">
                      <div className="text-[26px] font-black leading-none select-none" style={{ color: 'transparent', WebkitTextStroke: `1.2px rgba(255,255,255,0.16)` }}>
                        {p.no}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: `${p.color}17`, color: p.color }}>
                            <Icon size={15} />
                          </span>
                          <h3 className="text-[15px] font-bold leading-tight">{lang === 'en' ? p.t.en : p.t.es}</h3>
                        </div>
                        <p className="font-mono text-[9px] mt-1.5" style={{ color: p.color }}>
                          <Bi es="problema ·" en="problem ·" /> {lang === 'en' ? p.cog.en : p.cog.es}
                        </p>
                        <p className="text-[12.5px] text-[#9aa7bd] leading-relaxed mt-1.5">{lang === 'en' ? p.d.en : p.d.es}</p>
                        <div className="mt-2 text-[10px] font-mono text-[#8b929b] bg-white/[.03] border border-white/[.07] rounded-lg px-2.5 py-1.5 leading-relaxed">
                          <span className="text-[#a78bfa]"><Bi es="implementa" en="implements" /></span> · {lang === 'en' ? p.impl.en : p.impl.es}
                        </div>
                        <span className="inline-flex items-center gap-1 mt-2 text-[9px] font-mono text-[#8b929b] rounded-full px-2.5 py-1 border" style={{ background: `${p.color}14`, borderColor: `${p.color}40`, color: p.color }}>
                          <Bi es="sirve" en="serves" /> · {lang === 'en' ? p.serve.en : p.serve.es}
                        </span>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </section>

          {/* 03 · Arquitectura */}
          <section id="s03" className="scroll-mt-24 pt-12 pb-2">
            <SecNo n="03" active={active === 's03'} />
            <p className="font-mono text-[10px] tracking-[2.5px] text-[#ffb454] uppercase mt-2"><Bi es="arquitectura" en="architecture" /></p>
            <Reveal>
              <h2 className={`${DISP} font-extrabold text-[24px] sm:text-[30px] leading-tight tracking-tight mt-2`}>
                <Bi
                  es={<>Cinco capas, una regla: <em style={{ color: AMBER, fontStyle: 'normal' }}>el algoritmo manda</em>.</>}
                  en={<>Five layers, one rule: <em style={{ color: AMBER, fontStyle: 'normal' }}>the algorithm rules</em>.</>}
                />
              </h2>
            </Reveal>
            <Reveal delay={0.05}>
              <p className={`${SERIF} text-[15px] leading-relaxed text-[#b9c2d0] mt-3 max-w-[60ch]`}>
                <Bi
                  es={<>La regla 80/20 de CHISPA se aplica aquí sin excepción: el <b>80 %</b> de lo que el usuario ve en el selector lo decide código determinista (relevancia, balance, suficiencia, filtrado); el modelo on-device entra solo para <b>comunicar</b>, y las razones del &ldquo;por qué&rdquo; son plantillas que nunca dejan escapar texto libre. Toca una capa para desplegar su contrato.</>}
                  en={<>CHISPA’s 80/20 rule applies here without exception: the <b>80%</b> of what the user sees in the selector is decided by deterministic code (relevance, balance, sufficiency, filtering); the on-device model only enters to <b>communicate</b>, and the &ldquo;why&rdquo; reasons are templates that never let free text escape. Tap a layer to unfold its contract.</>}
                />
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mt-5">
                <Layers />
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="mt-5 rounded-2xl border border-white/[.08] overflow-hidden">
                <div className="bg-[#0e1116] border-b border-white/[.06] px-4 py-2.5 flex items-center gap-2">
                  <Database size={13} className="text-[#34d399]" />
                  <span className="font-mono text-[9.5px] uppercase tracking-wider text-[#8b929b]">
                    <Bi es="modelo de datos · entidades clave" en="data model · key entities" />
                  </span>
                </div>
                <pre className="p-4 text-[11px] font-mono text-[#9aa7bd] leading-relaxed overflow-x-auto">{`// catálogo (inmutable · exercises.json · 1110 ejercicios)
Exercise { id, name, muscle, equipment, difficulty,
           force, mechanic, category, load_type,
           cognitive_load, images[2], primaryMuscles }

// lo que el usuario construye (WorkoutExercise)
RoutineItem { exercise_id, name, muscle, sets, reps, rest }

// contexto que entra desde el onboarding + home
Ctx { equipment: 'ninguno'|'mancuernas'|'gimnasio',
      focus: 'full'|'upper'|'lower'|'core' }

// derivado en cada toque (no se guarda)
Balance { present: Pattern[], missing: Pattern[],
          durationMin, dopa, sufficient }`}</pre>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="mt-5">
                <p className="text-[14px] font-bold flex items-center gap-2">
                  <ShieldCheck size={15} className="text-[#a78bfa]" /> <Bi es="Contrato algoritmo → razón" en="Algorithm → reason contract" />
                </p>
                <p className={`${SERIF} italic text-[12.5px] text-[#8b929b] mt-1 max-w-[58ch]`}>
                  <Bi
                    es="El algoritmo nunca pide a un modelo &ldquo;pensar&rdquo;. Pasa un intent con slots a una plantilla; la plantilla se rellena y el UI traduce. A la izquierda lo que entra (determinista), a la derecha lo que sale (nunca texto libre)."
                    en="The algorithm never asks a model to &ldquo;think&rdquo;. It passes an intent with slots to a template; the template gets filled and the UI translates. On the left what enters (deterministic), on the right what leaves (never free text)."
                  />
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  <div className="rounded-xl border border-white/[.08] overflow-hidden">
                    <div className="bg-[#0e1116] border-b border-white/[.06] px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-[#34d399]">input · intent</div>
                    <pre className="p-3 text-[10.5px] font-mono text-[#9aa7bd] leading-relaxed overflow-x-auto">{`{
  "intent": "suggestion_why",
  "template_id": "tmpl_why_gap",
  "slots": {
    "exercise": "Remo manc.",
    "pattern": "pull",
    "focus": "full"
  }
}`}</pre>
                  </div>
                  <div className="rounded-xl border border-white/[.08] overflow-hidden">
                    <div className="bg-[#0e1116] border-b border-white/[.06] px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-[#a78bfa]"><Bi es="output · traducido por el UI" en="output · translated by the UI" /></div>
                    <pre className="p-3 text-[10.5px] font-mono text-[#9aa7bd] leading-relaxed overflow-x-auto">{`"Cubre tirón · te faltaba"
// o "Afinidad · tirón" / "Arranque fácil"
// si falta traducción → string español original
// el UI nunca ve texto libre del LLM`}</pre>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <p className={`${SERIF} italic text-[12.5px] text-[#8b929b] border-l-2 border-[#ffb454] pl-3.5 mt-5 max-w-[58ch]`}>
                <Bi
                  es={<><b className="text-[#f3ede1]">Por qué este reparto.</b> Lo que debe ser <em>correcto</em> (qué ejercicios, qué balance, cuándo parar) vive en código: es auditable, rápido y sin alucinaciones. Lo que debe ser <em>cálido</em> (cómo se dice) vive en plantillas deterministas traducidas. Así el matiz de texto no puede romper la lógica.</>}
                  en={<><b className="text-[#f3ede1]">Why this split.</b> What must be <em>correct</em> (which exercises, which balance, when to stop) lives in code: it is auditable, fast and hallucination-free. What must be <em>warm</em> (how it is said) lives in translated deterministic templates. That way the nuance of text can never break the logic.</>}
                />
              </p>
            </Reveal>
          </section>

          {/* 04 · Workflow */}
          <section id="s04" className="scroll-mt-24 pt-12 pb-2">
            <SecNo n="04" active={active === 's04'} />
            <p className="font-mono text-[10px] tracking-[2.5px] text-[#ffb454] uppercase mt-2"><Bi es="workflow" en="workflow" /></p>
            <Reveal>
              <h2 className={`${DISP} font-extrabold text-[24px] sm:text-[30px] leading-tight tracking-tight mt-2`}>
                <Bi
                  es={<>La máquina de estados del <em style={{ color: AMBER, fontStyle: 'normal' }}>selector</em>.</>}
                  en={<>The <em style={{ color: AMBER, fontStyle: 'normal' }}>selector</em>’s state machine.</>}
                />
              </h2>
            </Reveal>
            <Reveal delay={0.05}>
              <p className={`${SERIF} text-[15px] leading-relaxed text-[#b9c2d0] mt-3 max-w-[60ch]`}>
                <Bi
                  es={<>El selector no es una pantalla estática: es una <b>máquina de estados</b> con cinco nodos. Toca un nodo para ver qué muestra al usuario, qué calcula el algoritmo y qué dispara la transición. Los bordes iluminados marcan el camino recorrido.</>}
                  en={<>The selector is not a static screen: it is a <b>state machine</b> with five nodes. Tap a node to see what it shows the user, what the algorithm computes and what triggers the transition. The lit edges mark the path already travelled.</>}
                />
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mt-5">
                <StateMachine />
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="mt-5 rounded-2xl border border-white/[.08] overflow-hidden">
                <div className="bg-[#0e1116] border-b border-white/[.06] px-4 py-2.5 flex items-center gap-2">
                  <List size={13} className="text-[#34d399]" />
                  <span className="font-mono text-[9.5px] uppercase tracking-wider text-[#8b929b]">
                    <Bi es="secuencia &ldquo;tocar añadir&rdquo; — quién hace qué" en="“tap to add” sequence — who does what" />
                  </span>
                </div>
                <ol className="p-4 space-y-0 relative">
                  {(lang === 'en'
                    ? [
                        ['UI · tap', AMBER, 'The user taps a catalog or Guide Me card. The tap point is captured for the spark.'],
                        ['Algorithm', TEAL, 'Routine mutation; synchronous recompute of present / missing / durationMin / dopa / sufficient. No network, no model.'],
                        ['UI · feedback', AMBER, 'The spark flies to the metrics counter and the row enters with a flash; the balance map and sufficiency meter re-render.'],
                        ['Template · reason', VIOLET, 'If the top-4 changed (only in Guide Me), the “why” is rebuilt from tmpl_why_*; the UI translates the winning template.'],
                        ['Algorithm · persistence', TEAL, 'If the state crosses to SUFFICIENT, the CTA glows; when saving, the routine serializes to the local store and appears in My routines.'],
                      ]
                    : [
                        ['UI · toque', AMBER, 'El usuario toca una tarjeta del catálogo o de Guíame. Se captura el punto del toque para la chispa.'],
                        ['Algoritmo', TEAL, 'Mutación de routine; recálculo síncrono de present / missing / durationMin / dopa / sufficient. Sin red, sin modelo.'],
                        ['UI · feedback', AMBER, 'Chispa vuela al contador de métricas y la fila entra con destello; el mapa de balance y el medidor de suficiencia se re-renderizan.'],
                        ['Plantilla · razón', VIOLET, 'Si cambió el top-4 (solo en Guíame), se re-compone el "por qué" desde tmpl_why_*; el UI traduce la plantilla ganadora.'],
                        ['Algoritmo · persistencia', TEAL, 'Si el estado cruza a SUFICIENTE, el CTA brilla; al guardar, la rutina se serializa al store local y aparece en Mis rutinas.'],
                      ]
                  ).map(([who, color, what], i) => (
                    <li key={i} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 py-2 relative">
                      <span className={`font-mono text-[9px] uppercase tracking-wider pt-0.5`} style={{ color: color as string }}>
                        {who as string}
                      </span>
                      <p className="text-[12px] text-[#9aa7bd] leading-relaxed">{what as string}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </section>

          {/* 05 · Motor de relevancia */}
          <section id="s05" className="scroll-mt-24 pt-12 pb-2">
            <SecNo n="05" active={active === 's05'} />
            <p className="font-mono text-[10px] tracking-[2.5px] text-[#ffb454] uppercase mt-2"><Bi es="motor de relevancia" en="relevance engine" /></p>
            <Reveal>
              <h2 className={`${DISP} font-extrabold text-[24px] sm:text-[30px] leading-tight tracking-tight mt-2`}>
                <Bi
                  es={<>Por qué <em style={{ color: AMBER, fontStyle: 'normal' }}>Guíame</em> propone lo que propone.</>}
                  en={<>Why <em style={{ color: AMBER, fontStyle: 'normal' }}>Guide Me</em> proposes what it proposes.</>}
                />
              </h2>
            </Reveal>
            <Reveal delay={0.05}>
              <p className={`${SERIF} text-[15px] leading-relaxed text-[#b9c2d0] mt-3 max-w-[60ch]`}>
                <Bi
                  es={<>Este simulador es la capa 01 hecha visible — con el <b>código real de producción</b> y el catálogo real de {`1,110`} ejercicios. Cambia el enfoque y observa cómo el score se recalcula y reordena: el modo Guíame tomaría los cuatro primeros. El bonus por <b>cubrir un hueco</b> es lo que hace que la sugerencia tenga sentido y no sea azar.</>}
                  en={<>This simulator is layer 01 made visible — with the <b>real production code</b> and the real {`1,110`}-exercise catalog. Change the focus and watch the score recompute and reorder: Guide Me mode would take the top four. The <b>gap-covering</b> bonus is what makes the suggestion make sense instead of being random.</>}
                />
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mt-5">
                <Simulator />
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <p className={`${SERIF} italic text-[12.5px] text-[#8b929b] border-l-2 border-[#ffb454] pl-3.5 mt-5 max-w-[58ch]`}>
                <Bi
                  es={<><b className="text-[#f3ede1]">Lectura del simulador.</b> Con enfoque <em>Cuerpo completo</em> y huecos en varios patrones, verás cómo ejercicios que cubren un patrón ausente suben al top aunque su afinidad base no sea la máxima: el bonus los empuja. Marca un patrón como &ldquo;ya cubierto&rdquo; y el ranking se reorganiza alrededor de lo que falta. Eso es, exactamente, lo que el usuario percibe como &ldquo;la app me entiende&rdquo;.</>}
                  en={<><b className="text-[#f3ede1]">Reading the simulator.</b> With <em>Full body</em> focus and gaps in several patterns, you will see how exercises covering a missing pattern climb to the top even when their base affinity is not the highest: the bonus pushes them. Mark a pattern as &ldquo;already covered&rdquo; and the ranking reorganizes around what is missing. That is, exactly, what the user perceives as &ldquo;the app gets me&rdquo;.</>}
                />
              </p>
            </Reveal>
          </section>

          {/* 06 · Integración */}
          <section id="s06" className="scroll-mt-24 pt-12 pb-2">
            <SecNo n="06" active={active === 's06'} />
            <p className="font-mono text-[10px] tracking-[2.5px] text-[#ffb454] uppercase mt-2"><Bi es="integración" en="integration" /></p>
            <Reveal>
              <h2 className={`${DISP} font-extrabold text-[24px] sm:text-[30px] leading-tight tracking-tight mt-2`}>
                <Bi
                  es={<>El selector no es <em style={{ color: AMBER, fontStyle: 'normal' }}>una isla</em>.</>}
                  en={<>The selector is not <em style={{ color: AMBER, fontStyle: 'normal' }}>an island</em>.</>}
                />
              </h2>
            </Reveal>
            <Reveal delay={0.05}>
              <p className={`${SERIF} text-[15px] leading-relaxed text-[#b9c2d0] mt-3 max-w-[60ch]`}>
                <Bi
                  es={<>Cada entrada del selector viene de una decisión tomada antes, y cada salida alimenta una pantalla de después. Estos son los <b>cinco puentes</b> que lo cosen al resto de CHISPA; romper cualquiera de ellos devolvería la sensación de &ldquo;pantalla suelta&rdquo;.</>}
                  en={<>Every selector input comes from a decision made earlier, and every output feeds a later screen. These are the <b>five bridges</b> that stitch it to the rest of CHISPA; breaking any of them would bring back the &ldquo;loose screen&rdquo; feeling.</>}
                />
              </p>
            </Reveal>
            <div className="mt-4 space-y-2">
              {INTEGRATIONS.map((ig, i) => (
                <Reveal key={i} delay={Math.min(i * 0.04, 0.16)}>
                  <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-center rounded-xl border border-white/[.07] bg-[#161b23] p-3 hover:border-white/[.15] transition-colors">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-[#a78bfa]">{lang === 'en' ? ig.fromK.en : ig.fromK.es}</p>
                      <p className="text-[13px] font-bold">{lang === 'en' ? ig.fromT.en : ig.fromT.es}</p>
                      <p className="text-[10.5px] text-[#8b929b] leading-snug">{lang === 'en' ? ig.fromD.en : ig.fromD.es}</p>
                    </div>
                    <ArrowRight size={16} className="text-[#ffb454] justify-self-center rotate-90 sm:rotate-0" />
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-[#34d399]">{lang === 'en' ? ig.toK.en : ig.toK.es}</p>
                      <p className="text-[13px] font-bold">{lang === 'en' ? ig.toT.en : ig.toT.es}</p>
                      <p className="text-[10.5px] text-[#8b929b] leading-snug">{lang === 'en' ? ig.toD.en : ig.toD.es}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* 07 · Stack & roadmap */}
          <section id="s07" className="scroll-mt-24 pt-12 pb-2">
            <SecNo n="07" active={active === 's07'} />
            <p className="font-mono text-[10px] tracking-[2.5px] text-[#ffb454] uppercase mt-2"><Bi es="stack de producción &amp; roadmap" en="production stack &amp; roadmap" /></p>
            <Reveal>
              <h2 className={`${DISP} font-extrabold text-[24px] sm:text-[30px] leading-tight tracking-tight mt-2`}>
                <Bi
                  es={<>En qué se <em style={{ color: AMBER, fontStyle: 'normal' }}>apoya</em> todo esto.</>}
                  en={<>What all of this <em style={{ color: AMBER, fontStyle: 'normal' }}>stands on</em>.</>}
                />
              </h2>
            </Reveal>
            <div className="mt-4 space-y-2">
              {STACK.map((st, i) => {
                const Icon = st.icon;
                return (
                  <Reveal key={i} delay={Math.min(i * 0.04, 0.16)}>
                    <div className="rounded-xl border border-white/[.07] p-3.5 hover:border-white/[.15] transition-colors" style={{ borderLeft: `3px solid ${st.color}` }}>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${st.color}17`, color: st.color }}>
                          <Icon size={16} />
                        </span>
                        <p className="text-[13.5px] font-bold">{lang === 'en' ? st.n.en : st.n.es}</p>
                        <code className="text-[9px] font-mono text-[#5d646d]">{st.src}</code>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full" style={{ color: st.color, background: `${st.color}14`, border: `1px solid ${st.color}40` }}>
                          {lang === 'en' ? st.role.en : st.role.es}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#9aa7bd] leading-relaxed mt-2">{lang === 'en' ? st.d.en : st.d.es}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {st.tags.map((tg) => (
                          <span key={tg.es} className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/[.04] border border-white/[.07] text-[#8b929b]">
                            {lang === 'en' ? tg.en : tg.es}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-white/[.08] overflow-hidden">
              {ROADMAP.map((r, i) => {
                const Icon = r.icon;
                return (
                  <div key={r.q} className={`grid sm:grid-cols-[130px_minmax(0,1fr)] ${i > 0 ? 'border-t border-white/[.05]' : ''}`}>
                    <div className="sm:border-r border-b sm:border-b-0 border-white/[.05] bg-[#0e1116] px-4 py-3">
                      <p className="text-[14px] font-black">{r.q}</p>
                      <p className={`font-mono text-[9px] mt-0.5 ${r.stClass}`}>{lang === 'en' ? r.st.en : r.st.es}</p>
                    </div>
                    <div className="px-4 py-3 flex flex-col gap-2">
                      {r.items.map((it) => (
                        <p key={it.es} className="text-[12px] text-[#9aa7bd] leading-relaxed flex gap-2">
                          <Icon size={13} className="text-[#5d646d] shrink-0 mt-0.5" />
                          <span>{lang === 'en' ? it.en : it.es}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 08 · Manifiesto */}
          <section id="s08" className="scroll-mt-24 pt-12 pb-2">
            <SecNo n="08" active={active === 's08'} />
            <p className="font-mono text-[10px] tracking-[2.5px] text-[#ffb454] uppercase mt-2"><Bi es="cierre" en="closing" /></p>
            <Reveal>
              <h2 className={`${DISP} font-extrabold text-[24px] sm:text-[30px] leading-tight tracking-tight mt-2`}>
                <Bi
                  es={<>Reglas no <em style={{ color: AMBER, fontStyle: 'normal' }}>negociables</em>.</>}
                  en={<>Non-<em style={{ color: AMBER, fontStyle: 'normal' }}>negotiable</em> rules.</>}
                />
              </h2>
            </Reveal>
            <Reveal delay={0.05}>
              <p className={`${SERIF} text-[15px] leading-relaxed text-[#b9c2d0] mt-3 max-w-[60ch]`}>
                <Bi
                  es={<>Para quien implemente o revise esta pantalla: este es el <b>contrato</b>. Cada línea es una decisión que protege al usuario neurodivergente de una fricción concreta. Romper una es reintroducir el bug original por otra puerta.</>}
                  en={<>For whoever implements or reviews this screen: this is the <b>contract</b>. Every line is a decision that protects the neurodivergent user from a specific friction. Breaking one is reintroducing the original bug through another door.</>}
                />
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mt-5 rounded-2xl border border-white/[.08] bg-gradient-to-b from-[#161b23] to-[#12161d] p-4 sm:p-5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(420px 180px at 85% -10%, rgba(255,180,84,0.10), transparent 70%)' }} />
                <p className="relative flex items-center gap-2 text-[15px] font-black">
                  <ShieldCheck size={17} className="text-[#ffb454]" /> <Bi es="Manifiesto de implementación del selector" en="Selector implementation manifesto" />
                </p>
                <ol className="relative mt-3">
                  {MANIFEST.map((m, i) => (
                    <li key={i} className="grid grid-cols-[30px_minmax(0,1fr)] gap-2.5 py-2 border-t border-white/[.05] first:border-t-0">
                      <span className="font-mono text-[10.5px] text-[#ffb454] text-right pt-0.5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="text-[12.5px] text-[#b9c2d0] leading-relaxed">{lang === 'en' ? m.en : m.es}</p>
                    </li>
                  ))}
                </ol>
                <div className="relative mt-3">
                  <button
                    onClick={copyManifest}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#ffb454] to-[#ff7a3d] text-[#241309] hover:brightness-110 transition-all active:scale-95"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? <Bi es="¡copiado!" en="copied!" /> : <Bi es="Copiar manifiesto" en="Copy manifesto" />}
                  </button>
                </div>
              </div>
            </Reveal>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[.08] py-6 text-center">
        <p className={`${DISP} font-extrabold text-[18px]`}>
          CHIS<b style={{ color: AMBER }}>PA</b>
        </p>
        <p className="font-mono text-[10px] text-[#5d646d] mt-1">
          <Bi
            es="spec de ingeniería · selector de ejercicios · v2.1 · el sistema operativo agéntico para cerebros que no paran"
            en="engineering spec · exercise selector · v2.1 · the agentic operating system for minds that never stop"
          />
        </p>
      </footer>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              className="flex items-center gap-2.5 rounded-2xl bg-[#161b23] border border-[rgba(52,211,153,0.35)] px-4 py-2.5 shadow-2xl pointer-events-auto"
            >
              <span className="w-6 h-6 rounded-lg bg-[rgba(52,211,153,0.14)] flex items-center justify-center text-[#34d399]">
                <Check size={13} />
              </span>
              <span className="text-[12px] font-bold">{toast}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
