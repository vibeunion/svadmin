import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopyButton from './copy-button/CopyButton.svelte';
import ExtensionHost from './extensions.test-host.svelte';
import Loader from './loader/Loader.svelte';
import type { ToolDisplayState } from './tool/status.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('AI element extensions', () => {
  it('renders an accessible loader at the requested size', () => {
    const view = render(Loader, { label: 'Loading response', size: 24 });
    const loader = view.getByRole('status', { name: 'Loading response' });
    const icon = loader.querySelector('svg');
    expect(icon?.getAttribute('width')).toBe('24');
    expect(icon?.getAttribute('height')).toBe('24');
  });

  it('renders context progress, compact tokens, cost, and every tool status', async () => {
    const states: Array<[ToolDisplayState, string, string]> = [
      ['input-streaming', 'Pending', 'neutral'],
      ['input-available', 'Running', 'pending'],
      ['approval-requested', 'Awaiting Approval', 'warning'],
      ['approval-responded', 'Responded', 'info'],
      ['output-available', 'Completed', 'success'],
      ['output-denied', 'Denied', 'warning'],
      ['output-error', 'Error', 'danger'],
    ];
    const view = render(ExtensionHost, { state: states[0][0] });
    const icon = view.getByTestId('context-icon');
    expect(icon.querySelectorAll('circle')[1]?.getAttribute('stroke-dashoffset')).toBeCloseTo(
      Math.PI * 20 * 0.25,
      5,
    );
    expect(view.getByTestId('tokens-with-cost').textContent).toContain('1.3K');
    expect(view.getByTestId('tokens-with-cost').textContent).toContain('$0.01');

    for (const [state, label, tone] of states) {
      await view.rerender({ state });
      const badge = view.getByText(label).closest('[data-slot="tool-status-badge"]');
      expect(badge?.getAttribute('data-tone')).toBe(tone);
    }
  });

  it('reports clipboard success and resets its state', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const oncopy = vi.fn();
    const view = render(CopyButton, { text: 'copy me', timeout: 50, oncopy });
    const button = view.getByRole('button', { name: 'Copy' });

    await fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('copy me'));
    expect(view.getByRole('button', { name: 'Copied' })).not.toBeNull();
    expect(oncopy).toHaveBeenCalledWith('success');

    await vi.advanceTimersByTimeAsync(50);
    expect(view.getByRole('button', { name: 'Copy' })).not.toBeNull();
  });

  it('reports clipboard failures without throwing', async () => {
    const error = new Error('Permission denied');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(error) },
    });
    const oncopy = vi.fn();
    const onerror = vi.fn();
    const view = render(CopyButton, { text: 'copy me', oncopy, onerror });

    await fireEvent.click(view.getByRole('button', { name: 'Copy' }));

    expect(await view.findByRole('button', { name: 'Failed to copy' })).not.toBeNull();
    expect(oncopy).toHaveBeenCalledWith('failure');
    expect(onerror).toHaveBeenCalledWith(error);
  });
});
