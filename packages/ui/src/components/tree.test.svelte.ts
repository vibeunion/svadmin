import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Tree from './Tree.svelte';

afterEach(() => cleanup());

const nodes = [
  {
    id: 'root', label: 'Root',
    children: [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta', children: [{ id: 'b1', label: 'Beta 1' }] },
    ],
  },
];

describe('Tree', () => {
  it('expands, selects, and reports checked keys with half state', async () => {
    const onselect = vi.fn();
    const oncheck = vi.fn();
    const view = render(Tree, { nodes, checkable: true, multiple: true, onselect, oncheck });

    await fireEvent.click(view.getByRole('button', { name: /Expand Root/ }));
    expect(view.getByText('Alpha')).toBeTruthy();
    await fireEvent.click(view.getByText('Alpha'));
    expect(onselect).toHaveBeenCalledWith(['a'], [expect.objectContaining({ id: 'a' })]);

    await fireEvent.click(view.getByRole('checkbox', { name: 'Select Alpha' }));
    expect(oncheck).toHaveBeenLastCalledWith(['a'], expect.objectContaining({ checkedKeys: ['a'] }));
    const rootCheckbox = view.getByRole('checkbox', { name: 'Select Root' });
    expect(rootCheckbox.getAttribute('aria-checked')).toBe('mixed');

    await fireEvent.click(view.getByRole('checkbox', { name: 'Select Beta' }));
    expect(oncheck).toHaveBeenLastCalledWith(
      expect.arrayContaining(['a', 'b', 'b1', 'root']),
      expect.objectContaining({ halfCheckedKeys: [] }),
    );
    expect(rootCheckbox.getAttribute('aria-checked')).toBe('true');
  });

  it('loads async children before expanding', async () => {
    const loadChildren = vi.fn(async () => [{ id: 'remote', label: 'Remote child' }]);
    const view = render(Tree, {
      nodes: [{ id: 'lazy', label: 'Lazy', hasChildren: true }],
      loadChildren,
    });

    await fireEvent.click(view.getByRole('button', { name: /Expand Lazy/ }));
    await waitFor(() => expect(loadChildren).toHaveBeenCalledTimes(1));
    expect(await view.findByText('Remote child')).toBeTruthy();
  });

  it('supports keyboard navigation and selection', async () => {
    const onselect = vi.fn();
    const view = render(Tree, { nodes: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }], onselect });
    const first = view.getByRole('treeitem', { name: 'One' });
    first.focus();
    await fireEvent.keyDown(first, { key: 'ArrowDown' });
    const second = view.getByRole('treeitem', { name: 'Two' });
    await waitFor(() => expect(document.activeElement?.textContent).toContain('Two'));
    await fireEvent.keyDown(second, { key: 'Enter' });
    expect(onselect).toHaveBeenCalledWith(['two'], [expect.objectContaining({ id: 'two' })]);
  });
});
