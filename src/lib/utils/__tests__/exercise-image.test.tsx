/**
 * Unit tests for the ExerciseImage component (exercise-visuals.tsx).
 *
 * Covers the <img> rendering path, the icon-fallback path (no src / load
 * error), and the error-state reset when `src` changes (so reusing the
 * component across exercises never keeps a stale broken-image state).
 *
 * NOTE: we query the <img> via document.querySelector instead of
 * getByRole('img') because the component defaults to alt='' — an image
 * with an empty alt is presentational in the accessibility tree, so
 * getByRole('img') would not find it (same convention as
 * exercise-catalog-visuals.test.tsx).
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseImage } from '../exercise-visuals';

/** Simple fallback so we can assert on it without Lucide internals */
function FallbackIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      data-testid="fallback-icon"
      data-size={size}
      data-class={className}
    />
  );
}

/** The rendered <img> element (or null when the fallback is showing) */
const imgEl = () => document.querySelector('img');

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

describe('ExerciseImage', () => {
  it('renders an <img> with the resolved src when src is provided', () => {
    render(<ExerciseImage src={`${BASE}Squat/0.jpg`} fallbackIcon={FallbackIcon} />);

    expect(imgEl()).toBeInTheDocument();
    expect(imgEl()).toHaveAttribute('src', `${BASE}Squat/0.jpg`);
    expect(screen.queryByTestId('fallback-icon')).not.toBeInTheDocument();
  });

  it('sets loading="lazy" and the alt text', () => {
    render(<ExerciseImage src="/x.jpg" fallbackIcon={FallbackIcon} alt="Sentadilla" />);

    expect(imgEl()).toHaveAttribute('loading', 'lazy');
    expect(imgEl()).toHaveAttribute('alt', 'Sentadilla');
  });

  it('renders the fallback icon when src is null', () => {
    render(<ExerciseImage src={null} fallbackIcon={FallbackIcon} />);

    expect(imgEl()).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback-icon')).toBeInTheDocument();
  });

  it('renders the fallback icon when src is an empty string', () => {
    render(<ExerciseImage src="" fallbackIcon={FallbackIcon} />);

    expect(imgEl()).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback-icon')).toBeInTheDocument();
  });

  it('switches to the fallback icon when the image fails to load', () => {
    render(<ExerciseImage src="/broken.jpg" fallbackIcon={FallbackIcon} />);

    expect(imgEl()).toBeInTheDocument();

    fireEvent.error(imgEl()!);

    expect(imgEl()).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback-icon')).toBeInTheDocument();
  });

  it('keeps showing the fallback after an error (no flash back to the broken img)', () => {
    const { rerender } = render(<ExerciseImage src="/broken.jpg" fallbackIcon={FallbackIcon} />);
    fireEvent.error(imgEl()!);

    rerender(<ExerciseImage src="/broken.jpg" fallbackIcon={FallbackIcon} />);

    expect(imgEl()).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback-icon')).toBeInTheDocument();
  });

  it('resets the error state when src changes to a new image', () => {
    const { rerender } = render(<ExerciseImage src="/broken.jpg" fallbackIcon={FallbackIcon} />);
    fireEvent.error(imgEl()!);
    expect(screen.getByTestId('fallback-icon')).toBeInTheDocument();

    // Different src → internal error must reset and render the new image
    rerender(<ExerciseImage src="/new.jpg" fallbackIcon={FallbackIcon} />);

    expect(screen.queryByTestId('fallback-icon')).not.toBeInTheDocument();
    expect(imgEl()).toHaveAttribute('src', '/new.jpg');
  });

  it('passes size to the fallback icon and className to the wrapper div', () => {
    const { container } = render(
      <ExerciseImage src={null} fallbackIcon={FallbackIcon} size={32} className="rounded" />
    );

    const icon = screen.getByTestId('fallback-icon');
    expect(icon).toHaveAttribute('data-size', '32');
    // className lands on the wrapper div, not the icon (icon gets the grey tint)
    expect(container.querySelector('div.rounded')).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-class', 'text-[var(--muted)]');
  });

  it('applies imgClassName to the rendered image', () => {
    render(<ExerciseImage src="/x.jpg" fallbackIcon={FallbackIcon} imgClassName="object-cover" />);

    expect(imgEl()).toHaveClass('object-cover');
  });
});
