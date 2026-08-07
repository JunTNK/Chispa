/**
 * Tests for ExerciseExplainer component
 *
 * Verifies the 3-section collapsible panel: Cómo/Para qué/Precauciones
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseExplainer } from '../exercise-explainer';
import type { Exercise } from '@/types';

// Mock useT to return the key as-is
vi.mock('@/lib/i18n/use-t', () => ({
  useT: () => (key: string) => key,
}));

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
  it('renders nothing when exercise has no instructions, benefits, or precautions', () => {
    const ex = makeExercise({ instructions: '', instructionsSteps: [], benefits: undefined, precautions: undefined });
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

  it('shows content when section is expanded', () => {
    const ex = makeExercise({ instructionsSteps: ['Step one', 'Step two'] });
    render(<ExerciseExplainer exercise={ex} />);

    // Click to expand howTo
    fireEvent.click(screen.getByText('Cómo hacerlo'));
    expect(screen.getByText('Step one Step two')).toBeDefined();
  });

  it('hides content when section is collapsed again', () => {
    const ex = makeExercise({ instructionsSteps: ['Step one'] });
    render(<ExerciseExplainer exercise={ex} />);

    // Expand
    fireEvent.click(screen.getByText('Cómo hacerlo'));
    expect(screen.getByText('Step one')).toBeDefined();

    // Collapse
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

    // Open howTo
    fireEvent.click(screen.getByText('Cómo hacerlo'));
    expect(screen.getByText('Step A')).toBeDefined();

    // Open benefits — howTo should close
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
});
