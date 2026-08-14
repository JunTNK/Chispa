/**
 * Speech helpers — modo audio (guía por voz).
 *
 * Principio ND: la voz anuncia, nunca insiste (un aviso por transición, nada
 * que se repita) y respeta el silencio: si el usuario pausa, se corta todo.
 */

/** True si el navegador puede sintetizar voz. */
export function voiceSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.speechSynthesis !== 'undefined';
}

/**
 * Anuncia un texto y corta la síntesis anterior (evita voces encimadas).
 * Devuelve false si no hay soporte (la app sigue fluyendo en silencio).
 *
 * `rate` permite ralentizar/acelerar la lectura (0.75×/1×/1.25×) — útil para
 * el botón "Escuchar" del explainer (lectura larga, no solo anuncios cortos).
 */
export function speak(text: string, lang: 'es' | 'en' = 'es', rate = 1): boolean {
  if (!voiceSupported() || !text.trim()) return false;
  const synth = window.speechSynthesis;
  const voices = synth.getVoices?.() ?? [];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'en' ? 'en-US' : 'es-ES';
  utterance.rate = rate;
  const voice =
    voices.find((v: { lang: string }) => v.lang.startsWith(lang === 'en' ? 'en' : 'es')) ??
    undefined;
  if (voice) utterance.voice = voice;
  synth.cancel();
  synth.speak(utterance);
  return true;
}

/** Corta cualquier anuncio en curso (pause, unmount, toggle off). */
export function stopSpeak(): void {
  if (!voiceSupported()) return;
  window.speechSynthesis.cancel();
}

/**
 * Habla con eventos por palabra (modo karaoke, spec §4).
 *
 * Usa `onboundary` del navegador cuando el navegador lo emite; si no, cae a
 * un fallback de ritmo: reparte las palabras en el tiempo estimado de lectura
 * (~620 ms/palabra a 1×, escalado por `rate`). El fallback arranca solo si
 * tras 1.2 s no llegó ningún boundary (navegadores que no lo soportan).
 *
 * Devuelve una función `stop()` o null si no hay soporte.
 */
export function speakWithEvents(
  text: string,
  lang: 'es' | 'en' = 'es',
  rate = 1,
  onWord: (wordIndex: number, total: number) => void = () => {},
  onEnd: () => void = () => {}
): (() => void) | null {
  if (!voiceSupported() || !text.trim()) return null;
  const synth = window.speechSynthesis;
  const voices = synth.getVoices?.() ?? [];
  const words = text.trim().split(/\s+/).filter(Boolean);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'en' ? 'en-US' : 'es-ES';
  utterance.rate = rate;
  const voice =
    voices.find((v: { lang: string }) => v.lang.startsWith(lang === 'en' ? 'en' : 'es')) ??
    undefined;
  if (voice) utterance.voice = voice;

  let fallbackId: number | null = null;
  let probeId: number = 0;
  let boundarySeen = false;
  let finished = false;

  const done = () => {
    if (finished) return;
    finished = true;
    if (fallbackId !== null) window.clearInterval(fallbackId);
    window.clearTimeout(probeId);
    onEnd();
  };

  utterance.onboundary = (e: SpeechSynthesisEvent) => {
    boundarySeen = true;
    const wordIdx = text.slice(0, e.charIndex).trim().split(/\s+/).filter(Boolean).length;
    onWord(Math.min(wordIdx, words.length - 1), words.length);
  };
  utterance.onend = done;
  utterance.onerror = done;

  // Fallback de ritmo: sin boundaries en 1.2 s → reparto uniforme.
  const msPerWord = 620 / Math.max(0.5, rate);
  probeId = window.setTimeout(() => {
    if (boundarySeen || finished) return;
    let i = 0;
    fallbackId = window.setInterval(() => {
      if (finished) {
        if (fallbackId !== null) window.clearInterval(fallbackId);
        return;
      }
      if (i >= words.length) {
        if (fallbackId !== null) window.clearInterval(fallbackId);
        done();
        return;
      }
      onWord(i, words.length);
      i += 1;
    }, msPerWord);
  }, 1200);

  synth.cancel();
  synth.speak(utterance);

  return () => {
    if (fallbackId !== null) window.clearInterval(fallbackId);
    window.clearTimeout(probeId);
    if (!finished) finished = true;
    synth.cancel();
  };
}