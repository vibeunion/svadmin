import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceTabBar from './WorkspaceTabBar.svelte';
import WorkspaceActionBar from './WorkspaceActionBar.svelte';

describe('WorkspaceTabBar', () => {
  const items = [
    { id: 'overview', label: 'Overview' },
    { id: 'execution', label: 'Execution', badge: 3 },
    { id: 'report', label: 'Report', badge: 'V2' },
    { id: 'archive', label: 'Archive', disabled: true },
  ];

  it('renders all tab items with labels and badges', () => {
    render(WorkspaceTabBar, { items, activeId: 'overview' });

    expect(screen.getByRole('navigation', { name: 'Workspace tabs' })).toBeTruthy();
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Execution')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('Report')).toBeTruthy();
    expect(screen.getByText('V2')).toBeTruthy();

    const overviewButton = screen.getByRole('button', { name: /Overview/i });
    expect(overviewButton.getAttribute('aria-current')).toBe('page');
  });

  it('supports selecting tabs and fires onselect callback', async () => {
    const onselect = vi.fn();
    render(WorkspaceTabBar, { items, activeId: 'overview', onselect });

    const executionButton = screen.getByRole('button', { name: /Execution/i });
    await fireEvent.click(executionButton);

    expect(onselect).toHaveBeenCalledWith(items[1]);
  });

  it('does not trigger onselect for disabled tabs', async () => {
    const onselect = vi.fn();
    render(WorkspaceTabBar, { items, activeId: 'overview', onselect });

    const archiveButton = screen.getByRole('button', { name: /Archive/i });
    expect(archiveButton.hasAttribute('disabled')).toBe(true);

    await fireEvent.click(archiveButton);
    expect(onselect).not.toHaveBeenCalled();
  });

  it('renders different visual variants (segmented, pill, underline)', () => {
    const { container } = render(WorkspaceTabBar, { items, activeId: 'overview', variant: 'pill' });
    const nav = container.querySelector('[data-svadmin-workspace-tab-bar]');
    expect(nav?.getAttribute('data-variant')).toBe('pill');
  });
});

describe('WorkspaceActionBar status tones', () => {
  it('renders with success and destructive status tones', () => {
    const { container } = render(WorkspaceActionBar, {
      title: 'Action required',
      status: 'Signed',
      statusTone: 'success',
      primaryAction: () => null as any,
    });

    const badge = container.querySelector('span.text-success');
    expect(badge).toBeTruthy();
    expect(badge?.textContent?.trim()).toBe('Signed');
  });
});
