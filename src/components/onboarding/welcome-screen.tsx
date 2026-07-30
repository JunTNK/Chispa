'use client';

import React from 'react';
import { useStore } from '@/lib/store';

/* ───────────── Ambient Sparks ───────────── */
function SparksBg() {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const N = window.innerWidth < 600 ? 14 : 22;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < N; i++) {
      const s = document.createElement('span');
      s.className = 'ambient-spark';
      const size = (Math.random() * 2.6 + 1.4).toFixed(1);
      s.style.cssText = `
        position: absolute;
        bottom: -12px;
        border-radius: 50%;
        background: #f7b65f;
        width: ${size}px;
        height: ${size}px;
        box-shadow: 0 0 8px 1px rgba(247,182,95,0.7);
        opacity: 0;
        animation: floatUp ${(Math.random() * 8 + 7).toFixed(1)}s linear ${(-Math.random() * 12).toFixed(1)}s infinite;
        left: ${(Math.random() * 100).toFixed(2)}%;
        --drift: ${(Math.random() * 80 - 40).toFixed(0)}px;
      `;
      frag.appendChild(s);
    }
    el.appendChild(frag);
  }, []);

  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient-glow-top" />
      <div className="ambient-glow-bottom" />
      <div className="ambient-grain" />
      <div ref={ref} className="pointer-events-none fixed inset-0 overflow-hidden" />
    </div>
  );
}

/* ───────────── Logo Mark ───────────── */
function LogoMark() {
  return (
    <div className="relative w-[96px] h-[96px] mb-[26px]">
      {/* Orbital rings */}
      <div className="absolute inset-[-26px]" aria-hidden="true">
        <svg viewBox="0 0 148 148" fill="none" className="w-full h-full overflow-visible">
          <circle
            cx="74" cy="74" r="62"
            stroke="rgba(247,182,95,0.28)" strokeWidth="1"
            strokeDasharray="2 8"
            style={{ transformOrigin: '50% 50%', animation: 'spinCW 38s linear infinite' }}
          />
          <circle
            cx="74" cy="74" r="50"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1"
            strokeDasharray="1 7"
            style={{ transformOrigin: '50% 50%', animation: 'spinCCW 26s linear infinite' }}
          />
        </svg>
      </div>
      {/* Tile */}
      <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-[#1b1b20] to-[#0c0c0f] border border-white/[.07] grid place-items-center shadow-[0_18px_50px_-18px_rgba(239,122,60,0.55)]">
        <div
          className="absolute inset-0 rounded-[24px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 40%, rgba(255,138,76,0.35), transparent 60%)',
            animation: 'breathe 4.5s ease-in-out infinite',
          }}
        />
        {/* Sparkle icon */}
        <svg
          viewBox="0 0 24 24"
          className="relative w-[46px] h-[46px]"
          style={{ filter: 'drop-shadow(0 0 10px rgba(255,138,76,0.65))' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe2ad" />
              <stop offset="1" stopColor="#ef7a3c" />
            </linearGradient>
          </defs>
          <path
            fill="url(#sparkGrad)"
            d="M12 1.5c.9 5.6 3.4 8.1 9 9-5.6.9-8.1 3.4-9 9-.9-5.6-3.4-8.1-9-9 5.6-.9 8.1-3.4 9-9Z"
          />
        </svg>
      </div>
    </div>
  );
}

/* ───────────── Triad Pill ───────────── */
function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-[7px] px-[13px] py-[7px] rounded-full bg-white/[.025] border border-white/[.08] text-[.8rem] font-medium text-[#9c958b] transition-all duration-250 hover:text-[#f4efe8] hover:border-[rgba(247,182,95,0.4)] hover:bg-[rgba(247,182,95,0.06)] hover:-translate-y-[2px] cursor-default select-none">
      <span className="w-[14px] h-[14px] text-[#f7b65f] flex-none">{icon}</span>
      {label}
    </span>
  );
}

/* ───────────── Triad Icons ───────────── */
const MinusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-full h-full">
    <path d="M5 12h14" />
  </svg>
);

const PulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M3 12h4l2 6 4-14 2 8h6" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/* ───────────── Main Component ───────────── */
export function WelcomeScreen() {
  const setView = useStore((s) => s.setView);
  const logEvent = useStore((s) => s.logEvent);

  const [ctaBusy, setCtaBusy] = React.useState(false);

  const handleCta = () => {
    setCtaBusy(true);
    logEvent('onboarding_start', {});
    setTimeout(() => {
      setCtaBusy(false);
      setView('onboarding');
    }, 800);
  };

  return (
    <>
      <SparksBg />
      <main className="relative z-[1] w-full max-w-[440px] flex flex-col items-center text-center px-5 py-[clamp(20px,5vw,48px)] mx-auto min-h-dvh">
        {/* Logo Mark */}
        <div className="animate-in" style={{ animationDelay: '0ms' }}>
          <LogoMark />
        </div>

        {/* Wordmark */}
        <h1
          className="animate-in font-['Bricolage_Grotesque',system-ui,sans-serif] font-extrabold tracking-[-.02em] leading-[.95] text-[clamp(2.7rem,11vw,3.7rem)] bg-gradient-to-b from-[#ffd79a] via-[#f7b65f] to-[#ef7a3c] bg-clip-text text-transparent mb-[14px]"
          style={{ animationDelay: '90ms' }}
        >
          CHISPA
        </h1>

        {/* Tagline */}
        <p
          className="animate-in font-['Hanken_Grotesk',system-ui,sans-serif] font-semibold text-[clamp(1.12rem,4.6vw,1.42rem)] tracking-[-.01em] text-[#f4efe8] mb-[14px]"
          style={{ animationDelay: '160ms' }}
        >
          La IA que se adapta a{' '}
          <em className="font-['Fraunces',Georgia,serif] italic font-medium text-[#f7b65f] not-italic">
            tu cerebro.
          </em>
        </p>

        {/* Lede */}
        <p
          className="animate-in text-[.98rem] leading-[1.6] text-[#9c958b] max-w-[34ch] mb-[24px]"
          style={{ animationDelay: '230ms' }}
        >
          Entrenamiento adaptativo para TDAH y neurodivergencias.
        </p>

        {/* Triad */}
        <div
          className="animate-in flex flex-wrap gap-[8px] justify-center mb-[34px]"
          style={{ animationDelay: '300ms' }}
        >
          <Pill icon={<MinusIcon />} label="Menos decisiones" />
          <Pill icon={<PulseIcon />} label="Más movimiento" />
          <Pill icon={<CheckIcon />} label="Cero culpa" />
        </div>

        {/* Actions */}
        <div
          className="animate-in w-full flex flex-col gap-[12px]"
          style={{ animationDelay: '370ms' }}
        >
          <button
            id="cta-btn"
            aria-busy={ctaBusy}
            onClick={handleCta}
            className="group relative overflow-hidden w-full border-none cursor-pointer font-['Hanken_Grotesk',system-ui,sans-serif] font-semibold text-[1.02rem] py-[17px] px-[20px] rounded-[16px] text-[#2a1405] bg-gradient-to-r from-[#f9c074] to-[#ef7a3c] shadow-[0_14px_34px_-14px_rgba(239,122,60,0.75)] transition-all duration-180 active:scale-[.985] aria-busy:pointer-events-none aria-busy:opacity-85 hover:-translate-y-[2px] hover:shadow-[0_22px_46px_-14px_rgba(239,122,60,0.9)]"
          >
            <span className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 left-[-120%] group-hover:left-[130%] transition-all duration-[0.6s]" style={{
              background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.4), transparent)',
              transform: 'skewX(-18deg)',
              width: '60%',
            }} />
            Crear mi perfil
          </button>


        </div>

        {/* Divider + Login */}
        <div
          className="animate-in w-full mt-[26px] mb-[22px]"
          style={{ animationDelay: '440ms' }}
        >
          <div className="flex items-center gap-[14px]">
            <span className="flex-1 h-[1px]" style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            }} />
            <span className="text-[.78rem] text-[#7c766d] tracking-[.04em]">o</span>
            <span className="flex-1 h-[1px]" style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            }} />
          </div>

          <button
            onClick={() => setView('login')}
            className="group inline-flex items-center gap-[9px] bg-none border-none cursor-pointer text-[#f4efe8] font-['Hanken_Grotesk',system-ui,sans-serif] font-medium text-[1rem] mt-[22px] transition-colors duration-250 hover:text-[#f7b65f]"
          >
            Iniciar sesión
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[18px] h-[18px] transition-transform duration-250 group-hover:translate-x-[5px]">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        {/* Footer */}
        <footer
          className="animate-in mt-[46px] w-full flex flex-col items-center gap-[16px]"
          style={{ animationDelay: '580ms' }}
        >
          <div className="flex gap-[18px] justify-center flex-wrap">
            <Stat value="80%" label="algoritmos" />
            <Stat value="15%" label="modelos" />
            <Stat value="5%" label="LLM" />
          </div>
          <span className="inline-flex items-center gap-[8px] text-[.78rem] text-[#9c958b] px-[13px] py-[7px] rounded-full bg-white/[.025] border border-white/[.05]">
            <span className="w-[7px] h-[7px] rounded-full bg-[#7bd88f]" style={{ animation: 'pulseDotGreen 2.4s ease-out infinite' }} aria-hidden="true" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px] text-[#9c958b]">
              <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
            </svg>
            Tus datos viven en tu dispositivo
          </span>
        </footer>
      </main>
    </>
  );
}

/* ───────────── Stat ───────────── */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-[2px] leading-[1]">
      <b className="font-['Bricolage_Grotesque',system-ui,sans-serif] font-bold text-[1.02rem] text-[#f7b65f]">{value}</b>
      <small className="text-[.68rem] tracking-[.06em] uppercase text-[#7c766d]">{label}</small>
    </div>
  );
}
