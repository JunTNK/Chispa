-- CHISPA — Migration 004: Quest State (NEUROFIT)
-- Run this in Supabase SQL Editor or via `supabase db push`
-- Created: July 2026

-- ═══════════════════════════════════════════════════════════
-- TABLE
-- ═══════════════════════════════════════════════════════════

create table if not exists public.quest_states (
  user_id uuid references public.users on delete cascade primary key,
  selected_theme text not null default 'one_piece',
  vault_claims jsonb not null default '{}',
  boss_defeated_this_week boolean not null default false,
  boss_defeated_count integer not null default 0,
  last_boss_defeat_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table public.quest_states enable row level security;

create policy "Quest states: own data" on public.quest_states for all using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- TRIGGER
-- ═══════════════════════════════════════════════════════════

create trigger handle_quest_states_updated_at
  before update on public.quest_states
  for each row execute procedure public.handle_updated_at();
