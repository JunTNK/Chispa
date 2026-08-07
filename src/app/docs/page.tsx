'use client';

import React from 'react';
import Link from 'next/link';
import {
  MuscleGroupIcon,
  MUSCLE_GROUPS,
} from '@/components/ui/muscle-icons';
import type { MuscleGroupKey } from '@/components/ui/muscle-icons';
import { FitnessIcon } from '@/components/ui/fitness-icon';
import { ICONS_META, ICONS_BY_CATEGORY, type FitnessIconName } from '@/lib/utils/fitness-icons';
import { PATTERN_ICON, PATTERN_COLOR } from '@/lib/utils/pattern-visuals';
import { PATTERN_LABEL, type Pattern } from '@/lib/agents/selector-engine';
import { MUSCLES, MUSCLE_KEYS } from '@/lib/utils/muscles';

const COLOR_PRESETS = [
  { label: 'Ámbar', value: '#f5a623', class: 'bg-[#f5a623]' },
  { label: 'Coral', value: '#ff6b5e', class: 'bg-[#ff6b5e]' },
  { label: 'Menta', value: '#4fd9a0', class: 'bg-[#4fd9a0]' },
  { label: 'Cielo', value: '#5fc6ff', class: 'bg-[#5fc6ff]' },
  { label: 'Hueso', value: '#f3ede1', class: 'bg-[#f3ede1]' },
  { label: 'Lima', value: '#a3e635', class: 'bg-[#a3e635]' },
  { label: 'Rosa', value: '#f472b6', class: 'bg-[#f472b6]' },
  { label: 'Violeta', value: '#a78bfa', class: 'bg-[#a78bfa]' },
];

const ICONS: { name: MuscleGroupKey; label: string; viewBox: string; paths: number; source: string }[] = [
  { name: 'full', label: MUSCLE_GROUPS.full.label, viewBox: '0 0 24 24', paths: 4, source: 'workout-stretching' },
  { name: 'upper', label: MUSCLE_GROUPS.upper.label, viewBox: '0 0 24 24', paths: 6, source: 'body-part-six-pack' },
  { name: 'lower', label: MUSCLE_GROUPS.lower.label, viewBox: '0 0 24 24', paths: 3, source: 'body-part-leg' },
  { name: 'core', label: MUSCLE_GROUPS.core.label, viewBox: '0 0 24 24', paths: 1, source: 'icons/stroke-rounded?search=heart' },
];

// Iconos de categoría ALINEADOS CON PATRONES (no con músculos): la taxonomía
// real del selector (push/pull/hinge/squat/…), no PushIcon/PressIcon por músculo.
const PATTERN_ORDER: Pattern[] = ['push', 'pull', 'squat', 'hinge', 'core', 'cardio', 'mobility', 'arms'];

const SPECIFIC_ICONS: { id: string; label: string; desc: string; tags: string; svg: React.ReactNode }[] = [
  {
    id: 'situp', label: 'Sit-Up', desc: 'Cabeza + torso + piernas', tags: 'core · crunch',
    svg: <><path d="M12 4c-2 0-3.5 1.5-3.5 3.5S10 11 12 11s3.5-1.5 3.5-3.5S14 4 12 4z"/><path d="M7 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5v5H7v-5z"/><path d="M9 16h6M9 19h6"/></>,
  },
  {
    id: 'crunch', label: 'Crunch Machine', desc: 'Rect + líneas centrales', tags: 'máquina · abdominales',
    svg: <><rect x="7" y="3" width="10" height="18" rx="2"/><line x1="12" y1="7" x2="12" y2="17"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/><path d="M12 7c-1 0-2 .5-2 1.5S11 10 12 10s2-.5 2-1.5S13 7 12 7z"/></>,
  },
  {
    id: 'roller', label: 'Ab Roller', desc: '2 ruedas + mango', tags: 'rueda · rollout',
    svg: <><circle cx="6" cy="14" r="3"/><circle cx="18" cy="14" r="3"/><line x1="9" y1="14" x2="15" y2="14"/><line x1="12" y1="14" x2="12" y2="6"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="10" y1="6" x2="14" y2="6"/></>,
  },
  {
    id: 'bike', label: 'Air Bike', desc: '2 pedales + torso', tags: 'cardio · bicicleta',
    svg: <><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/><path d="M12 5c-2 0-3 1.5-3 3s1 3 3 3 3-1.5 3-3-1-3-3-3z"/><path d="M9 8l-3 7M15 8l3 7"/><path d="M12 11l-2 4M12 11l2 4"/></>,
  },
  {
    id: 'heel', label: 'Heel Touchers', desc: 'Torso + brazos extendidos', tags: 'core · talones',
    svg: <><path d="M7 4c0 3 2 5 5 5s5-2 5-5"/><path d="M7 9v8l-2 3M17 9v8l2 3"/><path d="M9 12c0 2 1 3 3 3s3-1 3-3"/><path d="M5 20h14"/></>,
  },
  {
    id: 'hamstring', label: 'Hamstring', desc: 'Círculo + líneas de pierna', tags: 'piernas · isquiotibiales',
    svg: <><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>,
  },
  {
    id: 'adductor', label: 'Adductor', desc: 'Círculo + piernas abiertas', tags: 'ingle · aductores',
    svg: <><circle cx="12" cy="4" r="2"/><path d="M12 6v6l-4 8M12 12l4 8"/><path d="M8 20l-2 2M16 20l2 2"/><path d="M10 9l-3 2M14 9l3 2"/></>,
  },
  {
    id: 'quad', label: 'Quad Stretch', desc: 'Círculo + pierna doblada', tags: 'cuádriceps · estiramiento',
    svg: <><circle cx="12" cy="4" r="2"/><path d="M12 6v5l3 8M12 11l-3 8"/><path d="M15 19l2 3M9 19l-2 3"/><path d="M13 8l3-2M11 8l-3-2"/></>,
  },
  {
    id: 'kettlebell', label: 'Kettlebell', desc: 'Campana + asa + bola', tags: 'pesas · equipamiento',
    svg: <><path d="M12 3a4 4 0 0 0-4 4v2a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4z"/><circle cx="12" cy="16" r="5"/><path d="M12 11v2"/><path d="M9 16h6M10 19h4"/></>,
  },
  {
    id: 'trx', label: 'TRX', desc: 'Cuerdas + agarres', tags: 'suspensión · brazos',
    svg: <><line x1="6" y1="3" x2="6" y2="10"/><line x1="18" y1="3" x2="18" y2="10"/><path d="M6 10a6 6 0 0 0 12 0"/><line x1="8" y1="12" x2="8" y2="20"/><line x1="16" y1="12" x2="16" y2="20"/><circle cx="8" cy="21" r="1.5"/><circle cx="16" cy="21" r="1.5"/></>,
  },
  {
    id: 'curl', label: 'Bicep Curl', desc: 'Brazo curvo + mancuerna', tags: 'bíceps · curl',
    svg: <><path d="M7 14c0-4 2-7 5-7s5 3 5 7-2 7-5 7"/><path d="M7 14l-3 3M17 14l3 3"/><circle cx="12" cy="7" r="2"/><path d="M9 17h6"/></>,
  },
  {
    id: 'squat', label: 'Squat', desc: 'Círculo + piernas flexionadas', tags: 'piernas · sentadilla',
    svg: <><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>,
  },
];

// Marca por músculo (fallback final del grid): abreviatura + color del registry.
const FALLBACK_TABLE = MUSCLE_KEYS.map((key) => ({
  key,
  label: MUSCLES[key].label,
  mark: MUSCLES[key].mark,
  color: MUSCLES[key].color,
}));

const SIZE_PRESETS = [20, 28, 48, 64, 96, 120];
const STROKE_PRESETS = [1, 1.5, 2, 2.5, 3, 4, 5];

export default function DocsPage() {
  const [size, setSize] = React.useState(48);
  const [color, setColor] = React.useState('#f5a623');
  const [strokeWidth, setStrokeWidth] = React.useState(0); // 0 = default
  const [meaningful, setMeaningful] = React.useState(false);
  const [animated, setAnimated] = React.useState(false);

  const iconStyle = { color };

  return (
    <div className="min-h-dvh bg-[#0e1116] text-[#f3ede1]">
      {/* ── Header ── */}
      <header className="relative overflow-hidden border-b border-white/[.09]">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(245,166,35,0.07)] to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-5 pt-8 pb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#8b929b] hover:text-[#f5a623] transition-colors mb-5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver a la app
          </Link>
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-[#f5a623]">Iconos</span> fitness{' '}
            <span className="text-xs align-super text-[#5d646d] font-mono">v3.3</span>
          </h1>
          <p className="text-sm text-[#8b929b] mt-1.5 max-w-lg">
            Cuatro iconos SVG de grupo muscular + 8 iconos de patrón (PATTERN_ICON) alineados con la taxonomía del selector.
            {' '}<a href="https://hugeicons.com" target="_blank" rel="noopener noreferrer" className="text-[#f5a623] hover:underline">HugeIcons</a>,
            accesibilidad dual, <code className="text-[#93c0a0] text-xs bg-white/[.06] px-1.5 py-0.5 rounded">forwardRef</code>,
            y draw-on animation opt-in.
          </p>
        </div>
      </header>

      {/* ── Controls ── */}
      <section className="max-w-3xl mx-auto px-5 py-5 border-b border-white/[.09]">
        <div className="flex flex-wrap gap-6">
          {/* Size */}
          <div className="flex-1 min-w-[160px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8b929b] block mb-2">
              size: <b className="text-[#f3ede1] text-sm">{size}px</b>
            </label>
            <input
              type="range" min={16} max={140} value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-white/[.10] accent-[#f5a623] cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#f5a623]
                [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(245,166,35,0.4)]
                [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
            />
            <div className="flex justify-between mt-1">
              {SIZE_PRESETS.map((s) => (
                <button key={s} onClick={() => setSize(s)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    size === s ? 'text-[#f5a623] bg-[rgba(245,166,35,0.12)]' : 'text-[#5d646d] hover:text-[#8b929b]'
                  }`}>{s}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8b929b] block mb-2">
              color
            </label>
            <div className="flex gap-2">
              {COLOR_PRESETS.map((c) => (
                <button key={c.value} onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full ${c.class} transition-all ${
                    color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0e1116] scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                  aria-label={c.label} title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Stroke width */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8b929b] block mb-2">
              strokeWidth{' '}
              <span className="text-[10px] text-[#5d646d] font-normal">
                ({strokeWidth || 'default'})
              </span>
            </label>
            <div className="flex gap-1.5">
              <button onClick={() => setStrokeWidth(0)}
                className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                  strokeWidth === 0 ? 'bg-[#f5a623] text-[#1a1206]' : 'bg-white/[.06] text-[#8b929b] hover:text-[#f3ede1]'
                }`}>auto</button>
              {STROKE_PRESETS.map((s) => (
                <button key={s} onClick={() => setStrokeWidth(s)}
                  className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                    strokeWidth === s ? 'bg-[#f5a623] text-[#1a1206]' : 'bg-white/[.06] text-[#8b929b] hover:text-[#f3ede1]'
                  }`}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-6 mt-4">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8b929b]">title (a11y significativo)</span>
            <button
              onClick={() => setMeaningful(!meaningful)}
              className={`relative w-10 h-5 rounded-full transition-colors ${meaningful ? 'bg-[#f5a623]' : 'bg-white/[.12]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#0e1116] transition-transform ${meaningful ? 'translate-x-5' : ''}`} />
            </button>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8b929b]">animated (draw-on)</span>
            <button
              onClick={() => setAnimated(!animated)}
              className={`relative w-10 h-5 rounded-full transition-colors ${animated ? 'bg-[#f5a623]' : 'bg-white/[.12]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#0e1116] transition-transform ${animated ? 'translate-x-5' : ''}`} />
            </button>
          </label>
        </div>
      </section>

      {/* ── Icon showcase ── */}
      <section className="max-w-3xl mx-auto px-5 py-8">
        <div className="grid grid-cols-2 gap-4">
          {ICONS.map(({ name, label, viewBox, paths, source }) => (
            <div key={name}
              className="group rounded-2xl border border-white/[.07] bg-[#161b23] p-6 flex flex-col items-center gap-4
                hover:border-[#f5a623]/20 transition-all duration-300"
            >
              <div className="flex items-center justify-center w-full min-h-[100px] rounded-xl bg-[#12161d]
                border border-white/[.04] transition-all duration-300 group-hover:bg-[#10141b]">
                <div className="transition-transform duration-300 group-hover:scale-110" style={iconStyle}>
                  <MuscleGroupIcon
                    name={name}
                    size={size}
                    title={meaningful ? label : undefined}
                    strokeWidth={strokeWidth || undefined}
                    animated={animated}
                  />
                </div>
              </div>
              <div className="text-center w-full">
                <h3 className="text-sm font-bold">{label}</h3>
                <code className="text-[11px] text-[#6fb7d6] font-mono block mb-0.5">
                  MuscleGroupIcon name={`"${name}"`}
                </code>
                <div className="flex flex-wrap gap-1 justify-center mb-1">
                  <span className="text-[9px] bg-[#232a38] text-[#8b929b] px-1.5 py-0.5 rounded font-mono">{paths} paths</span>
                  <span className="text-[9px] bg-[#232a38] text-[#8b929b] px-1.5 py-0.5 rounded font-mono">viewBox {viewBox}</span>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  <span className="text-[9px] bg-[rgba(245,166,35,0.1)] text-[#f5a623] px-1.5 py-0.5 rounded font-mono">
                    {meaningful ? 'role="img"' : 'aria-hidden'}
                  </span>
                  {animated && (
                    <span className="text-[9px] bg-[rgba(79,217,160,0.1)] text-[#4fd9a0] px-1.5 py-0.5 rounded font-mono">
                      animated
                    </span>
                  )}
                </div>
                <a
                  href={`https://hugeicons.com/icon/${source}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1.5 text-[9px] text-[#5d646d] hover:text-[#f5a623] transition-colors font-mono"
                >
                  hugeicons.com/icon/{source}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Category Icons (PATTERN_ICON) ── */}
      <section className="max-w-3xl mx-auto px-5 py-8 border-t border-white/[.09]">
        <h2 className="text-sm font-black tracking-tight mb-1">
          Iconos de patrón{' '}
          <span className="text-[10px] align-super text-[#5d646d] font-mono">PATTERN_ICON</span>
        </h2>
        <p className="text-xs text-[#8b929b] mb-5 max-w-lg">
          Iconos de categoría alineados con la taxonomía de{' '}
          <strong className="text-[#f3ede1]">patrones de movimiento</strong> del selector
          (push / pull / squat / hinge / core / cardio / mobility / arms), no con músculos.
          Viven en <code className="text-[10px] text-[#93c0a0] bg-white/[.06] px-1.5 py-0.5 rounded">pattern-visuals.ts</code>{' '}
          y se usan en chips de filtro, badges de patrón y el mapa de balance.
        </p>
        <div className="grid grid-cols-4 gap-3">
          {PATTERN_ORDER.map((p) => {
            const PIcon = PATTERN_ICON[p];
            const color = PATTERN_COLOR[p];
            return (
              <div key={p}
                className="rounded-xl border border-white/[.07] bg-[#161b23] p-4 flex flex-col items-center gap-3
                  hover:border-[#f5a623]/20 transition-all duration-300"
              >
                <div className="flex items-center justify-center w-full min-h-[70px] rounded-lg bg-[#12161d]
                  border border-white/[.04]">
                  <div style={{ color }} className="transition-transform duration-300 hover:scale-110">
                    <PIcon size={size > 36 ? size : 36} />
                  </div>
                </div>
                <div className="text-center">
                  <code className="text-[11px] text-[#6fb7d6] font-mono block">{p}</code>
                  <span className="text-[10px] text-[#8b929b]">{PATTERN_LABEL[p]}</span>
                  <span className="text-[9px] bg-[#232a38] text-[#8b929b] px-1.5 py-0.5 rounded font-mono block mt-1">
                    {color}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 12 Specific SVG Icons ── */}
      <section className="max-w-3xl mx-auto px-5 py-8 border-t border-white/[.09]">
        <h2 className="text-sm font-black tracking-tight mb-1">
          12 SVGs específicos{' '}
          <span className="text-[10px] align-super text-[#5d646d] font-mono">por ejercicio</span>
        </h2>
        <p className="text-xs text-[#8b929b] mb-5 max-w-lg">
          Diseños inline únicos que cubren los patrones de movimiento más comunes.
          Cada SVG se reutiliza en múltiples IDs del catálogo que comparten la misma mecánica.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {SPECIFIC_ICONS.map(({ id, label, desc: _desc, tags, svg }) => (
            <div key={id}
              className="rounded-xl border border-white/[.07] bg-[#161b23] p-3 flex flex-col items-center gap-2
                hover:border-[#f5a623]/20 transition-all duration-200 group"
            >
              <div className="flex items-center justify-center w-full min-h-[56px] rounded-lg bg-[#12161d]
                border border-white/[.04]">
                <div className="text-[#f5a623] transition-transform duration-200 group-hover:scale-110">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    strokeLinecap="round" strokeLinejoin="round" width={28} height={28}>
                    {svg}
                  </svg>
                </div>
              </div>
              <div className="text-center leading-tight">
                <div className="text-[10px] font-semibold">{label}</div>
                <div className="text-[8px] text-[#5d646d] font-mono mt-0.5">{tags}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Resolution + Fallback ── */}
      <section className="max-w-3xl mx-auto px-5 py-8 border-t border-white/[.09]">
        <h2 className="text-sm font-black tracking-tight mb-1">
          Sistema de resolución{' '}
          <span className="text-[10px] align-super text-[#5d646d] font-mono">visual</span>
        </h2>
        <p className="text-xs text-[#8b929b] mb-5 max-w-lg">
          El grid resuelve el visual de cada ejercicio en 3 niveles, sin huecos:
          <strong className="text-[#f3ede1]"> foto</strong> del dataset (free-exercise-db) &rarr;
          icono por músculo v&iacute;a{' '}
          <code className="text-[10px] text-[#93c0a0] bg-white/[.06] px-1 rounded">MUSCLES</code> &rarr;
          <strong className="text-[#f3ede1]">marca</strong> (abreviatura + color del músculo).
        </p>

        {/* Flow diagram */}
        <div className="flex items-center justify-center gap-2 mb-6 text-[10px] font-mono">
          <span className="px-3 py-1.5 rounded-lg bg-[rgba(245,166,35,0.1)] text-[#f5a623] border border-[rgba(245,166,35,0.2)]">
            foto
          </span>
          <span className="text-[#5d646d]">→</span>
          <span className="px-3 py-1.5 rounded-lg bg-[rgba(79,217,160,0.1)] text-[#4fd9a0] border border-[rgba(79,217,160,0.2)]">
            MUSCLES[muscle].fitnessIcon
          </span>
          <span className="text-[#5d646d]">→</span>
          <span className="px-3 py-1.5 rounded-lg bg-[rgba(139,146,155,0.1)] text-[#8b929b] border border-[rgba(139,146,155,0.2)]">
            marca (mark + color)
          </span>
        </div>

        {/* Fallback table */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {FALLBACK_TABLE.map(({ key, label, mark, color }) => (
            <div key={key}
              className="flex items-center gap-2.5 rounded-xl border border-white/[.07] bg-[#161b23] p-3"
            >
              <div
                className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-black"
                style={{ background: `${color}22`, color }}
              >
                {mark}
              </div>
              <div>
                <div className="text-[10px] font-semibold capitalize">{label}</div>
                <div className="text-[8px] text-[#5d646d] font-mono">mark · {color}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Cobertura honesta */}
        <div className="rounded-xl border border-white/[.07] bg-[#161b23] p-4 flex flex-wrap gap-6">
          <div>
            <div className="text-[18px] font-black text-[#f5a623]">1,222</div>
            <div className="text-[9px] text-[#5d646d] font-mono">ejercicios en catálogo</div>
          </div>
          <div>
            <div className="text-[18px] font-black text-[#4fd9a0]">8</div>
            <div className="text-[9px] text-[#5d646d] font-mono">músculos canónicos en MUSCLES</div>
          </div>
          <div>
            <div className="text-[18px] font-black text-[#6fb7d6]">foto→icono→marca</div>
            <div className="text-[9px] text-[#5d646d] font-mono">resolución sin null ni huecos</div>
          </div>
        </div>
      </section>

      {/* ── FitnessIcon (24 iconos pack) ── */}
      <section className="max-w-3xl mx-auto px-5 py-8 border-t border-white/[.09]">
        <h2 className="text-sm font-black tracking-tight mb-1">
          FitnessIcon{' '}
          <span className="text-[10px] align-super text-[#5d646d] font-mono">24 iconos pack</span>
        </h2>
        <p className="text-xs text-[#8b929b] mb-5 max-w-lg">
          Componente genérico que renderiza cualquiera de los 24 SVGs del pack HugeIcons.
          Usa <code className="text-[10px] text-[#93c0a0] bg-white/[.06] px-1.5 py-0.5 rounded">FitnessIcon name=&quot;dumbbell&quot;</code>,
          hereda color v&iacute;a <code className="text-[10px] text-[#93c0a0] bg-white/[.06] px-1.5 py-0.5 rounded">currentColor</code>
          (Tailwind: <code className="text-[10px] text-[#f5a623] bg-white/[.06] px-1.5 py-0.5 rounded">className=&quot;text-amber-500&quot;</code>).
        </p>

        <div className="space-y-4">
          {ICONS_BY_CATEGORY.map((cat) => (
            <div key={cat.id}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#5d646d] mb-2 px-1">
                {cat.id}
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {(cat.icons as FitnessIconName[]).map((name) => {
                  const meta = ICONS_META[name];
                  return (
                    <div key={name}
                      className="rounded-xl border border-white/[.07] bg-[#161b23] p-3 flex flex-col items-center gap-2
                        hover:border-[#f5a623]/20 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-center w-full min-h-[52px] rounded-lg bg-[#12161d]
                        border border-white/[.04]">
                        <div className="text-[#f5a623] transition-transform duration-200 group-hover:scale-110" style={{ color }}>
                          <FitnessIcon name={name} size={size > 28 ? size : 28} />
                        </div>
                      </div>
                      <div className="text-center leading-tight">
                        <div className="text-[10px] font-semibold">{meta?.name}</div>
                        <code className="text-[8px] text-[#5d646d] font-mono">{name}</code>
                        <div className="text-[8px] text-[#5d646d] font-mono mt-0.5">{meta?.paths} paths</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Code ── */}
      <section className="max-w-3xl mx-auto px-5 pb-10">
        <div className="rounded-2xl border border-white/[.07] overflow-hidden">
          <div className="bg-[#0a0d12] p-4 overflow-x-auto">
            <pre className="text-[12px] leading-6 text-[#c4cdc4] font-mono whitespace-pre">
              <code>{`import { MuscleGroupIcon } from '@/components/ui/muscle-icons';
import type { MuscleGroupKey } from '@/components/ui/muscle-icons';

{/* Tamaño: ${size}px · Color: ${color} */}
<div style={{ color: '${color}' }}>
  <MuscleGroupIcon name='full'  size={${size}}${meaningful ? ` title='Todo el cuerpo'` : ''}${animated ? ` animated` : ''} />
  <MuscleGroupIcon name='upper' size={${size}}${meaningful ? ` title='Tren superior'` : ''}${animated ? ` animated` : ''} />
  <MuscleGroupIcon name='lower' size={${size}}${meaningful ? ` title='Tren inferior'` : ''}${animated ? ` animated` : ''} />
  <MuscleGroupIcon name='core'  size={${size}}${meaningful ? ` title='Core y cardio'` : ''}${animated ? ` animated` : ''} />
</div>

{/* También disponible: import directo de cada icono */}
import {
  FullBodyIcon, UpperBodyIcon,
  LowerBodyIcon, CoreCardioIcon,
} from '@/components/ui/muscle-icons';`}</code>
            </pre>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b23] border-t border-white/[.07] text-[10px] text-[#5d646d]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Documentación en <code className="text-[#93c0a0] text-[10px]">docs/componentes-iconos-fitness.md</code></span>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[.09] py-4">
        <p className="text-[10px] text-[#5d646d] text-center">
          CHISPA · muscle-icons v3.3 + PATTERN_ICON · Iconos de <a href="https://hugeicons.com" target="_blank" rel="noopener noreferrer" className="text-[#f5a623] hover:underline">HugeIcons</a> · <code className="text-[10px] text-[#5d646d]">docs/componentes-iconos-fitness.md</code> · Julio 2026
        </p>
      </footer>
    </div>
  );
}
