-- CHISPA — Migration 010: Weight history & scale-consistency achievements
-- Historial de peso con fecha (una entrada por día) + logros de constancia.
-- Idempotente: IF NOT EXISTS / ON CONFLICT DO NOTHING.

-- ── 1. Tabla weight_log ──
create table if not exists public.weight_log (
  user_id uuid references public.users on delete cascade not null,
  date date not null,
  weight_kg numeric(5,1) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, date)
);

create index if not exists idx_weight_log_user_date on public.weight_log(user_id, date desc);

alter table public.weight_log enable row level security;
create policy "Weight log: own data" on public.weight_log for all using (auth.uid() = user_id);

-- ── 2. Logros de constancia en la báscula (categoría 'body') ──
insert into public.achievements (id, category, name, description, icon, tier, condition_type, condition_value, sort_order) values
  ('peso_5',  'body', 'Ritmo de báscula',    'Registra tu peso 5 veces',   'Scale', 'uncommon', 'weight_entries_count', '{"min": 5}',  31),
  ('peso_20', 'body', 'Maestro de la báscula', 'Registra tu peso 20 veces', 'Scale', 'rare',     'weight_entries_count', '{"min": 20}', 32)
on conflict (id) do nothing;
