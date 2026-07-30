-- CHISPA — Migration 006: Fix missing columns & add neuro_profiles
-- Run this in Supabase SQL Editor or via `supabase db push`
-- Created: July 2026
--
-- 🔧 Fixes schema mismatches between the application code and the database:
--   1. Adds missing columns to `workouts` (planned_minutes, planned_sets, done_sets, adapted)
--   2. Adds missing columns to `profiles` (name, chronotype, medication, medication_time)
--   3. Creates `neuro_profiles` table (referenced by sync code but missing from migrations)

-- ═══════════════════════════════════════════════════════════
-- 1. workouts: add missing columns referenced by supabase-sync.ts
-- ═══════════════════════════════════════════════════════════

alter table if exists public.workouts
  add column if not exists planned_minutes integer,
  add column if not exists planned_sets integer default 0,
  add column if not exists done_sets integer default 0,
  add column if not exists adapted boolean default false;

comment on column public.workouts.planned_minutes is 'Planned duration in minutes (set before session)';
comment on column public.workouts.planned_sets is 'Total sets planned across all exercises';
comment on column public.workouts.done_sets is 'Sets actually completed';
comment on column public.workouts.adapted is 'Whether intensity was adapted mid-session';

-- ═══════════════════════════════════════════════════════════
-- 2. profiles: add missing columns referenced by supabase-sync.ts
-- ═══════════════════════════════════════════════════════════

alter table if exists public.profiles
  add column if not exists name text not null default '',
  add column if not exists chronotype text check (chronotype in ('leon', 'lobo')),
  add column if not exists medication text check (medication in ('no', 'short', 'long')),
  add column if not exists medication_time text;

comment on column public.profiles.name is 'Display name (from auth metadata or user input)';
comment on column public.profiles.chronotype is '🌅 Chronotype: león (morning person) or lobo (night person)';
comment on column public.profiles.medication is '💊 Medication type: none, short-acting (3-4h), or long-acting (6-8h)';
comment on column public.profiles.medication_time is '⏰ Medication intake time in HH:MM format';

-- ═══════════════════════════════════════════════════════════
-- 3. neuro_profiles: new table (referenced by sync code but missing from migrations)
-- ═══════════════════════════════════════════════════════════

create table if not exists public.neuro_profiles (
  user_id uuid references public.users on delete cascade primary key,
  type text not null,
  duration_minutes integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table public.neuro_profiles is 'Neurodivergent profile — set once during onboarding';
comment on column public.neuro_profiles.type is 'Neurotype identifier (adh-c, adh-i, audhd, spd, curious, other)';
comment on column public.neuro_profiles.duration_minutes is 'Preferred session duration for this neurotype';

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

create index if not exists idx_workouts_planned on public.workouts(planned_minutes, adapted);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table public.neuro_profiles enable row level security;

create policy "Neuro profiles: own data" on public.neuro_profiles
  for all using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- TRIGGER
-- ═══════════════════════════════════════════════════════════

create trigger handle_neuro_profiles_updated_at
  before update on public.neuro_profiles
  for each row execute procedure public.handle_updated_at();
