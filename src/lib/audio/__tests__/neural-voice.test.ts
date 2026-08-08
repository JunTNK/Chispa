import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadNeuralVoice, speakNeural, stopNeural, clearNeuralCache } from '../neural-voice';
import { loadPipelineBuilder } from '../pipeline-loader';

vi.mock('../pipeline-loader', () => ({
  loadPipelineBuilder: vi.fn(),
}));

const mockedLoader = vi.mocked(loadPipelineBuilder);

function fakeSynth(model: string, progressCb?: (info: any) => void) {
  return {
    model,
    audio: new Float32Array([0, 0.1, 0.2, 0.3]),
    sampling_rate: 16000,
    progressCb,
  };
}

class MockAudioContext {
  state = 'running';
  destination = {};
  constructor(_opts: any) {}
  resume() {
    return Promise.resolve();
  }
  createBuffer(_ch: number, _len: number, _rate: number) {
    return { copyToChannel: () => {} };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
}

describe('neural-voice (MMS-TTS on-device)', () => {
  beforeEach(() => {
    clearNeuralCache();
    vi.clearAllMocks();
    vi.stubGlobal('AudioContext', MockAudioContext as any);
    vi.stubGlobal('webkitAudioContext', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('carga y cachea: la segunda llamada no re-ejecuta el pipeline', async () => {
    const builder = vi.fn(async (_task: string, model: string) => fakeSynth(model));
    mockedLoader.mockResolvedValue(builder as any);

    const a = await loadNeuralVoice('es');
    const b = await loadNeuralVoice('es');
    expect(a).toBe(b);
    expect(builder).toHaveBeenCalledTimes(1);
    expect(builder).toHaveBeenCalledWith(
      'text-to-speech',
      'Xenova/mms-tts-spa',
      expect.objectContaining({ dtype: 'q8', device: 'wasm' }),
    );
  });

  it('reporta progreso vía progress_callback', async () => {
    const onProgress = vi.fn();
    let captured: ((info: any) => void) | undefined;
    const builder = vi.fn(async (_task: string, _model: string, opts: any) => {
      captured = opts.progress_callback;
      return fakeSynth('x');
    });
    mockedLoader.mockResolvedValue(builder as any);

    await loadNeuralVoice('en', onProgress);
    expect(captured).toBeDefined();
    captured!({ status: 'progress', loaded: 100, total: 1000 });
    expect(onProgress).toHaveBeenCalledWith(100, 1000);
    captured!({ status: 'initiate' });
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('fallback de candidatos: si spa falla, usa el siguiente', async () => {
    const builder = vi.fn(async (_task: string, model: string) => {
      if (model === 'Xenova/mms-tts-spa') throw new Error('404');
      return fakeSynth(model);
    });
    mockedLoader.mockResolvedValue(builder as any);

    const synth = await loadNeuralVoice('es');
    expect(synth).toEqual(fakeSynth('Xenova/mms-tts-es'));
    expect(builder).toHaveBeenCalledTimes(2);
  });

  it('si todos los candidatos fallan, rechaza', async () => {
    const builder = vi.fn(async () => {
      throw new Error('modelo caído');
    });
    mockedLoader.mockResolvedValue(builder as any);
    await expect(loadNeuralVoice('es')).rejects.toThrow('modelo caído');
  });

  it('speakNeural sintetiza y reproduce el audio', async () => {
    const builder = vi.fn(async () => {
      return async () => ({
        audio: new Float32Array([0, 0.1, 0.2, 0.3]),
        sampling_rate: 16000,
      });
    });
    mockedLoader.mockResolvedValue(builder as any);

    await expect(speakNeural('Hello', 'en')).resolves.toBeUndefined();
    expect(builder).toHaveBeenCalledTimes(1);
    expect(builder).toHaveBeenCalledWith('text-to-speech', 'Xenova/mms-tts-eng', expect.any(Object));
  });

  it('stopNeural no lanza sin fuente activa', () => {
    expect(() => stopNeural()).not.toThrow();
  });
});