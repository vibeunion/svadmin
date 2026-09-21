import { describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/svelte';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import { tick } from 'svelte';
import { indexTreeTable, treeTableSelection } from '../tree-table-model.js';
import TreeTable from './TreeTable.svelte';
import TreeTableHost from './tree-table.test-host.svelte';


describe('TreeTable Component', () => {
  const treeData = [
    {
      id: 1,
      name: 'Root Folder',
      type: 'directory',
      children: [
        { id: 2, name: 'Child Document', type: 'file' },
        { id: 3, name: 'Sub Folder', type: 'directory', children: [{ id: 4, name: 'Deep File', type: 'file' }] },
      ],
    },
  ];

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
  ];

  it('renders root tree node', () => {
    const view = render(TreeTable, {
      data: treeData,
      columns,
    });
    expect(view.container.textContent).toContain('Root Folder');
  });

  it('expands all nodes when Expand All is clicked', async () => {
    const view = render(TreeTable, {
      data: treeData,
      columns,
    });

    const expandBtn = view.container.querySelector('button');
    if (expandBtn) await fireEvent.click(expandBtn);

    expect(view.container.textContent).toContain('Root Folder');
    expect(view.container.textContent).toContain('Child Document');
  });

  it('derives mixed state from descendants and completes or clears the whole subtree', async () => {
    const onselect = vi.fn();
    const view = render(TreeTable, { data: treeData, columns, selectable: true, selectedKeys: [2], onselect });
    const parent = view.getByRole('checkbox', { name: 'Select record 1' });
    expect(parent.getAttribute('aria-checked')).toBe('mixed');
    await fireEvent.click(parent);
    expect(onselect).toHaveBeenLastCalledWith([2, 1, 3, 4]);
    expect(parent.getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(view.getByRole('button', { name: 'Expand All' }));
    await fireEvent.click(view.getByRole('checkbox', { name: 'Select record 2' }));
    expect(parent.getAttribute('aria-checked')).toBe('mixed');
    await fireEvent.click(parent);
    expect(parent.getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(parent);
    expect(onselect).toHaveBeenLastCalledWith([]);
    expect(parent.getAttribute('aria-checked')).toBe('false');
  });

  it('excludes disabled subtrees from parent selection and direct child selection', async () => {
    const onselect = vi.fn();
    const data = [{
      id: 'root', name: 'Root',
      children: [
        { id: 'enabled', name: 'Enabled' },
        { id: 'blocked', name: 'Blocked', disabled: true, children: [{ id: 'nested', name: 'Nested' }] },
      ],
    }];
    const view = render(TreeTable, { data, columns, selectable: true, onselect });
    await fireEvent.click(view.getByRole('button', { name: 'Expand All' }));
    await fireEvent.click(view.getByRole('checkbox', { name: 'Select record root' }));
    expect(onselect).toHaveBeenLastCalledWith(['root', 'enabled']);
    expect(view.getByRole('checkbox', { name: 'Select record root' }).getAttribute('aria-checked')).toBe('true');
    expect(view.getByRole('checkbox', { name: 'Select record blocked' }).getAttribute('aria-checked')).toBe('false');
    expect(view.getByRole('checkbox', { name: 'Select record nested' }).hasAttribute('disabled')).toBe(true);
    const nested = view.container.querySelector<HTMLElement>('[data-tree-key="string:nested"]');
    if (!nested) throw new Error('Missing nested row');
    await fireEvent.keyDown(nested, { key: ' ' });
    expect(onselect).toHaveBeenCalledTimes(1);
  });

  it('renders the custom cell snippet in the primary tree column and other columns', () => {
    const view = render(TreeTableHost, { data: treeData, columns });
    expect(view.getByTestId('custom-name').textContent).toBe('Custom Root Folder');
    expect(view.getByTestId('custom-type').textContent).toBe('Custom directory');
    expect(view.getByRole('button', { name: 'Root Folder: Expand' })).toBeTruthy();
  });

  it('keeps expansion and valid selections on refresh and prunes removed identifiers', async () => {
    const onselect = vi.fn();
    const view = render(TreeTable, {
      data: treeData, columns, selectable: true, selectedKeys: [1, 2, 3, 4], onselect,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Expand All' }));
    await view.rerender({ data: [...treeData] });
    expect(onselect).not.toHaveBeenCalled();
    expect(view.getByText('Deep File')).toBeTruthy();
    await view.rerender({ data: [{ id: 1, name: 'Root Folder', children: [{ id: 2, name: 'Child Document' }] }] });
    expect(onselect).toHaveBeenLastCalledWith([1, 2]);
    expect(view.getByText('Child Document')).toBeTruthy();
    expect(view.queryByText('Deep File')).toBeNull();
  });

  it('resets selection, row instances and expansion on explicit scope changes', async () => {
    const onselect = vi.fn();
    const view = render(TreeTable, {
      data: treeData, columns, selectable: true, selectedKeys: [1], scopeKey: 'a', onselect,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Expand All' }));
    const oldRow = view.container.querySelector('[data-tree-key="number:1"]');
    await view.rerender({ scopeKey: 'b' });
    expect(onselect).toHaveBeenLastCalledWith([]);
    expect(oldRow?.isConnected).toBe(false);
    expect(view.queryByText('Child Document')).toBeNull();
    expect(view.getByRole('checkbox', { name: 'Select record 1' }).getAttribute('aria-checked')).toBe('false');
  });

  it.each([
    { data: [{ id: 1 }, { id: 1 }] },
    { data: [{ name: 'Missing id' }] },
    { data: [{ id: NaN }] },
    { data: [{ id: {} }] },
    { data: [{ id: 1, children: 'wrong' }] },
    { data: [{ id: 1, children: [null] }] },
  ])('rejects invalid tree records without mounting interactive rows', ({ data }) => {
    const view = render(TreeTable, { data, columns });
    expect(view.getByRole('alert').textContent).toContain('Invalid tree data');
    expect(view.queryByRole('treegrid')).toBeNull();
    expect(view.getByRole('button', { name: 'Expand All' }).hasAttribute('disabled')).toBe(true);
  });

  it('rejects cycles and excessive depth or node count without recursive overflow', () => {
    const cycle: Record<string, unknown> = { id: 'cycle' };
    cycle['children'] = [cycle];
    expect(indexTreeTable([cycle], 'id', 'children').valid).toBe(false);
    let chain: Record<string, unknown> = { id: 65 };
    for (let id = 64; id >= 0; id -= 1) chain = { id, children: [chain] };
    expect(indexTreeTable([chain], 'id', 'children').valid).toBe(false);
    const large = Array.from({ length: 10001 }, (_, id) => ({ id }));
    expect(indexTreeTable(large, 'id', 'children').valid).toBe(false);
    const allowed = indexTreeTable(large.slice(0, 10000), 'id', 'children');
    expect(allowed.valid).toBe(true);
    expect(treeTableSelection(allowed.nodes, new Set([0, 9999])).get(9999)).toEqual({ total: 1, selected: 1 });
  });

  it('rejects duplicate columns before rendering the keyed header', () => {
    const view = render(TreeTable, { data: treeData, columns: [{ key: 'name', label: 'A' }, { key: 'name', label: 'B' }] });
    expect(view.getByRole('alert')).toBeTruthy();
    expect(view.queryByRole('treegrid')).toBeNull();
  });

  it('isolates typed keys and supports hierarchical keyboard focus', async () => {
    const onselect = vi.fn();
    const view = render(TreeTable, {
      data: [{ id: 1, name: 'Number', children: [{ id: '1', name: 'String' }] }, { id: 'last', name: 'Last' }],
      columns, selectable: true, onselect,
    });
    function row(key: string): HTMLElement {
      const element = view.container.querySelector<HTMLElement>(`[data-tree-key="${key}"]`);
      if (!element) throw new Error('Missing row');
      return element;
    }
    const parent = row('number:1');
    parent.focus();
    await fireEvent.keyDown(parent, { key: 'ArrowRight' });
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.keyDown(parent, { key: 'ArrowRight' });
    const child = row('string:1');
    expect(document.activeElement).toBe(child);
    expect(child.getAttribute('aria-level')).toBe('2');
    expect(child.tabIndex).toBe(0);
    expect(parent.tabIndex).toBe(-1);
    await fireEvent.keyDown(child, { key: ' ' });
    expect(onselect).toHaveBeenLastCalledWith(['1']);
    await fireEvent.keyDown(child, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(parent);
    await fireEvent.keyDown(parent, { key: 'End' });
    expect(document.activeElement).toBe(row('string:last'));
    await fireEvent.keyDown(row('string:last'), { key: 'Home' });
    expect(document.activeElement).toBe(parent);
    await fireEvent.keyDown(parent, { key: 'ArrowLeft' });
    expect(parent.getAttribute('aria-expanded')).toBe('false');
    expect(view.queryByText('String')).toBeNull();
  });

  it('does not capture key events bubbling from nested controls or mutate when disabled', async () => {
    const onselect = vi.fn();
    const view = render(TreeTable, { data: treeData, columns, selectable: true, onselect });
    await fireEvent.keyDown(view.getByRole('button', { name: 'Root Folder: Expand' }), { key: 'Enter' });
    expect(onselect).not.toHaveBeenCalled();
    await view.rerender({ disabled: true });
    const row = view.container.querySelector<HTMLElement>('[data-tree-key="number:1"]');
    if (!row) throw new Error('Missing root');
    await fireEvent.keyDown(row, { key: 'ArrowRight' });
    await fireEvent.keyDown(row, { key: ' ' });
    expect(onselect).not.toHaveBeenCalled();
    expect(row.getAttribute('aria-expanded')).toBe('false');
    expect(view.getByRole('checkbox', { name: 'Select record 1' }).hasAttribute('disabled')).toBe(true);
  });

  it('provides loading, error, explicit retry and empty states without exposing stale rows', async () => {
    const onRetry = vi.fn();
    const view = render(TreeTable, { data: treeData, columns, loading: true, onRetry });
    expect(view.getByRole('status').textContent).toBe('Loading...');
    expect(view.queryByText('Root Folder')).toBeNull();
    await view.rerender({ loading: false, error: 'Unable to load' });
    expect(view.getByRole('alert').textContent).toBe('Unable to load');
    expect(view.queryByText('Root Folder')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
    await view.rerender({ error: '', data: [] });
    expect(view.getByRole('treegrid')).toBeTruthy();
    expect(view.getByText('No data')).toBeTruthy();
  });

  it('filters matching descendants while retaining their ancestor path', async () => {
    const view = render(TreeTable, {
      data: treeData, columns, filterable: true, filterText: 'Deep', filterKeys: ['name'],
    });
    expect(view.getByText('Root Folder')).toBeTruthy();
    expect(view.getByText('Sub Folder')).toBeTruthy();
    expect(view.getByText('Deep File')).toBeTruthy();
    expect(view.queryByText('Child Document')).toBeNull();
  });

  it('cycles stable sibling sorting and reports each sort state', async () => {
    const onsortchange = vi.fn();
    const view = render(TreeTable, {
      data: [
        { id: 1, name: 'Beta' },
        { id: 2, name: 'Alpha' },
        { id: 3, name: 'Gamma' },
      ],
      columns: [{ key: 'name', label: 'Name', sortable: true }],
      onsortchange,
    });
    const names = () => [...view.container.querySelectorAll('tbody tr td span:last-child')].map(node => node.textContent);
    const sort = view.getByRole('button', { name: 'Sort: Name' });
    await fireEvent.click(sort);
    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
    await fireEvent.click(sort);
    expect(names()).toEqual(['Gamma', 'Beta', 'Alpha']);
    await fireEvent.click(sort);
    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma']);
    expect(onsortchange.mock.calls.map(([value]) => value)).toEqual([
      { key: 'name', direction: 'asc' },
      { key: 'name', direction: 'desc' },
      undefined,
    ]);
  });

  it('paginates roots without splitting descendants and clamps an invalid page', async () => {
    const onpagechange = vi.fn();
    const view = render(TreeTable, {
      data: [
        { id: 1, name: 'One', children: [{ id: 11, name: 'One child' }] },
        { id: 2, name: 'Two' },
        { id: 3, name: 'Three' },
      ],
      columns, page: 2, pageSize: 2, onpagechange,
    });
    expect(view.getByText('Three')).toBeTruthy();
    expect(view.queryByText('One')).toBeNull();
    expect(view.queryByRole('button', { name: 'Previous page' })).toBeTruthy();
    await fireEvent.click(view.getByRole('button', { name: 'Previous page' }));
    expect(onpagechange).toHaveBeenCalledWith(1);
    await view.rerender({ page: 9 });
    await waitFor(() => expect(onpagechange).toHaveBeenCalledWith(2));
  });

  it('keeps selection for nodes outside the current page and computes the parent state from the full tree', async () => {
    const onselect = vi.fn();
    const view = render(TreeTable, {
      data: [
        { id: 1, name: 'One', children: [{ id: 11, name: 'One child' }] },
        { id: 2, name: 'Two' },
      ],
      columns, selectable: true, page: 2, pageSize: 1, selectedKeys: [1, 11], onselect,
    });
    expect(view.queryByText('One')).toBeNull();
    expect(view.getByText('Two')).toBeTruthy();
    await view.rerender({ page: 1 });
    await fireEvent.click(view.getByRole('button', { name: 'One: Expand' }));
    expect(view.getByRole('checkbox', { name: 'Select record 1' }).getAttribute('aria-checked')).toBe('true');
    expect(view.getByRole('checkbox', { name: 'Select record 11' }).getAttribute('aria-checked')).toBe('true');
  });

  it('loads children once, exposes loading/errors, and clears lazy state on scope changes', async () => {
    let resolve!: (value: Record<string, unknown>[]) => void;
    const loadChildren = vi.fn(() => new Promise<Record<string, unknown>[]>(done => { resolve = done; }));
    const view = render(TreeTable, {
      data: [{ id: 'root', name: 'Root' }],
      columns, loadChildren, scopeKey: 'first',
    });
    const expand = view.getByRole('button', { name: 'Root: Expand' });
    await fireEvent.click(expand);
    expect(loadChildren).toHaveBeenCalledWith({ id: 'root', name: 'Root' }, 'root');
    expect(view.getByRole('button', { name: 'Root: Collapse' }).querySelector('svg')).toBeTruthy();
    resolve([{ id: 'child', name: 'Loaded child' }]);
    await waitFor(() => expect(view.getByText('Loaded child')).toBeTruthy());
    await view.rerender({ scopeKey: 'second' });
    expect(view.queryByText('Loaded child')).toBeNull();
    expect(view.getByRole('button', { name: 'Root: Expand' })).toBeTruthy();
    expect(loadChildren).toHaveBeenCalledOnce();
  });

  it('does not apply late lazy children after scope changes or unmount', async () => {
    let resolve!: (value: Record<string, unknown>[]) => void;
    const loadChildren = vi.fn(() => new Promise<Record<string, unknown>[]>(done => { resolve = done; }));
    const view = render(TreeTable, {
      data: [{ id: 'root', name: 'Root' }],
      columns, loadChildren, scopeKey: 'first',
    });
    await fireEvent.click(view.getByRole('button', { name: 'Root: Expand' }));
    await view.rerender({ scopeKey: 'second' });
    resolve([{ id: 'old-child', name: 'Old child' }]);
    await tick();
    expect(view.queryByText('Old child')).toBeNull();
    view.unmount();
  });

  it('rejects an invalid lazy response without replacing valid tree data', async () => {
    const loadChildren = vi.fn(async () => [{ id: 'child', name: 'Child', children: 'invalid' }]);
    const view = render(TreeTable, {
      data: [{ id: 'root', name: 'Root' }],
      columns, loadChildren, canLoadChildren: () => true,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Root: Expand' }));
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('Unable to load children'));
    expect(view.getByText('Root')).toBeTruthy();
    expect(view.queryByText('Child')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    expect(loadChildren).toHaveBeenCalledTimes(2);
  });

  it('paginates interactively without a callback and resets the page when searching', async () => {
    const view = render(TreeTable, {
      data: [{ id: 1, name: 'One' }, { id: 2, name: 'Two' }],
      columns, pageSize: 1, filterable: true,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Next page' }));
    expect(view.getByText('Two')).toBeTruthy();
    await fireEvent.input(view.getByRole('textbox'), { target: { value: 'One' } });
    expect(view.getByText('One')).toBeTruthy();
    expect(view.getByRole('status').textContent).toBe('1 / 1');
    expect(view.getByRole('button', { name: 'Next page' }).hasAttribute('disabled')).toBe(true);
  });

  it('sorts siblings recursively without mutating source order', async () => {
    const data = [{
      id: 1, name: 'Root', children: [{ id: 2, name: '20' }, { id: 3, name: '3' }, { id: 4, name: '3' }],
    }];
    const view = render(TreeTable, {
      data, columns, sort: { key: 'name', direction: 'asc' },
    });
    await fireEvent.click(view.getByRole('button', { name: 'Expand All' }));
    expect([...view.container.querySelectorAll('[data-tree-key]')].map(row => row.getAttribute('data-tree-key')))
      .toEqual(['number:1', 'number:3', 'number:4', 'number:2']);
    expect(data[0]?.children.map(child => child.id)).toEqual([2, 3, 4]);
  });

  it('retains hidden selections and selects the whole loaded subtree while filtered', async () => {
    const onselect = vi.fn();
    const view = render(TreeTable, {
      data: treeData, columns, selectable: true, selectedKeys: [2], filterText: 'Deep', onselect,
    });
    expect(view.queryByText('Child Document')).toBeNull();
    expect(onselect).not.toHaveBeenCalled();
    const root = view.getByRole('checkbox', { name: 'Select record 1' });
    expect(root.getAttribute('aria-checked')).toBe('mixed');
    await fireEvent.click(root);
    expect(onselect).toHaveBeenLastCalledWith([2, 1, 3, 4]);
  });

  it('validates the full tree before filtering, paging or merging', () => {
    const cycle: Record<string, unknown> = { id: 1, name: 'Hidden' };
    cycle['children'] = [cycle];
    const view = render(TreeTable, {
      data: [cycle], columns, filterText: 'No matches', pageSize: 1,
    });
    expect(view.getByRole('alert')).toBeTruthy();
    expect(view.queryByRole('treegrid')).toBeNull();
  });

  it.each(['refresh', 'loader', 'disabled', 'roundtrip', 'unmount'] as const)(
    'ignores late responses after %s', async change => {
      let resolve!: (value: Record<string, unknown>[]) => void;
      const loadChildren = vi.fn(() => new Promise<Record<string, unknown>[]>(done => { resolve = done; }));
      const data = [{ id: 'root', name: 'Root' }];
      const view = render(TreeTable, { data, columns, loadChildren, scopeKey: 'first' });
      await fireEvent.click(view.getByRole('button', { name: 'Root: Expand' }));
      if (change === 'refresh') await view.rerender({ data: [...data] });
      if (change === 'loader') await view.rerender({ loadChildren: async () => [] });
      if (change === 'disabled') await view.rerender({ disabled: true });
      if (change === 'roundtrip') {
        await view.rerender({ scopeKey: 'second' });
        await view.rerender({ scopeKey: 'first' });
      }
      if (change === 'unmount') view.unmount();
      resolve([{ id: 'old', name: 'Late child' }]);
      await tick();
      expect(view.queryByText('Late child')).toBeNull();
      expect(view.queryByRole('alert')).toBeNull();
    },
  );

  it('does not clear a new request busy state when an obsolete request settles', async () => {
    let oldResolve!: (value: Record<string, unknown>[]) => void;
    let newResolve!: (value: Record<string, unknown>[]) => void;
    const loadChildren = vi.fn()
      .mockImplementationOnce(() => new Promise<Record<string, unknown>[]>(done => { oldResolve = done; }))
      .mockImplementationOnce(() => new Promise<Record<string, unknown>[]>(done => { newResolve = done; }));
    const view = render(TreeTable, { data: [{ id: 1, name: 'Root' }], columns, loadChildren, scopeKey: 'first' });
    await fireEvent.click(view.getByRole('button', { name: 'Root: Expand' }));
    await view.rerender({ scopeKey: 'second' });
    await fireEvent.click(view.getByRole('button', { name: 'Root: Expand' }));
    oldResolve([{ id: 'old', name: 'Old' }]);
    await tick();
    expect(view.container.querySelector('[data-tree-key="number:1"]')?.getAttribute('aria-busy')).toBe('true');
    newResolve([{ id: 'new', name: 'New' }]);
    await waitFor(() => expect(view.getByText('New')).toBeTruthy());
    expect(view.queryByText('Old')).toBeNull();
  });

  it('coalesces requests, preserves collapse during loading, and caches empty results', async () => {
    let resolve!: (value: Record<string, unknown>[]) => void;
    const loadChildren = vi.fn(() => new Promise<Record<string, unknown>[]>(done => { resolve = done; }));
    const view = render(TreeTable, { data: [{ id: 1, name: 'Root' }], columns, loadChildren, canLoadChildren: () => true });
    await fireEvent.click(view.getByRole('button', { name: 'Root: Expand' }));
    await fireEvent.click(view.getByRole('button', { name: 'Root: Collapse' }));
    await fireEvent.click(view.getByRole('button', { name: 'Root: Expand' }));
    await fireEvent.click(view.getByRole('button', { name: 'Root: Collapse' }));
    expect(loadChildren).toHaveBeenCalledOnce();
    resolve([]);
    await tick();
    expect(view.queryByRole('button', { name: 'Root: Expand' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Root: Collapse' })).toBeNull();
  });

  it('rejects duplicate identifiers returned by another branch and supports successful retry', async () => {
    const loadChildren = vi.fn()
      .mockResolvedValueOnce([{ id: 2, name: 'Collision' }])
      .mockResolvedValueOnce([{ id: 3, name: 'Valid child', children: [] }]);
    const view = render(TreeTable, { data: [{ id: 1, name: 'Root' }, { id: 2, name: 'Other' }], columns, loadChildren });
    await fireEvent.click(view.getByRole('button', { name: 'Root: Expand' }));
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(view.getByText('Other')).toBeTruthy();
    expect(view.queryByText('Collision')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(view.getByText('Valid child')).toBeTruthy());
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('limits virtual rows and exposes full row indices at the end of the loaded tree', async () => {
    const data = Array.from({ length: 300 }, (_, id) => ({ id, name: `Row ${id}` }));
    const view = render(TreeTable, {
      data, columns, virtualized: true, height: 120, rowHeight: 30, overscan: 1,
    });
    const rows = () => view.container.querySelectorAll('[data-tree-key]');
    expect(view.getByRole('treegrid').getAttribute('aria-rowcount')).toBe('301');
    expect(rows().length).toBeLessThan(10);
    expect(view.queryByText('Row 299')).toBeNull();
    const viewport = view.getByTestId('tree-table-viewport');
    await fireEvent.scroll(viewport, { target: { scrollTop: 9000 } });
    expect(view.getByText('Row 299')).toBeTruthy();
    expect(rows().length).toBeLessThan(10);
    expect(view.container.querySelector('[data-tree-key="number:299"]')?.getAttribute('aria-rowindex')).toBe('301');
    expect(view.container.querySelectorAll('[data-tree-key][tabindex="0"]')).toHaveLength(1);
  });

  it('scrolls keyboard targets into the window and resets scroll on a scope change', async () => {
    const data = Array.from({ length: 100 }, (_, id) => ({ id, name: `Row ${id}` }));
    const view = render(TreeTable, {
      data, columns, virtualized: true, height: 80, rowHeight: 40, scopeKey: 'first',
    });
    const first = view.container.querySelector<HTMLElement>('[data-tree-key="number:0"]');
    if (!first) throw new Error('Missing first row');
    first.focus();
    await fireEvent.keyDown(first, { key: 'End' });
    await waitFor(() => expect(document.activeElement?.getAttribute('data-tree-key')).toBe('number:99'));
    expect(view.getByTestId('tree-table-viewport').scrollTop).toBeGreaterThan(0);
    await view.rerender({ scopeKey: 'second' });
    expect(view.getByTestId('tree-table-viewport').scrollTop).toBe(0);
    expect(view.getByText('Row 0')).toBeTruthy();
  });

  it('resets virtual scroll when a controlled page changes externally', async () => {
    const data = Array.from({ length: 100 }, (_, id) => ({ id, name: `Row ${id}` }));
    const view = render(TreeTable, {
      data, columns, virtualized: true, height: 80, rowHeight: 40, pageSize: 10, page: 1,
    });
    const viewport = view.getByTestId('tree-table-viewport');
    await fireEvent.scroll(viewport, { target: { scrollTop: 2000 } });
    expect(viewport.scrollTop).toBeGreaterThan(0);
    await view.rerender({ page: 2 });
    await waitFor(() => expect(viewport.scrollTop).toBe(0));
  });

  it('does not expose a misleading collapse action while filtering forces expansion', async () => {
    const view = render(TreeTable, {
      data: treeData, columns, filterable: true, filterText: 'Deep', filterKeys: ['name'],
    });
    const expandButton = view.getByRole('button', { name: 'Root Folder: Collapse' });
    expect(expandButton.hasAttribute('disabled')).toBe(true);
    expect(view.getByRole('button', { name: 'Collapse All' }).hasAttribute('disabled')).toBe(true);
    expect(view.getByRole('button', { name: 'Expand All' }).hasAttribute('disabled')).toBe(true);
    await fireEvent.click(expandButton);
    expect(view.getByText('Deep File')).toBeTruthy();
  });

  it('combines lazy loading, sorting, virtual rows and full-subtree selection', async () => {
    const loadChildren = vi.fn(async () => Array.from({ length: 100 }, (_, i) => ({
      id: i + 1, name: `Child ${100 - i}`, children: [],
    })));
    const onselect = vi.fn();
    const view = render(TreeTable, {
      data: [{ id: 0, name: 'Root' }], columns, virtualized: true, height: 120, rowHeight: 30,
      sort: { key: 'name', direction: 'asc' }, selectable: true, onselect, loadChildren,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Root: Expand' }));
    await waitFor(() => expect(view.getByText('Child 1')).toBeTruthy());
    expect(view.container.querySelectorAll('[data-tree-key]').length).toBeLessThan(15);
    await fireEvent.click(view.getByRole('checkbox', { name: 'Select record 0' }));
    expect(onselect.mock.lastCall?.[0]).toHaveLength(101);
    await fireEvent.click(view.getByRole('button', { name: 'Collapse All' }));
    expect(view.getByRole('treegrid').getAttribute('aria-rowcount')).toBe('2');
  });
});
