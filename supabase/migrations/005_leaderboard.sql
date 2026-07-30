-- CHISPA — Migration 005: Anonymous Leaderboard
-- Run this in Supabase SQL Editor or via `supabase db push`
-- Created: July 2026

-- ═══════════════════════════════════════════════════════════
-- TABLE
-- ═══════════════════════════════════════════════════════════
-- Stores only XP & level — NO names, NO personal data.
-- The leaderboard is anonymous in both directions:
--   • Read: anyone can see the rankings (no names exposed)
--   • Write: only own row can be updated (RLS)

create table if not exists public.leaderboard (
  user_id uuid references public.users on delete cascade primary key,
  total_xp integer not null default 0,
  level integer not null default 1,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ═══════════════════════════════════════════════════════════
-- INDEX
-- ═══════════════════════════════════════════════════════════
create index if not exists idx_leaderboard_xp on public.leaderboard (total_xp desc);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table public.leaderboard enable row level security;

-- Anyone can read the leaderboard (anonymous)
create policy "Leaderboard: anyone can read"
  on public.leaderboard for select
  using (true);

-- Only own row can be inserted/updated
create policy "Leaderboard: own upsert"
  on public.leaderboard for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- TRIGGER
-- ═══════════════════════════════════════════════════════════

create trigger handle_leaderboard_updated_at
  before update on public.leaderboard
  for each row execute procedure public.handle_updated_at();
