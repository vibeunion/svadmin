import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import TreeSelect, { type TreeSelectOption } from './TreeSelect.svelte';
import TreeSelectBindOptionsHost from './tree-select-bind-options.test-host.svelte';

import { requireValue } from '../../../../scripts/test-assertions';
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

function pendingLoad() {
  let resolve!: (children: TreeSelectOption[]) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<TreeSelectOption[]>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe('TreeSelect component', () => {
  it('propagates asynchronously loaded children through bind:options', async () => {
    const view = render(TreeSelectBindOptionsHost);

    await fireEvent.click(view.getByRole('button', { name: 'Departments' }));
    await fireEvent.click(view.getByRole('button', { name: 'Root: Expand or collapse children' }));

    await waitFor(() => expect(view.getByRole('treeitem', { name: 'Child' })).toBeTruthy());
    expect(JSON.parse(view.getByTestId('bound-options').textContent ?? '[]')).toEqual([
      {
        value: 'root',
        label: 'Root',
        hasChildren: true,
        children: [{ value: 'child', label: 'Child' }],
      },
    ]);
  });

  it('preserves external label naming and falls back from an empty aria label', async () => {
    const host = document.createElement('div');
    const label = document.createElement('label');
    label.htmlFor = 'labelled-tree';
    label.textContent = 'Department field';
    host.append(label);
    document.body.append(host);
    const view = render(TreeSelect, { target: host, props: {
      id: 'labelled-tree', ariaLabel: '', options: testOptions, value: 'team-fe',
    } });
    try {
      const trigger = view.getByRole('button', { name: 'Department field' });
      expect(trigger.hasAttribute('aria-label')).toBe(false);
      label.remove();
      expect(view.getByRole('button', { name: '前端组', exact: true })).toBe(trigger);
      await view.rerender({ ariaLabel: 'Departments' });
      expect(view.getByRole('button', { name: 'Departments' })).toBe(trigger);
    } finally {
      view.unmount();
      host.remove();
    }
  });

  it.each([false, true])('renders native non-nested selection actions (multiple=%s)', async multiple => {
    const form = document.createElement('form');
    document.body.append(form);
    const submit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener('submit', submit);
    const onchange = vi.fn();
    const view = render(TreeSelect, { target: form, props: {
      options: testOptions, multiple,
      value: multiple ? ['team-fe', 'team-be'] : 'team-fe',
      ariaLabel: 'Departments', onchange,
    } });
    try {
      const trigger = view.getByRole('button', { name: 'Departments' });
      expect(trigger.querySelector('button, [role="button"], [tabindex]')).toBeNull();
      const clear = view.getByRole('button', { name: 'Clear selection' });
      expect(clear.tagName).toBe('BUTTON');
      expect(clear.getAttribute('type')).toBe('button');
      expect(trigger.contains(clear)).toBe(false);
      if (multiple) {
        const remove = view.getByRole('button', { name: 'Remove 前端组' });
        expect(remove.tagName).toBe('BUTTON');
        expect(remove.getAttribute('type')).toBe('button');
        expect(trigger.contains(remove)).toBe(false);
        await fireEvent.click(remove);
        expect(onchange).toHaveBeenCalledExactlyOnceWith(['team-be']);
        expect(document.activeElement).toBe(trigger);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
      }
      await fireEvent.click(clear);
      expect(onchange).toHaveBeenLastCalledWith(multiple ? [] : undefined);
      expect(onchange).toHaveBeenCalledTimes(multiple ? 2 : 1);
      expect(document.activeElement).toBe(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(submit).not.toHaveBeenCalled();
    } finally {
      view.unmount();
      form.remove();
    }
  });

  it('hides selection actions while disabled and restores them without changing values', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: testOptions, multiple: true, value: ['team-fe'],
      disabled: true, ariaLabel: 'Departments', onchange,
    });
    expect(view.queryByRole('button', { name: 'Remove 前端组' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Clear selection' })).toBeNull();
    expect(view.getByRole('button', { name: 'Departments' }).hasAttribute('disabled')).toBe(true);
    await view.rerender({ disabled: false, allowClear: false });
    expect(view.getByRole('button', { name: 'Remove 前端组' }).tagName).toBe('BUTTON');
    expect(view.queryByRole('button', { name: 'Clear selection' })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(
    (['disabled', 'options', 'loader'] as const).flatMap(scope =>
      (['success', 'failure'] as const).flatMap(outcome =>
        (['old-first', 'new-first'] as const).map(order => ({ scope, outcome, order })))),
  )('isolates shared loads across $scope replacement with $outcome / $order', async ({ scope, outcome, order }) => {
    const old = pendingLoad();
    const fresh = pendingLoad();
    const loader = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const replacementLoader = vi.fn(() => fresh.promise);
    const onchange = vi.fn();
    const makeOptions = (): TreeSelectOption[] => [{
      value: 'root', label: 'Root', expanded: true,
      children: [
        { value: 'kept', label: 'Kept' },
        { value: 'lazy', label: 'Lazy', hasChildren: true, disabled: false },
      ],
    }];
    const options = $state<TreeSelectOption[]>(makeOptions());
    const view = render(TreeSelect, { options, multiple: true, loadChildren: loader, onchange });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const beginSharedSelection = async () => {
      await fireEvent.keyDown(view.getByRole('treeitem', { name: 'Lazy' }), { key: 'ArrowRight' });
      await fireEvent.keyDown(view.getByRole('treeitem', { name: 'Root' }), { key: ' ' });
      await waitFor(() => expect(view.getByRole('treeitem', { name: 'Root' }).getAttribute('aria-busy')).toBe('true'));
    };
    await beginSharedSelection();
    expect(loader).toHaveBeenCalledOnce();

    if (scope === 'disabled') {
      const child = requireValue(options[0]?.children?.[1]);
      await act(() => { child.disabled = true; });
      await act(() => { child.disabled = false; });
    } else if (scope === 'options') {
      await view.rerender({ options: makeOptions() });
    } else {
      await view.rerender({ loadChildren: replacementLoader });
    }
    expect(view.getByRole('treeitem', { name: 'Root' }).getAttribute('aria-busy')).toBe('false');
    expect(view.getByRole('treeitem', { name: 'Lazy' }).getAttribute('aria-busy')).toBe('false');
    await beginSharedSelection();
    expect(loader).toHaveBeenCalledTimes(scope === 'loader' ? 1 : 2);
    expect(replacementLoader).toHaveBeenCalledTimes(scope === 'loader' ? 1 : 0);
    const settleOld = async () => {
      await act(async () => {
        if (outcome === 'success') old.resolve([{ value: 'old', label: 'Old child' }]);
        else old.reject(new Error('PRIVATE_OLD_SHARED_LOAD'));
        await old.promise.catch(() => {});
      });
    };
    if (order === 'old-first') {
      await settleOld();
      expect(onchange).not.toHaveBeenCalled();
      expect(view.getByRole('treeitem', { name: 'Lazy' }).getAttribute('aria-busy')).toBe('true');
      expect(view.getByRole('treeitem', { name: 'Root' }).getAttribute('aria-busy')).toBe('true');
      expect(view.queryByRole('alert')).toBeNull();
    }
    await act(async () => { fresh.resolve([{ value: 'fresh', label: 'Fresh child' }]); await fresh.promise; });
    await waitFor(() => expect(onchange).toHaveBeenCalledExactlyOnceWith(['kept', 'fresh']));
    if (order === 'new-first') await settleOld();
    expect(onchange).toHaveBeenCalledExactlyOnceWith(['kept', 'fresh']);
    expect(view.queryByRole('treeitem', { name: 'Old child' })).toBeNull();
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('treeitem', { name: 'Fresh child' }).getAttribute('aria-checked')).toBe('true');
    expect(view.getByRole('treeitem', { name: 'Lazy' }).getAttribute('aria-busy')).toBe('false');
    expect(view.getByRole('treeitem', { name: 'Lazy' }).getAttribute('aria-expanded')).toBe('true');
  });

  it.each(['Root', 'Lazy'] as const)('hands shared selection ownership to the last selected %s', async lastSelected => {
    const pending = pendingLoad();
    const loader = vi.fn(() => pending.promise);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', expanded: true, children: [
        { value: 'kept', label: 'Kept' },
        { value: 'lazy', label: 'Lazy', hasChildren: true },
      ] }],
      multiple: true, loadChildren: loader, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    await fireEvent.keyDown(view.getByRole('treeitem', { name: 'Lazy' }), { key: 'ArrowRight' });
    await fireEvent.keyDown(view.getByRole('treeitem', { name: lastSelected === 'Root' ? 'Lazy' : 'Root' }), { key: ' ' });
    await fireEvent.keyDown(view.getByRole('treeitem', { name: lastSelected }), { key: ' ' });
    expect(loader).toHaveBeenCalledOnce();
    expect(onchange).not.toHaveBeenCalled();
    await act(async () => { pending.resolve([{ value: 'fresh', label: 'Fresh child' }]); await pending.promise; });
    await waitFor(() => expect(onchange).toHaveBeenCalledExactlyOnceWith(lastSelected === 'Root' ? ['kept', 'fresh'] : ['fresh']));
    expect(view.queryByRole('alert')).toBeNull();
  });

  it.each(['Enter', ' '] as const)('does not reinterpret repeated %s during expansion retry as selection', async key => {
    const pending = pendingLoad();
    const loader = vi.fn().mockRejectedValueOnce(new Error('private')).mockReturnValueOnce(pending.promise);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'lazy', label: 'Lazy', hasChildren: true }],
      multiple: true, loadChildren: loader, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const node = view.getByRole('treeitem', { name: 'Lazy' });
    await fireEvent.keyDown(node, { key: 'ArrowRight' });
    await view.findByRole('alert');
    await fireEvent.keyDown(node, { key: 'Enter' });
    await fireEvent.keyDown(node, { key });
    await fireEvent.keyDown(node, { key });
    expect(loader).toHaveBeenCalledTimes(2);
    await act(async () => { pending.resolve([{ value: 'leaf', label: 'Leaf' }]); await pending.promise; });
    expect(await view.findByRole('treeitem', { name: 'Leaf' })).toBeTruthy();
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.keyDown(node, { key });
    await waitFor(() => expect(onchange).toHaveBeenCalledExactlyOnceWith(['leaf']));
  });

  it('keeps typed node IDs stable when an earlier subtree loads', async () => {
    const pending = pendingLoad();
    const view = render(TreeSelect, {
      options: [
        { value: 'lazy', label: 'Lazy', hasChildren: true },
        { value: 0, label: 'Number zero', expanded: true, children: [{ value: 'a / \uD800', label: 'Odd key' }] },
        { value: '0', label: 'String zero' },
      ],
      loadChildren: () => pending.promise,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const numberNode = view.getByRole('treeitem', { name: 'Number zero' });
    const stringNode = view.getByRole('treeitem', { name: 'String zero' });
    const oddNode = view.getByRole('treeitem', { name: 'Odd key' });
    const ids = [numberNode.id, stringNode.id, oddNode.id];
    expect(new Set(ids).size).toBe(3);
    expect(ids.every(id => id.length > 0 && !/\s/.test(id))).toBe(true);
    const groupId = numberNode.getAttribute('aria-owns');
    await fireEvent.keyDown(view.getByRole('treeitem', { name: 'Lazy' }), { key: 'ArrowRight' });
    await act(async () => { pending.resolve([{ value: 'inserted', label: 'Inserted' }]); await pending.promise; });
    expect([numberNode.id, stringNode.id, oddNode.id]).toEqual(ids);
    expect(numberNode.getAttribute('aria-owns')).toBe(groupId);
    expect(document.getElementById(requireValue(groupId))?.contains(oddNode)).toBe(true);
  });

  it('hands pointer control focus back to the owning tree item before loading finishes', async () => {
    const pending = pendingLoad();
    const view = render(TreeSelect, {
      options: [{ value: 'lazy', label: 'Lazy', hasChildren: true }],
      loadChildren: () => pending.promise,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const expand = view.getByRole('button', { name: 'Lazy: Expand or collapse children' });
    expand.focus();
    await fireEvent.click(expand);
    expect(document.activeElement).toBe(view.getByRole('treeitem', { name: 'Lazy' }));
    await act(async () => { pending.resolve([{ value: 'leaf', label: 'Leaf' }]); await pending.promise; });
  });

  it('names the tree and search, associates real child groups, and keeps one tree Tab stop', async () => {
    const view = render(TreeSelect, { options: testOptions, ariaLabel: 'Departments', multiple: true });
    await fireEvent.click(view.getByRole('button', { name: 'Departments' }));
    const tree = view.getByRole('tree', { name: 'Departments' });
    expect(tree.tabIndex).toBe(-1);
    const search = view.getByRole('textbox', { name: 'Search...' });
    expect(search.getAttribute('aria-controls')).toBe(tree.id);
    expect(tree.querySelectorAll('[role="treeitem"][tabindex="0"]')).toHaveLength(1);
    await fireEvent.keyDown(search, { key: 'ArrowDown' });
    const root = view.getByRole('treeitem', { name: '研发部' });
    expect(document.activeElement).toBe(root);
    await fireEvent.keyDown(root, { key: 'ArrowRight' });
    await waitFor(() => expect(root.getAttribute('aria-expanded')).toBe('true'));
    const groupId = requireValue(root.getAttribute('aria-owns'));
    const group = requireValue(document.getElementById(groupId));
    expect(group.getAttribute('role')).toBe('group');
    expect(group.textContent).toContain('前端组');
    await fireEvent.keyDown(root, { key: 'ArrowRight' });
    const child = view.getByRole('treeitem', { name: '前端组' });
    await waitFor(() => expect(document.activeElement).toBe(child));
    expect(child.tabIndex).toBe(0);
    expect(root.tabIndex).toBe(-1);
    expect(tree.querySelectorAll('[role="treeitem"][tabindex="0"]')).toHaveLength(1);
    expect(view.getByRole('button', { name: '研发部: Expand or collapse children' }).tabIndex).toBe(-1);
    await fireEvent.keyDown(child, { key: 'ArrowLeft' });
    await fireEvent.keyDown(root, { key: 'ArrowLeft' });
    expect(root.hasAttribute('aria-owns')).toBe(false);
    expect(document.getElementById(groupId)).toBeNull();
  });

  it('keeps a Tab entry after the active node is filtered or replaced', async () => {
    const view = render(TreeSelect, { options: testOptions });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const search = view.getByRole('textbox');
    await fireEvent.keyDown(search, { key: 'ArrowDown' });
    await fireEvent.keyDown(view.getByRole('treeitem', { name: '研发部' }), { key: 'End' });
    await fireEvent.input(search, { target: { value: '研发部' } });
    expect(view.getByRole('treeitem', { name: '研发部' }).tabIndex).toBe(0);
    await fireEvent.input(search, { target: { value: '' } });
    await view.rerender({ options: [{ value: 'new', label: 'New' }] });
    expect(view.getByRole('treeitem', { name: 'New' }).tabIndex).toBe(0);
    expect(view.getByRole('tree').querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  });

  it('retains one rendered Tab stop across virtual scrolling without dangling group ownership', async () => {
    const view = render(TreeSelect, { options: [{
      value: 'root', label: 'Root', expanded: true,
      children: Array.from({ length: 250 }, (_, value) => ({ value, label: `Leaf ${value}` })),
    }] });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    await fireEvent.keyDown(view.getByRole('textbox'), { key: 'ArrowDown' });
    const tree = view.getByRole('tree');
    expect(view.getByRole('treeitem', { name: 'Root' }).hasAttribute('aria-owns')).toBe(false);
    tree.scrollTop = 240 * 36;
    await fireEvent.scroll(tree);
    expect(tree.querySelectorAll('[role="treeitem"][tabindex="0"]')).toHaveLength(1);
    expect(view.getAllByRole('treeitem').length).toBeLessThan(20);
  });

  it.each(['Enter', ' '] as const)('retries a failed expansion with %s without committing selection', async key => {
    const loader = vi.fn().mockRejectedValueOnce(new Error('PRIVATE_LOAD'))
      .mockResolvedValueOnce([{ value: 'leaf', label: 'Leaf' }]);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'lazy', label: 'Lazy', hasChildren: true }],
      loadChildren: loader, multiple: true, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const node = view.getByRole('treeitem', { name: 'Lazy' });
    await fireEvent.keyDown(node, { key: 'ArrowRight' });
    const alert = await view.findByRole('alert');
    expect(node.getAttribute('aria-describedby')).toBe(alert.id);
    expect(view.getByRole('button', { name: 'Lazy: Retry' }).tabIndex).toBe(-1);
    await fireEvent.keyDown(node, { key });
    expect(await view.findByRole('treeitem', { name: 'Leaf' })).toBeTruthy();
    expect(onchange).not.toHaveBeenCalled();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(node.hasAttribute('aria-describedby')).toBe(false);
  });

  it('does not treat composition or modified search keys as navigation', async () => {
    const view = render(TreeSelect, { options: testOptions });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const search = view.getByRole('textbox');
    search.focus();
    for (const modifiers of [{ isComposing: true }, { altKey: true }, { ctrlKey: true }, { shiftKey: true }, { metaKey: true }]) {
      await fireEvent.keyDown(search, { key: 'ArrowDown', ...modifiers });
      expect(document.activeElement).toBe(search);
    }
  });

  it.each(['root', 'lazy'] as const)('shares an expansion request with selection of %s without false failure', async selectedKey => {
    const pending = pendingLoad();
    const loader = vi.fn(() => pending.promise);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', expanded: true, children: [
        { value: 'kept', label: 'Kept' },
        { value: 'lazy', label: 'Lazy', hasChildren: true },
      ] }], multiple: true, loadChildren: loader, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    await fireEvent.keyDown(view.getByRole('treeitem', { name: 'Lazy' }), { key: 'ArrowRight' });
    await fireEvent.keyDown(view.getByRole('treeitem', { name: selectedKey === 'root' ? 'Root' : 'Lazy' }), { key: ' ' });
    expect(loader).toHaveBeenCalledOnce();
    expect(view.queryByRole('alert')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
    await act(async () => { pending.resolve([{ value: 'fresh', label: 'Fresh' }]); await pending.promise; });
    await waitFor(() => expect(onchange).toHaveBeenCalledExactlyOnceWith(selectedKey === 'root' ? ['kept', 'fresh'] : ['fresh']));
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('treeitem', { name: 'Lazy' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps a shared expansion/selection failure retryable without committing', async () => {
    const pending = pendingLoad();
    const loader = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce([{ value: 'leaf', label: 'Leaf' }]);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'lazy', label: 'Lazy', hasChildren: true }],
      multiple: true, loadChildren: loader, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const node = view.getByRole('treeitem', { name: 'Lazy' });
    await fireEvent.keyDown(node, { key: 'ArrowRight' });
    await fireEvent.keyDown(node, { key: ' ' });
    await act(async () => { pending.reject(new Error('PRIVATE_TREE_LOAD')); await pending.promise.catch(() => {}); });
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(view.queryByText('PRIVATE_TREE_LOAD')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(view.getByRole('button', { name: 'Lazy: Retry' }));
    await waitFor(() => expect(onchange).toHaveBeenCalledExactlyOnceWith(['leaf']));
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('loads a lazy search match with ArrowRight without selecting it', async () => {
    const pending = pendingLoad();
    const loader = vi.fn(() => pending.promise);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'lazy', label: 'Lazy', hasChildren: true }],
      multiple: true, loadChildren: loader, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    await fireEvent.input(view.getByRole('textbox'), { target: { value: 'Lazy' } });
    const node = view.getByRole('treeitem', { name: 'Lazy' });
    await fireEvent.keyDown(node, { key: 'ArrowRight' });
    expect(loader).toHaveBeenCalledOnce();
    expect(node.getAttribute('aria-busy')).toBe('true');
    await act(async () => { pending.resolve([{ value: 'leaf', label: 'Lazy leaf' }]); await pending.promise; });
    expect(await view.findByRole('treeitem', { name: 'Lazy leaf' })).toBeTruthy();
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(['success', 'failure'] as const)('retires a parent cascade when its loading child is disabled before late %s', async outcome => {
    const old = pendingLoad();
    const fresh = pendingLoad();
    const loader = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const onchange = vi.fn();
    const options = $state<TreeSelectOption[]>([{
      value: 'root', label: 'Root', expanded: true, children: [
        { value: 'kept', label: 'Kept' },
        { value: 'lazy', label: 'Lazy', hasChildren: true, disabled: false },
      ],
    }]);
    const view = render(TreeSelect, { options, multiple: true, loadChildren: loader, onchange });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    await fireEvent.click(view.getByRole('treeitem', { name: 'Root' }));
    await waitFor(() => expect(loader).toHaveBeenCalledOnce());
    const child = requireValue(options[0]?.children?.[1]);
    await act(() => { child.disabled = true; });
    await act(() => { child.disabled = false; });
    await act(async () => {
      if (outcome === 'success') old.resolve([{ value: 'old', label: 'Old child' }]);
      else old.reject(new Error('Private old failure'));
      await old.promise.catch(() => {});
    });
    await waitFor(() => expect(view.getByRole('treeitem', { name: /^Root/ }).getAttribute('aria-busy')).toBe('false'));
    expect(view.queryByRole('alert')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(view.getByRole('treeitem', { name: 'Root' }));
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    await act(async () => { fresh.resolve([{ value: 'fresh', label: 'Fresh' }]); await fresh.promise; });
    await waitFor(() => expect(onchange).toHaveBeenCalledExactlyOnceWith(['kept', 'fresh']));
  });

  it.each([
    ['self', 'expand'], ['ancestor', 'expand'],
    ['self', 'select'], ['ancestor', 'select'],
  ] as const)('retires an in-flight %s-disabled node load during %s', async (blocked, action) => {
    const old = pendingLoad();
    const fresh = pendingLoad();
    const loader = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const onchange = vi.fn();
    const options = $state<TreeSelectOption[]>([{
      value: 'ancestor', label: 'Ancestor', expanded: true, disabled: false,
      children: [{ value: 'lazy', label: 'Lazy', hasChildren: true, disabled: false }],
    }]);
    const view = render(TreeSelect, { options, multiple: true, loadChildren: loader, onchange });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const activate = async () => {
      await fireEvent.click(action === 'expand'
        ? view.getByRole('button', { name: 'Lazy: Expand or collapse children' })
        : view.getByRole('treeitem', { name: 'Lazy' }));
    };
    await activate();
    expect(loader).toHaveBeenCalledOnce();
    const ancestor = requireValue(options[0]);
    const target = blocked === 'ancestor' ? ancestor : requireValue(ancestor.children?.[0]);
    await act(() => { target.disabled = true; });
    await waitFor(() => expect(view.getByRole('treeitem', { name: 'Lazy' }).getAttribute('aria-busy')).toBe('false'));
    await act(() => { target.disabled = false; });
    await activate();
    expect(loader).toHaveBeenCalledTimes(2);
    await act(async () => { old.resolve([{ value: 'old', label: 'Old child' }]); await old.promise; });
    expect(view.queryByText('Old child')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
    expect(view.getByRole('treeitem', { name: 'Lazy' }).getAttribute('aria-busy')).toBe('true');
    await act(async () => { fresh.resolve([{ value: 'fresh', label: 'Fresh child' }]); await fresh.promise; });
    if (action === 'expand') {
      expect(await view.findByRole('treeitem', { name: 'Fresh child' })).toBeTruthy();
      expect(onchange).not.toHaveBeenCalled();
    } else {
      await waitFor(() => expect(onchange).toHaveBeenCalledExactlyOnceWith(['fresh']));
    }
    expect(view.queryByRole('alert')).toBeNull();
  });

  it.each(['click', 'keyboard'] as const)('collapses a default-expanded branch using %s without changing selection', async action => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', expanded: true, children: [{ value: 'leaf', label: 'Leaf' }] }],
      multiple: true, value: ['leaf'], onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const parent = view.getByRole('treeitem', { name: 'Root' });
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    expect(view.getByRole('treeitem', { name: 'Leaf' })).toBeTruthy();
    if (action === 'click') {
      await fireEvent.click(view.getByRole('button', { name: 'Root: Expand or collapse children' }));
    } else {
      parent.focus();
      await fireEvent.keyDown(parent, { key: 'ArrowLeft' });
    }
    await waitFor(() => expect(parent.getAttribute('aria-expanded')).toBe('false'));
    expect(view.queryByRole('treeitem', { name: 'Leaf' })).toBeNull();
    await fireEvent.keyDown(parent, { key: 'ArrowRight' });
    const leaf = await view.findByRole('treeitem', { name: 'Leaf' });
    expect(leaf.getAttribute('aria-checked')).toBe('true');
    expect(onchange).not.toHaveBeenCalled();
  });

  it('restores explicit collapsed state after a search temporarily expands the branch', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 0, label: 'Root', expanded: true, children: [{ value: 1, label: 'Leaf' }] }],
      multiple: true, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const parent = view.getByRole('treeitem', { name: 'Root' });
    await fireEvent.keyDown(parent, { key: 'ArrowLeft' });
    expect(view.queryByRole('treeitem', { name: 'Leaf' })).toBeNull();
    const search = view.getByRole('textbox');
    await fireEvent.input(search, { target: { value: 'Leaf' } });
    expect(view.getByRole('treeitem', { name: 'Leaf' })).toBeTruthy();
    await fireEvent.input(search, { target: { value: '' } });
    expect(view.queryByRole('treeitem', { name: 'Leaf' })).toBeNull();
    expect(parent.getAttribute('aria-expanded')).toBe('false');
    expect(onchange).not.toHaveBeenCalled();
  });

  it('does not overwrite a default-expanded state when collapsing search results', async () => {
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', expanded: true, children: [{ value: 'leaf', label: 'Leaf' }] }],
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const search = view.getByRole('textbox');
    await fireEvent.input(search, { target: { value: 'Leaf' } });
    await fireEvent.keyDown(view.getByRole('treeitem', { name: 'Root' }), { key: 'ArrowLeft' });
    await fireEvent.input(search, { target: { value: '' } });
    expect(view.getByRole('treeitem', { name: 'Root' }).getAttribute('aria-expanded')).toBe('true');
    expect(view.getByRole('treeitem', { name: 'Leaf' })).toBeTruthy();
  });

  it.each(['self', 'ancestor', 'component'] as const)('does not collapse a node blocked by %s', async blocked => {
    const nested: TreeSelectOption = { value: 'parent', label: 'Parent', expanded: true,
      disabled: blocked === 'self', children: [{ value: 'leaf', label: 'Leaf' }] };
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', expanded: true,
        disabled: blocked === 'ancestor', children: [nested] }],
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    if (blocked === 'component') await view.rerender({ disabled: true });
    const parent = view.getByRole('treeitem', { name: 'Parent' });
    await fireEvent.keyDown(parent, { key: 'ArrowLeft' });
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    expect(view.getByRole('treeitem', { name: 'Leaf' })).toBeTruthy();
  });

  it('resets expansion overrides when the host replaces the tree', async () => {
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', expanded: true, children: [{ value: 'leaf', label: 'Leaf' }] }],
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    await fireEvent.keyDown(view.getByRole('treeitem', { name: 'Root' }), { key: 'ArrowLeft' });
    expect(view.queryByRole('treeitem', { name: 'Leaf' })).toBeNull();
    await view.rerender({ options: [
      { value: 'root', label: 'New root', expanded: true, children: [{ value: 'new-leaf', label: 'New leaf' }] },
    ] });
    expect(view.getByRole('treeitem', { name: 'New leaf' })).toBeTruthy();
    expect(view.getByRole('treeitem', { name: 'New root' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps a collapsed branch when another branch loads children internally', async () => {
    const pending = pendingLoad();
    const view = render(TreeSelect, {
      options: [
        { value: 0, label: 'Root', expanded: true, children: [{ value: 'leaf', label: 'Leaf' }] },
        { value: '0', label: 'Lazy root', hasChildren: true },
      ],
      loadChildren: () => pending.promise,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    await fireEvent.keyDown(view.getByRole('treeitem', { name: 'Root' }), { key: 'ArrowLeft' });
    await fireEvent.click(view.getByRole('button', { name: 'Lazy root: Expand or collapse children' }));
    await act(async () => {
      pending.resolve([{ value: 'loaded', label: 'Loaded leaf' }]);
      await pending.promise;
    });
    expect(await view.findByRole('treeitem', { name: 'Loaded leaf' })).toBeTruthy();
    expect(view.queryByRole('treeitem', { name: 'Leaf' })).toBeNull();
    expect(view.getByRole('treeitem', { name: 'Root' }).getAttribute('aria-expanded')).toBe('false');
    expect(view.getByRole('treeitem', { name: 'Lazy root' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps disabled inheritance after scrolling a virtual branch', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{
        value: 'root', label: 'Root', disabled: true, expanded: true,
        children: Array.from({ length: 250 }, (_, value) => ({ value, label: `Leaf ${value}` })),
      }],
      multiple: true, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const first = view.getByRole('treeitem', { name: 'Node 0' });
    first.focus();
    await fireEvent.keyDown(first, { key: 'End' });
    await waitFor(() => expect(document.activeElement?.getAttribute('data-tree-key')).toBe('number:999'));
    await fireEvent.keyDown(requireValue(document.activeElement), { key: 'Home' });
    await waitFor(() => expect(document.activeElement?.getAttribute('data-tree-key')).toBe('number:0'));
    for (let index = 1; index <= 30; index++) {
      await fireEvent.keyDown(requireValue(document.activeElement), { key: 'ArrowDown' });
      await waitFor(() => expect(document.activeElement?.getAttribute('data-tree-key')).toBe(`number:${index}`));
    }
    expect(view.getAllByRole('treeitem').length).toBeLessThanOrEqual(19);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('resets a scrolled window on search and external tree replacement', async () => {
    const options = Array.from({ length: 1000 }, (_, value) => ({ value, label: `Node ${value}` }));
    const view = render(TreeSelect, { options });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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

  it('keeps parent mixed state exact while switching between parent and child selection', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{
        value: 'root', label: 'Root', expanded: true,
        children: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
          { value: 'blocked', label: 'Blocked', disabled: true },
        ],
      }],
      multiple: true, value: ['a'], onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));

    const parent = () => view.getByRole('treeitem', { name: 'Root', exact: true });
    const child = () => view.getByRole('treeitem', { name: 'B', exact: true });
    expect(parent().getAttribute('aria-checked')).toBe('mixed');

    await fireEvent.click(parent());
    expect(onchange).toHaveBeenLastCalledWith(['a', 'b']);
    expect(parent().getAttribute('aria-checked')).toBe('true');

    await fireEvent.keyDown(child(), { key: ' ' });
    expect(onchange).toHaveBeenLastCalledWith(['a']);
    expect(parent().getAttribute('aria-checked')).toBe('mixed');

    await fireEvent.keyDown(parent(), { key: 'Enter' });
    expect(onchange).toHaveBeenLastCalledWith(['a', 'b']);
    expect(parent().getAttribute('aria-checked')).toBe('true');

    await fireEvent.click(parent());
    expect(onchange).toHaveBeenLastCalledWith([]);
    expect(parent().getAttribute('aria-checked')).toBe('false');
    expect(view.getByRole('treeitem', { name: 'Blocked', exact: true }).getAttribute('aria-disabled')).toBe('true');
    expect(onchange).toHaveBeenCalledTimes(4);
  });

  it('does not count disabled descendants in a virtualized parent cascade', async () => {
    const onchange = vi.fn();
    const children: TreeSelectOption[] = [
      { value: 'selected', label: 'Selected' },
      ...Array.from({ length: 248 }, (_, index) => ({ value: `leaf-${index}`, label: `Leaf ${index}` })),
      {
        value: 'blocked-branch', label: 'Blocked branch', disabled: true,
        children: [{ value: 'blocked-leaf', label: 'Blocked leaf' }],
      },
    ];
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', expanded: true, children }],
      multiple: true, value: ['selected'], onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));

    const parent = () => view.getByRole('treeitem', { name: 'Root', exact: true });
    expect(parent().getAttribute('aria-checked')).toBe('mixed');

    const tree = view.getByRole('tree');
    tree.scrollTop = 240 * 36;
    await fireEvent.scroll(tree);
    const unmountedLeaf = view.getByRole('treeitem', { name: 'Leaf 247', exact: true });
    expect(unmountedLeaf.getAttribute('aria-checked')).toBe('false');
    await fireEvent.click(unmountedLeaf);
    expect(onchange).toHaveBeenLastCalledWith(['selected', 'leaf-247']);

    tree.scrollTop = 0;
    await fireEvent.scroll(tree);
    expect(parent().getAttribute('aria-checked')).toBe('mixed');
    await fireEvent.click(parent());
    expect(onchange).toHaveBeenLastCalledWith([
      'selected',
      'leaf-247',
      ...Array.from({ length: 247 }, (_, index) => `leaf-${index}`),
    ]);
    expect(parent().getAttribute('aria-checked')).toBe('true');
    tree.scrollTop = 250 * 36;
    await fireEvent.scroll(tree);
    const blocked = view.getByRole('treeitem', { name: 'Blocked branch', exact: true });
    expect(blocked.getAttribute('aria-disabled')).toBe('true');
    expect(blocked.getAttribute('aria-checked')).toBe('false');
  });

  it.each(['success', 'failure'] as const)(
    'keeps an existing partial selection stable across lazy child %s before explicit child selection',
    async outcome => {
      const first = pendingLoad();
      const retry = pendingLoad();
      const loadChildren = vi.fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(retry.promise);
      const onchange = vi.fn();
      const view = render(TreeSelect, {
        options: [{
          value: 'root', label: 'Root', expanded: true,
          children: [
            { value: 'kept', label: 'Kept' },
            { value: 'lazy', label: 'Lazy', hasChildren: true },
          ],
        }],
        multiple: true, value: ['kept'], loadChildren, onchange,
      });
      await fireEvent.click(requireValue(view.container.querySelector('button')));
      const parent = () => view.getByRole('treeitem', { name: 'Root', exact: true });
      const lazy = () => view.getByRole('treeitem', { name: 'Lazy', exact: true });
      expect(parent().getAttribute('aria-checked')).toBe('mixed');

      await fireEvent.click(view.getByRole('button', { name: 'Lazy: Expand or collapse children' }));
      expect(loadChildren).toHaveBeenCalledOnce();
      expect(parent().getAttribute('aria-checked')).toBe('mixed');

      if (outcome === 'success') {
        await act(async () => { first.resolve([{ value: 'loaded', label: 'Loaded' }]); await first.promise; });
      } else {
        await act(async () => { first.reject(new Error('PRIVATE_TREE_LOAD')); await first.promise.catch(() => {}); });
        await view.findByRole('alert');
        expect(parent().getAttribute('aria-checked')).toBe('mixed');
        expect(onchange).not.toHaveBeenCalled();
        await fireEvent.click(view.getByRole('button', { name: 'Lazy: Retry' }));
        expect(loadChildren).toHaveBeenCalledTimes(2);
        await act(async () => { retry.resolve([{ value: 'loaded', label: 'Loaded' }]); await retry.promise; });
      }

      const loaded = await view.findByRole('treeitem', { name: 'Loaded', exact: true });
      expect(onchange).not.toHaveBeenCalled();
      expect(parent().getAttribute('aria-checked')).toBe('mixed');
      await fireEvent.click(loaded);
      expect(onchange).toHaveBeenCalledExactlyOnceWith(['kept', 'loaded']);
      expect(parent().getAttribute('aria-checked')).toBe('true');
      expect(lazy().getAttribute('aria-expanded')).toBe('true');
    },
  );

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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
      await fireEvent.click(requireValue(view.container.querySelector('button')));
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

  it.each(
    [false, true].flatMap(multiple =>
      (['click', 'Enter', ' '] as const).flatMap(action =>
        [false, true].map(search => ({ multiple, action, search })))),
  )('keeps leaf-only payloads exact (multiple=$multiple, action=$action, search=$search)', async ({ multiple, action, search }) => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{
        value: 'root', label: 'Root',
        children: [
          { value: 'leaf', label: 'Leaf' },
          { value: 'blocked', label: 'Blocked leaf', disabled: true },
        ],
      }],
      multiple, onlyLeafSelectable: true, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const activate = async (name: string) => {
      const node = view.getByRole('treeitem', { name, exact: true });
      if (action === 'click') await fireEvent.click(node);
      else await fireEvent.keyDown(node, { key: action });
    };
    if (search) await fireEvent.input(view.getByRole('textbox'), { target: { value: 'Root' } });
    await activate('Root');
    expect(onchange).not.toHaveBeenCalled();
    expect(view.getByRole('tree')).toBeTruthy();
    if (search) {
      await fireEvent.input(view.getByRole('textbox'), { target: { value: '' } });
    }
    const root = view.getByRole('treeitem', { name: 'Root', exact: true });
    if (root.getAttribute('aria-expanded') !== 'true') await fireEvent.keyDown(root, { key: 'ArrowRight' });
    await activate('Blocked leaf');
    expect(onchange).not.toHaveBeenCalled();
    await activate('Leaf');
    expect(onchange).toHaveBeenCalledExactlyOnceWith(multiple ? ['leaf'] : 'leaf');
    if (multiple) {
      expect(view.getByRole('tree')).toBeTruthy();
      await activate('Leaf');
      expect(onchange).toHaveBeenLastCalledWith([]);
      expect(onchange).toHaveBeenCalledTimes(2);
    } else {
      expect(view.queryByRole('tree')).toBeNull();
    }
  });

  it.each([false, true])(
    'does not select a search-matched descendant of a disabled ancestor (multiple=%s)',
    async multiple => {
      const onchange = vi.fn();
      const view = render(TreeSelect, {
        options: [
          {
            value: 'locked', label: 'Locked', disabled: true,
            children: [{ value: 'locked-leaf', label: 'Locked leaf' }],
          },
          {
            value: 'open', label: 'Open',
            children: [{ value: 'open-leaf', label: 'Open leaf' }],
          },
        ],
        multiple, onlyLeafSelectable: true, onchange,
      });
      await fireEvent.click(requireValue(view.container.querySelector('button')));
      // 搜索只裁剪显示范围，祖先的 disabled 仍沿完整数据树传播。
      await fireEvent.input(view.getByRole('textbox'), { target: { value: 'Locked leaf' } });
      expect(view.queryByRole('treeitem', { name: 'Locked', exact: true })).toBeTruthy();
      const blocked = view.getByRole('treeitem', { name: 'Locked leaf', exact: true });
      expect(blocked.getAttribute('aria-disabled')).toBe('true');
      await fireEvent.click(blocked);
      await fireEvent.keyDown(blocked, { key: 'Enter' });
      await fireEvent.keyDown(blocked, { key: ' ' });
      expect(onchange).not.toHaveBeenCalled();
      // 同一搜索边界下未继承禁用的叶子仍可提交，证明拦截来自禁用传播。
      await fireEvent.input(view.getByRole('textbox'), { target: { value: 'Open leaf' } });
      const allowed = view.getByRole('treeitem', { name: 'Open leaf', exact: true });
      expect(allowed.getAttribute('aria-disabled')).toBeNull();
      await fireEvent.click(allowed);
      expect(onchange).toHaveBeenCalledExactlyOnceWith(multiple ? ['open-leaf'] : 'open-leaf');
    },
  );

  it.each([false, true])(
    'does not submit a hasChildren parent without a loader as a leaf (multiple=%s)',
    async multiple => {
      const onchange = vi.fn();
      const view = render(TreeSelect, {
        options: [
          { value: 'opaque', label: 'Opaque branch', hasChildren: true },
          { value: 'plain-leaf', label: 'Plain leaf' },
        ],
        multiple, onlyLeafSelectable: true, onchange,
      });
      await fireEvent.click(requireValue(view.container.querySelector('button')));
      const parent = view.getByRole('treeitem', { name: 'Opaque branch', exact: true });
      // 没有 loadChildren 时父项无法解析出叶子，只应保持不可选。
      await fireEvent.click(parent);
      await fireEvent.keyDown(parent, { key: 'Enter' });
      await fireEvent.keyDown(parent, { key: ' ' });
      await fireEvent.click(view.getByRole('button', { name: 'Opaque branch: Expand or collapse children' }));
      const feedback = await view.findByRole('alert');
      expect(feedback.textContent).toContain('This node cannot be expanded right now.');
      expect(parent.getAttribute('aria-describedby')).toBe(feedback.id);
      expect(view.queryByRole('button', { name: /Retry/ })).toBeNull();
      expect(onchange).not.toHaveBeenCalled();
      expect(parent.getAttribute('aria-expanded')).toBe('false');
      expect(parent.getAttribute('aria-selected')).toBe('false');
      await fireEvent.click(view.getByRole('treeitem', { name: 'Plain leaf', exact: true }));
      expect(onchange).toHaveBeenCalledExactlyOnceWith(multiple ? ['plain-leaf'] : 'plain-leaf');
    },
  );

  it.each([false, true])(
    'reports a missing child loader on explicit expansion without offering retry (multiple=%s)',
    async multiple => {
      const onchange = vi.fn();
      const view = render(TreeSelect, {
        options: [
          { value: 'opaque', label: 'Opaque branch', hasChildren: true },
          { value: 'plain-leaf', label: 'Plain leaf' },
        ],
        multiple, onchange,
      });
      await fireEvent.click(requireValue(view.container.querySelector('button')));
      const parent = view.getByRole('treeitem', { name: 'Opaque branch', exact: true });
      await fireEvent.click(view.getByRole('button', { name: 'Opaque branch: Expand or collapse children' }));
      const feedback = await view.findByRole('alert');
      expect(feedback.textContent).toContain('This node cannot be expanded right now.');
      expect(parent.getAttribute('aria-describedby')).toBe(feedback.id);
      expect(parent.getAttribute('aria-expanded')).toBe('false');
      expect(view.queryByRole('button', { name: /Retry/ })).toBeNull();
      expect(onchange).not.toHaveBeenCalled();
    },
  );

  it.each(['loader', 'children', 'options', 'disabled', 'removed'] as const)(
    'clears missing-loader feedback after %s changes and only acts on the next user attempt',
    async change => {
      const loader = vi.fn(async () => [{ value: 'child', label: 'Child' }]);
      const onchange = vi.fn();
      const view = render(TreeSelect, {
        options: [
          { value: 'opaque', label: 'Opaque branch', hasChildren: true },
          { value: 'plain-leaf', label: 'Plain leaf' },
        ],
        multiple: true, onlyLeafSelectable: true, onchange,
      });
      await fireEvent.click(requireValue(view.container.querySelector('button')));
      await fireEvent.click(view.getByRole('treeitem', { name: 'Opaque branch', exact: true }));
      expect(await view.findByRole('alert')).toBeTruthy();

      if (change === 'loader') await view.rerender({ loadChildren: loader });
      if (change === 'children') {
        await view.rerender({ options: [{
          value: 'opaque', label: 'Opaque branch', hasChildren: true,
          children: [{ value: 'host-child', label: 'Host child' }],
        }, { value: 'plain-leaf', label: 'Plain leaf' }] });
      }
      if (change === 'options') await view.rerender({ options: [{ value: 'plain-leaf', label: 'Plain leaf' }] });
      if (change === 'disabled') await view.rerender({ disabled: true });
      if (change === 'removed') await view.rerender({ options: [{ value: 'plain-leaf', label: 'Plain leaf' }] });

      expect(view.queryByRole('alert')).toBeNull();
      expect(onchange).not.toHaveBeenCalled();
      expect(loader).not.toHaveBeenCalled();

      if (change === 'loader') {
        await view.rerender({ disabled: false });
        await fireEvent.click(view.getByRole('treeitem', { name: 'Opaque branch', exact: true }));
        await view.findByRole('treeitem', { name: 'Child' });
        expect(loader).toHaveBeenCalledOnce();
        expect(onchange).not.toHaveBeenCalled();
        await fireEvent.click(view.getByRole('treeitem', { name: 'Child' }));
        expect(onchange).toHaveBeenCalledExactlyOnceWith(['child']);
      }
      if (change === 'disabled') {
        await view.rerender({ disabled: false });
        expect(view.queryByRole('alert')).toBeNull();
      }
    },
  );

  it('clears missing-loader feedback when children are added in place to the same options reference', async () => {
    const options = $state<TreeSelectOption[]>([
      { value: 'opaque', label: 'Opaque branch', hasChildren: true },
      { value: 'plain-leaf', label: 'Plain leaf' },
    ]);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options, multiple: true, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const parent = view.getByRole('treeitem', { name: 'Opaque branch', exact: true });
    await fireEvent.click(parent);
    expect(await view.findByRole('alert')).toBeTruthy();

    await act(() => {
      requireValue(options[0]).children = [{ value: 'host-child', label: 'Host child' }];
    });

    await waitFor(() => expect(view.queryByRole('alert')).toBeNull());
    expect(parent.getAttribute('aria-expanded')).toBe('false');
    expect(onchange).not.toHaveBeenCalled();

    // 只有用户再次操作才提交原地补齐的子节点。
    await fireEvent.click(view.getByRole('treeitem', { name: 'Opaque branch', exact: true }));
    await waitFor(() => expect(onchange).toHaveBeenCalledExactlyOnceWith(['host-child']));
  });

  it.each(['children', 'disabled'] as const)(
    'clears ancestor cascade feedback after a missing-capability descendant %s changes in place',
    async change => {
      const options = $state<TreeSelectOption[]>([{
        value: 'root', label: 'Root',
        children: [
          { value: 'a', label: 'A' },
          { value: 'branch', label: 'Branch', hasChildren: true },
        ],
      }]);
      const onchange = vi.fn();
      const view = render(TreeSelect, { options, multiple: true, onchange });
      await fireEvent.click(requireValue(view.container.querySelector('button')));
      const root = view.getByRole('treeitem', { name: 'Root' });
      await fireEvent.click(root);
      expect((await view.findByRole('alert')).textContent).toContain('This node cannot be expanded right now.');
      expect(onchange).not.toHaveBeenCalled();

      const branch = requireValue(requireValue(options[0]?.children)[1]);
      await act(() => {
        if (change === 'children') branch.children = [{ value: 'deep', label: 'Deep leaf' }];
        else branch.disabled = true;
      });

      await waitFor(() => expect(view.queryByRole('alert')).toBeNull());
      expect(onchange).not.toHaveBeenCalled();
      expect(root.getAttribute('aria-checked')).toBe('false');

      if (change === 'children') {
        await fireEvent.click(root);
        await waitFor(() => expect(onchange).toHaveBeenCalledExactlyOnceWith(['a', 'deep']));
      }
    },
  );

  it.each([false, true])('ignores disabled branch events that would otherwise report a missing loader (search=%s)', async search => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'opaque', label: 'Opaque branch', hasChildren: true, disabled: true }],
      multiple: true, onlyLeafSelectable: true, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    if (search) await fireEvent.input(view.getByRole('textbox'), { target: { value: 'Opaque' } });
    const parent = view.getByRole('treeitem', { name: 'Opaque branch', exact: true });
    const expand = view.getByRole('button', { name: 'Opaque branch: Expand or collapse children' });
    await fireEvent.click(parent);
    await fireEvent.keyDown(parent, { key: 'Enter' });
    await fireEvent.keyDown(parent, { key: ' ' });
    await fireEvent.keyDown(parent, { key: 'ArrowRight' });
    await fireEvent.click(expand);
    expect(view.queryByRole('alert')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
    expect(parent.getAttribute('aria-expanded')).toBe(search ? 'true' : 'false');
  });

  it('does not report missing-loader feedback for a disabled branch', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'opaque', label: 'Opaque branch', hasChildren: true, disabled: true }],
      multiple: true, onlyLeafSelectable: true, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const parent = view.getByRole('treeitem', { name: 'Opaque branch', exact: true });
    await fireEvent.click(parent);
    await fireEvent.keyDown(parent, { key: 'Enter' });
    await fireEvent.click(view.getByRole('button', { name: 'Opaque branch: Expand or collapse children' }));
    expect(view.queryByRole('alert')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it('blocks cascade selection at a branch without load ability and recovers on user action', async () => {
    const loader = vi.fn(async () => [{ value: 'deep', label: 'Deep leaf' }]);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{
        value: 'root', label: 'Root',
        children: [
          { value: 'a', label: 'A' },
          { value: 'branch', label: 'Branch', hasChildren: true },
        ],
      }],
      multiple: true, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const root = view.getByRole('treeitem', { name: 'Root' });
    await fireEvent.click(root);
    const feedback = await view.findByRole('alert');
    expect(feedback.textContent).toContain('This node cannot be expanded right now.');
    expect(view.queryByRole('button', { name: /Retry/ })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
    expect(root.getAttribute('aria-checked')).toBe('false');

    await view.rerender({ loadChildren: loader });
    expect(view.queryByRole('alert')).toBeNull();
    expect(loader).not.toHaveBeenCalled();
    expect(onchange).not.toHaveBeenCalled();

    await fireEvent.click(root);
    await waitFor(() => expect(loader).toHaveBeenCalledOnce());
    await waitFor(() => expect(onchange).toHaveBeenCalledExactlyOnceWith(['a', 'deep']));
  });

  it.each(
    [false, true].flatMap(multiple =>
      (['children', 'empty', 'retry'] as const).map(result => ({ multiple, result }))),
  )('does not auto-select leaf-only lazy results (multiple=$multiple, result=$result)', async ({ multiple, result }) => {
    const pending = pendingLoad();
    const loader = vi.fn().mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce([{ value: 'leaf', label: 'Leaf' }]);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', hasChildren: true }],
      multiple, onlyLeafSelectable: true, loadChildren: loader, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const root = view.getByRole('treeitem', { name: 'Root' });
    await fireEvent.keyDown(root, { key: 'Enter' });
    await fireEvent.keyDown(root, { key: 'Enter' });
    expect(loader).toHaveBeenCalledOnce();
    expect(onchange).not.toHaveBeenCalled();
    await act(async () => {
      if (result === 'retry') pending.reject(new Error('PRIVATE_LEAF_LOAD'));
      else pending.resolve(result === 'empty' ? [] : [{ value: 'leaf', label: 'Leaf' }]);
      await pending.promise.catch(() => {});
    });
    if (result === 'retry') {
      await view.findByRole('alert');
      expect(onchange).not.toHaveBeenCalled();
      await fireEvent.keyDown(root, { key: 'Enter' });
      await view.findByRole('treeitem', { name: 'Leaf' });
      expect(loader).toHaveBeenCalledTimes(2);
    }
    expect(onchange).not.toHaveBeenCalled();
    expect(view.queryByRole('alert')).toBeNull();
    const target = result === 'empty' ? root : view.getByRole('treeitem', { name: 'Leaf' });
    await fireEvent.keyDown(target, { key: ' ' });
    expect(onchange).toHaveBeenCalledExactlyOnceWith(
      multiple ? [result === 'empty' ? 'root' : 'leaf'] : result === 'empty' ? 'root' : 'leaf',
    );
  });

  it.each([false, true])('keeps onlyLeaf retry-empty-disabled transitions exact (multiple=$multiple)', async multiple => {
    const pending = pendingLoad();
    let disabled = $state(false);
    const loader = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce([]);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', hasChildren: true }],
      multiple, onlyLeafSelectable: true, loadChildren: loader, onchange,
      get disabled() { return disabled; },
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const root = () => view.getByRole('treeitem', { name: 'Root', exact: true });
    // 首次加载失败后，禁用会清除错误；重试返回空结果使父项成为可提交叶子。
    await fireEvent.keyDown(root(), { key: 'Enter' });
    await act(async () => { pending.reject(new Error('PRIVATE_LEAF_EMPTY')); await pending.promise.catch(() => {}); });
    expect(await view.findByRole('alert')).toBeTruthy();
    expect(onchange).not.toHaveBeenCalled();
    await act(() => { disabled = true; });
    expect(view.queryByRole('alert')).toBeNull();
    expect(root().getAttribute('aria-disabled')).toBe('true');
    await fireEvent.keyDown(root(), { key: ' ' });
    await fireEvent.click(root());
    expect(onchange).not.toHaveBeenCalled();
    await act(() => { disabled = false; });
    await fireEvent.keyDown(root(), { key: 'Enter' });
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    expect(root().getAttribute('aria-expanded')).toBeNull();
    await fireEvent.keyDown(root(), { key: ' ' });
    expect(onchange).toHaveBeenCalledExactlyOnceWith(multiple ? ['root'] : 'root');
  });

  it('retires an in-flight leaf-only empty result when disabling intervenes', async () => {
    const pending = pendingLoad();
    let disabled = $state(false);
    const loader = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce([]);
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', hasChildren: true }],
      multiple: true, onlyLeafSelectable: true, loadChildren: loader, onchange,
      get disabled() { return disabled; },
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    const root = () => view.getByRole('treeitem', { name: 'Root', exact: true });
    await fireEvent.keyDown(root(), { key: 'Enter' });
    expect(root().getAttribute('aria-busy')).toBe('true');
    await act(() => { disabled = true; });
    expect(root().getAttribute('aria-busy')).toBe('false');
    await act(async () => { pending.resolve([]); await pending.promise; });
    await act(() => { disabled = false; });
    // 禁用期间结算的空结果被退休，父项仍是未加载分支。
    expect(root().getAttribute('aria-expanded')).toBe('false');
    await fireEvent.keyDown(root(), { key: 'Enter' });
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
    expect(root().getAttribute('aria-expanded')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.keyDown(root(), { key: ' ' });
    expect(onchange).toHaveBeenCalledExactlyOnceWith(['root']);
  });

  it.each(['success', 'failure'] as const)('retires cascade selection when leaf-only mode is enabled before %s', async outcome => {
    const pending = pendingLoad();
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', hasChildren: true }],
      multiple: true, loadChildren: () => pending.promise, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    await fireEvent.click(view.getByRole('treeitem', { name: 'Root' }));
    await view.rerender({ onlyLeafSelectable: true });
    await act(async () => {
      if (outcome === 'success') pending.resolve([{ value: 'leaf', label: 'Leaf' }]);
      else pending.reject(new Error('PRIVATE_OLD_CASCADE'));
      await pending.promise.catch(() => {});
    });
    expect(onchange).not.toHaveBeenCalled();
    expect(view.getByRole('treeitem', { name: 'Root' }).getAttribute('aria-busy')).toBe('false');
    await view.rerender({ onlyLeafSelectable: false });
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(['click', 'keyboard'] as const)('only expands parents in leaf-only mode via %s', async action => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [{ value: 'root', label: 'Root', hasChildren: true }],
      multiple: true, onlyLeafSelectable: true,
      loadChildren: async () => [{ value: 'leaf', label: 'Leaf' }], onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    await fireEvent.click(view.getByRole('treeitem', { name: 'Root' }));
    await view.findByRole('alert');
    expect(loader).toHaveBeenCalledTimes(65);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('does not turn keyboard activation of an expansion button into parent selection', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, { options: testOptions, multiple: true, onchange });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    await view.rerender({ disabled: true });
    const leaf = view.getByRole('treeitem', { name: 'Leaf' });
    expect(leaf.getAttribute('aria-disabled')).toBe('true');
    await fireEvent.click(leaf);
    await fireEvent.keyDown(leaf, { key: 'Enter' });
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(['clear', 'remove'] as const)('retires pending cascade after keyboard %s', async action => {
    const user = userEvent.setup();
    const pending = pendingLoad();
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: [
        { value: 'root', label: 'Root', hasChildren: true },
        { value: 'previous', label: 'Previous' },
      ],
      multiple: true, value: ['previous'], loadChildren: () => pending.promise, onchange,
    });
    await fireEvent.click(requireValue(view.container.querySelector('button')));
    await fireEvent.click(view.getByRole('treeitem', { name: 'Root' }));
    await fireEvent.keyDown(view.getByRole('treeitem', { name: 'Root' }), { key: 'Escape' });
    const actionButton = view.getByRole('button', {
      name: action === 'clear' ? 'Clear selection' : 'Remove Previous',
    });
    actionButton.focus();
    await user.keyboard(' ');
    expect(onchange).toHaveBeenCalledExactlyOnceWith([]);
    expect(document.activeElement).toBe(view.container.querySelector('button'));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
    await fireEvent.click(requireValue(view.container.querySelector('button')));
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
