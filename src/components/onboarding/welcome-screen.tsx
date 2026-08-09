'use client';

import React from 'react';
import { useStore } from '@/lib/store';
import { useT } from '@/lib/i18n/use-t';

/* ───────────── Ambient Sparks ───────────── */
function SparksBg() {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const reduce = useStore.getState().prefs.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    <span className="inline-flex items-center gap-[7px] px-[13px] py-[7px] rounded-full bg-white/[.025] border border-white/[.08] text-[.8rem] font-medium text-[var(--muted)] transition-all duration-250 hover:text-[var(--muted)] hover:border-[rgba(247,182,95,0.4)] hover:bg-[rgba(247,182,95,0.06)] hover:-translate-y-[2px] cursor-default select-none">
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

/* Preguntas frecuentes TDAH — copy sin culpa, transparencia ND */
const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: '¿Por qué solo una opción?', a: 'Porque más opciones = más decisión. CHISPA elige por ti y reduce la carga mental.' },
  { q: '¿Por qué no hay rachas?', a: 'Las rachas crean culpa. Registramos progreso real (30 días rodando), sin presión.' },
  { q: '¿Salen mis datos del dispositivo?', a: 'No. El 80% de algoritmos es local; el LLM corre on-device. Tus datos nunca salen sin tu OK.' },
  { q: '¿Es IA real o marketing?', a: '80% algoritmos · 15% agentes · 5% LLM on-device (Qwen2.5). La IA decide patrones; tú decides moverte.' },
  { q: '¿Es seguro para TDAH?', a: 'Diseñado para TDAH: menos decisiones, sin rachas, tono sin culpa, reduce-motion.' },
  { q: '¿Cuánta cuesta?', a: 'Hoy es gratis. Si algún día nace un plan Pro, los primeros usuarios se quedan con beneficios permanentes.' },
];

function FaqItem({ q, a, openDefault }: { q: string; a: string; openDefault: boolean }) {
  const t = useT();
  const [open, setOpen] = React.useState(openDefault);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="faq-details bg-[var(--card)] rounded-[18px] border border-[var(--line)] p-[16px]"
    >
      <summary className="cursor-pointer text-left font-semibold text-[var(--muted)] list-none mb-[10px] flex items-center gap-[10px]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] shrink-0 text-[#f7b65f]"><path d="M6 9l6 6 6-6" /></svg>
        {t(q)}
      </summary>
      <p className="text-[.88rem] leading-[1.6] text-[var(--muted)]">{t(a)}</p>
    </details>
  );
}

/* ───────────── Main Component ───────────── */
export function WelcomeScreen() {
  const t = useT();
  const setView = useStore((s) => s.setView);
  const logEvent = useStore((s) => s.logEvent);
  const showFAQs = useStore((s) => s.prefs.showFAQs ?? true);

  const [ctaBusy, setCtaBusy] = React.useState(false);
  const mountRef = React.useRef<number>(Date.now());

  // 5s-funnel: CTA above-the-fold + FAQs open-by-default visible at first paint
  React.useEffect(() => {
    logEvent('onboarding_view', { faqOpenByDefault: true, footbarVisible: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCta = () => {
    setCtaBusy(true);
    logEvent('onboarding_start', {});
    logEvent('cta_click', { ms: Date.now() - mountRef.current });
    setTimeout(() => {
      setCtaBusy(false);
      setView('onboarding');
    }, 800);
  };

  return (
    <>
      <SparksBg />
      <main className="relative z-[1] w-full max-w-[440px] flex flex-col items-center text-center px-5 py-[clamp(20px,5vw,48px)] mx-auto min-h-dvh pb-[110px]">
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
          className="animate-in font-['Hanken_Grotesk',system-ui,sans-serif] font-semibold text-[clamp(1.12rem,4.6vw,1.42rem)] tracking-[-.01em] text-[var(--muted)] mb-[14px]"
          style={{ animationDelay: '160ms' }}
        >
          {t('La IA que se adapta a')}{' '}
          <em className="font-['Fraunces',Georgia,serif] italic font-medium text-[#f7b65f] not-italic">
            {t('tu cerebro.')}
          </em>
        </p>

        {/* Lede */}
        <p
          className="animate-in text-[.98rem] leading-[1.6] text-[var(--muted)] max-w-[34ch] mb-[24px]"
          style={{ animationDelay: '230ms' }}
        >
          {t('Entrenamiento adaptativo para TDAH y neurodivergencias.')}
        </p>

        {/* Triad */}
        <div
          className="animate-in flex flex-wrap gap-[8px] justify-center mb-[34px]"
          style={{ animationDelay: '300ms' }}
        >
          <Pill icon={<MinusIcon />} label={t('Menos decisiones')} />
          <Pill icon={<PulseIcon />} label={t('Más movimiento')} />
          <Pill icon={<CheckIcon />} label={t('Cero culpa')} />
        </div>

        {/* Hero CTA — visible above the fold (ND: una sola acción, inmediata, cero scroll forzado) */}
        <div className="animate-in w-full mb-[26px]" style={{ animationDelay: '320ms' }}>
          <button
            id="cta-btn"
            aria-busy={ctaBusy}
            onClick={handleCta}
            className="group relative overflow-hidden w-full border-none cursor-pointer font-['Hanken_Grotesk',system-ui,sans-serif] font-semibold text-[1.02rem] py-[17px] px-[20px] rounded-[16px] text-[#2a1405] bg-gradient-to-r from-[#f9c074] to-[#ef7a3c] shadow-[0_14px_34px_-14px_rgba(239,122,60,0.75)] active:scale-[.985] aria-busy:pointer-events-none aria-busy:opacity-85 hover:shadow-[0_22px_46px_-14px_rgba(239,122,60,0.9)]"
          >
            <span className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 left-[-120%] group-hover:left-[130%] transition-all duration-[0.6s]" style={{
              background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.4), transparent)',
              transform: 'skewX(-18deg)',
              width: '60%',
            }} />
            {t('Crear mi perfil')}
          </button>
        </div>

        {/* Validated pain points — guilt-free, ND-aware copy */}
          <div className="animate-in w-full mb-[28px]" style={{ animationDelay: '330ms' }}>
            <p className="text-[.74rem] font-semibold uppercase tracking-[.07em] text-[var(--muted)] mb-[16px]">{t('Estos retos los conoces')}</p>
            <div className="flex flex-col gap-[12px]">
              <div className="flex gap-[14px] items-start">
                <span aria-hidden className="mt-[3px] w-[6px] h-[6px] shrink-0 rounded-full bg-[#f7b65f]" />
                <p className="text-[.9rem] leading-[1.6] text-[#e5e0d8]">
                  <span className="font-semibold text-[var(--muted)]">{t('Parálisis por decisión')}</span>
                  {' '}· {t('Demasiadas opciones te paralizan. CHISPA reduce la elección a una.')}
                </p>
              </div>
              <div className="flex gap-[14px] items-start">
                <span aria-hidden className="mt-[3px] w-[6px] h-[6px] shrink-0 rounded-full bg-[#f7b65f]" />
                <p className="text-[.9rem] leading-[1.6] text-[#e5e0d8]">
                  <span className="font-semibold text-[var(--muted)]">{t('Culpa por las pausas')}</span>
                  {' '}· {t('Detenerte no es fallar. Recargar es parte del progreso.')}
                </p>
              </div>
              <div className="flex gap-[14px] items-start">
                <span aria-hidden className="mt-[3px] w-[6px] h-[6px] shrink-0 rounded-full bg-[#f7b65f]" />
                <p className="text-[.9rem] leading-[1.6] text-[#e5e0d8]">
                  <span className="font-semibold text-[var(--muted)]">{t('Rutinas rotas')}</span>
                  {' '}· {t('No se trata de rachas perfectas. De volver, sin juicio.')}
                </p>
              </div>
            </div>
          </div>

          {/* ND philosophy — transparent, no perfection pressure */}
          <div className="animate-in w-full mb-[28px]" style={{ animationDelay: '350ms' }}>
            <p className="text-[.85rem] leading-[1.6] text-[var(--muted)]">
              <span className="font-semibold text-[var(--muted)]">{t('Así funciona CHISPA')}</span>
              {': '}
              {t('80% algoritmos · 15% agentes · 5% LLM que comunica, nunca decide. Hacer algo hoy vence a hacerlo perfecto.')}
            </p>
          </div>

          {/* Our story + public roadmap (honesty, zero fake testimonials) */}
          <div className="animate-in w-full mb-[30px]" style={{ animationDelay: '355ms' }}>
            <p className="text-[.74rem] font-semibold uppercase tracking-[.07em] text-[var(--muted)] mb-[14px]">{t('Nuestra historia')}</p>
            <p className="text-[.88rem] leading-[1.65] text-[var(--muted)] max-w-[38ch] mx-auto mb-[20px]">
              {t('CHISPA nació del fracaso de apps que no entienden el cerebro TDAH. Se está construyendo activamente, sin rachas ni perfección: solo movimiento real, paso a paso.')}
            </p>
            <p className="text-[.74rem] font-semibold uppercase tracking-[.07em] text-[var(--muted)] mb-[12px]">{t('Hoja de ruta pública')}</p>
            <ul className="flex flex-col gap-[10px] text-left">
              <li className="flex gap-[10px] items-start">
                <span aria-hidden className="mt-[3px] w-[5px] h-[5px] shrink-0 rounded-full bg-[#f7b65f]" />
                <span className="text-[.85rem] text-[var(--muted)]">
                  {t('Estado: en desarrollo activo. Tu feedback construye la hoja de ruta.')}
                  {' '}
                  <a href="mailto:hola@chispa.app?subject=Feedback%20CHISPA" className="underline text-[#ffb454] hover:text-[#ffd79a]">{t('Escríbenos')}</a>
                </span>
              </li>
              <li className="flex gap-[10px] items-start">
                <span aria-hidden className="mt-[3px] w-[5px] h-[5px] shrink-0 rounded-full bg-[#f7b65f]" />
                <span className="text-[.85rem] text-[var(--muted)]">{t('El motor ya corre 80/15/5. Tus datos nunca salen sin tu OK.')}</span>
              </li>
              <li className="flex gap-[10px] items-start">
                <span aria-hidden className="mt-[3px] w-[5px] h-[5px] shrink-0 rounded-full bg-[#f7b65f]" />
                 <span className="text-[.85rem] text-[var(--muted)]">{t('En construcción: feed social cooperativo y analytics. La competencia es opcional, contra tu yo pasado, nunca contra otros.')}</span>
              </li>
            </ul>
          </div>

        {/* Preview — reduces anxiety about the unknown (ND: predictibilidad, cero sorpresas) */}
        <div className="animate-in w-full mb-[28px]" style={{ animationDelay: '385ms' }}>
          <div className="flex items-center justify-center gap-[10px] mb-[14px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] text-[#f7b65f]"><path d="M12 2l3 7h7l-5.5 4 2 7-5.5-4-5.5 4 2-7-5.5-4h7z" /></svg>
            <p className="text-[.74rem] font-semibold uppercase tracking-[.07em] text-[var(--muted)]">{t('Qué verás al entrar')}</p>
          </div>
          <div className="w-full max-w-[252px] mx-auto">
            <svg viewBox="0 0 252 504" fill="none" className="w-full h-auto" aria-hidden="true">
              <rect x="2" y="2" width="248" height="500" rx="44" className="fill-[#151b2a] stroke-[#2a2f42]" strokeWidth="1.5" />
              <rect x="28" y="62" width="120" height="10" rx="5" className="fill-[#f7b65f]" />
              <rect x="28" y="88" width="90" height="7" rx="3.5" className="fill-[#94a0b8]" />
              <rect x="28" y="112" width="196" height="72" rx="16" className="fill-[#1a2234] stroke-[#2a2f42]" strokeWidth="1" />
              <rect x="36" y="132" width="172" height="6" rx="3" className="fill-[#94a0b8]" opacity=".5" />
              <rect x="36" y="146" width="172" height="6" rx="3" className="fill-[#94a0b8]" opacity=".35" />
              <rect x="28" y="200" width="100" height="7" rx="3.5" className="fill-[#94a0b8]" />
              <rect x="28" y="220" width="196" height="36" rx="12" className="fill-[#f9c074] stroke-[#2a2f42]" strokeWidth="1" />
              <rect x="28" y="268" width="120" height="7" rx="3.5" className="fill-[#94a0b8]" opacity=".45" />
              <circle cx="126" cy="442" r="36" className="fill-[#00D4AA]" />
              <rect x="110" y="426" width="6" height="30" rx="3" className="fill-[#0a0d14]" />
            </svg>
          </div>
          <p className="text-[.85rem] leading-[1.6] text-[var(--muted)] mt-[14px] max-w-[38ch] mx-auto">{t('Una rutina, un botón, cero decisiones.')}</p>
        </div>

        {/* FAQ TDAH — native <details>: accesible, cero JS, bajo estímulo */}
        {showFAQs && (
        <div className="animate-in w-full mb-[30px]" style={{ animationDelay: '490ms' }}>
          <p className="text-[.74rem] font-semibold uppercase tracking-[.07em] text-[var(--muted)] mb-[16px] text-center">{t('Preguntas frecuentes')}</p>
          <div className="flex flex-col gap-[12px]">
            {FAQ_ITEMS.map((f, i) => (
              <FaqItem
                key={i}
                q={f.q}
                a={f.a}
                openDefault={f.q === '¿Salen mis datos del dispositivo?' || f.q === '¿Es IA real o marketing?'}
              />
            ))}
          </div>
        </div>
        )}

        {/* Footer */}
        <footer
          className="animate-in mt-[46px] w-full flex flex-col items-center gap-[16px]"
          style={{ animationDelay: '580ms' }}
        >
          <div className="flex gap-[18px] justify-center flex-wrap">
            <Stat value="80%" label={t('algoritmos')} />
            <Stat value="15%" label={t('modelos')} />
            <Stat value="5%" label={t('LLM')} />
          </div>
          <span className="inline-flex items-center gap-[8px] text-[.78rem] text-[var(--muted)] px-[13px] py-[7px] rounded-full bg-white/[.025] border border-white/[.05]">
            <span className="w-[7px] h-[7px] rounded-full bg-[#7bd88f]" style={{ animation: 'pulseDotGreen 2.4s ease-out infinite' }} aria-hidden="true" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px] text-[var(--muted)]">
              <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
            </svg>
            {t('Tus datos viven en tu dispositivo')}
           </span>
           <a
             href="mailto:feedback@chispa.app?subject=%5BCHISPA%5D%20Feedback%20de%20usuario"
             className="text-[.76rem] text-[var(--muted-soft)] hover:text-[#f7b65f] underline decoration-[#7a8499]/40 underline-offset-2"
           >
             feedback@chispa.app
           </a>
         </footer>
      </main>

      {/* Sticky footbar — primary CTA + login always thumb-reachable (ND: cero fricción post-scroll) */}
      <div className="fixed bottom-0 inset-x-0 z-40 w-full max-w-[440px] mx-auto">
        <div className="flex items-center gap-[10px] p-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] bg-[#0d111b]/65 backdrop-blur-xl border-t border-white/[.08] shadow-[0_-4px_24px_-6px_rgba(0,0,0,0.45)]">
          <button
            id="cta-btn-foot"
            aria-busy={ctaBusy}
            onClick={handleCta}
            className="flex-1 font-['Hanken_Grotesk',system-ui,sans-serif] font-semibold text-[1rem] py-[15px] px-[18px] rounded-[14px] text-[#2a1405] bg-gradient-to-r from-[#f9c074] to-[#ef7a3c] active:scale-[.985] aria-busy:pointer-events-none aria-busy:opacity-85"
          >
            {t('Crear mi perfil')}
          </button>
          <button
            onClick={() => setView('login')}
            aria-label={t('Iniciar sesión')}
            className="text-[.88rem] font-medium text-[var(--muted)] hover:text-[#f7b65f] underline decoration-[#94a0b8]/40 underline-offset-2"
          >
            {t('Iniciar sesión')}
          </button>
        </div>
      </div>
    </>
  );
}

/* ───────────── Stat ───────────── */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-[2px] leading-[1]">
      <b className="font-['Bricolage_Grotesque',system-ui,sans-serif] font-bold text-[1.02rem] text-[#f7b65f]">{value}</b>
      <small className="text-[.68rem] tracking-[.06em] uppercase text-[var(--muted)]">{label}</small>
    </div>
  );
}
