import { Exercise } from '@/types';

export const EXERCISE_CATALOG: Exercise[] = [
  // ═══════════════════════════════════════════
  //  SIN EQUIPO (Bodyweight)
  // ═══════════════════════════════════════════

  // --- Piernas ---
  { id: 'squat', name: 'Sentadilla', muscle: 'piernas', difficulty: 1, equipment: 'ninguno', instructions: 'Baja como si te sentaras, espalda recta', load_type: 'reps', cognitive_load: 'low', emoji: '🦵', cue: 'Baja como si te sentaras, espalda recta' },
  { id: 'lunges', name: 'Zancadas', muscle: 'piernas', difficulty: 1, equipment: 'ninguno', instructions: 'Paso largo, rodilla trasera al suelo', load_type: 'reps', cognitive_load: 'low', emoji: '🚶', cue: 'Paso largo, rodilla trasera al suelo' },
  { id: 'glute_bridge', name: 'Puente de glúteos', muscle: 'gluteos', difficulty: 1, equipment: 'ninguno', instructions: 'Tumbado, eleva la cadera y aprieta', load_type: 'reps', cognitive_load: 'low', emoji: '🌉', cue: 'Tumbado, eleva la cadera y aprieta' },
  { id: 'calf_raises', name: 'Gemelos de pie', muscle: 'piernas', difficulty: 1, equipment: 'ninguno', instructions: 'Eleva los talones y baja despacio', load_type: 'reps', cognitive_load: 'low', emoji: '🦶', cue: 'Eleva los talones y baja despacio' },
  { id: 'wall_sit', name: 'Sentadilla en pared', muscle: 'piernas', difficulty: 1, equipment: 'ninguno', instructions: 'Espalda en la pared, muslos paralelos. 30 segundos.', load_type: 'time', cognitive_load: 'low', emoji: '🧱', cue: 'Espalda en la pared, muslos paralelos' },
  { id: 'jump_squat', name: 'Sentadilla con salto', muscle: 'piernas', difficulty: 2, equipment: 'ninguno', instructions: 'Sentadilla y salta al subir', load_type: 'reps', cognitive_load: 'med', emoji: '🦘', cue: 'Sentadilla y salta al subir' },
  { id: 'single_leg_balance', name: 'Equilibrio a una pierna', muscle: 'piernas', difficulty: 1, equipment: 'ninguno', instructions: 'Mantén el equilibrio, cambia de pierna. 20 segundos cada una.', load_type: 'time', cognitive_load: 'low', emoji: '🦩', cue: 'Mantén el equilibrio, cambia de pierna' },

  // --- Empuje (Push) ---
  { id: 'pushup', name: 'Flexiones', muscle: 'pecho', difficulty: 2, equipment: 'ninguno', instructions: 'Cuerpo en línea, baja lentamente', load_type: 'reps', cognitive_load: 'low', emoji: '🙌', cue: 'Cuerpo en línea, baja el pecho' },
  { id: 'incline_pushup', name: 'Flexiones inclinadas', muscle: 'pecho', difficulty: 1, equipment: 'ninguno', instructions: 'Manos en una superficie alta', load_type: 'reps', cognitive_load: 'low', emoji: '🙌', cue: 'Manos en una superficie alta' },
  { id: 'diamond_pushup', name: 'Flexión diamante', muscle: 'brazos', difficulty: 3, equipment: 'ninguno', instructions: 'Manos juntas bajo el pecho', load_type: 'reps', cognitive_load: 'med', emoji: '💎', cue: 'Manos juntas bajo el pecho' },
  { id: 'chair_dips', name: 'Fondos en silla', muscle: 'brazos', difficulty: 2, equipment: 'ninguno', instructions: 'Manos en la silla, baja el cuerpo', load_type: 'reps', cognitive_load: 'low', emoji: '🪑', cue: 'Manos en la silla, baja el cuerpo' },

  // --- Jalón (Pull) ---
  { id: 'superman', name: 'Superman', muscle: 'espalda', difficulty: 1, equipment: 'ninguno', instructions: 'Boca abajo, eleva brazos y piernas', load_type: 'reps', cognitive_load: 'low', emoji: '🦸', cue: 'Boca abajo, eleva brazos y piernas' },

  // --- Core ---
  { id: 'plank', name: 'Plancha', muscle: 'core', difficulty: 1, equipment: 'ninguno', instructions: 'Cuerpo recto, aprieta el abdomen. 30 segundos.', load_type: 'time', cognitive_load: 'low', emoji: '🧘', cue: 'Cuerpo recto, aprieta el abdomen' },
  { id: 'side_plank', name: 'Plancha lateral', muscle: 'core', difficulty: 2, equipment: 'ninguno', instructions: 'Cadera arriba, cuerpo alineado. 20 segundos cada lado.', load_type: 'time', cognitive_load: 'med', emoji: '🧘', cue: 'Cadera arriba, cuerpo alineado' },
  { id: 'mountain_climbers', name: 'Escaladores', muscle: 'core', difficulty: 2, equipment: 'ninguno', instructions: 'En plancha, rodillas al pecho rápido', load_type: 'reps', cognitive_load: 'med', emoji: '⛰️', cue: 'En plancha, rodillas al pecho rápido' },
  { id: 'shoulder_taps', name: 'Toque de hombros', muscle: 'core', difficulty: 2, equipment: 'ninguno', instructions: 'En plancha, toca el hombro contrario', load_type: 'reps', cognitive_load: 'med', emoji: '👋', cue: 'En plancha, toca el hombro contrario' },
  { id: 'crunch', name: 'Crunch', muscle: 'core', difficulty: 1, equipment: 'ninguno', instructions: 'Encoge el abdomen, baja controlado', load_type: 'reps', cognitive_load: 'low', emoji: '🧎', cue: 'Encoge el abdomen, baja controlado' },

  // --- Cardio ---
  { id: 'jumping_jacks', name: 'Jumping jacks', muscle: 'cardio', difficulty: 1, equipment: 'ninguno', instructions: 'Salta abriendo brazos y piernas', load_type: 'reps', cognitive_load: 'low', emoji: '⭐', cue: 'Salta abriendo brazos y piernas' },
  { id: 'high_knees', name: 'Rodillas arriba', muscle: 'cardio', difficulty: 1, equipment: 'ninguno', instructions: 'Corre en el sitio, rodillas altas', load_type: 'reps', cognitive_load: 'low', emoji: '🏃', cue: 'Corre en el sitio, rodillas altas' },
  { id: 'burpees', name: 'Burpees', muscle: 'cardio', difficulty: 3, equipment: 'ninguno', instructions: 'Sentadilla, plancha, flexión, salto', load_type: 'reps', cognitive_load: 'high', emoji: '💥', cue: 'Sentadilla, plancha, flexión, salto' },
  { id: 'half_burpees', name: 'Medio burpee', muscle: 'cardio', difficulty: 2, equipment: 'ninguno', instructions: 'Sentadilla, plancha y vuelve', load_type: 'reps', cognitive_load: 'med', emoji: '💫', cue: 'Sentadilla, plancha y vuelve' },

  // --- Movilidad ---
  { id: 'arm_circles', name: 'Círculos de brazos', muscle: 'hombros', difficulty: 1, equipment: 'ninguno', instructions: 'Brazos extendidos, círculos amplios', load_type: 'reps', cognitive_load: 'low', emoji: '🔄', cue: 'Brazos extendidos, círculos amplios' },
  { id: 'yoga_flow', name: 'Yoga flow suave', muscle: 'cardio', difficulty: 1, equipment: 'ninguno', instructions: 'Plancha → cobra → perro boca abajo. 60 segundos de flujo.', load_type: 'time', cognitive_load: 'low', emoji: '🌊', cue: 'Plancha → cobra → perro boca abajo' },

  // ═══════════════════════════════════════════
  //  CON MANCUERNAS
  // ═══════════════════════════════════════════

  // --- Empuje (Push) ---
  { id: 'db_bench_press', name: 'Press de pecho con mancuernas', muscle: 'pecho', difficulty: 2, equipment: 'mancuernas', instructions: 'Tumbado, empuja las mancuernas', load_type: 'reps', cognitive_load: 'med', emoji: '🏋️', cue: 'Tumbado, empuja las mancuernas' },
  { id: 'db_shoulder_press', name: 'Press de hombros', muscle: 'hombros', difficulty: 2, equipment: 'mancuernas', instructions: 'Empuja sobre la cabeza', load_type: 'reps', cognitive_load: 'med', emoji: '🏋️', cue: 'Empuja sobre la cabeza' },
  { id: 'french_press', name: 'Press francés', muscle: 'brazos', difficulty: 2, equipment: 'mancuernas', instructions: 'Codos arriba, extiende el antebrazo', load_type: 'reps', cognitive_load: 'med', emoji: '🇫🇷', cue: 'Codos arriba, extiende el antebrazo' },
  { id: 'db_bicep_curl', name: 'Curl de bíceps', muscle: 'brazos', difficulty: 1, equipment: 'mancuernas', instructions: 'Codos fijos, sube la mancuerna', load_type: 'reps', cognitive_load: 'low', emoji: '💪', cue: 'Codos fijos, sube la mancuerna' },
  { id: 'lateral_raises', name: 'Elevaciones laterales', muscle: 'hombros', difficulty: 1, equipment: 'mancuernas', instructions: 'Brazos hasta la altura del hombro', load_type: 'reps', cognitive_load: 'low', emoji: '🕊️', cue: 'Brazos hasta la altura del hombro' },

  // --- Jalón (Pull) ---
  { id: 'db_row', name: 'Remo con mancuerna', muscle: 'espalda', difficulty: 2, equipment: 'mancuernas', instructions: 'Inclinado, tira del codo hacia atrás', load_type: 'reps', cognitive_load: 'med', emoji: '🚣', cue: 'Inclinado, tira del codo hacia atrás' },
  { id: 'db_rev_fly', name: 'Aperturas inversas', muscle: 'espalda', difficulty: 2, equipment: 'mancuernas', instructions: 'Inclinado, abre los brazos hacia atrás', load_type: 'reps', cognitive_load: 'low', emoji: '🕊️', cue: 'Inclinado, abre los brazos hacia atrás' },

  // --- Piernas ---
  { id: 'goblet_squat', name: 'Sentadilla goblet', muscle: 'piernas', difficulty: 2, equipment: 'mancuernas', instructions: 'Mancuerna al pecho, baja profundo', load_type: 'reps', cognitive_load: 'med', emoji: '🏆', cue: 'Mancuerna al pecho, baja profundo' },
  { id: 'romanian_deadlift', name: 'Peso muerto rumano', muscle: 'piernas', difficulty: 2, equipment: 'mancuernas', instructions: 'Cadera atrás, espalda neutra', load_type: 'reps', cognitive_load: 'high', emoji: '🏋️', cue: 'Cadera atrás, espalda neutra' },
  { id: 'db_lunge', name: 'Zancada con mancuernas', muscle: 'piernas', difficulty: 2, equipment: 'mancuernas', instructions: 'Zancada con peso a los lados', load_type: 'reps', cognitive_load: 'med', emoji: '🚶', cue: 'Zancada con peso a los lados' },
  { id: 'db_hip_thrust', name: 'Hip thrust con mancuerna', muscle: 'gluteos', difficulty: 2, equipment: 'mancuernas', instructions: 'Espalda en banco, empuja la cadera', load_type: 'reps', cognitive_load: 'med', emoji: '🌉', cue: 'Espalda en banco, empuja la cadera' },
  { id: 'db_calf_raise', name: 'Gemelos con mancuernas', muscle: 'piernas', difficulty: 1, equipment: 'mancuernas', instructions: 'Eleva los talones con peso', load_type: 'reps', cognitive_load: 'low', emoji: '🦶', cue: 'Eleva los talones con peso' },

  // --- Core ---
  { id: 'db_russian_twist', name: 'Russian twist con mancuerna', muscle: 'core', difficulty: 2, equipment: 'mancuernas', instructions: 'Rota el torso lado a lado', load_type: 'reps', cognitive_load: 'med', emoji: '🔄', cue: 'Rota el torso lado a lado' },

  // ═══════════════════════════════════════════
  //  GIMNASIO
  // ═══════════════════════════════════════════

  // --- Empuje (Push) ---
  { id: 'bb_bench_press', name: 'Press de banca', muscle: 'pecho', difficulty: 2, equipment: 'gimnasio', instructions: 'Empuja la barra sobre el pecho', load_type: 'reps', cognitive_load: 'med', emoji: '🛋️', cue: 'Empuja la barra sobre el pecho' },
  { id: 'bb_incline_bench', name: 'Press inclinado', muscle: 'pecho', difficulty: 2, equipment: 'gimnasio', instructions: 'Banca inclinada, empuja hacia arriba', load_type: 'reps', cognitive_load: 'med', emoji: '🛋️', cue: 'Banca inclinada, empuja hacia arriba' },
  { id: 'bb_ohp', name: 'Press militar', muscle: 'hombros', difficulty: 2, equipment: 'gimnasio', instructions: 'Empuja la barra sobre la cabeza', load_type: 'reps', cognitive_load: 'med', emoji: '🎖️', cue: 'Empuja la barra sobre la cabeza' },
  { id: 'bb_dip', name: 'Fondos en paralelas', muscle: 'pecho', difficulty: 3, equipment: 'gimnasio', instructions: 'Baja hasta 90° y sube', load_type: 'reps', cognitive_load: 'high', emoji: '📐', cue: 'Baja hasta 90° y sube' },

  // --- Jalón (Pull) ---
  { id: 'bb_pullup', name: 'Dominadas', muscle: 'espalda', difficulty: 3, equipment: 'gimnasio', instructions: 'Tira hasta la barbilla sobre la barra', load_type: 'reps', cognitive_load: 'high', emoji: '🐒', cue: 'Tira hasta la barbilla sobre la barra' },
  { id: 'bb_lat_pulldown', name: 'Jalón al pecho', muscle: 'espalda', difficulty: 1, equipment: 'gimnasio', instructions: 'Tira de la barra hacia el pecho', load_type: 'reps', cognitive_load: 'low', emoji: '⬇️', cue: 'Tira de la barra hacia el pecho' },
  { id: 'bb_seated_row', name: 'Remo en máquina', muscle: 'espalda', difficulty: 1, equipment: 'gimnasio', instructions: 'Tira hacia tu abdomen', load_type: 'reps', cognitive_load: 'low', emoji: '🚣', cue: 'Tira hacia tu abdomen' },
  { id: 'bb_face_pull', name: 'Face pull', muscle: 'hombros', difficulty: 1, equipment: 'gimnasio', instructions: 'Tira de la cuerda hacia la cara', load_type: 'reps', cognitive_load: 'low', emoji: '🎯', cue: 'Tira de la cuerda hacia la cara' },
  { id: 'bb_barbell_row', name: 'Remo con barra', muscle: 'espalda', difficulty: 2, equipment: 'gimnasio', instructions: 'Inclinado, tira la barra al abdomen', load_type: 'reps', cognitive_load: 'high', emoji: '🚣', cue: 'Inclinado, tira la barra al abdomen' },

  // --- Piernas ---
  { id: 'bb_squat', name: 'Sentadilla con barra', muscle: 'piernas', difficulty: 3, equipment: 'gimnasio', instructions: 'Barra en la espalda, baja profundo', load_type: 'reps', cognitive_load: 'high', emoji: '🏋️', cue: 'Barra en la espalda, baja profundo' },
  { id: 'bb_deadlift', name: 'Peso muerto', muscle: 'piernas', difficulty: 3, equipment: 'gimnasio', instructions: 'Barra al suelo, cadera y rodillas a la vez', load_type: 'reps', cognitive_load: 'high', emoji: '🏋️', cue: 'Barra al suelo, cadera y rodillas a la vez' },
  { id: 'bb_hip_thrust', name: 'Hip thrust con barra', muscle: 'gluteos', difficulty: 2, equipment: 'gimnasio', instructions: 'Espalda en banco, empuja la cadera', load_type: 'reps', cognitive_load: 'med', emoji: '🌉', cue: 'Espalda en banco, empuja la cadera' },
  { id: 'bb_leg_press', name: 'Prensa de piernas', muscle: 'piernas', difficulty: 1, equipment: 'gimnasio', instructions: 'Empuja sin bloquear rodillas', load_type: 'reps', cognitive_load: 'low', emoji: '🦵', cue: 'Empuja sin bloquear rodillas' },
  { id: 'bb_leg_curl', name: 'Curl femoral', muscle: 'piernas', difficulty: 1, equipment: 'gimnasio', instructions: 'Dobla la rodilla contra resistencia', load_type: 'reps', cognitive_load: 'low', emoji: '🦵', cue: 'Dobla la rodilla contra resistencia' },
  { id: 'bb_leg_ext', name: 'Extensión de cuádriceps', muscle: 'piernas', difficulty: 1, equipment: 'gimnasio', instructions: 'Extiende la rodilla controlado', load_type: 'reps', cognitive_load: 'low', emoji: '🦵', cue: 'Extiende la rodilla controlado' },

  // --- Brazos ---
  { id: 'bb_barbell_curl', name: 'Curl con barra', muscle: 'brazos', difficulty: 1, equipment: 'gimnasio', instructions: 'Sube la barra con los bíceps', load_type: 'reps', cognitive_load: 'low', emoji: '💪', cue: 'Sube la barra con los bíceps' },
  { id: 'bb_tricep_pushdown', name: 'Extensión tríceps en polea', muscle: 'brazos', difficulty: 1, equipment: 'gimnasio', instructions: 'Codos pegados, extiende hacia abajo', load_type: 'reps', cognitive_load: 'low', emoji: '🔽', cue: 'Codos pegados, extiende hacia abajo' },

  // --- Core ---
  { id: 'bb_cable_crunch', name: 'Crunch en polea', muscle: 'core', difficulty: 1, equipment: 'gimnasio', instructions: 'De rodillas, encoge el abdomen', load_type: 'reps', cognitive_load: 'low', emoji: '🧎', cue: 'De rodillas, encoge el abdomen' },
  { id: 'bb_hanging_leg_raise', name: 'Elevación de piernas colgado', muscle: 'core', difficulty: 3, equipment: 'gimnasio', instructions: 'Cuélgate, sube las piernas a 90°', load_type: 'reps', cognitive_load: 'high', emoji: '🤸', cue: 'Cuélgate, sube las piernas a 90°' },

  // --- Cardio ---
  { id: 'gym_elliptical', name: 'Elíptica', muscle: 'cardio', difficulty: 1, equipment: 'gimnasio', instructions: 'Ritmo suave y constante. 3-5 minutos.', load_type: 'time', cognitive_load: 'low', emoji: '🌀', cue: 'Ritmo suave y constante' },
  { id: 'gym_bike', name: 'Bicicleta estática', muscle: 'cardio', difficulty: 1, equipment: 'gimnasio', instructions: 'Pedaleo constante, resistencia media. 3-5 minutos.', load_type: 'time', cognitive_load: 'low', emoji: '🚴', cue: 'Pedaleo constante, resistencia media' },
  { id: 'gym_incline_walk', name: 'Caminata en pendiente', muscle: 'cardio', difficulty: 1, equipment: 'gimnasio', instructions: 'Cinta inclinada, paso constante. 3-5 minutos.', load_type: 'time', cognitive_load: 'low', emoji: '⛰️', cue: 'Cinta inclinada, paso constante' },
  { id: 'gym_rowing', name: 'Remo ergómetro', muscle: 'cardio', difficulty: 2, equipment: 'gimnasio', instructions: 'Empuje de piernas, luego brazos. 3-5 minutos.', load_type: 'time', cognitive_load: 'med', emoji: '🚣', cue: 'Empuje de piernas, luego brazos' },
];
