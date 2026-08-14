'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import {
  Cpu, Brain, Users, BatteryCharging, Coffee, MoonStar,
  VolumeX, ArrowLeftRight, Smartphone, Clock, Dumbbell,
  GitBranch, Box, Database, AlertCircle,
   CheckCircle,
 } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import {
  BoltIcon,
  PulseIcon,
  ShieldIcon,
} from '@/components/ui/icons-rpg';

const AGENTS = [
  { name: 'Orquestador', role: 'CEO · árbol', icon: Cpu, color: '#00D4AA', status: 'idle' as const },
  { name: 'Coach', role: 'scoring bloques', icon: Brain, color: '#7C5CFC', status: 'idle' as const },
  { name: 'Body Double', role: 'state machine', icon: Users, color: '#FF6B35', status: 'busy' as const },
  { name: 'Auditor', role: 'regresión lineal', icon: PulseIcon, color: '#fbbf24', status: 'idle' as const },
];

const LOWSTIM_HOURS = [
  { h: 6, o: 15 }, { h: 8, o: 55 }, { h: 10, o: 80 }, { h: 12, o: 65 },
  { h: 14, o: 30 }, { h: 16, o: 70 }, { h: 18, o: 95 }, { h: 20, o: 60 }, { h: 22, o: 20 },
];

const STACK_LAYERS = [
  { name: 'Presentation', color: '#4CC9F0', icon: Smartphone, desc: 'Next.js · Tailwind · frosted glass UI · PWA' },
  { name: 'Application', color: '#00D4AA', icon: GitBranch, desc: 'Zustand · Zod · agent bus' },
  { name: 'Domain (DDD)', color: '#a78bfa', icon: Box, desc: 'Entities con invariantes · reglas de fitness puras' },
  { name: 'Infrastructure', color: '#fbbf24', icon: Database, desc: 'Supabase · SQLite local · ExerciseDB' },
  { name: 'Ops & Identity', color: '#f87171', icon: ShieldIcon, desc: 'Next.js · Supabase Auth · CI/CD · RLS' },
];

export function SistemaScreen() {
  const t = useT();
  const decisionFatigue = useStore((s) => s.decisionFatigue);
  const trackDecision = useStore((s) => s.trackDecision);
  const workouts = useStore((s) => s.workouts);
  const profile = useStore((s) => s.profile);
  const sensory = useStore((s) => s.sensory);
  const setSensory = useStore((s) => s.setSensory);
  const [caffeine, setCaffeine] = React.useState(160);

  const nowH = new Date().getHours();
  const medTime = profile?.medication && profile.medication !== 'no' && profile.medication_time
    ? parseInt(profile.medication_time.split(':')[0], 10)
    : null;
  const medWindow = medTime !== null
    ? { start: medTime + 1, end: medTime + (profile?.medication === 'short' ? 4 : 7) }
    : null;
  const inMedWindow = medWindow ? nowH >= medWindow.start && nowH <= medWindow.end : false;
  const cafWarn = nowH >= 14
    ? { cls: 'text-[#f87171] border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)]', ico: AlertCircle, txt: t('Pasadas las 14h. La cafeína puede romper el sueño.') }
    : caffeine > 0 && inMedWindow
      ? { cls: 'text-[#f87171] border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)]', ico: AlertCircle, txt: t('Cerca de tu medicación. Puede subir ansiedad.') }
      : { cls: 'text-[#00D4AA] border-[rgba(0,212,170,0.25)] bg-[rgba(0,212,170,0.06)]', ico: CheckCircle, txt: t('Cafeína en ventana segura.') };

  const quietHours = LOWSTIM_HOURS.filter(s => s.o < 35).map(s => `${s.h}:00`).join(', ');

  // ─── Fatigue breakdown ───
  // 1. Hour fatigue: sinusoidal curve peaking at 18h, trough at 6h
  //    Formula: 30 + 40 * cos((hour - 18) / 24 * 2π), clamped 0-70
  const hourFatigue = Math.round(
    30 + 40 * Math.cos(((nowH - 18) / 24) * 2 * Math.PI)
  );
  const hourClamped = Math.max(0, Math.min(70, hourFatigue));

  // 2. Workout fatigue: each workout today adds 15%
  const today = new Date().toISOString().slice(0, 10);
  const todayWorkouts = workouts.filter(
    (w) => w.date === today && w.completed_rate >= 0.5
  ).length;
  const workoutFatigue = Math.min(60, todayWorkouts * 15);

  // 3. Interaction fatigue from store (already 0-100, daily-reset)
  const interactionFatigue = decisionFatigue;

  // Combined weighted fatigue: 35% hour + 25% workout + 40% interactions
  const combinedFatigue = Math.min(100, Math.round(
    hourClamped * 0.35 + workoutFatigue * 0.25 + interactionFatigue * 0.4
  ));

  const fatigueColor = combinedFatigue > 70 ? '#f87171' : combinedFatigue > 40 ? '#fbbf24' : '#00D4AA';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-6 space-y-3.5 min-h-dvh">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between pt-5 pb-1"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#fbbf24] to-[#FF6B35] flex items-center justify-center text-[#241a00] font-bold text-sm">
            <Cpu size={16} />
          </span>
          <div>
            <h1 className="text-lg font-black tracking-tight">SISTEMA</h1>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Híbrido 80/20</p>
          </div>
        </div>
      </motion.div>

      {/* Info Box */}
      <Card variant="glass" className="p-3 border-[rgba(0,212,170,0.25)]">
        <div className="flex gap-2.5 items-start">
          <Brain size={18} className="text-[#00D4AA] shrink-0 mt-0.5" />
          <p className="text-[11.5px] leading-relaxed text-[var(--muted)]">
            {t('El algoritmo decide y calcula. La LLM on-device solo rellena plantillas. Zod bloquea alucinaciones antes de la UI.')}
          </p>
        </div>
      </Card>

      {/* Agents */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-2">
          <Users size={14} className="text-[var(--muted)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{t('Agentes')}</h2>
          <span className="text-[10px] text-[var(--muted)] font-mono ml-auto">{t('4 activos')}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {AGENTS.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.05 }}
              className="rounded-xl bg-white/[.04] border border-white/[.07] p-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2 h-2 rounded-full ${a.status === 'busy' ? 'bg-[#fbbf24] animate-pulse' : 'bg-[#34d399]'}`}
                  style={a.status === 'busy' ? { boxShadow: '0 0 8px #fbbf24' } : {}}
                />
                <div>
                  <div className="text-sm font-bold">{a.name}</div>
                  <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider">{a.role}</div>
                </div>
              </div>
              <div className="text-[10px] text-[var(--muted)] font-mono">{a.status === 'busy' ? 'check-ins (exercise)' : t('esperando input')}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Decision Fatigue Meter */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <BatteryCharging size={15} className="text-[var(--muted)]" />
          <span className="text-sm font-bold flex-1">{t('Fatiga de decisión')}</span>
          <span className="text-sm font-black font-mono" style={{ color: fatigueColor }}>{combinedFatigue}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/[.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${combinedFatigue}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full transition-colors"
            style={{ background: fatigueColor }}
          />
        </div>
        {/* Breakdown bars */}
        <div className="mt-2.5 space-y-1.5">
          {[
            { label: t('Hora del día'), value: hourClamped, color: '#4CC9F0', weight: '35%', icon: Clock },
            { label: t('Entrenamientos hoy'), value: workoutFatigue, color: '#FF6B35', weight: '25%', icon: Dumbbell },
            { label: t('Decisiones tomadas'), value: interactionFatigue, color: '#a78bfa', weight: '40%', icon: Brain },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2">
                <Tooltip content={item.label} side="top" align="center">
                  <Icon size={11} className="text-[var(--muted)] shrink-0" />
                </Tooltip>
                <div className="flex-1 h-1 rounded-full bg-white/[.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full"
                    style={{ background: item.color, opacity: 0.6 }}
                  />
                </div>
                <span className="text-[8px] text-[var(--muted)] font-mono tabular-nums w-[28px] text-right">{item.value}%</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-[var(--muted)] font-mono mt-2">
          {combinedFatigue > 70
            ? t('Demasiadas elecciones. Activa Autopilot.')
            : combinedFatigue > 40
              ? t('Subiendo. Considera Autopilot.')
              : t('Baja. Puedes elegir con claridad.')}
        </p>
      </Card>

      {/* Caffeine Tracker */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Coffee size={15} className="text-[#fbbf24]" />
          <span className="text-sm font-bold flex-1">{t('Cafeína × medicación')}</span>
          <span className="text-sm font-black font-mono text-[#fbbf24]">{caffeine} mg</span>
        </div>
        <div className="flex gap-2 mb-2">
          <button onClick={() => { setCaffeine(c => c + 60); trackDecision(2); }} className="flex-1 rounded-xl border border-white/[.07] bg-white/[.04] p-2 text-[11px] font-semibold text-[var(--muted)] hover:bg-white/[.08] transition-colors">
            <Coffee size={14} className="mx-auto mb-0.5" /> {t('Espresso')} <span className="block text-[9px] text-[#5C6577]">+60mg</span>
          </button>
          <button onClick={() => { setCaffeine(c => c + 80); trackDecision(2); }} className="flex-1 rounded-xl border border-white/[.07] bg-white/[.04] p-2 text-[11px] font-semibold text-[var(--muted)] hover:bg-white/[.08] transition-colors">
            <Coffee size={14} className="mx-auto mb-0.5" /> {t('Latte')} <span className="block text-[9px] text-[#5C6577]">+80mg</span>
          </button>
          <button onClick={() => { setCaffeine(0); trackDecision(2); }} className="flex-1 rounded-xl border border-white/[.07] bg-white/[.04] p-2 text-[11px] font-semibold text-[var(--muted)] hover:bg-white/[.08] transition-colors">
            <BoltIcon size={14} className="mx-auto mb-0.5" /> {t('Reset')}
          </button>
        </div>
        <div className={`text-[10px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${cafWarn.cls}`}>
          <cafWarn.ico size={12} /> {cafWarn.txt}
        </div>
      </Card>

      {/* Low Stim Hours */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <MoonStar size={15} className="text-[#a78bfa]" />
          <span className="text-sm font-bold flex-1">{t('Horas low-stim del gym')}</span>
          <span className="text-[10px] font-mono text-[#00D4AA]">{quietHours || '—'}</span>
        </div>
        <div className="flex items-end gap-1 h-12">
          {LOWSTIM_HOURS.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-sm transition-all ${s.o < 35 ? 'bg-gradient-to-b' : ''}`}
                style={{
                  height: `${s.o}%`,
                  minHeight: 4,
                  background: s.o >= 70 ? '#f87171' : s.o >= 35 ? '#fbbf24' : undefined,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {LOWSTIM_HOURS.map((s, i) => (
            <span key={i} className="flex-1 text-[7px] text-center text-[#5C6577] font-mono">{s.h}</span>
          ))}
        </div>
        <p className="text-[10px] text-[var(--muted)] font-mono mt-2">{t('Gym Anxiety Mode: entrena en franjas verdes.')}</p>
      </Card>

      {/* Sensory Profile */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-2">
          <MoonStar size={14} className="text-[var(--muted)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{t('Perfil sensorial')}</h2>
          <span className="text-[10px] text-[var(--muted)] font-mono ml-auto">neurodivergente</span>
        </div>
        <div className="space-y-2">
          {[
            { key: 'quiet', icon: VolumeX, label: t('Modo silencio'), desc: t('Sin sonidos, solo hápticos') },
            { key: 'dim', icon: MoonStar, label: t('Modo dim'), desc: t('Reduce brillo y contraste') },
            { key: 'swap', icon: ArrowLeftRight, label: t('Sensory swap'), desc: t('Reemplaza ejercicios de alto impacto') },
          ].map((tog, i) => {
            const isOn = sensory[tog.key as keyof typeof sensory];
            return (
              <motion.div
                key={tog.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="flex items-center justify-between rounded-xl border border-white/[.07] bg-white/[.04] p-3 gap-3"
              >
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <tog.icon size={15} className="text-[var(--muted)]" /> {tog.label}
                  </div>
                  <div className="text-[10px] text-[#5C6577]">{tog.desc}</div>
                </div>
                <button
                  onClick={() => { setSensory({ [tog.key]: !isOn }); trackDecision(3); }}
                  aria-label={isOn ? t('Desactivar {x}', { x: tog.label }) : t('Activar {x}', { x: tog.label })}
                  className={`w-11 h-6 rounded-full relative transition-all shrink-0 ${
                    isOn ? 'bg-[rgba(0,212,170,0.25)] border border-[#00D4AA]' : 'bg-white/[.10] border border-white/[.15]'
                  }`}
                >
                  <span className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-all ${
                    isOn ? 'left-[22px] bg-[#00D4AA]' : 'left-[2px] bg-[#94a0b8]'
                  }`} />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Tech Stack */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-4">
          <Box size={14} className="text-[var(--muted)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{t('Stack de producción')}</h2>
        </div>
        <div className="space-y-1.5">
          {STACK_LAYERS.map((layer, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="rounded-xl border-l-[3px] bg-white/[.04] border border-white/[.07] p-3"
              style={{ borderLeftColor: layer.color }}
            >
              <div className="flex items-center gap-2 text-sm font-bold" style={{ color: layer.color }}>
                <layer.icon size={14} /> {layer.name}
              </div>
              <div className="text-[10px] text-[var(--muted)] font-mono mt-0.5">{layer.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
