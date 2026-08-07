-- CHISPA — Migration 014: Remove 'otro' option from sex column
-- Elimina la opción 'otro' del sexo registrado y migra datos existentes.
-- Coherente con el tipo TypeScript Profile.sex ('masculino' | 'femenino').
-- Idempotent: safe to run multiple times.

-- 1. Migrar datos existentes: 'otro' → NULL
update public.profiles
  set sex = null
  where sex = 'otro';

-- 2. Actualizar check constraint (solo permite masculino/femenino)
alter table public.profiles 
  drop constraint if exists profiles_sex_check;
alter table public.profiles
  add constraint profiles_sex_check
  check (sex in ('masculino', 'femenino'));
