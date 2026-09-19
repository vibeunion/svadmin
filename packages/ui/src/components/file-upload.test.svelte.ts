import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileUpload, { type UploadSession } from './FileUpload.svelte';

afterEach(cleanup);

function file(name: string, type = 'text/plain'): File {
  return new File(['content'], name, { type });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
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

  it('does not turn an ignored abort into success', async () => {
    const pending = deferred<{ url: string }>();
    const onChange = vi.fn();
    const upload = vi.fn(async () => pending.promise);
    const view = render(FileUpload, { upload, onChange });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');

    await fireEvent.change(input, { target: { files: [file('slow.txt')] } });
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    await fireEvent.click(view.getByRole('button', { name: 'Cancel upload' }));
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ status: 'cancelled' }),
    ]);
    await act(async () => { pending.resolve({ url: '/uploads/late.txt' }); await pending.promise; });
    await waitFor(() => expect(view.getByText('cancelled')).toBeTruthy());
    expect(onChange).not.toHaveBeenLastCalledWith([
      expect.objectContaining({ status: 'success', url: '/uploads/late.txt' }),
    ]);
  });

  it('ignores a late result from an earlier attempt after retry', async () => {
    const first = deferred<{ url: string }>();
    const second = deferred<{ url: string }>();
    const onChange = vi.fn();
    const upload = vi.fn()
      .mockImplementationOnce(async () => first.promise)
      .mockImplementationOnce(async () => second.promise);
    const view = render(FileUpload, { upload, onChange });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');

    await fireEvent.change(input, { target: { files: [file('retry.txt')] } });
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    await fireEvent.click(view.getByRole('button', { name: 'Cancel upload' }));
    await fireEvent.click(view.getByRole('button', { name: 'Retry upload' }));
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    await act(async () => { first.resolve({ url: '/uploads/stale.txt' }); await first.promise; });
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ status: 'uploading' })]);
    await fireEvent.click(view.getByRole('button', { name: 'Cancel upload' }));
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ status: 'cancelled' })]);
    await act(async () => { second.resolve({ url: '/uploads/current.txt' }); await second.promise; });
    expect(onChange).not.toHaveBeenCalledWith([
      expect.objectContaining({ status: 'success' }),
    ]);
  });

  it.each(['cancel', 'remove', 'replace', 'unmount'] as const)(
    'retires progress and rejection callbacks after %s', async (action) => {
      const pending = deferred<{ url: string }>();
      const sessions: UploadSession[] = [];
      const onChange = vi.fn();
      const upload = vi.fn((_file: File, session: UploadSession) => {
        sessions.push(session);
        return pending.promise;
      });
      const view = render(FileUpload, { upload, onChange });
      const input = view.container.querySelector('input[type="file"]');
      if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
      await fireEvent.change(input, { target: { files: [file('old.txt')] } });
      const session = sessions[0];
      if (!session) throw new Error('Missing upload session');
      if (action === 'cancel') await fireEvent.click(view.getByRole('button', { name: 'Cancel upload' }));
      if (action === 'remove') await fireEvent.click(view.getByRole('button', { name: 'Remove file' }));
      if (action === 'replace') {
        upload.mockResolvedValue({ url: '/uploads/new.txt' });
        await fireEvent.change(input, { target: { files: [file('new.txt')] } });
        await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([
          expect.objectContaining({ status: 'success', url: '/uploads/new.txt' }),
        ]));
      }
      if (action === 'unmount') view.unmount();
      expect(session.signal.aborted).toBe(true);
      const count = onChange.mock.calls.length;
      await act(async () => {
        session.onProgress(99);
        pending.reject(new Error('Late upload error'));
        await pending.promise.catch(() => {});
      });
      expect(onChange).toHaveBeenCalledTimes(count);
    },
  );

  it('ignores stale errors and progress after the retry succeeds', async () => {
    const pending = deferred<{ url: string }>();
    const sessions: UploadSession[] = [];
    const onChange = vi.fn();
    const upload = vi.fn((_file: File, session: UploadSession) => {
      sessions.push(session);
      return sessions.length === 1 ? pending.promise : Promise.resolve({ url: '/uploads/current.txt' });
    });
    const view = render(FileUpload, { upload, onChange });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
    await fireEvent.change(input, { target: { files: [file('retry.txt')] } });
    await fireEvent.click(view.getByRole('button', { name: 'Cancel upload' }));
    await fireEvent.click(view.getByRole('button', { name: 'Retry upload' }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ status: 'success', url: '/uploads/current.txt' }),
    ]));
    const count = onChange.mock.calls.length;
    await act(async () => {
      for (const session of sessions) session.onProgress(12);
      pending.reject(new Error('Obsolete failure'));
      await pending.promise.catch(() => {});
    });
    expect(onChange).toHaveBeenCalledTimes(count);
  });
});
