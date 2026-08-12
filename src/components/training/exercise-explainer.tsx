'use client';

/**
 * ExerciseExplainer — explicación del ejercicio en el idioma configurado.
 *
 * ND (neurodivergente):
 * - La información en el IDIOMA de la app: textos del catálogo (inglés) se
 *   localizan con el LLM on-device + caché IndexedDB (traduce una vez, sirve
 *   desde caché, cero red). Mientras traduce: skeleton, nunca inglés a medias.
 * - Tip card destacada con el cue (el 20% esencial) — no texto gris perdido.
 * - Micro-pasos atómicos como checklist numerado, cada uno audible por
 *   separado (desglose atómico aplicado a las instrucciones).
 * - "Escuchar" (TTS on-device, Web Speech API / voz neural) con velocidad
 *   0.75×/1×/1.25× — escuchar en vez de leer (TDAH, dislexia, fatiga visual).
 * - Flipbook con los frames del ejercicio (el movimiento, no la foto estática)
 *   que respeta prefers-reduced-motion (sin autoplay).
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { ChevronDown, ShieldAlert, Target, Lightbulb, Zap, Volume2, Square, Play } from 'lucide-react';
import { speak, stopSpeak, voiceSupported } from '@/lib/audio/speak';
import { useLocalizedExerciseText, splitNumberedSteps } from '@/lib/utils/exercise-translate';
import { ExerciseFlipbook } from './exercise-flipbook';
import type { ExerciseFlipbookHandle } from './exercise-flipbook';
import type { Exercise, ExplainerSection } from '@/types';

interface ExerciseExplainerProps {
  exercise: Exercise;
}

type Section = ExplainerSection;

const SECTION_META: Record<Section, { icon: typeof Lightbulb; color: string; bg: string }> = {
  howTo: {
    icon: Lightbulb,
    color: '#ffb454',
    bg: 'rgba(255,180,84,0.08)',
  },
  benefits: {
    icon: Target,
    color: '#00D4AA',
    bg: 'rgba(0,212,170,0.08)',
  },
  precautions: {
    icon: ShieldAlert,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
  },
};

const RATES = [0.75, 1, 1.25];

/** Skeleton de lectura mientras el LLM on-device traduce. */
function SkeletonLine({ className = 'w-3/4' }: { className?: string }) {
  return <span className={`skeleton inline-block h-3.5 rounded-md ${className}`} />;
}

/**
 * Botón "Escuchar" — reproduce/detiene un texto con la voz del usuario.
 * Si `showRate`, muestra el chip de velocidad (0.75×/1×/1.25×) junto al play.
 */
function ListenButton({
  id,
  text,
  speakingId,
  onSpeak,
  rate,
  onCycleRate,
  showRate = false,
  label,
  disabled = false,
}: {
  id: string;
  text: string;
  speakingId: string | null;
  onSpeak: (id: string, text: string) => void;
  rate: number;
  onCycleRate: () => void;
  showRate?: boolean;
  label?: string;
  disabled?: boolean;
}) {
  const t = useT();
  if (!voiceSupported()) return null;
  const isSpeaking = speakingId === id;
  const isDisabled = disabled || !text.trim();

  return (
    <span className="flex items-center gap-1 shrink-0">
      {showRate && (
        <button
          onClick={onCycleRate}
          aria-label={t('Velocidad de lectura')}
          className="min-w-9 h-9 px-1.5 rounded-lg border border-white/[.08] bg-white/[.04] text-[10px] font-bold tabular-nums text-[var(--muted)] hover:bg-white/[.08] active:scale-95 transition-all"
        >
          {rate}×
        </button>
      )}
      <button
        onClick={() => onSpeak(id, text)}
        aria-label={isSpeaking ? t('Detener audio') : (label ?? t('Escuchar'))}
        aria-pressed={isSpeaking}
        disabled={isDisabled}
        className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
          isSpeaking
            ? 'border-[rgba(255,180,84,0.5)] bg-[rgba(255,180,84,0.12)] text-[#ffb454]'
            : 'border-white/[.08] bg-white/[.04] text-[var(--muted)] hover:bg-white/[.08] hover:text-[var(--text)]'
        }`}
      >
        {isSpeaking ? <Square size={14} /> : <Volume2 size={14} />}
      </button>
    </span>
  );
}

/** Sección colapsable con header (icono + título + escuchar) y contenido libre. */
function ExplainerSection({
  section,
  title,
  isOpen,
  onToggle,
  children,
  listenId,
  listenText,
  speakingId,
  onSpeak,
  rate,
  onCycleRate,
  label,
  disabled = false,
}: {
  section: Section;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  listenId: string;
  listenText: string;
  speakingId: string | null;
  onSpeak: (id: string, text: string) => void;
  rate: number;
  onCycleRate: () => void;
  label: string;
  disabled?: boolean;
}) {
  const meta = SECTION_META[section];
  const Icon = meta.icon;

  return (
    <div className="border border-white/[.07] rounded-xl overflow-hidden">
      <div className="flex items-center gap-1 pr-1.5">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/[.04] transition-colors rounded-l-xl"
        >
          <span
            className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0"
            style={{ backgroundColor: meta.bg }}
          >
            <Icon size={14} style={{ color: meta.color }} />
          </span>
          <span className="text-sm font-semibold flex-1">{title}</span>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[var(--muted)]"
          >
            <ChevronDown size={14} />
          </motion.span>
        </button>
        <ListenButton id={listenId} text={listenText} speakingId={speakingId} onSpeak={onSpeak} rate={rate} onCycleRate={onCycleRate} label={label} disabled={disabled} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExerciseExplainer({ exercise }: ExerciseExplainerProps) {
  const t = useT();
  const lang = useStore((s) => s.lang);
  // Velocidad de lectura persistida: se recuerda entre sesiones. Se clampea a
  // un valor válido del ciclo por si la persistencia guardó un dato corrupto.
  const persistedRate = useStore((s) => s.prefs.explainerRate ?? 1);
  const setExplainerRate = useStore((s) => s.setExplainerRate);
  // Sección abierta persistida: se recuerda entre sesiones (null = todas colapsadas).
  // Se valida contra las secciones reales por si la persistencia guardó algo inválido.
  const persistedOpenSection = useStore((s) => s.prefs.explainerOpenSection ?? null);
  const setExplainerOpenSection = useStore((s) => s.setExplainerOpenSection);
  const [openSection, setOpenSection] = React.useState<Section | null>(() => {
    const sections: readonly Section[] = ['howTo', 'benefits', 'precautions'];
    return persistedOpenSection !== null && sections.includes(persistedOpenSection)
      ? persistedOpenSection
      : null;
  });
  const [speakingId, setSpeakingId] = React.useState<string | null>(null);
  const [rate, setRate] = React.useState(
    RATES.includes(persistedRate) ? persistedRate : 1
  );
  // Sincronía paso ↔ flipbook
  const flipbookRef = React.useRef<ExerciseFlipbookHandle>(null);
  const [activeStep, setActiveStep] = React.useState<number | null>(null);

  // Cortar la voz al desmontar el explainer y al cambiar de ejercicio (robustez:
  // no depender de que el padre desmonte el panel para cortar el audio).
  React.useEffect(() => () => stopSpeak(), []);
  React.useEffect(() => {
    stopSpeak();
    setSpeakingId(null);
    setActiveStep(null);
  }, [exercise.id]);

  // ─── Fuentes de texto ───
  const rawSteps = React.useMemo(() => {
    if (exercise.instructionsSteps && exercise.instructionsSteps.length > 0) {
      return exercise.instructionsSteps;
    }
    return exercise.instructions ? [exercise.instructions] : [];
  }, [exercise]);

  // Numerados para que el LLM conserve los pasos y podamos volver a dividirlos
  const stepsSource = React.useMemo(
    () => rawSteps.map((s, i) => `${i + 1}. ${s}`).join(' '),
    [rawSteps]
  );

  // Traducción localizada (LLM on-device + caché IndexedDB)
  const howTo = useLocalizedExerciseText(exercise.id, 'howTo', stepsSource, lang);
  const cue = useLocalizedExerciseText(exercise.id, 'cue', exercise.cue ?? '', lang);
  const benefits = useLocalizedExerciseText(exercise.id, 'benefits', exercise.benefits ?? '', lang);
  const precautions = useLocalizedExerciseText(exercise.id, 'precautions', exercise.precautions ?? '', lang);

  const microSteps = React.useMemo(() => {
    if (howTo.status === 'translated') return splitNumberedSteps(howTo.text);
    return rawSteps;
  }, [howTo, rawSteps]);

  // Sincronía paso ↔ flipbook: solo tiene sentido con 2+ frames y >1 paso.
  const syncAvailable =
    Boolean(exercise.images && exercise.images.length >= 2) && microSteps.length > 1;

  /** Tocar un micro-paso salta la animación a esa fase del movimiento. */
  const handleStepTap = (stepIndex: number) => {
    setActiveStep(stepIndex);
    flipbookRef.current?.jumpToStep(stepIndex, microSteps.length);
  };

  // Para qué sirve — beneficios explícitos o fallback por músculos (ya en ES)
  const muscleFallback =
    exercise.primaryMuscles && exercise.primaryMuscles.length > 0
      ? `${t('Trabaja')} ${exercise.primaryMuscles.join(', ')}${exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 ? `. ${t('Secundarios')}: ${exercise.secondaryMuscles.join(', ')}` : ''}`
      : '';
  const benefitsContent = exercise.benefits ? benefits.text : muscleFallback;

  const precautionsContent = exercise.precautions ? precautions.text : undefined;

  // ─── Audio ───
  const handleSpeak = (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (speakingId === id) {
      stopSpeak();
      setSpeakingId(null);
      return;
    }
    stopSpeak();
    setSpeakingId(id);
    void speak(trimmed, lang, rate);
  };

  const cycleRate = () => {
    // El rate solo cambia aquí → calcular desde el closure es seguro y mantiene
    // el updater puro (StrictMode lo invoca dos veces: sin efectos secundarios).
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    // Persistir: la velocidad elegida se recuerda entre sesiones
    setExplainerRate(next);
  };

  // ─── Secciones ───
  const sections: { key: Section; title: string; node: React.ReactNode; listenText: string }[] = [];

  if (howTo.status !== 'original' || rawSteps.length > 0) {
    sections.push({
      key: 'howTo',
      title: t('Cómo hacerlo'),
      listenText: microSteps.join(' '),
      node:
        howTo.status === 'translating' ? (
          <div className="space-y-2 py-1">
            <SkeletonLine />
            <SkeletonLine className="w-1/2" />
          </div>
        ) : microSteps.length > 1 ? (
          <div className="py-1">
            {syncAvailable && (
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] py-1.5">
                <Play size={12} className="text-[#ffb454] shrink-0" />
                {t('Toca un paso para verlo en la animación')}
              </p>
            )}
            <ol className="space-y-1">
              {microSteps.map((step, i) => {
                const isActive = activeStep === i;
                return (
                  <li key={i}>
                    <div
                      className={`flex items-start gap-2.5 -mx-2 px-2 py-1.5 rounded-xl transition-colors ${
                        isActive ? 'bg-[rgba(255,180,84,0.08)]' : ''
                      }`}
                    >
                      <button
                        onClick={() => handleStepTap(i)}
                        aria-current={isActive ? 'step' : undefined}
                        aria-label={t('Ver paso {n} en la animación', { n: i + 1 })}
                        className="flex-1 flex items-start gap-2.5 text-left min-h-11 rounded-lg transition-all active:scale-[0.99]"
                      >
                        <span
                          className={`mt-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors ${
                            isActive
                              ? 'bg-[#ffb454] text-[#1a1206]'
                              : 'bg-[rgba(255,180,84,0.12)] text-[#ffb454]'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span
                          className={`flex-1 text-xs leading-relaxed transition-colors ${
                            isActive ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                          }`}
                        >
                          {step}
                        </span>
                      </button>
                      <ListenButton
                        id={`step-${i}`}
                        text={step}
                        speakingId={speakingId}
                        onSpeak={handleSpeak}
                        rate={rate}
                        onCycleRate={cycleRate}
                        label={t('Escuchar paso {n}', { n: i + 1 })}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)] leading-relaxed py-0.5">{microSteps[0]}</p>
        ),
    });
  }

  if (benefitsContent) {
    sections.push({
      key: 'benefits',
      title: t('Para qué sirve'),
      listenText: benefitsContent,
      node:
        exercise.benefits && benefits.status === 'translating' ? (
          <SkeletonLine />
        ) : (
          <p className="text-xs text-[var(--muted)] leading-relaxed py-0.5">{benefitsContent}</p>
        ),
    });
  }

  if (precautionsContent) {
    sections.push({
      key: 'precautions',
      title: t('Precauciones'),
      listenText: precautionsContent,
      node:
        precautions.status === 'translating' ? (
          <SkeletonLine />
        ) : (
          <p className="text-xs text-[#fca5a5] leading-relaxed py-0.5">{precautionsContent}</p>
        ),
    });
  }

  // Tip card — solo si hay cue y la sección howTo no está abierta (evita duplicar)
  const showTip = Boolean(exercise.cue) && openSection !== 'howTo';
  const cueText =
    cue.status === 'translated' || cue.status === 'failed' ? cue.text : exercise.cue ?? '';

  const hasContent =
    sections.length > 0 || Boolean(exercise.cue) || (exercise.images && exercise.images.length >= 2);

  if (!hasContent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-2"
    >
      {/* 4 — Flipbook: el movimiento del ejercicio, no la foto estática.
          Si el usuario toma el control manual, el highlight de paso se limpia
          (el frame ya no corresponde a una fase elegida). */}
      <ExerciseFlipbook
        ref={flipbookRef}
        exercise={exercise}
        onUserControl={() => setActiveStep(null)}
      />

      {/* 2 — Tip card: el 20% esencial, destacado (cue) */}
      {showTip && (
        <div className="rounded-2xl border border-[rgba(255,180,84,0.25)] bg-[rgba(255,180,84,0.08)] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-lg bg-[rgba(255,180,84,0.16)] flex items-center justify-center shrink-0">
                <Zap size={13} className="text-[#ffb454]" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#ffb454] truncate">
                {t('Consejo CHISPA')}
              </span>
            </span>
            <ListenButton
              id="cue"
              text={cueText}
              speakingId={speakingId}
              onSpeak={handleSpeak}
              rate={rate}
              onCycleRate={cycleRate}
              showRate
              disabled={cue.status === 'translating'}
              label={t('Escuchar consejo')}
            />
          </div>
          {cue.status === 'translating' ? (
            <div className="mt-2 space-y-1.5">
              <SkeletonLine />
            </div>
          ) : (
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--text)]">{cueText}</p>
          )}
        </div>
      )}

      {/* 1 + 5 — Secciones (cómo hacerlo = micro-pasos atómicos) */}
      {sections.map((s) => (
        <ExplainerSection
          key={s.key}
          section={s.key}
          title={s.title}
          isOpen={openSection === s.key}
          onToggle={() => {
            const next = openSection === s.key ? null : s.key;
            setOpenSection(next);
            // Persistir: la sección abierta/colapsada se recuerda entre sesiones
            setExplainerOpenSection(next);
          }}
          listenId={s.key}
          listenText={s.listenText}
          speakingId={speakingId}
          onSpeak={handleSpeak}
          rate={rate}
          onCycleRate={cycleRate}
          label={t('Escuchar {title}', { title: s.title })}
          disabled={s.key === 'howTo' && howTo.status === 'translating'}
        >
          {s.node}
        </ExplainerSection>
      ))}
    </motion.div>
  );
}
