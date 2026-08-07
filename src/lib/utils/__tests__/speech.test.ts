import { describe, it, expect, vi, afterEach } from 'vitest';
import { voiceSupported, speak, stopSpeak } from '../speech';

function mockSpeech(opts: { supported?: boolean } = {}) {
  const cancel = vi.fn();
  const speakMock = vi.fn();
  const getVoices = vi.fn(() => [{ lang: 'es-ES', name: 'Test' }]);
  const synth = { cancel, speak: speakMock, getVoices, addEventListener: () => {} };
  if (opts.supported === false) {
    vi.stubGlobal('window', {} as any);
  } else {
    vi.stubGlobal('window', { speechSynthesis: synth });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      lang = '';
      rate = 0;
      voice: unknown = null;
    } as any);
  }
  return { synth, speakMock };
}

describe('speech helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('voiceSupported: true con speechSynthesis, false sin él', () => {
    mockSpeech();
    expect(voiceSupported()).toBe(true);
    vi.unstubAllGlobals();
    mockSpeech({ supported: false });
    expect(voiceSupported()).toBe(false);
  });

  it('speak anuncia el texto y corta la síntesis previa', () => {
    const { synth, speakMock } = mockSpeech();
    const ok = speak('Hola', 'es');
    expect(ok).toBe(true);
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it('speak ignora texto vacío y navegadores sin soporte', () => {
    mockSpeech();
    expect(speak('', 'es')).toBe(false);
    vi.unstubAllGlobals();
    mockSpeech({ supported: false });
    expect(speak('Hola', 'es')).toBe(false);
  });

  it('stopSpeak corta en silencio', () => {
    const { synth } = mockSpeech();
    stopSpeak();
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    mockSpeech({ supported: false });
    expect(() => stopSpeak()).not.toThrow();
  });
});