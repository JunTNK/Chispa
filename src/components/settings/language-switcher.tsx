'use client';

import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';
import { supabaseSync } from '@/lib/sync/supabase-sync';
import { logError } from '@/lib/utils/logger';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const t = useT();
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-[var(--muted)]">{t('Idioma')}</label>
      <div
        role="group"
        aria-label={t('Idioma')}
        className="flex items-center gap-1 rounded-full border border-white/[.10] p-1 w-fit"
      >
        <Languages size={14} className="ml-2 text-[var(--muted)]" />
        {(['es', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => {
              setLang(l);
              // El idioma vive en el Digital Twin: se pushea para seguir al
              // usuario entre dispositivos (push mínimo si no hay twin local).
              supabaseSync.push({ lang: l }).catch(logError('lang:push'));
            }}
            aria-pressed={lang === l}
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase transition-colors ${
              lang === l
                ? 'bg-[#ffb454] text-[#2a1405]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
