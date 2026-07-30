import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MotivationSelector } from '../motivation-selector';

describe('MotivationSelector', () => {
  it('renders all three motivation options', () => {
    render(<MotivationSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByText(/recuperación 78/i)).toBeInTheDocument();
    expect(screen.getByText(/chispa se enciende/i)).toBeInTheDocument();
    expect(screen.getByText(/sin prisa/i)).toBeInTheDocument();
  });

  it('shows the section title', () => {
    render(<MotivationSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByText(/qué mensaje te motiva más/i)).toBeInTheDocument();
  });

  it('shows the learning badge', () => {
    render(<MotivationSelector value={null} onChange={vi.fn()} />);
    expect(screen.getByText('el motor aprende')).toBeInTheDocument();
  });

  it('renders the data option with BarChart3 icon content', () => {
    render(<MotivationSelector value={null} onChange={vi.fn()} />);
    const dataBtn = screen.getByText(/recuperación 78/i).closest('button');
    expect(dataBtn?.innerHTML).toContain('Recuperación 78%');
    expect(dataBtn?.innerHTML).toContain('Consistencia 69%');
  });

  it('renders the energy option with Flame icon content', () => {
    render(<MotivationSelector value={null} onChange={vi.fn()} />);
    const energyBtn = screen.getByText(/chispa se enciende/i).closest('button');
    expect(energyBtn?.innerHTML).toContain('La chispa se enciende');
  });

  it('renders the calm option with Wind icon content', () => {
    render(<MotivationSelector value={null} onChange={vi.fn()} />);
    const calmBtn = screen.getByText(/sin prisa/i).closest('button');
    expect(calmBtn?.innerHTML).toContain('Sin prisa');
    expect(calmBtn?.innerHTML).toContain('A tu ritmo');
  });

  it('applies selected style to the current value', () => {
    render(<MotivationSelector value="data" onChange={vi.fn()} />);
    const dataBtn = screen.getByText(/recuperación 78/i).closest('button');
    expect(dataBtn?.className).toContain('border-[#ffb454]');
  });

  it('does not apply selected style to unselected options', () => {
    render(<MotivationSelector value="data" onChange={vi.fn()} />);
    const energyBtn = screen.getByText(/chispa se enciende/i).closest('button');
    const calmBtn = screen.getByText(/sin prisa/i).closest('button');
    expect(energyBtn?.className).not.toContain('border-[#ffb454]');
    expect(calmBtn?.className).not.toContain('border-[#ffb454]');
  });

  it('calls onChange with "data" when data option is clicked', () => {
    const onChange = vi.fn();
    render(<MotivationSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText(/recuperación 78/i));
    expect(onChange).toHaveBeenCalledWith('data');
  });

  it('calls onChange with "energy" when energy option is clicked', () => {
    const onChange = vi.fn();
    render(<MotivationSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText(/chispa se enciende/i));
    expect(onChange).toHaveBeenCalledWith('energy');
  });

  it('calls onChange with "calm" when calm option is clicked', () => {
    const onChange = vi.fn();
    render(<MotivationSelector value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText(/sin prisa/i));
    expect(onChange).toHaveBeenCalledWith('calm');
  });

  it('maintains visual selection when value updates', () => {
    const { rerender } = render(<MotivationSelector value="energy" onChange={vi.fn()} />);
    expect(screen.getByText(/chispa se enciende/i).closest('button')?.className).toContain('border-[#ffb454]');

    rerender(<MotivationSelector value="calm" onChange={vi.fn()} />);
    expect(screen.getByText(/sin prisa/i).closest('button')?.className).toContain('border-[#ffb454]');
    expect(screen.getByText(/chispa se enciende/i).closest('button')?.className).not.toContain('border-[#ffb454]');
  });

  it('renders all three options as buttons', () => {
    render(<MotivationSelector value={null} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });
});
