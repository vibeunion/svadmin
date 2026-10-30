import { render, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SplitPaneTestHost from './SplitPane.test-host.svelte';

describe('SplitPane', () => {
  it('renders panes and exposes the pane group API', async () => {
    const onready = vi.fn();
    const view = render(SplitPaneTestHost, { onready });
    expect(view.getByTestId('pane-left')).toBeTruthy();
    expect(view.getByTestId('pane-right')).toBeTruthy();
    expect(view.container.querySelectorAll('[data-pane]')).toHaveLength(2);
    expect(view.container.querySelector('[role="separator"]')).not.toBeNull();
    await waitFor(() => expect(onready).toHaveBeenCalled());
    const api = onready.mock.calls[0]?.[0] as { getLayout: () => number[] };
    expect(api.getLayout()).toHaveLength(2);
  });

  it('forwards layout changes', async () => {
    const onlayout = vi.fn();
    render(SplitPaneTestHost, { onlayout });
    await waitFor(() => expect(onlayout).toHaveBeenCalled());
    expect(onlayout.mock.calls[0]?.[0]).toHaveLength(2);
  });
});
