import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="es" className="h-full antialiased">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.0.20/index.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/sora@5.0.20/index.css" />
        <link rel="apple-touch-icon" href="https://image.qwenlm.ai/public_source/6293bf56-c9cc-4349-841d-cdde04e9d74e/1d08f0a58-ea85-4e8b-b799-e65c81f037a6.png" />
      </head>
      <body className="min-h-dvh font-sans bg-[#0a0d14] text-[#f2f5fc] overflow-x-hidden">
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
