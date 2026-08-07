import type { Metadata, Viewport } from "next";
import { Inter, Sora, Bricolage_Grotesque, Fraunces, Hanken_Grotesk } from 'next/font/google';
import "./globals.css";
import { WebVitals } from './web-vitals';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "CHISPA — La IA que se adapta a tu cerebro",
  description: "Fitness adaptativo para TDAH y neurodivergencias. 80% algoritmos · 15% modelos · 5% LLM. La LLM comunica, nunca decide.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CHISPA",
  },
  icons: {
    apple: "https://image.qwenlm.ai/public_source/6293bf56-c9cc-4349-841d-cdde04e9d74e/1d08f0a58-ea85-4e8b-b799-e65c81f037a6.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0d14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`h-full antialiased ${inter.variable} ${sora.variable} ${bricolage.variable} ${fraunces.variable} ${hanken.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="https://image.qwenlm.ai/public_source/6293bf56-c9cc-4349-841d-cdde04e9d74e/1d08f0a58-ea85-4e8b-b799-e65c81f037a6.png" />
<script dangerouslySetInnerHTML={{
  __html: `
    (function(){
      var A=["cz-shortcut-listen","data-new-gr-c-s-check-loaded","data-gr-ext-installed","data-gramm","data-grammarly","data-gb","data-lt-installed"];
      var M=new MutationObserver(function(){
        var b=document.body;
        if(!b)return;
        try{for(var i=0;i<A.length;i++)b.removeAttribute(A[i])}finally{M.disconnect()}
      });
      M.observe(document.documentElement,{childList:true,subtree:true});
    })();
  `,
}} />
      </head>
      <body suppressHydrationWarning className="min-h-dvh font-sans bg-[#0a0d14] text-[var(--text)] overflow-x-hidden">
        <WebVitals />
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js');
              });
            }
          `,
        }} />
      </body>
    </html>
  );
}
