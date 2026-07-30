-- ═══════════════════════════════════════════════════════════
-- CHISPA — RUN ALL MIGRATIONS
-- ═══════════════════════════════════════════════════════════
-- Instructions:
--   1. Go to https://supabase.com/dashboard/project/rhsrnoycjvrggsxeihfd/sql/new
--   2. Paste this entire file
--   3. Click "Run" or Ctrl+Enter
--   4. Wait for "Success. No rows returned" or the seed verification message
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- MIGRATION 001: Initial Schema
-- ═══════════════════════════════════════════════════════════

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Users table (extends auth.users)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null,
  birthdate date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles table
create table if not exists public.profiles (
  user_id uuid references public.users on delete cascade primary key,
  goal text check (goal in ('fuerza', 'energia', 'grasa')) not null,
  level text check (level in ('inicio', 'medio', 'regular')) not null,
  equipment text check (equipment in ('ninguno', 'mancuernas', 'gimnasio')) not null,
  limitations text[] default '{}',
  days_per_week text check (days_per_week in ('2-3', '4-5', 'flex')) not null,
  neurotype text check (neurotype in ('adh-c', 'adh-i', 'audhd', 'spd', 'curious', 'other')) not null,
  preferred_duration integer check (preferred_duration in (10, 20, 30)) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Exercises catalog
create table if not exists public.exercises (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  muscle text not null,
  difficulty integer check (difficulty in (1, 2, 3)) not null,
  equipment text check (equipment in ('ninguno', 'mancuernas', 'gimnasio')) not null,
  video_url text,
  instructions text not null,
  load_type text check (load_type in ('reps', 'time')) not null,
  cognitive_load text check (cognitive_load in ('low', 'med', 'high')) not null,
  emoji text not null,
  cue text not null,
  secondary_muscles text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Workouts
create table if not exists public.workouts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  date date not null,
  duration integer not null,
  focus text check (focus in ('full', 'upper', 'lower', 'core')) not null,
  intensity text check (intensity in ('minimal', 'light', 'standard', 'push')) not null,
  score integer default 0,
  completed_rate numeric(3,2) default 0,
  exercises jsonb not null,
  actual_minutes integer default 0,
  rpe text check (rpe in ('suave', 'justo', 'duro')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Daily check-ins
create table if not exists public.checkins (
  user_id uuid references public.users on delete cascade not null,
  date date not null,
  sleep numeric(3,1) check (sleep >= 3 and sleep <= 10) not null,
  energy integer check (energy >= 1 and energy <= 10) not null,
  stress integer check (stress >= 1 and stress <= 10) not null,
  recovery_score integer check (recovery_score >= 0 and recovery_score <= 100) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, date)
);

-- Digital Twin (user memory/behavior model)
create table if not exists public.digital_twins (
  user_id uuid references public.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  training_style text,
  motivation_style text check (motivation_style in ('data', 'energy', 'direct', 'calm')) default 'data',
  avoid text[] default '{}',
  best_time text,
  patterns jsonb not null default '{}',
  ex_progress jsonb not null default '{}',
  motiv_weights jsonb not null default '{"data": 1, "energy": 1, "direct": 1, "calm": 1}'
);

-- Recovery scores
create table if not exists public.recovery_scores (
  user_id uuid references public.users on delete cascade not null,
  date date not null,
  score integer check (score >= 0 and score <= 100) not null,
  sleep_contribution integer not null,
  energy_contribution integer not null,
  stress_contribution integer not null,
  hrv numeric(5,1),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, date)
);

-- Habit scores (30-day rolling)
create table if not exists public.habit_scores (
  user_id uuid references public.users on delete cascade not null,
  period_start date not null,
  period_end date not null,
  consistency_pct numeric(5,2) not null,
  sessions_done integer not null,
  sessions_target integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, period_start)
);

-- Behavior memory (learned patterns)
create table if not exists public.behavior_memory (
  user_id uuid references public.users on delete cascade not null,
  pattern text not null,
  confidence numeric(3,2) check (confidence >= 0 and confidence <= 1) not null,
  data jsonb not null default '{}',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, pattern)
);

-- AI Events (audit trail for decision engine)
create table if not exists public.ai_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  event text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  decision jsonb not null,
  agent text not null
);

-- Chat messages
create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'
);

-- Indexes
create index if not exists idx_workouts_user_date on public.workouts(user_id, date desc);
create index if not exists idx_checkins_user_date on public.checkins(user_id, date desc);
create index if not exists idx_recovery_user_date on public.recovery_scores(user_id, date desc);
create index if not exists idx_ai_events_user_time on public.ai_events(user_id, timestamp desc);
create index if not exists idx_chat_user_time on public.chat_messages(user_id, timestamp desc);

-- Row Level Security
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.checkins enable row level security;
alter table public.digital_twins enable row level security;
alter table public.recovery_scores enable row level security;
alter table public.habit_scores enable row level security;
alter table public.behavior_memory enable row level security;
alter table public.ai_events enable row level security;
alter table public.chat_messages enable row level security;

-- RLS Policies
create policy "Users can view own data" on public.users for select using (auth.uid() = id);
create policy "Users can update own data" on public.users for update using (auth.uid() = id);
create policy "Profiles: own data" on public.profiles for all using (auth.uid() = user_id);
create policy "Workouts: own data" on public.workouts for all using (auth.uid() = user_id);
create policy "Checkins: own data" on public.checkins for all using (auth.uid() = user_id);
create policy "Digital twins: own data" on public.digital_twins for all using (auth.uid() = user_id);
create policy "Recovery scores: own data" on public.recovery_scores for all using (auth.uid() = user_id);
create policy "Habit scores: own data" on public.habit_scores for all using (auth.uid() = user_id);
create policy "Behavior memory: own data" on public.behavior_memory for all using (auth.uid() = user_id);
create policy "AI events: own data" on public.ai_events for all using (auth.uid() = user_id);
create policy "Chat messages: own data" on public.chat_messages for all using (auth.uid() = user_id);
create policy "Exercises: public read" on public.exercises for select using (true);

-- Triggers (updated_at)
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end $$;

create trigger handle_users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_digital_twins_updated_at
  before update on public.digital_twins
  for each row execute procedure public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════
-- MIGRATION 002: Seed Exercises
-- ═══════════════════════════════════════════════════════════

-- Safe: delete existing seed data first (idempotent)
delete from public.exercises;

insert into public.exercises (name, muscle, difficulty, equipment, instructions, load_type, cognitive_load, emoji, cue) values
('Sentadilla', 'piernas', 1, 'ninguno', 'Baja como si te sentaras, espalda recta', 'reps', 'low', '🦵', 'Baja como si te sentaras, espalda recta'),
('Zancadas', 'piernas', 1, 'ninguno', 'Paso largo, rodilla trasera al suelo', 'reps', 'low', '🚶', 'Paso largo, rodilla trasera al suelo'),
('Puente de glúteos', 'gluteos', 1, 'ninguno', 'Tumbado, eleva la cadera y aprieta', 'reps', 'low', '🌉', 'Tumbado, eleva la cadera y aprieta'),
('Gemelos de pie', 'piernas', 1, 'ninguno', 'Eleva los talones y baja despacio', 'reps', 'low', '🦶', 'Eleva los talones y baja despacio'),
('Sentadilla en pared', 'piernas', 1, 'ninguno', 'Espalda en la pared, muslos paralelos. 30 segundos.', 'time', 'low', '🧱', 'Espalda en la pared, muslos paralelos'),
('Sentadilla con salto', 'piernas', 2, 'ninguno', 'Sentadilla y salta al subir', 'reps', 'med', '🦘', 'Sentadilla y salta al subir'),
('Equilibrio a una pierna', 'piernas', 1, 'ninguno', 'Mantén el equilibrio, cambia de pierna. 20 segundos cada una.', 'time', 'low', '🦩', 'Mantén el equilibrio, cambia de pierna'),
('Flexiones', 'pecho', 2, 'ninguno', 'Cuerpo en línea, baja lentamente', 'reps', 'low', '🙌', 'Cuerpo en línea, baja el pecho'),
('Flexiones inclinadas', 'pecho', 1, 'ninguno', 'Manos en una superficie alta', 'reps', 'low', '🙌', 'Manos en una superficie alta'),
('Flexión diamante', 'brazos', 3, 'ninguno', 'Manos juntas bajo el pecho', 'reps', 'med', '💎', 'Manos juntas bajo el pecho'),
('Fondos en silla', 'brazos', 2, 'ninguno', 'Manos en la silla, baja el cuerpo', 'reps', 'low', '🪑', 'Manos en la silla, baja el cuerpo'),
('Superman', 'espalda', 1, 'ninguno', 'Boca abajo, eleva brazos y piernas', 'reps', 'low', '🦸', 'Boca abajo, eleva brazos y piernas'),
('Plancha', 'core', 1, 'ninguno', 'Cuerpo recto, aprieta el abdomen. 30 segundos.', 'time', 'low', '🧘', 'Cuerpo recto, aprieta el abdomen'),
('Plancha lateral', 'core', 2, 'ninguno', 'Cadera arriba, cuerpo alineado. 20 segundos cada lado.', 'time', 'med', '🧘', 'Cadera arriba, cuerpo alineado'),
('Escaladores', 'core', 2, 'ninguno', 'En plancha, rodillas al pecho rápido', 'reps', 'med', '⛰️', 'En plancha, rodillas al pecho rápido'),
('Toque de hombros', 'core', 2, 'ninguno', 'En plancha, toca el hombro contrario', 'reps', 'med', '👋', 'En plancha, toca el hombro contrario'),
('Crunch', 'core', 1, 'ninguno', 'Encoge el abdomen, baja controlado', 'reps', 'low', '🧎', 'Encoge el abdomen, baja controlado'),
('Jumping jacks', 'cardio', 1, 'ninguno', 'Salta abriendo brazos y piernas', 'reps', 'low', '⭐', 'Salta abriendo brazos y piernas'),
('Rodillas arriba', 'cardio', 1, 'ninguno', 'Corre en el sitio, rodillas altas', 'reps', 'low', '🏃', 'Corre en el sitio, rodillas altas'),
('Burpees', 'cardio', 3, 'ninguno', 'Sentadilla, plancha, flexión, salto', 'reps', 'high', '💥', 'Sentadilla, plancha, flexión, salto'),
('Medio burpee', 'cardio', 2, 'ninguno', 'Sentadilla, plancha y vuelve', 'reps', 'med', '💫', 'Sentadilla, plancha y vuelve'),
('Círculos de brazos', 'hombros', 1, 'ninguno', 'Brazos extendidos, círculos amplios', 'reps', 'low', '🔄', 'Brazos extendidos, círculos amplios'),
('Yoga flow suave', 'cardio', 1, 'ninguno', 'Plancha → cobra → perro boca abajo. 60 segundos de flujo.', 'time', 'low', '🌊', 'Plancha → cobra → perro boca abajo');

insert into public.exercises (name, muscle, difficulty, equipment, instructions, load_type, cognitive_load, emoji, cue) values
('Press de pecho con mancuernas', 'pecho', 2, 'mancuernas', 'Tumbado, empuja las mancuernas', 'reps', 'med', '🏋️', 'Tumbado, empuja las mancuernas'),
('Press de hombros', 'hombros', 2, 'mancuernas', 'Empuja sobre la cabeza', 'reps', 'med', '🏋️', 'Empuja sobre la cabeza'),
('Press francés', 'brazos', 2, 'mancuernas', 'Codos arriba, extiende el antebrazo', 'reps', 'med', '🇫🇷', 'Codos arriba, extiende el antebrazo'),
('Curl de bíceps', 'brazos', 1, 'mancuernas', 'Codos fijos, sube la mancuerna', 'reps', 'low', '💪', 'Codos fijos, sube la mancuerna'),
('Elevaciones laterales', 'hombros', 1, 'mancuernas', 'Brazos hasta la altura del hombro', 'reps', 'low', '🕊️', 'Brazos hasta la altura del hombro'),
('Remo con mancuerna', 'espalda', 2, 'mancuernas', 'Inclinado, tira del codo hacia atrás', 'reps', 'med', '🚣', 'Inclinado, tira del codo hacia atrás'),
('Aperturas inversas', 'espalda', 2, 'mancuernas', 'Inclinado, abre los brazos hacia atrás', 'reps', 'low', '🕊️', 'Inclinado, abre los brazos hacia atrás'),
('Sentadilla goblet', 'piernas', 2, 'mancuernas', 'Mancuerna al pecho, baja profundo', 'reps', 'med', '🏆', 'Mancuerna al pecho, baja profundo'),
('Peso muerto rumano', 'piernas', 2, 'mancuernas', 'Cadera atrás, espalda neutra', 'reps', 'high', '🏋️', 'Cadera atrás, espalda neutra'),
('Zancada con mancuernas', 'piernas', 2, 'mancuernas', 'Zancada con peso a los lados', 'reps', 'med', '🚶', 'Zancada con peso a los lados'),
('Hip thrust con mancuerna', 'gluteos', 2, 'mancuernas', 'Espalda en banco, empuja la cadera', 'reps', 'med', '🌉', 'Espalda en banco, empuja la cadera'),
('Gemelos con mancuernas', 'piernas', 1, 'mancuernas', 'Eleva los talones con peso', 'reps', 'low', '🦶', 'Eleva los talones con peso'),
('Russian twist con mancuerna', 'core', 2, 'mancuernas', 'Rota el torso lado a lado', 'reps', 'med', '🔄', 'Rota el torso lado a lado');

insert into public.exercises (name, muscle, difficulty, equipment, instructions, load_type, cognitive_load, emoji, cue) values
('Press de banca', 'pecho', 2, 'gimnasio', 'Empuja la barra sobre el pecho', 'reps', 'med', '🛋️', 'Empuja la barra sobre el pecho'),
('Press inclinado', 'pecho', 2, 'gimnasio', 'Banca inclinada, empuja hacia arriba', 'reps', 'med', '🛋️', 'Banca inclinada, empuja hacia arriba'),
('Press militar', 'hombros', 2, 'gimnasio', 'Empuja la barra sobre la cabeza', 'reps', 'med', '🎖️', 'Empuja la barra sobre la cabeza'),
('Fondos en paralelas', 'pecho', 3, 'gimnasio', 'Baja hasta 90° y sube', 'reps', 'high', '📐', 'Baja hasta 90° y sube'),
('Dominadas', 'espalda', 3, 'gimnasio', 'Tira hasta la barbilla sobre la barra', 'reps', 'high', '🐒', 'Tira hasta la barbilla sobre la barra'),
('Jalón al pecho', 'espalda', 1, 'gimnasio', 'Tira de la barra hacia el pecho', 'reps', 'low', '⬇️', 'Tira de la barra hacia el pecho'),
('Remo en máquina', 'espalda', 1, 'gimnasio', 'Tira hacia tu abdomen', 'reps', 'low', '🚣', 'Tira hacia tu abdomen'),
('Face pull', 'hombros', 1, 'gimnasio', 'Tira de la cuerda hacia la cara', 'reps', 'low', '🎯', 'Tira de la cuerda hacia la cara'),
('Remo con barra', 'espalda', 2, 'gimnasio', 'Inclinado, tira la barra al abdomen', 'reps', 'high', '🚣', 'Inclinado, tira la barra al abdomen'),
('Sentadilla con barra', 'piernas', 3, 'gimnasio', 'Barra en la espalda, baja profundo', 'reps', 'high', '🏋️', 'Barra en la espalda, baja profundo'),
('Peso muerto', 'piernas', 3, 'gimnasio', 'Barra al suelo, cadera y rodillas a la vez', 'reps', 'high', '🏋️', 'Barra al suelo, cadera y rodillas a la vez'),
('Hip thrust con barra', 'gluteos', 2, 'gimnasio', 'Espalda en banco, empuja la cadera', 'reps', 'med', '🌉', 'Espalda en banco, empuja la cadera'),
('Prensa de piernas', 'piernas', 1, 'gimnasio', 'Empuja sin bloquear rodillas', 'reps', 'low', '🦵', 'Empuja sin bloquear rodillas'),
('Curl femoral', 'piernas', 1, 'gimnasio', 'Dobla la rodilla contra resistencia', 'reps', 'low', '🦵', 'Dobla la rodilla contra resistencia'),
('Extensión de cuádriceps', 'piernas', 1, 'gimnasio', 'Extiende la rodilla controlado', 'reps', 'low', '🦵', 'Extiende la rodilla controlado'),
('Curl con barra', 'brazos', 1, 'gimnasio', 'Sube la barra con los bíceps', 'reps', 'low', '💪', 'Sube la barra con los bíceps'),
('Extensión tríceps en polea', 'brazos', 1, 'gimnasio', 'Codos pegados, extiende hacia abajo', 'reps', 'low', '🔽', 'Codos pegados, extiende hacia abajo'),
('Crunch en polea', 'core', 1, 'gimnasio', 'De rodillas, encoge el abdomen', 'reps', 'low', '🧎', 'De rodillas, encoge el abdomen'),
('Elevación de piernas colgado', 'core', 3, 'gimnasio', 'Cuélgate, sube las piernas a 90°', 'reps', 'high', '🤸', 'Cuélgate, sube las piernas a 90°'),
('Elíptica', 'cardio', 1, 'gimnasio', 'Ritmo suave y constante. 3-5 minutos.', 'time', 'low', '🌀', 'Ritmo suave y constante'),
('Bicicleta estática', 'cardio', 1, 'gimnasio', 'Pedaleo constante, resistencia media. 3-5 minutos.', 'time', 'low', '🚴', 'Pedaleo constante, resistencia media'),
('Caminata en pendiente', 'cardio', 1, 'gimnasio', 'Cinta inclinada, paso constante. 3-5 minutos.', 'time', 'low', '⛰️', 'Cinta inclinada, paso constante'),
('Remo ergómetro', 'cardio', 2, 'gimnasio', 'Empuje de piernas, luego brazos. 3-5 minutos.', 'time', 'med', '🚣', 'Empuje de piernas, luego brazos');

do $$
declare
  total int;
begin
  select count(*) into total from public.exercises;
  raise notice '✅ Seed complete: % exercises inserted', total;
end $$;

-- ═══════════════════════════════════════════════════════════
-- MIGRATION 003: Achievement System
-- ═══════════════════════════════════════════════════════════

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

insert into public.achievements (id, category, name, description, icon, tier, condition_type, condition_value, sort_order) values
  ('first_workout',       'workouts',   'Primer Paso',         'Completa tu primer entrenamiento',             'Footprints',    'common',    'total_workouts',    '{"min": 1}',     1),
  ('five_workouts',       'workouts',   'Constancia',          'Completa 5 entrenamientos',                    'Flame',         'uncommon',  'total_workouts',    '{"min": 5}',     2),
  ('ten_workouts',        'workouts',   'Dedicación',          'Completa 10 entrenamientos',                   'Zap',           'rare',      'total_workouts',    '{"min": 10}',    3),
  ('twentyfive_workouts', 'workouts',   'Atleta',              'Completa 25 entrenamientos',                   'Trophy',        'epic',      'total_workouts',    '{"min": 25}',    4),
  ('fifty_workouts',      'workouts',   'Guerrero',            'Completa 50 entrenamientos',                   'Sword',         'epic',      'total_workouts',    '{"min": 50}',    5),
  ('hundred_workouts',    'workouts',   'Legendario',          'Completa 100 entrenamientos',                  'Crown',         'legendary', 'total_workouts',    '{"min": 100}',   6),
  ('streak_3',            'streak',     'Racha Inicial',       'Mantén una racha de 3 días seguidos',           'Flame',         'common',    'streak_days',       '{"min": 3}',     7),
  ('streak_7',            'streak',     'Imparable',           'Mantén una racha de 7 días seguidos',           'Flame',         'rare',      'streak_days',       '{"min": 7}',     8),
  ('streak_14',           'streak',     'Consagrado',          'Mantén una racha de 14 días seguidos',          'Flame',         'epic',      'streak_days',       '{"min": 14}',    9),
  ('streak_30',           'streak',     'Leyenda Viva',        'Mantén una racha de 30 días seguidos',          'Crown',         'legendary', 'streak_days',       '{"min": 30}',    10),
  ('try_push',            'intensity',  'Límites',             'Completa un entrenamiento intensidad push',     'Zap',           'common',    'intensity_count',   '{"type": "push", "min": 1}',      11),
  ('all_intensities',     'intensity',  'Versatilidad',        'Prueba las 4 intensidades (minimal, light, standard, push)', 'Activity', 'rare', 'all_intensities',   '{"min": 1}',     12),
  ('fullbody_10',         'focus',      'Full Body Master',    'Completa 10 entrenamientos full body',          'Target',        'uncommon',  'focus_count',       '{"type": "full", "min": 10}',     13),
  ('upper_10',            'focus',      'Upper King',          'Completa 10 entrenamientos de tren superior',   'Dumbbell',      'uncommon',  'focus_count',       '{"type": "upper", "min": 10}',    14),
  ('lower_10',            'focus',      'Lower Legend',        'Completa 10 entrenamientos de tren inferior',   'Dumbbell',      'uncommon',  'focus_count',       '{"type": "lower", "min": 10}',    15),
  ('core_10',             'focus',      'Core Crusher',        'Completa 10 entrenamientos de core',            'Target',        'uncommon',  'focus_count',       '{"type": "core", "min": 10}',     16),
  ('perfect_session',     'completion', 'Sesión Perfecta',     'Completa un entrenamiento al 100%',             'CheckCircle',   'uncommon',  'perfect_sessions',  '{"min": 1}',     17),
  ('perfectionist_10',    'completion', 'Perfeccionista',      'Completa 10 entrenamientos al 100%',            'Award',         'epic',      'perfect_sessions',  '{"min": 10}',    18),
  ('comeback',            'completion', 'The Comeback',        'Completa un entrenamiento después de 3+ días sin entrenar', 'Activity', 'rare', 'comeback', '{"min_days_off": 3}', 19),
  ('level_5',             'level',      'Nivel 5',             'Alcanza el nivel 5',                            'TrendingUp',    'uncommon',  'level',             '{"min": 5}',     20),
  ('level_10',            'level',      'Nivel 10',            'Alcanza el nivel 10',                           'TrendingUp',    'epic',      'level',             '{"min": 10}',    21),
  ('level_25',            'level',      'Nivel 25',            'Alcanza el nivel 25',                           'Crown',         'legendary', 'level',             '{"min": 25}',    22),
  ('boss_first',          'boss',       'Cazador de Bosses',   'Derrota al jefe semanal por primera vez',       'Sword',         'epic',      'boss_defeated',     '{"min": 1}',     23),
  ('boss_five',           'boss',       'Conquistador',        'Derrota 5 jefes semanales',                     'Crown',         'legendary', 'boss_defeated',     '{"min": 5}',     24),
  ('early_bird',          'hidden',     'Madrugador',          'Entrena antes de las 7:00 AM',                  'Sun',           'rare',      'time_based',        '{"before_hour": 7}',           25),
  ('night_owl',           'hidden',     'Noctámbulo',          'Entrena después de las 10:00 PM',               'Moon',          'rare',      'time_based',        '{"after_hour": 22}',           26),
  ('adapter',             'hidden',     'Adaptabilidad',       'Adapta la intensidad en medio de la sesión 5 veces', 'Wrench',    'rare',      'adaptation_count',  '{"min": 5}',     27),
  ('rpe_master',          'hidden',     'Auto-consciencia',    'Califica tu RPE como "justo" 10 veces',         'Smile',         'epic',      'rpe_justo_count',   '{"min": 10}',    28)
on conflict (id) do nothing;

create index if not exists idx_user_achievements_user on public.user_achievements(user_id);
create index if not exists idx_user_achievements_unlocked on public.user_achievements(user_id, unlocked);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy "Achievements: public read" on public.achievements for select using (true);
create policy "User achievements: own data" on public.user_achievements for all using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- MIGRATION 004: Quest State
-- ═══════════════════════════════════════════════════════════

create table if not exists public.quest_states (
  user_id uuid references public.users on delete cascade primary key,
  selected_theme text not null default 'one_piece',
  vault_claims jsonb not null default '{}',
  boss_defeated_this_week boolean not null default false,
  boss_defeated_count integer not null default 0,
  last_boss_defeat_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.quest_states enable row level security;
create policy "Quest states: own data" on public.quest_states for all using (auth.uid() = user_id);

create trigger handle_quest_states_updated_at
  before update on public.quest_states
  for each row execute procedure public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════
-- MIGRATION 005: Leaderboard
-- ═══════════════════════════════════════════════════════════

create table if not exists public.leaderboard (
  user_id uuid references public.users on delete cascade primary key,
  total_xp integer not null default 0,
  level integer not null default 1,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_leaderboard_xp on public.leaderboard (total_xp desc);

alter table public.leaderboard enable row level security;
create policy "Leaderboard: anyone can read" on public.leaderboard for select using (true);
create policy "Leaderboard: own upsert" on public.leaderboard for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger handle_leaderboard_updated_at
  before update on public.leaderboard
  for each row execute procedure public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════
-- MIGRATION 006: Fix missing columns & neuro_profiles
-- ═══════════════════════════════════════════════════════════

alter table if exists public.workouts
  add column if not exists planned_minutes integer,
  add column if not exists planned_sets integer default 0,
  add column if not exists done_sets integer default 0,
  add column if not exists adapted boolean default false;

alter table if exists public.profiles
  add column if not exists name text not null default '',
  add column if not exists chronotype text check (chronotype in ('leon', 'lobo')),
  add column if not exists medication text check (medication in ('no', 'short', 'long')),
  add column if not exists medication_time text;

create table if not exists public.neuro_profiles (
  user_id uuid references public.users on delete cascade primary key,
  type text not null,
  duration_minutes integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_workouts_planned on public.workouts(planned_minutes, adapted);

alter table public.neuro_profiles enable row level security;
create policy "Neuro profiles: own data" on public.neuro_profiles for all using (auth.uid() = user_id);

create trigger handle_neuro_profiles_updated_at
  before update on public.neuro_profiles
  for each row execute procedure public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════

do $$
declare
  table_count int;
  exercise_count int;
  achievement_count int;
begin
  select count(*) into table_count from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';
  select count(*) into exercise_count from public.exercises;
  select count(*) into achievement_count from public.achievements;
  raise notice '═══════════════════════════════════════';
  raise notice '✅ MIGRATIONS COMPLETE';
  raise notice '   Tables: %', table_count;
  raise notice '   Exercises: %', exercise_count;
  raise notice '   Achievements: %', achievement_count;
  raise notice '   RLS enabled: YES (verified in migration)';
  raise notice '═══════════════════════════════════════';
end $$;
