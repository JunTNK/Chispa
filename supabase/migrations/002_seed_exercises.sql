-- CHISPA — Migration 002: Seed Exercise Catalog
-- Run this after 001_initial_schema.sql
-- Inserts all exercises from src/lib/utils/exercises.ts into the database

-- ═══════════════════════════════════════════════════════════
-- SIN EQUIPO (Bodyweight)
-- ═══════════════════════════════════════════════════════════

insert into public.exercises (name, muscle, difficulty, equipment, instructions, load_type, cognitive_load, emoji, cue) values
-- Piernas
('Sentadilla', 'piernas', 1, 'ninguno', 'Baja como si te sentaras, espalda recta', 'reps', 'low', '🦵', 'Baja como si te sentaras, espalda recta'),
('Zancadas', 'piernas', 1, 'ninguno', 'Paso largo, rodilla trasera al suelo', 'reps', 'low', '🚶', 'Paso largo, rodilla trasera al suelo'),
('Puente de glúteos', 'gluteos', 1, 'ninguno', 'Tumbado, eleva la cadera y aprieta', 'reps', 'low', '🌉', 'Tumbado, eleva la cadera y aprieta'),
('Gemelos de pie', 'piernas', 1, 'ninguno', 'Eleva los talones y baja despacio', 'reps', 'low', '🦶', 'Eleva los talones y baja despacio'),
('Sentadilla en pared', 'piernas', 1, 'ninguno', 'Espalda en la pared, muslos paralelos. 30 segundos.', 'time', 'low', '🧱', 'Espalda en la pared, muslos paralelos'),
('Sentadilla con salto', 'piernas', 2, 'ninguno', 'Sentadilla y salta al subir', 'reps', 'med', '🦘', 'Sentadilla y salta al subir'),
('Equilibrio a una pierna', 'piernas', 1, 'ninguno', 'Mantén el equilibrio, cambia de pierna. 20 segundos cada una.', 'time', 'low', '🦩', 'Mantén el equilibrio, cambia de pierna'),

-- Empuje (Push)
('Flexiones', 'pecho', 2, 'ninguno', 'Cuerpo en línea, baja lentamente', 'reps', 'low', '🙌', 'Cuerpo en línea, baja el pecho'),
('Flexiones inclinadas', 'pecho', 1, 'ninguno', 'Manos en una superficie alta', 'reps', 'low', '🙌', 'Manos en una superficie alta'),
('Flexión diamante', 'brazos', 3, 'ninguno', 'Manos juntas bajo el pecho', 'reps', 'med', '💎', 'Manos juntas bajo el pecho'),
('Fondos en silla', 'brazos', 2, 'ninguno', 'Manos en la silla, baja el cuerpo', 'reps', 'low', '🪑', 'Manos en la silla, baja el cuerpo'),

-- Jalón (Pull)
('Superman', 'espalda', 1, 'ninguno', 'Boca abajo, eleva brazos y piernas', 'reps', 'low', '🦸', 'Boca abajo, eleva brazos y piernas'),

-- Core
('Plancha', 'core', 1, 'ninguno', 'Cuerpo recto, aprieta el abdomen. 30 segundos.', 'time', 'low', '🧘', 'Cuerpo recto, aprieta el abdomen'),
('Plancha lateral', 'core', 2, 'ninguno', 'Cadera arriba, cuerpo alineado. 20 segundos cada lado.', 'time', 'med', '🧘', 'Cadera arriba, cuerpo alineado'),
('Escaladores', 'core', 2, 'ninguno', 'En plancha, rodillas al pecho rápido', 'reps', 'med', '⛰️', 'En plancha, rodillas al pecho rápido'),
('Toque de hombros', 'core', 2, 'ninguno', 'En plancha, toca el hombro contrario', 'reps', 'med', '👋', 'En plancha, toca el hombro contrario'),
('Crunch', 'core', 1, 'ninguno', 'Encoge el abdomen, baja controlado', 'reps', 'low', '🧎', 'Encoge el abdomen, baja controlado'),

-- Cardio
('Jumping jacks', 'cardio', 1, 'ninguno', 'Salta abriendo brazos y piernas', 'reps', 'low', '⭐', 'Salta abriendo brazos y piernas'),
('Rodillas arriba', 'cardio', 1, 'ninguno', 'Corre en el sitio, rodillas altas', 'reps', 'low', '🏃', 'Corre en el sitio, rodillas altas'),
('Burpees', 'cardio', 3, 'ninguno', 'Sentadilla, plancha, flexión, salto', 'reps', 'high', '💥', 'Sentadilla, plancha, flexión, salto'),
('Medio burpee', 'cardio', 2, 'ninguno', 'Sentadilla, plancha y vuelve', 'reps', 'med', '💫', 'Sentadilla, plancha y vuelve'),

-- Movilidad
('Círculos de brazos', 'hombros', 1, 'ninguno', 'Brazos extendidos, círculos amplios', 'reps', 'low', '🔄', 'Brazos extendidos, círculos amplios'),
('Yoga flow suave', 'cardio', 1, 'ninguno', 'Plancha → cobra → perro boca abajo. 60 segundos de flujo.', 'time', 'low', '🌊', 'Plancha → cobra → perro boca abajo');

-- ═══════════════════════════════════════════════════════════
-- CON MANCUERNAS
-- ═══════════════════════════════════════════════════════════

insert into public.exercises (name, muscle, difficulty, equipment, instructions, load_type, cognitive_load, emoji, cue) values
-- Empuje (Push)
('Press de pecho con mancuernas', 'pecho', 2, 'mancuernas', 'Tumbado, empuja las mancuernas', 'reps', 'med', '🏋️', 'Tumbado, empuja las mancuernas'),
('Press de hombros', 'hombros', 2, 'mancuernas', 'Empuja sobre la cabeza', 'reps', 'med', '🏋️', 'Empuja sobre la cabeza'),
('Press francés', 'brazos', 2, 'mancuernas', 'Codos arriba, extiende el antebrazo', 'reps', 'med', '🇫🇷', 'Codos arriba, extiende el antebrazo'),
('Curl de bíceps', 'brazos', 1, 'mancuernas', 'Codos fijos, sube la mancuerna', 'reps', 'low', '💪', 'Codos fijos, sube la mancuerna'),
('Elevaciones laterales', 'hombros', 1, 'mancuernas', 'Brazos hasta la altura del hombro', 'reps', 'low', '🕊️', 'Brazos hasta la altura del hombro'),

-- Jalón (Pull)
('Remo con mancuerna', 'espalda', 2, 'mancuernas', 'Inclinado, tira del codo hacia atrás', 'reps', 'med', '🚣', 'Inclinado, tira del codo hacia atrás'),
('Aperturas inversas', 'espalda', 2, 'mancuernas', 'Inclinado, abre los brazos hacia atrás', 'reps', 'low', '🕊️', 'Inclinado, abre los brazos hacia atrás'),

-- Piernas
('Sentadilla goblet', 'piernas', 2, 'mancuernas', 'Mancuerna al pecho, baja profundo', 'reps', 'med', '🏆', 'Mancuerna al pecho, baja profundo'),
('Peso muerto rumano', 'piernas', 2, 'mancuernas', 'Cadera atrás, espalda neutra', 'reps', 'high', '🏋️', 'Cadera atrás, espalda neutra'),
('Zancada con mancuernas', 'piernas', 2, 'mancuernas', 'Zancada con peso a los lados', 'reps', 'med', '🚶', 'Zancada con peso a los lados'),
('Hip thrust con mancuerna', 'gluteos', 2, 'mancuernas', 'Espalda en banco, empuja la cadera', 'reps', 'med', '🌉', 'Espalda en banco, empuja la cadera'),
('Gemelos con mancuernas', 'piernas', 1, 'mancuernas', 'Eleva los talones con peso', 'reps', 'low', '🦶', 'Eleva los talones con peso'),

-- Core
('Russian twist con mancuerna', 'core', 2, 'mancuernas', 'Rota el torso lado a lado', 'reps', 'med', '🔄', 'Rota el torso lado a lado');

-- ═══════════════════════════════════════════════════════════
-- GIMNASIO
-- ═══════════════════════════════════════════════════════════

insert into public.exercises (name, muscle, difficulty, equipment, instructions, load_type, cognitive_load, emoji, cue) values
-- Empuje (Push)
('Press de banca', 'pecho', 2, 'gimnasio', 'Empuja la barra sobre el pecho', 'reps', 'med', '🛋️', 'Empuja la barra sobre el pecho'),
('Press inclinado', 'pecho', 2, 'gimnasio', 'Banca inclinada, empuja hacia arriba', 'reps', 'med', '🛋️', 'Banca inclinada, empuja hacia arriba'),
('Press militar', 'hombros', 2, 'gimnasio', 'Empuja la barra sobre la cabeza', 'reps', 'med', '🎖️', 'Empuja la barra sobre la cabeza'),
('Fondos en paralelas', 'pecho', 3, 'gimnasio', 'Baja hasta 90° y sube', 'reps', 'high', '📐', 'Baja hasta 90° y sube'),

-- Jalón (Pull)
('Dominadas', 'espalda', 3, 'gimnasio', 'Tira hasta la barbilla sobre la barra', 'reps', 'high', '🐒', 'Tira hasta la barbilla sobre la barra'),
('Jalón al pecho', 'espalda', 1, 'gimnasio', 'Tira de la barra hacia el pecho', 'reps', 'low', '⬇️', 'Tira de la barra hacia el pecho'),
('Remo en máquina', 'espalda', 1, 'gimnasio', 'Tira hacia tu abdomen', 'reps', 'low', '🚣', 'Tira hacia tu abdomen'),
('Face pull', 'hombros', 1, 'gimnasio', 'Tira de la cuerda hacia la cara', 'reps', 'low', '🎯', 'Tira de la cuerda hacia la cara'),
('Remo con barra', 'espalda', 2, 'gimnasio', 'Inclinado, tira la barra al abdomen', 'reps', 'high', '🚣', 'Inclinado, tira la barra al abdomen'),

-- Piernas
('Sentadilla con barra', 'piernas', 3, 'gimnasio', 'Barra en la espalda, baja profundo', 'reps', 'high', '🏋️', 'Barra en la espalda, baja profundo'),
('Peso muerto', 'piernas', 3, 'gimnasio', 'Barra al suelo, cadera y rodillas a la vez', 'reps', 'high', '🏋️', 'Barra al suelo, cadera y rodillas a la vez'),
('Hip thrust con barra', 'gluteos', 2, 'gimnasio', 'Espalda en banco, empuja la cadera', 'reps', 'med', '🌉', 'Espalda en banco, empuja la cadera'),
('Prensa de piernas', 'piernas', 1, 'gimnasio', 'Empuja sin bloquear rodillas', 'reps', 'low', '🦵', 'Empuja sin bloquear rodillas'),
('Curl femoral', 'piernas', 1, 'gimnasio', 'Dobla la rodilla contra resistencia', 'reps', 'low', '🦵', 'Dobla la rodilla contra resistencia'),
('Extensión de cuádriceps', 'piernas', 1, 'gimnasio', 'Extiende la rodilla controlado', 'reps', 'low', '🦵', 'Extiende la rodilla controlado'),

-- Brazos
('Curl con barra', 'brazos', 1, 'gimnasio', 'Sube la barra con los bíceps', 'reps', 'low', '💪', 'Sube la barra con los bíceps'),
('Extensión tríceps en polea', 'brazos', 1, 'gimnasio', 'Codos pegados, extiende hacia abajo', 'reps', 'low', '🔽', 'Codos pegados, extiende hacia abajo'),

-- Core
('Crunch en polea', 'core', 1, 'gimnasio', 'De rodillas, encoge el abdomen', 'reps', 'low', '🧎', 'De rodillas, encoge el abdomen'),
('Elevación de piernas colgado', 'core', 3, 'gimnasio', 'Cuélgate, sube las piernas a 90°', 'reps', 'high', '🤸', 'Cuélgate, sube las piernas a 90°'),

-- Cardio
('Elíptica', 'cardio', 1, 'gimnasio', 'Ritmo suave y constante. 3-5 minutos.', 'time', 'low', '🌀', 'Ritmo suave y constante'),
('Bicicleta estática', 'cardio', 1, 'gimnasio', 'Pedaleo constante, resistencia media. 3-5 minutos.', 'time', 'low', '🚴', 'Pedaleo constante, resistencia media'),
('Caminata en pendiente', 'cardio', 1, 'gimnasio', 'Cinta inclinada, paso constante. 3-5 minutos.', 'time', 'low', '⛰️', 'Cinta inclinada, paso constante'),
('Remo ergómetro', 'cardio', 2, 'gimnasio', 'Empuje de piernas, luego brazos. 3-5 minutos.', 'time', 'med', '🚣', 'Empuje de piernas, luego brazos');

-- Verify the seed data
do $$
declare
  total int;
begin
  select count(*) into total from public.exercises;
  raise notice '✅ Seed complete: % exercises inserted', total;
end $$;
