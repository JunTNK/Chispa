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