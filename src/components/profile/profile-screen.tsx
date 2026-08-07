'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useT, useLocale } from '@/lib/i18n/use-t';
import { supabaseSync } from '@/lib/sync/supabase-sync';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { cn, todayKey, calculateBmi, type BmiResult } from '@/lib/utils/helpers';
import { STYLE_LABELS, GOAL_LABELS, NEURO_LABELS, SEX_LABELS, UNITS_LABELS } from '@/lib/utils/constants';
import {
  kgToLbs,
  lbsToKg,
  cmToFtIn,
  ftInToCm,
  fmtMeasure,
  type UnitSystem,
} from '@/lib/utils/units';
import type { Profile } from '@/types';
import { LanguageSwitcher } from '@/components/settings/language-switcher';
import {
  SilverMedalIcon,
  BronzeMedalIcon,
  CrownIcon,
} from '@/components/ui/icons-rpg';
import { WeightHistoryCard } from './weight-history-card';

export function ProfileScreen() {
  const t = useT();
  const locale = useLocale();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const logWeight = useStore((s) => s.logWeight);
  const twin = useStore((s) => s.twin);
  const neuro = useStore((s) => s.neuro);
  const prefs = useStore((s) => s.prefs);
  const setPref = useStore((s) => s.setPref);
  const setLang = useStore((s) => s.setLang);
  const lang = useStore((s) => s.lang);
  const setNeuro = useStore((s) => s.setNeuro);
  const setTwin = useStore((s) => s.setTwin);
   const reset = useStore((s) => s.reset);
   const subscription = useStore((s) => s.subscription);
   const startProTrial = useStore((s) => s.startProTrial);
   const setSubscription = useStore((s) => s.setSubscription);

  const setView = useStore((s) => s.setView);
  const leaderboard = useStore((s) => s.leaderboard);
  const [showConfirm, setShowConfirm] = React.useState(false);

  // ─── Datos corporales (draft local → guardado explícito) ───
  const initialUnits: UnitSystem = profile?.units ?? 'imperial';
  const [draftUnits, setDraftUnits] = React.useState<UnitSystem>(initialUnits);
  const [draftSex, setDraftSex] = React.useState<Profile['sex'] | undefined>(profile?.sex);
  const [wInput, setWInput] = React.useState(() => {
    if (profile?.weight_kg == null) return '';
    return fmtMeasure(initialUnits === 'imperial' ? kgToLbs(profile.weight_kg) : profile.weight_kg);
  });
  const [hFt, setHFt] = React.useState(() => {
    if (profile?.height_cm == null) return '';
    return String(cmToFtIn(profile.height_cm).feet);
  });
  const [hIn, setHIn] = React.useState(() => {
    if (profile?.height_cm == null) return '';
    return String(cmToFtIn(profile.height_cm).inches);
  });
  const [hCm, setHCm] = React.useState(() =>
    profile?.height_cm != null ? fmtMeasure(profile.height_cm) : ''
  );
  const [bodySaved, setBodySaved] = React.useState(false);

  const parseNum = (input: string): number | undefined => {
    const n = parseFloat(input.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const draftWeightKg = (): number | undefined => {
    const n = parseNum(wInput);
    return n == null ? undefined : draftUnits === 'imperial' ? lbsToKg(n) : n;
  };

  const draftHeightCm = (): number | undefined => {
    if (draftUnits === 'imperial') {
      const ft = parseNum(hFt);
      const inch = parseNum(hIn);
      if (ft == null && inch == null) return undefined;
      return ftInToCm(ft ?? 0, inch ?? 0);
    }
    return parseNum(hCm);
  };

  const switchUnits = (u: UnitSystem) => {
    if (u === draftUnits) return;
    const kg = draftWeightKg();
    const cm = draftHeightCm();
    setDraftUnits(u);
    setWInput(kg != null ? fmtMeasure(u === 'imperial' ? kgToLbs(kg) : kg) : '');
    if (cm != null) {
      if (u === 'imperial') {
        const { feet, inches } = cmToFtIn(cm);
        setHFt(String(feet));
        setHIn(String(inches));
        setHCm('');
      } else {
        setHCm(fmtMeasure(cm));
        setHFt('');
        setHIn('');
      }
    }
  };

  const handleSaveBody = () => {
    if (!profile) return;
    const weightKg = draftWeightKg();
    const next: Profile = {
      ...profile,
      sex: draftSex,
      weight_kg: weightKg,
      height_cm: draftHeightCm(),
      units: draftUnits,
      updated_at: new Date().toISOString(),
    };
    setProfile(next);
    // Historial: guardar peso crea/actualiza la entrada de hoy
    if (weightKg != null) {
      logWeight(todayKey(), weightKg);
    }
    supabaseSync
      .push({ profile: next, weightHistory: useStore.getState().weightHistory })
      .catch(() => {});
    setBodySaved(true);
    window.setTimeout(() => setBodySaved(false), 2200);
  };

  // Social graph (local-first MVP)
  const coopMode = useStore((s) => s.coopMode);
  const friends = useStore((s) => s.friends);
  const myInviteCode = useStore((s) => s.myInviteCode);
  const generateInviteCode = useStore((s) => s.generateInviteCode);
  const removeFriend = useStore((s) => s.removeFriend);
  const setCoopMode = useStore((s) => s.setCoopMode);
  const [joinCode, setJoinCode] = React.useState('');

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
          <span className="text-xl font-black">{profile?.name || t('Usuario')}</span>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="accent">{t(NEURO_LABELS[neuro?.type || 'curious'])}</Badge>
            <Badge variant="ghost">{t(GOAL_LABELS[profile?.goal || 'energia'])}</Badge>
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
                {t(rankBadge.label)}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Digital Twin */}
      {twin && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-bold text-sm">{t('Tu Digital Twin')}</h2>
            <Badge variant="ghost">{t('vivo')}</Badge>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between gap-3 py-2.5 border-b border-white/[.07] text-sm">
              <span className="text-[var(--muted)]">{t('Estilo de entrenamiento')}</span>
              <span className="font-semibold text-right">
                {t('Sesiones de ~{n} min', { n: Math.round(twin.patterns.avg_duration) })}
              </span>
            </div>
            <div className="flex justify-between gap-3 py-2.5 border-b border-white/[.07] text-sm">
              <span className="text-[var(--muted)]">{t('Motivación que te funciona')}</span>
              <span className="font-semibold text-right">{t(STYLE_LABELS[twin.motivation_style])}</span>
            </div>
            <div className="flex justify-between gap-3 py-2.5 border-b border-white/[.07] text-sm">
              <span className="text-[var(--muted)]">{t('Mejor franja horaria')}</span>
              <span className="font-semibold text-right">
                {bestHour ? t('Sobre las {n}:00', { n: bestHour[0] }) : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-3 py-2.5 text-sm">
              <span className="text-[var(--muted)]">{t('Tasa de finalización')}</span>
              <span className="font-semibold text-right">{Math.round(twin.patterns.completion_rate * 100)}%</span>
            </div>
          </div>
          <p className="text-xs text-[var(--muted)] italic mt-3">
            {t('Actualizado {date} · aprende en cada sesión', { date: new Date(twin.updated_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) })}
          </p>
        </Card>
      )}

      {/* Session preferences */}
      <Card>
        <h2 className="font-bold text-sm mb-3 block">{t('Preferencias de sesión')}</h2>
        <p className="text-xs text-[var(--muted)] font-semibold mb-2">{t('Duración ideal')}</p>
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
              <span className="font-semibold text-sm">{t('{n} min', { n: d })}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Tu cuerpo — medidas corporales */}
      <Card>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4CC9F0] to-[#00D4AA] flex items-center justify-center text-[#06221b]">
            <Icons.User size={18} />
          </span>
          <div>
            <h2 className="font-bold text-sm flex items-center gap-2">
              {t('Tu cuerpo')}
              <Badge variant="ghost">{t('Solo informativo')}</Badge>
            </h2>
            <p className="text-[10px] text-[var(--muted)] leading-tight">
              {t('Solo para ti: tus medidas no suman puntos ni desbloquean recompensas.')}
            </p>
          </div>
        </div>

        {/* Sistema de medidas */}
        <p className="text-xs text-[var(--muted)] font-semibold mb-2">{t('Sistema de medidas')}</p>
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <button
            onClick={() => switchUnits('imperial')}
            aria-pressed={draftUnits === 'imperial'}
            className={`flex flex-col items-center justify-center min-h-[54px] rounded-2xl border-2 text-center transition-all ${
              draftUnits === 'imperial'
                ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                : 'border-white/[.07] bg-[#151b2a] hover:bg-white/[.06]'
            }`}
          >
            <span className="font-bold text-xs">🇺🇸 {t(UNITS_LABELS.imperial)}</span>
            <span className="text-[10px] text-[var(--muted)]">lb · ft</span>
          </button>
          <button
            onClick={() => switchUnits('metric')}
            aria-pressed={draftUnits === 'metric'}
            className={`flex flex-col items-center justify-center min-h-[54px] rounded-2xl border-2 text-center transition-all ${
              draftUnits === 'metric'
                ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                : 'border-white/[.07] bg-[#151b2a] hover:bg-white/[.06]'
            }`}
          >
            <span className="font-bold text-xs">🌐 {t(UNITS_LABELS.metric)}</span>
            <span className="text-[10px] text-[var(--muted)]">kg · cm</span>
          </button>
        </div>

        {/* Sexo */}
        <p className="text-xs text-[var(--muted)] font-semibold mb-2">{t('Sexo')}</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setDraftSex(draftSex === 'masculino' ? undefined : 'masculino')}
            aria-pressed={draftSex === 'masculino'}
            className={`min-h-[46px] rounded-2xl border-2 text-sm font-semibold transition-all ${
              draftSex === 'masculino'
                ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                : 'border-white/[.07] bg-[#151b2a] text-[var(--muted)] hover:bg-white/[.06]'
            }`}
          >
            {SEX_LABELS[lang].masculine}
          </button>
          <button
            onClick={() => setDraftSex(draftSex === 'femenino' ? undefined : 'femenino')}
            aria-pressed={draftSex === 'femenino'}
            className={`min-h-[46px] rounded-2xl border-2 text-sm font-semibold transition-all ${
              draftSex === 'femenino'
                ? 'border-[#ffb454] bg-[rgba(255,180,84,0.08)]'
                : 'border-white/[.07] bg-[#151b2a] text-[var(--muted)] hover:bg-white/[.06]'
            }`}
          >
            {SEX_LABELS[lang].feminine}
          </button>
        </div>

        {/* Peso y estatura */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div>
            <label htmlFor="body-weight" className="text-xs text-[var(--muted)] font-semibold mb-1.5 block">
              {t('Peso')}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="body-weight"
                inputMode="decimal"
                placeholder={draftUnits === 'imperial' ? '185' : '84'}
                value={wInput}
                onChange={(e) => setWInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                className="flex-1 min-w-0 bg-[#151b2a] border border-white/[.07] rounded-xl px-3 py-2.5 text-base font-semibold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[#ffb454] transition-colors"
              />
              <span className="text-xs font-bold text-[var(--muted)] shrink-0">
                {draftUnits === 'imperial' ? 'lb' : 'kg'}
              </span>
            </div>
          </div>
          <div>
            <label htmlFor="body-height" className="text-xs text-[var(--muted)] font-semibold mb-1.5 block">
              {t('Estatura')}
            </label>
            {draftUnits === 'imperial' ? (
              <div className="flex items-center gap-1.5">
                <input
                  id="body-height-ft"
                  inputMode="numeric"
                  placeholder="5"
                  value={hFt}
                  onChange={(e) => setHFt(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full min-w-0 bg-[#151b2a] border border-white/[.07] rounded-xl px-3 py-2.5 text-base font-semibold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[#ffb454] transition-colors"
                />
                <span className="text-xs font-bold text-[var(--muted)] shrink-0">ft</span>
                <input
                  id="body-height-in"
                  inputMode="numeric"
                  placeholder="10"
                  value={hIn}
                  onChange={(e) => setHIn(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full min-w-0 bg-[#151b2a] border border-white/[.07] rounded-xl px-3 py-2.5 text-base font-semibold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[#ffb454] transition-colors"
                />
                <span className="text-xs font-bold text-[var(--muted)] shrink-0">in</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  id="body-height"
                  inputMode="decimal"
                  placeholder="178"
                  value={hCm}
                  onChange={(e) => setHCm(e.target.value.replace(/[^0-9.,]/g, ''))}
                  className="flex-1 min-w-0 bg-[#151b2a] border border-white/[.07] rounded-xl px-3 py-2.5 text-base font-semibold text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[#ffb454] transition-colors"
                />
                <span className="text-xs font-bold text-[var(--muted)] shrink-0">cm</span>
</div>
            )}
          </div>
        </div>

        {/* IMC — opt-in, solo referencia neutra */}
        {draftWeightKg() != null && draftHeightCm() != null && (
          <details className="mt-4 pt-3 border-t border-white/[.07]">
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[var(--muted)] list-none select-none">
              <span className="w-5 h-5 flex items-center justify-center text-[var(--accent)]">
                <Icons.Chart size={16} />
              </span>
              {t('Ver IMC')}
              <span className="ml-auto text-xs text-[var(--accent)]">{t('Índice de Masa Corporal')}</span>
            </summary>
            <div className="mt-3 p-3 rounded-xl bg-white/[.03] border border-white/[.05] space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[var(--text)]">
                  {calculateBmi(draftWeightKg()!, draftHeightCm()!)}
                </span>
                <span className="text-xs text-[var(--muted)] font-mono">kg/m²</span>
              </div>
              <p className="text-[10px] text-[var(--muted)] leading-relaxed">
                {t('El IMC es una referencia poblacional, no un diagnóstico individual. Consulta a tu profesional de salud.')}
              </p>
            </div>
          </details>
        )}

        <Button variant="primary" className="w-full" onClick={handleSaveBody}>
          {bodySaved ? (
            <>
              <Icons.Check size={18} /> {t('Medidas guardadas')}
            </>
          ) : (
            t('Guardar cambios')
          )}
        </Button>
        <p className="text-[10px] text-[var(--muted)] italic mt-2.5 leading-relaxed">
          {t('Estos datos son tuyos, no definen tu valor.')}
        </p>
      </Card>

      {/* Historial de peso — evolución con fecha */}
      <WeightHistoryCard />

      {/* Language */}
      <Card>
        <LanguageSwitcher />
      </Card>

      {/* Chispa Pro */}
      <Card>
        <h2 className="font-bold text-sm mb-3 flex items-center justify-between">
          <span>{t('Chispa Pro')}</span>
          {subscription && subscription.tier !== 'free' && (
            <span className="text-xs font-mono bg-[#34d399]/10 text-[#34d399] px-2 py-0.5 rounded-full">
              {subscription.tier === 'lifetime' ? 'Lifetime' : `Pro${subscription.isInTrial && subscription.trialDaysLeft > 0 ? ` · ${subscription.trialDaysLeft}d` : ''}`}
            </span>
          )}
        </h2>
        <div className="space-y-3">
          <p className="text-xs text-[var(--muted)]">
            {t(subscription && (subscription.tier === 'pro' || subscription.tier === 'lifetime')
              ? 'Gracias por sostener Chispa. Sin anuncios, sin dark patterns.'
              : 'Analíticas avanzadas, planes custom, temas originales y más. Sin anuncios, sin dark patterns.')}
          </p>

          {subscription && (subscription.tier === 'pro' || subscription.tier === 'lifetime') ? (
            <button
              onClick={() => setSubscription('free')}
              className="text-xs text-[#a78bfa] hover:text-[#a78bfa]/80 underline"
            >
              {t('Gestionar suscripción')}
            </button>
          ) : (
            <>
              <button
                onClick={() => startProTrial()}
                className="w-full text-center text-sm font-medium text-[#06221b] bg-[#34d399] hover:bg-[#34d399]/90 py-2.5 rounded-xl transition-colors"
              >
                {t('Prueba Pro 7 días')}
              </button>
              <button
                onClick={() => setSubscription('lifetime')}
                className="w-full text-center text-xs text-[var(--muted)] hover:text-white py-1.5 transition-colors"
              >
                {t('Lifetime Founder — $49 (100 left)')}
              </button>
            </>
          )}
        </div>
      </Card>

      {/* Accessibility */}
      <Card>
        <h2 className="font-bold text-sm mb-3 block">{t('Accesibilidad')}</h2>
        <div className="space-y-4">
          {/* Reduce Motion — estilo botón con highlight de sexo */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold">{t('Reducir movimiento')}</span>
              <p className="text-xs text-[var(--muted)]">{t('Menos animaciones')}</p>
            </div>
            <button
              role="switch"
              aria-label={t('Reducir movimiento')}
              aria-checked={prefs.reduceMotion}
              onClick={() => setPref('reduceMotion', !prefs.reduceMotion)}
              className={`w-[52px] h-[30px] rounded-full border-none shrink-0 transition-all relative ${
                prefs.reduceMotion
                  ? 'bg-gradient-to-r from-[#ffb454] to-[#ff7a3d]'
                  : 'bg-white/[.13]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-[26px] h-[26px] rounded-full bg-white shadow transition-all ${
                  prefs.reduceMotion ? 'left-[25px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {[
            { key: 'highContrast', label: t('Alto contraste'), desc: t('Bordes y texto más marcados') },
            { key: 'fontLarge', label: t('Texto grande'), desc: t('Para leer sin esfuerzo') },
            { key: 'showFAQs', label: t('Mostrar FAQs'), desc: t('FAQs al final de la landing') },
            { key: 'light', label: t('Tema claro'), desc: t('Intercambia el dark mode por claro') },
            { key: 'systemMode', label: t('Modo Sistema'), desc: t('Quests diarios, rangos y títulos. Sin castigos: el Sistema adapta, no obliga. Apágalo cuando quieras.') },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold">{label}</span>
                <p className="text-xs text-[var(--muted)]">{desc}</p>
              </div>
              <button
                role="switch"
                aria-label={label}
                aria-checked={Boolean((prefs as any)[key])}
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

      {/* Social / Cooperativo (local-first MVP, zero-blame) */}
      <Card>
        <h2 className="font-bold text-sm mb-3 block">{t('Modo cooperativo')}</h2>
        <p className="text-xs text-[var(--muted)] mb-4 leading-relaxed">
          {t('Invita a un compañero con un código de 6 dígitos. Nada se comparte sin tu consentimiento.')}
        </p>

        {/* coopMode selector */}
        <div className="flex gap-2 mb-4">
          {[
            { value: 'none', label: t('Privado') },
            { value: 'friends', label: t('Amigos') },
            { value: 'public', label: t('Público') },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCoopMode(opt.value as 'none' | 'friends' | 'public')}
              className={cn(
                'flex-1 py-2 rounded-xl text-sm font-semibold transition-all border',
                coopMode === opt.value
                  ? 'border-[var(--accent)] bg-[rgba(255,180,84,0.12)] text-[var(--text)]'
                  : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--card2)]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Invite code generator */}
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const code = generateInviteCode();
                navigator.clipboard.writeText(code).catch(() => {});
              }}
            >
              {t('Generar código')}
            </Button>
            {myInviteCode && (
              <code
                className="font-mono text-lg font-bold text-[var(--accent)] bg-[var(--card2)] px-3 py-1.5 rounded-lg border border-[var(--line)]"
                aria-label={t('Código de invitación')}
              >
                {myInviteCode.code}
              </code>
            )}
          </div>
          {myInviteCode && (
            <p className="text-[10px] text-[var(--muted)]">
              {t('Válido 48h. Copiado al portapapeles.')}
            </p>
          )}

          {/* Join via code */}
          {coopMode !== 'none' && (
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                placeholder={t('123456')}
                className="flex-1 bg-[var(--card2)] border border-[var(--line)] rounded-xl px-3 py-2 text-center font-mono text-lg text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  if (joinCode.length !== 6) return;
                  // Best-effort: valida el código en backend (si RPC desplegada);
                  // siempre persiste localmente (zero-blame fallback).
                  await supabaseSync.acceptInvite(joinCode);
                  useStore.getState().addFriend(joinCode);
                  // Best-effort sync a Supabase (no falla si no autenticado)
                  supabaseSync
                    .push({ friends: useStore.getState().friends, coopMode })
                    .catch(() => {});
                  setJoinCode('');
                }}
                disabled={joinCode.length !== 6}
              >
                {t('Unirme')}
              </Button>
            </div>
          )}
        </div>

        {/* Friend list */}
        {friends.length > 0 && (
          <div className="mt-4 space-y-2">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-2 rounded-xl bg-[var(--card2)]">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{f.name || `•${f.id}`}</p>
                  <p className="text-[10px] text-[var(--muted)]">{t('Activo desde')} {new Date(f.joined_at).toLocaleDateString(locale)}</p>
                </div>
                <button
                  onClick={() => removeFriend(f.id)}
                  aria-label={t('Eliminar amigo')}
                  className="text-[var(--muted)] hover:text-[#f87171] text-xs underline"
                >
                  {t('Quitar')}
                </button>
              </div>
            ))}
          </div>
        )}
        {friends.length === 0 && (
          <p className="text-[10px] text-[var(--muted)] mt-3">{t('Sin compañeros todavía.')}</p>
        )}
      </Card>

      {/* Data */}
      <Card>
        <h2 className="font-bold text-sm mb-3 block">{t('Tus datos')}</h2>
        <div className="space-y-2.5">
          <Button variant="ghost" className="w-full justify-start" onClick={handleExport}>
            <Icons.Download size={18} /> {t('Exportar datos (JSON)')}
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => setView('feedback')}>
            <Icons.Send size={18} /> {t('Enviar feedback')}
          </Button>
          <Button variant="danger" className="w-full justify-start" onClick={() => setShowConfirm(true)}>
            <Icons.Refresh size={18} /> {t('Reiniciar app')}
          </Button>
        </div>
        <p className="text-xs text-[var(--muted)] italic mt-3 leading-relaxed">
          {t('Todo vive en tu dispositivo (local-first). En producción: Supabase + cifrado + RLS.')}
        </p>
      </Card>

      <div className="text-center text-xs text-[var(--muted)] leading-relaxed py-4">
        {t('CHISPA v1.0 · MVP')}<br />
        {t('80% algoritmos deterministas · 15% modelos especializados · 5% LLM conversacional')}<br />
        <span className="italic">{t('La LLM comunica. Nunca decide.')}</span>
      </div>

      {/* Reset confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 bg-[rgba(5,8,14,0.72)] backdrop-blur-md z-50 flex items-center justify-center p-6">
          <Card className="w-full max-w-sm text-center">
            <h3 className="text-xl font-black mb-2">{t('¿Reiniciar CHISPA?')}</h3>
            <p className="text-sm text-[var(--muted)] mb-5">
              {t('Se borrarán tu perfil, historial y Digital Twin de este dispositivo.')}
            </p>
            <div className="space-y-2.5">
              <Button variant="danger" size="large" className="w-full" onClick={handleReset}>
                {t('Reiniciar todo')}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setShowConfirm(false)}>
                {t('Cancelar')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
