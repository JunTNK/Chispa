-- CHISPA — Migration 003: Achievement System
-- Run this in Supabase SQL Editor or via `supabase db push`
-- Created: July 2026

-- ═══════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════

-- Achievement definitions (seeded catalog)
create table if not exists public.achievements (
  id text primary key,
  category text not null check (category in ('workouts', 'streak', 'intensity', 'focus', 'completion', 'level', 'boss', 'hidden')),
  name text not null,
  description text not null,
  icon text not null,
  tier text not null check (tier in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  condition_type text not null,
  condition_value jsonb not null default '{}',
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User achievement progress (one row per user per achievement)
create table if not exists public.user_achievements (
  user_id uuid references public.users on delete cascade not null,
  achievement_id text references public.achievements on delete cascade not null,
  unlocked boolean default false not null,
  unlocked_at timestamp with time zone,
  progress_current integer default 0 not null,
  progress_target integer not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, achievement_id)
);

-- ═══════════════════════════════════════════════════════════
-- SEED DATA: 28 achievements across all NEUROFIT categories
-- ═══════════════════════════════════════════════════════════

insert into public.achievements (id, category, name, description, icon, tier, condition_type, condition_value, sort_order) values
  -- 🏋️ Workout Milestones
  ('first_workout',       'workouts',   'Primer Paso',         'Completa tu primer entrenamiento',             'Footprints',    'common',    'total_workouts',    '{"min": 1}',     1),
  ('five_workouts',       'workouts',   'Constancia',          'Completa 5 entrenamientos',                    'Flame',         'uncommon',  'total_workouts',    '{"min": 5}',     2),
  ('ten_workouts',        'workouts',   'Dedicación',          'Completa 10 entrenamientos',                   'Zap',           'rare',      'total_workouts',    '{"min": 10}',    3),
  ('twentyfive_workouts', 'workouts',   'Atleta',              'Completa 25 entrenamientos',                   'Trophy',        'epic',      'total_workouts',    '{"min": 25}',    4),
  ('fifty_workouts',      'workouts',   'Guerrero',            'Completa 50 entrenamientos',                   'Sword',         'epic',      'total_workouts',    '{"min": 50}',    5),
  ('hundred_workouts',    'workouts',   'Legendario',          'Completa 100 entrenamientos',                  'Crown',         'legendary', 'total_workouts',    '{"min": 100}',   6),

  -- 🔥 Streak Milestones
  ('streak_3',            'streak',     'Racha Inicial',       'Mantén una racha de 3 días seguidos',           'Flame',         'common',    'streak_days',       '{"min": 3}',     7),
  ('streak_7',            'streak',     'Imparable',           'Mantén una racha de 7 días seguidos',           'Flame',         'rare',      'streak_days',       '{"min": 7}',     8),
  ('streak_14',           'streak',     'Consagrado',          'Mantén una racha de 14 días seguidos',          'Flame',         'epic',      'streak_days',       '{"min": 14}',    9),
  ('streak_30',           'streak',     'Leyenda Viva',        'Mantén una racha de 30 días seguidos',          'Crown',         'legendary', 'streak_days',       '{"min": 30}',    10),

  -- 💪 Intensity Milestones
  ('try_push',            'intensity',  'Límites',             'Completa un entrenamiento intensidad push',     'Zap',           'common',    'intensity_count',   '{"type": "push", "min": 1}',      11),
  ('all_intensities',     'intensity',  'Versatilidad',        'Prueba las 4 intensidades (minimal, light, standard, push)', 'Activity', 'rare', 'all_intensities',   '{"min": 1}',     12),

  -- 🎯 Focus Milestones
  ('fullbody_10',         'focus',      'Full Body Master',    'Completa 10 entrenamientos full body',          'Target',        'uncommon',  'focus_count',       '{"type": "full", "min": 10}',     13),
  ('upper_10',            'focus',      'Upper King',          'Completa 10 entrenamientos de tren superior',   'Dumbbell',      'uncommon',  'focus_count',       '{"type": "upper", "min": 10}',    14),
  ('lower_10',            'focus',      'Lower Legend',        'Completa 10 entrenamientos de tren inferior',   'Dumbbell',      'uncommon',  'focus_count',       '{"type": "lower", "min": 10}',    15),
  ('core_10',             'focus',      'Core Crusher',        'Completa 10 entrenamientos de core',            'Target',        'uncommon',  'focus_count',       '{"type": "core", "min": 10}',     16),

  -- 📊 Completion Milestones
  ('perfect_session',     'completion', 'Sesión Perfecta',     'Completa un entrenamiento al 100%',             'CheckCircle',   'uncommon',  'perfect_sessions',  '{"min": 1}',     17),
  ('perfectionist_10',    'completion', 'Perfeccionista',      'Completa 10 entrenamientos al 100%',            'Award',         'epic',      'perfect_sessions',  '{"min": 10}',    18),
  ('comeback',            'completion', 'The Comeback',        'Completa un entrenamiento después de 3+ días sin entrenar', 'Activity', 'rare', 'comeback', '{"min_days_off": 3}', 19),

  -- ⬆️ Level Milestones
  ('level_5',             'level',      'Nivel 5',             'Alcanza el nivel 5',                            'TrendingUp',    'uncommon',  'level',             '{"min": 5}',     20),
  ('level_10',            'level',      'Nivel 10',            'Alcanza el nivel 10',                           'TrendingUp',    'epic',      'level',             '{"min": 10}',    21),
  ('level_25',            'level',      'Nivel 25',            'Alcanza el nivel 25',                           'Crown',         'legendary', 'level',             '{"min": 25}',    22),

  -- 👹 Boss (NEUROFIT)
  ('boss_first',          'boss',       'Cazador de Bosses',   'Derrota al jefe semanal por primera vez',       'Sword',         'epic',      'boss_defeated',     '{"min": 1}',     23),
  ('boss_five',           'boss',       'Conquistador',        'Derrota 5 jefes semanales',                     'Crown',         'legendary', 'boss_defeated',     '{"min": 5}',     24),

  -- 🕵️ Hidden / Especiales
  ('early_bird',          'hidden',     'Madrugador',          'Entrena antes de las 7:00 AM',                  'Sun',           'rare',      'time_based',        '{"before_hour": 7}',           25),
  ('night_owl',           'hidden',     'Noctámbulo',          'Entrena después de las 10:00 PM',               'Moon',          'rare',      'time_based',        '{"after_hour": 22}',           26),
  ('adapter',             'hidden',     'Adaptabilidad',       'Adapta la intensidad en medio de la sesión 5 veces', 'Wrench',    'rare',      'adaptation_count',  '{"min": 5}',     27),
  ('rpe_master',          'hidden',     'Auto-consciencia',    'Califica tu RPE como "justo" 10 veces',         'Smile',         'epic',      'rpe_justo_count',   '{"min": 10}',    28);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

create index if not exists idx_user_achievements_user on public.user_achievements(user_id);
create index if not exists idx_user_achievements_unlocked on public.user_achievements(user_id, unlocked);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

-- Achievements are public read (catalog)
create policy "Achievements: public read" on public.achievements for select using (true);

-- User achievements: own data only
create policy "User achievements: own data" on public.user_achievements for all using (auth.uid() = user_id);
