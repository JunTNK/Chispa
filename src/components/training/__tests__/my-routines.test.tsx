import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyRoutines } from '../my-routines';
import { useStore } from '@/lib/store';
import { daysAgoKey } from '@/lib/utils/helpers';
import type { WorkoutTemplate } from '@/types';

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeTemplate(overrides: Partial<WorkoutTemplate> = {}): WorkoutTemplate {
  return {
    id: 'tpl-1',
    name: 'Full body express',
    focus: 'full',
    exercises: [
      {
        exercise_id: 'bench-press',
        name: 'Press de banca',
        muscle: 'pecho',
        sets: 3,
        reps: 10,
        rest: 60,
        completed_sets: 0,
        completed_reps: [],
        status: 'pending',
      },
      {
        exercise_id: 'deadlift',
        name: 'Peso muerto',
        muscle: 'espalda',
        sets: 3,
        reps: 8,
        rest: 90,
        completed_sets: 0,
        completed_reps: [],
        status: 'pending',
      },
    ],
    created_at: '2026-07-01T10:00:00.000Z',
    balance: {
      present: ['push', 'pull'],
      missing: ['squat', 'core'],
      dopa: 78,
      durationMin: 24,
      sufficient: true,
    },
    ...overrides,
  };
}

function seedTemplates(...templates: WorkoutTemplate[]) {
  useStore.setState({ workoutTemplates: templates });
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('MyRoutines', () => {
  it('returns null when there are no templates', () => {
    seedTemplates();
    const { container } = render(<MyRoutines />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the section with template name, focus and exercise count', () => {
    seedTemplates(makeTemplate());
    render(<MyRoutines />);

    expect(screen.getByRole('region', { name: 'Mis rutinas' })).toBeInTheDocument();
    expect(screen.getByText('Full body express')).toBeInTheDocument();
    // FOCUS_LABELS.full = 'Cuerpo completo' · '{n} ejercicios' → '2 ejercicios'
    expect(screen.getByText(/Cuerpo completo · 2 ejercicios/)).toBeInTheDocument();
  });

  it('renders balance chips: covered green, missing amber (spec capa 02)', () => {
    seedTemplates(makeTemplate());
    const { container } = render(<MyRoutines />);

    // Patrones del enfoque full: push, pull, squat, core
    // Cubiertos (present): Empuje, Tirón → verde
    const green = container.querySelectorAll(
      '.border-\\[rgba\\(52\\,211\\,153\\,0\\.45\\)\\]'
    );
    expect(green.length).toBe(2);
    expect(green[0].textContent).toContain('Empuje');
    expect(green[1].textContent).toContain('Tirón');

    // Faltantes (missing): Sentadilla, Core → ámbar
    const amber = container.querySelectorAll(
      '.border-\\[rgba\\(251\\,191\\,36\\,0\\.45\\)\\]'
    );
    expect(amber.length).toBe(2);
    expect(amber[0].textContent).toContain('Sentadilla');
    expect(amber[1].textContent).toContain('Core');
  });

  it('shows dopamine score and total duration metrics', () => {
    seedTemplates(makeTemplate());
    render(<MyRoutines />);

    expect(screen.getByText('Dopamina 78')).toBeInTheDocument();
    expect(screen.getByText('24 min total')).toBeInTheDocument();
  });

  it('shows the last-used label in relative time', () => {
    // last_used hace 3 días → 'Último uso · hace 3 días'
    // daysAgoKey produce YYYY-MM-DD (parsa como medianoche UTC) → daysBetween exacto
    const threeDaysAgo = new Date(daysAgoKey(3)).toISOString();
    seedTemplates(makeTemplate({ last_used: threeDaysAgo }));
    render(<MyRoutines />);

    expect(screen.getByText(/Último uso · hace 3 días/)).toBeInTheDocument();
  });

  it('shows "Nunca usado" when the template has no last_used', () => {
    seedTemplates(makeTemplate({ last_used: undefined }));
    render(<MyRoutines />);

    expect(screen.getByText(/Último uso · Nunca usado/)).toBeInTheDocument();
  });

  it('starts the plan from the template and navigates to session', () => {
    seedTemplates(makeTemplate());
    render(<MyRoutines />);

    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));

    const state = useStore.getState();
    expect(state.view).toBe('session');
    expect(state.plan?.workout?.title).toBe('Full body express');
    expect(state.plan?.workout?.exercises).toHaveLength(2);
    expect(state.plan?.workout?.focus).toBe('full');
    // touchTemplate marca last_used
    expect(state.workoutTemplates[0].last_used).toBeDefined();
  });

  it('opens edit mode for the tapped template', () => {
    seedTemplates(makeTemplate());
    render(<MyRoutines />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    const state = useStore.getState();
    expect(state.view).toBe('create-workout');
    expect(state.editingTemplateId).toBe('tpl-1');
  });

  it('removes the template on delete', () => {
    seedTemplates(makeTemplate());
    render(<MyRoutines />);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar rutina' }));

    expect(useStore.getState().workoutTemplates).toHaveLength(0);
  });

  it('sorts templates by last_used (most recent first)', () => {
    const older = makeTemplate({
      id: 'tpl-old',
      name: 'Rutina vieja',
      last_used: new Date(daysAgoKey(10)).toISOString(),
    });
    const newer = makeTemplate({
      id: 'tpl-new',
      name: 'Rutina reciente',
      last_used: new Date(daysAgoKey(1)).toISOString(),
    });
    seedTemplates(older, newer);
    render(<MyRoutines />);

    // getAllByText devuelve en orden de documento: la más reciente va primero
    const names = screen.getAllByText(/Rutina /);
    expect(names[0]).toHaveTextContent('Rutina reciente');
    expect(names[1]).toHaveTextContent('Rutina vieja');
  });
});
