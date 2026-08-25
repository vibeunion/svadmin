import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { resetToast, toast } from '@svadmin/core/toast';
import ToastHostHarness from './toast-host.test-harness.svelte';

const sonner = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  promise: vi.fn(),
}));

vi.mock('svelte-sonner', async () => {
  const { default: Toaster } = await import('./toast-host.test-toaster.svelte');
  return { Toaster, toast: sonner };
});

describe('Toast host coordination', () => {
  beforeEach(() => {
    resetToast();
    vi.clearAllMocks();
  });

  it('renders one global Toaster for two mounted hosts', async () => {
    render(ToastHostHarness);

    await waitFor(() => {
      expect(screen.getAllByTestId('sonner-toaster')).toHaveLength(1);
    });

    const toaster = screen.getByTestId('sonner-toaster');
    expect(toaster.getAttribute('data-expand')).toBe('false');
    expect(toaster.getAttribute('data-visible-toasts')).toBe('3');
  });

  it('deduplicates a keyed event and forwards the key as the Sonner id', async () => {
    render(ToastHostHarness);
    await waitFor(() => expect(screen.getAllByTestId('sonner-toaster')).toHaveLength(1));

    toast.success('Saved', 3000, { key: 'record:42:save:7' });
    toast.success('Saved again', 3000, { key: 'record:42:save:7' });

    await waitFor(() => expect(sonner.success).toHaveBeenCalledTimes(1));
    expect(sonner.success).toHaveBeenCalledWith('Saved', {
      duration: 3000,
      id: 'record:42:save:7',
    });
  });

  it('fails over the active host and drains each queue item exactly once', async () => {
    render(ToastHostHarness);

    const firstHost = screen.getByTestId('first-toast-host');
    const secondHost = screen.getByTestId('second-toast-host');
    await waitFor(() => {
      expect(screen.getAllByTestId('sonner-toaster')).toHaveLength(1);
    });

    const activeHost = within(firstHost).queryByTestId('sonner-toaster') ? 'first' : 'second';
    const standbyHost = activeHost === 'first' ? secondHost : firstHost;

    toast.success('Created once');
    toast.promise(Promise.resolve('done'), {
      loading: 'Saving',
      success: 'Saved',
      error: 'Failed',
    });

    await waitFor(() => {
      expect(sonner.success).toHaveBeenCalledTimes(1);
      expect(sonner.promise).toHaveBeenCalledTimes(1);
    });

    await fireEvent.click(screen.getByTestId(`remove-${activeHost}-host`));
    await waitFor(() => {
      expect(screen.getAllByTestId('sonner-toaster')).toHaveLength(1);
      expect(within(standbyHost).getByTestId('sonner-toaster')).toBeTruthy();
    });

    toast.warning('Failed over once');
    await waitFor(() => {
      expect(sonner.warning).toHaveBeenCalledTimes(1);
    });
  });
});
