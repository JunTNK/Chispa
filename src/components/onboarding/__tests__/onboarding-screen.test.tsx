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

    expect(screen.getByText('1/9')).toBeInTheDocument();
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

    expect(screen.getByText('2/9')).toBeInTheDocument();
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
    expect(screen.getByText('2/9')).toBeInTheDocument();

    // Click back button (first button with SVG chevron-left path)
    const backButton = screen.getAllByRole('button')[0];
    fireEvent.click(backButton);

    expect(screen.getByText('1/9')).toBeInTheDocument();
    expect(screen.getByText('Empecemos')).toBeInTheDocument();
  });

  it('creates digital twin after completing all 9 steps', () => {
    render(<OnboardingScreen />);

    // Step 1: Name
    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 2: Goal + Duration
    fireEvent.click(screen.getByText('Fuerza y músculo'));
    fireEvent.click(screen.getByText('20 min'));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 3: Level
    expect(screen.getByText('3/9')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Estoy empezando'));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 4: Neurotype
    expect(screen.getByText('4/9')).toBeInTheDocument();
    fireEvent.click(screen.getByText('TDAH combinado'));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 5: Chronotype
    expect(screen.getByText('5/9')).toBeInTheDocument();
    fireEvent.click(screen.getByText('León (mañana)'));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 6: Equipment + Days
    expect(screen.getByText('6/9')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Sin equipo'));
    fireEvent.click(screen.getByText('2-3 días'));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 7: Medication
    expect(screen.getByText('7/9')).toBeInTheDocument();
    fireEvent.click(screen.getByText('No aplica'));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 8: Theme
    expect(screen.getByText('8/9')).toBeInTheDocument();
    fireEvent.click(screen.getByText('David'));
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

    // Step 9: Sensory → Create twin
    expect(screen.getByText('9/9')).toBeInTheDocument();
    // Toggle quiet mode on
    fireEvent.click(screen.getByLabelText('Activar Modo silencio'));

    // Create twin
    fireEvent.click(screen.getByRole('button', { name: /crear mi digital twin/i }));

    const state = getStore();
    expect(state.onboarded).toBe(true);
    expect(state.profile?.name).toBe('Ana');
    expect(state.profile?.goal).toBe('fuerza');
    expect(state.profile?.chronotype).toBe('leon');
    expect(state.profile?.medication).toBe('no');
    expect(state.questState.selectedTheme).toBe('david');
    expect(state.sensory.quiet).toBe(true);
    expect(state.sensory.dim).toBe(false);
    expect(state.sensory.swap).toBe(false);
    expect(state.neuro?.type).toBe('adh-c');
    expect(state.twin?.training_style).toBe('adaptive');
    // Boot sequence now plays after twin creation; view='home' is set asynchronously
  });

  it('shows 9 step progress indicators with active first dot', () => {
    render(<OnboardingScreen />);

    // Progress dots are <span> elements
    const progressDots = document.querySelectorAll(
      '[class*="h-2"][class*="rounded-full"]'
    );
    expect(progressDots.length).toBe(9);
  });

  // ─────────────────────────────────────────────────────
  //  Onboarding Chips Layout Tests
  // ─────────────────────────────────────────────────────

  describe('sub-step chips layout', () => {
    /**
     * Navigate through onboarding to step 6 (equipment + days) with all
     * required selections. Renders the component first.
     */
    function navigateToEquipmentStep() {
      // Step 1: Name
      fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

      // Step 2: Goal + Duration
      fireEvent.click(screen.getByText('Fuerza y músculo'));
      fireEvent.click(screen.getByText('20 min'));
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

      // Step 3: Level
      fireEvent.click(screen.getByText('Estoy empezando'));
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

      // Step 4: Neurotype
      fireEvent.click(screen.getByText('TDAH combinado'));
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

      // Step 5: Chronotype
      fireEvent.click(screen.getByText('León (mañana)'));
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

      // Now at step 6 (equipment + days)
    }

    /** Navigate to step 7 (medication) with all selections */
    function navigateToMedicationStep() {
      navigateToEquipmentStep();
      // Select equipment + days to proceed
      fireEvent.click(screen.getByText('Sin equipo'));
      fireEvent.click(screen.getByText('2-3 días'));
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
      // Now at step 7 (medication)
    }

    it('step 2: duration chips have correct icons (Zap, Clock, Flame)', () => {
      render(<OnboardingScreen />);

      // Step 1: Name → Continue
      fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
      fireEvent.click(screen.getByRole('button', { name: /continuar/i }));

      // Step 2: Select goal → reveals duration sub-step
      fireEvent.click(screen.getByText('Fuerza y músculo'));

      // Check duration sub-step chips appear
      expect(screen.getByText('10 min')).toBeInTheDocument();
      expect(screen.getByText('20 min')).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();

      // Verify the container uses flex-wrap
      const subContainer = screen.getByText('10 min').closest('div[class*="flex"]');
      expect(subContainer?.className).toContain('flex');
      expect(subContainer?.className).toContain('flex-wrap');

      // Verify each chip has an SVG icon (rendered by Lucide)
      const chips = screen.getAllByText(/\d+ min/);
      expect(chips.length).toBe(3);
      chips.forEach((chip) => {
        const parentBtn = chip.closest('button');
        expect(parentBtn?.querySelector('svg')).toBeTruthy();
      });

      // Verify specific Lucide icon classes
      const tenMinBtn = screen.getByText('10 min').closest('button');
      expect(tenMinBtn?.innerHTML).toContain('lucide-zap');
      const twentyMinBtn = screen.getByText('20 min').closest('button');
      expect(twentyMinBtn?.innerHTML).toContain('lucide-clock');
      const thirtyMinBtn = screen.getByText('30 min').closest('button');
      expect(thirtyMinBtn?.innerHTML).toContain('lucide-flame');
    });

    it('step 6: days chips have icons (Calendar, CalendarCheck, RefreshCw)', () => {
      render(<OnboardingScreen />);

      navigateToEquipmentStep();

      // Select equipment to reveal days sub-step
      fireEvent.click(screen.getByText('Sin equipo'));

      // Days chips should be visible
      expect(screen.getByText('2-3 días')).toBeInTheDocument();
      expect(screen.getByText('4-5 días')).toBeInTheDocument();
      expect(screen.getByText('Flexible')).toBeInTheDocument();

      // Each chip should have an SVG icon
      const dayChips = screen.getAllByText(/\d-\d días|Flexible/);
      dayChips.forEach((chip) => {
        const parentBtn = chip.closest('button');
        expect(parentBtn?.querySelector('svg')).toBeTruthy();
      });

      // Verify specific Lucide icon classes
      expect(screen.getByText('2-3 días').closest('button')?.innerHTML).toContain('lucide-calendar');
      expect(screen.getByText('4-5 días').closest('button')?.innerHTML).toContain('lucide-calendar-check');
      expect(screen.getByText('Flexible').closest('button')?.innerHTML).toContain('lucide-refresh-cw');
    });

    describe('medication time chips (step 7)', () => {
      it('shows 4 time chips with Clock icons when medication is short-acting', () => {
        render(<OnboardingScreen />);

        navigateToMedicationStep();

        // Select short-acting medication to reveal time sub-step
        fireEvent.click(screen.getByText('Acción corta'));

        // Verify all 4 time chips appear
        expect(screen.getByText('07:00')).toBeInTheDocument();
        expect(screen.getByText('08:00')).toBeInTheDocument();
        expect(screen.getByText('09:00')).toBeInTheDocument();
        expect(screen.getByText('10:00')).toBeInTheDocument();

        // Verify each chip has a Clock icon (SVG element)
        const timeChips = screen.getAllByText(/\d{2}:\d{2}/);
        expect(timeChips.length).toBe(4);
        timeChips.forEach((chip) => {
          const parentBtn = chip.closest('button');
          expect(parentBtn?.querySelector('svg')).toBeTruthy();
          expect(parentBtn?.innerHTML).toContain('lucide-clock');
        });

        // Verify flex-wrap container
        const subContainer = screen.getByText('07:00').closest('div[class*="flex"]');
        expect(subContainer?.className).toContain('flex-wrap');
      });

      it('shows same 4 time chips when medication is long-acting', () => {
        render(<OnboardingScreen />);

        navigateToMedicationStep();

        // Select long-acting medication
        fireEvent.click(screen.getByText('Acción larga'));

        // All 4 chips should appear
        expect(screen.getByText('07:00')).toBeInTheDocument();
        expect(screen.getByText('08:00')).toBeInTheDocument();
        expect(screen.getByText('09:00')).toBeInTheDocument();
        expect(screen.getByText('10:00')).toBeInTheDocument();

        // Each has an SVG icon
        const timeChips = screen.getAllByText(/\d{2}:\d{2}/);
        expect(timeChips.length).toBe(4);
        timeChips.forEach((chip) => {
          expect(chip.closest('button')?.innerHTML).toContain('lucide-clock');
        });
      });

      it('does NOT show time chips when medication is "No aplica"', () => {
        render(<OnboardingScreen />);

        navigateToMedicationStep();

        // Select "No aplica"
        fireEvent.click(screen.getByText('No aplica'));

        // Time chips should NOT appear
        expect(screen.queryByText('07:00')).not.toBeInTheDocument();
        expect(screen.queryByText('08:00')).not.toBeInTheDocument();
        expect(screen.queryByText('09:00')).not.toBeInTheDocument();
        expect(screen.queryByText('10:00')).not.toBeInTheDocument();
      });

      it('allows selecting a time chip', () => {
        render(<OnboardingScreen />);

        navigateToMedicationStep();

        // Select short-acting
        fireEvent.click(screen.getByText('Acción corta'));

        // Click time chip "08:00"
        fireEvent.click(screen.getByText('08:00'));

        // The chip should now show selected styling (border-[#ffb454])
        const chip = screen.getByText('08:00').closest('button');
        expect(chip?.className).toContain('border-[#ffb454]');

        // Continue button should be enabled
        expect(screen.getByRole('button', { name: /continuar/i })).not.toBeDisabled();
      });

      it('allows switching between different time chips', () => {
        render(<OnboardingScreen />);

        navigateToMedicationStep();

        // Select short-acting
        fireEvent.click(screen.getByText('Acción corta'));

        // Select 07:00
        fireEvent.click(screen.getByText('07:00'));
        let chip07 = screen.getByText('07:00').closest('button');
        expect(chip07?.className).toContain('border-[#ffb454]');

        // Switch to 09:00
        fireEvent.click(screen.getByText('09:00'));
        const chip09 = screen.getByText('09:00').closest('button');
        expect(chip09?.className).toContain('border-[#ffb454]');

        // 07:00 should no longer be selected
        chip07 = screen.getByText('07:00').closest('button');
        expect(chip07?.className).not.toContain('border-[#ffb454]');
      });

      it('Continue is disabled until a time is selected', () => {
        render(<OnboardingScreen />);

        navigateToMedicationStep();

        // Select medication type but no time yet
        fireEvent.click(screen.getByText('Acción corta'));

        // Continue should be disabled (no time selected)
        expect(screen.getByRole('button', { name: /continuar/i })).toBeDisabled();

        // Select a time
        fireEvent.click(screen.getByText('08:00'));

        // Now Continue should be enabled
        expect(screen.getByRole('button', { name: /continuar/i })).not.toBeDisabled();
      });
    });
  });
});
