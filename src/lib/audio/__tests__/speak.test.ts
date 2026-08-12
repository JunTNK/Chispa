import { describe, it, expect, vi, beforeEach } from 'vitest';
import { speak, stopSpeak } from '../speak';
import { useStore } from '@/lib/store';
import * as neural from '../neural-voice';
import * as sys from '@/lib/utils/speech';

vi.mock('../neural-voice', () => ({
  speakNeural: vi.fn(),
  stopNeural: vi.fn(),
}));

vi.mock('@/lib/utils/speech', () => ({
  speak: vi.fn(),
  stopSpeak: vi.fn(),
  voiceSupported: vi.fn(() => true),
}));

function setVoiceMode(mode: 'system' | 'neural') {
  useStore.setState({ prefs: { ...useStore.getState().prefs, voice: mode } });
}

describe('speak (entrada única de audio)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.getState().reset();
  });

  it('voz del sistema → usa speechSynthesis directo', async () => {
    setVoiceMode('system');
    await speak('Hola', 'es');
    expect(sys.speak).toHaveBeenCalledTimes(1);
    // rate es opcional: sin él se pasa undefined (voz del sistema a 1×)
    expect(sys.speak).toHaveBeenCalledWith('Hola', 'es', undefined);
    expect(neural.speakNeural).not.toHaveBeenCalled();
  });

  it('voz del sistema → propaga el rate para lectura lenta', async () => {
    setVoiceMode('system');
    await speak('Hola', 'es', 0.75);
    expect(sys.speak).toHaveBeenCalledWith('Hola', 'es', 0.75);
  });

  it('voz neural disponible → usa la neural', async () => {
    setVoiceMode('neural');
    vi.mocked(neural.speakNeural).mockResolvedValue(undefined as never);
    await speak('Hola', 'es');
    expect(neural.speakNeural).toHaveBeenCalledWith('Hola', 'es');
    expect(sys.speak).not.toHaveBeenCalled();
  });

  it('voz neural falla → fallback silencioso a la del sistema', async () => {
    setVoiceMode('neural');
    vi.mocked(neural.speakNeural).mockRejectedValue(new Error('modelo no disponible'));
    await speak('Hola', 'es');
    expect(sys.speak).toHaveBeenCalledTimes(1);
  });

  it('stopSpeak corta neural y sistema', () => {
    stopSpeak();
    expect(neural.stopNeural).toHaveBeenCalledTimes(1);
    expect(sys.stopSpeak).toHaveBeenCalledTimes(1);
  });
});