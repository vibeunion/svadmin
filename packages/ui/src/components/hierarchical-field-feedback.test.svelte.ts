import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDefinition } from '@svadmin/core';
import { requireValue } from '../../../../scripts/test-assertions';
import FieldRenderer from './FieldRenderer.svelte';
import TreeSelect from './TreeSelect.svelte';
import Cascader from './Cascader.svelte';

const types = ['tree-select', 'treeselect', 'cascader'] as const;
const options = [{ label: 'Leaf', value: 'leaf' }];

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
      ? view.getByRole('button', { name: 'Leaf' })
      : view.getByRole('treeitem', { name: 'Leaf' });
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
});
