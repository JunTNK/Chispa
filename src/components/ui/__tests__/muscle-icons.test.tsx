/**
 * Unit tests for muscle-icons.tsx v2 — fitness line-art SVG icons.
 *
 * Tests rendering, accessibility (dual mode), sizing, forwardRef,
 * animated draw-on, and viewBox correctness.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import {
  FullBodyIcon,
  UpperBodyIcon,
  LowerBodyIcon,
  CoreCardioIcon,
  MuscleGroupIcon,
  MUSCLE_GROUPS,
} from '@/components/ui/muscle-icons';
import type { MuscleGroupKey } from '@/components/ui/muscle-icons';

// ═══════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════

function querySvg(container: HTMLElement): SVGSVGElement | null {
  return container.querySelector('svg');
}

// ═══════════════════════════════════════════════════════════════
//  FullBodyIcon
// ═══════════════════════════════════════════════════════════════

describe('FullBodyIcon', () => {
  it('renders an SVG element', () => {
    const { container } = render(<FullBodyIcon />);
    expect(querySvg(container)).toBeInTheDocument();
  });

  it('is meaningful (role="img") when title prop is provided', () => {
    const { container } = render(<FullBodyIcon title="Todo el cuerpo" />);
    const svg = querySvg(container)!;
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-labelledby');
    expect(svg.querySelector('title')).toBeTruthy();
  });

  it('is decorative (aria-hidden) when no title prop', () => {
    const { container } = render(<FullBodyIcon />);
    const svg = querySvg(container)!;
    expect(svg).not.toHaveAttribute('role');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('uses 24×24 viewBox', () => {
    const { container } = render(<FullBodyIcon />);
    expect(querySvg(container)).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('accepts a custom size', () => {
    const { container } = render(<FullBodyIcon size={48} />);
    const svg = querySvg(container)!;
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
  });

  it('applies className to the SVG', () => {
    const { container } = render(<FullBodyIcon className="test-class" />);
    const svg = querySvg(container)!;
    expect(svg.classList.contains('test-class')).toBe(true);
  });

  it('always has muscle-icon base class', () => {
    const { container } = render(<FullBodyIcon />);
    const svg = querySvg(container)!;
    expect(svg.classList.contains('muscle-icon')).toBe(true);
  });

  it('renders 4 paths (stretching figure)', () => {
    const { container } = render(<FullBodyIcon />);
    expect(container.querySelectorAll('path').length).toBe(4);
  });

  it('does not render circles, rects, or lines', () => {
    const { container } = render(<FullBodyIcon />);
    expect(container.querySelectorAll('circle').length).toBe(0);
    expect(container.querySelectorAll('rect').length).toBe(0);
    expect(container.querySelectorAll('line').length).toBe(0);
  });

  it('default size is 28', () => {
    const { container } = render(<FullBodyIcon />);
    expect(querySvg(container)).toHaveAttribute('width', '28');
    expect(querySvg(container)).toHaveAttribute('height', '28');
  });

  it('default strokeWidth is 2', () => {
    const { container } = render(<FullBodyIcon />);
    expect(querySvg(container)).toHaveAttribute('stroke-width', '2');
  });

  it('accepts strokeWidth override', () => {
    const { container } = render(<FullBodyIcon strokeWidth={4} />);
    expect(querySvg(container)).toHaveAttribute('stroke-width', '4');
  });

  it('accepts animated prop (adds is-draw class)', () => {
    const { container } = render(<FullBodyIcon animated />);
    const svg = querySvg(container)!;
    expect(svg.classList.contains('is-draw')).toBe(true);
  });

  it('forwards ref to the SVG element', () => {
    const ref = React.createRef<SVGSVGElement>();
    render(<FullBodyIcon ref={ref} />);
    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });
});

// ═══════════════════════════════════════════════════════════════
//  UpperBodyIcon
// ═══════════════════════════════════════════════════════════════

describe('UpperBodyIcon', () => {
  it('renders an SVG element', () => {
    const { container } = render(<UpperBodyIcon />);
    expect(querySvg(container)).toBeInTheDocument();
  });

  it('is meaningful with title, decorative without', () => {
    const { container: c1 } = render(<UpperBodyIcon title="Tren superior" />);
    expect(c1.querySelector('svg')).toHaveAttribute('role', 'img');
    const { container: c2 } = render(<UpperBodyIcon />);
    expect(c2.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses 24×24 viewBox', () => {
    const { container } = render(<UpperBodyIcon />);
    expect(querySvg(container)).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('accepts a custom size', () => {
    const { container } = render(<UpperBodyIcon size={64} />);
    expect(querySvg(container)).toHaveAttribute('width', '64');
    expect(querySvg(container)).toHaveAttribute('height', '64');
  });

  it('renders 6 paths (six-pack/torso figure)', () => {
    const { container } = render(<UpperBodyIcon />);
    expect(container.querySelectorAll('path').length).toBe(6);
  });

  it('default size is 28', () => {
    const { container } = render(<UpperBodyIcon />);
    expect(querySvg(container)).toHaveAttribute('width', '28');
    expect(querySvg(container)).toHaveAttribute('height', '28');
  });

  it('default strokeWidth is 2', () => {
    const { container } = render(<UpperBodyIcon />);
    expect(querySvg(container)).toHaveAttribute('stroke-width', '2');
  });

  it('forwards ref', () => {
    const ref = React.createRef<SVGSVGElement>();
    render(<UpperBodyIcon ref={ref} />);
    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });
});

// ═══════════════════════════════════════════════════════════════
//  LowerBodyIcon
// ═══════════════════════════════════════════════════════════════

describe('LowerBodyIcon', () => {
  it('renders an SVG element', () => {
    const { container } = render(<LowerBodyIcon />);
    expect(querySvg(container)).toBeInTheDocument();
  });

  it('has correct accessibility in both modes', () => {
    const { container: c1 } = render(<LowerBodyIcon title="Tren inferior" />);
    expect(c1.querySelector('svg')).toHaveAttribute('role', 'img');
    const { container: c2 } = render(<LowerBodyIcon />);
    expect(c2.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses 24×24 viewBox', () => {
    const { container } = render(<LowerBodyIcon />);
    expect(querySvg(container)).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('renders 3 paths (leg figure)', () => {
    const { container } = render(<LowerBodyIcon />);
    expect(container.querySelectorAll('path').length).toBe(3);
  });

  it('default size is 28', () => {
    const { container } = render(<LowerBodyIcon />);
    expect(querySvg(container)).toHaveAttribute('width', '28');
    expect(querySvg(container)).toHaveAttribute('height', '28');
  });

  it('default strokeWidth is 2', () => {
    const { container } = render(<LowerBodyIcon />);
    expect(querySvg(container)).toHaveAttribute('stroke-width', '2');
  });
});

// ═══════════════════════════════════════════════════════════════
//  CoreCardioIcon
// ═══════════════════════════════════════════════════════════════

describe('CoreCardioIcon', () => {
  it('renders an SVG element', () => {
    const { container } = render(<CoreCardioIcon />);
    expect(querySvg(container)).toBeInTheDocument();
  });

  it('has correct accessibility in both modes', () => {
    const { container: c1 } = render(<CoreCardioIcon title="Core y cardio" />);
    expect(c1.querySelector('svg')).toHaveAttribute('role', 'img');
    const { container: c2 } = render(<CoreCardioIcon />);
    expect(c2.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses 24×24 viewBox', () => {
    const { container } = render(<CoreCardioIcon />);
    expect(querySvg(container)).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('renders 1 path (heart icon)', () => {
    const { container } = render(<CoreCardioIcon />);
    expect(container.querySelectorAll('path').length).toBe(1);
  });

  it('does not render rects, lines, or circles', () => {
    const { container } = render(<CoreCardioIcon />);
    expect(container.querySelectorAll('rect').length).toBe(0);
    expect(container.querySelectorAll('line').length).toBe(0);
    expect(container.querySelectorAll('circle').length).toBe(0);
  });

  it('default size is 28', () => {
    const { container } = render(<CoreCardioIcon />);
    expect(querySvg(container)).toHaveAttribute('width', '28');
    expect(querySvg(container)).toHaveAttribute('height', '28');
  });

  it('default strokeWidth is 2', () => {
    const { container } = render(<CoreCardioIcon />);
    expect(querySvg(container)).toHaveAttribute('stroke-width', '2');
  });
});

// ═══════════════════════════════════════════════════════════════
//  MuscleGroupIcon (typed registry)
// ═══════════════════════════════════════════════════════════════

describe('MuscleGroupIcon', () => {
  it('renders the correct icon for each key', () => {
    const keys: MuscleGroupKey[] = ['full', 'upper', 'lower', 'core'];
    keys.forEach((key) => {
      const { container, unmount } = render(
        <MuscleGroupIcon name={key} size={48} />,
      );
      const svg = querySvg(container)!;
      expect(svg).toHaveAttribute('width', '48');
      expect(svg).toHaveAttribute('height', '48');
      unmount();
    });
  });

  it('passes extra props to the underlying icon', () => {
    const { container } = render(
      <MuscleGroupIcon name="full" title="Test" animated />,
    );
    const svg = querySvg(container)!;
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg.classList.contains('is-draw')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
//  MUSCLE_GROUPS registry
// ═══════════════════════════════════════════════════════════════

describe('MUSCLE_GROUPS registry', () => {
  it('contains all 4 muscle groups', () => {
    expect(Object.keys(MUSCLE_GROUPS)).toEqual(['full', 'upper', 'lower', 'core']);
  });

  it('each entry has label and renders without error', () => {
    Object.values(MUSCLE_GROUPS).forEach((entry) => {
      expect(entry.label).toBeTruthy();
      expect(entry.Icon).toBeTruthy();
      const { container } = render(<entry.Icon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});
