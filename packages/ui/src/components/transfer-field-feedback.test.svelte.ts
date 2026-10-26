import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDefinition } from '@svadmin/core';
import { requireValue } from '../../../../scripts/test-assertions';
import FieldRenderer from './FieldRenderer.svelte';
import Transfer from './Transfer.svelte';

const field: FieldDefinition = {
  key: 'roles', label: 'Roles', type: 'transfer', description: 'Assign roles',
  transferData: [
    { key: 'admin', title: 'Administrator' },
    { key: 'viewer', title: 'Viewer' },
  ],
};
const items = [
  { key: 'admin', title: 'Administrator' },
  { key: 'viewer', title: 'Viewer' },
];

// 真实宿主错误节点：IDREF 必须解析到页面内实际存在的节点，而不是只比较字符串。
function createHostErrorNode(token: string, message: string): HTMLElement {
  const node = document.createElement('p');
  node.id = `transfer-host-error-${token}`;
  node.textContent = message;
  document.body.append(node);
  return node;
}

function idrefTokens(target: Element): string[] {
  return (target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
}

function resolveIdrefs(target: Element): Element[] {
  return idrefTokens(target).map(ref => {
    const resolved = document.getElementById(ref);
    if (!resolved) throw new Error(`IDREF "${ref}" does not resolve to a live node`);
    return resolved;
  });
}

describe('Transfer field feedback', () => {
  it('names each transfer group and keeps description/error references local', () => {
    const ids: string[] = [];
    for (let index = 0; index < 2; index += 1) {
      const view = render(FieldRenderer, {
        field, value: [], onchange: () => {}, invalid: true, errorId: `roles-error-${index}`,
      });
      const group = within(view.container).getByRole('group', { name: 'Roles' });
      const label = requireValue(view.container.querySelector('label'));
      const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
      expect(label.hasAttribute('for')).toBe(false);
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
      expect(group.getAttribute('aria-describedby')).toBe(`${description.id} roles-error-${index}`);
      expect(group.getAttribute('data-invalid')).toBe('true');
      ids.push(group.id);
      expect(within(group).getByRole('checkbox', { name: '源列表' })).toBeTruthy();
    }
    expect(new Set(ids).size).toBe(2);
  });

  it('resolves transfer host error and description IDREFs without crossing instances', async () => {
    const errorA = createHostErrorNode('a', 'Error A');
    const errorB = createHostErrorNode('b', 'Error B');
    const onchangeA = vi.fn();
    const onchangeB = vi.fn();
    const viewA = render(FieldRenderer, {
      field, value: [], onchange: onchangeA, invalid: true, errorId: errorA.id,
    });
    const viewB = render(FieldRenderer, {
      field: { ...field, description: 'Assign another role' },
      value: [], onchange: onchangeB, invalid: true, errorId: errorB.id,
    });
    try {
      const groupA = within(viewA.container).getByRole('group', { name: 'Roles' });
      const groupB = within(viewB.container).getByRole('group', { name: 'Roles' });
      const descriptionA = requireValue(viewA.container.querySelector('[data-svadmin-field-description]'));
      const descriptionB = requireValue(viewB.container.querySelector('[data-svadmin-field-description]'));

      expect(groupA.id).not.toBe(groupB.id);
      expect(descriptionA.id).not.toBe(descriptionB.id);
      expect(document.getElementById(errorA.id)).toBe(errorA);
      expect(document.getElementById(errorB.id)).toBe(errorB);

      const resolvedA = resolveIdrefs(groupA);
      expect(idrefTokens(groupA)).toHaveLength(2);
      expect(resolvedA).toContain(descriptionA);
      expect(resolvedA).toContain(errorA);
      expect(resolvedA).not.toContain(descriptionB);
      expect(resolvedA).not.toContain(errorB);
      expect(groupA.getAttribute('data-invalid')).toBe('true');

      const resolvedB = resolveIdrefs(groupB);
      expect(idrefTokens(groupB)).toHaveLength(2);
      expect(resolvedB).toContain(descriptionB);
      expect(resolvedB).toContain(errorB);
      expect(resolvedB).not.toContain(descriptionA);
      expect(resolvedB).not.toContain(errorA);
      expect(groupB.getAttribute('data-invalid')).toBe('true');

      const descriptionBId = descriptionB.id;
      const tokensBeforeClear = idrefTokens(groupB);

      // 两个实例都存活时先清理 A 的 errorId/invalid，A 必须收敛。
      await viewA.rerender({ invalid: false, errorId: undefined });
      await waitFor(() => {
        expect(idrefTokens(groupA)).toEqual([descriptionA.id]);
        expect(groupA.hasAttribute('data-invalid')).toBe(false);
      });
      expect(resolveIdrefs(groupA)).toEqual([descriptionA]);

      // B 的真实 description/error 节点关联与 data-invalid 必须完全不变。
      expect(resolveIdrefs(groupB)).toEqual([descriptionB, errorB]);
      expect(idrefTokens(groupB)).toEqual(tokensBeforeClear);
      expect(document.getElementById(descriptionBId)).toBe(descriptionB);
      expect(document.getElementById(errorB.id)).toBe(errorB);
      expect(groupB.getAttribute('data-invalid')).toBe('true');

      // 再清理 A 的 description，B 仍然不受影响。
      await viewA.rerender({ field: { ...field, description: '' } });
      await waitFor(() => {
        expect(viewA.container.querySelector('[data-svadmin-field-description]')).toBeNull();
        expect(groupA.hasAttribute('aria-describedby')).toBe(false);
        expect(groupA.hasAttribute('data-invalid')).toBe(false);
      });
      expect(resolveIdrefs(groupB)).toEqual([descriptionB, errorB]);
      expect(idrefTokens(groupB)).toEqual(tokensBeforeClear);
      expect(document.getElementById(descriptionBId)).toBe(descriptionB);
      expect(document.getElementById(errorB.id)).toBe(errorB);
      expect(groupB.getAttribute('data-invalid')).toBe('true');
      expect(onchangeA).not.toHaveBeenCalled();
      expect(onchangeB).not.toHaveBeenCalled();
    } finally {
      viewA.unmount();
      viewB.unmount();
      errorA.remove();
      errorB.remove();
    }
  });

  it('preserves search and movement callbacks while feedback updates', async () => {
    const onchange = vi.fn();
    const view = render(FieldRenderer, { field, value: [], onchange, invalid: true, errorId: 'old-error' });
    const group = view.getByRole('group', { name: 'Roles' });
    const search = within(group).getAllByRole('textbox')[0];
    if (!search) throw new Error('Expected source search input');
    await fireEvent.input(search, { target: { value: 'Admin' } });
    expect(within(group).getByText('Administrator')).toBeTruthy();
    expect(within(group).queryByText('Viewer')).toBeNull();
    await fireEvent.click(within(group).getByRole('checkbox', { name: 'Administrator' }));
    await fireEvent.click(within(group).getByRole('button', { name: '转移所选项' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith(['admin']);
    await view.rerender({ field: { ...field, description: '' }, invalid: false, errorId: '' });
    expect(group.hasAttribute('aria-describedby')).toBe(false);
    expect(group.hasAttribute('data-invalid')).toBe(false);
    expect(within(group).getByText('Administrator')).toBeTruthy();
  });

  it('exposes disabled state and blocks movement without changing controlled values', async () => {
    const onchange = vi.fn();
    const view = render(Transfer, {
      dataSource: items, targetKeys: ['admin'], disabled: true,
      labelledby: 'roles-label', describedby: 'roles-help', invalid: true, id: 'roles-transfer', onchange,
    });
    const group = view.getByRole('group');
    expect(group.id).toBe('roles-transfer');
    expect(group.getAttribute('aria-disabled')).toBe('true');
    expect(group.getAttribute('aria-describedby')).toBe('roles-help');
    expect(group.getAttribute('data-invalid')).toBe('true');
    const moveButtons = view.getAllByRole('button').filter(button => button.getAttribute('title'));
    expect(moveButtons.length).toBeGreaterThan(0);
    for (const button of moveButtons) {
      expect(button.hasAttribute('disabled')).toBe(true);
      await fireEvent.click(button);
    }
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(['left', 'right'] as const)('toggles a %s checkbox exactly once without also toggling its row', async (direction) => {
    const onchange = vi.fn();
    const view = render(Transfer, { dataSource: items, targetKeys: direction === 'right' ? ['admin'] : [], onchange });
    const checkbox = view.getByRole('checkbox', { name: 'Administrator' });
    await fireEvent.click(checkbox);
    expect(checkbox.getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(view.getByRole('button', { name: direction === 'left' ? '转移所选项' : '移除所选项' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith(
      direction === 'left' ? ['admin'] : [], direction === 'left' ? 'right' : 'left', ['admin'],
    );
  });

  it.each(['left', 'right'] as const)('does not retain selections made while the %s side is disabled', async (direction) => {
    const onchange = vi.fn();
    const view = render(Transfer, {
      dataSource: items, targetKeys: direction === 'right' ? ['admin'] : [], disabled: true, onchange,
    });
    const row = view.getByRole('button', { name: /^Administrator/ });
    const checkbox = view.getByRole('checkbox', { name: 'Administrator' });
    expect(row.getAttribute('aria-disabled')).toBe('true');
    expect(row.getAttribute('tabindex')).toBe('-1');
    await fireEvent.click(row);
    await fireEvent.keyDown(row, { key: ' ' });
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
    await view.rerender({ disabled: false });
    const move = view.getByRole('button', { name: direction === 'left' ? '转移所选项' : '移除所选项' });
    expect(move.hasAttribute('disabled')).toBe(true);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('keeps item-disabled rows unselected even when the transfer is enabled', async () => {
    const view = render(Transfer, { dataSource: [{ key: 'blocked', title: 'Blocked', disabled: true }] });
    const row = view.getByRole('button', { name: /^Blocked/ });
    await fireEvent.click(row);
    await fireEvent.keyDown(row, { key: 'Enter' });
    expect(view.getByRole('checkbox', { name: 'Blocked' }).getAttribute('aria-checked')).toBe('false');
    expect(row.getAttribute('aria-disabled')).toBe('true');
  });

  it.each(['left', 'right'] as const)('supports one checkbox toggle on Space on the %s side', async (direction) => {
    const view = render(Transfer, { dataSource: items, targetKeys: direction === 'right' ? ['admin'] : [] });
    const checkbox = view.getByRole('checkbox', { name: 'Administrator' });
    checkbox.focus();
    await fireEvent.keyDown(checkbox, { key: ' ' });
    expect(checkbox.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(checkbox);
  });

  it.each(['left', 'right'] as const)('does not show select-all checked for disabled-only %s items', (direction) => {
    const view = render(Transfer, {
      dataSource: [{ key: 'blocked', title: 'Blocked', disabled: true }],
      targetKeys: direction === 'right' ? ['blocked'] : [],
    });
    const checkbox = view.getByRole('checkbox', { name: direction === 'left' ? '源列表' : '目标列表' });
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
    expect(checkbox.hasAttribute('disabled')).toBe(true);
  });

  it('preserves non-selection keyboard events for the host', async () => {
    const view = render(Transfer, { dataSource: items });
    const listener = vi.fn();
    view.container.addEventListener('keydown', listener);
    const checkbox = view.getByRole('checkbox', { name: 'Administrator' });
    await fireEvent.keyDown(checkbox, { key: 'Escape' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
  });

  describe.each(['left', 'right'] as const)('%s selection reconciliation', direction => {
    const targetKeys = direction === 'right' ? ['admin', 'viewer'] : [];
    const moveName = direction === 'left' ? '转移所选项' : '移除所选项';

    it.each(['removed', 'disabled', 'moved'] as const)('retires %s selections without reviving them on restoration', async change => {
      const onchange = vi.fn();
      const view = render(Transfer, { dataSource: items, targetKeys, onchange });
      await fireEvent.click(view.getByRole('checkbox', { name: 'Administrator' }));
      await fireEvent.click(view.getByRole('checkbox', { name: 'Viewer' }));
      if (change === 'removed') await view.rerender({ dataSource: [requireValue(items[1])] });
      if (change === 'disabled') await view.rerender({
        dataSource: items.map(item => ({ ...item, disabled: item.key === 'admin' })),
      });
      if (change === 'moved') await view.rerender({
        targetKeys: direction === 'left' ? ['admin'] : ['viewer'],
      });
      expect(view.getByRole('checkbox', { name: 'Viewer' }).getAttribute('aria-checked')).toBe('true');
      await view.rerender({ dataSource: items, targetKeys });
      expect(view.getByRole('checkbox', { name: 'Administrator' }).getAttribute('aria-checked')).toBe('false');
      expect(view.getByRole('checkbox', { name: 'Viewer' }).getAttribute('aria-checked')).toBe('true');
      expect(onchange).not.toHaveBeenCalled();
      await fireEvent.click(view.getByRole('button', { name: moveName }));
      expect(onchange).toHaveBeenCalledExactlyOnceWith(
        direction === 'left' ? ['viewer'] : ['admin'],
        direction === 'left' ? 'right' : 'left', ['viewer'],
      );
    });

    it('disables movement when the only selected item disappears', async () => {
      const view = render(Transfer, { dataSource: items, targetKeys });
      await fireEvent.click(view.getByRole('checkbox', { name: 'Administrator' }));
      await view.rerender({ dataSource: [] });
      expect(view.getByRole('button', { name: moveName }).hasAttribute('disabled')).toBe(true);
      expect(view.getAllByText('0 / 0')).toHaveLength(2);
    });

    it('preserves valid selections across filtering and feedback updates', async () => {
      const onchange = vi.fn();
      const view = render(Transfer, { dataSource: items, targetKeys, onchange });
      await fireEvent.click(view.getByRole('checkbox', { name: 'Administrator' }));
      const search = requireValue(view.getAllByRole('textbox')[direction === 'left' ? 0 : 1]);
      await fireEvent.input(search, { target: { value: 'Viewer' } });
      await view.rerender({ invalid: true, describedby: 'new-feedback', dataSource: [...items] });
      expect(view.queryByRole('checkbox', { name: 'Administrator' })).toBeNull();
      expect(view.getByRole('button', { name: moveName }).hasAttribute('disabled')).toBe(false);
      await fireEvent.click(view.getByRole('button', { name: moveName }));
      expect(onchange).toHaveBeenCalledExactlyOnceWith(
        direction === 'left' ? ['admin'] : ['viewer'],
        direction === 'left' ? 'right' : 'left', ['admin'],
      );
    });

    it('clears hidden search without discarding the selection when search is disabled', async () => {
      const onchange = vi.fn();
      const view = render(Transfer, { dataSource: items, targetKeys, onchange });
      await fireEvent.click(view.getByRole('checkbox', { name: 'Administrator' }));
      const search = requireValue(view.getAllByRole('textbox')[direction === 'left' ? 0 : 1]);
      await fireEvent.input(search, { target: { value: 'Viewer' } });
      expect(view.queryByRole('checkbox', { name: 'Administrator' })).toBeNull();
      await view.rerender({ searchable: false });
      expect(view.queryByRole('textbox')).toBeNull();
      expect(view.getByRole('checkbox', { name: 'Administrator' }).getAttribute('aria-checked')).toBe('true');
      expect(view.getByRole('checkbox', { name: 'Viewer' }).getAttribute('aria-checked')).toBe('false');
      await view.rerender({ searchable: true });
      for (const input of view.getAllByRole('textbox')) expect(input).toHaveProperty('value', '');
      expect(onchange).not.toHaveBeenCalled();
      await fireEvent.click(view.getByRole('button', { name: moveName }));
      expect(onchange).toHaveBeenCalledExactlyOnceWith(
        direction === 'left' ? ['admin'] : ['viewer'],
        direction === 'left' ? 'right' : 'left', ['admin'],
      );
    });
  });

  it('names both search inputs and clears both filters when search is disabled', async () => {
    const view = render(Transfer, { dataSource: items, targetKeys: ['viewer'], titles: ['Available', 'Assigned'] });
    await fireEvent.input(view.getByRole('textbox', { name: /Available/ }), { target: { value: 'missing-left' } });
    await fireEvent.input(view.getByRole('textbox', { name: /Assigned/ }), { target: { value: 'missing-right' } });
    expect(view.queryByRole('checkbox', { name: 'Administrator' })).toBeNull();
    expect(view.queryByRole('checkbox', { name: 'Viewer' })).toBeNull();
    await view.rerender({ searchable: false });
    expect(view.getByRole('checkbox', { name: 'Administrator' })).toBeTruthy();
    expect(view.getByRole('checkbox', { name: 'Viewer' })).toBeTruthy();
    await view.rerender({ searchable: true });
    expect(view.getByRole('textbox', { name: /Available/ })).toHaveProperty('value', '');
    expect(view.getByRole('textbox', { name: /Assigned/ })).toHaveProperty('value', '');
  });
});
