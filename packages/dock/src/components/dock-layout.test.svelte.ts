import { render, waitFor } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import DockLayoutTestHost from './DockLayout.test-host.svelte';

describe('DockLayout', () => {
  it('mounts panels through the dock engine', async () => {
    const view = render(DockLayoutTestHost);
    await waitFor(() => expect(view.getAllByTestId('dock-panel')).toHaveLength(2), { timeout: 5000 });
    expect(view.getByText('One')).toBeTruthy();
    expect(view.getByText('Two')).toBeTruthy();
    expect(view.getByRole('region', { name: 'Dock workspace' })).toBeTruthy();
  });
});
