import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseMedia } from '../exercise-visuals';

describe('ExerciseMedia', () => {
  it('renders the static image with the given alt', () => {
    render(
      <ExerciseMedia
        gifUrl="/exercises/Ab_Roller/animation.gif"
        staticUrl="/exercises/Ab_Roller/0.jpg"
        alt="Ab Roller"
      />,
    );

    const img = screen.getByAltText('Ab Roller');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/exercises/Ab_Roller/0.jpg');
  });

  it('uses lazy loading by default and eager with priority', () => {
    const { rerender } = render(
      <ExerciseMedia
        gifUrl="/exercises/Ab_Roller/animation.gif"
        staticUrl="/exercises/Ab_Roller/0.jpg"
        alt="Ab Roller"
      />,
    );
    expect(screen.getByAltText('Ab Roller')).toHaveAttribute('loading', 'lazy');

    rerender(
      <ExerciseMedia
        gifUrl="/exercises/Ab_Roller/animation.gif"
        staticUrl="/exercises/Ab_Roller/0.jpg"
        alt="Ab Roller"
        priority
      />,
    );
    expect(screen.getByAltText('Ab Roller')).toHaveAttribute('loading', 'eager');
  });

  it('falls back to a Dumbbell icon when the image fails to load', () => {
    render(
      <ExerciseMedia
        gifUrl="/exercises/Ab_Roller/animation.gif"
        staticUrl="/exercises/Ab_Roller/0.jpg"
        alt="Ab Roller"
      />,
    );

    fireEvent.error(screen.getByAltText('Ab Roller'));

    expect(screen.queryByAltText('Ab Roller')).not.toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('resets the error state when the static URL changes', () => {
    const { rerender } = render(
      <ExerciseMedia
        gifUrl="/exercises/Ab_Roller/animation.gif"
        staticUrl="/exercises/Ab_Roller/0.jpg"
        alt="Ab Roller"
      />,
    );

    fireEvent.error(screen.getByAltText('Ab Roller'));
    expect(screen.queryByAltText('Ab Roller')).not.toBeInTheDocument();

    rerender(
      <ExerciseMedia
        gifUrl="/exercises/Ab_Sit_Up/animation.gif"
        staticUrl="/exercises/Ab_Sit_Up/0.jpg"
        alt="Ab Roller"
      />,
    );

    const img = screen.getByAltText('Ab Roller');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/exercises/Ab_Sit_Up/0.jpg');
  });
});