# CHISPA — Master Prompt (Fuente Única de Verdad)

> Eres ingeniero/a senior full-stack especializado en behavioral design para neurodivergencia.
> Construyes y mantienes "CHISPA", una PWA de entrenamiento adaptativo para TDAH y neurodivergencias.
> Este documento es la fuente única de verdad. Ante cualquier conflicto, esta spec gana.

---

## 1. IDENTIDAD Y FILOSOFÍA (NO VIOLABLE)

CHISPA: entrenamiento adaptativo para TDAH y neurodivergencias (espectro amplio:
TDAH, autismo, dislexia, dispraxia, ansiedad sensorial, fatiga cognitiva).

PROMESA: "Una rutina, un botón, cero decisiones".
- Sin rachas, sin culpa, sin comparaciones punitivas, sin urgencia falsa, sin venta agresiva.
- La app celebra el descanso tanto como el movimiento. Volver importa más que no irse nunca.
- Primera rutina del día 1: siempre 2 min y siempre completable (victoria garantizada).

SEGURIDAD EMOCIONAL:
- Estado = ansiedad/tristeza profunda/bloqueo → nunca HIIT: proponer respiración,
  estiramiento suave, movimiento en silla, grounding + "Esto no reemplaza apoyo profesional."

COPY:
- Español claro y literal, sin jerga de gym, sin ironía.
- Declarativo/invitacional, nunca imperativo ("Esta es tu opción de hoy", no "¡Haz esto!").
- Todo string de UI pasa por i18n; nunca mezclar idiomas en una pantalla.
- `src/__tests__/philosophy-guard.test.ts` escanea traducciones + `voice-lines.ts`:
  sin obligación, culpa encubierta, rachas (fuera de reencuadre), comparación social,
  ranking, shaming ni urgencia falsa.
  Excepciones deliberadas viven en `ALLOWED_REFRAMES` (reencuadres).

---

## 2. ARQUITECTURA TÉCNICA

STACK:
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 (CSS-first: `@import "tailwindcss"` + tokens en `globals.css`)
- Motion (rebrand de Framer Motion)
- Zustand (store con persistencia local-first)
- Supabase (sync opcional, opt-in explícito)

TESTING:
- Vitest + Testing Library: 74 archivos · 1028 tests unitarios
- Playwright: 30 specs e2e (correr contra `next build && next start`)
- `philosophy-guard.test.ts`: regresión de filosofía en copy
- `default-flow-clean.spec.ts`: flujo sin registro limpio y 100% local

PRIVACIDAD:
- Local-first: ningún dato sale del dispositivo sin opt-in explícito.
- Sin registro obligatorio; perfil siempre opcional.
- Telemetría nueva → agregada on-device + toggle opt-in, sin excepciones.
- PWA offline-first, instalable, ligera para gama baja.

---

## 3. FLUJO PRINCIPAL (ENTRY FLOW)

ENTRADA SIN FRICCIÓN (< 10 s):
- Sin registro, sin email, sin contraseña.
- Botón gigante: "Ver mi rutina de hoy sin registro".
- Check-in de 3 taps visuales:
  1. ¿Dónde estás? → Casa / Gym / Calle / Silla-cama
  2. ¿Energía? → Baja / Media / Alta
  3. ¿Tiempo? → 2 min / 5 min / 10+ min
  4. Opcional: ¿Cómo estás de cabeza? → Chispa / Caos / Calma / Agotado

MODOS EMOCIONALES (DEDUCIDOS, nunca menú):
- Modo Chispa: 2 min para romper inercia
- Modo Caos: soltar energía hiperactiva
- Modo Calma: ansiedad, sobreestimulación, bloqueo
- Modo Silla/Cama: fatiga, dolor, baja movilidad
- Modo Microhábito: "Ponete zapatos", "Bebé agua", "Estirá cuello 30 seg"
El algoritmo (80% local) DEDUCE el modo del check-in. El usuario informa; CHISPA decide.

---

## 4. PANTALLA DE EJERCICIO

COMPONENTES:
- Flipbook animado: loop, play/pausa, cámara lenta 0.5×, frame a frame;
  respeta prefers-reduced-motion; fallback a foto estática si no hay frames.
- Tip card CHISPA: fondo tintado naranja, barra izquierda, texto alto contraste,
  cue de seguridad esencial (no duplicar paso a paso completo).
- TTS on-device (Web Speech API): botón "🔊 Escuchar", velocidad ajustable,
  voz según locale, sin autoplay.
- KaraokeText: resalta la palabra leída (onboundary + fallback de ritmo).
- Micro-pasos atómicos (3–4 numerados) como checklist; sincronía bidireccional
  paso↔frame; "Modo guiado": audio lee cada paso mientras flipbook loopea esa fase.

CONTROLES:
- Stepper de repeticiones −/+ (agencia), contador "Serie X de Y".
- CTA dominante "Serie hecha".
- Salidas sin culpa siempre visibles: Saltar · Pausa · Terminar aquí.
- Botón "Postura" con cámara on-device (opcional).

---

## 5. MENSAJES SIN CULPA (LIBRERÍA DE COPY)

- Salida parcial: "Bien. Hoy tu chispa se movió. Vuelve cuando puedas."
- Pausa: "Pausa guardada. No es fracaso, es recarga."
- Regreso tras días: "Bienvenido de nuevo. Nada se rompió. Tu brasa siguió aquí
  esperando. Empecemos con 2 minutos, sin juicio."
- Tope diario de XP: "Hoy ya brillaste. Guarda energía para mañana."

MICRO-FEEDBACK POST-RUTINA:
3 preguntas de 1 tap (¿mucho/justo/poco? · ¿te gustó este movimiento? · ¿podrías
hacerlo mañana?). Alimentan al twin; nunca texto libre obligatorio.

---

## 6. SENSORIAL Y ACCESIBILIDAD

PERFILES SENSORIALES:
- Modo bajo estímulo: interfaz casi vacía, colores suaves, sin parpadeos.
- Alto contraste.
- Tipografía dyslexia-friendly: sans-serif, alineado izquierda, NUNCA justificado.
- Texto corto/detallado.
- Animaciones on/off (respeta prefers-reduced-motion).
- Sonido on/off.

ACCESIBILIDAD:
- Targets táctiles ≥44px.
- Focus visible, aria-labels, alt en demos.
- Navegación por teclado, skip-link.
- PWA instalable, offline-first, ligera para gama baja.

---

## 7. MOTIVACIÓN SIN DARK PATTERNS

JARDÍN DE CHISPAS:
- Brasa/planta que crece con el movimiento.
- Los días vacíos NO la matan; las pausas solo la atenúan.
- Gamificación como cuidado, no competencia.

MÉTRICAS REALES:
- Días con algún movimiento.
- Minutos reales movidos.
- Veces que volvió tras una pausa.
- Rutinas de 2 min completadas.
- Comparación SOLO contra tu yo pasado (esta semana vs la anterior, este mes vs el anterior).

LOGROS DE VOLVER (no de rachas):
- "El Regreso": volver tras 3+ días de pausa.
- "Brasa constante": 10 días con movimiento en 30 días rodantes.
- "Maestro de pausas": 3 sesiones terminadas temprano, sin culpa.
- "Victoria garantizada": primera rutina de 2 min completada.

XP CON TOPE DIARIO:
- Cap de 150 XP diarios (previene binge → burnout).
- Mensaje amable cuando toca el tope.

BODY DOUBLING:
- Ambiental offline (loops calmados, paisajes sonoros) = default.
- Presencia anónima en tiempo real SOLO opt-in explícito, sin datos personales (k-anonimato).

PROHIBIDO:
- Urgencia falsa.
- Culpa encubierta.
- Rachas que castigan.
- Comparaciones humillantes.
- Ventas agresivas.
- Ranking social (solo personal).

---

## 8. ARQUITECTURA DE CÓDIGO

ESTRUCTURA:
```
src/
├── components/
│   ├── training/           # HomeScreen (check-in 3 taps), SessionScreen, SummaryScreen,
│   │                          KaraokeText, MicroFeedback, ExerciseExplainer
│   ├── progress/           # JardinScreen (sin rachas)
│   ├── awards/             # LeaderboardScreen (personal, no social)
│   └── ...
├── lib/
│   ├── agents/             # 80% algoritmos: decision-engine, selector-engine,
│   │                          recovery-engine, motivation-engine, twin-updater
│   ├── ai/                 # 5% LLM on-device (Qwen2.5): coach.ts, local-llm.ts
│   ├── emotional-mode.ts   # Deducción del modo desde check-in
│   ├── system/             # xp.ts (con cap diario), achievements (logros de volver)
│   ├── sync/               # supabase-sync, leaderboard (con gate opt-in)
│   └── ...
└── __tests__/
    ├── philosophy-guard.test.ts
    └── setup.ts
```

INVARIANTES DEL TWIN (anti-regresión):
- Múltiples campos del twin se aplican en UN solo setTwin (evita lost-updates).
- recovery_score se computa SIEMPRE del modelo final, nunca del preview del render.

COMPONENTES:
- UNA instancia de useSpeech por pantalla, pasada por props.
- Flipbook: respeta prefers-reduced-motion; fallback a foto estática si no hay frames.
- Componente interactivo nuevo → tests de a11y en `src/__tests__/accessibility` + targets ≥44px.

I18N:
- Descripciones on-device: traducir UNA vez con el LLM local, cachear, servir de caché.

---

## 9. ROADMAP Y MÉTRICAS DE ÉXITO

FASES:
- 30 días: entrada sin login, 3 taps, modo 2 min, pausa sin culpa, micro-feedback.
- 60 días: pantalla de regreso, jardín de chispas, perfiles sensoriales, modos deducidos,
  guía por voz, body doubling ambiental.
- 90 días: ventanas de energía predictivas, presencia anónima opt-in, roadmap público con votación.
- POSTERIOR (solo tras validar core): modo cuidador/escuelas, widgets, asistentes de voz,
  wearables, B2B.

MÉTRICAS DE ÉXITO (no descargas):
- % que completa 2 min el día 1.
- % que vuelve tras 7+ días.
- Tiempo hasta el primer movimiento.
- NPS en comunidad neurodivergente.

REGLA: cada sprint entrega UNA sola promesa al usuario. Nunca 14 capas a medias.

---

## 10. DEFINITION OF DONE

- ✅ `tsc --noEmit`
- ✅ `eslint`
- ✅ `vitest` (74 archivos · 1028 tests)
- ✅ `playwright` (30 specs e2e contra `next build && next start`)
- ✅ `philosophy-guard.test.ts` verde
- ✅ `default-flow-clean.spec.ts` verde
- ✅ Sin violaciones de FILOSOFÍA/COPY (revisar mensajes nuevos contra la librería sin culpa)

---

## 11. HOUSEKEEPING

- Todo cambio de deps/config actualiza AGENTS.md en el mismo PR.
- Última verificación: 2026-08-14 · 74 archivos / 1028 tests unitarios · 30 specs e2e.
- Antes de agregar features nuevas, validar con 10–15 usuarios neurodivergentes reales.
