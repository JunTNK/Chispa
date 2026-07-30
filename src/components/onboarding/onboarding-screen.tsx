'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabaseSync } from '@/lib/sync/supabase-sync';
import { logError } from '@/lib/utils/logger';
import { Dumbbell, Zap, Flame, Sprout, Footprints, PersonStanding, Brain, Wind, GitBranch, HeartPulse, HelpCircle, Radio, Home, Building, Sun, MoonStar, Pill, Anchor, Crown, Sword, VolumeX, ArrowLeftRight, Clock, Calendar, CalendarCheck, RefreshCw, Shield } from 'lucide-react';
import { BootScreen } from './boot-screen';
import { BienvenidaIllustration } from './bienvenida-illustration';

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
const THEME_OPTS = [
  // Pop culture
  { value: 'one_piece', icon: Anchor, label: 'One Piece', desc: 'Recurso: Haki · cada rep te acerca al Grand Line', category: 'pop' },
  { value: 'elden_ring', icon: Crown, label: 'Elden Ring', desc: 'Recurso: Runas · cada set es un boss fight', category: 'pop' },
  { value: 'dragon_ball', icon: Zap, label: 'Dragon Ball', desc: 'Recurso: Ki · cada entrenamiento carga tu Genki Dama', category: 'pop' },
  { value: 'zelda', icon: Sword, label: 'Zelda', desc: 'Recurso: Rupees · cada workout es una mazmorra', category: 'pop' },
  // Biblical
  { value: 'david', icon: Crown, label: 'David', desc: 'Fe inquebrantable · vence gigantes con determinación', category: 'biblico' },
  { value: 'samson', icon: Zap, label: 'Sansón', desc: 'Fuerza sobrehumana · cada rep es un acto de poder', category: 'biblico' },
  { value: 'job', icon: Shield, label: 'Job', desc: 'Paciencia y resistencia · nada te quiebra', category: 'biblico' },
  { value: 'joshua', icon: Sword, label: 'Josué', desc: 'Conquista y batalla · derriba murallas con constancia', category: 'biblico' },
  { value: 'gideon', icon: Anchor, label: 'Gedeón', desc: 'Estrategia y fe · pocos pero decididos', category: 'biblico' },
  { value: 'noah', icon: GitBranch, label: 'Noé', desc: 'Construir y perseverar · día tras día sin rendirte', category: 'biblico' },
  { value: 'moses', icon: Flame, label: 'Moisés', desc: 'Liderazgo y liberación · guía tu propio éxodo', category: 'biblico' },
  // None
  { value: 'ninguno', icon: HelpCircle, label: 'Ninguno', desc: 'Sin hiperfijación · al grano', category: 'none' },
];

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
  const [step, setStep] = useState(0);
  const [showBoot, setShowBoot] = useState(false);
  const [data, setData] = useState<StepData>({
    name: '', goal: '', level: '', equipment: '',
    days: '', neuro: '', chronotype: '', medication: '', medication_time: '',
    theme: '', sensory_quiet: false, sensory_dim: false, sensory_swap: false,
    duration: 20,
  });
  const setProfile = useStore((s) => s.setProfile);
  const setNeuro = useStore((s) => s.setNeuro);
  const setTwin = useStore((s) => s.setTwin);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const setView = useStore((s) => s.setView);
  const setQuestState = useStore((s) => s.setQuestState);
  const setSensory = useStore((s) => s.setSensory);
  const logEvent = useStore((s) => s.logEvent);

  const st = STEPS[step];
  const total = STEPS.length;

  const canNext = st.key === 'name'
    ? data.name.trim().length >= 2
    : st.key === 'sensory'
      // Sensory step is always valid (toggles always have a value)
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
      setProfile({
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
        preferred_duration: Number(data.duration),
        limitations: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
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
        profile: {
          user_id: '', name: data.name.trim(), goal: data.goal as any,
          level: data.level as any, equipment: data.equipment as any,
          days_per_week: data.days as any, neurotype: data.neuro as any,
          chronotype: data.chronotype as any,
          medication: data.medication as any,
          medication_time: data.medication === 'no' ? undefined : data.medication_time,
          preferred_duration: Number(data.duration), limitations: [],
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        },
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
            placeholder="Tu nombre"
            maxLength={20}
            className="w-full h-16 rounded-2xl bg-[#151b2a] border border-white/[.07] text-white text-xl font-bold px-5 outline-none focus:border-[#ffb454] transition-colors"
          />
        </div>
      );
    }

    // Theme step: grouped by category
    if (st.key === 'theme') {
      const categories = [
        { key: 'pop', label: 'Pop culture' },
        { key: 'biblico', label: 'Bíblicos' },
        { key: 'none', label: '' },
      ];

      return (
        <div className="space-y-5">
          {categories.map((cat) => {
            const items = THEME_OPTS.filter((o) => o.category === cat.key);
            if (items.length === 0) return null;
            return (
              <div key={cat.key}>
                {cat.label && (
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5C6577]">{cat.label}</span>
                    <span className="flex-1 h-px bg-white/[.06]" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {items.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleChoice('theme', opt.value)}
                      className={`flex items-center gap-3 w-full min-h-[56px] p-3.5 rounded-2xl border-2 text-left transition-all ${
                        data.theme === opt.value
                          ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                          : 'border-white/[.07] bg-[#151b2a] text-white hover:bg-white/[.08]'
                      }`}
                    >
                      {opt.icon && <opt.icon size={28} className="shrink-0 text-[#ffb454]" />}
                      <span className="font-semibold flex flex-col">
                        <span>{opt.label}</span>
                        {opt.desc && <span className="text-xs text-[#94a0b8] font-normal">{opt.desc}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
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
          <p className="text-sm text-[#94a0b8] mb-2">
            Activa lo que necesites. Puedes cambiarlo cuando quieras en Sistema.
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
                    <Icon size={15} className="text-[#94a0b8]" /> {tog.label}
                  </div>
                  <div className="text-[10px] text-[#5C6577]">{tog.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSensory(tog.key)}
                  aria-label={isOn ? `Desactivar ${tog.label}` : `Activar ${tog.label}`}
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
              <span>{opt.label}</span>
              {opt.desc && <span className="text-xs text-[#94a0b8] font-normal">{opt.desc}</span>}
            </span>
          </button>
        ))}

        {st.sub && (st.key !== 'medication' || data.medication !== 'no') && (
          <>
            <p className="text-sm font-semibold text-[#94a0b8] mt-4 mb-1">{st.sub.question}</p>
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
                  {opt.icon && <opt.icon size={18} className="text-[#94a0b8] shrink-0" />}
                  <span className="font-semibold text-sm leading-tight">{opt.label}</span>
                  {opt.desc && <span className="text-[11px] text-[#94a0b8] leading-tight">{opt.desc}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const onBootComplete = React.useCallback(() => {
    setView('home');
  }, [setView]);

  if (showBoot) {
    return <BootScreen onComplete={onBootComplete} />;
  }

  return (
    <div className="min-h-dvh flex flex-col p-4">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          aria-label="Paso anterior"
          className={`w-11 h-11 rounded-2xl border border-white/[.07] bg-[#151b2a] flex items-center justify-center text-white ${
            step === 0 ? 'invisible' : ''
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step
                  ? 'w-6 bg-gradient-to-r from-[#ffb454] to-[#ff7a3d]'
                  : i < step
                    ? 'w-2 bg-[#ffb454]'
                    : 'w-2 bg-white/[.14]'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-semibold text-[#94a0b8]">{step + 1}/{total}</span>
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
          <Badge variant="accent" className="self-start mb-3">{st.title}</Badge>
          <h2 className="text-2xl font-black tracking-tight mb-6">{st.question}</h2>
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
          {step === total - 1 ? 'Crear mi Digital Twin' : 'Continuar'}
        </Button>
      </div>
    </div>
  );
}
