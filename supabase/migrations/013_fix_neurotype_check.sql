-- CHISPA — Migration 013: Reconcile profiles.neurotype check with the app
-- ═══════════════════════════════════════════════════════════
-- La DB real se creó con una versión antigua del migration 001 donde el
-- check de neurotype aceptaba ('tdah','neuro','nose'). La app (types, store,
-- onboarding, sync) escribe los valores modernos:
--   'adh-c', 'adh-i', 'audhd', 'spd', 'curious', 'other'
-- (el migration 001 del repo ya los usa; el check real quedó desactualizado).
-- Esta migración alinea el constraint. Idempotente.

alter table public.profiles drop constraint if exists profiles_neurotype_check;
alter table public.profiles
  add constraint profiles_neurotype_check
  check (neurotype in ('adh-c', 'adh-i', 'audhd', 'spd', 'curious', 'other'));
