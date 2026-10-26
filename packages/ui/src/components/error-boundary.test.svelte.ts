import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Host from './error-boundary.test-host.svelte';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary default failure UI', () => {
  it('hides the private diagnostic, shows the generic description, and still recovers on retry', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const view = render(Host);

    await waitFor(() => {
      expect(view.getByText('系统发生了一些问题，请稍后再试或联系支持人员。')).toBeTruthy();
    });
    expect(view.baseElement.textContent).not.toContain('PRIVATE_DIAGNOSTIC');

    const retry = view.getByRole('button', { name: '重试' });
    await fireEvent.click(retry);

    await waitFor(() => {
      expect(view.getByText('Recovered content')).toBeTruthy();
    });
    expect(view.baseElement.textContent).not.toContain('PRIVATE_DIAGNOSTIC');
    expect(consoleError.mock.calls.some(([label, error]) => (
      label === '[svadmin] Uncaught error:'
      && error instanceof Error
      && error.message === 'PRIVATE_DIAGNOSTIC'
    ))).toBe(true);
  });

  it('passes the original error and reset handler to an explicit fallback snippet', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const view = render(Host, { mode: 'fallback' });

    await waitFor(() => {
      expect(view.getByText('custom fallback: PRIVATE_DIAGNOSTIC')).toBeTruthy();
    });
    expect(view.queryByText('系统发生了一些问题，请稍后再试或联系支持人员。')).toBeNull();

    await fireEvent.click(view.getByRole('button', { name: 'custom reset' }));

    await waitFor(() => {
      expect(view.getByText('Recovered content')).toBeTruthy();
    });
    expect(consoleError).toHaveBeenCalled();
  });
});