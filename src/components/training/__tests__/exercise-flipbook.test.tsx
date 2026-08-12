/**
 * Tests for ExerciseFlipbook component
 *
 * Verifies the movement loop: 2+ frames render with play/pause + manual frame
 * controls, reduceMotion disables autoplay, and exercises without frames
 * fall back to nothing (el contexto muestra la foto estática).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ExerciseFlipbook, type ExerciseFlipbookHandle } from '../exercise-flipbook';
import { useStore } from '@/lib/store';
import type { Exercise } from '@/types';

vi.mock('@/lib/i18n/use-t', () => ({
  useT: () => (key: string) => key,
}));

function makeExercise(images?: string[]): Exercise {
  return {
    id: 'test',
    name: 'Test Exercise',
    muscle: 'core',
    difficulty: 2,
    equipment: 'body only',
    instructions: 'Do the thing properly',
    instructionsSteps: ['Step one'],
    load_type: 'reps',
    cognitive_load: 'low',
    emoji: '💪',
    cue: 'Keep going',
    images,
  } as Exercise;
}

beforeEach(() => {
  // Restaurar prefs por defecto (reduceMotion: false + autoplay: true + sin slow)
  useStore.setState({
    prefs: {
      ...useStore.getState().prefs,
      reduceMotion: false,
      explainerAutoplay: true,
      explainerSlow: false,
    },
  });
});

describe('ExerciseFlipbook', () => {
  it('renders nothing without a frame sequence (fallback elegante)', () => {
    const { container } = render(<ExerciseFlipbook exercise={makeExercise(undefined)} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing with only one frame', () => {
    const { container } = render(<ExerciseFlipbook exercise={makeExercise(['X/0.jpg'])} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the loop with autoplay and manual controls', () => {
    render(<ExerciseFlipbook exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    expect(screen.getByRole('img')).toBeDefined();
    expect(screen.getByText('1/2')).toBeDefined();
    // Autoplay activo por defecto → el botón permite pausar
    expect(screen.getByLabelText('Pausar animación')).toBeDefined();
  });

  it('pauses and resumes with the play button', () => {
    render(<ExerciseFlipbook exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    const pauseBtn = screen.getByLabelText('Pausar animación');
    fireEvent.click(pauseBtn);
    expect(screen.getByLabelText('Reproducir animación')).toBeDefined();
    fireEvent.click(screen.getByLabelText('Reproducir animación'));
    expect(screen.getByLabelText('Pausar animación')).toBeDefined();
  });

  it('steps frame by frame manually', () => {
    render(<ExerciseFlipbook exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    fireEvent.click(screen.getByLabelText('Frame siguiente'));
    expect(screen.getByText('2/2')).toBeDefined();
    fireEvent.click(screen.getByLabelText('Frame anterior'));
    expect(screen.getByText('1/2')).toBeDefined();
  });

  it('disables autoplay with prefers-reduced-motion (control manual)', () => {
    useStore.setState({ prefs: { ...useStore.getState().prefs, reduceMotion: true } });
    render(<ExerciseFlipbook exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    // Sin autoplay → el botón permite reproducir
    expect(screen.getByLabelText('Reproducir animación')).toBeDefined();
  });

  it('persists autoplay off when the user pauses (preferencia recordada)', () => {
    render(<ExerciseFlipbook exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    fireEvent.click(screen.getByLabelText('Pausar animación'));
    expect(useStore.getState().prefs.explainerAutoplay).toBe(false);
  });

  it('persists autoplay on when the user resumes', () => {
    useStore.setState({ prefs: { ...useStore.getState().prefs, explainerAutoplay: false } });
    render(<ExerciseFlipbook exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    fireEvent.click(screen.getByLabelText('Reproducir animación'));
    expect(useStore.getState().prefs.explainerAutoplay).toBe(true);
  });

  it('does not autoplay when the persisted preference is off', () => {
    useStore.setState({ prefs: { ...useStore.getState().prefs, explainerAutoplay: false } });
    render(<ExerciseFlipbook exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    // Sin autoplay → el botón permite reproducir
    expect(screen.getByLabelText('Reproducir animación')).toBeDefined();
  });

  it('frame navigation pauses the loop without changing the preference', () => {
    render(<ExerciseFlipbook exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    fireEvent.click(screen.getByLabelText('Frame siguiente'));
    // Se pausa la animación pero NO se persiste la preferencia
    expect(useStore.getState().prefs.explainerAutoplay).toBe(true);
    expect(screen.getByText('2/2')).toBeDefined();
  });

  it('degrades to static image when a frame fails (no desaparece)', () => {
    render(<ExerciseFlipbook exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    // El frame 0 falla al cargar → se descarta → queda solo el frame 1 (estático)
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img').getAttribute('src')).toContain('X/1.jpg');
    // Ya no hay controles de loop (foto estática elegante)
    expect(screen.queryByLabelText('Pausar animación')).toBeNull();
    expect(screen.queryByLabelText('Cámara lenta')).toBeNull();
  });

  it('jumps to the phase of a step via the imperative handle (sincronía)', () => {
    const ref = React.createRef<ExerciseFlipbookHandle>();
    render(<ExerciseFlipbook ref={ref} exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    expect(screen.getByText('1/2')).toBeDefined();

    // Paso 3 de 3 → frame final y el loop se pausa (la fase queda visible)
    act(() => ref.current?.jumpToStep(2, 3));
    expect(screen.getByText('2/2')).toBeDefined();
    expect(screen.getByLabelText('Reproducir animación')).toBeDefined();

    // Paso 1 de 3 → frame inicial
    act(() => ref.current?.jumpToStep(0, 3));
    expect(screen.getByText('1/2')).toBeDefined();
  });

  it('jumpToStep interpola pasos intermedios hacia el frame final', () => {
    const ref = React.createRef<ExerciseFlipbookHandle>();
    render(<ExerciseFlipbook ref={ref} exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    // 3 pasos → el 2º (índice 1) mapea a la fase de contracción (frame final)
    act(() => ref.current?.jumpToStep(1, 3));
    expect(screen.getByText('2/2')).toBeDefined();
  });

  it('persists slow motion (0.5×) when toggled (preferencia recordada)', () => {
    render(<ExerciseFlipbook exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    fireEvent.click(screen.getByLabelText('Cámara lenta'));
    expect(useStore.getState().prefs.explainerSlow).toBe(true);
  });

  it('starts with the persisted slow-motion preference', () => {
    useStore.setState({ prefs: { ...useStore.getState().prefs, explainerSlow: true } });
    render(<ExerciseFlipbook exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    expect(screen.getByLabelText('Cámara lenta').getAttribute('aria-pressed')).toBe('true');
  });

  it('jumpToStep es no-op con un solo paso o sin secuencia', () => {
    const ref = React.createRef<ExerciseFlipbookHandle>();
    render(<ExerciseFlipbook ref={ref} exercise={makeExercise(['X/0.jpg', 'X/1.jpg'])} />);
    act(() => ref.current?.jumpToStep(0, 1));
    expect(screen.getByText('1/2')).toBeDefined();

    // Sin frames → el handle existe pero jumpToStep es no-op (no rompe)
    const emptyRef = React.createRef<ExerciseFlipbookHandle>();
    render(<ExerciseFlipbook ref={emptyRef} exercise={makeExercise(undefined)} />);
    expect(emptyRef.current).not.toBeNull();
    act(() => emptyRef.current?.jumpToStep(0, 3));
  });
});
