# CHISPA — Guía de configuración y producción

## ⚡ Stack resumido

```
Frontend:    Next.js 15 (React 19, TypeScript, Tailwind CSS v4)
Estado:      Zustand v5 (persistente en localStorage) — local-first
Backend:     Supabase (PostgreSQL + Auth + RLS)
IA local:    Transformers.js (Qwen2.5-1.5B cuantizado) en el navegador
Offline:     Service Worker + Zustand persist
```

---

## 1. Supabase (Base de datos + Auth)

### 1.1 Crear proyecto

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta o inicia sesión
2. Click en **New project**
3. Dale un nombre (ej: `chispa`), contraseña segura y elige tu región más cercana
4. Espera ~2 minutos a que se provisione

### 1.2 Configurar Autenticación

1. En el dashboard de Supabase, ve a **Authentication → Providers**
2. Asegúrate de que **Email** esté habilitado (viene por defecto)
3. (Opcional) Habilita **Google**:
   - Necesitas un OAuth Client ID de Google Cloud Console
   - URL de redirección: `https://[tu-proyecto].supabase.co/auth/v1/callback`

### 1.3 Obtener API Keys

1. Ve a **Project Settings → API**
2. Copia el **Project URL** (ej: `https://xxxxx.supabase.co`)
3. Copia la **anon public** key
4. Copia la **service_role** key (⚠️ **SOLO server-side**, nunca la expongas al cliente)

### 1.4 Ejecutar migraciones

#### Opción A: SQL Editor (recomendada)
1. En el dashboard, ve a **SQL Editor**
2. Abre `supabase/migrations/001_initial_schema.sql`, pégalo y **Run**
   - Crea tablas, índices, políticas RLS y triggers
3. Luego abre `supabase/migrations/002_seed_exercises.sql` y ejecútalo
   - Pobla el catálogo de ejercicios (~70 ejercicios)

#### Opción B: Supabase CLI (avanzado)
```bash
npm install -g supabase
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

### 1.5 Configurar variables de entorno local

```bash
cp .env.example .env.local
```

Edita `.env.local` con los valores de tu proyecto Supabase.

---

## 2. Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

> 💡 La app funciona **completamente offline** sin Supabase gracias a Zustand persist + mock client. Supabase solo es necesaria para sincronizar datos entre dispositivos.

---

## 3. Producción — Configuración de Supabase

### 3.1 Seguridad (Row Level Security)

Las migraciones ya incluyen RLS para todas las tablas. **Verifica en producción:**

1. **Dashboard → Authentication → Settings**
   - `Secure email password change`: ✅ ON
   - `Allow disposable email domains`: ❌ OFF (recomendado)
   - `Max session duration`: 86400 (24h) o 604800 (7d)

2. **Dashboard → SQL Editor** — Ejecuta para verificar RLS:
   ```sql
   select tablename, rowsecurity from pg_tables
   where schemaname = 'public'
   and tablename not in ('exercises');
   ```
   Todas deben tener `rowsecurity = true` excepto `exercises`.

### 3.2 Políticas de seguridad adicionales (opcional)

Ejecuta en SQL Editor para recargar todas las políticas por si hiciste cambios manuales:
```sql
-- Las políticas están en 001_initial_schema.sql.
-- Para recargarlas, vuelve a ejecutar la sección RLS de esa migración.
```

### 3.3 Rate Limiting (Auth)

Supabase aplica rate limiting por defecto:
- **Email login**: 5 intentos/min por IP
- **Sign up**: 10/hora por IP
- **SMS**: 1/min por número

Para ajustar: **Authentication → Settings → Rate limiting**

---

## 4. Producción — Deploy

### Opción A: Netlify (recomendado)

El proyecto ya incluye `netlify.toml` y `@netlify/plugin-nextjs`.

1. Conecta tu repo a [Netlify](https://app.netlify.com)
2. Configura:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
3. Agrega las **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (solo si usas SSR)
4. Deploy 🚀

### Opción B: Vercel

1. Conecta tu repo a [Vercel](https://vercel.com)
2. Las variables de entorno son las mismas que arriba
3. Deploy automático con cada push a `main`

---

## 5. Arquitectura IA

```
80% Algoritmos deterministas  → Decision Engine, Training Agent, Recovery Engine
15% Modelos especializados    → Habit Engine, Digital Twin, Motivation Engine
 5% LLM conversacional        → Coach Agent (solo comunica, nunca decide)
```

- **Toda la IA** se ejecuta **client-side** (local-first, Transformers.js en el navegador)
- El LLM (Qwen2.5-1.5B) se descarga y cachea en IndexedDB
- Supabase solo se usa para: auth + sincronización opcional entre dispositivos
- La app funciona **100% offline** (sin Supabase, sin LLM descargado)

---

## 6. Resolución de problemas

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `Supabase no configurado` al loguear | `.env.local` ausente o vacío | Copia `.env.example` a `.env.local` y completa las keys |
| Error 400/401 en API | Variables incorrectas o RLS mal configurado | Verifica las keys y ejecuta migraciones otra vez |
| `Service Worker` no registra | HTTPS requerido (producción) | En local, usa `localhost`; en producción, desplegado con HTTPS |
| Modelo IA no carga | WebGPU no disponible | El Coach usa fallback rule-based automáticamente |
| Sincronización falla | Usuario no autenticado en Supabase | El check-in y entrenamientos se guardan local primero |
