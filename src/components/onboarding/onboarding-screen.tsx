'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/lib/store';
import { trackEvent } from '@/lib/analytics';
import { useT } from '@/lib/i18n/use-t';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Profile } from '@/types';
import { supabaseSync } from '@/lib/sync/supabase-sync';
import { logError } from '@/lib/utils/logger';
import { todayKey } from '@/lib/utils/helpers';
import { Dumbbell, Zap, Flame, Sprout, Footprints, PersonStanding, Brain, Wind, GitBranch, HeartPulse, HelpCircle, Radio, Home, Building, Sun, MoonStar, Pill, VolumeX, ArrowLeftRight, Clock, Calendar, CalendarCheck, RefreshCw } from 'lucide-react';
import { BootScreen } from './boot-screen';
import { BienvenidaIllustration } from './bienvenida-illustration';
import { SEX_LABELS, UNITS_LABELS } from '@/lib/utils/constants';
import {
  kgToLbs,
  lbsToKg,
  cmToFtIn,
  ftInToCm,
  fmtMeasure,
  type UnitSystem,
} from '@/lib/utils/units';
import { THEME_CATEGORIES } from '@/lib/system/themes';
import type { ThemeDef } from '@/lib/system/themes';

/** Parsea un input numérico (acepta coma decimal). undefined si vacío/inválido. */
function parseBodyNum(input: string): number | undefined {
  const n = parseFloat(input.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

interface StepData {
  name: string;
  goal: string;
  level: string;
  equipment: string;
  days: string;
  neuro: string;
  chronotype: string;
  medication: string;
  medication_time: string;
  theme: string;
  sensory_quiet: boolean;
  sensory_dim: boolean;
  sensory_swap: boolean;
  duration: number;
  /** ⚧️ Sexo ('' = sin registrar) */
  sex: string;
  /** 📐 Sistema de medidas: imperial (default) o métrico */
  units: UnitSystem;
  /** ⚖️ Peso en la unidad de display actual (string crudo) */
  weight: string;
  /** 📏 Estatura (imperial: pies + pulgadas | métrico: cm) */
  height_ft: string;
  height_in: string;
  height_cm: string;
}

// ─── Chronotype options ───
const CHRONO_OPTS = [
  { value: 'leon', icon: Sun, label: 'León (mañana)', desc: 'Mi pico es entre 07:00 y 12:00' },
  { value: 'lobo', icon: MoonStar, label: 'Lobo (noche)', desc: 'Mi pico es entre 17:00 y 22:00' },
];

// ─── Medication options ───
const MED_OPTS = [
  { value: 'no', icon: Pill, label: 'No aplica', desc: 'O prefiero no decirlo' },
  { value: 'short', icon: Pill, label: 'Acción corta', desc: 'Pico de ~3-4 horas' },
  { value: 'long', icon: Pill, label: 'Acción larga', desc: 'Pico de ~6-8 horas' },
];

const MED_TIMES = ['07:00', '08:00', '09:00', '10:00'];

// ─── Theme (hyperfixation) options ───
const CAT_LABELS: Record<ThemeDef['category'], string> = {
  fitness: 'Fitness',
  taino: 'Taíno',
  arquetipo: 'Arquetipo',
  elemental: 'Elemental',
  biblico: 'Bíblicos',
  none: '',
};
const THEME_OPTS: ThemeDef[] = THEME_CATEGORIES.flatMap((cat) => cat.themes);
const THEMES_BY_CATEGORY: Record<ThemeDef['category'], ThemeDef[]> = (() => {
  const acc: Record<ThemeDef['category'], ThemeDef[]> = { fitness: [], taino: [], arquetipo: [], elemental: [], biblico: [], none: [] };
  for (const o of THEME_OPTS) acc[o.category]?.push(o);
  return acc;
})();

function ThemeOptionButton({
  option,
  selected,
  onSelect,
}: {
  option: ThemeDef;
  selected: boolean;
  onSelect: (value: string) => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className={`flex items-center gap-3 w-full min-h-[56px] p-3.5 rounded-2xl border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#ffb454]/50 ${
        selected
          ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
          : 'border-white/[.07] bg-[#151b2a] text-white hover:bg-white/[.08]'
      }`}
    >
      {option.icon && <option.icon size={28} className="shrink-0 text-[#ffb454]" />}
      <span className="font-semibold flex flex-col">
        <span>{t(option.label_key)}</span>
        {option.desc_key && (
          <span className="text-xs text-[var(--muted)] font-normal">{t(option.desc_key)}</span>
        )}
      </span>
    </button>
  );
}

const STEPS = [
  {
    key: 'name' as const,
    title: 'Empecemos',
    question: '¿Cómo te llamamos?',
  },
  {
    key: 'goal' as const,
    title: 'Tu objetivo',
    question: '¿Qué buscas con CHISPA?',
    options: [
      { value: 'fuerza', icon: Dumbbell, label: 'Fuerza y músculo', desc: 'Ganar fuerza y tono' },
      { value: 'energia', icon: Zap, label: 'Energía y salud', desc: 'Sentirte bien cada día' },
      { value: 'grasa', icon: Flame, label: 'Perder grasa', desc: 'Cambiar tu composición' },
    ],
    sub: {
      key: 'duration' as const,
      question: '¿Cuánto tiempo por sesión te viene bien?',
      options: [
        { value: '10', label: '10 min', desc: 'Corto y directo', icon: Zap },
        { value: '20', label: '20 min', desc: 'El equilibrio', icon: Clock },
        { value: '30', label: '30 min', desc: 'Me gusta largo', icon: Flame },
      ],
    },
  },
  {
    key: 'level' as const,
    title: 'Tu punto de partida',
    question: '¿Cuánto te mueves ahora mismo?',
    options: [
      { value: 'inicio', icon: Sprout, label: 'Estoy empezando', desc: 'Poco o nada de ejercicio' },
      { value: 'medio', icon: Footprints, label: 'Me muevo a veces', desc: 'Actividad irregular' },
      { value: 'regular', icon: PersonStanding, label: 'Entreno regular', desc: 'Varias veces por semana' },
    ],
  },
  {
    key: 'neuro' as const,
    title: 'Tu cerebro',
    question: '¿Cómo funcionas? (Esto cambia cómo te entrenamos)',
    options: [
      { value: 'adh-c', icon: Brain, label: 'TDAH combinado', desc: 'Hiperactivo + inatento · diagnóstico o sospecha' },
      { value: 'adh-i', icon: Wind, label: 'TDAH inatento', desc: 'Sobre todo foco disperso · la mente se va' },
      { value: 'audhd', icon: GitBranch, label: 'AuDHD', desc: 'Autismo + TDAH · doble cableado' },
      { value: 'spd', icon: HeartPulse, label: 'Alta sensibilidad', desc: 'Perfil sensorial intenso (HSP)' },
      { value: 'other', icon: Radio, label: 'Otra neurodivergencia', desc: 'TEA, dislexia, o prefiero describirlo yo' },
      { value: 'curious', icon: HelpCircle, label: 'Solo curioseando', desc: 'Sin etiqueta · las apps típicas me fallan igual' },
    ],
  },
  {
    key: 'chronotype' as const,
    title: 'Tu cronotipo',
    question: '¿Cuándo estás en tu pico?',
    options: CHRONO_OPTS,
  },
  {
    key: 'equipment' as const,
    title: 'Tu contexto',
    question: '¿Con qué material cuentas?',
    options: [
      { value: 'ninguno', icon: Home, label: 'Sin equipo', desc: 'Solo tu cuerpo' },
      { value: 'mancuernas', icon: Dumbbell, label: 'Mancuernas', desc: 'Material en casa' },
      { value: 'gimnasio', icon: Building, label: 'Gimnasio', desc: 'Acceso completo' },
    ],
    sub: {
      key: 'days' as const,
      question: '¿Cuántos días a la semana puedes?',
      options: [
        { value: '2-3', label: '2-3 días', desc: 'Empezar suave', icon: Calendar },
        { value: '4-5', label: '4-5 días', desc: 'Con constancia', icon: CalendarCheck },
        { value: 'flex', label: 'Flexible', desc: 'Según la semana', icon: RefreshCw },
      ],
    },
  },
  {
    key: 'medication' as const,
    title: 'Tu medicación',
    question: '¿Tomas medicación estimulante?',
    options: MED_OPTS,
    sub: {
      key: 'medication_time' as const,
      question: '¿A qué hora la tomas?',
      options: MED_TIMES.map((t) => ({ value: t, label: t, desc: '', icon: Clock })),
    },
  },
  {
    key: 'body' as const,
    title: 'Tu cuerpo',
    question: '¿Quieres registrar tus medidas?',
  },
  {
    key: 'theme' as const,
    title: 'Tu hiperfijación',
    question: '¿Qué te tiene obsesionado?',
    options: THEME_OPTS,
  },
  {
    key: 'sensory' as const,
    title: 'Perfil sensorial',
    question: '¿Cómo procesas los estímulos?',
  },
];

export function OnboardingScreen() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const [step, setStep] = useState(0);
  const [showBoot, setShowBoot] = useState(false);
  const [data, setData] = useState<StepData>({
    // ND: defaults pre-seleccionados → cada pantalla llega lista (menos decisiones).
    // El usuario solo confirma; el botón "Continuar" nunca queda bloqueado por indecisión.
    name: '', goal: 'energia', level: 'medio', equipment: 'ninguno',
    days: '2-3', neuro: 'curious', chronotype: 'leon', medication: 'no', medication_time: '',
    theme: 'ninguno', sensory_quiet: false, sensory_dim: false, sensory_swap: false,
    duration: 20,
    // Medidas corporales (opcional): imperial por defecto, sin valores
    sex: '', units: 'imperial', weight: '', height_ft: '', height_in: '', height_cm: '',
  });
  const setProfile = useStore((s) => s.setProfile);
  const setNeuro = useStore((s) => s.setNeuro);
  const setTwin = useStore((s) => s.setTwin);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const setCheckin = useStore((s) => s.setCheckin);
  const setView = useStore((s) => s.setView);
  const setQuestState = useStore((s) => s.setQuestState);
  const setSensory = useStore((s) => s.setSensory);
  const logEvent = useStore((s) => s.logEvent);
  const logWeight = useStore((s) => s.logWeight);

  const st = STEPS[step];
  const total = STEPS.length;

  const canNext = st.key === 'name'
    ? data.name.trim().length >= 2
    : st.key === 'sensory' || st.key === 'body'
      // Sensory/body steps are always valid (opcional — se puede saltar)
      ? true
      : data[st.key] !== '' && (
          !st.sub
          // Skip sub for medication if medication === 'no' (dont need time)
          || (st.key === 'medication' && data.medication === 'no')
          || data[st.sub.key] !== ''
        );

  const handleNext = () => {
    if (!canNext) return;
    if (step === total - 1) {
      const profile: Profile = {
        user_id: '',
        name: data.name.trim(),
        goal: data.goal as any,
        level: data.level as any,
        equipment: data.equipment as any,
        days_per_week: data.days as any,
        neurotype: data.neuro as any,
        chronotype: data.chronotype as any,
        medication: data.medication as any,
        medication_time: data.medication === 'no' ? undefined : data.medication_time,
        // Medidas corporales (canónicas en métrico) — opcional
        sex: (data.sex || undefined) as Profile['sex'],
        weight_kg: bodyWeightKg(),
        height_cm: bodyHeightCm(),
        units: data.units,
        preferred_duration: Number(data.duration),
        limitations: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProfile(profile);
      // Historial: si registró peso, siembra la entrada de hoy
      const bodyW = bodyWeightKg();
      if (bodyW != null) {
        logWeight(todayKey(), bodyW);
      }
      setNeuro({ type: data.neuro, duration: Number(data.duration) });
      setTwin({
        user_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        training_style: 'adaptive',
        motivation_style: 'data',
        avoid: [],
        best_time: '',
        patterns: { completion_rate: 0.5, avg_duration: Number(data.duration), abandon_rate: 0.2, best_hours: {} },
        ex_progress: {},
        motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
      });
      setOnboarded(true);

      trackEvent('onboarding_done', { neurotype: data.neuro });

      // Set quest theme from onboarding
      if (data.theme) {
        setQuestState({ selectedTheme: data.theme });
      }

      // Set sensory preferences from onboarding
      setSensory({
        quiet: data.sensory_quiet,
        dim: data.sensory_dim,
        swap: data.sensory_swap,
      });

      // Background sync to Supabase
      supabaseSync.push({
        profile,
        weightHistory: useStore.getState().weightHistory,
        neuro: { type: data.neuro, duration: Number(data.duration) },
        twin: {
          user_id: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          training_style: 'adaptive', motivation_style: 'data', avoid: [], best_time: '',
          patterns: { completion_rate: 0.5, avg_duration: Number(data.duration), abandon_rate: 0.2, best_hours: {} },
          ex_progress: {}, motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
        },
      }).catch(logError('onboarding:push-twin'));

      logEvent('twin_created', {});
      setShowBoot(true);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleChoice = (key: string, value: string) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const toggleSensory = (key: 'sensory_quiet' | 'sensory_dim' | 'sensory_swap') => {
    setData((d) => ({ ...d, [key]: !d[key] }));
  };

  /** Cambia el sistema de medidas convirtiendo los valores ya escritos. */
  const handleBodyUnits = (u: UnitSystem) => {
    if (u === data.units) return;
    const w = parseBodyNum(data.weight);
    const kg = w == null ? undefined : data.units === 'imperial' ? lbsToKg(w) : w;
    const ft = parseBodyNum(data.height_ft);
    const inch = parseBodyNum(data.height_in);
    const cm = parseBodyNum(data.height_cm);
    const hCm = data.units === 'imperial'
      ? ft == null && inch == null ? undefined : ftInToCm(ft ?? 0, inch ?? 0)
      : cm;
    setData((d) => ({
      ...d,
      units: u,
      weight: kg != null ? fmtMeasure(u === 'imperial' ? kgToLbs(kg) : kg) : '',
      height_ft: hCm != null && u === 'imperial' ? String(cmToFtIn(hCm).feet) : '',
      height_in: hCm != null && u === 'imperial' ? String(cmToFtIn(hCm).inches) : '',
      height_cm: hCm != null && u === 'metric' ? fmtMeasure(hCm) : '',
    }));
  };

  const toggleBodySex = (value: string) => {
    setData((d) => ({ ...d, sex: d.sex === value ? '' : value }));
  };

  /** Peso en kg (canónico) según el sistema seleccionado. */
  const bodyWeightKg = (): number | undefined => {
    const n = parseBodyNum(data.weight);
    return n == null ? undefined : data.units === 'imperial' ? lbsToKg(n) : n;
  };

  /** Estatura en cm (canónica) según el sistema seleccionado. */
  const bodyHeightCm = (): number | undefined => {
    if (data.units === 'imperial') {
      const ft = parseBodyNum(data.height_ft);
      const inch = parseBodyNum(data.height_in);
      if (ft == null && inch == null) return undefined;
      return ftInToCm(ft ?? 0, inch ?? 0);
    }
    return parseBodyNum(data.height_cm);
  };

  const renderBody = () => {
    if (st.key === 'name') {
      return (
        <div className="flex flex-col gap-5">
          <BienvenidaIllustration className="w-full max-w-sm mx-auto" />
          <input
            id="onboarding-name"
            name="name"
            autoFocus
            value={data.name}
            onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
            placeholder={t('Tu nombre')}
            maxLength={20}
            className="w-full h-16 rounded-2xl bg-[#151b2a] border border-white/[.07] text-white text-xl font-bold px-5 outline-none focus:border-[#ffb454] transition-colors"
          />
        </div>
      );
    }

    // Theme step: grouped by category
    if (st.key === 'theme') {
      return (
        <div className="space-y-5">
          {(Object.keys(CAT_LABELS) as (keyof typeof CAT_LABELS)[]).map((cat) => {
            const items = THEMES_BY_CATEGORY[cat];
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                {CAT_LABELS[cat] && (
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{t(CAT_LABELS[cat])}</span>
                    <span className="flex-1 h-px bg-white/[.06]" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {items.map((opt) => (
                    <ThemeOptionButton
                      key={opt.value}
                      option={opt}
                      selected={data.theme === opt.value}
                      onSelect={() => handleChoice('theme', opt.value)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Body step: medidas corporales (opcional) con sistema de unidades
    if (st.key === 'body') {
      const inputCls = 'w-full min-w-0 h-14 rounded-2xl bg-[#151b2a] border border-white/[.07] text-white text-lg font-semibold px-4 outline-none focus:border-[#ffb454] transition-colors placeholder:text-[var(--muted)]';
      return (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            {t('Opcional: solo para ti, sin puntos ni recompensas. Puedes saltarlo.')}
          </p>

          {/* Sistema de medidas */}
          <div>
            <p className="text-xs font-semibold text-[var(--muted)] mb-2">{t('Sistema de medidas')}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleBodyUnits('imperial')}
                aria-pressed={data.units === 'imperial'}
                className={`flex flex-col items-center justify-center min-h-[58px] rounded-2xl border-2 text-center transition-all ${
                  data.units === 'imperial'
                    ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                    : 'border-white/[.07] bg-[#151b2a] hover:bg-white/[.08]'
                }`}
              >
                <span className="font-bold text-sm">🇺🇸 {t(UNITS_LABELS.imperial)}</span>
                <span className="text-[10px] text-[var(--muted)]">lb · ft</span>
              </button>
              <button
                type="button"
                onClick={() => handleBodyUnits('metric')}
                aria-pressed={data.units === 'metric'}
                className={`flex flex-col items-center justify-center min-h-[58px] rounded-2xl border-2 text-center transition-all ${
                  data.units === 'metric'
                    ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                    : 'border-white/[.07] bg-[#151b2a] hover:bg-white/[.08]'
                }`}
              >
                <span className="font-bold text-sm">🌐 {t(UNITS_LABELS.metric)}</span>
                <span className="text-[10px] text-[var(--muted)]">kg · cm</span>
              </button>
            </div>
          </div>

          {/* Sexo */}
          <div>
            <p className="text-xs font-semibold text-[var(--muted)] mb-2">{t('Sexo')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleBodySex('masculino')}
                aria-pressed={data.sex === 'masculino'}
                className={`min-h-[48px] rounded-2xl border-2 text-sm font-semibold transition-all ${
                  data.sex === 'masculino'
                    ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                    : 'border-white/[.07] bg-[#151b2a] text-[var(--muted)] hover:bg-white/[.08]'
                }`}
              >
                {SEX_LABELS[lang].masculine}
              </button>
              <button
                type="button"
                onClick={() => toggleBodySex('femenino')}
                aria-pressed={data.sex === 'femenino'}
                className={`min-h-[48px] rounded-2xl border-2 text-sm font-semibold transition-all ${
                  data.sex === 'femenino'
                    ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                    : 'border-white/[.07] bg-[#151b2a] text-[var(--muted)] hover:bg-white/[.08]'
                }`}
              >
                {SEX_LABELS[lang].feminine}
              </button>
            </div>
          </div>

          {/* Peso y estatura */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="onboarding-weight" className="text-xs font-semibold text-[var(--muted)] mb-1.5 block">
                {t('Peso')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="onboarding-weight"
                  inputMode="decimal"
                  placeholder={data.units === 'imperial' ? '132' : '60'}
                  value={data.weight}
                  onChange={(e) => setData((d) => ({ ...d, weight: e.target.value.replace(/[^0-9.,]/g, '') }))}
                  className={inputCls}
                />
                <span className="text-xs font-bold text-[var(--muted)] shrink-0">
                  {data.units === 'imperial' ? 'lb' : 'kg'}
                </span>
              </div>
            </div>
            <div>
              <label htmlFor="onboarding-height-ft" className="text-xs font-semibold text-[var(--muted)] mb-1.5 block">
                {t('Estatura')}
              </label>
              {data.units === 'imperial' ? (
                <div className="flex items-center gap-1.5">
                  <input
                    id="onboarding-height-ft"
                    inputMode="numeric"
                    placeholder="5"
                    value={data.height_ft}
                    onChange={(e) => setData((d) => ({ ...d, height_ft: e.target.value.replace(/[^0-9]/g, '') }))}
                    className={inputCls}
                  />
                  <span className="text-xs font-bold text-[var(--muted)] shrink-0">ft</span>
                  <input
                    id="onboarding-height-in"
                    inputMode="numeric"
                    placeholder="7"
                    value={data.height_in}
                    onChange={(e) => setData((d) => ({ ...d, height_in: e.target.value.replace(/[^0-9]/g, '') }))}
                    className={inputCls}
                  />
                  <span className="text-xs font-bold text-[var(--muted)] shrink-0">in</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    id="onboarding-height"
                    inputMode="decimal"
                    placeholder="170"
                    value={data.height_cm}
                    onChange={(e) => setData((d) => ({ ...d, height_cm: e.target.value.replace(/[^0-9.,]/g, '') }))}
                    className={inputCls}
                  />
                  <span className="text-xs font-bold text-[var(--muted)] shrink-0">cm</span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Sensory profile step: custom toggle switches
    if (st.key === 'sensory') {
      const toggles: { key: 'sensory_quiet' | 'sensory_dim' | 'sensory_swap'; icon: React.ElementType; label: string; desc: string }[] = [
        { key: 'sensory_quiet', icon: VolumeX, label: 'Modo silencio', desc: 'Sin sonidos, solo hápticos' },
        { key: 'sensory_dim', icon: MoonStar, label: 'Modo dim', desc: 'Reduce brillo y contraste' },
        { key: 'sensory_swap', icon: ArrowLeftRight, label: 'Sensory swap', desc: 'Reemplaza ejercicios de alto impacto sensorial' },
      ];

      return (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)] mb-2">
            {t('Activa lo que necesites. Puedes cambiarlo cuando quieras en Sistema.')}
          </p>
          {toggles.map((tog) => {
            const isOn = data[tog.key];
            const Icon = tog.icon;
            return (
              <div
                key={tog.key}
                className="flex items-center justify-between rounded-xl border border-white/[.07] bg-white/[.04] p-3 gap-3"
              >
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <Icon size={15} className="text-[var(--muted)]" /> {t(tog.label)}
                  </div>
                  <div className="text-[10px] text-[var(--muted)]">{t(tog.desc)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSensory(tog.key)}
                  aria-label={isOn ? t('Desactivar {x}', { x: t(tog.label) }) : t('Activar {x}', { x: t(tog.label) })}
                  className={`w-11 h-6 rounded-full relative transition-all shrink-0 ${
                    isOn ? 'bg-[rgba(0,212,170,0.25)] border border-[#00D4AA]' : 'bg-white/[.10] border border-white/[.15]'
                  }`}
                >
                  <span className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-all ${
                    isOn ? 'left-[22px] bg-[#00D4AA]' : 'left-[2px] bg-[#94a0b8]'
                  }`} />
                </button>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {st.options?.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleChoice(st.key, opt.value)}
            className={`flex items-center gap-3 w-full min-h-[60px] p-4 rounded-2xl border-2 text-left transition-all ${
              data[st.key] === opt.value
                ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                : 'border-white/[.07] bg-[#151b2a] text-white'
            }`}
          >
            {opt.icon && <opt.icon size={32} className="shrink-0 text-[#ffb454]" />}
            <span className="font-semibold flex flex-col">
              <span>{t(opt.label)}</span>
              {opt.desc && <span className="text-xs text-[var(--muted)] font-normal">{t(opt.desc)}</span>}
            </span>
          </button>
        ))}

        {st.sub && (st.key !== 'medication' || data.medication !== 'no') && (
          <>
            <p className="text-sm font-semibold text-[var(--muted)] mt-4 mb-1">{t(st.sub.question)}</p>
            <div className="flex flex-wrap gap-2.5">
              {st.sub.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleChoice(st.sub.key, opt.value)}
                  className={`flex flex-col items-center justify-center gap-1 min-h-[72px] flex-1 min-w-[90px] rounded-2xl border-2 py-3 px-2 text-center transition-all ${
                    data[st.sub.key] === opt.value
                      ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                      : 'border-white/[.07] bg-[#151b2a] text-white'
                  }`}
                >
                  {opt.icon && <opt.icon size={18} className="text-[var(--muted)] shrink-0" />}
                  <span className="font-semibold text-sm leading-tight">{t(opt.label)}</span>
                  {opt.desc && <span className="text-[11px] text-[var(--muted)] leading-tight">{t(opt.desc)}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const onBootComplete = React.useCallback(() => {
    // ND: al entrar al home, sembrar un check-in amable → HomeScreen genera tu
    // rutina de inmediato (promesa landing: "1 rutina, 1 botón, <2 min").
    // El usuario ve la rutina YA y puede ajustar el check-in después (sin culpa).
    setCheckin(todayKey(), {
      user_id: '', date: todayKey(), sleep: 7, energy: 6, stress: 4,
      recovery_score: 50, created_at: new Date().toISOString(),
    });
    setView('home');
  }, [setView, setCheckin]);

  if (showBoot) {
    return <BootScreen onComplete={onBootComplete} />;
  }

  return (
    <div className="min-h-dvh flex flex-col p-4">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          aria-label={t('Paso anterior')}
          className={`w-11 h-11 rounded-2xl border border-white/[.07] bg-[#151b2a] flex items-center justify-center text-white ${
            step === 0 ? 'invisible' : ''
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={t('Ir al paso') + ` ${i + 1}`}
              className={`h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[#ffb454]/50 ${
                i === step
                  ? 'w-6 bg-gradient-to-r from-[#ffb454] to-[#ff7a3d]'
                  : i < step
                    ? 'w-2 bg-[#ffb454]'
                    : 'w-2 bg-white/[.14] hover:bg-white/[.25]'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-semibold text-[var(--muted)]">{step + 1}/{total}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="flex-1 flex flex-col"
        >
          <Badge variant="accent" className="self-start mb-3">{t(st.title)}</Badge>
          <h2 className="text-2xl font-black tracking-tight mb-6">{t(st.question)}</h2>
          <div className="flex-1">{renderBody()}</div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-auto pt-6">
        <Button
          variant="primary"
          size="large"
          className="w-full"
          disabled={!canNext}
          onClick={handleNext}
        >
          {step === total - 1 ? t('Crear mi Digital Twin') : t('Continuar')}
        </Button>
      </div>
    </div>
  );
}
