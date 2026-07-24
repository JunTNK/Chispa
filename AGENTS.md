# CHISPA - Desarrollo

## Stack
- **Frontend**: Next.js 15 (React 19, TypeScript, Tailwind CSS v4)
- **State**: Zustand v5 (persistente en localStorage)
- **UI**: Radix UI primitives + componentes propios
- **Animación**: Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Storage - próximamente)
- **IA**: 80% algoritmos deterministas | 15% agentes | 5% LLM

## Comandos

```bash
# Desarrollo
npm run dev

# Build producción
npm run build

# Producción local
npm run start

# Lint
npm run lint
```

## Estructura del proyecto

```
src/
├── app/                  # App Router (Next.js 15)
│   ├── layout.tsx        # Layout raíz con fuentes, PWA, metadata
│   ├── page.tsx          # Página única SPA (enrutamiento interno)
│   └── globals.css       # Estilos globales (Tailwind + custom)
├── components/
│   ├── ui/               # Componentes base (Button, Card, Badge, ring, icons)
│   ├── layout/           # AppLayout, Header, NavBar
│   ├── onboarding/       # WelcomeScreen, OnboardingScreen
│   ├── training/         # HomeScreen, SessionScreen, SummaryScreen
│   ├── coach/            # CoachScreen (chat con LLM-local)
│   ├── progress/         # ProgressScreen
│   └── profile/          # ProfileScreen
├── lib/
│   ├── agents/           # Decision Engine, Training Agent, Habit Engine
│   ├── ai/               # Coach LLM (solo comunicacion)
│   ├── db/               # Supabase client
│   ├── store/            # Zustand store
│   └── utils/            # helpers, constants, exercises catalog
├── types/                # TypeScript interfaces
└── hooks/                # React hooks
public/
├── manifest.json         # PWA manifest
└── sw.js                 # Service Worker (offline)
supabase/
└── schema.sql            # Base de datos PostgreSQL
```

## Arquitectura IA

1. **Decision Engine** (`lib/agents/decision-engine.ts`): 
   - 80% determinista: reglas basadas en recuperación, consistencia, patrones
   - Decide intensidad, duración y tipo de sesión

2. **Training Agent** (`lib/agents/decision-engine.ts`):
   - Genera rutinas según equipo, objetivo y rotación muscular
   - Aplica progresión automática

3. **Habit Engine** (`lib/agents/decision-engine.ts`):
   - Consistency Score (30 días móviles)
   - Sin rachas tradicionales

4. **Coach LLM** (`lib/ai/coach.ts`):
   - 5% del sistema
   - Solo comunica, nunca decide
   - Respuestas basadas en patrones

## Principios de diseño
- Máximo 3 opciones visibles por pantalla
- Botones grandes (min 56px altura)
- Feedback inmediato
- Cero sensación de fracaso
- Diseño mobile-first (max-width 440px)
- Dark mode nativo
