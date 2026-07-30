'use client';

/**
 * Ilustración de bienvenida estilo amanecer.
 * Renderizada con dangerouslySetInnerHTML para preservar animaciones SMIL.
 * @see {@link public/bienvenida-amanecer.svg}
 */
export function BienvenidaIllustration({ className }: { className?: string }) {
  return (
    <div
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: `<svg viewBox="0 0 320 190" xmlns="http://www.w3.org/2000/svg" role="img"
     aria-label="Ilustración de bienvenida: amanecer sobre colinas">
  <defs>
    <linearGradient id="daw-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d1b21"/>
      <stop offset=".55" stop-color="#1d4a52"/>
      <stop offset="1" stop-color="#e8875a"/>
    </linearGradient>
    <linearGradient id="daw-sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd27a"/>
      <stop offset="1" stop-color="#ff8a5c"/>
    </linearGradient>
  </defs>
  <rect width="320" height="190" rx="14" fill="url(#daw-sky)"/>
  <g fill="#e6f2ec">
    <circle cx="46" cy="30" r="1.6"><animate attributeName="opacity" values="1;.2;1" dur="3s" repeatCount="indefinite"/></circle>
    <circle cx="272" cy="24" r="1.3"><animate attributeName="opacity" values=".3;1;.3" dur="4s" repeatCount="indefinite"/></circle>
    <circle cx="210" cy="44" r="1.1"><animate attributeName="opacity" values="1;.3;1" dur="2.4s" repeatCount="indefinite"/></circle>
  </g>
  <circle cx="160" cy="118" r="36" fill="url(#daw-sun)">
    <animate attributeName="cy" values="118;113;118" dur="7s" repeatCount="indefinite"/>
  </circle>
  <path d="M0 132 Q60 96 128 126 T320 122 V190 H0 Z" fill="#143840"/>
  <path d="M0 152 Q90 122 180 148 T320 146 V190 H0 Z" fill="#0d2830"/>
  <g stroke="#0d1b21" stroke-width="2.4" fill="none" stroke-linecap="round">
    <path d="M84 66 q6 -7 12 0 q6 -7 12 0"/>
    <path d="M226 84 q5 -6 10 0 q5 -6 10 0"/>
  </g>
  <g>
    <animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="5s" repeatCount="indefinite"/>
    <rect x="128" y="140" width="64" height="34" rx="7" fill="#e6f2ec"/>
    <rect x="136" y="148" width="30" height="5" rx="2.5" fill="#ff6b5e"/>
    <rect x="136" y="158" width="48" height="4" rx="2" fill="#9db8b0"/>
    <rect x="136" y="166" width="40" height="4" rx="2" fill="#9db8b0"/>
  </g>
</svg>`,
      }}
    />
  );
}
