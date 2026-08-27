import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import StatusTabs from './content/StatusTabs.svelte';

describe('StatusTabs', () => {
  const items = [
    { key: 'all', label: 'All', count: 42 },
    { key: 'pending', label: 'Pending', count: 10, tone: 'warning' as const },
    { key: 'done', label: 'Done', count: 32, tone: 'success' as const },
    { key: 'disabled', label: 'Archived', count: 0, disabled: true },
  ];

  it('renders all tab items with counts and accessible roles', () => {
    render(StatusTabs, { items, value: 'all' });

    expect(screen.getByRole('tablist')).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(4);

    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();

    const allTab = screen.getByRole('tab', { name: /All/i });
    expect(allTab.getAttribute('aria-selected')).toBe('true');
  });

  it('supports selecting tabs and fires onchange callback', async () => {
    const onchange = vi.fn();
    render(StatusTabs, { items, value: 'all', onchange });

    const pendingTab = screen.getByRole('tab', { name: /Pending/i });
    await fireEvent.click(pendingTab);

    expect(onchange).toHaveBeenCalledWith('pending');
  });

  it('does not trigger onchange for disabled tabs', async () => {
    const onchange = vi.fn();
    render(StatusTabs, { items, value: 'all', onchange });

    const disabledTab = screen.getByRole('tab', { name: /Archived/i });
    expect(disabledTab.hasAttribute('disabled')).toBe(true);

    await fireEvent.click(disabledTab);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('renders different visual variants (pills, segmented, underline)', () => {
    const { container } = render(StatusTabs, { items, value: 'all', variant: 'segmented', density: 'compact' });
    const tablist = container.querySelector('[data-svadmin-status-tabs]');
    expect(tablist?.getAttribute('data-variant')).toBe('segmented');
    expect(tablist?.getAttribute('data-density')).toBe('compact');
  });
});
