'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StepData {
  name: string;
  goal: string;
  level: string;
  equipment: string;
  days: string;
  neuro: string;
  duration: number;
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
      { value: 'fuerza', emoji: '💪', label: 'Fuerza y músculo', desc: 'Ganar fuerza y tono' },
      { value: 'energia', emoji: '⚡', label: 'Energía y salud', desc: 'Sentirte bien cada día' },
      { value: 'grasa', emoji: '🔥', label: 'Perder grasa', desc: 'Cambiar tu composición' },
    ],
    sub: {
      key: 'duration' as const,
      question: '¿Cuánto tiempo por sesión te viene bien?',
      options: [
        { value: '10', label: '10 min', desc: 'Corto y directo' },
        { value: '20', label: '20 min', desc: 'El equilibrio' },
        { value: '30', label: '30 min', desc: 'Me gusta largo' },
      ],
    },
  },
  {
    key: 'level' as const,
    title: 'Tu punto de partida',
    question: '¿Cuánto te mueves ahora mismo?',
    options: [
      { value: 'inicio', emoji: '🌱', label: 'Estoy empezando', desc: 'Poco o nada de ejercicio' },
      { value: 'medio', emoji: '🚶', label: 'Me muevo a veces', desc: 'Actividad irregular' },
      { value: 'regular', emoji: '🏃', label: 'Entreno regular', desc: 'Varias veces por semana' },
    ],
  },
  {
    key: 'neuro' as const,
    title: 'Tu cerebro',
    question: '¿Cómo funcionas? (Esto cambia cómo te entrenamos)',
    options: [
      { value: 'tdah', emoji: '🧠', label: 'TDAH', desc: 'Diagnóstico o sospecha' },
      { value: 'neuro', emoji: '🌈', label: 'Otra neurodivergencia', desc: 'TEA, dislexia, etc.' },
      { value: 'nose', emoji: '🤔', label: 'No estoy seguro', desc: 'Pero las apps típicas me fallan' },
    ],
  },
  {
    key: 'equipment' as const,
    title: 'Tu contexto',
    question: '¿Con qué material cuentas?',
    options: [
      { value: 'ninguno', emoji: '🏠', label: 'Sin equipo', desc: 'Solo tu cuerpo' },
      { value: 'mancuernas', emoji: '🏋️', label: 'Mancuernas', desc: 'Material en casa' },
      { value: 'gimnasio', emoji: '🏢', label: 'Gimnasio', desc: 'Acceso completo' },
    ],
    sub: {
      key: 'days' as const,
      question: '¿Cuántos días a la semana puedes?',
      options: [
        { value: '2-3', label: '2-3 días', desc: 'Empezar suave' },
        { value: '4-5', label: '4-5 días', desc: 'Con constancia' },
        { value: 'flex', label: 'Flexible', desc: 'Según la semana' },
      ],
    },
  },
];

export function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<StepData>({
    name: '', goal: '', level: '', equipment: '',
    days: '', neuro: '', duration: 20,
  });
  const setProfile = useStore((s) => s.setProfile);
  const setNeuro = useStore((s) => s.setNeuro);
  const setTwin = useStore((s) => s.setTwin);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const setView = useStore((s) => s.setView);
  const logEvent = useStore((s) => s.logEvent);

  const st = STEPS[step];
  const total = STEPS.length;

  const canNext = st.key === 'name'
    ? data.name.trim().length >= 2
    : data[st.key] !== '' && (!st.sub || data[st.sub.key] !== '');

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
        preferred_duration: data.duration as any,
        limitations: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setNeuro({ type: data.neuro, duration: data.duration });
      setTwin({
        user_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        training_style: 'adaptive',
        motivation_style: 'data',
        avoid: [],
        best_time: '',
        patterns: { completion_rate: 0.5, avg_duration: data.duration, abandon_rate: 0.2, best_hours: {} },
        ex_progress: {},
        motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
      });
      setOnboarded(true);
      logEvent('twin_created', {});
      setView('home');
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

  const renderBody = () => {
    if (st.key === 'name') {
      return (
        <input
          autoFocus
          value={data.name}
          onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
          placeholder="Tu nombre"
          maxLength={20}
          className="w-full h-16 rounded-2xl bg-[#151b2a] border border-white/[.07] text-white text-xl font-bold px-5 outline-none focus:border-[#ffb454] transition-colors"
        />
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
            {opt.emoji && <span className="text-2xl shrink-0">{opt.emoji}</span>}
            <span className="font-semibold flex flex-col">
              <span>{opt.label}</span>
              {opt.desc && <span className="text-xs text-[#94a0b8] font-normal">{opt.desc}</span>}
            </span>
          </button>
        ))}

        {st.sub && (
          <>
            <p className="text-sm font-semibold text-[#94a0b8] mt-4 mb-1">{st.sub.question}</p>
            <div className="grid grid-cols-3 gap-2.5">
              {st.sub.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleChoice(st.sub.key, opt.value)}
                  className={`flex flex-col items-center justify-center gap-1 min-h-[64px] rounded-2xl border-2 p-2 text-center transition-all ${
                    data[st.sub.key] === opt.value
                      ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                      : 'border-white/[.07] bg-[#151b2a] text-white'
                  }`}
                >
                  <span className="font-semibold text-sm">{opt.label}</span>
                  {opt.desc && <span className="text-[11px] text-[#94a0b8]">{opt.desc}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-dvh flex flex-col p-4">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
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
