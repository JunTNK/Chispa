'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExercises } from '@/lib/utils/use-exercises';
import { ExerciseImage, ExerciseMedia, getExerciseVisual, getExerciseMediaUrls } from '@/lib/utils/exercise-visuals';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  X,
  ChevronDown,
  Dumbbell,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Info,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { FitnessIcon } from '@/components/ui/fitness-icon';
import { MUSCLES, MUSCLE_KEYS, muscleFitnessIcon, muscleLabel } from '@/lib/utils/muscles';
import { CustomExerciseForm } from './custom-exercise-form';
import { deleteCustomExercise, type CustomExercise } from '@/lib/db/custom-exercises-db';

// ─── Constants ───

// Derivado del registry (muscles.ts): los 8 músculos canónicos + el caso
// especial `full_body` (filtro del catálogo, no un músculo del dataset).
const MUSCLE_GROUPS = [
  ...MUSCLE_KEYS.map((key) => ({
    key,
    label: MUSCLES[key].label,
    fitnessName: MUSCLES[key].fitnessIcon,
  })),
  { key: 'full_body', label: 'Cuerpo completo', fitnessName: 'full-body' as const },
];


const EQUIPMENT_OPTIONS = [
  { key: 'ninguno', label: 'Sin equipo' },
  { key: 'mancuernas', label: 'Mancuernas' },
  { key: 'barra', label: 'Barra' },
  { key: 'barra Z', label: 'Barra Z' },
  { key: 'kettlebell', label: 'Kettlebell' },
  { key: 'bandas', label: 'Bandas' },
  { key: 'polea', label: 'Polea' },
  { key: 'máquina', label: 'Máquina' },
  { key: 'pelota suiza', label: 'Pelota' },
  { key: 'balón medicinal', label: 'Balón medicinal' },
  { key: 'rodillo', label: 'Rodillo' },
  { key: 'otro', label: 'Otro' },
];

const EQUIPMENT_ALIASES: Record<string, string[]> = {
  ninguno: ['ninguno', 'body only', 'body weight', 'gym mat', 'pull-up bar', 'bench', 'incline bench'],
  mancuernas: ['mancuernas', 'dumbbell'],
  bandas: ['bandas', 'bands', 'resistance band'],
  polea: ['polea', 'cable', 'cable machine'],
  barra: ['barra', 'barbell'],
  'barra Z': ['barra Z', 'sz-bar', 'e-z curl bar'],
  kettlebell: ['kettlebell', 'kettlebells'],
  'pelota suiza': ['pelota suiza', 'swiss ball', 'exercise ball'],
  'balón medicinal': ['balón medicinal', 'medicine ball'],
  rodillo: ['rodillo', 'foam roll'],
  máquina: ['máquina', 'machine'],
  otro: ['otro', 'other'],
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Principiante',
  2: 'Intermedio',
  3: 'Avanzado',
};

const DIFFICULTY_COLORS: Record<number, string> = {
  1: '#34d399',
  2: '#fbbf24',
  3: '#f87171',
};

const SORT_OPTIONS = [
  { key: 'name', label: 'Nombre A-Z' },
  { key: 'name_desc', label: 'Nombre Z-A' },
  { key: 'difficulty', label: 'Dificultad ↑' },
  { key: 'difficulty_desc', label: 'Dificultad ↓' },
] as const;

const PAGE_SIZE = 50;

type SortKey = (typeof SORT_OPTIONS)[number]['key'];

// ─── Helpers ───

function getMuscleIcon(muscle: string, size = 18) {
  // full_body es un filtro del catálogo, no un músculo del registry → icono propio.
  if (muscle === 'full_body') return <FitnessIcon name="full-body" size={size} />;
  // O(1) vía el registry (muscles.ts) — cubre aliases ES/EN; dumbbell si no existe.
  return <FitnessIcon name={muscleFitnessIcon(muscle)} size={size} />;
}

function equipmentMatches(filterKey: string, exerciseEq: string): boolean {
  const aliases = EQUIPMENT_ALIASES[filterKey];
  if (!aliases) return exerciseEq.toLowerCase() === filterKey;
  return aliases.includes(exerciseEq.toLowerCase());
}

// ─── Component ───

export function ExerciseCatalogScreen() {
  const t = useT();
  const setView = useStore((s) => s.setView);

  // Filters
  const [search, setSearch] = React.useState('');
  const [selectedMuscle, setSelectedMuscle] = React.useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<SortKey>('name');
  const [showMuscleMenu, setShowMuscleMenu] = React.useState(false);
  const [showEquipmentMenu, setShowEquipmentMenu] = React.useState(false);
  const [showSortMenu, setShowSortMenu] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);

  const closeMenus = () => {
    setShowMuscleMenu(false);
    setShowEquipmentMenu(false);
    setShowSortMenu(false);
  };

  const { exercises: catalog, isLoading, reloadCustom } = useExercises();

  // Custom exercise form state
  const [showForm, setShowForm] = React.useState(false);
  const [editingExercise, setEditingExercise] = React.useState<CustomExercise | undefined>(undefined);

  const catalogEquipment = React.useMemo(() => {
    const eqSet = new Set(catalog.map((e) => e.equipment.toLowerCase()));
    return EQUIPMENT_OPTIONS.filter((opt) => {
      const aliases = EQUIPMENT_ALIASES[opt.key];
      return aliases?.some((a) => eqSet.has(a));
    });
  }, [catalog]);

  const filtered = React.useMemo(() => {
    let result = catalog;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.muscle.toLowerCase().includes(q) ||
          (e.primaryMuscles || []).some((m) => m.toLowerCase().includes(q))
      );
    }

    if (selectedMuscle) {
      result = result.filter((e) => e.muscle === selectedMuscle);
    }

    if (selectedEquipment) {
      result = result.filter((e) => equipmentMatches(selectedEquipment, e.equipment));
    }

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'name': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'difficulty': return (a.difficulty ?? 2) - (b.difficulty ?? 2);
        case 'difficulty_desc': return (b.difficulty ?? 2) - (a.difficulty ?? 2);
        default: return 0;
      }
    });

    return result;
  }, [search, selectedMuscle, selectedEquipment, sort, catalog]);

  // Reset page when filters change
  React.useEffect(() => { setPage(0); }, [search, selectedMuscle, selectedEquipment, sort]);

  const pageExs = filtered.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = pageExs.length < filtered.length;

  const activeFilters = [selectedMuscle, selectedEquipment].filter(Boolean).length;
  const noFilter = !search && !selectedMuscle && !selectedEquipment;

  // ─── Skeleton Loading ───

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-8 space-y-3 min-h-dvh">
        {/* Header skeleton */}
        <div className="flex items-center justify-between pt-5 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="space-y-1.5">
              <div className="skeleton h-5 w-24" />
              <div className="skeleton h-3 w-20" />
            </div>
          </div>
          <div className="skeleton w-8 h-8 rounded-xl" />
        </div>

        {/* Search skeleton */}
        <div className="skeleton h-11 w-full rounded-xl" />

        {/* Filter bar skeleton */}
        <div className="flex gap-2">
          <div className="skeleton h-10 flex-1 rounded-xl" />
          <div className="skeleton h-10 flex-1 rounded-xl" />
          <div className="skeleton h-10 w-11 rounded-xl" />
        </div>

        {/* Hint skeleton */}
        <div className="skeleton h-4 w-64 mx-auto rounded-md" />

        {/* Exercise cards skeleton */}
        <div className="space-y-1.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-[60px] w-full rounded-xl" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      </motion.div>
    );
  }

  // ─── Render ───

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 pb-8 space-y-3 min-h-dvh"
    >
      {/* Header */}
      <div className="flex items-center justify-between pt-5 pb-1">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4CC9F0] to-[#00D4AA] flex items-center justify-center text-[#0a0d14] font-bold text-sm">
            <Dumbbell size={16} />
          </span>
          <div>
            <h1 className="text-lg font-black tracking-tight">CATÁLOGO</h1>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{filtered.length} ejercicios</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditingExercise(undefined); setShowForm(true); }}
            aria-label={t('Crear ejercicio')}
            className="w-8 h-8 rounded-xl border border-[rgba(0,212,170,0.3)] bg-[rgba(0,212,170,0.08)] flex items-center justify-center hover:bg-[rgba(0,212,170,0.15)] transition-colors">
            <Plus size={16} className="text-[#00D4AA]" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setView('home')} aria-label={t('Cerrar catálogo')}
            className="w-8 h-8 rounded-xl border border-white/[.07] bg-[#151b2a] flex items-center justify-center hover:bg-white/[.08]">
            <X size={16} />
          </motion.button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Buscar ejercicios...')}
          className="w-full bg-[#151b2a] border border-white/[.10] rounded-xl pl-9 pr-10 py-3 text-sm text-white placeholder-[#5c6577] outline-none focus:border-[#ffb454] transition-colors"
          autoFocus />
        {search && (
          <button onClick={() => setSearch('')} aria-label={t('Limpiar búsqueda')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-white"><X size={14} /></button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button onClick={() => { setShowMuscleMenu(v => !v); setShowEquipmentMenu(false); setShowSortMenu(false); }}
            className={`w-full flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${selectedMuscle ? 'bg-[rgba(255,180,84,0.1)] border-[#ffb454] text-[#ffb454]' : 'bg-[#151b2a] border-white/[.07] text-[var(--muted)] hover:border-white/[.15]'}`}>
            <SlidersHorizontal size={13} />
            <span className="flex-1 text-left truncate">{selectedMuscle ? t(muscleLabel(selectedMuscle)) : t('Músculo')}</span>
            <ChevronDown size={12} />
          </button>
          <AnimatePresence>
            {showMuscleMenu && (
              <motion.div initial={{ opacity: 0, y: -5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.97 }} transition={{ duration: 0.12 }}
                className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-white/[.10] bg-[rgba(13,17,27,0.98)] backdrop-blur-xl p-2 shadow-2xl max-h-64 overflow-y-auto">
                <button onClick={() => { setSelectedMuscle(null); setShowMuscleMenu(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${!selectedMuscle ? 'text-[#ffb454] bg-[rgba(255,180,84,0.08)]' : 'text-[var(--muted)] hover:bg-white/[.06]'}`}>
                  <X size={12} /> {t('Todos')}
                </button>
                {MUSCLE_GROUPS.map((g) => (
                  <button key={g.key} onClick={() => { setSelectedMuscle(g.key); setShowMuscleMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${selectedMuscle === g.key ? 'text-[#ffb454] bg-[rgba(255,180,84,0.08)]' : 'text-[var(--muted)] hover:bg-white/[.06]'}`}>
                    <FitnessIcon name={g.fitnessName} size={14} /> {t(g.label)}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative flex-1">
          <button onClick={() => { setShowEquipmentMenu(v => !v); setShowMuscleMenu(false); setShowSortMenu(false); }}
            className={`w-full flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${selectedEquipment ? 'bg-[rgba(0,212,170,0.1)] border-[#00D4AA] text-[#00D4AA]' : 'bg-[#151b2a] border-white/[.07] text-[var(--muted)] hover:border-white/[.15]'}`}>
            <Dumbbell size={13} />
            <span className="flex-1 text-left truncate">{selectedEquipment ? t(EQUIPMENT_OPTIONS.find((o) => o.key === selectedEquipment)?.label || selectedEquipment) : t('Equipo')}</span>
            <ChevronDown size={12} />
          </button>
          <AnimatePresence>
            {showEquipmentMenu && (
              <motion.div initial={{ opacity: 0, y: -5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.97 }} transition={{ duration: 0.12 }}
                className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-white/[.10] bg-[rgba(13,17,27,0.98)] backdrop-blur-xl p-2 shadow-2xl max-h-64 overflow-y-auto">
                <button onClick={() => { setSelectedEquipment(null); setShowEquipmentMenu(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${!selectedEquipment ? 'text-[#ffb454] bg-[rgba(255,180,84,0.08)]' : 'text-[var(--muted)] hover:bg-white/[.06]'}`}>
                  <X size={12} /> {t('Todos')}
                </button>
                {catalogEquipment.map((opt) => (
                  <button key={opt.key} onClick={() => { setSelectedEquipment(opt.key); setShowEquipmentMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${selectedEquipment === opt.key ? 'text-[#00D4AA] bg-[rgba(0,212,170,0.08)]' : 'text-[var(--muted)] hover:bg-white/[.06]'}`}>
                    <Dumbbell size={14} /> {t(opt.label)}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button onClick={() => { setShowSortMenu(v => !v); setShowMuscleMenu(false); setShowEquipmentMenu(false); }} aria-label={t('Ordenar ejercicios')}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-white/[.07] bg-[#151b2a] text-[var(--muted)] hover:border-white/[.15] transition-all">
            <ArrowUpDown size={13} />
          </button>
          <AnimatePresence>
            {showSortMenu && (
              <motion.div initial={{ opacity: 0, y: -5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.97 }} transition={{ duration: 0.12 }}
                className="absolute top-full mt-1 right-0 z-20 rounded-xl border border-white/[.10] bg-[rgba(13,17,27,0.98)] backdrop-blur-xl p-2 shadow-2xl min-w-[160px]">
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt.key} onClick={() => { setSort(opt.key); setShowSortMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${sort === opt.key ? 'text-[#ffb454] bg-[rgba(255,180,84,0.08)]' : 'text-[var(--muted)] hover:bg-white/[.06]'}`}>
                    {t(opt.label)}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          {selectedMuscle && (
            <Badge variant="warning" className="flex items-center gap-1 px-2 py-1">
              {getMuscleIcon(selectedMuscle, 11)}
              <span className="text-[10px]">{t(muscleLabel(selectedMuscle))}</span>
              <button onClick={() => setSelectedMuscle(null)} className="ml-0.5 hover:text-white"><X size={10} /></button>
            </Badge>
          )}
          {selectedEquipment && (
            <Badge variant="info" className="flex items-center gap-1 px-2 py-1">
              <Dumbbell size={10} />
              <span className="text-[10px]">{t(EQUIPMENT_OPTIONS.find((o) => o.key === selectedEquipment)?.label || selectedEquipment)}</span>
              <button onClick={() => setSelectedEquipment(null)} className="ml-0.5 hover:text-white"><X size={10} /></button>
            </Badge>
          )}
          <button onClick={() => { setSelectedMuscle(null); setSelectedEquipment(null); setSearch(''); }} className="text-[10px] text-[var(--muted)] hover:text-[var(--muted)] underline underline-offset-2">{t('Limpiar')}</button>
        </div>
      )}

      {noFilter && <p className="text-[11px] text-[var(--muted)] text-center">{t('Toca un ejercicio para ver instrucciones y detalles')}</p>}

      {/* Results */}
      <div className="space-y-1.5 pb-4">
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#151b2a] border border-white/[.07] flex items-center justify-center mb-4"><Search size={24} className="text-[var(--muted)]" /></div>
            <p className="text-sm font-bold text-[var(--muted)] mb-1">{t('Sin resultados')}</p>
            <p className="text-xs text-[var(--muted)]">{t('Prueba con otros filtros o cambia la búsqueda')}</p>
          </motion.div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {pageExs.map((ex, i) => {
                const isExpanded = expandedId === ex.id;
                const difficulty = ex.difficulty ?? 2;
                const isSpanish = /[áéíóúñü]/i.test(ex.name);

                return (
                  <motion.div key={ex.id} layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.003, 0.12) }}>
                    <button onClick={() => { closeMenus(); setExpandedId(isExpanded ? null : ex.id); }} className="w-full text-left">
                      <Card className={`p-3 transition-all duration-200 ${isExpanded ? 'border-[#ffb454] bg-[rgba(255,180,84,0.04)]' : 'hover:border-white/[.15] hover:bg-white/[.04]'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#151b2a] border border-white/[.07] flex items-center justify-center text-lg shrink-0 overflow-hidden">
                              {(() => {
                                const mediaUrls = getExerciseMediaUrls(ex);
                                return mediaUrls ? (
                                  <ExerciseMedia
                                    {...mediaUrls}
                                    alt={ex.name}
                                    className="w-10 h-10 rounded-xl object-cover"
                                  />
                                 ) : (
                                  <ExerciseImage {...getExerciseVisual(ex)} size={20} />
                                );
                              })()}
                            </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold truncate">{ex.name}</span>
                              {isSpanish && <span className="text-[9px] shrink-0">🇪🇸</span>}
                              {'isCustom' in ex && (ex as CustomExercise).isCustom && (
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(0,212,170,0.12)] text-[#00D4AA] border border-[rgba(0,212,170,0.25)] shrink-0">MÍO</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">{getMuscleIcon(ex.muscle, 11)} {t(muscleLabel(ex.muscle))}</span>
                              <span className="text-[var(--muted)]">·</span>
                              <span className="text-[10px] text-[var(--muted)] truncate">{ex.equipment === 'ninguno' ? t('Sin equipo') : ex.equipment}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 shrink-0">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black"
                              style={{ backgroundColor: `${DIFFICULTY_COLORS[difficulty]}20`, color: DIFFICULTY_COLORS[difficulty] }}>
                              {difficulty}
                            </div>
                            <span className="text-[7px] font-semibold uppercase tracking-wider" style={{ color: DIFFICULTY_COLORS[difficulty] }}>
                               {t(DIFFICULTY_LABELS[difficulty]).slice(0, 4)}
                            </span>
                          </div>
                          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }} className="shrink-0">
                            <ChevronRight size={14} className="text-[var(--muted)]" />
                          </motion.div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                              <div className="mt-3 pt-3 border-t border-white/[.07] space-y-3">
                                {ex.primaryMuscles && ex.primaryMuscles.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">{t('Músculos principales')}</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {ex.primaryMuscles.map((m) => <Badge key={m} variant="info" className="text-[9px] px-2 py-0.5">{m}</Badge>)}
                                    </div>
                                  </div>
                                )}
                                {ex.secondaryMuscles && ex.secondaryMuscles.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">{t('Secundarios')}</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {ex.secondaryMuscles.map((m) => <Badge key={m} variant="ghost" className="text-[9px] px-2 py-0.5">{m}</Badge>)}
                                    </div>
                                  </div>
                                )}
                                {ex.instructions && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">{t('Instrucciones')}</span>
                                    <p className="text-[11px] text-[var(--muted)] leading-relaxed mt-1">{ex.cue || ex.instructions.slice(0, 200)}{(ex.instructions || '').length > 200 ? '...' : ''}</p>
                                    {ex.instructionsSteps && ex.instructionsSteps.length > 1 && (
                                      <ol className="list-decimal list-inside mt-1.5 space-y-0.5">
                                        {ex.instructionsSteps.slice(0, 5).map((step, si) => (
                                          <li key={si} className="text-[10px] text-[var(--muted)] leading-relaxed">{step}</li>
                                        ))}
                                      </ol>
                                    )}
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                  {ex.load_type && <Badge variant="info" className="text-[9px] px-2 py-0.5">{ex.load_type === 'reps' ? t('🔁 Repeticiones') : t('⏱ Tiempo')}</Badge>}
                                  {ex.category && <Badge variant="ghost" className="text-[9px] px-2 py-0.5">{ex.category}</Badge>}
                                  {ex.force && <Badge variant="ghost" className="text-[9px] px-2 py-0.5">{ex.force === 'push' ? t('Empuje') : ex.force === 'pull' ? t('Tracción') : t('Estático')}</Badge>}
                                  {ex.mechanic && <Badge variant="ghost" className="text-[9px] px-2 py-0.5">{ex.mechanic === 'compound' ? t('Compuesto') : t('Aislamiento')}</Badge>}
                                  {ex.cognitive_load && ex.cognitive_load !== 'low' && (
                                    <Badge variant={ex.cognitive_load === 'high' ? 'danger' : 'warning'} className="text-[9px] px-2 py-0.5">
                                      <Info size={8} className="mr-0.5" /> {t('Carga {nivel}', { nivel: ex.cognitive_load === 'high' ? t('alta') : t('media') })}
                                    </Badge>
                                  )}
                                </div>
                                {/* Custom exercise actions */}
                                {'isCustom' in ex && (ex as CustomExercise).isCustom && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-white/[.07]">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEditingExercise(ex as CustomExercise); setShowForm(true); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/[.05] border border-white/[.08] text-[var(--muted)] hover:text-[#ffb454] hover:border-[#ffb454]/30 transition-colors"
                                    >
                                      <Pencil size={10} /> {t('Editar')}
                                    </button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (confirm(t('¿Eliminar este ejercicio?'))) {
                                          await deleteCustomExercise(ex.id);
                                          reloadCustom();
                                        }
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-white/[.05] border border-white/[.08] text-[var(--muted)] hover:text-[#f87171] hover:border-[#f87171]/30 transition-colors"
                                    >
                                      <Trash2 size={10} /> {t('Eliminar')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Pagination: Load more */}
            {hasMore && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2 pb-4">
                <button onClick={() => setPage(p => p + 1)}
                  className="w-full py-3 rounded-xl border border-dashed border-white/[.12] bg-[#151b2a] text-xs font-semibold text-[var(--muted)] hover:border-white/[.25] hover:text-white transition-all">
                  {t('Mostrar más ({n} restantes)', { n: filtered.length - pageExs.length })}
                </button>
                <p className="text-[10px] text-[var(--muted)] text-center mt-1.5">{t('Mostrando {a} de {b}', { a: pageExs.length, b: filtered.length })}</p>
              </motion.div>
            )}

            {!hasMore && filtered.length > PAGE_SIZE && (
              <p className="text-[10px] text-[var(--muted)] text-center pt-1">{t('Mostrando todos los {n} ejercicios', { n: filtered.length })}</p>
            )}
          </>
        )}
      </div>

      <div className="h-2" />

      {/* Custom exercise form */}
      <AnimatePresence>
        {showForm && (
          <CustomExerciseForm
            exercise={editingExercise}
            onClose={() => { setShowForm(false); setEditingExercise(undefined); }}
            onSaved={() => {
              setShowForm(false);
              setEditingExercise(undefined);
              reloadCustom();
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
