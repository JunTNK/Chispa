-- CHISPA — Migration 011: Movement achievements replace body-measurement rewards
-- Filosofía CHISPA (cero culpa): NUNCA se gamifican datos corporales.
-- Los logros ligados a peso/medidas se retiran y se sustituyen por logros de
-- movimiento (no presionan sobre el cuerpo). Idempotente.
--
-- Sustituye: peso_registrado, perfil_corporal, peso_5, peso_20 (categoría 'body')
-- Por:        movimiento_7 (7 días distintos) y rutina_nueva (3 tipos de rutina)

-- ── 1. Retira los logros de medidas corporales del catálogo ──
delete from public.achievements where id in ('peso_registrado', 'perfil_corporal', 'peso_5', 'peso_20');

-- ── 1b. El check de categoría debe aceptar 'movimiento' (y ya no 'body'):
--       la migración 009 lo definió con 'body', que ya no se usa.
-- ──
alter table public.achievements drop constraint if exists achievements_category_check;
alter table public.achievements
  add constraint achievements_category_check
  check (category in ('workouts', 'streak', 'intensity', 'focus', 'completion', 'level', 'boss', 'hidden', 'movimiento'));

-- ── 2. Nuevos logros de movimiento (categoría 'movimiento') ──
insert into public.achievements (id, category, name, description, icon, tier, condition_type, condition_value, sort_order) values
  ('movimiento_7', 'movimiento', 'Ritmo de movimiento',    'Muévete en 7 días distintos (no tienen que ser seguidos)', 'Footprints', 'uncommon', 'movement_days', '{"min": 7}', 31),
  ('rutina_nueva', 'movimiento', 'Explorador de rutinas',  'Prueba 3 tipos de rutina diferentes',                      'Compass',    'rare',     'focus_variety', '{"min": 3}', 32)
on conflict (id) do nothing;

-- ── 3. Limpia desbloqueos huérfanos de los logros retirados ──
delete from public.user_achievements where achievement_id in ('peso_registrado', 'perfil_corporal', 'peso_5', 'peso_20');
