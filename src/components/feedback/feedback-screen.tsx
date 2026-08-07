'use client';

import React from 'react';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';

const FEEDBACK_EMAIL = 'feedback@chispa.app';

export function FeedbackScreen() {
  const t = useT();
  const [text, setText] = React.useState('');
  const [sent, setSent] = React.useState(false);

  const buildMailto = () => {
    const subject = encodeURIComponent('[CHISPA] Feedback de usuario');
    const body = text.trim()
      ? encodeURIComponent(`Feedback:\n\n${text}`)
      : encodeURIComponent('Feedback rápido: me gustaría contarles más.');
    return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
  };

  const handleSend = () => {
    window.location.href = buildMailto();
    setSent(true);
  };

  return (
    <div className="px-4 md:px-6 lg:px-8 pb-6 w-full max-w-[760px] mx-auto">
      <Card className="mb-4">
        <h2 className="text-xl font-black text-center mb-2">{t('Tu feedback construye la hoja de ruta')}</h2>
        <p className="text-sm text-[var(--muted)] text-center mb-4">
          {t('Envíanos qué piensas, qué falla o qué te gustaría ver. No usamos analítica — este mensaje se abre en tu correo para que nos lo envíes.')}
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={t('¿Qué deberíamos mejorar?')}
          className="w-full bg-[#0e121c] border border-white/[.09] rounded-xl p-3 text-sm text-[var(--text)] placeholder-[#7a8499] focus:outline-none focus:border-[#ffb454] resize-y"
        />
        {sent ? (
          <p className="text-sm text-[#00D4AA] text-center mt-3">{t('¡Gracias! Tu cliente de correo se abrió.')}</p>
        ) : (
          <Button variant="primary" className="w-full mt-3" onClick={handleSend}>
            <Icons.Send size={16} /> {t('Enviar por email')}
          </Button>
        )}
      </Card>
      <p className="text-xs text-[var(--muted)] text-center">{t('No se recopila nada hasta que tú elijas enviar.')}</p>
    </div>
  );
}
