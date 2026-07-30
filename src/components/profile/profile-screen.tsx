'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { STYLE_LABELS, GOAL_LABELS, NEURO_LABELS } from '@/lib/utils/constants';
import {
  SilverMedalIcon,
  BronzeMedalIcon,
  CrownIcon,
} from '@/components/ui/icons-rpg';

export function ProfileScreen() {
  const profile = useStore((s) => s.profile);
  const twin = useStore((s) => s.twin);
  const neuro = useStore((s) => s.neuro);
  const prefs = useStore((s) => s.prefs);
  const setPref = useStore((s) => s.setPref);
  const setNeuro = useStore((s) => s.setNeuro);
  const setTwin = useStore((s) => s.setTwin);
  const reset = useStore((s) => s.reset);
  const setView = useStore((s) => s.setView);
  const leaderboard = useStore((s) => s.leaderboard);
  const [showConfirm, setShowConfirm] = React.useState(false);

  // Leaderboard rank badge
  const userEntry = leaderboard.find((e) => e.isCurrentUser);
  const rankBadge = React.useMemo(() => {
    if (!userEntry) return null;
    const r = userEntry.rank;
    if (r === 1) return { label: '#1', icon: <CrownIcon size={14} />, tier: 'gold' };
    if (r <= 3) return { label: `#${r}`, icon: r === 2 ? <SilverMedalIcon size={14} /> : <BronzeMedalIcon size={14} />, tier: 'gold' };
    if (r <= 10) return { label: 'Top 10', icon: null, tier: 'purple' };
    if (r <= 50) return { label: 'Top 50', icon: null, tier: 'blue' };
    if (r <= 100) return { label: 'Top 100', icon: null, tier: 'green' };
    return null;
  }, [userEntry]);

  const handleReset = () => {
    reset();
    setView('welcome');
  };

  const handleExport = () => {
    const raw = localStorage.getItem('chispa_store');
    const blob = new Blob([raw || '{}'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chispa-datos.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDurationChange = (d: number) => {
    if (!neuro) return;
    setNeuro({ ...neuro, duration: d });
    if (twin) {
      setTwin({ ...twin, patterns: { ...twin.patterns, avg_duration: d }, updated_at: new Date().toISOString() });
    }
  };

  const bestHour = twin ? Object.entries(twin.patterns.best_hours).sort((a, b) => b[1] - a[1])[0] : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-6 space-y-3.5">
      {/* Profile header */}
      <Card className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ffb454] to-[#ff7a3d] text-[#241309] flex items-center justify-center text-2xl font-black shrink-0">
          {profile?.name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <span className="text-xl font-black">{profile?.name || 'Usuario'}</span>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="accent">{NEURO_LABELS[neuro?.type || 'curious']}</Badge>
            <Badge variant="ghost">{GOAL_LABELS[profile?.goal || 'energia']}</Badge>
            {rankBadge && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  rankBadge.tier === 'gold'
                    ? 'bg-[rgba(251,191,36,0.12)] text-[#fbbf24] border-[rgba(251,191,36,0.3)]'
                    : rankBadge.tier === 'purple'
                    ? 'bg-[rgba(167,139,250,0.12)] text-[#a78bfa] border-[rgba(167,139,250,0.3)]'
                    : rankBadge.tier === 'blue'
                    ? 'bg-[rgba(76,201,240,0.12)] text-[#4CC9F0] border-[rgba(76,201,240,0.3)]'
                    : 'bg-[rgba(52,211,153,0.12)] text-[#34d399] border-[rgba(52,211,153,0.3)]'
                }`}
              >
                {rankBadge.icon}{' '}
                {rankBadge.label}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Digital Twin */}
      {twin && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-bold text-sm">Tu Digital Twin</h2>
            <Badge variant="ghost">vivo</Badge>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between gap-3 py-2.5 border-b border-white/[.07] text-sm">
              <span className="text-[#94a0b8]">Estilo de entrenamiento</span>
              <span className="font-semibold text-right">
                Sesiones de ~{Math.round(twin.patterns.avg_duration)} min
              </span>
            </div>
            <div className="flex justify-between gap-3 py-2.5 border-b border-white/[.07] text-sm">
              <span className="text-[#94a0b8]">Motivación que te funciona</span>
              <span className="font-semibold text-right">{STYLE_LABELS[twin.motivation_style]}</span>
            </div>
            <div className="flex justify-between gap-3 py-2.5 border-b border-white/[.07] text-sm">
              <span className="text-[#94a0b8]">Mejor franja horaria</span>
              <span className="font-semibold text-right">
                {bestHour ? `Sobre las ${bestHour[0]}:00` : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-3 py-2.5 text-sm">
              <span className="text-[#94a0b8]">Tasa de finalización</span>
              <span className="font-semibold text-right">{Math.round(twin.patterns.completion_rate * 100)}%</span>
            </div>
          </div>
          <p className="text-xs text-[#94a0b8] italic mt-3">
            Actualizado {new Date(twin.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · aprende en cada sesión
          </p>
        </Card>
      )}

      {/* Session preferences */}
      <Card>
        <h2 className="font-bold text-sm mb-3 block">Preferencias de sesión</h2>
        <p className="text-xs text-[#94a0b8] font-semibold mb-2">Duración ideal</p>
        <div className="grid grid-cols-3 gap-2.5">
          {[10, 20, 30].map((d) => (
            <button
              key={d}
              onClick={() => handleDurationChange(d)}
              className={`flex flex-col items-center justify-center min-h-[56px] rounded-2xl border-2 py-3 text-center transition-all ${
                (neuro?.duration || 20) === d
                  ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                  : 'border-white/[.07] bg-[#151b2a]'
              }`}
            >
              <span className="font-semibold text-sm">{d} min</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Accessibility */}
      <Card>
        <h2 className="font-bold text-sm mb-3 block">Accesibilidad</h2>
        <div className="space-y-4">
          {[
            { key: 'reduceMotion', label: 'Reducir movimiento', desc: 'Menos animaciones' },
            { key: 'highContrast', label: 'Alto contraste', desc: 'Bordes y texto más marcados' },
            { key: 'fontLarge', label: 'Texto grande', desc: 'Para leer sin esfuerzo' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold">{label}</span>
                <p className="text-xs text-[#94a0b8]">{desc}</p>
              </div>
              <button
                role="switch"
                aria-label={label}
                aria-checked={(prefs as any)[key]}
                onClick={() => setPref(key, !(prefs as any)[key])}
                className={`w-[52px] h-[30px] rounded-full border-none shrink-0 transition-all relative ${
                  (prefs as any)[key]
                    ? 'bg-gradient-to-r from-[#ffb454] to-[#ff7a3d]'
                    : 'bg-white/[.13]'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-[26px] h-[26px] rounded-full bg-white shadow transition-all ${
                    (prefs as any)[key] ? 'left-[25px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Data */}
      <Card>
        <h2 className="font-bold text-sm mb-3 block">Tus datos</h2>
        <div className="space-y-2.5">
          <Button variant="ghost" className="w-full justify-start" onClick={handleExport}>
            <Icons.Download size={18} /> Exportar datos (JSON)
          </Button>
          <Button variant="danger" className="w-full justify-start" onClick={() => setShowConfirm(true)}>
            <Icons.Refresh size={18} /> Reiniciar app
          </Button>
        </div>
        <p className="text-xs text-[#94a0b8] italic mt-3 leading-relaxed">
          Todo vive en tu dispositivo (local-first). En producción: Supabase + cifrado + RLS.
        </p>
      </Card>

      <div className="text-center text-xs text-[#94a0b8] leading-relaxed py-4">
        CHISPA v1.0 · MVP<br />
        80% algoritmos deterministas · 15% modelos especializados · 5% LLM conversacional<br />
        <span className="italic">La LLM comunica. Nunca decide.</span>
      </div>

      {/* Reset confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 bg-[rgba(5,8,14,0.72)] backdrop-blur-md z-50 flex items-center justify-center p-6">
          <Card className="w-full max-w-sm text-center">
            <h3 className="text-xl font-black mb-2">¿Reiniciar CHISPA?</h3>
            <p className="text-sm text-[#94a0b8] mb-5">
              Se borrarán tu perfil, historial y Digital Twin de este dispositivo.
            </p>
            <div className="space-y-2.5">
              <Button variant="danger" size="large" className="w-full" onClick={handleReset}>
                Reiniciar todo
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setShowConfirm(false)}>
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
