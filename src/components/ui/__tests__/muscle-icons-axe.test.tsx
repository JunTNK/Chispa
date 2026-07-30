/**
 * axe-core accessibility tests for muscle-icons.tsx v2 — dual accessibility.
 *
 * Tests both modes:
 * 1. Meaningful (with `title` prop) → role="img" + <title>
 * 2. Decorative (without `title` prop) → aria-hidden="true"
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import {
  FullBodyIcon,
  UpperBodyIcon,
  LowerBodyIcon,
  CoreCardioIcon,
} from '@/components/ui/muscle-icons';

async function expectNoViolations(container: HTMLElement) {
  const results = await axe(container, {
    runOnly: ['wcag2a', 'wcag2aa'],
  });
  if (results.violations.length > 0) {
    const desc = results.violations
      .map((v) => `${v.id}: ${v.description}`)
      .join('; ');
    expect(results.violations, desc).toHaveLength(0);
  }
}

// ═══════════════════════════════════════════════════════════════
//  Meaningful mode (with title)
// ═══════════════════════════════════════════════════════════════

describe('FullBodyIcon — meaningful mode (title prop)', () => {
  it('has zero axe violations', async () => {
    const { container } = render(<FullBodyIcon title="Todo el cuerpo" />);
    await expectNoViolations(container);
  });

  it('has zero axe violations with large size', async () => {
    const { container } = render(
      <FullBodyIcon title="Todo el cuerpo" size={80} />,
    );
    await expectNoViolations(container);
  });
});

describe('UpperBodyIcon — meaningful mode', () => {
  it('has zero axe violations', async () => {
    const { container } = render(<UpperBodyIcon title="Tren superior" />);
    await expectNoViolations(container);
  });
});

describe('LowerBodyIcon — meaningful mode', () => {
  it('has zero axe violations', async () => {
    const { container } = render(<LowerBodyIcon title="Tren inferior" />);
    await expectNoViolations(container);
  });
});

describe('CoreCardioIcon — meaningful mode', () => {
  it('has zero axe violations', async () => {
    const { container } = render(<CoreCardioIcon title="Core y cardio" />);
    await expectNoViolations(container);
  });

  it('has zero axe violations with large size', async () => {
    const { container } = render(
      <CoreCardioIcon title="Core y cardio" size={100} />,
    );
    await expectNoViolations(container);
  });
});

// ═══════════════════════════════════════════════════════════════
//  Decorative mode (no title)
// ═══════════════════════════════════════════════════════════════

describe('FullBodyIcon — decorative mode (no title)', () => {
  it('has zero axe violations', async () => {
    const { container } = render(<FullBodyIcon />);
    await expectNoViolations(container);
  });
});

describe('UpperBodyIcon — decorative mode', () => {
  it('has zero axe violations', async () => {
    const { container } = render(<UpperBodyIcon />);
    await expectNoViolations(container);
  });
});

describe('LowerBodyIcon — decorative mode', () => {
  it('has zero axe violations', async () => {
    const { container } = render(<LowerBodyIcon />);
    await expectNoViolations(container);
  });
});

describe('CoreCardioIcon — decorative mode', () => {
  it('has zero axe violations', async () => {
    const { container } = render(<CoreCardioIcon />);
    await expectNoViolations(container);
  });
});

// ═══════════════════════════════════════════════════════════════
//  Combined: all 4 icons, both modes
// ═══════════════════════════════════════════════════════════════

describe('All icons combined — a11y', () => {
  it('zero axe violations with all 4 meaningful', async () => {
    const { container } = render(
      <div>
        <FullBodyIcon title="Todo el cuerpo" />
        <UpperBodyIcon title="Tren superior" />
        <LowerBodyIcon title="Tren inferior" />
        <CoreCardioIcon title="Core y cardio" />
      </div>,
    );
    await expectNoViolations(container);
  });

  it('zero axe violations with all 4 decorative', async () => {
    const { container } = render(
      <div>
        <FullBodyIcon />
        <UpperBodyIcon />
        <LowerBodyIcon />
        <CoreCardioIcon />
      </div>,
    );
    await expectNoViolations(container);
  });

  it('zero axe violations with mixed modes', async () => {
    const { container } = render(
      <div>
        <FullBodyIcon title="Todo el cuerpo" />
        <UpperBodyIcon />
        <LowerBodyIcon title="Tren inferior" />
        <CoreCardioIcon />
      </div>,
    );
    await expectNoViolations(container);
  });
});
