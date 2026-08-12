/**
 * speak — entrada única de audio de sesión.
 *
 * Conmuta entre la voz neural (MMS-TTS on-device) y la voz del sistema según
 * prefs.voice. La neural es opt-in: si falla o aún no está descargada, cae en
 * silencio a la voz del sistema (la sesión nunca se bloquea).
 *
 * `rate` (opcional) solo aplica a la voz del sistema: la neural genera el
 * audio a velocidad fija. Se usa para el "Escuchar" del explainer.
 */
import { useStore } from '@/lib/store';
import {
  speak as systemSpeak,
  stopSpeak as stopSystemSpeak,
  voiceSupported,
} from '@/lib/utils/speech';
import { speakNeural, stopNeural } from './neural-voice';

export type { VoiceMode } from './neural-voice';

export async function speak(text: string, lang: 'es' | 'en', rate?: number): Promise<void> {
  if (useStore.getState().prefs.voice === 'neural') {
    try {
      await speakNeural(text, lang);
      return;
    } catch {
      // fallback silencioso a la voz del sistema
    }
  }
  systemSpeak(text, lang, rate);
}

export function stopSpeak(): void {
  stopNeural();
  stopSystemSpeak();
}

export { voiceSupported };