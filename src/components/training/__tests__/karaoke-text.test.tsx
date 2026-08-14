import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { KaraokeText } from '../karaoke-text';

/* ─── Mock de speechSynthesis (jsdom no lo tiene) ─── */
function installSpeechMock() {
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      voice: unknown = null;
      onboundary: any = null;
      onend: any = null;
      onerror: any = null;
      constructor(text: string) {
        this.text = text;
      }
    }
  );
  const speakMock = vi.fn();
  const cancelMock = vi.fn();
  const getVoicesMock = vi.fn(() => [{ lang: 'es-ES', name: 'Mock' }]);
  let boundHandler: any = null;
  let endHandler: any = null;

  const synth = {
    speak: speakMock,
    cancel: cancelMock,
    getVoices: getVoicesMock,
    // test helpers
    __emitBoundary(charIndex: number) {
      boundHandler?.({ charIndex });
    },
    __emitEnd() {
      endHandler?.();
    },
    __onUtterance: (u: SpeechSynthesisUtterance) => {
      boundHandler = u.onboundary;
      endHandler = u.onend;
    },
  };

  // speak() recibe el utterance → exponer sus handlers
  speakMock.mockImplementation((u: SpeechSynthesisUtterance) => {
    synth.__onUtterance(u);
  });

  vi.stubGlobal('speechSynthesis', synth);
  return synth as unknown as typeof window.speechSynthesis & {
    __emitBoundary: (i: number) => void;
    __emitEnd: () => void;
  };
}

describe('KaraokeText (spec §4: palabra leída resaltada)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sin soporte de voz no renderiza nada', () => {
    const { container } = render(
      <KaraokeText text="Hola mundo" lang="es" active />
    );
    expect(container.innerHTML).toBe('');
  });

  it('inactivo no ocupa espacio', () => {
    installSpeechMock();
    const { container } = render(
      <KaraokeText text="Hola mundo" lang="es" active={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('al activarse habla y resalta la primera palabra', () => {
    installSpeechMock();
    render(<KaraokeText text="Hola mundo" lang="es" active />);

    expect(screen.getByText('Modo karaoke')).toBeInTheDocument();
    // Palabras renderizadas
    expect(screen.getByText('Hola')).toBeInTheDocument();
    expect(screen.getByText('mundo')).toBeInTheDocument();
    // La primera palabra está resaltada (aria-hidden false) y el resto no
    const hola = screen.getByText('Hola');
    const mundo = screen.getByText('mundo');
    expect(hola.closest('span')?.getAttribute('aria-hidden')).toBe('false');
    expect(mundo.closest('span')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('onboundary avanza la palabra resaltada', async () => {
    const synth = installSpeechMock();
    render(<KaraokeText text="Hola mundo cruel" lang="es" active />);

    await act(async () => {
      synth.__emitBoundary('Hola '.length);
    });
    // 'mundo' (índice 1) resaltado ahora
    const mundo = screen.getByText('mundo');
    expect(mundo.closest('span')?.getAttribute('aria-hidden')).toBe('false');

    await act(async () => {
      synth.__emitBoundary('Hola mundo '.length);
    });
    const cruel = screen.getByText('cruel');
    expect(cruel.closest('span')?.getAttribute('aria-hidden')).toBe('false');
  });

  it('al terminar notifica onDone y el padre puede desactivarlo', async () => {
    const synth = installSpeechMock();
    const onDone = vi.fn();
    const { rerender } = render(<KaraokeText text="Hola" lang="es" active onDone={onDone} />);

    await act(async () => {
      synth.__emitEnd();
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    // Mientras el padre mantenga active, muestra el estado "Lectura terminada"
    expect(screen.getByText('Lectura terminada')).toBeInTheDocument();

    // El padre detiene el karaoke → el componente desaparece por completo
    rerender(<KaraokeText text="Hola" lang="es" active={false} onDone={onDone} />);
    expect(screen.queryByText('Modo karaoke')).not.toBeInTheDocument();
  });

  it('el botón de detener corta la síntesis', () => {
    const synth = installSpeechMock();
    render(<KaraokeText text="Hola mundo" lang="es" active />);

    fireEvent.click(screen.getByRole('button', { name: /detener audio/i }));
    expect(synth.cancel).toHaveBeenCalled();
  });
});
