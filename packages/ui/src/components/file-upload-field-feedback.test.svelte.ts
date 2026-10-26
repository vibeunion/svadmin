import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDefinition } from '@svadmin/core';
import { requireValue } from '../../../../scripts/test-assertions';
import FieldRenderer from './FieldRenderer.svelte';
import FileUpload from './FileUpload.svelte';

function resolveDescribedBy(element: Element): Element[] {
  return (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
    .map(id => requireValue(document.getElementById(id)));
}

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

  it('resolves real description and error nodes per file field without leaking feedback', async () => {
    const fieldA: FieldDefinition = {
      key: 'attachmentA', label: 'Attachment A', type: 'file', description: 'A document',
    };
    const fieldB: FieldDefinition = {
      key: 'attachmentB', label: 'Attachment B', type: 'file', description: 'B document',
    };
    const errorA = document.createElement('p');
    errorA.id = 'file-error-a';
    errorA.textContent = 'A is invalid';
    const errorB = document.createElement('p');
    errorB.id = 'file-error-b';
    errorB.textContent = 'B is invalid';
    document.body.append(errorA, errorB);
    const onChangeA = vi.fn();
    const onChangeB = vi.fn();
    const viewA = render(FieldRenderer, {
      field: fieldA, value: null, onchange: onChangeA, invalid: true, errorId: errorA.id,
    });
    const viewB = render(FieldRenderer, {
      field: fieldB, value: null, onchange: onChangeB, invalid: true, errorId: errorB.id,
    });
    const resolve = (idref: string | null) =>
      requireValue(idref).split(/\s+/).map(id => document.getElementById(id));
    try {
      const inputA = requireValue(viewA.container.querySelector('input[type="file"]'));
      const dropzoneA = within(viewA.container).getByRole('button', { name: 'Attachment A' });
      const descriptionA = requireValue(viewA.container.querySelector('[data-svadmin-field-description]'));
      const inputB = requireValue(viewB.container.querySelector('input[type="file"]'));
      const dropzoneB = within(viewB.container).getByRole('button', { name: 'Attachment B' });
      const descriptionB = requireValue(viewB.container.querySelector('[data-svadmin-field-description]'));
      expect(descriptionA.id).not.toBe(descriptionB.id);
      for (const [entry, description, error] of [
        [inputA, descriptionA, errorA], [dropzoneA, descriptionA, errorA],
        [inputB, descriptionB, errorB], [dropzoneB, descriptionB, errorB],
      ] as const) {
        const refs = requireValue(entry.getAttribute('aria-describedby')).split(/\s+/);
        expect(refs).toEqual([description.id, error.id]);
        expect(resolve(entry.getAttribute('aria-describedby'))).toEqual([description, error]);
      }
      expect(inputA.getAttribute('aria-invalid')).toBe('true');
      expect(dropzoneA.getAttribute('data-invalid')).toBe('true');
      expect(inputB.getAttribute('aria-invalid')).toBe('true');
      expect(dropzoneB.getAttribute('data-invalid')).toBe('true');

      await viewA.rerender({ field: { ...fieldA, description: '' }, invalid: false, errorId: '' });

      expect(viewA.container.querySelector('[data-svadmin-field-description]')).toBeNull();
      expect(document.getElementById(descriptionA.id)).toBeNull();
      for (const entry of [inputA, dropzoneA]) {
        expect(entry.hasAttribute('aria-describedby')).toBe(false);
        expect(entry.hasAttribute('aria-invalid')).toBe(false);
        expect(entry.hasAttribute('data-invalid')).toBe(false);
      }
      for (const entry of [inputB, dropzoneB]) {
        const refs = requireValue(entry.getAttribute('aria-describedby')).split(/\s+/);
        expect(refs).toEqual([descriptionB.id, errorB.id]);
        expect(resolve(entry.getAttribute('aria-describedby'))).toEqual([descriptionB, errorB]);
        expect(refs).not.toContain(descriptionA.id);
      }
      expect(viewB.container.querySelector('[data-svadmin-field-description]')).toBe(descriptionB);
      expect(document.getElementById(descriptionB.id)).toBe(descriptionB);
      expect(document.getElementById(errorB.id)).toBe(errorB);
      expect(inputB.getAttribute('aria-invalid')).toBe('true');
      expect(dropzoneB.getAttribute('data-invalid')).toBe('true');
      expect(onChangeA).not.toHaveBeenCalled();
      expect(onChangeB).not.toHaveBeenCalled();
    } finally {
      viewA.unmount();
      viewB.unmount();
      errorA.remove();
      errorB.remove();
    }
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

  it('links queued cancel, retry and remove actions to the owning field feedback', async () => {
    const fieldA: FieldDefinition = {
      key: 'attachmentA', label: 'Attachment A', type: 'file', description: 'A document',
    };
    const fieldB: FieldDefinition = {
      key: 'attachmentB', label: 'Attachment B', type: 'file', description: 'B document',
    };
    const errorA = document.createElement('p');
    errorA.id = 'queued-file-error-a';
    errorA.textContent = 'A is invalid';
    const errorB = document.createElement('p');
    errorB.id = 'queued-file-error-b';
    errorB.textContent = 'B is invalid';
    document.body.append(errorA, errorB);
    let resolveA!: (value: undefined) => void;
    let resolveB!: (value: undefined) => void;
    const uploadA = () => new Promise<undefined>(resolve => { resolveA = resolve; });
    const uploadB = () => new Promise<undefined>(resolve => { resolveB = resolve; });
    const viewA = render(FieldRenderer, {
      field: fieldA, value: null, onchange: () => {}, invalid: true, errorId: errorA.id, upload: uploadA,
    });
    const viewB = render(FieldRenderer, {
      field: fieldB, value: null, onchange: () => {}, invalid: true, errorId: errorB.id, upload: uploadB,
    });
    try {
      const inputA = requireValue(viewA.container.querySelector<HTMLInputElement>('input[type="file"]'));
      const inputB = requireValue(viewB.container.querySelector<HTMLInputElement>('input[type="file"]'));
      await fireEvent.change(inputA, { target: { files: [new File(['a'], 'a.pdf')] } });
      await fireEvent.change(inputB, { target: { files: [new File(['b'], 'b.pdf')] } });

      const descriptionA = requireValue(viewA.container.querySelector('[data-svadmin-field-description]'));
      const descriptionB = requireValue(viewB.container.querySelector('[data-svadmin-field-description]'));
      const feedbackA = [descriptionA, errorA];
      const feedbackB = [descriptionB, errorB];
      const cancelA = await within(viewA.container).findByRole('button', { name: 'Cancel upload' });
      const cancelB = await within(viewB.container).findByRole('button', { name: 'Cancel upload' });
      for (const [action, feedback] of [
        [cancelA, feedbackA],
        [within(viewA.container).getByRole('button', { name: 'Remove file' }), feedbackA],
        [cancelB, feedbackB],
        [within(viewB.container).getByRole('button', { name: 'Remove file' }), feedbackB],
      ] as const) {
        expect(resolveDescribedBy(action)).toEqual(feedback);
        expect(action.getAttribute('aria-invalid')).toBe('true');
      }
      expect(resolveDescribedBy(cancelA)).not.toContain(descriptionB);
      expect(resolveDescribedBy(cancelA)).not.toContain(errorB);

      await fireEvent.click(cancelA);
      const retryA = await within(viewA.container).findByRole('button', { name: 'Retry upload' });
      expect(resolveDescribedBy(retryA)).toEqual(feedbackA);
      expect(retryA.getAttribute('aria-invalid')).toBe('true');
      expect(resolveDescribedBy(cancelB)).toEqual(feedbackB);

      await viewA.rerender({ field: fieldA, value: null, invalid: false, errorId: undefined, upload: uploadA });
      await waitFor(() => {
        for (const action of [retryA, within(viewA.container).getByRole('button', { name: 'Remove file' })]) {
          expect(action.getAttribute('aria-describedby')).toBe(descriptionA.id);
          expect(action.hasAttribute('aria-invalid')).toBe(false);
        }
      });
      expect(resolveDescribedBy(cancelB)).toEqual(feedbackB);
      expect(cancelB.getAttribute('aria-invalid')).toBe('true');

      await viewA.rerender({ field: { ...fieldA, description: '' }, value: null, invalid: false, upload: uploadA });
      await waitFor(() => {
        for (const action of [retryA, within(viewA.container).getByRole('button', { name: 'Remove file' })]) {
          expect(action.hasAttribute('aria-describedby')).toBe(false);
          expect(action.hasAttribute('aria-invalid')).toBe(false);
        }
      });
      expect(viewA.container.querySelector('[data-svadmin-field-description]')).toBeNull();
      expect(resolveDescribedBy(cancelB)).toEqual(feedbackB);
      expect(viewB.container.querySelector('[data-svadmin-field-description]')).toBe(descriptionB);
    } finally {
      viewA.unmount();
      viewB.unmount();
      resolveA(undefined);
      resolveB(undefined);
      errorA.remove();
      errorB.remove();
    }
  });

  it('links existing attachment removal to the owning field feedback', async () => {
    const fieldA: FieldDefinition = {
      key: 'attachmentA', label: 'Attachment A', type: 'file', description: 'A document',
    };
    const fieldB: FieldDefinition = {
      key: 'attachmentB', label: 'Attachment B', type: 'file', description: 'B document',
    };
    const errorA = document.createElement('p');
    errorA.id = 'existing-file-error-a';
    const errorB = document.createElement('p');
    errorB.id = 'existing-file-error-b';
    document.body.append(errorA, errorB);
    const upload = async () => undefined;
    const viewA = render(FieldRenderer, {
      field: fieldA, value: { url: '/existing-a.pdf' }, onchange: () => {},
      invalid: true, errorId: errorA.id, upload,
    });
    const viewB = render(FieldRenderer, {
      field: fieldB, value: { url: '/existing-b.pdf' }, onchange: () => {},
      invalid: true, errorId: errorB.id, upload,
    });
    try {
      const descriptionA = requireValue(viewA.container.querySelector('[data-svadmin-field-description]'));
      const descriptionB = requireValue(viewB.container.querySelector('[data-svadmin-field-description]'));
      const removeA = within(viewA.container).getByRole('button', { name: 'Remove /existing-a.pdf' });
      const removeB = within(viewB.container).getByRole('button', { name: 'Remove /existing-b.pdf' });
      expect(resolveDescribedBy(removeA)).toEqual([descriptionA, errorA]);
      expect(resolveDescribedBy(removeB)).toEqual([descriptionB, errorB]);
      expect(removeA.getAttribute('aria-invalid')).toBe('true');
      expect(removeB.getAttribute('aria-invalid')).toBe('true');

      await viewA.rerender({
        field: fieldA, value: { url: '/existing-a.pdf' }, invalid: false, errorId: undefined, upload,
      });
      await waitFor(() => {
        expect(removeA.getAttribute('aria-describedby')).toBe(descriptionA.id);
        expect(removeA.hasAttribute('aria-invalid')).toBe(false);
      });
      expect(resolveDescribedBy(removeB)).toEqual([descriptionB, errorB]);
      expect(removeB.getAttribute('aria-invalid')).toBe('true');
    } finally {
      viewA.unmount();
      viewB.unmount();
      errorA.remove();
      errorB.remove();
    }
  });
});
