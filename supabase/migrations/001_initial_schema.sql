-- CHISPA — Migration 001: Initial Schema
-- Run this in Supabase SQL Editor or via `supabase db push`
-- Created: July 2026

-- Enable required extensions
create extension if not exists "uuid-ossp";
-- pgvector extension is optional — enable if you need vector embeddings
-- create extension if not exists "pgvector";

-- ═══════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════

-- Users table (extends auth.users)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null,
  birthdate date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles table
create table if not exists public.profiles (
  user_id uuid references public.users on delete cascade primary key,
  goal text check (goal in ('fuerza', 'energia', 'grasa')) not null,
  level text check (level in ('inicio', 'medio', 'regular')) not null,
  equipment text check (equipment in ('ninguno', 'mancuernas', 'gimnasio')) not null,
  limitations text[] default '{}',
  days_per_week text check (days_per_week in ('2-3', '4-5', 'flex')) not null,
  neurotype text check (neurotype in ('tdah', 'neuro', 'nose')) not null,
  preferred_duration integer check (preferred_duration in (10, 20, 30)) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Exercises catalog
create table if not exists public.exercises (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  muscle text not null,
  difficulty integer check (difficulty in (1, 2, 3)) not null,
  equipment text check (equipment in ('ninguno', 'mancuernas', 'gimnasio')) not null,
  video_url text,
  instructions text not null,
  load_type text check (load_type in ('reps', 'time')) not null,
  cognitive_load text check (cognitive_load in ('low', 'med', 'high')) not null,
  emoji text not null,
  cue text not null,
  secondary_muscles text[] default '{}',
  -- embedding vector(1536),  -- requires pgvector extension
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workouts
create table if not exists public.workouts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  date date not null,
  duration integer not null,
  focus text check (focus in ('full', 'upper', 'lower', 'core')) not null,
  intensity text check (intensity in ('minimal', 'light', 'standard', 'push')) not null,
  score integer default 0,
  completed_rate numeric(3,2) default 0,
  exercises jsonb not null,
  actual_minutes integer default 0,
  rpe text check (rpe in ('suave', 'justo', 'duro')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Daily check-ins
create table if not exists public.checkins (
  user_id uuid references public.users on delete cascade not null,
  date date not null,
  sleep numeric(3,1) check (sleep >= 3 and sleep <= 10) not null,
  energy integer check (energy >= 1 and energy <= 10) not null,
  stress integer check (stress >= 1 and stress <= 10) not null,
  recovery_score integer check (recovery_score >= 0 and recovery_score <= 100) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, date)
);

-- Digital Twin (user memory/behavior model)
create table if not exists public.digital_twins (
  user_id uuid references public.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  training_style text,
  motivation_style text check (motivation_style in ('data', 'energy', 'direct', 'calm')) default 'data',
  avoid text[] default '{}',
  best_time text,
  patterns jsonb not null default '{}',
  ex_progress jsonb not null default '{}',
  motiv_weights jsonb not null default '{"data": 1, "energy": 1, "direct": 1, "calm": 1}'
);

-- Recovery scores
create table if not exists public.recovery_scores (
  user_id uuid references public.users on delete cascade not null,
  date date not null,
  score integer check (score >= 0 and score <= 100) not null,
  sleep_contribution integer not null,
  energy_contribution integer not null,
  stress_contribution integer not null,
  hrv numeric(5,1),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, date)
);

-- Habit scores (30-day rolling)
create table if not exists public.habit_scores (
  user_id uuid references public.users on delete cascade not null,
  period_start date not null,
  period_end date not null,
  consistency_pct numeric(5,2) not null,
  sessions_done integer not null,
  sessions_target integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, period_start)
);

-- Behavior memory (learned patterns)
create table if not exists public.behavior_memory (
  user_id uuid references public.users on delete cascade not null,
  pattern text not null,
  confidence numeric(3,2) check (confidence >= 0 and confidence <= 1) not null,
  data jsonb not null default '{}',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, pattern)
);

-- AI Events (audit trail for decision engine)
create table if not exists public.ai_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  event text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  decision jsonb not null,
  agent text not null
);

-- Chat messages
create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

create index if not exists idx_workouts_user_date on public.workouts(user_id, date desc);
create index if not exists idx_checkins_user_date on public.checkins(user_id, date desc);
create index if not exists idx_recovery_user_date on public.recovery_scores(user_id, date desc);
create index if not exists idx_ai_events_user_time on public.ai_events(user_id, timestamp desc);
create index if not exists idx_chat_user_time on public.chat_messages(user_id, timestamp desc);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.checkins enable row level security;
alter table public.digital_twins enable row level security;
alter table public.recovery_scores enable row level security;
alter table public.habit_scores enable row level security;
alter table public.behavior_memory enable row level security;
alter table public.ai_events enable row level security;
alter table public.chat_messages enable row level security;

-- Users can only see their own data
create policy "Users can view own data" on public.users for select using (auth.uid() = id);
create policy "Users can update own data" on public.users for update using (auth.uid() = id);

create policy "Profiles: own data" on public.profiles for all using (auth.uid() = user_id);
create policy "Workouts: own data" on public.workouts for all using (auth.uid() = user_id);
create policy "Checkins: own data" on public.checkins for all using (auth.uid() = user_id);
create policy "Digital twins: own data" on public.digital_twins for all using (auth.uid() = user_id);
create policy "Recovery scores: own data" on public.recovery_scores for all using (auth.uid() = user_id);
create policy "Habit scores: own data" on public.habit_scores for all using (auth.uid() = user_id);
create policy "Behavior memory: own data" on public.behavior_memory for all using (auth.uid() = user_id);
create policy "AI events: own data" on public.ai_events for all using (auth.uid() = user_id);
create policy "Chat messages: own data" on public.chat_messages for all using (auth.uid() = user_id);

-- Exercises are public read (no auth needed for the catalog)
create policy "Exercises: public read" on public.exercises for select using (true);

-- ═══════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end $$;

create trigger handle_users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_digital_twins_updated_at
  before update on public.digital_twins
  for each row execute procedure public.handle_updated_at();
