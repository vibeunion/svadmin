import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import LiteFileUpload from './LiteFileUpload.svelte';

afterEach(cleanup);

function fileInput(element: HTMLElement): HTMLInputElement {
  if (!(element instanceof HTMLInputElement)) throw new Error('Expected a native file input');
  return element;
}

describe('LiteFileUpload native form fallback', () => {
  it('keeps a visible native control with multipart field attributes and no nested form', () => {
    const view = render(LiteFileUpload, {
      name: 'attachments',
      label: 'Attachments',
      id: 'attachments',
      form: 'upload-form',
      accept: '.pdf,application/pdf',
      multiple: true,
      required: true,
    });
    const input = fileInput(view.getByLabelText('Attachments'));
    expect(input.type).toBe('file');
    expect(input.name).toBe('attachments');
    expect(input.accept).toBe('.pdf,application/pdf');
    expect(input.multiple).toBe(true);
    expect(input.required).toBe(true);
    expect(input.getAttribute('form')).toBe('upload-form');
    expect(input.classList.contains('lite-file-picker__native')).toBe(false);
    expect(input.hidden).toBe(false);
    expect(view.container.querySelector('form')).toBeNull();
  });

  it('uses native required and disabled validation semantics', async () => {
    const view = render(LiteFileUpload, {
      name: 'attachment', label: 'Attachment', required: true,
    });
    const input = fileInput(view.getByLabelText('Attachment'));
    expect(input.checkValidity()).toBe(false);
    await view.rerender({ disabled: true });
    expect(input.disabled).toBe(true);
    expect(input.willValidate).toBe(false);
    expect(input.checkValidity()).toBe(true);
  });

  it('associates server errors and clears the association after recovery', async () => {
    const view = render(LiteFileUpload, {
      name: 'attachment', label: 'Attachment', error: 'File is too large.',
    });
    const input = fileInput(view.getByLabelText('Attachment'));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(view.getByRole('alert').id).toBe(input.getAttribute('aria-describedby'));
    expect(view.getByRole('alert').textContent).toBe('File is too large.');
    await view.rerender({ error: undefined });
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('generates distinct label targets for repeated fields', () => {
    const first = render(LiteFileUpload, { name: 'attachments', label: 'First' });
    const second = render(LiteFileUpload, { name: 'attachments', label: 'Second' });
    const firstInput = fileInput(first.getByLabelText('First'));
    const secondInput = fileInput(second.getByLabelText('Second'));
    expect(firstInput.id).toBeTruthy();
    expect(firstInput.id).not.toBe(secondInput.id);
    expect(firstInput.multiple).toBe(false);
  });
});
