import { fireEvent, render, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDefinition } from '@svadmin/core';
import { requireValue } from '../../../../scripts/test-assertions';
import FieldRenderer from './FieldRenderer.svelte';
import ArrayField from './fields/ArrayField.svelte';
import ArrayFieldHost from './array-field-feedback.test-host.svelte';
import { snapshotPlainData } from '@svadmin/core/schema';
import { arrayFieldOrderKey, arrayFieldRowKey, withoutArrayFieldMetadata } from './fields/array-field-metadata.js';

const field: FieldDefinition = {
  key: 'rows', label: 'Rows', type: 'array', description: 'Enter the items',
  subFields: [{ key: 'name', label: 'Name', type: 'text', defaultValue: 'Default name' }],
};

describe('Array field feedback and disablement', () => {
  it('strips only internal row metadata before the contract snapshot', () => {
    const row = { name: 'row' };
    Object.defineProperty(row, arrayFieldRowKey, { value: 1 });
    const output = [row];
    Object.defineProperty(output, arrayFieldOrderKey, { value: 1 });
    expect(snapshotPlainData(withoutArrayFieldMetadata(output))).toEqual([{ name: 'row' }]);

    const unknown = Symbol('unknown');
    const invalid = { name: 'row' };
    Object.defineProperty(invalid, unknown, { value: true });
    expect(() => snapshotPlainData(withoutArrayFieldMetadata(invalid))).toThrow();

    const accessor = {};
    const getter = vi.fn(() => 'row');
    Object.defineProperty(accessor, 'name', { enumerable: true, get: getter });
    expect(() => snapshotPlainData(withoutArrayFieldMetadata(accessor))).toThrow();
    expect(getter).not.toHaveBeenCalled();

    const unreadable = new Proxy({}, { ownKeys: () => { throw new Error('PRIVATE_REFLECTION'); } });
    expect(withoutArrayFieldMetadata(unreadable)).toBe(unreadable);
    expect(() => snapshotPlainData(withoutArrayFieldMetadata(unreadable))).toThrow('Invalid plain data');
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => snapshotPlainData(withoutArrayFieldMetadata(cyclic))).toThrow();
  });

  it('names and describes each array group within its own field instance', () => {
    const descriptionIds: string[] = [];
    for (let index = 0; index < 2; index += 1) {
      const view = render(FieldRenderer, {
        field, value: [], onchange: () => {}, invalid: true, errorId: `rows-error-${index}`,
      });
      const group = within(view.container).getByRole('group', { name: 'Rows' });
      const label = document.getElementById(requireValue(group.getAttribute('aria-labelledby')));
      expect(view.container.contains(label)).toBe(true);
      expect(requireValue(view.container.querySelector('label')).hasAttribute('for')).toBe(false);
      const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
      expect(group.getAttribute('aria-describedby')).toBe(`${description.id} rows-error-${index}`);
      expect(group.getAttribute('data-invalid')).toBe('true');
      descriptionIds.push(description.id);
    }
    expect(new Set(descriptionIds).size).toBe(2);
  });

  it('blocks add, remove and child edits while the parent field is disabled', async () => {
    const onchange = vi.fn();
    const view = render(FieldRenderer, { field, value: [{ name: 'Existing' }], disabled: true, onchange });
    for (const button of view.getAllByRole('button')) {
      expect(button.hasAttribute('disabled')).toBe(true);
      await fireEvent.click(button);
    }
    const input = view.getByRole('textbox', { name: 'Name' });
    expect(input.hasAttribute('disabled')).toBe(true);
    await fireEvent.input(input, { target: { value: 'Ignored' } });
    expect(onchange).not.toHaveBeenCalled();
  });

  it('propagates disablement through nested array fields', async () => {
    const nested: FieldDefinition = { ...field, subFields: [{ ...field, key: 'children', label: 'Children' }] };
    const onchange = vi.fn();
    const view = render(FieldRenderer, {
      field: nested, value: [{ children: [{ name: 'Nested' }] }], disabled: true, onchange,
    });
    for (const button of view.getAllByRole('button')) {
      expect(button.hasAttribute('disabled')).toBe(true);
      await fireEvent.click(button);
    }
    const input = view.getByRole('textbox', { name: 'Name' });
    expect(input.hasAttribute('disabled')).toBe(true);
    await fireEvent.input(input, { target: { value: 'Ignored' } });
    expect(onchange).not.toHaveBeenCalled();
  });

  it('adds defaults using the current host value after disablement is lifted', async () => {
    const onchange = vi.fn();
    const view = render(FieldRenderer, { field, value: [], disabled: true, onchange });
    await view.rerender({ value: [{ name: 'Fresh' }], disabled: false });
    await fireEvent.click(view.getByRole('button', { name: 'Add' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith([{ name: 'Fresh' }, { name: 'Default name' }]);
  });

  it('preserves immutable edit and remove callbacks for enabled fields', async () => {
    const onchange = vi.fn();
    const value = [{ name: 'First' }, { name: 'Second' }];
    const view = render(FieldRenderer, { field, value, onchange });
    const inputs = view.getAllByRole('textbox', { name: 'Name' });
    await fireEvent.input(requireValue(inputs[1]), { target: { value: 'Changed' } });
    expect(onchange).toHaveBeenLastCalledWith([{ name: 'First' }, { name: 'Changed' }]);
    expect(value).toEqual([{ name: 'First' }, { name: 'Second' }]);
    await fireEvent.click(requireValue(view.getAllByRole('button', { name: 'Remove' })[0]));
    expect(onchange).toHaveBeenLastCalledWith([{ name: 'Second' }]);
    const hidden = requireValue(view.container.querySelector<HTMLInputElement>('input[type="hidden"][name="rows"]'));
    expect(JSON.parse(hidden.value)).toEqual(value);
  });

  it('reorders rows through explicit move controls and keeps boundary buttons disabled', async () => {
    const onchange = vi.fn();
    const value = [{ name: 'First' }, { name: 'Second' }, { name: 'Third' }];
    const view = render(FieldRenderer, { field, value, onchange });
    const moveUp = view.getAllByRole('button', { name: 'Move Up' });
    const moveDown = view.getAllByRole('button', { name: 'Move Down' });
    expect(moveUp[0]?.hasAttribute('disabled')).toBe(true);
    expect(moveDown[2]?.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(requireValue(moveDown[0]));
    expect(onchange).toHaveBeenLastCalledWith([{ name: 'Second' }, { name: 'First' }, { name: 'Third' }]);
    await view.rerender({ value: [{ name: 'Second' }, { name: 'First' }, { name: 'Third' }] });
    await fireEvent.click(requireValue(view.getAllByRole('button', { name: 'Move Up' })[2]));
    expect(onchange).toHaveBeenLastCalledWith([{ name: 'Second' }, { name: 'Third' }, { name: 'First' }]);
  });

  it('keeps a moved row input instance with its business row', async () => {
    const onchange = vi.fn<(value: unknown) => void>();
    const value = [{ name: 'First' }, { name: 'Second' }];
    const view = render(FieldRenderer, { field, value, onchange });
    const inputs = view.getAllByRole('textbox', { name: 'Name' });
    const firstInput = requireValue(inputs[0]);
    firstInput.focus();
    await fireEvent.click(requireValue(view.getAllByRole('button', { name: 'Move Down' })[0]));
    expect(value).toEqual([{ name: 'First' }, { name: 'Second' }]);
    expect(view.getAllByRole('textbox', { name: 'Name' })[0]).toBe(firstInput);
    await view.rerender({ value: requireValue(onchange.mock.lastCall)[0] });
    expect(view.getAllByRole('textbox', { name: 'Name' })[1]).toBe(firstInput);
  });

  it('preserves native file inputs through editing, reorder and removal of another row', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    const onchange = vi.fn<(value: unknown) => void>();
    const view = render(FieldRenderer, { target: form, props: {
      field: { ...field, subFields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'attachment', label: 'Attachment', type: 'file' },
      ] },
      value: [{ name: 'First', attachment: null }, { name: 'Second', attachment: null }], onchange,
    } });
    try {
      const row = within(form).getByRole('group', { name: 'Rows 1' });
      const input = requireValue(row.querySelector<HTMLInputElement>('input[type="file"]'));
      const transfer = new DataTransfer();
      transfer.items.add(new File(['first'], 'first.txt', { type: 'text/plain' }));
      input.files = transfer.files;
      await fireEvent.change(input);
      await view.rerender({ value: requireValue(onchange.mock.lastCall)[0] });
      expect(row.querySelector('input[type="file"]')).toBe(input);
      expect(input.files?.[0]?.name).toBe('first.txt');
      await fireEvent.click(within(row).getByRole('button', { name: 'Move Down' }));
      await view.rerender({ value: requireValue(onchange.mock.lastCall)[0] });
      expect(within(form).getByRole('group', { name: 'Rows 2' })).toBe(row);
      expect(row.querySelector('input[type="file"]')).toBe(input);
      expect(input.files?.[0]?.name).toBe('first.txt');
      const otherRow = within(form).getByRole('group', { name: 'Rows 1' });
      await fireEvent.click(within(otherRow).getByRole('button', { name: 'Remove' }));
      await view.rerender({ value: requireValue(onchange.mock.lastCall)[0] });
      expect(within(form).getByRole('group', { name: 'Rows 1' })).toBe(row);
      const submitted = new FormData(form).get('attachment');
      if (!(submitted instanceof File)) throw new Error('Expected file after row movement');
      expect(submitted.name).toBe('first.txt');
      expect(submitted.size).toBe(5);
    } finally {
      view.unmount();
      form.remove();
    }
  });

  it('does not carry a previous file input into an externally replaced row', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    const retained = { attachment: null };
    const onchange = vi.fn<(value: unknown) => void>();
    const view = render(FieldRenderer, { target: form, props: {
      field: { ...field, subFields: [{ key: 'attachment', label: 'Attachment', type: 'file' }] },
      value: [retained, { attachment: null }], onchange,
    } });
    try {
      const inputs = form.querySelectorAll<HTMLInputElement>('input[type="file"]');
      const retainedInput = requireValue(inputs[0]);
      const oldInput = requireValue(inputs[1]);
      const transfer = new DataTransfer();
      transfer.items.add(new File(['old'], 'old.txt', { type: 'text/plain' }));
      oldInput.files = transfer.files;
      await fireEvent.change(oldInput);
      await view.rerender({ value: requireValue(onchange.mock.lastCall)[0] });
      expect(form.querySelectorAll('input[type="file"]')[1]).toBe(oldInput);
      await view.rerender({ value: [retained, { attachment: null }] });
      const nextInputs = form.querySelectorAll<HTMLInputElement>('input[type="file"]');
      const newInput = requireValue(nextInputs[1]);
      expect(nextInputs[0]).toBe(retainedInput);
      expect(newInput).not.toBe(oldInput);
      expect(oldInput.isConnected).toBe(false);
      expect(newInput.files?.length ?? 0).toBe(0);
      expect(new FormData(form).getAll('attachment').some(entry =>
        entry instanceof File && entry.name === 'old.txt',
      )).toBe(false);
    } finally {
      view.unmount();
      form.remove();
    }
  });

  it('preserves row and file identity when the parent uses deep reactive state', async () => {
    const view = render(ArrayFieldHost, { field: { ...field, subFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'attachment', label: 'Attachment', type: 'file' },
    ] }, initial: [{ name: 'First', attachment: null }, { name: 'Second', attachment: null }] });
    const row = view.getByRole('group', { name: 'Rows 1' });
    const input = requireValue(row.querySelector<HTMLInputElement>('input[type="file"]'));
    const name = within(row).getByRole('textbox', { name: 'Name' });
    const transfer = new DataTransfer();
    transfer.items.add(new File(['first'], 'first.txt', { type: 'text/plain' }));
    input.files = transfer.files;
    await fireEvent.change(input);
    expect(view.getByRole('group', { name: 'Rows 1' })).toBe(row);
    expect(row.querySelector('input[type="file"]')).toBe(input);
    await fireEvent.input(name, { target: { value: 'Edited' } });
    expect(view.getByRole('group', { name: 'Rows 1' })).toBe(row);
    await fireEvent.click(within(row).getByRole('button', { name: 'Move Down' }));
    expect(view.getByRole('group', { name: 'Rows 2' })).toBe(row);
    expect(within(row).getByRole('textbox', { name: 'Name' })).toBe(name);
    expect(view.getByTestId('changes').textContent).toBe('3');
    const form = requireValue(view.container.querySelector('form'));
    expect(new FormData(form).getAll('attachment').some(entry =>
      entry instanceof File && entry.name === 'first.txt' && entry.size === 5,
    )).toBe(true);
  });

  it('does not reuse a row for an equal-valued external replacement', async () => {
    const onchange = vi.fn<(value: unknown) => void>();
    const view = render(FieldRenderer, { field, value: [{ name: 'Same' }, { name: 'Same' }], onchange });
    const firstRow = view.getByRole('group', { name: 'Rows 1' });
    const secondRow = view.getByRole('group', { name: 'Rows 2' });
    await fireEvent.click(within(firstRow).getByRole('button', { name: 'Move Down' }));
    const moved: unknown = requireValue(onchange.mock.lastCall)[0];
    if (!Array.isArray(moved)) throw new Error('Expected moved array');
    await view.rerender({ value: moved });
    expect(view.getByRole('group', { name: 'Rows 2' })).toBe(firstRow);
    expect(view.getByRole('group', { name: 'Rows 1' })).toBe(secondRow);
    await view.rerender({ value: [moved[0], { name: 'Same' }] });
    expect(view.getByRole('group', { name: 'Rows 1' })).toBe(secondRow);
    expect(view.getByRole('group', { name: 'Rows 2' })).not.toBe(firstRow);
    expect(firstRow.isConnected).toBe(false);
  });

  it('keeps raw callback records and serializable business fields unchanged', async () => {
    const onchange = vi.fn<(value: unknown) => void>();
    const first = { name: 'First' };
    const second = { name: 'Second' };
    const view = render(FieldRenderer, { field, value: [first, second], onchange });
    await fireEvent.click(within(view.getByRole('group', { name: 'Rows 1' }))
      .getByRole('button', { name: 'Move Down' }));
    const moved: unknown = requireValue(onchange.mock.lastCall)[0];
    if (!Array.isArray(moved)) throw new Error('Expected array');
    expect(moved[0]).toBe(second);
    expect(moved[1]).toBe(first);
    expect(() => structuredClone(moved)).not.toThrow();
    await fireEvent.input(requireValue(view.getAllByRole('textbox', { name: 'Name' })[0]), {
      target: { value: 'Edited' },
    });
    const edited: unknown = requireValue(onchange.mock.lastCall)[0];
    expect(structuredClone(edited)).toEqual([{ name: 'Edited' }, second]);
    expect(JSON.stringify(edited)).toBe('[{"name":"Edited"},{"name":"Second"}]');
    expect(first.name).toBe('First');
    expect(Object.getOwnPropertySymbols(first)).toEqual([]);
  });

  it('does not swap duplicate-reference rows when one is edited', async () => {
    const shared = { name: 'Shared' };
    const onchange = vi.fn<(value: unknown) => void>();
    const view = render(FieldRenderer, { field, value: [shared, shared], onchange });
    const first = view.getByRole('group', { name: 'Rows 1' });
    const second = view.getByRole('group', { name: 'Rows 2' });
    await fireEvent.input(within(first).getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Edited' },
    });
    await view.rerender({ value: requireValue(onchange.mock.lastCall)[0] });
    expect(view.getByRole('group', { name: 'Rows 1' })).toBe(first);
    expect(view.getByRole('group', { name: 'Rows 2' })).toBe(second);
    expect(requireValue(first.querySelector('input')).value).toBe('Edited');
    expect(requireValue(second.querySelector('input')).value).toBe('Shared');
    expect(shared.name).toBe('Shared');
  });

  it('keeps duplicate-reference row instances through move and removal', async () => {
    const shared = { name: 'Shared' };
    const onchange = vi.fn<(value: unknown) => void>();
    const view = render(FieldRenderer, { field, value: [shared, shared], onchange });
    const first = view.getByRole('group', { name: 'Rows 1' });
    const second = view.getByRole('group', { name: 'Rows 2' });
    await fireEvent.click(within(first).getByRole('button', { name: 'Move Down' }));
    await view.rerender({ value: requireValue(onchange.mock.lastCall)[0] });
    expect(view.getByRole('group', { name: 'Rows 1' })).toBe(second);
    expect(view.getByRole('group', { name: 'Rows 2' })).toBe(first);
    await fireEvent.click(within(second).getByRole('button', { name: 'Remove' }));
    await view.rerender({ value: requireValue(onchange.mock.lastCall)[0] });
    expect(view.getByRole('group', { name: 'Rows 1' })).toBe(first);
    expect(second.isConnected).toBe(false);
  });

  it('does not apply a rejected move to an unrelated equal array', async () => {
    const shared = { name: 'Shared' };
    const onchange = vi.fn<(value: unknown) => void>();
    const view = render(FieldRenderer, { field, value: [shared, shared], onchange });
    const first = view.getByRole('group', { name: 'Rows 1' });
    await fireEvent.click(within(first).getByRole('button', { name: 'Move Down' }));
    await view.rerender({ value: [shared, shared] });
    expect(view.getByRole('group', { name: 'Rows 1' })).toBe(first);
  });

  it('moves nested rows and submits only the controlled outer JSON', async () => {
    const form = document.createElement('form');
    const target = document.createElement('div');
    form.append(target);
    document.body.append(form);
    const value = [{ children: [{ name: 'First' }, { name: 'Second' }] }];
    const onchange = vi.fn<(value: unknown) => void>();
    const view = render(FieldRenderer, { target, props: {
      field: { ...field, subFields: [{ ...field, key: 'children', label: 'Children' }] },
      value, onchange,
    } });
    try {
      const first = within(form).getByRole('group', { name: 'Children 1' });
      await fireEvent.click(within(first).getByRole('button', { name: 'Move Down' }));
      const next = requireValue(onchange.mock.lastCall)[0];
      expect(next).toEqual([{ children: [{ name: 'Second' }, { name: 'First' }] }]);
      expect(onchange.mock.calls).toEqual([[next]]);
      expect(value).toEqual([{ children: [{ name: 'First' }, { name: 'Second' }] }]);
      await view.rerender({ value: next });
      expect(Array.from(new FormData(form))).toEqual([['rows', JSON.stringify(next)]]);
      expect(within(form).getByRole('group', { name: 'Children 2' })).toBe(first);
      const callsAfterMove = onchange.mock.calls.length;
      await view.rerender({ disabled: true });
      await fireEvent.click(within(first).getByRole('button', { name: 'Move Up' }));
      expect(onchange.mock.calls.length).toBe(callsAfterMove);
      expect(Array.from(new FormData(form))).toEqual([]);
    } finally {
      view.unmount();
      form.remove();
    }
  });

  it('names standalone groups and updates the name with the field label', async () => {
    const view = render(ArrayField, { field, value: [], onchange: () => {} });
    const group = view.getByRole('group', { name: 'Rows' });
    const headingId = requireValue(group.getAttribute('aria-labelledby'));
    expect(view.container.contains(document.getElementById(headingId))).toBe(true);
    await view.rerender({ field: { ...field, label: 'Items' } });
    expect(view.getByRole('group', { name: 'Items' })).toBe(group);
    expect(group.getAttribute('aria-labelledby')).toBe(headingId);
  });

  it('applies disablement and feedback changes to an existing array group', async () => {
    const onchange = vi.fn();
    const view = render(FieldRenderer, { field, value: [{ name: 'Existing' }], onchange, invalid: true, errorId: 'rows-error' });
    const group = view.getByRole('group', { name: 'Rows' });
    const input = view.getByRole('textbox', { name: 'Name' });
    await view.rerender({ disabled: true, invalid: false, errorId: '', field: { ...field, description: '' } });
    expect(group.getAttribute('aria-disabled')).toBe('true');
    expect(group.hasAttribute('aria-describedby')).toBe(false);
    expect(group.hasAttribute('data-invalid')).toBe(false);
    await fireEvent.input(input, { target: { value: 'Ignored' } });
    await fireEvent.click(view.getByRole('button', { name: 'Add' }));
    expect(onchange).not.toHaveBeenCalled();
    await view.rerender({ disabled: false });
    expect(group.hasAttribute('aria-disabled')).toBe(false);
    expect(view.getByRole('button', { name: 'Add' }).hasAttribute('disabled')).toBe(false);
    expect(input.hasAttribute('disabled')).toBe(false);
    await fireEvent.input(input, { target: { value: 'Allowed' } });
    expect(onchange).toHaveBeenCalledExactlyOnceWith([{ name: 'Allowed' }]);
  });

  it('omits disabled array data from native submission and restores it on enable', async () => {
    const form = document.createElement('form');
    const target = document.createElement('div');
    form.append(target);
    document.body.append(form);
    const value = [{ name: 'Existing' }];
    const view = render(FieldRenderer, { target, props: { field, value, disabled: true, onchange: () => {} } });
    try {
      expect(new FormData(form).has('rows')).toBe(false);
      expect(new FormData(form).has('name')).toBe(false);
      await view.rerender({ disabled: false });
      expect(new FormData(form).get('rows')).toBe(JSON.stringify(value));
      expect(new FormData(form).has('name')).toBe(false);
    } finally {
      view.unmount();
      form.remove();
    }
  });

  it('submits nested values once without colliding with a top-level field', async () => {
    const nested: FieldDefinition = { ...field, subFields: [
      { key: 'name', label: 'Item name', type: 'text', required: true },
      { key: 'enabled', label: 'Enabled', type: 'boolean' },
      { key: 'tags', label: 'Tags', type: 'tags' },
      { key: 'period', label: 'Period', type: 'daterange' },
      { key: 'children', label: 'Children', type: 'array', subFields: [
        { key: 'name', label: 'Child name', type: 'text' },
        { key: 'quantity', label: 'Quantity', type: 'number' },
      ] },
    ] };
    const value = [{
      name: 'First', enabled: true, tags: ['one', 'two'],
      period: { start: '2026-10-01', end: '2026-10-21' },
      children: [{ name: 'Child', quantity: 2 }],
    }, {
      name: 'Second', enabled: false, tags: [], period: null, children: [],
    }];
    const form = document.createElement('form');
    document.body.append(form);
    const onchange = vi.fn();
    const view = render(FieldRenderer, { target: form, props: { field: nested, value, onchange } });
    const sibling = render(FieldRenderer, { target: form, props: {
      field: { key: 'name', label: 'Top name', type: 'text' }, value: 'Top', onchange: vi.fn(),
    } });
    try {
      expect(Array.from(new FormData(form))).toEqual([['rows', JSON.stringify(value)], ['name', 'Top']]);
      const input = within(form).getByRole('textbox', { name: 'Child name' });
      expect(input.hasAttribute('disabled')).toBe(false);
      await fireEvent.input(input, { target: { value: 'Edited' } });
      const next = [{ ...value[0], children: [{ name: 'Edited', quantity: 2 }] }, value[1]];
      expect(onchange).toHaveBeenLastCalledWith(next);
      await view.rerender({ value: next });
      expect(Array.from(new FormData(form))).toEqual([['rows', JSON.stringify(next)], ['name', 'Top']]);
      await view.rerender({ disabled: true });
      expect(Array.from(new FormData(form))).toEqual([['name', 'Top']]);
      await view.rerender({ disabled: false, value: [] });
      expect(Array.from(new FormData(form))).toEqual([['rows', '[]'], ['name', 'Top']]);
    } finally {
      view.unmount();
      sibling.unmount();
      form.remove();
    }
  });

  it('preserves the standalone ArrayField native child submission', () => {
    const form = document.createElement('form');
    document.body.append(form);
    const view = render(ArrayField, { target: form, props: {
      field, value: [{ name: 'Standalone' }], onchange: vi.fn(),
    } });
    try {
      expect(Array.from(new FormData(form))).toEqual([['name', 'Standalone']]);
    } finally {
      view.unmount();
      form.remove();
    }
  });

  it('preserves the raw file channel that JSON cannot serialize', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    const onchange = vi.fn();
    const view = render(FieldRenderer, { target: form, props: {
      field: { ...field, subFields: [{ key: 'attachment', label: 'Attachment', type: 'file' }] },
      value: [{ attachment: null }], onchange,
    } });
    try {
      const input = requireValue(form.querySelector<HTMLInputElement>('input[type="file"]'));
      const transfer = new DataTransfer();
      const file = new File(['content'], 'attachment.txt', { type: 'text/plain' });
      transfer.items.add(file);
      input.files = transfer.files;
      await fireEvent.change(input);
      expect(onchange).toHaveBeenLastCalledWith([{ attachment: file }]);
      const submitted = new FormData(form).get('attachment');
      expect(submitted).toBeInstanceOf(File);
      if (!(submitted instanceof File)) throw new Error('Expected attachment');
      expect(submitted.name).toBe('attachment.txt');
      expect(submitted.size).toBe(file.size);
      await view.rerender({ disabled: true });
      expect(Array.from(new FormData(form))).toEqual([]);
    } finally {
      view.unmount();
      form.remove();
    }
  });
});
