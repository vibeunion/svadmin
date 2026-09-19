import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileUpload from './FileUpload.svelte';

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
});
