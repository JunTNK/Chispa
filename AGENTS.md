# CHISPA — Guía del proyecto

## Stack

| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js 15 (App Router, React 19, TypeScript) |
| **Estilos** | Tailwind CSS v3 |
| **Estado** | Zustand v5 (persistente en localStorage) |
| **Animación** | Framer Motion |
| **Base de datos** | Supabase (PostgreSQL + Auth) |
| **Offline** | Service Worker + Zustand persist |
| **Tests** | Vitest + Testing Library |
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
| `tailwind.config.ts` | Configuración de Tailwind (animaciones, colores, sombras) |
| `vitest.config.ts` | Configuración de Vitest (jsdom, aliases, plugins) |
| `next.config.ts` | Configuración de Next.js (images remotePatterns, webpack, headers) |
| `postcss.config.mjs` | PostCSS con Tailwind y Autoprefixer |
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
│   ├── training/              # HomeScreen (check-in + plan), SessionScreen, SummaryScreen
│   ├── coach/                 # CoachScreen (chat con LLM local)
│   ├── progress/              # ProgressScreen (heatmap, stats)
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
│   └── utils/
│       ├── helpers.ts          # Utility functions (clamp, ema, uid, fmtTime, etc.)
│       ├── exercises.ts        # Catálogo de ejercicios (70+)
│       └── constants.ts        # Constantes (FOCUS_MUSCLES, etc.)
├── types/
│   └── index.ts               # Interfaces TypeScript (Profile, Workout, DigitalTwin, etc.)
├── hooks/
│   └── use-client-store.ts    # Hook para acceso al store en cliente
├── middleware.ts               # Next.js middleware (protección de rutas)
└── __tests__/
    └── setup.ts               # Setup global de tests (mocks, store reset)
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

## Tests

```
src/lib/agents/__tests__/decision-engine.test.ts   — 16 tests (Recovery, Consistency, Decide, Motivation)
src/lib/api/__tests__/schemas.test.ts               — 15 tests (Zod schemas)
src/components/onboarding/__tests__/onboarding-screen.test.tsx  — 7 tests (5-step flow)
src/components/coach/__tests__/coach-screen.test.tsx            — 5 tests (header, questions, send)
src/components/training/__tests__/session-screen.test.tsx       — 7 tests (render, reps, buttons)
```

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
