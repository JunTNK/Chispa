'use client';

/**
 * ExerciseFlipbook — loop animado de los frames del ejercicio.
 *
 * El catálogo guarda 2 frames por ejercicio (posición inicial / final) en
 * `images`. Este componente los alterna en bucle para enseñar el MOVIMIENTO,
 * que una foto estática no muestra.
 *
 * Resiliencia de frames: algunos ejercicios solo tienen descargado el frame
 * inicial (`0.jpg`). Si un frame falla al cargar, se descarta y el loop sigue
 * con los sanos; si solo queda uno, se degrada a foto estática — NUNCA
 * desaparece la imagen ni se rompe el layout.
 *
 * Principio ND:
 * - `prefers-reduced-motion` → sin autoplay: solo control manual.
 * - Controles grandes (≥44px) con aria-label, indicador de frame visible.
 * - Cámara lenta (0.5×) para aprendizaje motor / dispraxia.
 * - Sin secuencia de frames → no renderiza nada (el contexto ya muestra la
 *   foto estática, no se rompe el layout).
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { getExerciseImageUrls } from '@/lib/utils/exercise-visuals';
import { Play, Pause, ChevronLeft, ChevronRight, Gauge } from 'lucide-react';
import type { Exercise } from '@/types';

interface ExerciseFlipbookProps {
  exercise: Exercise;
  className?: string;
  /** Se dispara cuando el usuario toma el control manual (play/pausa, prev/next). */
  onUserControl?: () => void;
}

/** API imperativa para sincronizar pasos ↔ animación (explicador → flipbook). */
export interface ExerciseFlipbookHandle {
  /**
   * Salta a la fase del movimiento correspondiente a un paso (0-based) dentro
   * de los frames disponibles y pausa el loop. No-op si no hay 2+ frames.
   * Mapeo lineal: primer paso → frame inicial, último → frame final.
   */
  jumpToStep: (stepIndex: number, totalSteps: number) => void;
}

const SPEED_MS = [1600, 900]; // lento (0.5×) y normal (1×)

export const ExerciseFlipbook = React.forwardRef<ExerciseFlipbookHandle, ExerciseFlipbookProps>(
  function ExerciseFlipbook({ exercise, className = '', onUserControl }, ref) {
  const t = useT();
  const reduceMotion = useStore((s) => s.prefs.reduceMotion);
  // Preferencia de autoplay persistida (pausar en el flipbook la desactiva)
  const autoplayPref = useStore((s) => s.prefs.explainerAutoplay ?? true);
  const setExplainerAutoplay = useStore((s) => s.setExplainerAutoplay);
  // Cámara lenta persistida: se recuerda entre sesiones
  const persistedSlow = useStore((s) => s.prefs.explainerSlow ?? false);
  const setExplainerSlow = useStore((s) => s.setExplainerSlow);
  const urls = React.useMemo(() => getExerciseImageUrls(exercise), [exercise]);

  const [frame, setFrame] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [slow, setSlow] = React.useState(persistedSlow);
  const [broken, setBroken] = React.useState<ReadonlySet<number>>(new Set());

  // Frames que cargaron bien (descarta los que dieron 404/error)
  const validUrls = React.useMemo(
    () => urls.filter((_, i) => !broken.has(i)),
    [urls, broken]
  );

  // ⚠️ Todos los hooks ANTES de los early returns (rules-of-hooks)

  // reduceMotion → nunca autoplay (control manual, sensibilidad vestibular)
  React.useEffect(() => {
    if (reduceMotion) setPlaying(false);
  }, [reduceMotion]);

  // Loop automático de frames (solo con 2+ frames sanos)
  React.useEffect(() => {
    if (!playing || validUrls.length < 2) return;
    const id = setInterval(
      () => setFrame((f) => (f + 1) % validUrls.length),
      SPEED_MS[slow ? 0 : 1]
    );
    return () => clearInterval(id);
  }, [playing, validUrls.length, slow]);

  // Al cambiar de ejercicio: reset + autoplay (salvo reduceMotion o la
  // preferencia persistida de no-autoplay)
  React.useEffect(() => {
    setFrame(0);
    setBroken(new Set());
    if (!reduceMotion) setPlaying(autoplayPref);
  }, [exercise.id, reduceMotion, autoplayPref]);

  /**
   * Sincronía paso ↔ flipbook: interpola linealmente el paso al frame
   * (paso 0 → frame inicial, último paso → frame final) y pausa el loop
   * para que la fase quede visible. Con 1 solo paso o un solo frame sano
   * es un no-op (no hay fases que mostrar).
   */
  const jumpToStep = React.useCallback(
    (stepIndex: number, totalSteps: number) => {
      if (validUrls.length < 2 || totalSteps <= 1) return;
      const target = Math.round((stepIndex * (validUrls.length - 1)) / (totalSteps - 1));
      const clamped = Math.max(0, Math.min(target, validUrls.length - 1));
      setPlaying(false);
      setFrame(clamped);
    },
    [validUrls]
  );

  // Exponer el handle ANTES de los early returns (rules-of-hooks)
  React.useImperativeHandle(ref, () => ({ jumpToStep }));

  // Sin secuencia → nada (fallback elegante, el contexto muestra la foto)
  if (urls.length < 2) return null;
  if (validUrls.length === 0) return null;

  // Un solo frame sano → foto estática (sin autoplay ni controles de frame)
  if (validUrls.length < 2) {
    return (
      <div className={`rounded-2xl overflow-hidden border border-white/[.08] bg-[#10141f] ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={validUrls[0]}
          alt={t('Demostración de {name}', { name: exercise.name })}
          loading="lazy"
          draggable={false}
          className="w-full aspect-square object-contain"
        />
      </div>
    );
  }

  const prev = () => {
    setPlaying(false);
    setFrame((f) => (f - 1 + validUrls.length) % validUrls.length);
    onUserControl?.();
  };
  const next = () => {
    setPlaying(false);
    setFrame((f) => (f + 1) % validUrls.length);
    onUserControl?.();
  };

  const markBroken = () => {
    // Marca el índice REAL en `urls` (no en validUrls) para que el set siempre
    // quede alineado aunque se descarten varios frames.
    const realIndex = urls.indexOf(validUrls[safeFrame]);
    setBroken((prev) => {
      if (realIndex === -1 || prev.has(realIndex)) return prev;
      const nextSet = new Set(prev);
      nextSet.add(realIndex);
      return nextSet;
    });
  };

  // Clamp: si un frame se marca roto en medio del loop, no quedarse fuera de rango
  const safeFrame = Math.min(frame, validUrls.length - 1);

  return (
    <div className={`rounded-2xl overflow-hidden border border-white/[.08] bg-[#10141f] ${className}`}>
      <div className="relative aspect-square">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={safeFrame}
            src={validUrls[safeFrame]}
            alt={t('Demostración de {name}', { name: exercise.name })}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
            onError={markBroken}
          />
        </AnimatePresence>
        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[11px] font-semibold tabular-nums text-white/80">
          {frame + 1}/{validUrls.length}
        </span>
      </div>

      <div className="flex items-center justify-center gap-1.5 px-2 pb-2">
        <button
          onClick={() => {
            const next = !playing;
            setPlaying(next);
            // Persistir la preferencia: pausar = "no autoplay la próxima",
            // reproducir = "autoplay la próxima"
            setExplainerAutoplay(next);
            onUserControl?.();
          }}
          aria-label={playing ? t('Pausar animación') : t('Reproducir animación')}
          aria-pressed={playing}
          className="w-11 h-11 rounded-xl bg-[#ffb454] text-[#1a1206] flex items-center justify-center hover:bg-[#ffc46e] active:scale-95 transition-all"
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          onClick={prev}
          aria-label={t('Frame anterior')}
          className="w-11 h-11 rounded-xl border border-white/[.08] bg-white/[.04] text-[var(--muted)] flex items-center justify-center hover:bg-white/[.08] active:scale-95 transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={next}
          aria-label={t('Frame siguiente')}
          className="w-11 h-11 rounded-xl border border-white/[.08] bg-white/[.04] text-[var(--muted)] flex items-center justify-center hover:bg-white/[.08] active:scale-95 transition-all"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={() => {
            const next = !slow;
            setSlow(next);
            // Persistir: la cámara lenta elegida se recuerda entre sesiones
            setExplainerSlow(next);
          }}
          aria-label={t('Cámara lenta')}
          aria-pressed={slow}
          className={`w-11 h-11 rounded-xl border flex items-center justify-center gap-1 text-[11px] font-bold transition-all active:scale-95 ${
            slow
              ? 'border-[rgba(76,201,240,0.5)] bg-[rgba(76,201,240,0.12)] text-[#4CC9F0]'
              : 'border-white/[.08] bg-white/[.04] text-[var(--muted)] hover:bg-white/[.08]'
          }`}
        >
          <Gauge size={16} />
          0.5×
        </button>
      </div>
    </div>
  );
  }
);
