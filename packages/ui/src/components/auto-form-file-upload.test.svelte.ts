import { act, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Host from '../../test/fixtures/AutoFormUploadHarness.svelte';
import { requireValue } from '../../../../scripts/test-assertions';
import type { UploadHandler } from './file-upload-types.js';

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

function saveButton(container: HTMLElement): HTMLButtonElement {
  return within(container).getByRole('button', { name: 'Save' }) as HTMLButtonElement;
}

function fileInput(container: HTMLElement, fieldKey: string): HTMLInputElement {
  return requireValue(container.querySelector<HTMLInputElement>(
    `[data-svadmin-field-key="${fieldKey}"] input[type="file"]`,
  ));
}

async function selectFiles(container: HTMLElement, fieldKey: string, files: File[]): Promise<void> {
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  const input = await waitFor(() => fileInput(container, fieldKey));
  input.files = transfer.files;
  await fireEvent.change(input);
}


describe('AutoForm file upload field', () => {
  it('removes a successful single replacement without restoring the original reference', async () => {
    const view = render(Host, { mode: 'edit', upload: async () => ({ url: '/new.pdf' }) });
    await view.findByText('/existing.pdf');
    await selectFiles(view.container, 'attachment', [new File(['new'], 'new.pdf')]);
    await view.findByText('success');
    await fireEvent.click(view.getByRole('button', { name: 'Remove file' }));
    expect(view.queryByText('/existing.pdf')).toBeNull();
    await fireEvent.click(saveButton(view.container));
    await waitFor(() => expect(view.component.writeCount()).toBe(1));
    expect(view.component.writeVariables(0)).toEqual({
      attachment: null, attachments: ['/existing-a.pdf'],
    });
  });

  it('preserves the latest single reference when the next replacement fails', async () => {
    let rejectUpload: ((reason: Error) => void) | undefined;
    const upload = vi.fn<UploadHandler>()
      .mockResolvedValueOnce({ url: '/new.pdf' })
      .mockImplementationOnce(() => new Promise<{ url: string }>((_resolve, reject) => { rejectUpload = reject; }));
    const view = render(Host, { mode: 'edit', upload, customActions: true });
    await view.findByText('/existing.pdf');
    await selectFiles(view.container, 'attachment', [new File(['new'], 'new.pdf')]);
    await view.findByText('success');
    await selectFiles(view.container, 'attachment', [new File(['next'], 'next.pdf')]);
    await view.findByText('/new.pdf');
    expect(view.queryByText('/existing.pdf')).toBeNull();
    await act(async () => { requireValue(rejectUpload)(new Error('failed')); });
    await view.findByText('Upload failed.');
    expect(view.getByTestId('form-actions-loading').textContent).toBe('idle');
    expect((view.getByRole('button', { name: 'Custom save' }) as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.submit(requireValue(view.container.querySelector('form')));
    expect(view.component.writeCount()).toBe(0);
    await fireEvent.click(view.getByRole('button', { name: 'Remove file' }));
    await fireEvent.click(view.getByRole('button', { name: 'Custom save' }));
    await waitFor(() => expect(view.component.writeCount()).toBe(1));
    expect(view.component.writeVariables(0)).toEqual({
      attachment: { url: '/new.pdf' }, attachments: ['/existing-a.pdf'],
    });
  });

  it('writes JSON reference objects without collapsing url and uploadId', async () => {
    const upload = vi.fn(async (file: File) => file.name === 'one.pdf'
      ? { url: '/uploads/one.pdf', uploadId: 'id-one' }
      : { uploadId: `id-${file.name}` });
    const view = render(Host, { upload });

    await selectFiles(view.container, 'attachment', [
      new File(['report'], 'report.pdf', { type: 'application/pdf' }),
    ]);
    await selectFiles(view.container, 'attachments', [
      new File(['one'], 'one.pdf', { type: 'application/pdf' }),
      new File(['two'], 'two.pdf', { type: 'application/pdf' }),
    ]);
    await waitFor(() => expect(saveButton(view.container).disabled).toBe(false));

    await fireEvent.click(saveButton(view.container));

    await waitFor(() => expect(view.component.writeCount()).toBe(1));
    const variables = view.component.writeVariables(0);
    expect(variables).toEqual({
      attachment: { uploadId: 'id-report.pdf' },
      attachments: [
        { url: '/uploads/one.pdf', uploadId: 'id-one' },
        { uploadId: 'id-two.pdf' },
      ],
    });
    expect(JSON.stringify(variables)).toBe(JSON.stringify({
      attachment: { uploadId: 'id-report.pdf' },
      attachments: [
        { url: '/uploads/one.pdf', uploadId: 'id-one' },
        { uploadId: 'id-two.pdf' },
      ],
    }));
  });

  it('blocks submission while an upload is pending and releases it after success', async () => {
    let resolveUpload: ((value: { url: string }) => void) | undefined;
    const upload = vi.fn(() => new Promise<{ url: string }>((resolve) => { resolveUpload = resolve; }));
    const view = render(Host, { upload });

    await selectFiles(view.container, 'attachment', [new File(['report'], 'report.pdf')]);
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    expect(saveButton(view.container).disabled).toBe(true);

    const form = requireValue(view.container.querySelector('form'));
    await fireEvent.submit(form);
    expect(view.component.writeCount()).toBe(0);

    await act(async () => { resolveUpload?.({ url: '/uploads/report.pdf' }); });
    await waitFor(() => expect(saveButton(view.container).disabled).toBe(false));

    await fireEvent.click(saveButton(view.container));
    await waitFor(() => expect(view.component.writeCount()).toBe(1));
    expect(view.component.writeVariables(0)).toEqual({
      attachment: { url: '/uploads/report.pdf' },
    });
  });

  it('does not submit a successful upload that returned no url or uploadId', async () => {
    const upload = vi.fn(async () => ({}));
    const view = render(Host, { upload });

    await selectFiles(view.container, 'attachment', [new File(['report'], 'report.pdf')]);
    await waitFor(() => expect(view.getByText('success')).toBeTruthy());
    expect(view.getByText('Operation failed')).toBeTruthy();
    expect(saveButton(view.container).disabled).toBe(true);

    await fireEvent.click(saveButton(view.container));
    expect(view.component.writeCount()).toBe(0);
  });

  it('blocks partial saves on failed files until the failure is explicitly removed', async () => {
    const upload = vi.fn(async (file: File) => {
      if (file.name === 'bad.pdf') throw new Error('network down');
      return { url: `/uploads/${file.name}` };
    });
    const view = render(Host, { upload });

    await selectFiles(view.container, 'attachments', [
      new File(['good'], 'good.pdf', { type: 'application/pdf' }),
      new File(['bad'], 'bad.pdf', { type: 'application/pdf' }),
    ]);
    await waitFor(() => expect(view.getByText('Upload failed.')).toBeTruthy());
    expect(view.getByText('success')).toBeTruthy();
    expect(saveButton(view.container).disabled).toBe(true);

    const form = requireValue(view.container.querySelector('form'));
    await fireEvent.submit(form);
    expect(view.component.writeCount()).toBe(0);

    const failedRow = requireValue(view.getByText('bad.pdf').closest('li'));
    await fireEvent.click(within(failedRow).getByRole('button', { name: 'Remove file' }));
    await waitFor(() => expect(saveButton(view.container).disabled).toBe(false));
    await fireEvent.click(saveButton(view.container));

    await waitFor(() => expect(view.component.writeCount()).toBe(1));
    expect(view.component.writeVariables(0)).toEqual({
      attachments: [{ url: '/uploads/good.pdf' }],
    });
  });

  it('cancels the in-flight session on reset, restores the baseline and drops late results', async () => {
    let resolveUpload: ((value: { url: string }) => void) | undefined;
    const upload = vi.fn((_file: File, session: { setUploadId: (id: string) => void }) => {
      session.setUploadId('upload-reset');
      return new Promise<{ url: string }>((resolve) => { resolveUpload = resolve; });
    });
    const cancelUpload = vi.fn(async (_file: File, _cancellation: { uploadId: string; reason: string }) => {});
    const view = render(Host, { mode: 'edit', upload, cancelUpload });
    await waitFor(() => expect(saveButton(view.container).disabled).toBe(false));
    expect(view.getByText('/existing.pdf')).toBeTruthy();

    await selectFiles(view.container, 'attachment', [new File(['new'], 'new.pdf')]);
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    expect(saveButton(view.container).disabled).toBe(true);

    view.component.reset();
    await waitFor(() => expect(cancelUpload).toHaveBeenCalledTimes(1));
    expect(cancelUpload.mock.calls[0]?.[1]).toMatchObject({
      uploadId: 'upload-reset',
      reason: 'unmount',
    });
    await waitFor(() => expect(saveButton(view.container).disabled).toBe(false));
    expect(view.queryByText('new.pdf')).toBeNull();
    expect(view.getByText('/existing.pdf')).toBeTruthy();

    await act(async () => { resolveUpload?.({ url: '/uploads/stale.pdf' }); });
    expect(view.queryByText('success')).toBeNull();
    await fireEvent.click(saveButton(view.container));
    await waitFor(() => expect(view.component.writeCount()).toBe(1));
    expect(view.component.writeVariables(0)).toEqual({
      attachment: '/existing.pdf',
      attachments: ['/existing-a.pdf'],
    });
  });

  it('isolates an old upload when the record scope changes with the same callback identity', async () => {
    let resolveUpload: ((value: { url: string }) => void) | undefined;
    const upload = vi.fn((_file: File, session: { setUploadId: (id: string) => void }) => {
      session.setUploadId('upload-record-1');
      return new Promise<{ url: string }>((resolve) => { resolveUpload = resolve; });
    });
    const cancelUpload = vi.fn(async (_file: File, _cancellation: { uploadId: string; reason: string }) => {});
    const view = render(Host, { mode: 'edit', upload, cancelUpload });
    await waitFor(() => expect(saveButton(view.container).disabled).toBe(false));

    await selectFiles(view.container, 'attachment', [new File(['new'], 'new.pdf')]);
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    await view.rerender({ mode: 'edit', upload, cancelUpload, recordId: 'record-2' });

    await waitFor(() => expect(cancelUpload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(saveButton(view.container).disabled).toBe(false));
    expect(view.queryByText('new.pdf')).toBeNull();

    await act(async () => { resolveUpload?.({ url: '/uploads/record-1.pdf' }); });
    expect(view.queryByText('success')).toBeNull();

    await fireEvent.click(saveButton(view.container));
    await waitFor(() => expect(view.component.writeCount()).toBe(1));
    expect(view.component.writeVariables(0)).toEqual({
      attachment: '/existing.pdf',
      attachments: ['/existing-a.pdf'],
    });
  });

  it('disables default file selection without upload and never sends a File snapshot', async () => {
    const view = render(Host, { mode: 'edit' });
    await waitFor(() => expect(saveButton(view.container).disabled).toBe(false));
    expect(view.getByText('/existing.pdf')).toBeTruthy();
    const attachmentField = requireValue(view.container.querySelector<HTMLElement>('[data-svadmin-field-key="attachment"]'));
    expect(within(attachmentField).getByText('Operation failed')).toBeTruthy();
    const input = fileInput(view.container, 'attachment');
    expect(input.disabled).toBe(true);

    await fireEvent.click(saveButton(view.container));
    await waitFor(() => expect(view.component.writeCount()).toBe(1));
    expect(view.component.writeVariables(0)).toEqual({
      attachment: '/existing.pdf',
      attachments: ['/existing-a.pdf'],
    });
  });

  it('shows editable baselines and preserves them while new uploads settle', async () => {
    let rejectUpload: ((reason?: unknown) => void) | undefined;
    const upload = vi.fn(() => new Promise<{ url: string }>((_resolve, reject) => {
      rejectUpload = reject;
    }));
    const view = render(Host, { mode: 'edit', upload });
    await waitFor(() => expect(saveButton(view.container).disabled).toBe(false));
    expect(view.getByText('/existing.pdf')).toBeTruthy();
    expect(view.getByText('/existing-a.pdf')).toBeTruthy();

    await selectFiles(view.container, 'attachments', [new File(['new'], 'new.pdf')]);
    await waitFor(() => expect(saveButton(view.container).disabled).toBe(true));
    // 上传中/失败不能悄悄丢掉编辑基线。
    expect(view.getByText('/existing-a.pdf')).toBeTruthy();
    await act(async () => { rejectUpload?.(new Error('network down')); });
    await waitFor(() => expect(view.getByText('Upload failed.')).toBeTruthy());
    expect(view.getByText('/existing-a.pdf')).toBeTruthy();

    const failedRow = requireValue(view.getByText('new.pdf').closest('li'));
    await fireEvent.click(within(failedRow).getByRole('button', { name: 'Remove file' }));
    await fireEvent.click(view.getByRole('button', { name: 'Remove /existing-a.pdf' }));
    await waitFor(() => expect(saveButton(view.container).disabled).toBe(false));
    await fireEvent.click(saveButton(view.container));

    await waitFor(() => expect(view.component.writeCount()).toBe(1));
    expect(view.component.writeVariables(0)).toEqual({
      attachment: '/existing.pdf',
      attachments: [],
    });
  });

  it('reports pending uploads through formActions isLoading and blocks unresolved submits', async () => {
    let resolveUpload: ((value: { url: string }) => void) | undefined;
    const upload = vi.fn(() => new Promise<{ url: string }>((resolve) => { resolveUpload = resolve; }));
    const view = render(Host, { upload, customActions: true });
    await waitFor(() => expect(view.getByTestId('form-actions-loading').textContent).toBe('idle'));

    await selectFiles(view.container, 'attachment', [new File(['report'], 'report.pdf')]);
    await waitFor(() => expect(view.getByTestId('form-actions-loading').textContent).toBe('loading'));
    await fireEvent.click(view.getByRole('button', { name: 'Custom save' }));
    expect(view.component.writeCount()).toBe(0);

    await act(async () => { resolveUpload?.({ url: '/uploads/report.pdf' }); });
    await waitFor(() => expect(view.getByTestId('form-actions-loading').textContent).toBe('idle'));
    await fireEvent.click(view.getByRole('button', { name: 'Custom save' }));
    await waitFor(() => expect(view.component.writeCount()).toBe(1));
    expect(view.component.writeVariables(0)).toEqual({
      attachment: { url: '/uploads/report.pdf' },
    });
  });
});
