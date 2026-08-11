'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  Mic,
  Plus,
  Check,
  Sparkles,
  SlidersHorizontal,
  Activity,
  Dumbbell,
  Zap,
} from 'lucide-react';
import { useT } from '@/lib/i18n/use-t';
import { useStore } from '@/lib/store';
import { getExerciseImageUrls } from '@/lib/utils/exercise-visuals';
import type { Exercise, WorkoutExercise } from '@/types';
import {
  PATTERN_LABEL,
  DESIRED_PATTERNS,
  deriveBalance,
  rankSuggestions,
  buildPatternIndex,
  getPatterns,
  type Pattern,
  type SelectorFocus,
  type ScoredExercise,
} from '@/lib/agents/selector-engine';
import { cn } from '@/lib/utils/helpers';
import { muscleColor, muscleMark } from '@/lib/utils/muscles';
import { PATTERN_ICON, PATTERN_COLOR } from '@/lib/utils/pattern-visuals';

// ─── Iconos y colores por patrón ──────────────────────────────────────────
// PATTERN_ICON / PATTERN_COLOR viven en pattern-visuals.ts (una sola fuente
// de verdad alineada con la taxonomía de patrones del selector-engine).

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Marca por músculo (fallback tipográfico cuando no hay foto). */
function MuscleMark({ exercise, size = 64 }: { exercise: Exercise; size?: number }) {
  const color = muscleColor(exercise.muscle);
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `${color}1a` }}
      aria-hidden
    >
      <span className="font-black" style={{ color, fontSize: size * 0.42 }}>
        {muscleMark(exercise.muscle)}
      </span>
    </div>
  );
}

/** Foto con dos ángulos (crossfade al pasar/tocar) o marca por músculo. */
function ExercisePhoto({
  exercise,
  className = '',
}: {
  exercise: Exercise;
  className?: string;
}) {
  const [angle, setAngle] = React.useState(0);
  const [broken, setBroken] = React.useState(false);
  const urls = getExerciseImageUrls(exercise);

  React.useEffect(() => {
    setAngle(0);
    setBroken(false);
  }, [exercise.id]);

  // Respaldo determinista: marca por músculo, nunca un icono roto ni un hueco vacío
  if (urls.length === 0 || broken) {
    return (
      <div className={cn('overflow-hidden', className)}>
        <MuscleMark exercise={exercise} />
      </div>
    );
  }

  const src = urls[Math.min(angle, urls.length - 1)];

  return (
    <div
      className={cn('relative overflow-hidden bg-[#0f1420]', className)}
      onMouseEnter={() => urls.length > 1 && setAngle(1)}
      onMouseLeave={() => setAngle(0)}
    >
      <AnimatePresence mode="popLayout">
        <motion.img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full h-full object-cover"
          onError={() => {
            // El segundo ángulo (1.jpg) puede no existir en los assets locales:
            // reverte a la primera, no matamos la foto entera (solo si 0.jpg
            // también falla mostramos la marca por músculo).
            if (angle > 0) setAngle(0);
            else setBroken(true);
          }}
        />
      </AnimatePresence>
      {urls.length > 1 && (
        <span className="absolute bottom-1 right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 text-white/90">
          {angle === 0 ? '1/2' : '2/2'}
        </span>
      )}
    </div>
  );
}

interface SelectorProps {
  focus: SelectorFocus;
  /** Pool filtrado por enfoque y equipo (el catálogo real, nunca la selección) */
  pool: Exercise[];
  /** Catálogo completo para resolver patrones de ejercicios ya elegidos */
  catalog: Exercise[];
  selected: WorkoutExercise[];
  onAddMany: (exercises: Exercise[]) => void;
  onRemove: (exerciseId: string) => void;
}

// ─── Componente principal ─────────────────────────────────────────────────

export function ExerciseSelector({
  focus,
  pool,
  catalog,
  selected,
  onAddMany,
  onRemove,
}: SelectorProps) {
  const t = useT();
  const lang = useStore((s) => s.lang);
  // Historial real de interacción del Digital Twin: alimenta la afinidad
  // entrenada (capa 01) — sin historial, el score queda en la fórmula transparente.
  const exProgress = useStore((s) => s.twin?.ex_progress);
  // Ejercicios de la última sesión: novedad (variedad = dopamina, ADHD-friendly).
  const workouts = useStore((s) => s.workouts);

  const [mode, setMode] = React.useState<'guided' | 'custom'>('guided');
  const [patternFilter, setPatternFilter] = React.useState<Pattern | null>(null);
  const [search, setSearch] = React.useState('');
  const [listening, setListening] = React.useState(false);
  const [voiceNote, setVoiceNote] = React.useState('');
  const [visibleCount, setVisibleCount] = React.useState(24);
  const [sparks, setSparks] = React.useState<{ id: number; from: { x: number; y: number } }[]>([]);
  const catalogRef = React.useRef<HTMLDivElement>(null);
  const statsRef = React.useRef<HTMLDivElement>(null);

  const selectedIds = React.useMemo(() => new Set(selected.map((s) => s.exercise_id)), [selected]);
  const balance = React.useMemo(
    () =>
      deriveBalance(
        selected.map((s) => ({ exercise_id: s.exercise_id, sets: s.sets, reps: s.reps, rest: s.rest })),
        catalog,
        focus
      ),
    [selected, catalog, focus]
  );

  // IDs de la última sesión completada (o la última con ejercicios).
  const recentIds = React.useMemo(() => {
    const last = [...workouts].reverse().find((w) => (w.exercises?.length ?? 0) > 0);
    return new Set(last?.exercises?.map((e) => e.exercise_id) ?? []);
  }, [workouts]);

  const suggestions = React.useMemo(
    () => rankSuggestions(pool, focus, balance.missing, selectedIds, 4, exProgress, recentIds),
    [pool, focus, balance.missing, selectedIds, exProgress, recentIds]
  );

  const patternIndex = React.useMemo(() => buildPatternIndex(pool), [pool]);

  const musclesInPool = React.useMemo(
    () => [...new Set(pool.map((e) => e.muscle))].sort(),
    [pool]
  );

  const filteredPool = React.useMemo(() => {
    let list = pool;
    if (patternFilter) list = patternIndex.get(patternFilter) ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.muscle.toLowerCase().includes(q)
      );
    }
    return list;
  }, [pool, patternFilter, patternIndex, search]);

  // Al cambiar de enfoque: limpiar filtros y paginación
  React.useEffect(() => {
    setVisibleCount(24);
    setSearch('');
    setPatternFilter(null);
  }, [focus]);

  // Al cambiar de modo: limpiar búsqueda y paginación, pero NO el filtro de
  // patrón — tapMissing depende de que el filtro sobreviva al entrar en "Yo elijo"
  React.useEffect(() => {
    setVisibleCount(24);
    setSearch('');
  }, [mode]);

  // ── Acciones ──

  const fireSpark = (fromEl: HTMLElement | null) => {
    const from = fromEl?.getBoundingClientRect();
    if (!from) return;
    setSparks((prev) => [...prev.slice(-4), { id: Date.now(), from: { x: from.left + from.width / 2, y: from.top + from.height / 2 } }]);
  };

  const addOne = (ex: Exercise, fromEl: HTMLElement | null) => {
    fireSpark(fromEl);
    onAddMany([ex]);
  };

  const addAll = (fromEl: HTMLElement | null) => {
    fireSpark(fromEl);
    onAddMany(suggestions.map((s) => s.exercise));
  };

  const tapMissing = (pattern: Pattern) => {
    setMode('custom');
    setPatternFilter(pattern);
    requestAnimationFrame(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // ── Voz (Web Speech API, con fallback al top-1 de relevancia) ──

  const toggleVoice = () => {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
    };
    const SR = w.webkitSpeechRecognition;
    if (!SR) {
      setVoiceNote(t('Voz no disponible en este navegador'));
      return;
    }
    if (listening) return;

    try {
      const rec = new SR();
      rec.lang = lang === 'en' ? 'en-US' : 'es-ES';
      rec.interimResults = false;
      setListening(true);
      setVoiceNote('');
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript.trim();
        setSearch(transcript);
        // Si el término no ubica nada en el pool → fallback al top-1 de relevancia
        const found = pool.some(
          (ex) =>
            ex.name.toLowerCase().includes(transcript.toLowerCase()) ||
            transcript.toLowerCase().includes(ex.name.toLowerCase().split(' ')[0])
        );
        if (!found) {
          const top = rankSuggestions(pool, focus, balance.missing, selectedIds, 1, exProgress, recentIds)[0];
          if (top) {
            onAddMany([top.exercise]);
            setVoiceNote(t('No encontré "{q}" · añadí lo más cercano: {name}', {
              q: transcript,
              name: top.exercise.name,
            }));
          } else {
            setVoiceNote(t('No encontré "{q}"', { q: transcript }));
          }
        }
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      rec.start();
    } catch {
      setListening(false);
    }
  };

  // ── Render ──

  return (
    <div className="space-y-4 relative">
      {/* Modos: Guíame / Yo elijo — nunca un lienzo en blanco */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[.05] border border-white/[.07]">
        <button
          onClick={() => setMode('guided')}
          aria-pressed={mode === 'guided'}
          className={cn(
            'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all',
            mode === 'guided'
              ? 'bg-gradient-to-r from-[#ffb454] to-[#ff7a3d] text-[#241309] shadow-[0_4px_16px_rgba(255,122,61,0.35)]'
              : 'text-[var(--muted)] hover:text-white'
          )}
        >
          <Sparkles size={13} /> {t('Guíame')}
        </button>
        <button
          onClick={() => setMode('custom')}
          aria-pressed={mode === 'custom'}
          className={cn(
            'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all',
            mode === 'custom'
              ? 'bg-gradient-to-r from-[#4CC9F0] to-[#00D4AA] text-[#04211c] shadow-[0_4px_16px_rgba(0,212,170,0.35)]'
              : 'text-[var(--muted)] hover:text-white'
          )}
        >
          <SlidersHorizontal size={13} /> {t('Yo elijo')}
        </button>
      </div>

      {/* ── Modo Guíame: top-4 con razón en lenguaje humano ── */}
      <AnimatePresence mode="wait">
        {mode === 'guided' && (
          <motion.div
            key="guided"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-[var(--muted)] font-semibold uppercase tracking-wider">
                {t('Sugerido para ti')}
              </p>
              {suggestions.length > 0 && (
                <button
                  onClick={(e) => addAll(e.currentTarget)}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#ffb454] hover:text-[#ffc877] transition-colors"
                >
                  <Plus size={12} /> {t('Añadir los 4')}
                </button>
              )}
            </div>

            {suggestions.length === 0 ? (
              <div className="rounded-2xl border border-white/[.07] bg-[#151b2a] p-4 text-center">
                <p className="text-xs text-[var(--muted)]">{t('Sin sugerencias para tu equipo')}</p>
              </div>
            ) : (
              suggestions.map((s: ScoredExercise, i) => {
                const added = selectedIds.has(s.exercise.id);
                const PIcon = PATTERN_ICON[s.pattern];
                return (
                  <motion.div
                    key={s.exercise.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25 }}
                    className={cn(
                      'flex gap-3 p-3 rounded-2xl border transition-all',
                      added
                        ? 'border-[#34d399] bg-[rgba(52,211,153,0.08)]'
                        : 'border-white/[.07] bg-[#151b2a] hover:border-white/[.18]'
                    )}
                  >
                    <ExercisePhoto
                      exercise={s.exercise}
                      className="w-16 h-16 rounded-xl shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate">{s.exercise.name}</span>
                        <span
                          className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                          style={{ color: PATTERN_COLOR[s.pattern], background: `${PATTERN_COLOR[s.pattern]}1a` }}
                        >
                          <PIcon size={9} /> {t(PATTERN_LABEL[s.pattern])}
                        </span>
                      </div>
                      {/* Razón en lenguaje humano (plantilla determinista) */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.reasons.map((r, ri) => (
                          <span
                            key={ri}
                            className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-white/[.06] border border-white/[.08] text-[#b0c4d8]"
                          >
                            {r.kind === 'gap' && r.pattern
                              ? t('Cubre {patrón} · te faltaba', { patrón: t(PATTERN_LABEL[r.pattern]) })
                              : r.kind === 'affinity' && r.pattern
                                ? t('Afinidad · {patrón}', { patrón: t(PATTERN_LABEL[r.pattern]) })
                                : r.kind === 'easy'
                                  ? t('Arranque fácil')
                                  : ''}
                          </span>
                        ))}
                      </div>
                      <div className="text-[9.5px] text-[var(--muted)] mt-1">
                        {t(s.exercise.muscle)} · {s.exercise.equipment === 'ninguno' ? t('Sin equipo') : s.exercise.equipment}
                      </div>
                    </div>
                    <button
                      onClick={(e) =>
                        added ? onRemove(s.exercise.id) : addOne(s.exercise, e.currentTarget)
                      }
                      aria-label={added ? t('Quitar {name}', { name: s.exercise.name }) : t('Añadir {name}', { name: s.exercise.name })}
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 self-center transition-all',
                        added
                          ? 'bg-[rgba(52,211,153,0.18)] text-[#34d399]'
                          : 'bg-gradient-to-br from-[#ffb454] to-[#ff7a3d] text-[#241309] hover:brightness-110 active:scale-90'
                      )}
                    >
                      {added ? <Check size={17} /> : <Plus size={17} />}
                    </button>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {/* ── Modo Yo elijo: andamios (patrón + músculo + búsqueda con voz) ── */}
        {mode === 'custom' && (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Búsqueda con voz */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('Buscar ejercicios...')}
                aria-label={t('Buscar ejercicios...')}
                className="w-full bg-[#151b2a] border border-white/[.10] rounded-xl pl-9 pr-11 py-3 text-sm text-white placeholder-[#5c6577] outline-none focus:border-[#ffb454] transition-colors"
              />
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  aria-label={t('Limpiar búsqueda')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-white"
                >
                  <X size={14} />
                </button>
              ) : (
                <button
                  onClick={toggleVoice}
                  aria-label={t('Añadir por voz')}
                  className={cn(
                    'absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
                    listening ? 'text-[#f87171] animate-pulse' : 'text-[var(--muted)] hover:text-[#ffb454]'
                  )}
                >
                  <Mic size={15} />
                </button>
              )}
            </div>
            {voiceNote && <p className="text-[10.5px] text-[var(--muted)] px-1">{voiceNote}</p>}

            {/* Filtro por patrón (los huecos ámbar también llegan aquí) */}
            <div className="flex gap-1.5 flex-wrap">
              {DESIRED_PATTERNS[focus].map((p) => {
                const covered = balance.present.includes(p);
                const count = patternIndex.get(p)?.length ?? 0;
                const active = patternFilter === p;
                const PIcon = PATTERN_ICON[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPatternFilter(active ? null : p)}
                    aria-pressed={active}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10.5px] font-bold border transition-all',
                      active
                        ? 'border-[#ffb454] bg-[rgba(255,180,84,0.15)] text-[#ffb454]'
                        : covered
                          ? 'border-[rgba(52,211,153,0.4)] bg-[rgba(52,211,153,0.08)] text-[#34d399]'
                          : 'border-[rgba(251,191,36,0.4)] bg-[rgba(251,191,36,0.08)] text-[#fbbf24] hover:border-[#fbbf24]'
                    )}
                  >
                    <PIcon size={10} />
                    {t(PATTERN_LABEL[p])}
                    <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Filtro por músculo */}
            {musclesInPool.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {musclesInPool.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPatternFilter(null)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10.5px] font-bold border border-white/[.08] bg-white/[.04] text-[var(--muted)] hover:text-white"
                  >
                    {t(m)} <span className="opacity-50">{pool.filter((e) => e.muscle === m).length}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mapa de balance: lo que cubre y lo que falta, tocable ── */}
      <div className="rounded-2xl border border-white/[.07] bg-[#151b2a] p-3.5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {t('Balance de la rutina')}
          </p>
          <span className="text-[10px] text-[var(--muted)]">
            {balance.present.length}/{DESIRED_PATTERNS[focus].length} {t('patrones')}
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DESIRED_PATTERNS[focus].map((p) => {
            const covered = balance.present.includes(p);
            return covered ? (
              <span
                key={p}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border border-[rgba(52,211,153,0.45)] bg-[rgba(52,211,153,0.1)] text-[#34d399]"
              >
                <Check size={10} /> {t(PATTERN_LABEL[p])}
              </span>
            ) : (
              <button
                key={p}
                onClick={() => tapMissing(p)}
                aria-label={t('Añadir {patrón} a la rutina', { patrón: t(PATTERN_LABEL[p]) })}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border border-[rgba(251,191,36,0.5)] bg-[rgba(251,191,36,0.1)] text-[#fbbf24] hover:bg-[rgba(251,191,36,0.2)] hover:border-[#fbbf24] transition-all"
              >
                <Plus size={10} /> {t(PATTERN_LABEL[p])}
              </button>
            );
          })}
        </div>

        {/* Medidor de suficiencia: el permiso para parar */}
        <div className="mt-3 pt-3 border-t border-dashed border-white/[.08]">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={cn(
                'text-[10.5px] font-bold transition-colors',
                balance.sufficient ? 'text-[#34d399]' : 'text-[var(--muted)]'
              )}
            >
              {balance.count === 0
                ? t('Toca para empezar · sin prisa')
                : balance.sufficient
                  ? t('Ya está bien · empieza o sigue, tú mandas')
                  : t('Construyendo…')}
            </span>
            <span className="text-[10px] text-[var(--muted)] tabular-nums">{balance.durationMin} {t('min')}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[.07] overflow-hidden">
            <motion.div
              animate={{ width: `${Math.min(100, (balance.count / 4) * 100)}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                balance.sufficient
                  ? 'bg-gradient-to-r from-[#34d399] to-[#00D4AA] shadow-[0_0_10px_rgba(52,211,153,0.6)]'
                  : 'bg-gradient-to-r from-[#ffb454] to-[#ff7a3d]'
              )}
            />
          </div>
        </div>
      </div>

      {/* ── Métricas que informan, no moralizan ── */}
      <div ref={statsRef} className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] bg-[#151b2a] border border-white/[.07] px-2.5 py-1.5 rounded-lg tabular-nums">
          <Dumbbell size={11} className="text-[#ffb454]" /> {t('{n} ejercicios', { n: balance.count })}
        </span>
        <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] bg-[#151b2a] border border-white/[.07] px-2.5 py-1.5 rounded-lg tabular-nums">
          <Zap size={11} className="text-[#4CC9F0]" /> {t('Dopamina {n}', { n: balance.dopa })}
        </span>
        <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] bg-[#151b2a] border border-white/[.07] px-2.5 py-1.5 rounded-lg tabular-nums">
          <Activity size={11} className="text-[#34d399]" /> {t('{n} min total', { n: balance.durationMin })}
        </span>
      </div>

      {/* ── Catálogo filtrado (pool, no espejo de la selección) ── */}
      <div ref={catalogRef} className="scroll-mt-4 space-y-1.5">
        <p className="text-xs text-[var(--muted)] font-semibold uppercase tracking-wider px-1">
          {t('Catálogo ({n})', { n: filteredPool.length })}
        </p>
        {filteredPool.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[.12] p-6 text-center">
            <p className="text-xs text-[var(--muted)]">{t('Sin ejercicios con estos filtros')}</p>
          </div>
        ) : (
          <>
            {filteredPool.slice(0, visibleCount).map((ex) => {
              const added = selectedIds.has(ex.id);
              return (
                <motion.div
                  key={ex.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className={cn(
                    'flex gap-3 p-2.5 rounded-xl border transition-all',
                    added
                      ? 'border-[rgba(52,211,153,0.5)] bg-[rgba(52,211,153,0.07)]'
                      : 'border-white/[.06] bg-[#151b2a] hover:border-white/[.15]'
                  )}
                >
                  <ExercisePhoto exercise={ex} className="w-14 h-14 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0 self-center">
                    <div className="text-[13px] font-semibold truncate">{ex.name}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {getPatterns(ex).slice(0, 2).map((p) => (
                        <span
                          key={p}
                          className="text-[8.5px] font-bold px-1.5 py-0.5 rounded"
                          style={{ color: PATTERN_COLOR[p], background: `${PATTERN_COLOR[p]}1a` }}
                        >
                          {t(PATTERN_LABEL[p])}
                        </span>
                      ))}
                      <span className="text-[9px] text-[var(--muted)] capitalize">{t(ex.muscle)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => (added ? onRemove(ex.id) : addOne(ex, e.currentTarget))}
                    aria-label={added ? t('Quitar {name}', { name: ex.name }) : t('Añadir {name}', { name: ex.name })}
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 self-center transition-all',
                      added
                        ? 'bg-[rgba(52,211,153,0.18)] text-[#34d399]'
                        : 'bg-white/[.07] text-[var(--muted)] hover:text-[#ffb454] hover:bg-white/[.12] active:scale-90'
                    )}
                  >
                    {added ? <Check size={15} /> : <Plus size={15} />}
                  </button>
                </motion.div>
              );
            })}
            {filteredPool.length > visibleCount && (
              <button
                onClick={() => setVisibleCount((c) => c + 24)}
                className="w-full py-2.5 rounded-xl border border-dashed border-white/[.12] text-[11px] font-semibold text-[var(--muted)] hover:text-white hover:border-white/[.25] transition-all"
              >
                {t('Mostrar más ({n} restantes)', { n: filteredPool.length - visibleCount })}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Chispa: la acción tiene consecuencia visible ── */}
      <AnimatePresence>
        {sparks.map((s) => {
          const to = statsRef.current?.getBoundingClientRect();
          return (
            <motion.span
              key={s.id}
              aria-hidden
              initial={{ x: s.from.x, y: s.from.y, scale: 1, opacity: 1 }}
              animate={{
                x: to ? to.left + to.width / 2 : s.from.x,
                y: to ? to.top : s.from.y,
                scale: 0.3,
                opacity: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.2, 0.9, 0.3, 1] }}
              onAnimationComplete={() =>
                setSparks((prev) => prev.filter((p) => p.id !== s.id))
              }
              className="fixed z-50 pointer-events-none w-2.5 h-2.5 rounded-full bg-[#ffb454] shadow-[0_0_12px_rgba(255,180,84,0.9)]"
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}


