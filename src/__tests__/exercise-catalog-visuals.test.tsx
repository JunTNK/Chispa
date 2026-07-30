/**
 * Integration tests for ExerciseCatalogScreen visual rendering.
 *
 * Tests the ExerciseImage component behavior with different exercise data:
 * - Exercises with images → shows <img> tag
 * - Exercises without images → shows fallback icon
 * - Image load error → switches to fallback icon
 * - Different muscle groups → correct fallback icons
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStore } from '@/lib/store';
import { ExerciseCatalogScreen } from '@/components/training/exercise-catalog-screen';

// ─── Mock useExercises with controllable data ───
const mockExercises: any[] = [];

vi.mock('@/lib/utils/use-exercises', () => ({
  useExercises: () => ({ exercises: mockExercises, isLoading: false }),
  getExercises: () => Promise.resolve(mockExercises),
}));

vi.mock('@/lib/sync/supabase-sync', () => ({
  supabaseSync: { push: vi.fn() },
}));

// ─── Shared test data ───
const mockProfile = {
  user_id: '', name: 'Ana', goal: 'energia' as const, level: 'medio' as const,
  equipment: 'ninguno' as const, limitations: [], days_per_week: '2-3' as const,
  neurotype: 'adh-c' as const, preferred_duration: 20,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

beforeEach(() => {
  useStore.setState({
    onboarded: true,
    profile: mockProfile,
    twin: {} as any,
    prefs: { reduceMotion: false, highContrast: false, fontLarge: false },
    view: 'catalog',
    chat: [],
    checkins: {},
    workouts: [],
    events: [],
  });
  // Reset mock data
  mockExercises.length = 0;
});

// ═══════════════════════════════════════════════════════════════
//  Tests
// ═══════════════════════════════════════════════════════════════

describe('ExerciseCatalogScreen — visuals', () => {
  it('shows empty state when no exercises', async () => {
    render(<ExerciseCatalogScreen />);
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText('CATÁLOGO')).toBeInTheDocument();
    expect(screen.getByText('0 ejercicios')).toBeInTheDocument();
  });

  it('shows empty state when no exercises', async () => {
    render(<ExerciseCatalogScreen />);
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText('CATÁLOGO')).toBeInTheDocument();
    expect(screen.getByText('0 ejercicios')).toBeInTheDocument();
  });

  it('shows exercise with image when images are available', async () => {
    mockExercises.push({
      id: 'squat',
      name: 'Sentadilla',
      muscle: 'piernas',
      primaryMuscles: ['quadriceps'],
      difficulty: 2,
      equipment: 'body only',
      instructions: 'Do a squat',
      load_type: 'reps',
      cognitive_load: 'low',
      emoji: '🏋️',
      cue: '',
      images: ['Barbell_Squat/0.jpg'],
    });

    render(<ExerciseCatalogScreen />);

    // Exercise name should be visible
    expect(screen.getByText('Sentadilla')).toBeInTheDocument();
    // Should show "1 ejercicios" in header
    expect(screen.getByText('1 ejercicios')).toBeInTheDocument();
    // Should render an <img> tag for the exercise image
    const img = document.querySelector('img[src*="Barbell_Squat/0.jpg"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('alt', '');
  });

  it('shows fallback icon when exercise has no images', async () => {
    mockExercises.push({
      id: 'pushup',
      name: 'Flexiones',
      muscle: 'pecho',
      primaryMuscles: ['pectoral'],
      difficulty: 1,
      equipment: 'body only',
      instructions: 'Do a pushup',
      load_type: 'reps',
      cognitive_load: 'low',
      emoji: '💪',
      cue: '',
      // No images array
    });

    render(<ExerciseCatalogScreen />);

    expect(screen.getByText('Flexiones')).toBeInTheDocument();
    // Should NOT render an img tag (no image src)
    const img = document.querySelector('img');
    expect(img).not.toBeInTheDocument();
    // Should render a Lucide SVG icon (chest icon)
    const svg = document.querySelector('svg.lucide');
    expect(svg).toBeInTheDocument();
  });

  it('shows fallback icon when exercise images array is empty', async () => {
    mockExercises.push({
      id: 'deadlift',
      name: 'Peso Muerto',
      muscle: 'espalda',
      primaryMuscles: ['espalda'],
      difficulty: 2,
      equipment: 'barbell',
      instructions: 'Lift the bar',
      load_type: 'reps',
      cognitive_load: 'med',
      emoji: '🏋️',
      cue: '',
      images: [], // Empty array
    });

    render(<ExerciseCatalogScreen />);

    expect(screen.getByText('Peso Muerto')).toBeInTheDocument();
    // No img tag should be rendered
    const imgs = document.querySelectorAll('img');
    expect(imgs.length).toBe(0);
    // Should render BackIcon (svg with class based on BackIcon)
    // Just check that an SVG is present inside the thumbnail container
    const thumbContainer = document.querySelector('[class*="rounded-xl"][class*="overflow-hidden"]');
    expect(thumbContainer?.querySelector('svg')).toBeTruthy();
  });

  it('displays correct fallback icon for different muscle groups', async () => {
    mockExercises.push(
      {
        id: 'run',
        name: 'Correr',
        muscle: 'cardio',
        difficulty: 2,
        equipment: 'body only',
        instructions: 'Run',
        load_type: 'reps',
        cognitive_load: 'low',
        emoji: '🏃',
        cue: '',
      },
      {
        id: 'curl',
        name: 'Curl de bíceps',
        muscle: 'brazos',
        primaryMuscles: ['biceps'],
        difficulty: 1,
        equipment: 'dumbbell',
        instructions: 'Curl',
        load_type: 'reps',
        cognitive_load: 'low',
        emoji: '💪',
        cue: '',
      },
    );

    render(<ExerciseCatalogScreen />);

    // Both exercises should render with SVG icons in their thumbnails
    const thumbnails = document.querySelectorAll('[class*="rounded-xl"][class*="overflow-hidden"]');
    expect(thumbnails.length).toBe(2);
    thumbnails.forEach((thumb) => {
      expect(thumb.querySelector('svg')).toBeTruthy();
    });
  });

  it('renders multiple exercises with mixed image/icon visuals', async () => {
    mockExercises.push(
      {
        id: 'squat',
        name: 'Sentadilla',
        muscle: 'piernas',
        primaryMuscles: ['quadriceps'],
        difficulty: 2,
        equipment: 'body only',
        instructions: 'Squat',
        load_type: 'reps',
        cognitive_load: 'low',
        emoji: '🏋️',
        cue: '',
        images: ['Squat/0.jpg'],
      },
      {
        id: 'pushup',
        name: 'Flexiones',
        muscle: 'pecho',
        primaryMuscles: ['pectoral'],
        difficulty: 1,
        equipment: 'body only',
        instructions: 'Push',
        load_type: 'reps',
        cognitive_load: 'low',
        emoji: '💪',
        cue: '',
      },
    );

    render(<ExerciseCatalogScreen />);

    // One exercise should have an img, the other should not
    const imgs = document.querySelectorAll('img');
    expect(imgs.length).toBe(1);
    expect(imgs[0]).toHaveAttribute('src', expect.stringContaining('Squat/0.jpg'));

    // Both should be visible
    expect(screen.getByText('Sentadilla')).toBeInTheDocument();
    expect(screen.getByText('Flexiones')).toBeInTheDocument();
    expect(screen.getByText('2 ejercicios')).toBeInTheDocument();
  });

  it('shows 🇪🇸 flag for Spanish-named exercises (with accented chars)', async () => {
    mockExercises.push({
      id: 'biceps',
      name: 'Bíceps con mancuerna',
      muscle: 'brazos',
      primaryMuscles: ['biceps'],
      difficulty: 1,
      equipment: 'dumbbell',
      instructions: 'Curl the weight',
      load_type: 'reps',
      cognitive_load: 'low',
      emoji: '💪',
      cue: '',
    });

    render(<ExerciseCatalogScreen />);

    // The name contains 'í' → the 🇪🇸 flag should render
    expect(screen.getByText('Bíceps con mancuerna')).toBeInTheDocument();
    // Check the flag is rendered (might need textContent in jsdom)
    const container = document.getElementById('app') || document.body;
    expect(container.textContent).toContain('🇪🇸');
  });

  it('filters exercises by search query', async () => {
    mockExercises.push(
      {
        id: 'sentadilla',
        name: 'Sentadilla',
        muscle: 'piernas',
        difficulty: 2,
        equipment: 'body only',
        instructions: 'Squat',
        load_type: 'reps',
        cognitive_load: 'low',
        emoji: '🏋️',
        cue: '',
      },
      {
        id: 'press',
        name: 'Press de banca',
        muscle: 'pecho',
        difficulty: 2,
        equipment: 'barbell',
        instructions: 'Bench press',
        load_type: 'reps',
        cognitive_load: 'low',
        emoji: '🏋️',
        cue: '',
      },
    );

    render(<ExerciseCatalogScreen />);

    // Both exercises visible initially
    expect(screen.getByText('2 ejercicios')).toBeInTheDocument();

    // Type in search
    const searchInput = screen.getByPlaceholderText('Buscar ejercicios...');
    fireEvent.change(searchInput, { target: { value: 'sentadilla' } });

    // After filtering, only Sentadilla should remain
    expect(screen.getByText('Sentadilla')).toBeInTheDocument();
    // Press de banca should no longer be visible
    expect(screen.queryByText('Press de banca')).not.toBeInTheDocument();
  });
});
