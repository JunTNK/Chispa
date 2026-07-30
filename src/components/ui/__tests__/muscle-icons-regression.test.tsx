/**
 * Regression tests for muscle-icons.tsx — structural integrity verification.
 *
 * Unlike the snapshot tests (which compare against a stored .snap file),
 * these tests assert explicit structural invariants about each icon's
 * rendered SVG output.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  FullBodyIcon,
  UpperBodyIcon,
  LowerBodyIcon,
  CoreCardioIcon,
} from '@/components/ui/muscle-icons';

// ═══════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════

function getSvg(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('No <svg> element found in rendered output');
  return svg;
}

function elementCounts(svg: SVGSVGElement) {
  const count = (tag: string) => svg.querySelectorAll(tag).length;
  return { path: count('path'), circle: count('circle'), rect: count('rect'), line: count('line') };
}

// ═══════════════════════════════════════════════════════════════
//  FullBodyIcon — stretching figure (4 paths)
// ═══════════════════════════════════════════════════════════════

describe('FullBodyIcon — regression', () => {
  it('renders an SVG element', () => {
    const { container } = render(<FullBodyIcon />);
    expect(getSvg(container)).toBeInTheDocument();
  });

  it('has the correct element structure (4 paths)', () => {
    const { container } = render(<FullBodyIcon />);
    expect(elementCounts(getSvg(container))).toEqual({ path: 4, circle: 0, rect: 0, line: 0 });
  });

  it('has correct SVG-level attributes (decorative mode, strokeWidth 2)', () => {
    const { container } = render(<FullBodyIcon />);
    const svg = getSvg(container);
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2');
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('has the stretching head circle path', () => {
    const { container } = render(<FullBodyIcon />);
    const paths = getSvg(container).querySelectorAll('path');
    const headPath = paths[0].getAttribute('d')!;
    expect(headPath).toContain('M16 5.5');
  });

  it('does not contain unexpected element types', () => {
    const { container } = render(<FullBodyIcon />);
    const svg = getSvg(container);
    expect(svg.querySelectorAll('circle').length).toBe(0);
    expect(svg.querySelectorAll('rect').length).toBe(0);
    expect(svg.querySelectorAll('line').length).toBe(0);
    expect(svg.querySelectorAll('ellipse').length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
//  UpperBodyIcon — six-pack / torso (6 paths)
// ═══════════════════════════════════════════════════════════════

describe('UpperBodyIcon — regression', () => {
  it('has the correct element structure (6 paths)', () => {
    const { container } = render(<UpperBodyIcon />);
    expect(elementCounts(getSvg(container))).toEqual({ path: 6, circle: 0, rect: 0, line: 0 });
  });

  it('has correct SVG-level attributes (decorative mode, strokeWidth 2)', () => {
    const { container } = render(<UpperBodyIcon />);
    const svg = getSvg(container);
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2');
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('has the arm/shoulder path starting with M22', () => {
    const { container } = render(<UpperBodyIcon />);
    const paths = getSvg(container).querySelectorAll('path');
    const armPath = paths[0].getAttribute('d')!;
    expect(armPath).toContain('M22 4');
  });

  it('does not contain unexpected element types', () => {
    const { container } = render(<UpperBodyIcon />);
    const svg = getSvg(container);
    expect(svg.querySelectorAll('circle').length).toBe(0);
    expect(svg.querySelectorAll('rect').length).toBe(0);
    expect(svg.querySelectorAll('line').length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
//  LowerBodyIcon — leg (3 paths)
// ═══════════════════════════════════════════════════════════════

describe('LowerBodyIcon — regression', () => {
  it('has the correct element structure (3 paths)', () => {
    const { container } = render(<LowerBodyIcon />);
    expect(elementCounts(getSvg(container))).toEqual({ path: 3, circle: 0, rect: 0, line: 0 });
  });

  it('has correct SVG-level attributes (decorative mode, strokeWidth 2)', () => {
    const { container } = render(<LowerBodyIcon />);
    const svg = getSvg(container);
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2');
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('has the leg path starting with M5.00183 2', () => {
    const { container } = render(<LowerBodyIcon />);
    const paths = getSvg(container).querySelectorAll('path');
    const legPath = paths[0].getAttribute('d')!;
    expect(legPath).toContain('M5.00183 2');
  });

  it('does not contain unexpected element types', () => {
    const { container } = render(<LowerBodyIcon />);
    const svg = getSvg(container);
    expect(svg.querySelectorAll('circle').length).toBe(0);
    expect(svg.querySelectorAll('rect').length).toBe(0);
    expect(svg.querySelectorAll('line').length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
//  CoreCardioIcon — heart (1 path)
// ═══════════════════════════════════════════════════════════════

describe('CoreCardioIcon — regression', () => {
  it('has the correct element structure (1 path)', () => {
    const { container } = render(<CoreCardioIcon />);
    expect(elementCounts(getSvg(container))).toEqual({ path: 1, circle: 0, rect: 0, line: 0 });
  });

  it('has correct SVG-level attributes (decorative mode, strokeWidth 2)', () => {
    const { container } = render(<CoreCardioIcon />);
    const svg = getSvg(container);
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2');
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('renders the heart path', () => {
    const { container } = render(<CoreCardioIcon />);
    const path = getSvg(container).querySelector('path')!;
    const d = path.getAttribute('d')!;
    expect(d).toContain('M12 21.35');
    expect(d.endsWith('z')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
//  Cross-icon structural invariants
// ═══════════════════════════════════════════════════════════════

describe('All icons — cross-cutting regression', () => {
  it('all render decorative by default (aria-hidden)', () => {
    for (const Icon of [FullBodyIcon, UpperBodyIcon, LowerBodyIcon, CoreCardioIcon]) {
      const { container } = render(<Icon />);
      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('all render with fill="none"', () => {
    for (const Icon of [FullBodyIcon, UpperBodyIcon, LowerBodyIcon, CoreCardioIcon]) {
      const { container } = render(<Icon />);
      expect(container.querySelector('svg')).toHaveAttribute('fill', 'none');
    }
  });

  it('all render with stroke="currentColor"', () => {
    for (const Icon of [FullBodyIcon, UpperBodyIcon, LowerBodyIcon, CoreCardioIcon]) {
      const { container } = render(<Icon />);
      expect(container.querySelector('svg')).toHaveAttribute('stroke', 'currentColor');
    }
  });

  it('all have unified 24×24 viewBox', () => {
    for (const Icon of [FullBodyIcon, UpperBodyIcon, LowerBodyIcon, CoreCardioIcon]) {
      const { container } = render(<Icon />);
      expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 24 24');
    }
  });

  it('all have default strokeWidth=2', () => {
    for (const Icon of [FullBodyIcon, UpperBodyIcon, LowerBodyIcon, CoreCardioIcon]) {
      const { container } = render(<Icon />);
      expect(container.querySelector('svg')).toHaveAttribute('stroke-width', '2');
    }
  });

  it('all apply className alongside muscle-icon base class', () => {
    for (const Icon of [FullBodyIcon, UpperBodyIcon, LowerBodyIcon, CoreCardioIcon]) {
      const { container } = render(<Icon className="test-class" />);
      const svg = container.querySelector('svg')!;
      expect(svg.classList.contains('muscle-icon')).toBe(true);
      expect(svg.classList.contains('test-class')).toBe(true);
    }
  });

  it('all respect the size prop', () => {
    for (const Icon of [FullBodyIcon, UpperBodyIcon, LowerBodyIcon, CoreCardioIcon]) {
      const { container } = render(<Icon size={96} />);
      const svg = container.querySelector('svg')!;
      expect(svg).toHaveAttribute('width', '96');
      expect(svg).toHaveAttribute('height', '96');
    }
  });

  it('all render non-empty SVG content', () => {
    for (const Icon of [FullBodyIcon, UpperBodyIcon, LowerBodyIcon, CoreCardioIcon]) {
      const { container } = render(<Icon />);
      const svg = container.querySelector('svg')!;
      expect(svg.innerHTML.trim().length).toBeGreaterThan(30);
    }
  });
});
