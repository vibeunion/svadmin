import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ModelComparisonCard from './ModelComparisonCard.svelte';

afterEach(cleanup);

describe('ModelComparisonCard', () => {
  it('renders model responses, metrics, and the selected result', () => {
    render(ModelComparisonCard, {
      results: [
        { id: 'fast', model: 'Fast model', provider: 'Provider A', response: 'Concise answer', latencyMs: 120, tokens: 42 },
        { id: 'deep', model: 'Deep model', response: 'Detailed answer', score: 0.94 },
      ],
      winnerId: 'deep',
    });

    expect(screen.getByRole('region', { name: 'Model comparison' })).not.toBeNull();
    expect(screen.getByText('Concise answer')).not.toBeNull();
    expect(screen.getByText('Detailed answer')).not.toBeNull();
    expect(screen.getByText('Selected')).not.toBeNull();
    expect(screen.getByText('120 ms')).not.toBeNull();
  });

  it('emits the chosen result and keeps failed models non-actionable', async () => {
    const onSelect = vi.fn();
    render(ModelComparisonCard, {
      onSelect,
      results: [
        { id: 'ok', model: 'Available', response: 'Ready' },
        { id: 'failed', model: 'Unavailable', response: '', status: 'error', error: 'Timed out' },
      ],
    });

    expect(screen.getByRole('alert').textContent).toContain('Timed out');
    expect(screen.getAllByRole('button', { name: 'Use this response' })).toHaveLength(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Use this response' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'ok' }));
  });
});
