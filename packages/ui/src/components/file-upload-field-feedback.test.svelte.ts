import { fireEvent, render, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDefinition } from '@svadmin/core';
import { requireValue } from '../../../../scripts/test-assertions';
import FieldRenderer from './FieldRenderer.svelte';
import FileUpload from './FileUpload.svelte';

describe('FileUpload field feedback', () => {
  it('links both upload entry points to the owning field description and error', () => {
    const field: FieldDefinition = {
      key: 'attachment', label: 'Attachment', type: 'file', description: 'PDF document',
    };
    const ids: string[] = [];
    for (let index = 0; index < 2; index += 1) {
      const view = render(FieldRenderer, {
        field, value: null, onchange: () => {}, invalid: true, errorId: `error-${index}`,
      });
      const input = requireValue(view.container.querySelector('input[type="file"]'));
      const dropzone = within(view.container).getByRole('button', { name: 'Attachment' });
      const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
      expect(input.getAttribute('aria-label')).toBe('Attachment');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe(`${description.id} error-${index}`);
      expect(dropzone.getAttribute('aria-label')).toBe('Attachment');
      expect(dropzone.getAttribute('data-invalid')).toBe('true');
      expect(dropzone.hasAttribute('aria-invalid')).toBe(false);
      expect(dropzone.getAttribute('aria-describedby')).toBe(`${description.id} error-${index}`);
      expect(document.getElementById(description.id)).toBe(description);
      ids.push(description.id);
    }
    expect(new Set(ids).size).toBe(2);
  });

  it('updates field feedback without replacing the native input', async () => {
    const field: FieldDefinition = {
      key: 'attachment', label: 'Attachment', type: 'file', description: 'PDF document',
    };
    const view = render(FieldRenderer, { field, value: null, onchange: () => {}, invalid: true, errorId: 'old-error' });
    const input = requireValue(view.container.querySelector('input[type="file"]'));
    const dropzone = view.getByRole('button', { name: 'Attachment' });
    const description = requireValue(view.container.querySelector('[data-svadmin-field-description]'));
    await view.rerender({ invalid: false, errorId: '' });
    for (const control of [input, dropzone]) {
      expect(control.getAttribute('aria-describedby')).toBe(description.id);
      expect(control.hasAttribute('aria-invalid')).toBe(false);
    }
    await view.rerender({ field: { ...field, description: '', label: 'Evidence' }, invalid: false });
    expect(view.container.querySelector('input[type="file"]')).toBe(input);
    expect(input.getAttribute('aria-label')).toBe('Evidence');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(dropzone.getAttribute('aria-label')).toBe('Evidence');
    expect(dropzone.hasAttribute('data-invalid')).toBe(false);
    expect(dropzone.hasAttribute('aria-describedby')).toBe(false);
  });

  it.each(['click', 'Enter', ' '])('does not open the picker through %s when disabled', async (action) => {
    const view = render(FileUpload, { disabled: true });
    const input = requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]'));
    const open = vi.spyOn(input, 'click').mockImplementation(() => {});
    const dropzone = view.getByRole('button');
    if (action === 'click') await fireEvent.click(dropzone);
    else await fireEvent.keyDown(dropzone, { key: action });
    expect(open).not.toHaveBeenCalled();
    expect(dropzone.getAttribute('tabindex')).toBe('-1');
  });

  it.each(['click', 'Enter', ' '])('opens the picker once through %s when enabled', async (action) => {
    const view = render(FileUpload);
    const input = requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]'));
    const open = vi.spyOn(input, 'click').mockImplementation(() => {});
    const dropzone = view.getByRole('button');
    if (action === 'click') await fireEvent.click(dropzone);
    else await fireEvent.keyDown(dropzone, { key: action });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('preserves selected files and native submission when feedback changes', async () => {
    const form = document.createElement('form');
    const target = document.createElement('div');
    form.append(target);
    document.body.append(form);
    const onChange = vi.fn();
    const view = render(FileUpload, {
      target, props: { name: 'attachment', ariaLabel: 'Attachment', invalid: true, describedby: 'old-error', onChange },
    });
    try {
      const input = requireValue(form.querySelector<HTMLInputElement>('input[type="file"]'));
      const transfer = new DataTransfer();
      transfer.items.add(new File(['report'], 'report.pdf', { type: 'application/pdf' }));
      input.files = transfer.files;
      await fireEvent.change(input);
      const selected = Array.from(input.files ?? []);
      const changeCount = onChange.mock.calls.length;
      expect(changeCount).toBe(1);
      await view.rerender({ invalid: false, describedby: 'new-help', ariaLabel: 'Evidence' });
      expect(Array.from(input.files ?? [])).toEqual(selected);
      expect(onChange).toHaveBeenCalledTimes(changeCount);
      expect(view.getByText('report.pdf')).toBeTruthy();
      const submitted = new FormData(form).get('attachment');
      expect(submitted).toBeInstanceOf(File);
      if (!(submitted instanceof File)) throw new Error('Expected native file submission');
      expect(submitted.name).toBe('report.pdf');
      expect(input.getAttribute('aria-describedby')).toBe('new-help');
      const dropzone = view.getByRole('button', { name: 'Evidence' });
      expect(dropzone.getAttribute('aria-describedby')).toBe('new-help');
      expect(dropzone.hasAttribute('data-invalid')).toBe(false);
    } finally {
      view.unmount();
      form.remove();
    }
  });

  it('uses the current disabled state for the existing picker entry', async () => {
    const view = render(FileUpload);
    const input = requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]'));
    const open = vi.spyOn(input, 'click').mockImplementation(() => {});
    const dropzone = view.getByRole('button');
    await view.rerender({ disabled: true });
    await fireEvent.click(dropzone);
    await fireEvent.keyDown(dropzone, { key: 'Enter' });
    expect(open).not.toHaveBeenCalled();
    expect(input.disabled).toBe(true);
    await view.rerender({ disabled: false });
    await fireEvent.click(dropzone);
    expect(open).toHaveBeenCalledTimes(1);
    expect(dropzone.getAttribute('tabindex')).toBe('0');
  });
});
