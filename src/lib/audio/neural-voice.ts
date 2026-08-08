/**
 * neural-voice — MMS-TTS (VITS) en el dispositivo vía Transformers.js.
 *
 * Principio ND:
 * - Opt-in: nada se descarga sin el tap explícito del usuario.
 * - El tamaño se muestra antes/durante la descarga (honestidad, sin sorpresas).
 * - Fallback de candidatos de naming (spa → es) y fallback a voz del sistema
 *   si el modelo no está disponible (la sesión nunca se bloquea).
 *
 * Licencia: MMS-TTS es CC-BY-NC — válido mientras CHISPA es gratis. Antes de
 * monetizar, swap en MODEL_CANDIDATES a Kokoro (Apache-2.0).
 */
import { loadPipelineBuilder } from './pipeline-loader';

export type VoiceMode = 'system' | 'neural';
export type VoiceLang = 'es' | 'en';

// spa = español neutro/LatAm (válido para US) · eng = inglés US
const MODEL_CANDIDATES: Record<VoiceLang, string[]> = {
  es: ['Xenova/mms-tts-spa', 'Xenova/mms-tts-es'],
  en: ['Xenova/mms-tts-eng'],
};

const cache = new Map<VoiceLang, any>();

export function clearNeuralCache(): void {
  cache.clear();
}

/**
 * Carga (y cachea) el sintetizador del idioma. Rechaza si ningún candidato
 * pudo cargarse; en progreso reporta loaded/total.
 */
export async function loadNeuralVoice(
  lang: VoiceLang,
  onProgress?: (loaded: number, total: number) => void,
): Promise<unknown> {
  if (cache.has(lang)) return cache.get(lang)!;

  const pipeline = await loadPipelineBuilder();
  let lastError: unknown;
  for (const model of MODEL_CANDIDATES[lang]) {
    try {
      const synth = await pipeline('text-to-speech', model, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (info: any) => {
          if (info.status === 'progress' && onProgress && info.total) {
            onProgress(info.loaded ?? 0, info.total);
          }
        },
      });
      cache.set(lang, synth);
      return synth;
    } catch (e) {
      lastError = e; // 404 de naming → prueba el siguiente candidato
    }
  }
  throw lastError;
}

let ctx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

function getContext(sampleRate: number): AudioContext {
  const w = window as any;
  const AC: typeof AudioContext | undefined = w.AudioContext ?? w.webkitAudioContext;
  if (!AC) throw new Error('AudioContext no disponible');
  if (!ctx) {
    ctx = new AC({ sampleRate });
  }
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  return ctx;
}

function playAudio(audio: Float32Array<ArrayBufferLike>, samplingRate: number): void {
  const ac = getContext(samplingRate);
  const buffer = ac.createBuffer(1, audio.length, samplingRate);
  buffer.copyToChannel(new Float32Array(audio), 0);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.connect(ac.destination);
  currentSource?.stop();
  currentSource = src;
  src.start();
}

/** Detiene la voz neural en curso (pause / toggle off / unmount). */
export function stopNeural(): void {
  try {
    currentSource?.stop();
  } catch {
    /* ya detenido */
  }
  currentSource = null;
}

export async function speakNeural(text: string, lang: VoiceLang): Promise<void> {
  const synth: any = await loadNeuralVoice(lang);
  const out = await synth(text);
  playAudio(out.audio as Float32Array, out.sampling_rate as number);
}