import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileUpload, { type UploadItem } from './FileUpload.svelte';

afterEach(cleanup);

function file(name: string, type = 'text/plain'): File {
  return new File(['content'], name, { type });
}

describe('FileUpload', () => {
  it('rejects files outside the declared type contract', async () => {
    const onReject = vi.fn();
    const view = render(FileUpload, { accept: 'image/*', onReject });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');

    await fireEvent.change(input, { target: { files: [file('notes.txt')] } });

    expect(onReject).toHaveBeenCalledWith(expect.any(File), 'File type is not accepted.');
    expect(view.container.querySelector('li')).toBeNull();
  });

  it('reports upload progress and exposes the successful result', async () => {
    const onChange = vi.fn();
    const upload = vi.fn(async (_file: File, session: { onProgress: (value: number) => void }) => {
      session.onProgress(45);
      return { url: '/uploads/report.pdf' };
    });
    const view = render(FileUpload, { upload, onChange });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');

    await fireEvent.change(input, { target: { files: [file('report.pdf', 'application/pdf')] } });

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ status: 'success', progress: 100, url: '/uploads/report.pdf' }),
    ]));
  });

  it('accepts void upload receipts without adding an undefined url property', async () => {
    const upload = async (): Promise<void> => {};
    const onChange = vi.fn<(items: UploadItem[]) => void>();
    const view = render(FileUpload, { upload, onChange });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
    await fireEvent.change(input, { target: { files: [file('empty-receipt.txt')] } });
    await waitFor(() => expect(onChange.mock.lastCall?.[0][0]?.status).toBe('success'));
    const item = onChange.mock.lastCall?.[0][0];
    expect(item).not.toHaveProperty('url');
    expect(item).not.toHaveProperty('error');
  });

  it('removes the old error before retrying a failed upload', async () => {
    const upload = vi.fn(async () => ({ url: '/uploads/retried.txt' }));
    upload.mockRejectedValueOnce(new Error('Upload failed'));
    const onChange = vi.fn<(items: UploadItem[]) => void>();
    const view = render(FileUpload, { upload, onChange });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
    await fireEvent.change(input, { target: { files: [file('retry.txt')] } });
    await waitFor(() => expect(onChange.mock.lastCall?.[0][0]?.status).toBe('error'));
    await fireEvent.click(view.getByRole('button', { name: 'Retry upload' }));
    await waitFor(() => expect(onChange.mock.lastCall?.[0][0]?.status).toBe('success'));
    const records = onChange.mock.calls.flatMap(([items]) => items);
    expect(records.filter(item => item.status === 'uploading').every(item => !Object.hasOwn(item, 'error'))).toBe(true);
    expect(onChange.mock.lastCall?.[0][0]).not.toHaveProperty('error');
  });

});
