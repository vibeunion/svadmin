import { describe, expect, it, vi } from 'vitest';
import { fireEvent, within } from '@testing-library/svelte';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import VirtualTable from './VirtualTable.svelte';

const columns = [{ key: 'name', label: 'Name' }];
const items = Array.from({ length: 10000 }, (_, id) => ({ id, name: `Record ${id}` }));

describe('VirtualTable Component', () => {
  it('renders virtual table header and visible rows', () => {
    const items = [
      { id: 1, name: 'Alpha', status: 'Active' },
      { id: 2, name: 'Beta', status: 'Inactive' },
    ];
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status' },
    ];

    const view = render(VirtualTable, {
      items,
      columns,
    });

    expect(view.container.textContent).toContain('Name');
    expect(view.container.textContent).toContain('Status');
    expect(view.container.textContent).toContain('Alpha');
    expect(view.container.textContent).toContain('Total 2 rows');
  });

  it('renders a bounded window and reports absolute row indices across ten thousand records', async () => {
    const view = render(VirtualTable, { items, columns, itemHeight: 20, height: 100, overscan: 2 });
    const table = view.getByRole('table');
    const viewport = view.getByTestId('virtual-table-viewport');
    expect(table.getAttribute('aria-rowcount')).toBe('10001');
    expect(table.getAttribute('aria-colcount')).toBe('1');
    expect(view.getAllByRole('columnheader')).toHaveLength(1);
    expect(within(viewport).getAllByRole('row')).toHaveLength(7);
    expect(view.getByRole('cell', { name: 'Record 0' })).toBeTruthy();
    await fireEvent.scroll(viewport, { target: { scrollTop: 1000 } });
    const rows = within(viewport).getAllByRole('row');
    expect(rows).toHaveLength(9);
    expect(rows[0]?.getAttribute('aria-rowindex')).toBe('50');
    expect(view.queryByRole('cell', { name: 'Record 0' })).toBeNull();
    expect(view.getByRole('cell', { name: 'Record 50' })).toBeTruthy();
    await fireEvent.scroll(viewport, { target: { scrollTop: 1000000000 } });
    expect(view.getByRole('cell', { name: 'Record 9999' })).toBeTruthy();
    expect(viewport.scrollTop).toBe(199900);
  });

  it('clamps the native scroll position after data shrinks and when it becomes empty', async () => {
    const view = render(VirtualTable, { items, columns, itemHeight: 20, height: 100, overscan: 0 });
    const viewport = view.getByTestId('virtual-table-viewport');
    await fireEvent.scroll(viewport, { target: { scrollTop: 199900 } });
    await view.rerender({ items: items.slice(0, 3) });
    expect(viewport.scrollTop).toBe(0);
    expect(within(viewport).getAllByRole('row')).toHaveLength(3);
    await view.rerender({ items: [] });
    expect(view.getByRole('status').textContent).toBe('No data');
    expect(within(viewport).queryAllByRole('row')).toHaveLength(0);
    expect(viewport.scrollTop).toBe(0);
  });

  it('resets scroll only when the explicit scope changes, not on ordinary refresh', async () => {
    const view = render(VirtualTable, {
      items, columns, itemHeight: 20, height: 100, overscan: 0, scopeKey: 'tenant-a',
    });
    const viewport = view.getByTestId('virtual-table-viewport');
    await fireEvent.scroll(viewport, { target: { scrollTop: 1000 } });
    await view.rerender({ items: [...items] });
    expect(viewport.scrollTop).toBe(1000);
    const oldRow = within(viewport).getAllByRole('row')[0];
    await view.rerender({ scopeKey: 'tenant-b' });
    expect(viewport.scrollTop).toBe(0);
    expect(oldRow?.isConnected).toBe(false);
    expect(view.getByRole('cell', { name: 'Record 0' })).toBeTruthy();
  });

  it.each([0, -20, NaN, Infinity])('falls back for invalid height %s', async value => {
    const view = render(VirtualTable, { items, columns, itemHeight: value, height: value, overscan: value });
    const viewport = view.getByTestId('virtual-table-viewport');
    expect(viewport.style.height).toBe('360px');
    expect(within(viewport).getAllByRole('row').length).toBeLessThanOrEqual(13);
    expect(within(viewport).getAllByRole('row')[0]?.style.height).toBe('44px');
    await fireEvent.scroll(viewport, { target: { scrollTop: -100 } });
    expect(viewport.scrollTop).toBe(0);
    expect(view.container.innerHTML).not.toMatch(/NaNpx|Infinitypx/);
  });

  it('caps excessive overscan and normalizes fractional sizes', () => {
    const view = render(VirtualTable, { items, columns, itemHeight: 0.5, height: 1000000, overscan: 1000000 });
    const viewport = view.getByTestId('virtual-table-viewport');
    expect(viewport.style.height).toBe('4000px');
    expect(within(viewport).getAllByRole('row')).toHaveLength(350);
    expect(within(viewport).getAllByRole('row')[0]?.style.height).toBe('16px');
  });

  it.each([
    { invalidItems: [{ id: 'same' }, { id: 'same' }] },
    { invalidItems: [{ id: {} }] },
    { invalidItems: [{ id: NaN }] },
    { invalidItems: [{ id: Infinity }] },
  ])('rejects invalid or duplicate record keys', ({ invalidItems }) => {
    const view = render(VirtualTable, { items: invalidItems, columns });
    expect(view.getByRole('alert').textContent).toContain('Record keys are invalid or duplicated');
    expect(within(view.getByTestId('virtual-table-viewport')).queryAllByRole('row')).toHaveLength(0);
  });

  it('keeps numeric, string and missing keys in separate namespaces', () => {
    const view = render(VirtualTable, {
      items: [{ id: 1, name: 'Number' }, { id: '1', name: 'String' }, { name: 'Missing' }],
      columns,
    });
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getAllByRole('cell')).toHaveLength(3);
  });

  it('keeps row identity across reorder for stable record keys', async () => {
    const first = { id: 'a', name: 'A' };
    const second = { id: 'b', name: 'B' };
    const view = render(VirtualTable, { items: [first, second], columns });
    const row = view.getByRole('cell', { name: 'A' }).closest('[role="row"]');
    await view.rerender({ items: [second, first] });
    expect(view.getByRole('cell', { name: 'A' }).closest('[role="row"]')).toBe(row);
    expect(row?.getAttribute('aria-rowindex')).toBe('3');
  });

  it('hides stale records during loading and error, and exposes only a configured retry', async () => {
    const onRetry = vi.fn();
    const view = render(VirtualTable, { items, columns, loading: true, onRetry });
    expect(view.getByRole('table').getAttribute('aria-busy')).toBe('true');
    expect(view.getByRole('status').textContent).toBe('Loading...');
    expect(view.queryByRole('cell')).toBeNull();
    await view.rerender({ loading: false, error: 'Unable to load records' });
    expect(view.getByRole('alert').textContent).toBe('Unable to load records');
    expect(view.queryByRole('cell')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
    await view.rerender({ error: undefined });
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getAllByRole('cell').length).toBeGreaterThan(0);
  });

  it('supports viewport keyboard scrolling without capturing keys from nested content', async () => {
    const view = render(VirtualTable, { items, columns, itemHeight: 20, height: 100, overscan: 0 });
    const viewport = view.getByTestId('virtual-table-viewport');
    expect(viewport.tabIndex).toBe(0);
    for (const [key, top] of [
      ['PageDown', 100], ['ArrowDown', 120], ['ArrowUp', 100], ['End', 199900], ['Home', 0],
    ] as const) {
      await fireEvent.keyDown(viewport, { key });
      expect(viewport.scrollTop).toBe(top);
    }
    await fireEvent.keyDown(view.getByRole('cell', { name: 'Record 0' }), { key: 'End' });
    expect(viewport.scrollTop).toBe(0);
  });

  it('localizes the label, count and empty state', () => {
    const view = render(VirtualTable, { columns, items: [] }, 'zh-CN');
    expect(view.getByRole('table', { name: '数据表格' })).toBeTruthy();
    expect(view.getByRole('status').textContent).toBe('暂无数据');
    expect(view.container.textContent).toContain('共 0 行');
  });
});
