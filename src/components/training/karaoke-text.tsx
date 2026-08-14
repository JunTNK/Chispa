'use client';

/**
 * KaraokeText — modo karaoke del TTS (spec §4).
 *
 * Resalta la palabra que la voz está leyendo en ese momento. Usa los eventos
 * `onboundary` del navegador cuando existen y cae a un fallback de ritmo
 * (reparto uniforme de palabras) si el navegador no los emite.
 *
 * - UNA sola instancia de TTS por pantalla: este componente es el único que
 *   habla mientras `active` es true. Al desactivarse, corta su utterance.
 * - Sin autoplay: el padre controla `active`.
 * - El control de detener está integrado (target ≥ 44px, aria-label).
 */
import React from 'react';
import { useT } from '@/lib/i18n/use-t';
import { speakWithEvents, voiceSupported } from '@/lib/utils/speech';
import { Square } from 'lucide-react';

interface KaraokeTextProps {
  text: string;
  lang: 'es' | 'en';
  rate?: number;
  /** Si true comienza a leer y resaltar palabra por palabra. */
  active: boolean;
  onDone?: () => void;
  className?: string;
}

export function KaraokeText({
  text,
  lang,
  rate = 1,
  active,
  onDone,
  className = '',
}: KaraokeTextProps) {
  const t = useT();
  const [wordIdx, setWordIdx] = React.useState(-1);
  const [speaking, setSpeaking] = React.useState(false);
  const stopRef = React.useRef<(() => void) | null>(null);

  const words = React.useMemo(() => text.trim().split(/\s+/).filter(Boolean), [text]);

  React.useEffect(() => {
    if (!active) {
      stopRef.current?.();
      stopRef.current = null;
      setWordIdx(-1);
      setSpeaking(false);
      return;
    }
    if (!voiceSupported() || words.length === 0) return;
    setSpeaking(true);
    setWordIdx(0);
    stopRef.current = speakWithEvents(
      text,
      lang,
      rate,
      (i) => setWordIdx(i),
      () => {
        stopRef.current = null;
        setSpeaking(false);
        setWordIdx(-1);
        onDone?.();
      }
    );
    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, text, lang, rate]);

  if (!voiceSupported()) return null;
  // Idle: sin karaoke en curso → no ocupa espacio.
  if (!active && !speaking) return null;

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setSpeaking(false);
    setWordIdx(-1);
    onDone?.();
  };

  return (
    <div className={`rounded-xl border border-[rgba(255,180,84,0.22)] bg-[rgba(255,180,84,0.06)] p-3 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-[#ffb454]">
          {t('Modo karaoke')}
        </span>
        <button
          onClick={stop}
          aria-label={t('Detener audio')}
          className="w-9 h-9 rounded-lg border border-[rgba(255,180,84,0.35)] bg-[rgba(255,180,84,0.10)] text-[#ffb454] flex items-center justify-center hover:bg-[rgba(255,180,84,0.18)] active:scale-95 transition-all"
        >
          <Square size={13} />
        </button>
      </div>
      <p className="text-[15px] leading-relaxed" aria-live="off">
        {words.map((w, i) => (
          <span
            key={`${i}-${w}`}
            aria-hidden={i !== wordIdx}
            className={
              i === wordIdx
                ? 'bg-[rgba(255,180,84,0.28)] text-[var(--text)] rounded-[3px] px-[2px] transition-colors'
                : 'text-[var(--muted)]'
            }
          >
            {w}{' '}
          </span>
        ))}
      </p>
      {!speaking && (
        <p className="text-[11px] text-[var(--muted)] mt-2">{t('Lectura terminada')}</p>
      )}
    </div>
  );
}
