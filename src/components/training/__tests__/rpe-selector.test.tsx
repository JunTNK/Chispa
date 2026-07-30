import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RpeSelector } from '../rpe-selector';

describe('RpeSelector', () => {
  it('renders all three RPE options', () => {
    render(<RpeSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByText('Suave')).toBeInTheDocument();
    expect(screen.getByText('Justo')).toBeInTheDocument();
    expect(screen.getByText('Duro')).toBeInTheDocument();
  });

  it('renders descriptions for each option', () => {
    render(<RpeSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByText('Podría más')).toBeInTheDocument();
    expect(screen.getByText('Al punto')).toBeInTheDocument();
    expect(screen.getByText('Me costó')).toBeInTheDocument();
  });

  it('displays the question title', () => {
    render(<RpeSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByText('¿Cómo de exigente fue?')).toBeInTheDocument();
  });

  it('applies selected style to the current value', () => {
    render(<RpeSelector value="justo" onChange={vi.fn()} />);
    const justoBtn = screen.getByText('Justo').closest('button');
    expect(justoBtn?.className).toContain('border-[#ffb454]');
  });

  it('does not apply selected style to unselected options', () => {
    render(<RpeSelector value="justo" onChange={vi.fn()} />);
    const suaveBtn = screen.getByText('Suave').closest('button');
    const duroBtn = screen.getByText('Duro').closest('button');
    expect(suaveBtn?.className).not.toContain('border-[#ffb454]');
    expect(duroBtn?.className).not.toContain('border-[#ffb454]');
  });

  it('calls onChange with correct value when suave is clicked', () => {
    const onChange = vi.fn();
    render(<RpeSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('Suave'));
    expect(onChange).toHaveBeenCalledWith('suave');
  });

  it('calls onChange with correct value when justo is clicked', () => {
    const onChange = vi.fn();
    render(<RpeSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('Justo'));
    expect(onChange).toHaveBeenCalledWith('justo');
  });

  it('calls onChange with correct value when duro is clicked', () => {
    const onChange = vi.fn();
    render(<RpeSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('Duro'));
    expect(onChange).toHaveBeenCalledWith('duro');
  });

  it('maintains visual selection when value changes', () => {
    const { rerender } = render(<RpeSelector value="suave" onChange={vi.fn()} />);
    expect(screen.getByText('Suave').closest('button')?.className).toContain('border-[#ffb454]');

    rerender(<RpeSelector value="duro" onChange={vi.fn()} />);
    expect(screen.getByText('Duro').closest('button')?.className).toContain('border-[#ffb454]');
    expect(screen.getByText('Suave').closest('button')?.className).not.toContain('border-[#ffb454]');
  });

  it('renders all options as buttons', () => {
    render(<RpeSelector value={null} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });
});
