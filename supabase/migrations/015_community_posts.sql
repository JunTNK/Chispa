-- ═══════════════════════════════════════════════════════════
-- MIGRATION 015: Community feed (feed social cooperativo)
-- Chispas de entrenamiento compartidas. Cooperativo: todos leen,
-- cada quien inserta las suyas. Sin competencia: sin scores ni rachas.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  author_id text not null default '',
  kind text not null check (kind in ('workout', 'quicklog')),
  focus text,
  duration_min int,
  created_at timestamptz not null default now()
);

create index if not exists community_posts_created_at_idx
  on public.community_posts (created_at desc);

alter table public.community_posts enable row level security;

-- Cooperativo: cualquier usuario autenticado puede leer el feed
create policy "community_posts_select_all" on public.community_posts
  for select using (auth.role() = 'authenticated');

-- Cada usuario inserta sus propias chispas
create policy "community_posts_insert_own" on public.community_posts
  for insert with check (auth.uid() = user_id);
