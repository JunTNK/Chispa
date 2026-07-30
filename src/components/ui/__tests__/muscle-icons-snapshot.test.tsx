/**
 * Snapshot tests for muscle-icons.tsx v2 — fitness line-art SVG icons.
 *
 * Covers decorative mode (no title), meaningful mode (with title),
 * animated mode, and combined rendering.
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
//  FullBodyIcon
// ═══════════════════════════════════════════════════════════════

describe('FullBodyIcon — snapshot', () => {
  it('decorative (no title, default size 28)', () => {
    const { asFragment } = render(<FullBodyIcon />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('meaningful (with title)', () => {
    const { asFragment } = render(<FullBodyIcon title="Todo el cuerpo" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('custom size (64)', () => {
    const { asFragment } = render(<FullBodyIcon size={64} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('custom className', () => {
    const { asFragment } = render(<FullBodyIcon className="text-[#ffb454]" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('animated (draw-on)', () => {
    const { asFragment } = render(<FullBodyIcon animated />);
    expect(asFragment()).toMatchSnapshot();
  });
});

// ═══════════════════════════════════════════════════════════════
//  UpperBodyIcon
// ═══════════════════════════════════════════════════════════════

describe('UpperBodyIcon — snapshot', () => {
  it('decorative (no title, default size 28)', () => {
    const { asFragment } = render(<UpperBodyIcon />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('meaningful (with title)', () => {
    const { asFragment } = render(<UpperBodyIcon title="Tren superior" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('custom size (80)', () => {
    const { asFragment } = render(<UpperBodyIcon size={80} />);
    expect(asFragment()).toMatchSnapshot();
  });
});

// ═══════════════════════════════════════════════════════════════
//  LowerBodyIcon
// ═══════════════════════════════════════════════════════════════

describe('LowerBodyIcon — snapshot', () => {
  it('decorative (no title, default size 28)', () => {
    const { asFragment } = render(<LowerBodyIcon />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('meaningful (with title)', () => {
    const { asFragment } = render(<LowerBodyIcon title="Tren inferior" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('custom size with className', () => {
    const { asFragment } = render(
      <LowerBodyIcon size={36} className="text-[#ffb454]" />,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});

// ═══════════════════════════════════════════════════════════════
//  CoreCardioIcon
// ═══════════════════════════════════════════════════════════════

describe('CoreCardioIcon — snapshot', () => {
  it('decorative (no title, default size 28)', () => {
    const { asFragment } = render(<CoreCardioIcon />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('meaningful (with title)', () => {
    const { asFragment } = render(<CoreCardioIcon title="Core y cardio" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('large size (100)', () => {
    const { asFragment } = render(<CoreCardioIcon size={100} />);
    expect(asFragment()).toMatchSnapshot();
  });
});

// ═══════════════════════════════════════════════════════════════
//  Combined renders
// ═══════════════════════════════════════════════════════════════

describe('All icons — snapshot combined', () => {
  it('all 4 decorative together', () => {
    const { asFragment } = render(
      <div>
        <FullBodyIcon />
        <UpperBodyIcon />
        <LowerBodyIcon />
        <CoreCardioIcon />
      </div>,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('all 4 meaningful with className (as in create-workout cards)', () => {
    const { asFragment } = render(
      <div>
        <FullBodyIcon title="Todo el cuerpo" className="text-[#ffb454]" size={28} />
        <UpperBodyIcon title="Tren superior" className="text-[#ffb454]" size={28} />
        <LowerBodyIcon title="Tren inferior" className="text-[#ffb454]" size={28} />
        <CoreCardioIcon title="Core y cardio" className="text-[#ffb454]" size={28} />
      </div>,
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
