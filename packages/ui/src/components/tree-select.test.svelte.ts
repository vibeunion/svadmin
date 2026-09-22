import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, fireEvent, waitFor } from '@testing-library/svelte';
import { setLocale } from '@svadmin/core/i18n';
import TreeSelect, { type TreeSelectOption } from './TreeSelect.svelte';

const testOptions: TreeSelectOption[] = [
  {
    value: 'dept-1',
    label: '研发部',
    children: [
      { value: 'team-fe', label: '前端组' },
      { value: 'team-be', label: '后端组' },
    ],
  },
  {
    value: 'dept-2',
    label: '市场部',
    children: [
      { value: 'team-mkt', label: '营销组' },
    ],
  },
];
beforeEach(() => setLocale('en'));

function pendingLoad() {
  let resolve!: (children: TreeSelectOption[]) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<TreeSelectOption[]>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe('TreeSelect component', () => {
  it('keeps disabled inheritance after scrolling a virtual branch', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{
        value: 'root', label: 'Root', disabled: true, expanded: true,
        children: Array.from({ length: 250 }, (_, value) => ({ value, label: `Leaf ${value}` })),
      }],
      multiple: true, onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const tree = view.getByRole('tree');
    tree.scrollTop = 240 * 36;
    await fireEvent.scroll(tree);
    const leaf = view.getByRole('treeitem', { name: 'Leaf 249' });
    expect(leaf.getAttribute('aria-disabled')).toBe('true');
    await fireEvent.click(leaf);
    await fireEvent.keyDown(leaf, { key: 'Enter' });
    expect(onchange).not.toHaveBeenCalled();
    expect(view.getAllByRole('treeitem').length).toBeLessThanOrEqual(18);
  });

  it.each([false, true])('inherits disabled ancestors for direct selection in multiple=%s mode', async multiple => {
    const onchange = vi.fn();
    const loader = vi.fn(async () => [{ value: 'remote', label: 'Remote' }]);
    const view = render(TreeSelect, {
      options: [{
        value: 'blocked', label: 'Blocked', disabled: true, expanded: true,
        children: [
          { value: 'leaf', label: 'Leaf' },
          { value: 'lazy', label: 'Lazy', hasChildren: true },
        ],
      }, { value: 'allowed', label: 'Allowed' }],
      multiple, onchange, loadChildren: loader,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const leaf = view.getByRole('treeitem', { name: 'Leaf' });
    expect(leaf.getAttribute('aria-disabled')).toBe('true');
    await fireEvent.click(leaf);
    await fireEvent.keyDown(leaf, { key: 'Enter' });
    await fireEvent.keyDown(leaf, { key: ' ' });
    const lazy = view.getByRole('treeitem', { name: 'Lazy' });
    await fireEvent.keyDown(lazy, { key: 'ArrowRight' });
    expect(view.getByRole('button', { name: 'Lazy: Expand or collapse children' }).hasAttribute('disabled')).toBe(true);
    expect(loader).not.toHaveBeenCalled();
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.input(view.getByRole('textbox'), { target: { value: 'Leaf' } });
    await fireEvent.click(view.getByRole('treeitem', { name: 'Leaf' }));
    expect(onchange).not.toHaveBeenCalled();
    await view.rerender({ options: [{ value: 'leaf', label: 'Leaf' }] });
    await fireEvent.click(view.getByRole('treeitem', { name: 'Leaf' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith(multiple ? ['leaf'] : 'leaf');
  });

  it('navigates into the first matching child instead of a filtered-out child', async () => {
    const view = render(TreeSelect, {
      options: [{
        value: 'root', label: 'Root',
        children: [{ value: 'hidden', label: 'Hidden' }, { value: 'match', label: 'Match' }],
      }],
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await fireEvent.input(view.getByRole('textbox'), { target: { value: 'Match' } });
    const parent = view.getByRole('treeitem', { name: 'Root' });
    parent.focus();
    await fireEvent.keyDown(parent, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(view.getByRole('treeitem', { name: 'Match' }));
  });

  it('windows 10000 loaded nodes and reports full sibling positions after scrolling', async () => {
    const view = render(TreeSelect, {
      options: Array.from({ length: 10000 }, (_, value) => ({ value, label: `Node ${value}` })),
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const tree = view.getByRole('tree');
    expect(view.getAllByRole('treeitem').length).toBeLessThanOrEqual(18);
    expect(view.getByRole('treeitem', { name: 'Node 0' }).getAttribute('aria-setsize')).toBe('10000');
    tree.scrollTop = 36000;
    await fireEvent.scroll(tree);
    const node = view.getByRole('treeitem', { name: 'Node 1000' });
    expect(node.getAttribute('aria-posinset')).toBe('1001');
    expect(view.queryByRole('treeitem', { name: 'Node 0' })).toBeNull();
    expect(view.getAllByRole('treeitem').length).toBeLessThanOrEqual(18);
  });

  it('moves focus across virtual windows with End, Home and arrow keys without selecting', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: Array.from({ length: 1000 }, (_, value) => ({ value, label: `Node ${value}` })),
      onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const first = view.getByRole('treeitem', { name: 'Node 0' });
    first.focus();
    await fireEvent.keyDown(first, { key: 'End' });
    await waitFor(() => expect(document.activeElement?.getAttribute('data-tree-key')).toBe('number:999'));
    await fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    await waitFor(() => expect(document.activeElement?.getAttribute('data-tree-key')).toBe('number:0'));
    for (let index = 1; index <= 30; index++) {
      await fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
      await waitFor(() => expect(document.activeElement?.getAttribute('data-tree-key')).toBe(`number:${index}`));
    }
    expect(view.getAllByRole('treeitem').length).toBeLessThanOrEqual(19);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('resets a scrolled window on search and external tree replacement', async () => {
    const options = Array.from({ length: 1000 }, (_, value) => ({ value, label: `Node ${value}` }));
    const view = render(TreeSelect, { options });
    await fireEvent.click(view.container.querySelector('button')!);
    const tree = view.getByRole('tree');
    tree.scrollTop = 18000;
    await fireEvent.scroll(tree);
    await fireEvent.input(view.getByRole('textbox'), { target: { value: 'Node 999' } });
    expect(tree.scrollTop).toBe(0);
    expect(view.getAllByRole('treeitem')).toHaveLength(1);
    expect(view.getByRole('treeitem', { name: 'Node 999' })).toBeTruthy();
    await fireEvent.input(view.getByRole('textbox'), { target: { value: '' } });
    expect(view.getByRole('treeitem', { name: 'Node 0' })).toBeTruthy();
    tree.scrollTop = 18000;
    await fireEvent.scroll(tree);
    await view.rerender({ options: [{ value: 'replacement', label: 'Replacement' }] });
    expect(tree.scrollTop).toBe(0);
    expect(view.getAllByRole('treeitem')).toHaveLength(1);
    expect(view.getByRole('treeitem', { name: 'Replacement' })).toBeTruthy();
  });

  it('cascades across unmounted descendants and retains selection while scrolling', async () => {
    const onchange = vi.fn();
    const children = Array.from({ length: 250 }, (_, value) => ({ value, label: `Leaf ${value}` }));
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', expanded: true, children }],
      multiple: true, onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await fireEvent.click(view.getByRole('treeitem', { name: 'Root' }));
    expect(onchange).toHaveBeenLastCalledWith(children.map(node => node.value));
    const tree = view.getByRole('tree');
    tree.scrollTop = 240 * 36;
    await fireEvent.scroll(tree);
    expect(view.getByRole('treeitem', { name: 'Leaf 249' }).getAttribute('aria-checked')).toBe('true');
    expect(view.getByRole('treeitem', { name: 'Leaf 249' }).getAttribute('aria-level')).toBe('2');
    expect(view.getByRole('treeitem', { name: 'Leaf 249' }).getAttribute('aria-setsize')).toBe('250');
  });

  it('keeps a lazy branch in view when loading adds nodes to a virtual tree', async () => {
    const options: TreeSelectOption[] = Array.from({ length: 250 }, (_, value) => ({
      value, label: `Root ${value}`, ...(value === 240 ? { hasChildren: true } : {}),
    }));
    const view = render(TreeSelect, {
      options, loadChildren: async () => [{ value: 'child', label: 'Loaded child' }],
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const tree = view.getByRole('tree');
    tree.scrollTop = 235 * 36;
    await fireEvent.scroll(tree);
    await fireEvent.click(view.getByRole('button', { name: 'Root 240: Expand or collapse children' }));
    await view.findByRole('treeitem', { name: 'Loaded child' });
    expect(tree.scrollTop).toBe(235 * 36);
    const child = view.getByRole('treeitem', { name: 'Loaded child' });
    child.focus();
    await fireEvent.keyDown(child, { key: 'ArrowLeft' });
    await waitFor(() => expect(document.activeElement?.getAttribute('data-tree-key')).toBe('number:240'));
  });

  it('allows opting out of virtualization and normalizes invalid dimensions', async () => {
    const view = render(TreeSelect, {
      options: Array.from({ length: 250 }, (_, value) => ({ value, label: `Node ${value}` })),
      itemHeight: Number.NaN, viewportHeight: -1,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    expect(view.getByRole('tree').style.height).toBe('280px');
    expect(view.getByRole('treeitem', { name: 'Node 0' }).style.height).toBe('36px');
    await view.rerender({ virtualized: false });
    expect(view.getAllByRole('treeitem')).toHaveLength(250);
    expect(view.getByRole('tree').style.height).toBe('');
  });

  it('renders trigger with placeholder when no value is selected', () => {
    const view = render(TreeSelect, {
      options: testOptions,
      placeholder: '请选择部门',
    });

    expect(view.container.textContent).toContain('请选择部门');
  });

  it('renders selected label for single select value', () => {
    const view = render(TreeSelect, {
      options: testOptions,
      value: 'team-fe',
    });

    expect(view.container.textContent).toContain('前端组');
  });

  it('renders multiple badges for multiple select mode', () => {
    const view = render(TreeSelect, {
      options: testOptions,
      value: ['team-fe', 'team-be'],
      multiple: true,
    });

    expect(view.container.textContent).toContain('前端组');
    expect(view.container.textContent).toContain('后端组');
  });

  it('opens popup when clicked and renders tree nodes', async () => {
    const view = render(TreeSelect, {
      options: testOptions,
      placeholder: '选择',
    });

    const trigger = view.container.querySelector('button');
    if (trigger) await fireEvent.click(trigger);

    // Popover content rendered in body or container
    const content = document.body.textContent;
    expect(content).toContain('研发部');
    expect(content).toContain('市场部');
  });

  it('selects all descendant leaves and exposes a mixed parent state', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: testOptions,
      multiple: true,
      value: ['team-fe'],
      onchange,
    });

    const trigger = view.container.querySelector('button');
    if (trigger) await fireEvent.click(trigger);

    const parent = document.querySelector<HTMLElement>('[data-tree-value="dept-1"]');
    expect(parent?.getAttribute('aria-checked')).toBe('mixed');
    if (parent) await fireEvent.click(parent);

    expect(onchange).toHaveBeenCalledWith(['team-fe', 'team-be']);
  });

  it('supports tree keyboard navigation', async () => {
    const view = render(TreeSelect, { options: testOptions });
    const trigger = view.container.querySelector('button');
    if (trigger) await fireEvent.click(trigger);

    const first = document.querySelector<HTMLElement>('[data-tree-value="dept-1"]');
    const second = document.querySelector<HTMLElement>('[data-tree-value="dept-2"]');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (first && second) {
      first.focus();
      await fireEvent.keyDown(first, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(second);
      await fireEvent.keyDown(second, { key: 'Home' });
      expect(document.activeElement).toBe(first);
    }
  });

  it('keeps keyboard navigation scoped to the rendered tree instance', async () => {
    const view = render(TreeSelect, {
      options: [{ value: 'first', label: 'First' }, { value: 'second', label: 'Second' }],
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const firstNode = document.querySelector<HTMLElement>('[data-tree-key="string:first"]');
    const secondNode = document.querySelector<HTMLElement>('[data-tree-key="string:second"]');
    expect(firstNode).not.toBeNull();
    expect(secondNode).not.toBeNull();
    if (!firstNode || !secondNode) throw new Error('Missing tree nodes');
    const tree = firstNode.closest('[role="tree"]');
    if (!tree) throw new Error('Missing tree');
    const before = document.createElement('div');
    before.tabIndex = 0;
    before.dataset['treeValue'] = 'first';
    before.dataset['treeKey'] = 'string:first';
    const after = before.cloneNode() as HTMLDivElement;
    tree.before(before);
    tree.after(after);
    try {
      firstNode.focus();
      await fireEvent.keyDown(firstNode, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(secondNode);
      await fireEvent.keyDown(secondNode, { key: 'Home' });
      expect(document.activeElement).toBe(firstNode);
      await fireEvent.keyDown(firstNode, { key: 'End' });
      expect(document.activeElement).toBe(secondNode);
    } finally {
      before.remove();
      after.remove();
    }
  });

  it('keeps numeric and string node keys distinct for parent navigation', async () => {
    const view = render(TreeSelect, {
      options: [{
        value: 1,
        label: 'Numeric parent',
        children: [{ value: '1', label: 'String child' }],
      }],
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const parent = document.querySelector<HTMLElement>('[data-tree-key="number:1"]');
    expect(parent).not.toBeNull();
    if (!parent) return;
    await fireEvent.click(view.getByRole('button', { name: 'Numeric parent: Expand or collapse children' }));
    const child = document.querySelector<HTMLElement>('[data-tree-key="string:1"]');
    expect(child).not.toBeNull();
    if (child) {
      parent.focus();
      await fireEvent.keyDown(parent, { key: 'ArrowRight' });
      expect(document.activeElement).toBe(child);
      await fireEvent.keyDown(child, { key: 'ArrowLeft' });
      expect(document.activeElement).toBe(parent);
    }
  });

  it('loads lazy children before expanding', async () => {
    const loadChildren = vi.fn(async () => [{ value: 'lazy-child', label: '懒加载节点' }]);
    const view = render(TreeSelect, {
      options: [{ value: 'lazy', label: '懒加载部门', hasChildren: true }],
      loadChildren,
    });
    const trigger = view.container.querySelector('button');
    if (trigger) await fireEvent.click(trigger);

    const expand = document.querySelector<HTMLButtonElement>('[data-tree-value="lazy"] button');
    expect(expand).not.toBeNull();
    if (expand) await fireEvent.click(expand);

    expect(loadChildren).toHaveBeenCalledOnce();
    expect(document.body.textContent).toContain('懒加载节点');
  });

  it('loads lazy children before cascading a multiple parent selection', async () => {
    const onchange = vi.fn();
    const loadChildren = vi.fn(async () => [
      { value: 'lazy-a', label: 'Lazy A' },
      { value: 'lazy-b', label: 'Lazy B', disabled: true },
      { value: 'lazy-c', label: 'Lazy C' },
    ]);
    const view = render(TreeSelect, {
      options: [{ value: 'lazy-parent', label: 'Lazy parent', hasChildren: true }],
      multiple: true,
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const parent = view.getByRole('treeitem', { name: 'Lazy parent' });
    await fireEvent.click(parent);

    await waitFor(() => expect(loadChildren).toHaveBeenCalledOnce());
    await waitFor(() => expect(onchange).toHaveBeenLastCalledWith(['lazy-a', 'lazy-c']));
    expect(view.getByRole('treeitem', { name: 'Lazy parent' }).getAttribute('aria-checked')).toBe('true');
  });

  it('does not select a lazy parent when loading fails', async () => {
    const onchange = vi.fn();
    const loadChildren = vi.fn(async () => {
      throw new Error('provider failure');
    });
    const view = render(TreeSelect, {
      options: [{ value: 'lazy-parent', label: 'Lazy parent', hasChildren: true }],
      multiple: true,
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await fireEvent.click(view.getByRole('treeitem', { name: 'Lazy parent' }));

    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(onchange).not.toHaveBeenCalled();
    expect(view.getByRole('treeitem', { name: /^Lazy parent/ }).getAttribute('aria-checked')).toBe('false');
  });

  it('uses the complete source subtree for cascade selection while searching', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{
        value: 'root', label: 'Root',
        children: [{ value: 'a', label: 'Match' }, { value: 'b', label: 'Hidden' }],
      }],
      multiple: true, value: ['a'], onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await fireEvent.input(view.getByRole('textbox'), { target: { value: 'Match' } });
    const parent = view.getByRole('treeitem', { name: 'Root' });
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    expect(parent.getAttribute('aria-checked')).toBe('mixed');
    await fireEvent.click(parent);
    expect(onchange).toHaveBeenLastCalledWith(['a', 'b']);
    expect(parent.getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(parent);
    expect(onchange).toHaveBeenLastCalledWith([]);
  });

  it('loads nested branches atomically and excludes disabled subtrees from cascade', async () => {
    const pending = pendingLoad();
    const onchange = vi.fn();
    const loader = vi.fn((node: TreeSelectOption) => node.value === 'root'
      ? Promise.resolve([
        { value: 'a', label: 'A' },
        { value: 'branch', label: 'Branch', hasChildren: true },
        { value: 'disabled', label: 'Disabled', disabled: true, hasChildren: true },
      ]) : pending.promise);
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', hasChildren: true }],
      multiple: true, loadChildren: loader, onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const parent = view.getByRole('treeitem', { name: 'Root' });
    await fireEvent.click(parent);
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    expect(onchange).not.toHaveBeenCalled();
    expect(parent.getAttribute('aria-busy')).toBe('true');
    await fireEvent.click(parent);
    expect(loader).toHaveBeenCalledTimes(2);
    await act(async () => { pending.resolve([{ value: 'b', label: 'B' }]); await pending.promise; });
    await waitFor(() => expect(onchange).toHaveBeenCalledExactlyOnceWith(['a', 'b']));
    expect(parent.getAttribute('aria-busy')).toBe('false');
    expect(parent.getAttribute('aria-checked')).toBe('true');
  });

  it('retries a failed descendant from the parent without partially committing its siblings', async () => {
    const pending = pendingLoad();
    const onchange = vi.fn();
    const loader = vi.fn(() => pending.promise);
    const view = render(TreeSelect, {
      options: [{
        value: 'root', label: 'Root',
        children: [{ value: 'a', label: 'A' }, { value: 'branch', label: 'Branch', hasChildren: true }],
      }],
      multiple: true, value: ['a'], loadChildren: loader, onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const parent = view.getByRole('treeitem', { name: 'Root' });
    expect(parent.getAttribute('aria-checked')).toBe('mixed');
    await fireEvent.click(parent);
    await act(async () => { pending.reject(new Error('private details')); await pending.promise.catch(() => {}); });
    await view.findByRole('alert');
    expect(onchange).not.toHaveBeenCalled();
    expect(view.queryByText('private details')).toBeNull();
    loader.mockResolvedValue([{ value: 'b', label: 'B' }]);
    await fireEvent.click(view.getByRole('button', { name: 'Root: Retry' }));
    await waitFor(() => expect(onchange).toHaveBeenCalledExactlyOnceWith(['a', 'b']));
    expect(view.queryByRole('alert')).toBeNull();
  });

  it.each(['options', 'loader', 'disabled', 'value', 'leaf', 'unmount'] as const)(
    'does not commit a pending cascade after %s changes', async change => {
      const pending = pendingLoad();
      const onchange = vi.fn();
      const loader = vi.fn(() => pending.promise);
      const view = render(TreeSelect, {
        options: [{ value: 'root', label: 'Root', hasChildren: true }, { value: 'other', label: 'Other' }],
        multiple: true, loadChildren: loader, onchange,
      });
      await fireEvent.click(view.container.querySelector('button')!);
      await fireEvent.click(view.getByRole('treeitem', { name: 'Root' }));
      if (change === 'options') await view.rerender({ options: [{ value: 'root', label: 'New root', hasChildren: true }] });
      if (change === 'loader') await view.rerender({ loadChildren: async () => [] });
      if (change === 'disabled') {
        await view.rerender({ disabled: true });
        await view.rerender({ disabled: false });
      }
      if (change === 'value') await view.rerender({ value: ['other'] });
      if (change === 'leaf') await fireEvent.click(view.getByRole('treeitem', { name: 'Other' }));
      if (change === 'unmount') view.unmount();
      const calls = onchange.mock.calls.length;
      await act(async () => { pending.resolve([{ value: 'late', label: 'Late' }]); await pending.promise; });
      await waitFor(() => expect(loader).toHaveBeenCalledOnce());
      expect(onchange).toHaveBeenCalledTimes(calls);
    },
  );

  it.each(['click', 'keyboard'] as const)('only expands parents in leaf-only mode via %s', async action => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', hasChildren: true }],
      multiple: true, onlyLeafSelectable: true,
      loadChildren: async () => [{ value: 'leaf', label: 'Leaf' }], onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const parent = view.getByRole('treeitem', { name: 'Root' });
    if (action === 'click') await fireEvent.click(parent);
    else await fireEvent.keyDown(parent, { key: 'Enter' });
    await view.findByRole('treeitem', { name: 'Leaf' });
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(view.getByRole('treeitem', { name: 'Leaf' }));
    expect(onchange).toHaveBeenCalledWith(['leaf']);
  });

  it('does not load descendants when directly selecting a parent in single mode', async () => {
    const loader = vi.fn(async () => []);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', hasChildren: true }],
      loadChildren: loader, onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await fireEvent.click(view.getByRole('treeitem', { name: 'Root' }));
    expect(onchange).toHaveBeenCalledWith('root');
    expect(loader).not.toHaveBeenCalled();
  });

  it('bounds automatic cascade requests and leaves selection untouched on exhaustion', async () => {
    const loader = vi.fn(async (node: TreeSelectOption) => [{ value: `${node.value}-leaf`, label: 'Leaf' }]);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{
        value: 'root', label: 'Root',
        children: Array.from({ length: 101 }, (_, index) => ({
          value: `branch-${index}`, label: `Branch ${index}`, hasChildren: true,
        })),
      }],
      multiple: true, loadChildren: loader, onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await fireEvent.click(view.getByRole('treeitem', { name: 'Root' }));
    await view.findByRole('alert');
    expect(loader).toHaveBeenCalledTimes(100);
    expect(onchange).not.toHaveBeenCalled();
    expect(view.getByRole('treeitem', { name: /^Root/ }).getAttribute('aria-busy')).toBe('false');
  });

  it('bounds cascade depth without selecting an incompletely loaded chain', async () => {
    const loader = vi.fn(async (node: TreeSelectOption) => [{
      value: Number(node.value) + 1, label: 'Nested', hasChildren: true,
    }]);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 0, label: 'Root', hasChildren: true }],
      multiple: true, loadChildren: loader, onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await fireEvent.click(view.getByRole('treeitem', { name: 'Root' }));
    await view.findByRole('alert');
    expect(loader).toHaveBeenCalledTimes(65);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('does not turn keyboard activation of an expansion button into parent selection', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, { options: testOptions, multiple: true, onchange });
    await fireEvent.click(view.container.querySelector('button')!);
    const expand = view.getByRole('button', { name: '研发部: Expand or collapse children' });
    await fireEvent.keyDown(expand, { key: 'Enter' });
    await fireEvent.click(expand);
    await view.findByRole('treeitem', { name: '前端组' });
    expect(onchange).not.toHaveBeenCalled();
  });

  it('does not bypass component disablement through an already-open tree', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'leaf', label: 'Leaf' }], multiple: true, onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await view.rerender({ disabled: true });
    const leaf = view.getByRole('treeitem', { name: 'Leaf' });
    expect(leaf.getAttribute('aria-disabled')).toBe('true');
    await fireEvent.click(leaf);
    await fireEvent.keyDown(leaf, { key: 'Enter' });
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(['clear', 'remove'] as const)('retires pending cascade after keyboard %s', async action => {
    const pending = pendingLoad();
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [
        { value: 'root', label: 'Root', hasChildren: true },
        { value: 'previous', label: 'Previous' },
      ],
      multiple: true, value: ['previous'], loadChildren: () => pending.promise, onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await fireEvent.click(view.getByRole('treeitem', { name: 'Root' }));
    await fireEvent.keyDown(view.getByRole('button', {
      name: action === 'clear' ? 'Clear selection' : 'Remove Previous',
    }), { key: ' ' });
    expect(onchange).toHaveBeenCalledExactlyOnceWith([]);
    await act(async () => { pending.resolve([{ value: 'late', label: 'Late' }]); await pending.promise; });
    expect(onchange).toHaveBeenCalledExactlyOnceWith([]);
  });

  it('bounds visited cascade nodes before committing a wide lazy subtree', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', hasChildren: true }],
      multiple: true,
      loadChildren: async () => Array.from({ length: 10000 }, (_, index) => ({
        value: index, label: `Leaf ${index}`,
      })),
      onchange,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await fireEvent.click(view.getByRole('treeitem', { name: 'Root' }));
    await view.findByRole('alert');
    expect(onchange).not.toHaveBeenCalled();
  });

  it('shows sanitized failure and retries successfully', async () => {
    const pending = pendingLoad();
    const loadChildren = vi.fn(() => pending.promise);
    const view = render(TreeSelect, {
      options: [{ value: 'lazy-error', label: '失败部门', hasChildren: true }],
      loadChildren,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const expand = document.querySelector<HTMLButtonElement>('[data-tree-value="lazy-error"] button');
    if (!expand) throw new Error('Expected expand control');
    await fireEvent.click(expand);
    await act(async () => {
      pending.reject(new Error('private provider details'));
      await pending.promise.catch(() => {});
    });
    expect(view.getByRole('alert').textContent).toBe('Failed to load child nodes');
    expect(view.queryByText('private provider details')).toBeNull();
    loadChildren.mockResolvedValue([{ value: 'recovered', label: 'Recovered child' }]);
    await fireEvent.click(view.getByRole('button', { name: '失败部门: Retry' }));
    await view.findByText('Recovered child');
    expect(view.queryByRole('alert')).toBeNull();
    expect(loadChildren).toHaveBeenCalledTimes(2);
  });

  it.each(['success', 'error'] as const)('ignores late %s after unmount', async outcome => {
    const pending = pendingLoad();
    const view = render(TreeSelect, {
      options: [{ value: 'lazy', label: 'Lazy', hasChildren: true }],
      loadChildren: () => pending.promise,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await fireEvent.click(view.getByRole('button', { name: 'Lazy: Expand or collapse children' }));
    view.unmount();
    await act(async () => {
      if (outcome === 'success') pending.resolve([{ value: 'late', label: 'Late child' }]);
      else pending.reject(new Error('Late error'));
      await pending.promise.catch(() => {});
    });
    expect(view.queryByText('Late child')).toBeNull();
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('isolates replacement trees with the same key while retaining the new request', async () => {
    const old = pendingLoad();
    const fresh = pendingLoad();
    const loader = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Old', hasChildren: true }], loadChildren: loader,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await fireEvent.click(view.getByRole('button', { name: 'Old: Expand or collapse children' }));
    await view.rerender({ options: [{ value: 'root', label: 'New', hasChildren: true }] });
    const expand = view.getByRole('button', { name: 'New: Expand or collapse children' });
    await fireEvent.click(expand);
    expect(loader).toHaveBeenCalledTimes(2);
    await act(async () => { old.resolve([{ value: 'old', label: 'Old child' }]); await old.promise; });
    expect(view.queryByText('Old child')).toBeNull();
    expect(expand.getAttribute('aria-busy')).toBe('true');
    await act(async () => { fresh.resolve([{ value: 'new', label: 'New child' }]); await fresh.promise; });
    await view.findByText('New child');
    expect(expand.getAttribute('aria-busy')).toBe('false');
  });

  it('loads independent branches concurrently and ignores repeat expansion while loading', async () => {
    const first = pendingLoad();
    const second = pendingLoad();
    const loader = vi.fn((node: TreeSelectOption) => node.value === 'first' ? first.promise : second.promise);
    const view = render(TreeSelect, {
      options: [
        { value: 'first', label: 'First', hasChildren: true },
        { value: 'second', label: 'Second', hasChildren: true },
      ],
      loadChildren: loader,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    const firstExpand = view.getByRole('button', { name: 'First: Expand or collapse children' });
    await fireEvent.click(firstExpand);
    await fireEvent.click(firstExpand);
    await fireEvent.click(view.getByRole('button', { name: 'Second: Expand or collapse children' }));
    expect(loader).toHaveBeenCalledTimes(2);
    await act(async () => { first.resolve([{ value: 'one', label: 'First child' }]); await first.promise; });
    await act(async () => { second.resolve([{ value: 'two', label: 'Second child' }]); await second.promise; });
    await waitFor(() => {
      expect(view.getByText('First child')).toBeTruthy();
      expect(view.getByText('Second child')).toBeTruthy();
    });
  });

  it.each(['disabled', 'loader'] as const)('retires old loads when %s changes', async change => {
    const old = pendingLoad();
    const fresh = pendingLoad();
    const loader = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const replacement = vi.fn(() => fresh.promise);
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', hasChildren: true }],
      loadChildren: loader,
    });
    await fireEvent.click(view.container.querySelector('button')!);
    await fireEvent.click(view.getByRole('button', { name: 'Root: Expand or collapse children' }));
    if (change === 'disabled') {
      await view.rerender({ disabled: true });
      await view.rerender({ disabled: false });
    } else {
      await view.rerender({ loadChildren: replacement });
    }
    const expand = view.getByRole('button', { name: 'Root: Expand or collapse children' });
    await fireEvent.click(expand);
    await act(async () => { old.reject(new Error('Obsolete private error')); await old.promise.catch(() => {}); });
    expect(view.queryByRole('alert')).toBeNull();
    expect(expand.getAttribute('aria-busy')).toBe('true');
    await act(async () => { fresh.resolve([{ value: 'new', label: 'Fresh child' }]); await fresh.promise; });
    await view.findByText('Fresh child');
    expect(expand.getAttribute('aria-busy')).toBe('false');
  });
});
