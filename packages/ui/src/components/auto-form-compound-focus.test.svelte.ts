import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FieldDefinition } from '@svadmin/core';
import Host from '../../test/fixtures/AutoFormFocusHarness.svelte';
import { requireValue } from '../../../../scripts/test-assertions';

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

function invalidField(type: FieldDefinition['type'], key = 'first'): FieldDefinition {
  return {
    key, label: key === 'first' ? 'First' : key, type, required: true,
    defaultValue: ['array', 'transfer', 'cascader', 'multiselect', 'images', 'tags'].includes(type) ? [] : '',
    validate: () => 'Choose a value',
    treeOptions: [{ label: 'Leaf', value: 'leaf' }],
    cascaderOptions: [{ label: 'Leaf', value: 'leaf' }],
    transferData: [{ key: 'leaf', title: 'Leaf' }],
    options: [{ label: 'Leaf', value: 'leaf' }],
    subFields: [{ key: 'title', label: 'Title', type: 'text' }],
  };
}

async function submit(view: { container: HTMLElement }) {
  const save = await within(view.container).findByRole('button', { name: 'Save' });
  save.focus();
  await fireEvent.click(save);
  return within(view.container).findByRole('region', { name: 'Please fix the following errors' });
}

describe('AutoForm compound error focus', () => {
  it.each([
    'array', 'transfer', 'tree-select', 'treeselect', 'cascader', 'multiselect', 'images', 'tags',
  ] satisfies FieldDefinition['type'][])('focuses the first actionable %s field after validation and from the summary', async type => {
    const onCreate = vi.fn();
    const view = render(Host, { fields: [invalidField(type), invalidField('text', 'second')], onCreate });
    const summary = await submit(view);
    const first = requireValue(view.container.querySelector<HTMLElement>('[data-svadmin-field-key="first"]'));
    const second = within(view.container).getByRole('textbox', { name: /^second/ });
    await waitFor(() => expect(first.contains(document.activeElement)).toBe(true));
    expect(document.activeElement).not.toBe(first);
    expect(document.activeElement).not.toBe(second);
    second.focus();
    await fireEvent.click(within(summary).getByRole('button', { name: /^First:/ }));
    expect(first.contains(document.activeElement)).toBe(true);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('uses displayed group order rather than definition order for automatic focus', async () => {
    const view = render(Host, { fields: [
      { key: 'valid', label: 'Valid', type: 'text', defaultValue: 'OK', group: 'Group A' },
      { ...invalidField('text', 'later'), group: 'Group B' },
      { ...invalidField('array'), group: 'Group A' },
    ] });
    const summary = await submit(view);
    const first = requireValue(view.container.querySelector('[data-svadmin-field-key="first"]'));
    await waitFor(() => expect(first.contains(document.activeElement)).toBe(true));
    expect(within(summary).getAllByRole('button').map(button => button.textContent?.trim()))
      .toEqual(['later: This field is required', 'First: Choose a value']);
  });

  it('skips unavailable custom controls but can programmatically focus tabindex -1', async () => {
    const view = render(Host, { fields: [invalidField('text')], custom: true });
    const summary = await submit(view);
    const input = within(view.container).getByRole('textbox', { name: 'First' });
    await waitFor(() => expect(document.activeElement).toBe(input));
    const summaryButton = within(summary).getByRole('button', { name: /^First:/ });
    summaryButton.focus();
    await fireEvent.click(summaryButton);
    expect(document.activeElement).toBe(input);
  });

  it('continues to the next error when a field has no actionable control', async () => {
    const view = render(Host, {
      fields: [invalidField('text', 'blocked'), invalidField('text', 'second')], custom: true,
    });
    const summary = await submit(view);
    const second = within(view.container).getByRole('textbox', { name: 'second' });
    await waitFor(() => expect(document.activeElement).toBe(second));
    const blocked = within(summary).getByRole('button', { name: /^blocked:/ });
    blocked.focus();
    await fireEvent.click(blocked);
    expect(document.activeElement).toBe(blocked);
  });

  it('preserves the first-legend exception of disabled fieldsets', async () => {
    const view = render(Host, { fields: [invalidField('text')], custom: true, firstLegend: true });
    const summary = await submit(view);
    const input = within(view.container).getByRole('textbox', { name: 'First first legend' });
    await waitFor(() => expect(document.activeElement).toBe(input));
    const button = within(summary).getByRole('button', { name: /^First:/ });
    button.focus();
    await fireEvent.click(button);
    expect(document.activeElement).toBe(input);
  });

  it('keeps compound error focus in the submitted form instance', async () => {
    const fields = [invalidField('array')];
    const first = render(Host, { fields });
    const second = render(Host, { fields });
    for (const view of [first, second]) {
      const summary = await submit(view);
      const add = within(view.container).getByRole('button', { name: 'Add' });
      await waitFor(() => expect(document.activeElement).toBe(add));
      const button = within(summary).getByRole('button', { name: /^First:/ });
      button.focus();
      await fireEvent.click(button);
      expect(document.activeElement).toBe(add);
    }
  });

  it('does not confuse a nested child key with a top-level error field', async () => {
    const view = render(Host, { fields: [
      {
        key: 'rows', label: 'Rows', type: 'array', defaultValue: [{ second: 'Nested value' }],
        subFields: [{ key: 'second', label: 'Nested second', type: 'text' }],
      },
      invalidField('text', 'second'),
    ] });
    const summary = await submit(view);
    const target = within(view.container).getByRole('textbox', { name: /^second/ });
    await waitFor(() => expect(document.activeElement).toBe(target));
    const button = within(summary).getByRole('button', { name: /^second:/ });
    button.focus();
    await fireEvent.click(button);
    expect(document.activeElement).toBe(target);
  });
});
