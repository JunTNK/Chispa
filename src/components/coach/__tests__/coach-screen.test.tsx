import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CoachScreen } from '../coach-screen';
import { useStore } from '@/lib/store';
import type { Profile, DigitalTwin } from '@/types';

// Mock LocalLLM to prevent async state updates that trigger act() warnings
vi.mock('@/lib/ai/local-llm', () => ({
  LocalLLM: {
    getInstance: () => ({
      load: vi.fn().mockResolvedValue(undefined),
      onProgress: vi.fn().mockReturnValue(() => {}),
    }),
  },
}));

const mockProfile: Profile = {
  user_id: 'test', name: 'TestUser', goal: 'energia', level: 'medio',
  equipment: 'ninguno', limitations: [], days_per_week: '2-3',
  neurotype: 'adh-c', preferred_duration: 20,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const mockTwin: DigitalTwin = {
  user_id: 'test', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  training_style: 'adaptive', motivation_style: 'data', avoid: [], best_time: '',
  patterns: { completion_rate: 0.6, avg_duration: 20, abandon_rate: 0.1, best_hours: {} },
  ex_progress: {}, motiv_weights: { data: 1, energy: 1, direct: 1, calm: 1 },
};

describe('CoachScreen', () => {
  it('renders the coach header and input', () => {
    useStore.setState({ profile: mockProfile, twin: mockTwin });
    render(<CoachScreen />);

    expect(screen.getByText('Coach CHISPA')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Escribe tu pregunta…')).toBeInTheDocument();
  });

  it('shows default suggested questions when no active plan', () => {
    useStore.setState({ profile: mockProfile, twin: mockTwin });
    render(<CoachScreen />);

    expect(screen.getByText('¿Cómo funciona CHISPA?')).toBeInTheDocument();
    expect(screen.getByText('¿Qué es mi Digital Twin?')).toBeInTheDocument();
    expect(screen.getByText('Dame un consejo')).toBeInTheDocument();
  });

  it('shows training-specific questions when plan is active', () => {
    useStore.setState({
      profile: mockProfile,
      twin: mockTwin,
      plan: {
        action: 'train' as const, intensity: 'standard' as const, duration: 20,
        reasons: ['Test reason'], confidence: 80,
        consistency: {
          user_id: '', period_start: '', period_end: '',
          consistency_pct: 50, sessions_done: 5, sessions_target: 13,
        },
        date: new Date().toISOString().slice(0, 10), done: false,
      },
    });
    render(<CoachScreen />);

    expect(screen.getByText('¿Por qué este plan?')).toBeInTheDocument();
    expect(screen.getByText('No tengo ganas hoy')).toBeInTheDocument();
    expect(screen.getByText('¿Cómo voy de consistencia?')).toBeInTheDocument();
  });

  it('adds user message to chat when clicking send button', async () => {
    useStore.setState({ profile: mockProfile, twin: mockTwin });
    render(<CoachScreen />);

    const input = screen.getByPlaceholderText('Escribe tu pregunta…');
    fireEvent.change(input, { target: { value: '¿Qué ejercicio hoy?' } });

    // Wait for React to process the state update from setInput
    await waitFor(() => {
      expect(input).toHaveDisplayValue('¿Qué ejercicio hoy?');
    });

    // Click the send button (the one with the Send icon)
    const allButtons = screen.getAllByRole('button');
    // The send button is the last one (after suggested questions)
    const sendButton = allButtons[allButtons.length - 1];
    fireEvent.click(sendButton);

    // Wait for the user message to appear in DOM
    await waitFor(() => {
      expect(screen.getByText('¿Qué ejercicio hoy?')).toBeInTheDocument();
    });
  });

  it('adds greeting message when initialized with empty chat', async () => {
    useStore.setState({ profile: mockProfile, twin: mockTwin, chat: [] });
    render(<CoachScreen />);

    // Wait for the greeting useEffect to fire
    await waitFor(() => {
      const greeting = useStore.getState().chat.find(m => m.role === 'assistant');
      expect(greeting).toBeTruthy();
    });
  });
});
