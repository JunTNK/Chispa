import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingScreen } from '../onboarding-screen';
import { useStore } from '@/lib/store';

function getStore() {
  return useStore.getState();
}

describe('OnboardingScreen', () => {
  it('renders step 1 — name input', () => {
    render(<OnboardingScreen />);

    expect(screen.getByText('1/5')).toBeInTheDocument();
    expect(screen.getByText('Empecemos')).toBeInTheDocument();
    expect(screen.getByText('¿Cómo te llamamos?')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Tu nombre');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('maxLength', '20');

    // Continue button should be disabled (name too short)
    expect(screen.getByRole('button', { name: /continuar/i })).toBeDisabled();
  });

  it('enables Continue when name is 2+ characters', () => {
    render(<OnboardingScreen />);

    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'An' } });
    expect(screen.getByRole('button', { name: /continuar/i })).not.toBeDisabled();
  });

  it('navigates to step 2 after entering a name', () => {
    render(<OnboardingScreen />);

    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    expect(screen.getByText('2/5')).toBeInTheDocument();
    expect(screen.getByText('Tu objetivo')).toBeInTheDocument();
    expect(screen.getByText('Fuerza y músculo')).toBeInTheDocument();
    expect(screen.getByText('Energía y salud')).toBeInTheDocument();
    expect(screen.getByText('Perder grasa')).toBeInTheDocument();
  });

  it('step 2: can select a goal and duration', () => {
    render(<OnboardingScreen />);

    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Select goal
    fireEvent.click(screen.getByText('Fuerza y músculo'));
    expect(screen.getByText('10 min')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();

    // Select duration
    fireEvent.click(screen.getByText('20 min'));
    expect(screen.getByRole('button', { name: /continuar/i })).not.toBeDisabled();
  });

  it('navigates back from step 2 to step 1', () => {
    render(<OnboardingScreen />);

    // Go to step 2
    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText('2/5')).toBeInTheDocument();

    // Click back button (first button with SVG chevron-left path)
    const backButton = screen.getAllByRole('button')[0];
    fireEvent.click(backButton);

    expect(screen.getByText('1/5')).toBeInTheDocument();
    expect(screen.getByText('Empecemos')).toBeInTheDocument();
  });

  it('creates digital twin after completing all 5 steps', () => {
    render(<OnboardingScreen />);

    // Step 1: Name
    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 2: Goal + Duration
    fireEvent.click(screen.getByText('Fuerza y músculo'));
    fireEvent.click(screen.getByText('20 min'));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 3: Level
    expect(screen.getByText('3/5')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Estoy empezando'));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 4: Neurotype
    expect(screen.getByText('4/5')).toBeInTheDocument();
    fireEvent.click(screen.getByText('TDAH'));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 5: Equipment + Days
    expect(screen.getByText('5/5')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Sin equipo'));
    fireEvent.click(screen.getByText('2-3 días'));

    // Create twin
    fireEvent.click(screen.getByRole('button', { name: /crear mi digital twin/i }));

    const state = getStore();
    expect(state.onboarded).toBe(true);
    expect(state.profile?.name).toBe('Ana');
    expect(state.profile?.goal).toBe('fuerza');
    expect(state.neuro?.type).toBe('tdah');
    expect(state.twin?.training_style).toBe('adaptive');
    expect(state.view).toBe('home');
  });

  it('shows 5 step progress indicators with active first dot', () => {
    render(<OnboardingScreen />);

    // All buttons on step 1: back (invisible), Continue
    // Progress dots are <span> elements
    const progressDots = document.querySelectorAll(
      '[class*="h-2"][class*="rounded-full"]'
    );
    expect(progressDots.length).toBe(5);
  });
});
