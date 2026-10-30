import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach } from 'vitest';
import { describe, expect, it } from 'vitest';
import DockLayoutTestHost from './DockLayout.test-host.svelte';

afterEach(() => cleanup());

describe('DockLayout', () => {
  it('mounts panels through the dock engine', async () => {
    const view = render(DockLayoutTestHost);
    await waitFor(() => expect(view.getAllByTestId('dock-panel')).toHaveLength(2), { timeout: 5000 });
    expect(view.getByText('One')).toBeTruthy();
    expect(view.getByText('Two')).toBeTruthy();
    expect(view.getByRole('region', { name: 'Dock workspace' })).toBeTruthy();
  });

  it('persists and restores the layout under a storage key', async () => {
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
        removeItem: (key: string) => { store.delete(key); },
      },
    });
    const storageKey = `svadmin-dock-test-${Date.now()}`;
    const first = render(DockLayoutTestHost, { storageKey });
    await waitFor(() => expect(first.getAllByTestId('dock-panel')).toHaveLength(2), { timeout: 5000 });
    await waitFor(() => expect(store.get(storageKey)).not.toBeNull());
    first.unmount();

    const second = render(DockLayoutTestHost, { storageKey });
    await waitFor(() => expect(second.getAllByTestId('dock-panel')).toHaveLength(2), { timeout: 5000 });
    expect(second.getByText('One')).toBeTruthy();
    store.delete(storageKey);
  });
});
