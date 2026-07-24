# CHISPA — Setup Guide

## 1. Supabase (Database + Auth)

### Create a project

1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Click **New project**
3. Choose a name (e.g., `chispa`), a strong database password, and your region
4. Wait ~2 minutes for the project to provision

### Configure Authentication

1. In the Supabase dashboard, go to **Authentication → Providers**
2. Under **Email**, make sure it's enabled
3. (Optional) Enable **Google** provider:
   - You'll need a Google Cloud Console OAuth client ID
   - Set the redirect URL to `https://[your-project].supabase.co/auth/v1/callback`

### Get your API keys

1. Go to **Project Settings → API**
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy the **anon public** key
4. Also copy the **service_role** key (keep this secret — server-side only!)

### Run migrations

There are two ways:

#### Option A: Supabase SQL Editor (easier)
1. In the dashboard, go to **SQL Editor**
2. Open `supabase/migrations/001_initial_schema.sql` and paste it
3. Click **Run** — this creates all tables, indexes, RLS policies, and triggers
4. Then open `supabase/migrations/002_seed_exercises.sql` and run it
5. This populates the exercises catalog (~70 exercises)

#### Option B: Supabase CLI (advanced)
```bash
# Install the CLI
npm install -g supabase

# Link your project
supabase link --project-ref <your-project-ref>

# Push migrations
supabase db push
```

### Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with the values from your Supabase project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_SUPABASE_PROJECT_REF=xxxxx
```

## 2. Run the app locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app works **fully offline** without Supabase (local-first using Zustand persist + mock client). Supabase is only needed for syncing data between devices.

## 3. Deploy to Vercel (production)

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add the same environment variables from `.env.local` in Vercel's dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

## Architecture notes

```
80% Algoritmos deterministas  → Decision Engine, Training Agent, Recovery Engine
15% Modelos especializados    → Habit Engine, Digital Twin, Motivation Engine
 5% LLM conversacional        → Coach Agent (solo comunica, nunca decide)
```

- All AI logic runs **client-side** (local-first)
- Supabase is used for auth + optional data sync
- The app works offline with full functionality
