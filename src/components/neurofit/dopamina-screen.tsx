'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import {
  Sparkles, Brain, Anchor, Calendar, Leaf, Dumbbell,
  Music, Droplet, Wind, Footprints,
  Route, Waves, Utensils, Moon, CheckCircle,
} from 'lucide-react';
import {
  StarIcon,
  PulseIcon,
  BoltIcon,
} from '@/components/ui/icons-rpg';

const DOPA_MENU = [
  { cat: 'appetizer', label: 'Aperitivo', time: '5 min', color: '#00D4AA', icon: Leaf, items: [
    { icon: BoltIcon, name: 'Jumping jacks', sub: '30 seg', dopa: 7 },
    { icon: Music, name: 'Canción + baile', sub: '1 tema', dopa: 9 },
    { icon: Droplet, name: 'Agua fría en cara', sub: '10 seg', dopa: 6 },
    { icon: Wind, name: '10 respiraciones', sub: '1 min', dopa: 5 },
    { icon: Footprints, name: 'Caminar a ventana', sub: '1 min', dopa: 5 },
    { icon: PulseIcon, name: 'Sacudir el cuerpo', sub: '30 seg', dopa: 7 },
  ]},
  { cat: 'entree', label: 'Principal', time: '20 min', color: '#FF6B35', icon: Dumbbell, items: [
    { icon: Dumbbell, name: 'Workout del día', sub: 'plan completo', dopa: 10 },
    { icon: Footprints, name: 'Caminar fuera', sub: '20 min', dopa: 8 },
    { icon: Waves, name: 'Nadar', sub: '20 min', dopa: 9 },
    { icon: Route, name: 'Bici', sub: '20 min', dopa: 8 },
  ]},
  { cat: 'dessert', label: 'Postre', time: '10 min', color: '#a78bfa', icon: Sparkles, items: [
    { icon: Leaf, name: 'Estirar', sub: '10 min', dopa: 6 },
    { icon: Utensils, name: 'Snack proteico', sub: '1 pieza', dopa: 7 },
    { icon: Droplet, name: 'Ducha caliente', sub: '10 min', dopa: 8 },
    { icon: Moon, name: 'Tumbarse sin pantalla', sub: '5 min', dopa: 5 },
  ]},
];

const HABIT_STACKS = [
  { anchor: 'Café de la mañana', action: '2 min de estiramiento', done: true },
  { anchor: 'Cepillarse los dientes', action: '10 sentadillas', done: false },
  { anchor: 'Cerrar el portátil', action: 'Caminar 5 min', done: false },
];

export function DopaminaScreen() {
  const t = useT();
  const workouts = useStore((s) => s.workouts);
  const [habitStacks, setHabitStacks] = React.useState(HABIT_STACKS);

  const toggleHabit = (i: number) => {
    setHabitStacks(prev => prev.map((h, j) => j === i ? { ...h, done: !h.done } : h));
  };

  const thisWeek = workouts.filter(w => {
    const d = new Date(w.date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    return diff <= 7 && w.completed_rate >= 0.5;
  }).length;
  const totalXp = workouts.filter(w => w.completed_rate >= 0.5).length * 50;
  const doneHabits = habitStacks.filter(h => h.done).length;
  const mins = thisWeek * 28;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-6 space-y-3.5 min-h-dvh">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between pt-5 pb-1"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4AA] to-[#fbbf24] flex items-center justify-center text-[#042019] font-bold text-sm">
            <Sparkles size={16} />
          </span>
          <div>
            <h1 className="text-lg font-black tracking-tight">DOPAMINA</h1>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{t('El Menú Dopamina')}</p>
          </div>
        </div>
      </motion.div>

      {/* Info Box */}
      <Card variant="glass" className="p-3 border-[rgba(0,212,170,0.25)]">
        <div className="flex gap-2.5 items-start">
          <Brain size={18} className="text-[#00D4AA] shrink-0 mt-0.5" />
          <p className="text-[11.5px] leading-relaxed text-[var(--muted)]">
            {t('Herramienta clínica real para ADHD: elige una actividad de bajo esfuerzo como puente. La dopamina sube y el workout entra solo. Cero fuerza de voluntad.')}
          </p>
        </div>
      </Card>

      {/* Dopamine Menu */}
      {DOPA_MENU.map((cat, ci) => (
        <motion.div
          key={cat.cat}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + ci * 0.08 }}
        >
          <div className="flex items-center gap-2 mb-2 mt-4">
            <cat.icon size={14} style={{ color: cat.color }} />
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: cat.color }}>{t(cat.label)}</h2>
            <span className="text-[10px] text-[var(--muted)] font-mono ml-auto">{cat.time}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cat.items.map((it, ii) => (
              <motion.button
                key={ii}
                whileTap={{ scale: 0.96 }}
                className="relative rounded-xl border border-white/[.07] bg-white/[.04] p-3 text-left overflow-hidden"
                onClick={() => {
                  if (cat.cat === 'entree' && it.name.includes('Workout')) {
                    useStore.getState().setView('home');
                  }
                }}
              >
                <span className="absolute top-2 right-2 text-[9px] font-mono flex items-center gap-0.5" style={{ color: cat.color }}>
                  <StarIcon size={10} /><span>{it.dopa}</span>
                </span>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5" style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
                  <it.icon size={14} />
                </span>
                <div className="text-sm font-semibold">{t(it.name)}</div>
                <div className="text-[10px] text-[var(--muted)] font-mono mt-0.5">{t(it.sub)}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Habit Stacking */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-4">
          <Anchor size={14} className="text-[var(--muted)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Habit Stacking</h2>
          <span className="text-[10px] text-[var(--muted)] font-mono ml-auto">{t('{a}/{b} hoy', { a: doneHabits, b: habitStacks.length })}</span>
        </div>
        <div className="space-y-2">
          {habitStacks.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                h.done ? 'border-[rgba(0,212,170,0.25)] bg-[rgba(0,212,170,0.05)]' : 'border-white/[.07] bg-white/[.04]'
              }`}
            >
              <span className="w-8 h-8 rounded-lg bg-[rgba(0,212,170,0.1)] flex items-center justify-center text-[#00D4AA] shrink-0">
                <Anchor size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-[var(--muted)] font-mono">{t('después de: {anchor}', { anchor: t(h.anchor) })}</div>
                <div className="text-sm font-semibold">{t(h.action)}</div>
              </div>
              <button
                onClick={() => toggleHabit(i)}
                aria-label={h.done ? t('Marcar {x} como pendiente', { x: t(h.action) }) : t('Marcar {x} como hecho', { x: t(h.action) })}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  h.done
                    ? 'bg-[#00D4AA] border-[#00D4AA] text-[#042019]'
                    : 'border-white/[.20] text-transparent'
                }`}
              >
                <CheckCircle size={12} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Weekly Review */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-4">
          <Calendar size={14} className="text-[var(--muted)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Weekly Review</h2>
          <span className="text-[10px] text-[var(--muted)] font-mono ml-auto">{t('sin culpa')}</span>
        </div>
        <Card variant="glass" className="p-4 border-[rgba(167,139,250,0.3)]">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-[#a78bfa]" />
            <span className="text-sm font-bold">{t('Resumen de la semana')}</span>
            <span className="text-[9px] text-[var(--muted)] font-mono ml-auto">auto · Auditor</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-xl bg-white/[.04] border border-white/[.07] p-2 text-center">
              <div className="text-lg font-black">{thisWeek}</div>
              <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider">{t('sesiones')}</div>
            </div>
            <div className="rounded-xl bg-white/[.04] border border-white/[.07] p-2 text-center">
              <div className="text-lg font-black">{mins}</div>
              <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider">{t('minutos')}</div>
            </div>
            <div className="rounded-xl bg-white/[.04] border border-white/[.07] p-2 text-center">
              <div className="text-lg font-black">{totalXp}</div>
              <div className="text-[9px] text-[var(--muted)] uppercase tracking-wider">XP</div>
            </div>
          </div>
          <p className="text-sm italic text-[var(--muted)] leading-relaxed border-l-2 border-[#a78bfa] pl-3">
            &ldquo;{t('{n} sesiones esta semana.', { n: thisWeek })}{' '}{thisWeek >= 3 ? t('Consistencia sólida.') : thisWeek >= 1 ? t('Buen comienzo.') : t('Sin presión. Mañana es una nueva oportunidad.')}&rdquo;
          </p>
        </Card>
      </div>
    </motion.div>
  );
}
