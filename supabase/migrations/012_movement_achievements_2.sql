-- CHISPA — Migration 012: More movement achievements (mini victory, 5-day streak, intensity variety)
-- Idempotente: on conflict (id) do nothing.
-- Mini victoria (sesión de 1 min), 5 días seguidos sin culpa, 4 intensidades en 2 semanas.

insert into public.achievements (id, category, name, description, icon, tier, condition_type, condition_value, sort_order) values
  ('mini_victoria',    'movimiento', 'Mini victoria',        'Completa una sesión de 1 minuto. Un minuto cuenta.',               'Sparkles',  'common',   'min_session',        '{"min": 1}',          33),
  ('cinco_seguidos',   'movimiento', 'Cinco días en movimiento', 'Muévete en 5 días distintos dentro de una semana.',          'HeartPulse', 'uncommon', 'windowed_days',      '{"min_days": 5, "window_days": 7}', 34),
  ('intensidades_2sem','movimiento', 'Variedad en 2 semanas','Prueba las 4 intensidades en un plazo de 2 semanas.',              'Activity',  'rare',     'intensities_in_days', '{"min_days": 14}',    35)
on conflict (id) do nothing;
