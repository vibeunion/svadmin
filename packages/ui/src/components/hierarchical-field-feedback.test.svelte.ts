import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDefinition } from '@svadmin/core';
import { requireValue } from '../../../../scripts/test-assertions';
import FieldRenderer from './FieldRenderer.svelte';
import TreeSelect from './TreeSelect.svelte';
import Cascader from './Cascader.svelte';
import { exactRoleName } from '../../test/accessible-name';

const types = ['tree-select', 'treeselect', 'cascader'] as const;
const options = [{ label: 'Leaf', value: 'leaf' }];

// 真实宿主错误节点：IDREF 必须解析到页面内实际存在的节点，而不是只比较字符串。
function createHostErrorNode(token: string, message: string): HTMLElement {
  const node = document.createElement('p');
  node.id = `hierarchical-host-error-${token}`;
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

describe('Hierarchical field feedback', () => {
  it.each(types)('associates %s labels and feedback with their own trigger', (type) => {
    const field: FieldDefinition = { key: 'selection', label: 'Selection', type, description: 'Choose a leaf', options };
    const ids: string[] = [];
    for (let index = 0; index < 2; index += 1) {
      const view = render(FieldRenderer, { field, value: null, onchange: () => {}, invalid: true, errorId: `error-${index}` });
      const label = requireValue(view.container.querySelector('label'));
      const trigger = within(view.container).getByRole('button', { name: 'Selection' });
      const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
      expect(label.control).toBe(trigger);
      expect(document.getElementById(trigger.id)).toBe(trigger);
      expect(trigger.getAttribute('aria-describedby')).toBe(`${description.id} error-${index}`);
      expect(trigger.getAttribute('data-invalid')).toBe('true');
      expect(trigger.hasAttribute('aria-invalid')).toBe(false);
      ids.push(trigger.id);
    }
    expect(new Set(ids).size).toBe(2);
  });

  it.each(types)('keeps %s selection and popup relationships while feedback changes', async (type) => {
    const field: FieldDefinition = { key: 'selection', label: 'Selection', type, description: 'Help', options };
    const onchange = vi.fn();
    const view = render(FieldRenderer, { field, value: null, onchange, invalid: true, errorId: 'old-error' });
    const trigger = view.getByRole('button', { name: 'Selection' });
    await fireEvent.click(trigger);
    const panel = await view.findByRole('dialog');
    await waitFor(() => {
      expect(panel.id).toBeTruthy();
      expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    });
    expect(panel.getAttribute('aria-labelledby')).toBe(trigger.id);
    await view.rerender({ field: { ...field, description: '' }, invalid: false, errorId: '' });
    expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    expect(trigger.hasAttribute('data-invalid')).toBe(false);
    expect(panel.getAttribute('aria-labelledby')).toBe(trigger.id);
    expect(onchange).not.toHaveBeenCalled();
    const leaf = type === 'cascader'
      ? view.getByRole('button', { name: exactRoleName('Leaf') })
      : view.getByRole('treeitem', { name: exactRoleName('Leaf') });
    await fireEvent.click(leaf);
    expect(onchange).toHaveBeenCalledExactlyOnceWith(type === 'cascader' ? ['leaf'] : 'leaf');
    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
  });

  it.each(['tree-select', 'cascader'])('retains generated trigger IDs for standalone %s', async (type) => {
    const props = { options, placeholder: 'Choose' };
    const view = type === 'tree-select' ? render(TreeSelect, props) : render(Cascader, props);
    const trigger = view.getByRole('button', { name: 'Choose' });
    expect(trigger.id).toBeTruthy();
    await fireEvent.click(trigger);
    const panel = await view.findByRole('dialog');
    expect(panel.getAttribute('aria-labelledby')).toBe(trigger.id);
    await waitFor(() => {
      expect(panel.id).toBeTruthy();
      expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    });
  });

  it.each(types)('restores focus to the %s trigger after Escape', async (type) => {
    const field: FieldDefinition = { key: 'selection', label: 'Selection', type, options };
    const view = render(FieldRenderer, { field, value: null, onchange: () => {} });
    const trigger = view.getByRole('button', { name: 'Selection' });
    trigger.focus();
    await fireEvent.click(trigger);
    const panel = await view.findByRole('dialog');
    await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true));
    await fireEvent.keyDown(panel, { key: 'Escape' });
    await waitFor(() => {
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });
  });

  it.each(['tree-select', 'cascader'])('updates explicit %s trigger and panel IDs together', async (type) => {
    const props = { options, id: 'chosen-field', ariaLabel: 'Choice' };
    const view = type === 'tree-select' ? render(TreeSelect, props) : render(Cascader, props);
    const trigger = view.getByRole('button', { name: 'Choice' });
    expect(trigger.id).toBe('chosen-field');
    await fireEvent.click(trigger);
    const panel = await view.findByRole('dialog');
    await view.rerender({ id: 'changed-field' });
    await waitFor(() => {
      expect(trigger.id).toBe('changed-field');
      expect(panel.getAttribute('aria-labelledby')).toBe(trigger.id);
      expect(panel.id).toBe('changed-field-panel');
      expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    });
  });

  it.each(types)('resolves %s host error and description IDREFs without crossing instances', async (type) => {
    const errorA = createHostErrorNode(`${type}-a`, 'Error A');
    const errorB = createHostErrorNode(`${type}-b`, 'Error B');
    const field: FieldDefinition = { key: 'selection', label: 'Selection', type, description: 'Choose a leaf', options };
    const onchangeA = vi.fn();
    const onchangeB = vi.fn();
    const viewA = render(FieldRenderer, { field, value: null, onchange: onchangeA, invalid: true, errorId: errorA.id });
    const viewB = render(FieldRenderer, {
      field: { ...field, description: 'Choose another leaf' },
      value: null,
      onchange: onchangeB,
      invalid: true,
      errorId: errorB.id,
    });
    try {
      const triggerA = within(viewA.container).getByRole('button', { name: 'Selection' });
      const triggerB = within(viewB.container).getByRole('button', { name: 'Selection' });
      const descriptionA = requireValue(viewA.container.querySelector('[data-svadmin-field-description]'));
      const descriptionB = requireValue(viewB.container.querySelector('[data-svadmin-field-description]'));

      expect(triggerA.id).not.toBe(triggerB.id);
      expect(descriptionA.id).not.toBe(descriptionB.id);
      expect(document.getElementById(errorA.id)).toBe(errorA);
      expect(document.getElementById(errorB.id)).toBe(errorB);

      const resolvedA = resolveIdrefs(triggerA);
      expect(idrefTokens(triggerA)).toHaveLength(2);
      expect(resolvedA).toContain(descriptionA);
      expect(resolvedA).toContain(errorA);
      expect(resolvedA).not.toContain(descriptionB);
      expect(resolvedA).not.toContain(errorB);
      expect(triggerA.getAttribute('data-invalid')).toBe('true');
      expect(triggerA.hasAttribute('aria-invalid')).toBe(false);

      const resolvedB = resolveIdrefs(triggerB);
      expect(idrefTokens(triggerB)).toHaveLength(2);
      expect(resolvedB).toContain(descriptionB);
      expect(resolvedB).toContain(errorB);
      expect(resolvedB).not.toContain(descriptionA);
      expect(resolvedB).not.toContain(errorA);
      expect(triggerB.getAttribute('data-invalid')).toBe('true');
      expect(triggerB.hasAttribute('aria-invalid')).toBe(false);

      const descriptionBId = descriptionB.id;
      const tokensBeforeClear = idrefTokens(triggerB);

      // 两个实例都存活时先清理 A 的 errorId/invalid，A 必须收敛。
      await viewA.rerender({ invalid: false, errorId: undefined });
      await waitFor(() => {
        expect(idrefTokens(triggerA)).toEqual([descriptionA.id]);
        expect(triggerA.hasAttribute('data-invalid')).toBe(false);
        expect(triggerA.hasAttribute('aria-invalid')).toBe(false);
      });
      expect(resolveIdrefs(triggerA)).toEqual([descriptionA]);

      // B 的真实 description/error 节点关联与 data-invalid 必须完全不变。
      expect(resolveIdrefs(triggerB)).toEqual([descriptionB, errorB]);
      expect(idrefTokens(triggerB)).toEqual(tokensBeforeClear);
      expect(document.getElementById(descriptionBId)).toBe(descriptionB);
      expect(document.getElementById(errorB.id)).toBe(errorB);
      expect(triggerB.getAttribute('data-invalid')).toBe('true');
      expect(triggerB.hasAttribute('aria-invalid')).toBe(false);

      // 再清理 A 的 description，B 仍然不受影响。
      await viewA.rerender({ field: { ...field, description: '' } });
      await waitFor(() => {
        expect(viewA.container.querySelector('[data-svadmin-field-description]')).toBeNull();
        expect(triggerA.hasAttribute('aria-describedby')).toBe(false);
        expect(triggerA.hasAttribute('data-invalid')).toBe(false);
      });
      expect(resolveIdrefs(triggerB)).toEqual([descriptionB, errorB]);
      expect(idrefTokens(triggerB)).toEqual(tokensBeforeClear);
      expect(document.getElementById(descriptionBId)).toBe(descriptionB);
      expect(document.getElementById(errorB.id)).toBe(errorB);
      expect(triggerB.getAttribute('data-invalid')).toBe('true');
      expect(onchangeA).not.toHaveBeenCalled();
      expect(onchangeB).not.toHaveBeenCalled();
    } finally {
      viewA.unmount();
      viewB.unmount();
      errorA.remove();
      errorB.remove();
    }
  });

  it.each(types)('converges %s description and invalid state when the host error is removed', async (type) => {
    const errorNode = createHostErrorNode(`${type}-dynamic`, 'Temporary error');
    const field: FieldDefinition = { key: 'selection', label: 'Selection', type, description: 'Help', options };
    const view = render(FieldRenderer, { field, value: null, onchange: () => {}, invalid: true, errorId: errorNode.id });
    try {
      const trigger = view.getByRole('button', { name: 'Selection' });
      const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
      expect(resolveIdrefs(trigger)).toEqual([description, errorNode]);
      expect(trigger.getAttribute('data-invalid')).toBe('true');

      await view.rerender({ invalid: false, errorId: undefined });
      expect(idrefTokens(trigger)).toEqual([description.id]);
      expect(trigger.hasAttribute('data-invalid')).toBe(false);
      expect(trigger.hasAttribute('aria-invalid')).toBe(false);
      expect(document.getElementById(errorNode.id)).toBe(errorNode);

      errorNode.remove();
      await view.rerender({ field: { ...field, description: '' } });
      expect(view.container.querySelector('[data-svadmin-field-description]')).toBeNull();
      expect(trigger.hasAttribute('aria-describedby')).toBe(false);
      expect(trigger.hasAttribute('data-invalid')).toBe(false);
      expect(document.getElementById(errorNode.id)).toBeNull();
    } finally {
      view.unmount();
      errorNode.remove();
    }
  });

  it.each(types)('keeps %s popup relationships and selection callback while an error is added and removed', async (type) => {
    const onchange = vi.fn();
    const field: FieldDefinition = { key: 'selection', label: 'Selection', type, description: 'Help', options };
    const view = render(FieldRenderer, { field, value: null, onchange });
    const trigger = view.getByRole('button', { name: 'Selection' });
    const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
    await fireEvent.click(trigger);
    const panel = await view.findByRole('dialog');
    await waitFor(() => {
      expect(panel.id).toBeTruthy();
      expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    });
    expect(panel.getAttribute('aria-labelledby')).toBe(trigger.id);

    const errorNode = createHostErrorNode(`${type}-popup`, 'Popup error');
    try {
      await view.rerender({ invalid: true, errorId: errorNode.id });
      await waitFor(() => {
        expect(idrefTokens(trigger)).toEqual([description.id, errorNode.id]);
        expect(trigger.getAttribute('data-invalid')).toBe('true');
      });
      expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
      expect(panel.getAttribute('aria-labelledby')).toBe(trigger.id);

      await view.rerender({ invalid: false, errorId: undefined });
      await waitFor(() => {
        expect(idrefTokens(trigger)).toEqual([description.id]);
        expect(trigger.hasAttribute('data-invalid')).toBe(false);
      });
      expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
      expect(panel.getAttribute('aria-labelledby')).toBe(trigger.id);
      expect(onchange).not.toHaveBeenCalled();

      const leaf = type === 'cascader'
        ? view.getByRole('button', { name: exactRoleName('Leaf') })
        : view.getByRole('treeitem', { name: exactRoleName('Leaf') });
      await fireEvent.click(leaf);
      expect(onchange).toHaveBeenCalledExactlyOnceWith(type === 'cascader' ? ['leaf'] : 'leaf');
      await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
    } finally {
      errorNode.remove();
    }
  });

  it.each(['tree-select', 'cascader'] as const)('scopes %s popup IDREFs to their own instance', async (type) => {
    const field: FieldDefinition = { key: 'selection', label: 'Selection', type, options };
    const viewA = render(FieldRenderer, { field, value: null, onchange: () => {} });
    const viewB = render(FieldRenderer, { field, value: null, onchange: () => {} });
    const triggerA = within(viewA.container).getByRole('button', { name: 'Selection' });
    const triggerB = within(viewB.container).getByRole('button', { name: 'Selection' });
    expect(triggerA.id).not.toBe(triggerB.id);

    await fireEvent.click(triggerA);
    await waitFor(() => expect(triggerA.getAttribute('aria-controls')).toBeTruthy());
    const controlsA = requireValue(triggerA.getAttribute('aria-controls'));
    const panelA = requireValue(document.getElementById(controlsA));
    expect(panelA.getAttribute('role')).toBe('dialog');

    await fireEvent.click(triggerB);
    await waitFor(() => expect(triggerB.getAttribute('aria-controls')).toBeTruthy());
    const controlsB = requireValue(triggerB.getAttribute('aria-controls'));
    const panelB = requireValue(document.getElementById(controlsB));
    expect(panelB.getAttribute('role')).toBe('dialog');

    expect(controlsA).not.toBe(controlsB);
    expect(panelA.getAttribute('aria-labelledby')).toBe(triggerA.id);
    expect(panelB.getAttribute('aria-labelledby')).toBe(triggerB.id);
    expect(panelA.getAttribute('aria-labelledby')).not.toBe(triggerB.id);
    expect(panelB.getAttribute('aria-labelledby')).not.toBe(triggerA.id);
  });
});
