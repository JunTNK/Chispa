'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { trackEvent } from '@/lib/analytics';
import { Badge } from '@/components/ui/badge';
import {
  Check, Shield, Sparkles, BarChart3, Layout, Music,
  Download, LifeBuoy, Gift,
} from 'lucide-react';

export function PricingScreen() {
  const t = useT();
  const setView = useStore((s) => s.setView);
  const subscription = useStore((s) => s.subscription);

  const features = [
    { icon: BarChart3, name: t('Analíticas avanzadas'), pro: true },
    { icon: Layout, name: t('Temas visuales originales'), pro: true },
    { icon: Music, name: t('Sound packs sensoriales'), pro: true },
    { icon: Download, name: t('Exportar datos (JSON)'), pro: true },
    { icon: LifeBuoy, name: t('Soporte prioritario'), pro: true },
    { icon: Shield, name: t('Sin anuncios, sin dark patterns'), pro: false },
    { icon: Sparkles, name: t('Todos los ejercicios + pose detection'), pro: false },
    { icon: Gift, name: t('Quests y achievements'), pro: false },
  ];

  const handleCheckout = async (priceId: string, tier: string) => {
    trackEvent('pro_purchase_initiated', { tier, priceId });
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/upgrade/success`,
          cancelUrl: `${window.location.origin}/upgrade/cancel`,
        }),
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('[CHISPA] Checkout failed:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black mb-2">{t('Chispa Pro')}</h1>
          <p className="text-sm text-[var(--muted)]">
            {t('Sin anuncios, sin dark patterns. Sostén Chispa para seguir creciendo.')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free tier */}
          <Card className="p-6 border border-white/[.08]">
            <div className="text-center mb-6">
              <Badge variant="ghost" className="text-xs">
                {t('Gratis para siempre')}
              </Badge>
              <h2 className="text-xl font-bold my-2">Gratis</h2>
              <p className="text-2xl font-black">$0</p>
            </div>

            <ul className="space-y-2 mb-6 text-sm">
              {features.filter((f) => !f.pro).map((f) => (
                <li key={f.name} className="flex items-center gap-2 text-green-400">
                  <Check size={16} />
                  {f.name}
                </li>
              ))}
              {features.filter((f) => f.pro).map((f) => (
                <li key={f.name} className="flex items-center gap-2 text-[var(--muted)]">
                  <Check size={16} className="text-[var(--muted)]" strokeWidth={1} />
                  {f.name}
                </li>
              ))}
            </ul>

            <button
              onClick={() => setView('profile')}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-[#1a1a2e] hover:bg-[#1a1a2e]/80 transition-colors"
            >
              {t('Usar Chispa gratis')}
            </button>
          </Card>

          {/* Pro tier */}
          <Card className="p-6 border-2 border-[#34d399] relative overflow-hidden">
            <div className="absolute -top-1 -right-1 bg-[#34d399] text-[#06221b] text-[10px] font-bold px-2 py-0.5 rounded-bl-xl">
              {t('7 días gratis')}
            </div>
<div className="text-center mb-6">
              <Badge variant="accent" className="text-xs">
                {t('Recomendado')}
              </Badge>
              <h2 className="text-xl font-bold my-2">{t('Chispa Pro')}</h2>
              <p className="text-2xl font-black">${process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_DOLLARS || '4.99'}/mes</p>
              {subscription?.tier === 'pro' && subscription.isInTrial && subscription.trialDaysLeft > 0 && (
                <Badge variant="ghost" className="mt-2 text-xs">
                  {t('Trial: {n} días restantes', { n: subscription.trialDaysLeft })}
                </Badge>
              )}
            </div>

            <ul className="space-y-2 mb-6 text-sm">
              {features.map((f) => (
                <li
                  key={f.name}
                  className={`flex items-center gap-2 ${f.pro ? 'text-green-400' : 'text-[var(--muted)]'}`}
                >
                  <Check size={16} className={f.pro ? 'text-green-400' : 'text-[var(--muted)]'} strokeWidth={f.pro ? 2 : 1} />
                  <span className={f.pro ? '' : 'line-through'}>{f.name}</span>
                </li>
              ))}
            </ul>

            {subscription?.tier === 'free' || (subscription?.tier === 'pro' && !subscription.isInTrial) ? (
              <button
                onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro_monthly', 'pro')}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-[#06221b] bg-[#34d399] hover:bg-[#34d399]/90 transition-colors"
              >
                {t('Comenzar trial Pro')}
              </button>
            ) : (
              <button
                onClick={() => {}}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-[#06221b] bg-[#34d399] hover:bg-[#34d399]/90 transition-colors"
              >
                {subscription?.tier === 'pro' && !subscription?.isInTrial
                  ? t('Continuar Pro')
                  : t('Actualizar a Pro')}
              </button>
            )}
          </Card>
        </div>

        {/* Lifetime founder */}
        <Card className="mt-6 p-4 text-center border border-white/[.10]">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gift size={20} className="text-[#fbbf24]" />
            <h3 className="font-bold">{t('Lifetime Founder')}</h3>
          </div>
          <p className="text-xs text-[var(--muted)] mb-3">
            {t('Pago único de $49. Acceso vitalicio a todo Pro + acceso temprano a features.')}
          </p>
          <button
            onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID || 'price_lifetime_founder', 'lifetime')}
            className="px-6 py-2 rounded-xl text-sm font-bold text-[#06221b] bg-[#fbbf24] hover:bg-[#fbbf24]/90 transition-colors"
          >
            {t('$49 — Lifetime')}
          </button>
        </Card>

        <p className="text-[10px] text-[var(--muted)] text-center mt-4">
          {t('Pago seguro vía Stripe. Sin cargos ocultos. Cancela cuando quieras.')}
        </p>
      </div>
    </div>
  );
}
