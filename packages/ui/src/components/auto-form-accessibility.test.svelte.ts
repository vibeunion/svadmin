import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AutoFormAccessibilityHarness from '../../test/fixtures/AutoFormAccessibilityHarness.svelte';
import FieldRenderer from './FieldRenderer.svelte';
import type { FieldDefinition } from '@svadmin/core';
import { createRawSnippet } from 'svelte';

import { requireValue } from '../../../../scripts/test-assertions';
beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

describe('AutoForm accessibility', () => {
  it.each([
    'text', 'image', 'email', 'url', 'phone', 'number', 'currency', 'percent',
    'textarea', 'richtext', 'select', 'boolean', 'date', 'time', 'datetime', 'json', 'file', 'color',
  ] satisfies FieldDefinition['type'][])('isolates %s field labels across renderer instances', (type) => {
    const field: FieldDefinition = {
      key: 'shared',
      label: 'Shared',
      type,
    };
    const first = render(FieldRenderer, { field, value: null, onchange: () => {} });
    const second = render(FieldRenderer, { field, value: null, onchange: () => {} });
    const ids: string[] = [];
    for (const view of [first, second]) {
      const label = requireValue(view.container.querySelector<HTMLLabelElement>('label[data-svadmin-field-label]'));
      const control = requireValue(document.getElementById(label.htmlFor));
      expect(view.container.contains(control)).toBe(true);
      expect(label.control).toBe(control);
      ids.push(control.id);
    }
    expect(new Set(ids).size).toBe(2);
  });

  it('preserves an explicit control ID and keeps default IDs stable on value updates', async () => {
    const field: FieldDefinition = { key: 'name', label: 'Name', type: 'text' };
    const explicit = render(FieldRenderer, { field, id: 'customer-name', value: '', onchange: () => {} });
    expect(explicit.container.querySelector('input')?.id).toBe('customer-name');
    const automatic = render(FieldRenderer, { field, value: '', onchange: () => {} });
    const input = requireValue(automatic.container.querySelector('input'));
    const id = input.id;
    await automatic.rerender({ value: 'Changed' });
    expect(input.id).toBe(id);
    expect(input.name).toBe('name');
    expect(input.value).toBe('Changed');
  });

  it.each([
    'text', 'textarea', 'number', 'currency', 'percent', 'select', 'boolean',
    'date', 'time', 'datetime', 'color', 'json', 'richtext',
  ] satisfies FieldDefinition['type'][])('combines %s field descriptions and errors without crossing instances', (type) => {
    const field: FieldDefinition = {
      key: 'shared', label: 'Shared', type, description: '<b>Useful context</b>',
    };
    const descriptionIds: string[] = [];
    for (let index = 0; index < 2; index += 1) {
      const errorId = `shared-error-${index}`;
      const view = render(FieldRenderer, { field, value: null, onchange: () => {}, invalid: true, errorId });
      const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
      expect(description.textContent).toBe('<b>Useful context</b>');
      expect(description.querySelector('b')).toBeNull();
      const label = requireValue(view.container.querySelector('label'));
      const control = requireValue(label.control);
      expect(control.getAttribute('aria-describedby')).toBe(`${description.id} ${errorId}`);
      expect(document.getElementById(description.id)).toBe(description);
      descriptionIds.push(description.id);
    }
    expect(new Set(descriptionIds).size).toBe(2);
  });

  it('updates and removes descriptions without losing the error reference', async () => {
    const field: FieldDefinition = { key: 'name', label: 'Name', type: 'text' };
    const view = render(FieldRenderer, { field, value: '', onchange: () => {}, errorId: 'name-error' });
    const input = requireValue(view.container.querySelector('input'));
    expect(input.getAttribute('aria-describedby')).toBe('name-error');
    await view.rerender({ field: { ...field, description: 'First description' } });
    const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
    const id = description.id;
    expect(input.getAttribute('aria-describedby')).toBe(`${id} name-error`);
    await view.rerender({ field: { ...field, description: 'Updated description' } });
    expect(description.id).toBe(id);
    expect(description.textContent).toBe('Updated description');
    await view.rerender({ field });
    expect(view.container.querySelector('[data-svadmin-field-description]')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBe('name-error');
  });

  it.each(['description', 'label', 'control'])('keeps internal IDs distinct for the %s business key', (key) => {
    const field: FieldDefinition = { key, label: 'Field', type: 'text', description: 'Help' };
    const view = render(FieldRenderer, { field, value: '', onchange: () => {} });
    const label = requireValue(view.container.querySelector('label'));
    const input = requireValue(view.container.querySelector('input'));
    const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
    expect(new Set([label.id, input.id, description.id]).size).toBe(3);
    expect(label.control).toBe(input);
    expect(document.getElementById(requireValue(input.getAttribute('aria-describedby')))).toBe(description);
  });

  it('removes the description attribute when no description or error remains', async () => {
    const field: FieldDefinition = { key: 'name', label: 'Name', type: 'text', description: 'Help' };
    const view = render(FieldRenderer, { field, value: '', onchange: () => {} });
    const input = requireValue(view.container.querySelector('input'));
    expect(input.hasAttribute('aria-describedby')).toBe(true);
    await view.rerender({ field: { ...field, description: '' } });
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(view.container.querySelector('[data-svadmin-field-description]')).toBeNull();
  });

  it.each(['daterange', 'multiselect'] as const)('links %s controls to description and error together', (type) => {
    const field: FieldDefinition = {
      key: 'shared', label: 'Shared', type, description: 'Help',
      options: [{ label: 'Option', value: 'option' }],
    };
    const view = render(FieldRenderer, { field, value: null, onchange: () => {}, errorId: 'shared-error' });
    const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
    const controls = type === 'daterange'
      ? Array.from(view.container.querySelectorAll('input'))
      : [view.getByRole('group'), view.getByRole('checkbox')];
    expect(controls).toHaveLength(2);
    for (const control of controls) {
      expect(control.getAttribute('aria-describedby')).toBe(`${description.id} shared-error`);
    }
  });

  it('keeps daterange preset, start, and end feedback isolated per FieldRenderer instance', async () => {
    const presets = [{ label: 'First week', value: { start: '2026-09-01', end: '2026-09-07' } }];
    const preset = requireValue(presets[0]);
    const initialValue = { start: '2026-08-01', end: '2026-08-10' };
    const initialInputValues = [initialValue.start, initialValue.end];
    const makeField = (description: string): FieldDefinition => ({
      key: 'period', label: 'Period', type: 'daterange', description,
      dateInput: { presets },
    });
    const fieldA = makeField('First help');
    const fieldB = makeField('Second help');
    const errorIdA = 'period-error-a';
    const errorIdB = 'period-error-b';
    const onchange = vi.fn();

    interface RangeControls {
      preset: HTMLSelectElement;
      start: HTMLInputElement;
      end: HTMLInputElement;
    }
    const readControls = (container: HTMLElement): RangeControls => {
      const inputs = [...container.querySelectorAll<HTMLInputElement>('input')];
      expect(inputs).toHaveLength(2);
      return {
        preset: requireValue(container.querySelector<HTMLSelectElement>('select')),
        start: requireValue(inputs[0]),
        end: requireValue(inputs[1]),
      };
    };
    const controlsOf = ({ preset: select, start, end }: RangeControls) => [select, start, end];
    const inputValuesOf = ({ start, end }: RangeControls) => [start.value, end.value];
    const feedbackOf = (descriptionId: string, errorId: string) => `${descriptionId} ${errorId}`;

    const hostErrors: HTMLParagraphElement[] = [];
    const attachError = (view: { container: HTMLElement }, id: string, text: string): void => {
      const error = document.createElement('p');
      error.id = id;
      error.textContent = text;
      view.container.append(error);
      hostErrors.push(error);
    };
    try {
      const viewA = render(FieldRenderer, {
        field: fieldA, value: initialValue, onchange, invalid: true, errorId: errorIdA,
      });
      const viewB = render(FieldRenderer, {
        field: fieldB, value: initialValue, onchange, invalid: true, errorId: errorIdB,
      });
      attachError(viewA, errorIdA, 'Error A');
      attachError(viewB, errorIdB, 'Error B');
      const controlsA = readControls(viewA.container);
      const controlsB = readControls(viewB.container);
      const descriptionA = requireValue(
        viewA.container.querySelector<HTMLElement>('[data-svadmin-field-description]'),
      );
      const descriptionB = requireValue(
        viewB.container.querySelector<HTMLElement>('[data-svadmin-field-description]'),
      );
      expect(descriptionA.id).not.toBe(descriptionB.id);

      const instances = [
        { view: viewA, controls: controlsA, descriptionId: descriptionA.id, errorId: errorIdA,
          otherDescriptionId: descriptionB.id, otherErrorId: errorIdB },
        { view: viewB, controls: controlsB, descriptionId: descriptionB.id, errorId: errorIdB,
          otherDescriptionId: descriptionA.id, otherErrorId: errorIdA },
      ] as const;
      for (const instance of instances) {
        const { view, controls, descriptionId, errorId } = instance;
        const expected = feedbackOf(descriptionId, errorId);
        for (const control of controlsOf(controls)) {
          expect(control.getAttribute('aria-describedby')).toBe(expected);
          expect(control.getAttribute('aria-invalid')).toBe('true');
          const refs = requireValue(control.getAttribute('aria-describedby')).split(/\s+/);
          expect(refs).not.toContain(instance.otherDescriptionId);
          expect(refs).not.toContain(instance.otherErrorId);
          for (const ref of refs) {
            expect(view.container.contains(requireValue(document.getElementById(ref)))).toBe(true);
          }
        }
      }
      expect(viewA.container.contains(descriptionB)).toBe(false);
      expect(viewB.container.contains(descriptionA)).toBe(false);
      expect(viewA.container.querySelector(`#${errorIdB}`)).toBeNull();
      expect(viewB.container.querySelector(`#${errorIdA}`)).toBeNull();
      expect(inputValuesOf(controlsA)).toEqual(initialInputValues);
      expect(inputValuesOf(controlsB)).toEqual(initialInputValues);

      await viewA.rerender({ field: fieldA, value: initialValue, invalid: false, errorId: undefined });
      expect(onchange).not.toHaveBeenCalled();
      for (const control of controlsOf(controlsA)) {
        expect(control.getAttribute('aria-describedby')).toBe(descriptionA.id);
        expect(control.hasAttribute('aria-invalid')).toBe(false);
      }
      expect(inputValuesOf(controlsA)).toEqual(initialInputValues);

      await viewA.rerender({
        field: { ...fieldA, description: '' }, value: initialValue, invalid: false, errorId: undefined,
      });
      expect(onchange).not.toHaveBeenCalled();
      expect(viewA.container.querySelector('[data-svadmin-field-description]')).toBeNull();
      for (const control of controlsOf(controlsA)) {
        expect(control.hasAttribute('aria-describedby')).toBe(false);
        expect(control.hasAttribute('aria-invalid')).toBe(false);
      }
      expect(inputValuesOf(controlsA)).toEqual(initialInputValues);

      for (const control of controlsOf(controlsB)) {
        expect(control.getAttribute('aria-describedby')).toBe(feedbackOf(descriptionB.id, errorIdB));
        expect(control.getAttribute('aria-invalid')).toBe('true');
      }

      await viewB.rerender({
        field: { ...fieldB, description: '' }, value: initialValue, invalid: true, errorId: errorIdB,
      });
      for (const control of controlsOf(controlsB)) {
        expect(control.getAttribute('aria-describedby')).toBe(errorIdB);
        expect(control.getAttribute('aria-invalid')).toBe('true');
      }

      await viewB.rerender({
        field: { ...fieldB, description: '' }, value: initialValue, invalid: false, errorId: undefined,
      });
      expect(onchange).not.toHaveBeenCalled();
      for (const control of controlsOf(controlsB)) {
        expect(control.hasAttribute('aria-describedby')).toBe(false);
        expect(control.hasAttribute('aria-invalid')).toBe(false);
      }
      expect(inputValuesOf(controlsB)).toEqual(initialInputValues);

      await fireEvent.change(controlsB.preset, { target: { value: '0' } });
      expect(onchange).toHaveBeenCalledExactlyOnceWith(preset.value);
      await waitFor(() => {
        expect(inputValuesOf(controlsB)).toEqual([preset.value.start, preset.value.end]);
      });
      expect(inputValuesOf(controlsA)).toEqual(initialInputValues);
    } finally {
      for (const error of hostErrors) error.remove();
    }
  });

  it('preserves custom child label targets and allows an explicit override', () => {
    const field: FieldDefinition = { key: 'custom', label: 'Custom', type: 'text' };
    for (const id of [undefined, 'custom-override']) {
      const target = id ?? field.key;
      const children = createRawSnippet(() => ({ render: () => `<input id="${target}" />` }));
      const props = { field, value: '', onchange: () => {}, children };
      const view = render(FieldRenderer, id ? { ...props, id } : props);
      const label = requireValue(view.container.querySelector('label'));
      expect(label.control).toBe(view.container.querySelector('input'));
      expect(label.htmlFor).toBe(target);
    }
  });

  it('isolates long selects and image URL controls', () => {
    for (const type of ['select', 'images'] as const) {
      const field: FieldDefinition = {
        key: 'shared', label: 'Shared', type,
        options: Array.from({ length: 9 }, (_, value) => ({ label: `Option ${value}`, value })),
      };
      const ids: string[] = [];
      for (let index = 0; index < 2; index += 1) {
        const view = render(FieldRenderer, { field, value: type === 'images' ? [''] : 0, onchange: () => {} });
        const label = requireValue(view.container.querySelector('label'));
        const control = requireValue(label.control);
        expect(view.container.contains(control)).toBe(true);
        ids.push(control.id);
      }
      expect(new Set(ids).size).toBe(2);
    }
  });

  it('isolates multiselect group labels and option IDs', () => {
    const field: FieldDefinition = {
      key: 'choices', label: 'Choices', type: 'multiselect',
      options: [{ label: 'First', value: 'first' }],
    };
    const first = render(FieldRenderer, { field, value: [], onchange: () => {} });
    const second = render(FieldRenderer, { field, value: [], onchange: () => {} });
    const ids: string[] = [];
    for (const view of [first, second]) {
      const group = within(view.container).getByRole('group', { name: 'Choices' });
      const label = document.getElementById(requireValue(group.getAttribute('aria-labelledby')));
      expect(view.container.contains(label)).toBe(true);
      ids.push(within(group).getByRole('checkbox').id);
    }
    expect(new Set(ids).size).toBe(2);
  });

  it('associates a date range label with its own start input and preserves submission names', () => {
    const field: FieldDefinition = { key: 'period', label: 'Period', type: 'daterange' };
    const ids: string[] = [];
    for (let index = 0; index < 2; index += 1) {
      const view = render(FieldRenderer, { field, value: null, onchange: () => {} });
      const start = requireValue(view.container.querySelector('input[name="period.start"]'));
      const label = requireValue(view.container.querySelector<HTMLLabelElement>('label[data-svadmin-field-label]'));
      expect(label.control).toBe(start);
      const end = requireValue(view.container.querySelector('input[name="period.end"]'));
      ids.push(start.id, end.id);
    }
    expect(new Set(ids).size).toBe(4);
  });

  it('associates labels with controls in their own form without changing submission names', async () => {
    const first = render(AutoFormAccessibilityHarness);
    const second = render(AutoFormAccessibilityHarness);
    const ids: string[] = [];
    for (const view of [first, second]) {
      await within(view.container).findByRole('textbox', { name: /^Name/ });
      const form = requireValue(view.container.querySelector('form'));
      for (const name of ['name', 'description']) {
        const input = requireValue(form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`));
        const label = requireValue(input.closest('[data-svadmin-field]')?.querySelector('label'));
        expect(label.control).toBe(input);
        expect(label.htmlFor).toBe(input.id);
        expect(document.getElementById(input.id)).toBe(input);
        ids.push(input.id);
        expect(new FormData(form).has(name)).toBe(true);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps error references and summary focus inside each form instance', async () => {
    const first = render(AutoFormAccessibilityHarness);
    const second = render(AutoFormAccessibilityHarness);
    const forms = [within(first.container), within(second.container)];
    const inputs: HTMLElement[] = [];
    for (const form of forms) {
      const input = await form.findByRole('textbox', { name: /^Name/ });
      inputs.push(input);
      await fireEvent.click(form.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(input.getAttribute('aria-invalid')).toBe('true'));
    }
    expect(requireValue(inputs[0]).getAttribute('aria-describedby')).not.toBe(requireValue(inputs[1]).getAttribute('aria-describedby'));
    for (let index = 0; index < forms.length; index += 1) {
      const summary = requireValue(forms[index]).getByRole('region', { name: 'Please fix the following errors' });
      await fireEvent.click(within(summary).getByRole('button', { name: /^Name:/ }));
      expect(document.activeElement).toBe(inputs[index]);
      const error = document.getElementById(requireValue(requireValue(inputs[index]).getAttribute('aria-describedby')));
      expect(error?.closest('form')).toBe(requireValue(inputs[index]).closest('form'));
    }
  });

  it('marks invalid named controls, links error messages, and focuses the first error', async () => {
    const view = render(AutoFormAccessibilityHarness);
    const nameInput = await view.findByRole('textbox', { name: /^Name/ });
    const descriptionInput = await view.findByRole('textbox', { name: /^Description/ });

    expect(nameInput.getAttribute('name')).toBe('name');
    expect(descriptionInput.getAttribute('name')).toBe('description');

    await fireEvent.click(view.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(nameInput.getAttribute('aria-invalid')).toBe('true');
      expect(descriptionInput.getAttribute('aria-invalid')).toBe('true');
      expect(nameInput.getAttribute('aria-describedby')).toMatch(/^.+-products-name-error$/);
      expect(descriptionInput.getAttribute('aria-describedby')).toMatch(/^.+-products-description-error$/);
      expect(document.activeElement).toBe(nameInput);
    });

    const nameErrorId = requireValue(nameInput.getAttribute('aria-describedby'));
    expect(view.getByText('This field is required', { selector: `#${nameErrorId}` })).toBeTruthy();
    expect(view.getByRole('region', { name: 'Please fix the following errors' })).toBeTruthy();
    await fireEvent.click(requireValue(view.getByRole('region', { name: 'Please fix the following errors' }).querySelector('button')));
    expect(document.activeElement).toBe(nameInput);
    expect(view.getByTestId('success-count').textContent).toBe('0');
  });

  it('calls the success callback only after valid submission', async () => {
    const view = render(AutoFormAccessibilityHarness);
    await fireEvent.input(await view.findByRole('textbox', { name: /^Name/ }), {
      target: { value: 'Validated product' },
    });
    await fireEvent.input(await view.findByRole('textbox', { name: /^Description/ }), {
      target: { value: 'Ready to create' },
    });

    await fireEvent.click(view.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(view.getByTestId('success-count').textContent).toBe('1');
    });
  });
});
