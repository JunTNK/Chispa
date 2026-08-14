# CHISPA — Guía del proyecto

## Stack

| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js 15 (App Router, React 19, TypeScript) |
| **Estilos** | Tailwind CSS v4 (CSS-first: `@import "tailwindcss"` + tokens en `globals.css`) |
| **Estado** | Zustand v5 (persistente en localStorage) |
| **Animación** | Motion (paquete `motion`, el rebrand de Framer Motion) |
| **Base de datos** | Supabase (PostgreSQL + Auth) |
| **Offline** | Service Worker + Zustand persist |
| **Tests** | Vitest + Testing Library (unit) + Playwright (e2e) |
| **IA Local** | Transformers.js (Qwen2.5-1.5B) |

## Comandos

```bash
# Desarrollo
npm run dev

# Build producción
npm run build

# Tests
npm run test

# Lint
npm run lint
```

## Archivos de configuración raíz

| Archivo | Propósito |
|---------|----------|
| `src/app/globals.css` | Tailwind 4 CSS-first: `@import "tailwindcss"` + tokens CSS (colores, animaciones) — no hay `tailwind.config` |
| `vitest.config.ts` | Configuración de Vitest (jsdom, aliases, plugins) |
| `next.config.ts` | Configuración de Next.js (images remotePatterns, webpack, headers) |
| `postcss.config.mjs` | PostCSS con `@tailwindcss/postcss` (Tailwind 4 incluye prefixing — no hay Autoprefixer) |
| `tsconfig.json` | TypeScript config (paths, jsx: preserve) |
| `.env.example` | Variables de entorno (Supabase URL + keys) |

## Estructura del proyecto

```
src/
├── app/                       # App Router (Next.js 15)
│   ├── layout.tsx             # Layout raíz con fuentes, PWA, metadata
│   ├── page.tsx               # Página única SPA (enrutamiento interno)
│   ├── globals.css            # Estilos globales (Tailwind + custom)
│   └── api/                   # API Routes
│       ├── decision/route.ts  # API endpoint para Decision Engine
│       └── workout/route.ts   # API endpoint para generación de rutinas
├── components/
│   ├── ui/                    # Componentes base (Button, Card, Badge, Slider, Ring, Icons, Toast)
│   ├── layout/                # AppLayout, Header, NavBar
│   ├── onboarding/            # WelcomeScreen, OnboardingScreen
│   ├── training/              # HomeScreen (check-in visual 3 taps + plan), SessionScreen,
│   │                             SummaryScreen, KaraokeText (TTS palabra a palabra),
│   │                             MicroFeedback (3 preguntas de 1 tap), ExerciseExplainer
│   ├── coach/                 # CoachScreen (chat con LLM local)
│   ├── progress/              # ProgressScreen (heatmap, stats), JardinScreen (sin rachas que romper)
│   └── profile/               # ProfileScreen
├── lib/
│   ├── agents/                →  Todo en decision-engine.ts
│   │   └── decision-engine.ts # DecisionEngine, TrainingAgent, MotivationEngine,
│   │                             RecoveryEngine (calculateRecoveryScore),
│   │                             HabitEngine (calculateConsistency),
│   │                             updateTwin
│   ├── ai/
│   │   ├── local-llm.ts       # LocalLLM — singleton de Transformers.js (Qwen2.5)
│   │   └── coach.ts           # CoachAgent — solo comunica, nunca decide
│   ├── auth/
│   │   └── supabase-auth.ts   # signInWithEmail, signUpWithEmail, signInWithGoogle, etc.
│   ├── db/
│   │   ├── supabase.ts        # Cliente Supabase para el navegador (Proxy lazy)
│   │   ├── supabase-server.ts # Cliente Supabase para Server Components
│   │   └── supabase-middleware.ts  # Cliente para middleware.ts
│   ├── sync/
│   │   ├── supabase-sync.ts   # Servicio de sincronización bidireccional (push/pull)
│   │   └── use-sync.ts        # Hook React para sync
│   ├── api/
│   │   └── schemas.ts         # Schemas Zod para validación de API requests
│   ├── store/
│   │   └── index.ts           # Zustand store con persistencia
│   ├── emotional-mode.ts      # Deducción del modo emocional desde el check-in (nunca un menú)
│   └── utils/
│       ├── helpers.ts          # Utility functions (clamp, ema, uid, fmtTime, etc.)
│       ├── exercises.ts        # Catálogo de ejercicios (70+)
│       ├── constants.ts        # Constantes (FOCUS_MUSCLES, etc.)
│       ├── speech.ts           # TTS con resaltado palabra a palabra (onboundary + fallback ritmo)
│       └── voice-lines.ts      # Líneas de voz del TTS (cubiertas por el philosophy-guard)
├── types/
│   └── index.ts               # Interfaces TypeScript (Profile, Workout, DigitalTwin, etc.)
├── hooks/
│   └── use-client-store.ts    # Hook para acceso al store en cliente
├── middleware.ts               # Next.js middleware (protección de rutas)
└── __tests__/
    ├── setup.ts               # Setup global de tests (mocks, store reset)
    └── philosophy-guard.test.ts  # Guard de filosofía: escanea traducciones + voice-lines
public/
├── manifest.json               # PWA manifest
└── sw.js                       # Service Worker (offline)
supabase/
└── migrations/
    ├── 001_initial_schema.sql   # Esquema PostgreSQL (profiles, workouts, checkins, etc.)
    └── 002_seed_exercises.sql   # Seed de 70+ ejercicios
```

## Arquitectura IA

### 1. Recovery Engine (`decision-engine.ts`)
- `calculateRecoveryScore(checkin)` → score (0-100)
- Pesos: sueño 40%, energía 30%, estrés 30%
- Clampeo y normalización de inputs

### 2. Habit Engine (`decision-engine.ts`)
- `calculateConsistency(sessions, targetPerWeek)` → HabitScore
- Ventana móvil de 30 días
- Sin rachas tradicionales

### 3. Decision Engine (`decision-engine.ts`) — 80% determinista
- `DecisionEngine.decide(input)` → `{ action, intensity, duration, reasons, confidence }`
- Acciones: `train` | `restore`
- Intensidades: `minimal` → `light` → `standard` → `push`
- Factores: recuperación, consistencia, patrones de abandono, progresión disponible

### 4. Training Agent (`decision-engine.ts`)
- `TrainingAgent.generate(decision, twin, equipment, lastFocus?)` → `{ focus, exercises, title, ... }`
- Rotación muscular automática (full → upper → lower → core)
- Progresión automática (+2 reps en ejercicios dominados)
- Soporte para 3 niveles de equipo: ninguno, mancuernas, gimnasio
- Ejercicios basados en catálogo de 70+ con metadata (carga cognitiva, grupo muscular, emoji, cue)

### 5. Motivation Engine (`decision-engine.ts`)
- `MotivationEngine.message(style, recovery, consistency, duration)` → string motivacional
- `MotivationEngine.restMessage(style)` → string para días de descanso
- Estilos: `data` | `energy` | `direct` | `calm`
- Estilo elegido adaptable según feedback del usuario (summary screen)

### 6. Coach Agent (`lib/ai/coach.ts`) — solo comunica
- `CoachAgent.getGreeting()` → saludo contextual
- `CoachAgent.reply(text)` → respuesta (LLM local con fallback rule-based)
- NO decide — solo interpreta y comunica las decisiones de los motores
- 5% del sistema

### 7. Local LLM (`lib/ai/local-llm.ts`)
- Singleton: `LocalLLM.getInstance()`
- Modelo: Qwen2.5-1.5B-Instruct (cuantizado q4)
- Motor: Transformers.js (HuggingFace) en el navegador
- Caché automático en IndexedDB
- Fallback graceful si el modelo no está disponible

## Principios de diseño

- Máximo 3 opciones visibles por pantalla
- Botones grandes (min 56px altura)
- Feedback inmediato
- Cero sensación de fracaso
- Diseño mobile-first (max-width 440px)
- Dark mode nativo
- Offline-first con Zustand persist
- Sync opcional con Supabase

## FILOSOFÍA (NO VIOLABLE)

- Una rutina, un botón, cero decisiones. Los modos emocionales se DEDUCEN, nunca son menú.
- Sin rachas, sin culpa, sin comparaciones punitivas, sin urgencia falsa, sin venta agresiva.
- Recargar es parte del progreso: toda salida (Saltar/Pausa/Terminar aquí) termina en mensaje amable.
- Primera rutina del día 1: siempre 2 min y siempre completable (victoria garantizada).
- Estado = ansiedad/tristeza profunda/bloqueo → nunca HIIT: respiración/estiramiento/silla/grounding
  + "Esto no reemplaza apoyo profesional."

## COPY

- Español claro y literal, sin jerga de gym, sin ironía.
- Declarativo/invitacional, nunca imperativo ("Esta es tu opción de hoy", no "¡Haz esto!").
- Todo string de UI pasa por i18n; nunca mezclar idiomas en una pantalla.
- `src/__tests__/philosophy-guard.test.ts` escanea traducciones + `voice-lines.ts`: sin obligación,
  culpa encubierta, rachas (fuera de reencuadre), comparación social, ranking, shaming ni urgencia falsa.
  Excepciones deliberadas viven en `ALLOWED_REFRAMES` (reencuadres) o `PENDING_S7_REDESIGN` (rachas/ranking).

## PRIVACIDAD

- Local-first: ningún dato sale del dispositivo sin opt-in explícito.
- Sin registro obligatorio; perfil siempre opcional.
- Telemetría nueva → agregada on-device + toggle opt-in, sin excepciones.
- `e2e/default-flow-clean.spec.ts` verifica que el flujo default (sin registro) no llama a Supabase jamás.

## INVARIANTES DEL TWIN (anti-regresión)

- Múltiples campos del twin se aplican en UN solo setTwin (evita lost-updates;
  caso real: micro-feedback pisaba motivation_style).
- recovery_score se computa SIEMPRE del modelo final, nunca del preview del render.

## COMPONENTES

- UNA instancia de useSpeech por pantalla, pasada por props.
- Flipbook: respeta prefers-reduced-motion; fallback a foto estática si no hay frames.
- Componente interactivo nuevo → tests de a11y en `src/__tests__/accessibility` + targets ≥44px.

## I18N

- Descripciones on-device: traducir UNA vez con el LLM local, cachear, servir de caché.

## DEFINITION OF DONE

tsc ✅ · eslint ✅ · vitest ✅ · playwright (contra `next build && next start`) ✅
· sin violaciones de FILOSOFÍA/COPY (revisar mensajes nuevos contra la librería sin culpa).

## HOUSEKEEPING

- Todo cambio de deps/config actualiza este archivo en el mismo PR.
- Última verificación: 2026-08-13 · 72 archivos / 1020 tests unitarios · 30 specs e2e.

## Tests

Unitarios — Vitest + Testing Library: **72 archivos · 1020 tests** (`npm test`).

| Área | Archivos | Suites destacadas |
|---|---|---|
| `src/lib` (agents, api, awards, audio, db, pose, store, sync, system, utils, emocional) | 35 | helpers (101), achievements (90), selector-engine (30), exercise-visuals (30), pose-engine (28), decision-flow-integration (26) |
| `src/components` (ui, training, onboarding, coach, progress, profile, awards, neurofit) | 22 | muscle-icons (39+24+16+13), exercise-explainer (25), form-check (22), onboarding-screen (17) |
| `src/__tests__` (flujos integrales, accesibilidad, temas, i18n, filosofía) | 12 | accessibility (45), full-flow (13), philosophy-guard (9) |
| `src/app` (docs, error-pages, loading) | 3 | boundaries-i18n (15), error-pages (14) |

E2E — Playwright: **30 specs** (`npm run test:e2e`), incluido `e2e/default-flow-clean.spec.ts`
(flujo default sin registro: sin ranking/peso/catálogo y sin llamadas a Supabase).
Idealmente contra `next build && next start` (el portal devtools de Next dev puede interceptar
clicks; los helpers de navegación en `e2e/helpers.ts` lo descartan con `dismissPortal`).

## Sincronización con Supabase

- `lib/sync/supabase-sync.ts` → `SupabaseSyncService` (singleton)
- Push: upsert de profile, neuro_profile, digital_twin, workouts, checkins
- Pull: descarga de todos los datos del usuario autenticado
- Estrategia offline-first: el store local es la fuente de verdad
- Sync en background al hacer check-in, completar onboarding, o terminar sesión

## API Routes

- `POST /api/decision` → Decision Engine (decidir intensidad/duración)
- `POST /api/workout` → Training Agent (generar rutina)
- Validación con Zod schemas en `lib/api/schemas.ts`
