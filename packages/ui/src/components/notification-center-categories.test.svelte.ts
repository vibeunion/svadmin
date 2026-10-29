import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import NotificationCenter from './NotificationCenter.svelte';

afterEach(() => cleanup());

const items = [
  { id: 'n1', title: 'Deploy finished', category: 'System' },
  { id: 'n2', title: 'New comment', category: 'Mentions', read: true },
  { id: 'n3', title: 'Disk warning', category: 'System' },
];

describe('NotificationCenter categories', () => {
  it('filters notifications by category', async () => {
    const view = render(NotificationCenter, { items, showFilters: true, open: true });
    const filters = view.getAllByRole('tab');
    expect(filters.map((tab) => tab.textContent?.trim())).toEqual(['All', 'System', 'Mentions']);
    expect(view.getByText('Deploy finished')).toBeTruthy();
    expect(view.getByText('New comment')).toBeTruthy();

    await fireEvent.click(view.getByRole('tab', { name: 'Mentions' }));
    expect(view.queryByText('Deploy finished')).toBeNull();
    expect(view.getByText('New comment')).toBeTruthy();

    await fireEvent.click(view.getByRole('tab', { name: 'System' }));
    expect(view.getByText('Deploy finished')).toBeTruthy();
    expect(view.queryByText('New comment')).toBeNull();
  });

  it('uses an explicit category list and empty state', async () => {
    const view = render(NotificationCenter, {
      items,
      showFilters: true,
      categories: ['Billing'],
      open: true,
      emptyText: 'Nothing here',
    });
    expect(view.getByRole('tab', { name: 'All' })).toBeTruthy();
    await fireEvent.click(view.getByRole('tab', { name: 'Billing' }));
    expect(view.getByText('Nothing here')).toBeTruthy();
  });
});
