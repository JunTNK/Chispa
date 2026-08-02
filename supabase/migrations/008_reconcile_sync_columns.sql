-- ═══════════════════════════════════════════════════════════
-- CHISPA — MIGRATION 008: Reconcile sync columns with app code
-- ═══════════════════════════════════════════════════════════
-- Alinea el esquema real (que quedó en el migration 001) con los
-- nombres de columna que escribe/lee src/lib/sync/supabase-sync.ts:
--   • digital_twins.ex_progress  → exercise_progress
--   • digital_twins.avoid        → avoid_patterns
--   • digital_twins +best_hours (jsonb; best_time queda como legado)
--   • digital_twins +preferred_duration, +confidence
--   • checkins.sleep             → sleep_hours
--   • profiles.neurotype / preferred_duration: NOT NULL sin default que
--     el push omite → se les pone default
--   • workouts.duration: NOT NULL sin default que el push omite (usa
--     planned_minutes) → se le pone default
-- Idempotente: usa DO blocks para renombrados y IF NOT EXISTS para adds.
-- ═══════════════════════════════════════════════════════════

-- ── 1. digital_twins: ex_progress → exercise_progress ──
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'digital_twins' and column_name = 'ex_progress'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'digital_twins' and column_name = 'exercise_progress'
  ) then
    alter table public.digital_twins rename column ex_progress to exercise_progress;
  end if;
end $$;

-- ── 2. digital_twins: avoid → avoid_patterns ──
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'digital_twins' and column_name = 'avoid'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'digital_twins' and column_name = 'avoid_patterns'
  ) then
    alter table public.digital_twins rename column avoid to avoid_patterns;
  end if;
end $$;

-- ── 3. digital_twins: columnas que el push escribe y no existían ──
alter table public.digital_twins
  add column if not exists best_hours jsonb not null default '{}';

alter table public.digital_twins
  add column if not exists preferred_duration integer;

alter table public.digital_twins
  add column if not exists confidence integer default 50;

-- ── 4. checkins: sleep → sleep_hours (el código usa sleep_hours) ──
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'checkins' and column_name = 'sleep'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'checkins' and column_name = 'sleep_hours'
  ) then
    alter table public.checkins rename column sleep to sleep_hours;
  end if;
end $$;

-- Re-asegura el rango del check original (el rename lo arrastra, pero por
-- claridad/seguridad se declara explícitamente).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'checkins_sleep_hours_check' and conrelid = 'public.checkins'::regclass
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'checkins' and column_name = 'sleep_hours'
  ) then
    alter table public.checkins
      add constraint checkins_sleep_hours_check check (sleep_hours >= 3 and sleep_hours <= 10);
  end if;
end $$;

-- ── 5. profiles: defaults para NOT NULL sin default (el push no los envía) ──
alter table public.profiles alter column neurotype set default 'other';
alter table public.profiles alter column preferred_duration set default 20;

-- ── 6. workouts: duration NOT NULL sin default (el push usa planned_minutes) ──
alter table public.workouts alter column duration set default 0;

-- ═══════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════
do $$
declare
  col text;
begin
  select string_agg(column_name, ', ' order by column_name)
    into col
    from information_schema.columns
    where table_schema = 'public' and table_name = 'digital_twins'
      and column_name in ('exercise_progress', 'avoid_patterns', 'best_hours', 'preferred_duration', 'confidence');
  raise notice '✅ Migration 008 OK — digital_twins: %', coalesce(col, 'MISSING');
  select string_agg(column_name, ', ' order by column_name)
    into col
    from information_schema.columns
    where table_schema = 'public' and table_name = 'checkins'
      and column_name = 'sleep_hours';
  raise notice '   checkins: %', coalesce(col, 'MISSING');
end $$;
