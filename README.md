# CHISPA ⚡

Tu entrenador personal con IA — adaptado a tu neurotipo, motivación y ritmo.

---

## 🚀 Primeros pasos

```bash
npm install
npm run dev        # → http://localhost:3000
```

Scripts disponibles:

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servidor de producción |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests E2E (Playwright) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript checks |

---

## 📁 Estructura del proyecto

```
src/
├── app/              # Páginas y rutas Next.js App Router
├── components/
│   ├── auth/         # Login / registro
│   ├── awards/       # Logros, leaderboard
│   ├── coach/        # Chat con IA
│   ├── layout/       # Navbar, header, app shell
│   ├── neurofit/     # Sistema, quests, dopamina
│   ├── onboarding/   # Flujo de bienvenida
│   ├── profile/      # Perfil y ajustes
│   ├── progress/     # Estadísticas y progreso
│   ├── training/     # Home, sesión, resumen, creación
│   └── ui/           # Componentes atómicos reutilizables
├── hooks/            # Custom hooks globales
├── lib/
│   ├── agents/       # Lógica de IA (decisión, motivación, hábitos)
│   ├── ai/           # Cliente LLM local + coach
│   ├── api/          # Schemas de API
│   ├── auth/         # Supabase auth
│   ├── awards/       # Evaluación de logros
│   ├── db/           # Clientes Supabase
│   ├── pose/         # Motor de pose (cámara)
│   ├── store/        # Estado global (Zustand)
│   ├── sync/         # Sincronización y leaderboard
│   └── utils/        # Utilidades compartidas
└── types/            # Tipos TypeScript globales

public/               # Activos estáticos (SVGs, imágenes)
docs/                 # 📖 Documentación de componentes
```

---

## 📖 Documentación de componentes

| Guía | Archivo | Descripción |
|---|---|---|
| 🏋️ Iconos fitness | [`docs/componentes-iconos-fitness.md`](docs/componentes-iconos-fitness.md) | FullBodyIcon, UpperBodyIcon, LowerBodyIcon, CoreCardioIcon |

---

## 🧪 Tests

```bash
# Unitarios (Vitest)
npm test

# E2E (Playwright) — requiere servidor corriendo
npm run dev          # en otra terminal
npm run test:e2e

# TypeScript
npm run typecheck
```

Los iconos fitness tienen 4 suites de test:

| Archivo | Tests |
|---|---|
| `muscle-icons.test.tsx` | 26 unitarios |
| `muscle-icons-axe.test.tsx` | 10 accesibilidad (axe-core) |
| `muscle-icons-snapshot.test.tsx` | 13 snapshots |
| `muscle-icons-regression.test.tsx` | 28 regresión estructural |

---

## 🔧 Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19 + Tailwind CSS 4
- **Animaciones:** Framer Motion
- **Estado:** Zustand
- **IA:** Transformers.js (in-browser LLM)
- **Auth/Datos:** Supabase
- **Tests:** Vitest + Testing Library + Playwright
- **Despliegue:** Netlify
