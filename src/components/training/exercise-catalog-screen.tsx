'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExercises } from '@/lib/utils/use-exercises';
import { getExerciseImageUrl, getExerciseFallbackIcon } from '@/lib/utils/exercise-visuals';
import { useStore } from '@/lib/store';
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
} from 'lucide-react';
import { FitnessIcon } from '@/components/ui/fitness-icon';

// ─── Constants ───

const MUSCLE_GROUPS = [
  { key: 'piernas', label: 'Piernas', fitnessName: 'lower-body' },
  { key: 'gluteos', label: 'Glúteos', fitnessName: 'lower-body' },
  { key: 'pecho', label: 'Pecho', fitnessName: 'bench-press' },
  { key: 'espalda', label: 'Espalda', fitnessName: 'upper-body' },
  { key: 'hombros', label: 'Hombros', fitnessName: 'upper-body' },
  { key: 'brazos', label: 'Brazos', fitnessName: 'biceps' },
  { key: 'core', label: 'Core', fitnessName: 'core' },
  { key: 'cardio', label: 'Cardio', fitnessName: 'running' },
  { key: 'full_body', label: 'Cuerpo completo', fitnessName: 'full-body' },
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
  const group = MUSCLE_GROUPS.find((g) => g.key === muscle);
  if (group) {
    return <FitnessIcon name={group.fitnessName} size={size} />;
  }
  return <Dumbbell size={size} />;
}

function equipmentMatches(filterKey: string, exerciseEq: string): boolean {
  const aliases = EQUIPMENT_ALIASES[filterKey];
  if (!aliases) return exerciseEq.toLowerCase() === filterKey;
  return aliases.includes(exerciseEq.toLowerCase());
}

const ExerciseImage = React.memo(function ExerciseImage({
  src,
  fallbackIcon: FallbackIcon,
}: {
  src: string | null;
  fallbackIcon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const [error, setError] = React.useState(false);

  // No image URL or image failed to load → show fallback icon
  if (!src || error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <FallbackIcon size={22} className="text-[#94a0b8]" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
});

// ─── Component ───

export function ExerciseCatalogScreen() {
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

  const { exercises: catalog, isLoading } = useExercises();

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
            <p className="text-[10px] text-[#94a0b8] uppercase tracking-wider">{filtered.length} ejercicios</p>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setView('home')} aria-label="Cerrar catálogo"
          className="w-8 h-8 rounded-xl border border-white/[.07] bg-[#151b2a] flex items-center justify-center hover:bg-white/[.08]">
          <X size={16} />
        </motion.button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5c6577]" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ejercicios..."
          className="w-full bg-[#151b2a] border border-white/[.10] rounded-xl pl-9 pr-10 py-3 text-sm text-white placeholder-[#5c6577] outline-none focus:border-[#ffb454] transition-colors"
          autoFocus />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c6577] hover:text-white"><X size={14} /></button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button onClick={() => { setShowMuscleMenu(v => !v); setShowEquipmentMenu(false); setShowSortMenu(false); }}
            className={`w-full flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${selectedMuscle ? 'bg-[rgba(255,180,84,0.1)] border-[#ffb454] text-[#ffb454]' : 'bg-[#151b2a] border-white/[.07] text-[#94a0b8] hover:border-white/[.15]'}`}>
            <SlidersHorizontal size={13} />
            <span className="flex-1 text-left truncate">{selectedMuscle ? MUSCLE_GROUPS.find((g) => g.key === selectedMuscle)?.label || selectedMuscle : 'Músculo'}</span>
            <ChevronDown size={12} />
          </button>
          <AnimatePresence>
            {showMuscleMenu && (
              <motion.div initial={{ opacity: 0, y: -5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.97 }} transition={{ duration: 0.12 }}
                className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-white/[.10] bg-[rgba(13,17,27,0.98)] backdrop-blur-xl p-2 shadow-2xl max-h-64 overflow-y-auto">
                <button onClick={() => { setSelectedMuscle(null); setShowMuscleMenu(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${!selectedMuscle ? 'text-[#ffb454] bg-[rgba(255,180,84,0.08)]' : 'text-[#94a0b8] hover:bg-white/[.06]'}`}>
                  <X size={12} /> Todos
                </button>
                {MUSCLE_GROUPS.map((g) => (
                  <button key={g.key} onClick={() => { setSelectedMuscle(g.key); setShowMuscleMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${selectedMuscle === g.key ? 'text-[#ffb454] bg-[rgba(255,180,84,0.08)]' : 'text-[#94a0b8] hover:bg-white/[.06]'}`}>
                    <FitnessIcon name={g.fitnessName} size={14} /> {g.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative flex-1">
          <button onClick={() => { setShowEquipmentMenu(v => !v); setShowMuscleMenu(false); setShowSortMenu(false); }}
            className={`w-full flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${selectedEquipment ? 'bg-[rgba(0,212,170,0.1)] border-[#00D4AA] text-[#00D4AA]' : 'bg-[#151b2a] border-white/[.07] text-[#94a0b8] hover:border-white/[.15]'}`}>
            <Dumbbell size={13} />
            <span className="flex-1 text-left truncate">{selectedEquipment ? EQUIPMENT_OPTIONS.find((o) => o.key === selectedEquipment)?.label || selectedEquipment : 'Equipo'}</span>
            <ChevronDown size={12} />
          </button>
          <AnimatePresence>
            {showEquipmentMenu && (
              <motion.div initial={{ opacity: 0, y: -5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.97 }} transition={{ duration: 0.12 }}
                className="absolute top-full mt-1 left-0 right-0 z-20 rounded-xl border border-white/[.10] bg-[rgba(13,17,27,0.98)] backdrop-blur-xl p-2 shadow-2xl max-h-64 overflow-y-auto">
                <button onClick={() => { setSelectedEquipment(null); setShowEquipmentMenu(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${!selectedEquipment ? 'text-[#ffb454] bg-[rgba(255,180,84,0.08)]' : 'text-[#94a0b8] hover:bg-white/[.06]'}`}>
                  <X size={12} /> Todos
                </button>
                {catalogEquipment.map((opt) => (
                  <button key={opt.key} onClick={() => { setSelectedEquipment(opt.key); setShowEquipmentMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${selectedEquipment === opt.key ? 'text-[#00D4AA] bg-[rgba(0,212,170,0.08)]' : 'text-[#94a0b8] hover:bg-white/[.06]'}`}>
                    <Dumbbell size={14} /> {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button onClick={() => { setShowSortMenu(v => !v); setShowMuscleMenu(false); setShowEquipmentMenu(false); }} aria-label="Ordenar ejercicios"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-white/[.07] bg-[#151b2a] text-[#94a0b8] hover:border-white/[.15] transition-all">
            <ArrowUpDown size={13} />
          </button>
          <AnimatePresence>
            {showSortMenu && (
              <motion.div initial={{ opacity: 0, y: -5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.97 }} transition={{ duration: 0.12 }}
                className="absolute top-full mt-1 right-0 z-20 rounded-xl border border-white/[.10] bg-[rgba(13,17,27,0.98)] backdrop-blur-xl p-2 shadow-2xl min-w-[160px]">
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt.key} onClick={() => { setSort(opt.key); setShowSortMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${sort === opt.key ? 'text-[#ffb454] bg-[rgba(255,180,84,0.08)]' : 'text-[#94a0b8] hover:bg-white/[.06]'}`}>
                    {opt.label}
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
              <span className="text-[10px]">{MUSCLE_GROUPS.find((g) => g.key === selectedMuscle)?.label || selectedMuscle}</span>
              <button onClick={() => setSelectedMuscle(null)} className="ml-0.5 hover:text-white"><X size={10} /></button>
            </Badge>
          )}
          {selectedEquipment && (
            <Badge variant="info" className="flex items-center gap-1 px-2 py-1">
              <Dumbbell size={10} />
              <span className="text-[10px]">{EQUIPMENT_OPTIONS.find((o) => o.key === selectedEquipment)?.label || selectedEquipment}</span>
              <button onClick={() => setSelectedEquipment(null)} className="ml-0.5 hover:text-white"><X size={10} /></button>
            </Badge>
          )}
          <button onClick={() => { setSelectedMuscle(null); setSelectedEquipment(null); setSearch(''); }} className="text-[10px] text-[#5c6577] hover:text-[#94a0b8] underline underline-offset-2">Limpiar</button>
        </div>
      )}

      {noFilter && <p className="text-[11px] text-[#5c6577] text-center">Toca un ejercicio para ver instrucciones y detalles</p>}

      {/* Results */}
      <div className="space-y-1.5 pb-4">
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#151b2a] border border-white/[.07] flex items-center justify-center mb-4"><Search size={24} className="text-[#5c6577]" /></div>
            <p className="text-sm font-bold text-[#94a0b8] mb-1">Sin resultados</p>
            <p className="text-xs text-[#5c6577]">Prueba con otros filtros o cambia la búsqueda</p>
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
                            <ExerciseImage src={getExerciseImageUrl(ex)} fallbackIcon={getExerciseFallbackIcon(ex)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold truncate">{ex.name}</span>
                              {isSpanish && <span className="text-[9px] shrink-0">🇪🇸</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-[#94a0b8] flex items-center gap-1">{getMuscleIcon(ex.muscle, 11)} {MUSCLE_GROUPS.find((g) => g.key === ex.muscle)?.label || ex.muscle}</span>
                              <span className="text-[#5c6577]">·</span>
                              <span className="text-[10px] text-[#94a0b8] truncate">{ex.equipment === 'ninguno' ? 'Sin equipo' : ex.equipment}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 shrink-0">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black"
                              style={{ backgroundColor: `${DIFFICULTY_COLORS[difficulty]}20`, color: DIFFICULTY_COLORS[difficulty] }}>
                              {difficulty}
                            </div>
                            <span className="text-[7px] font-semibold uppercase tracking-wider" style={{ color: DIFFICULTY_COLORS[difficulty] }}>
                              {DIFFICULTY_LABELS[difficulty].slice(0, 4)}
                            </span>
                          </div>
                          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }} className="shrink-0">
                            <ChevronRight size={14} className="text-[#5c6577]" />
                          </motion.div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                              <div className="mt-3 pt-3 border-t border-white/[.07] space-y-3">
                                {ex.primaryMuscles && ex.primaryMuscles.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-[#94a0b8] uppercase tracking-wider">Músculos principales</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {ex.primaryMuscles.map((m) => <Badge key={m} variant="info" className="text-[9px] px-2 py-0.5">{m}</Badge>)}
                                    </div>
                                  </div>
                                )}
                                {ex.secondaryMuscles && ex.secondaryMuscles.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-[#94a0b8] uppercase tracking-wider">Secundarios</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {ex.secondaryMuscles.map((m) => <Badge key={m} variant="ghost" className="text-[9px] px-2 py-0.5">{m}</Badge>)}
                                    </div>
                                  </div>
                                )}
                                {ex.instructions && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-[#94a0b8] uppercase tracking-wider">Instrucciones</span>
                                    <p className="text-[11px] text-[#94a0b8] leading-relaxed mt-1">{ex.cue || ex.instructions.slice(0, 200)}{(ex.instructions || '').length > 200 ? '...' : ''}</p>
                                    {ex.instructionsSteps && ex.instructionsSteps.length > 1 && (
                                      <ol className="list-decimal list-inside mt-1.5 space-y-0.5">
                                        {ex.instructionsSteps.slice(0, 5).map((step, si) => (
                                          <li key={si} className="text-[10px] text-[#94a0b8] leading-relaxed">{step}</li>
                                        ))}
                                      </ol>
                                    )}
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                  {ex.load_type && <Badge variant="info" className="text-[9px] px-2 py-0.5">{ex.load_type === 'reps' ? '🔁 Repeticiones' : '⏱ Tiempo'}</Badge>}
                                  {ex.category && <Badge variant="ghost" className="text-[9px] px-2 py-0.5">{ex.category}</Badge>}
                                  {ex.force && <Badge variant="ghost" className="text-[9px] px-2 py-0.5">{ex.force === 'push' ? 'Empuje' : ex.force === 'pull' ? 'Tracción' : 'Estático'}</Badge>}
                                  {ex.mechanic && <Badge variant="ghost" className="text-[9px] px-2 py-0.5">{ex.mechanic === 'compound' ? 'Compuesto' : 'Aislamiento'}</Badge>}
                                  {ex.cognitive_load && ex.cognitive_load !== 'low' && (
                                    <Badge variant={ex.cognitive_load === 'high' ? 'danger' : 'warning'} className="text-[9px] px-2 py-0.5">
                                      <Info size={8} className="mr-0.5" /> Carga {ex.cognitive_load === 'high' ? 'alta' : 'media'}
                                    </Badge>
                                  )}
                                </div>
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
                  className="w-full py-3 rounded-xl border border-dashed border-white/[.12] bg-[#151b2a] text-xs font-semibold text-[#94a0b8] hover:border-white/[.25] hover:text-white transition-all">
                  Mostrar más ({filtered.length - pageExs.length} restantes)
                </button>
                <p className="text-[10px] text-[#5c6577] text-center mt-1.5">Mostrando {pageExs.length} de {filtered.length}</p>
              </motion.div>
            )}

            {!hasMore && filtered.length > PAGE_SIZE && (
              <p className="text-[10px] text-[#5c6577] text-center pt-1">Mostrando todos los {filtered.length} ejercicios</p>
            )}
          </>
        )}
      </div>

      <div className="h-2" />
    </motion.div>
  );
}
