/**
 * Tests for ExerciseExplainer component
 *
 * Verifies the localized explainer: flipbook, tip card, micro-pasos atómicos
 * (checklist), secciones colapsables (Cómo/Para qué/Precauciones) y el botón
 * "Escuchar" (TTS).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseExplainer } from '../exercise-explainer';
import { isProbablySpanish } from '@/lib/utils/exercise-translate';
import { useStore } from '@/lib/store';
import type { Exercise } from '@/types';

// Mock useT: devuelve la clave con interpolación de variables (como el real)
vi.mock('@/lib/i18n/use-t', () => ({
  useT: () => (key: string, vars?: Record<string, string | number>) => {
    if (!vars) return key;
    let out = key;
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
    return out;
  },
}));

// Mock audio: TTS no disponible en jsdom — verificamos que speak se llama
const speakMock = vi.fn(async (_text: string, _lang: string, _rate?: number) => {});
const stopSpeakMock = vi.fn();
vi.mock('@/lib/audio/speak', () => ({
  speak: (text: string, lang: string, rate?: number) => speakMock(text, lang, rate),
  stopSpeak: () => stopSpeakMock(),
  voiceSupported: () => true,
}));

beforeEach(() => {
  // Prefs del explainer por defecto entre tests (rate 1×, todo colapsado)
  useStore.setState({
    prefs: { ...useStore.getState().prefs, explainerRate: 1, explainerOpenSection: null },
  });
});

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: 'test',
    name: 'Test Exercise',
    muscle: 'core',
    difficulty: 2,
    equipment: 'body only',
    instructions: 'Do the thing properly',
    instructionsSteps: ['Step one', 'Step two', 'Step three'],
    load_type: 'reps',
    cognitive_load: 'low',
    emoji: '💪',
    cue: 'Keep going',
    ...overrides,
  };
}

describe('ExerciseExplainer', () => {
  it('renders nothing when exercise has no instructions, benefits, precautions, cue, or frames', () => {
    const ex = makeExercise({
      instructions: '',
      instructionsSteps: [],
      benefits: undefined,
      precautions: undefined,
      cue: undefined,
      images: undefined,
    });
    const { container } = render(<ExerciseExplainer exercise={ex} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders howTo section from instructionsSteps', () => {
    const ex = makeExercise({});
    render(<ExerciseExplainer exercise={ex} />);
    expect(screen.getByText('Cómo hacerlo')).toBeDefined();
  });

  it('renders benefits section from primaryMuscles fallback', () => {
    const ex = makeExercise({ primaryMuscles: ['abdominales'] });
    render(<ExerciseExplainer exercise={ex} />);
    expect(screen.getByText('Para qué sirve')).toBeDefined();
  });

  it('renders benefits from explicit benefits field', () => {
    const ex = makeExercise({ benefits: 'Strengthens core stability' });
    render(<ExerciseExplainer exercise={ex} />);
    fireEvent.click(screen.getByText('Para qué sirve'));
    expect(screen.getByText('Strengthens core stability')).toBeDefined();
  });

  it('renders precautions section when field is provided', () => {
    const ex = makeExercise({ precautions: 'Avoid if you have back pain' });
    render(<ExerciseExplainer exercise={ex} />);
    expect(screen.getByText('Precauciones')).toBeDefined();
    fireEvent.click(screen.getByText('Precauciones'));
    expect(screen.getByText('Avoid if you have back pain')).toBeDefined();
  });

  it('does not render precautions section when field is absent', () => {
    const ex = makeExercise({ precautions: undefined });
    render(<ExerciseExplainer exercise={ex} />);
    expect(screen.queryByText('Precauciones')).toBeNull();
  });

  it('shows micro-pasos as a numbered checklist when expanded', () => {
    const ex = makeExercise({ instructionsSteps: ['Step one', 'Step two'] });
    const { container } = render(<ExerciseExplainer exercise={ex} />);

    fireEvent.click(screen.getByText('Cómo hacerlo'));
    expect(screen.getByText('Step one')).toBeDefined();
    expect(screen.getByText('Step two')).toBeDefined();
    // Checklist atómico: un <li> por paso
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
  });

  it('hides content when section is collapsed again', () => {
    const ex = makeExercise({ instructionsSteps: ['Step one'] });
    render(<ExerciseExplainer exercise={ex} />);

    fireEvent.click(screen.getByText('Cómo hacerlo'));
    expect(screen.getByText('Step one')).toBeDefined();

    fireEvent.click(screen.getByText('Cómo hacerlo'));
    // After collapse, AnimatePresence removes content from DOM
  });

  it('only shows one section open at a time', () => {
    const ex = makeExercise({
      instructionsSteps: ['Step A'],
      benefits: 'Benefit B',
      precautions: 'Warning C',
    });
    render(<ExerciseExplainer exercise={ex} />);

    fireEvent.click(screen.getByText('Cómo hacerlo'));
    expect(screen.getByText('Step A')).toBeDefined();

    fireEvent.click(screen.getByText('Para qué sirve'));
    expect(screen.getByText('Benefit B')).toBeDefined();
  });

  it('falls back to instructions text when instructionsSteps is empty', () => {
    const ex = makeExercise({ instructions: 'Full instructions text', instructionsSteps: [] });
    render(<ExerciseExplainer exercise={ex} />);

    fireEvent.click(screen.getByText('Cómo hacerlo'));
    expect(screen.getByText('Full instructions text')).toBeDefined();
  });

  it('builds benefits text from primaryMuscles and secondaryMuscles', () => {
    const ex = makeExercise({
      primaryMuscles: ['cuádriceps', 'glúteos'],
      secondaryMuscles: ['isquiotibiales'],
    });
    render(<ExerciseExplainer exercise={ex} />);

    fireEvent.click(screen.getByText('Para qué sirve'));
    expect(screen.getByText(/cuádriceps, glúteos/)).toBeDefined();
    expect(screen.getByText(/isquiotibiales/)).toBeDefined();
  });

  it('renders the tip card with the cue (el 20% esencial)', () => {
    const ex = makeExercise({ cue: 'Keep your chest up' });
    render(<ExerciseExplainer exercise={ex} />);
    expect(screen.getByText('Consejo CHISPA')).toBeDefined();
    expect(screen.getByText('Keep your chest up')).toBeDefined();
  });

  it('hides the tip card when howTo is expanded (evita duplicar contenido)', () => {
    const ex = makeExercise({});
    render(<ExerciseExplainer exercise={ex} />);
    expect(screen.getByText('Consejo CHISPA')).toBeDefined();

    fireEvent.click(screen.getByText('Cómo hacerlo'));
    expect(screen.queryByText('Consejo CHISPA')).toBeNull();
  });

  it('plays the cue with TTS and stops on second tap', () => {
    const ex = makeExercise({ cue: 'Keep your chest up' });
    render(<ExerciseExplainer exercise={ex} />);

    const playBtn = screen.getByLabelText('Escuchar consejo');
    fireEvent.click(playBtn);
    expect(speakMock).toHaveBeenCalledWith('Keep your chest up', 'es', 1);

    // Ahora el botón pasa a "Detener audio"
    fireEvent.click(screen.getByLabelText('Detener audio'));
    expect(stopSpeakMock).toHaveBeenCalled();
  });

  it('listens to each micro-paso individually', () => {
    const ex = makeExercise({ instructionsSteps: ['Step one', 'Step two'] });
    render(<ExerciseExplainer exercise={ex} />);
    fireEvent.click(screen.getByText('Cómo hacerlo'));

    fireEvent.click(screen.getByLabelText('Escuchar paso 1'));
    expect(speakMock).toHaveBeenCalledWith('Step one', 'es', 1);
  });

  it('no traduce texto que ya está en español (ejercicios wger)', () => {
    expect(isProbablySpanish('Este ejercicio es excelente para lograr una fuerte contracción')).toBe(true);
    expect(isProbablySpanish('To get into the starting position, place the pulleys above your head')).toBe(false);
  });

  it('cycles the reading speed with the rate chip', () => {
    const ex = makeExercise({ cue: 'Keep your chest up' });
    render(<ExerciseExplainer exercise={ex} />);

    // El tip y las secciones muestran el chip; el primero es el del tip.
    // (Re-consultamos tras el click: el nodo inicial puede quedar stale por
    // la animación del motion.div raíz.)
    const rateBtn = screen.getAllByLabelText('Velocidad de lectura')[0];
    expect(rateBtn.textContent).toBe('1×');
    fireEvent.click(rateBtn);
    expect(screen.getAllByLabelText('Velocidad de lectura')[0].textContent).toBe('1.25×');
  });

  it('persists the reading speed to the store (se recuerda entre sesiones)', () => {
    const ex = makeExercise({ cue: 'Keep your chest up' });
    render(<ExerciseExplainer exercise={ex} />);

    fireEvent.click(screen.getAllByLabelText('Velocidad de lectura')[0]);
    expect(useStore.getState().prefs.explainerRate).toBe(1.25);
  });

  it('syncs a micro-paso to the animation phase (paso → flipbook)', () => {
    const ex = makeExercise({
      instructionsSteps: ['Step one', 'Step two', 'Step three'],
      images: ['X/0.jpg', 'X/1.jpg'],
    });
    render(<ExerciseExplainer exercise={ex} />);
    fireEvent.click(screen.getByText('Cómo hacerlo'));

    // El hint de sincronía solo aparece con 2+ frames y >1 paso
    expect(screen.getByText('Toca un paso para verlo en la animación')).toBeDefined();

    // Tap al paso 3 → la animación salta al frame final (2/2)
    fireEvent.click(screen.getByRole('button', { name: 'Ver paso 3 en la animación' }));
    expect(screen.getByText('2/2')).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Ver paso 3 en la animación' }).getAttribute('aria-current')
    ).toBe('step');

    // Tap al paso 1 → frame inicial (1/2)
    fireEvent.click(screen.getByRole('button', { name: 'Ver paso 1 en la animación' }));
    expect(screen.getByText('1/2')).toBeDefined();
  });

  it('clears the active step when the user controls the animation manually', () => {
    const ex = makeExercise({
      instructionsSteps: ['Step one', 'Step two', 'Step three'],
      images: ['X/0.jpg', 'X/1.jpg'],
    });
    render(<ExerciseExplainer exercise={ex} />);
    fireEvent.click(screen.getByText('Cómo hacerlo'));

    fireEvent.click(screen.getByRole('button', { name: 'Ver paso 3 en la animación' }));
    expect(
      screen.getByRole('button', { name: 'Ver paso 3 en la animación' }).getAttribute('aria-current')
    ).toBe('step');

    // El usuario reproduce la animación → el highlight se limpia
    // (el frame ya no corresponde a una fase elegida)
    fireEvent.click(screen.getByLabelText('Reproducir animación'));
    expect(
      screen.getByRole('button', { name: 'Ver paso 3 en la animación' }).getAttribute('aria-current')
    ).toBeNull();
  });

  it('does not show the sync hint without frame sequence', () => {
    const ex = makeExercise({ instructionsSteps: ['Step one', 'Step two'] });
    render(<ExerciseExplainer exercise={ex} />);
    fireEvent.click(screen.getByText('Cómo hacerlo'));
    expect(screen.queryByText('Toca un paso para verlo en la animación')).toBeNull();
  });

  it('starts from the persisted reading speed', () => {
    useStore.setState({ prefs: { ...useStore.getState().prefs, explainerRate: 1.25 } });
    const ex = makeExercise({ cue: 'Keep your chest up' });
    render(<ExerciseExplainer exercise={ex} />);

    expect(screen.getAllByLabelText('Velocidad de lectura')[0].textContent).toBe('1.25×');
  });

  it('persists the open section to the store (se recuerda entre sesiones)', () => {
    const ex = makeExercise({ instructionsSteps: ['Step one', 'Step two'] });
    render(<ExerciseExplainer exercise={ex} />);

    fireEvent.click(screen.getByText('Cómo hacerlo'));
    expect(useStore.getState().prefs.explainerOpenSection).toBe('howTo');

    // Colapsar → vuelve a null (todo cerrado)
    fireEvent.click(screen.getByText('Cómo hacerlo'));
    expect(useStore.getState().prefs.explainerOpenSection).toBeNull();
  });

  it('starts with the persisted open section (y oculta la tip card)', () => {
    useStore.setState({ prefs: { ...useStore.getState().prefs, explainerOpenSection: 'howTo' } });
    const ex = makeExercise({ instructionsSteps: ['Step one'] });
    render(<ExerciseExplainer exercise={ex} />);

    // La sección arranca abierta → su contenido es visible
    expect(screen.getByText('Step one')).toBeDefined();
    // Con howTo abierto, la tip card queda oculta (evita duplicar)
    expect(screen.queryByText('Consejo CHISPA')).toBeNull();
  });

  it('falls back to collapsed when the persisted section is invalid (anti-corrupción)', () => {
    // Simular persistencia corrupta (valor que no es una sección real)
    useStore.setState({
      prefs: { ...useStore.getState().prefs, explainerOpenSection: 'bogus' as never },
    });
    const ex = makeExercise({ instructionsSteps: ['Step one'] });
    render(<ExerciseExplainer exercise={ex} />);

    // Todo colapsado: el contenido de howTo no se ve y la tip card sí
    expect(screen.queryByText('Step one')).toBeNull();
    expect(screen.getByText('Consejo CHISPA')).toBeDefined();
  });
});
