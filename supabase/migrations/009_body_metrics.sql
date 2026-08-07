-- CHISPA — Migration 009: Body metrics & body achievements
-- Añade registro de medidas corporales (peso, sexo, estatura) al perfil
-- y una categoría de logros 'body' ligada a esas medidas.
-- Idempotente: ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING.

-- ── 1. profiles: columnas de medidas corporales ──
-- Los valores se guardan SIEMPRE en métrico (canónico): kg y cm.
-- units = sistema de display preferido ('imperial' default, 'metric' opcional).
alter table public.profiles
  add column if not exists sex text check (sex in ('masculino', 'femenino', 'otro')),
  add column if not exists height_cm numeric(5,1),
  add column if not exists weight_kg numeric(5,1),
  add column if not exists units text check (units in ('imperial', 'metric')) default 'imperial';

-- ── 2. achievements: ampliar check de categoría con 'body' ──
alter table public.achievements drop constraint if exists achievements_category_check;
alter table public.achievements
  add constraint achievements_category_check
  check (category in ('workouts', 'streak', 'intensity', 'focus', 'completion', 'level', 'boss', 'hidden', 'body'));

-- ── 3. Nuevos logros de la categoría 'body' ──
insert into public.achievements (id, category, name, description, icon, tier, condition_type, condition_value, sort_order) values
  ('peso_registrado', 'body', 'Báscula', 'Registra tu peso corporal', 'Scale', 'common', 'weight_logged', '{"min": 1}', 29),
  ('perfil_corporal', 'body', 'Ficha completa', 'Registra tu sexo, peso y estatura', 'PersonStanding', 'uncommon', 'body_profile', '{"min": 3}', 30)
on conflict (id) do nothing;
