/**
 * Unit tests for the SkillTree component in quest-screen.tsx.
 *
 * The SkillTree renders 4 branches (Fuerza, Cardio, Movilidad, Core), each
 * with 5 exercise nodes. Nodes unlock progressively by total XP with costs
 * [0, 100, 300, 600, 1000]. Covers: branch rendering, unlock thresholds,
 * locked/unlocked icons, cost labels, catalog filtering and XP header.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkillTree, SKILL_BRANCHES } from '../quest-screen';
import type { Exercise } from '@/types';

// ─── Mock useExercises with a controllable catalog ───
const mockCatalog: Exercise[] = [];

vi.mock('@/lib/utils/use-exercises', () => ({
  useExercises: () => ({ exercises: mockCatalog, isLoading: false }),
  getExercises: () => Promise.resolve(mockCatalog),
}));

/** Build a minimal catalog entry for a SkillTree exercise id */
function makeEx(id: string, name: string): Exercise {
  return {
    id,
    name,
    muscle: 'core',
    difficulty: 2,
    equipment: 'body only',
    instructions: '...',
    load_type: 'reps',
    cognitive_load: 'low',
    emoji: '💪',
    cue: '',
  };
}

/** Populate the catalog with every exercise referenced by SKILL_BRANCHES */
function populateFullCatalog() {
  mockCatalog.length = 0;
  SKILL_BRANCHES.forEach((br) => {
    br.exercises.forEach((id, i) => {
      mockCatalog.push(makeEx(id, `Ejercicio ${br.branch} ${i + 1}`));
    });
  });
}

beforeEach(() => {
  mockCatalog.length = 0;
});

describe('SkillTree', () => {
  // NOTE: lucide-react 1.26.0 renders CheckCircle as class
  // 'lucide-circle-check-big' and Lock as 'lucide-lock' (verified via
  // renderToString) — selectors use those exact class names.

  it('renders all 4 branch titles', () => {
    populateFullCatalog();
    render(<SkillTree xp={0} />);

    expect(screen.getByText('Fuerza')).toBeInTheDocument();
    expect(screen.getByText('Cardio')).toBeInTheDocument();
    expect(screen.getByText('Movilidad')).toBeInTheDocument();
    expect(screen.getByText('Core')).toBeInTheDocument();
  });

  it('shows the XP total in the header', () => {
    populateFullCatalog();
    render(<SkillTree xp={1234} />);

    // Each branch header shows "{xp} XP"
    expect(screen.getAllByText('1234 XP').length).toBe(4);
  });

  it('renders one exercise node per catalog entry (20 total)', () => {
    populateFullCatalog();
    render(<SkillTree xp={0} />);

    // Each branch has 5 nodes → 20 nodes across 4 branches
    const nodes = document.querySelectorAll('.flex.flex-col.items-center.gap-1');
    expect(nodes.length).toBe(20);
  });

  it('at xp=0 only the first node of each branch is unlocked', () => {
    populateFullCatalog();
    render(<SkillTree xp={0} />);

    // Cost 0 → unlocked (circle-check-big); the other 4 locked (Lock) per branch
    const unlocked = document.querySelectorAll('.lucide-circle-check-big');
    const locked = document.querySelectorAll('.lucide-lock');
    expect(unlocked.length).toBe(4); // one per branch
    expect(locked.length).toBe(16); // 4 branches × 4 locked
  });

  it('at xp=100 the first two nodes of each branch are unlocked', () => {
    populateFullCatalog();
    render(<SkillTree xp={100} />);

    const unlocked = document.querySelectorAll('.lucide-circle-check-big');
    const locked = document.querySelectorAll('.lucide-lock');
    expect(unlocked.length).toBe(8); // 2 per branch
    expect(locked.length).toBe(12); // 3 per branch
  });

  it('at xp=99999 every node is unlocked', () => {
    populateFullCatalog();
    render(<SkillTree xp={99999} />);

    const unlocked = document.querySelectorAll('.lucide-circle-check-big');
    const locked = document.querySelectorAll('.lucide-lock');
    expect(unlocked.length).toBe(20);
    expect(locked.length).toBe(0);
  });

  it('shows the XP cost label on locked nodes', () => {
    populateFullCatalog();
    render(<SkillTree xp={0} />);

    // Costs 100, 300, 600, 1000 appear once per branch (4 branches each)
    expect(screen.getAllByText('100 XP').length).toBe(4);
    expect(screen.getAllByText('300 XP').length).toBe(4);
    expect(screen.getAllByText('600 XP').length).toBe(4);
    expect(screen.getAllByText('1000 XP').length).toBe(4);
  });

  it('shows a checkmark on unlocked nodes', () => {
    populateFullCatalog();
    render(<SkillTree xp={99999} />);

    // 20 unlocked nodes → 20 ✓ marks
    expect(screen.getAllByText('✓').length).toBe(20);
  });

  it('renders the first word of each exercise name', () => {
    populateFullCatalog();
    render(<SkillTree xp={0} />);

    // First branch first exercise: "Ejercicio Fuerza 1" → shows "Ejercicio"
    expect(screen.getAllByText('Ejercicio').length).toBeGreaterThan(0);
  });

  it('skips catalog ids that are missing from the exercises catalog', () => {
    // Only populate one branch's exercises, omitting the others
    mockCatalog.push(makeEx('Pushups', 'Flexiones'));
    mockCatalog.push(makeEx('Bodyweight_Squat', 'Sentadilla'));

    render(<SkillTree xp={0} />);

    // Only the Fuerza branch has nodes; the others render empty (no nodes)
    const nodes = document.querySelectorAll('.flex.flex-col.items-center.gap-1');
    expect(nodes.length).toBe(2);
    // Branch titles still render
    expect(screen.getByText('Fuerza')).toBeInTheDocument();
    expect(screen.getByText('Cardio')).toBeInTheDocument();
  });

  it('locks a node when XP is below its cost even if previous is unlocked', () => {
    populateFullCatalog();
    render(<SkillTree xp={50} />);

    // 50 XP: node 0 (cost 0) unlocked, node 1 (cost 100) locked
    const unlocked = document.querySelectorAll('.lucide-circle-check-big');
    const locked = document.querySelectorAll('.lucide-lock');
    expect(unlocked.length).toBe(4);
    expect(locked.length).toBe(16);
  });
});
