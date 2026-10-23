import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileUpload, { type UploadItem, type UploadSession } from './FileUpload.svelte';
import I18nHost from './file-upload-i18n.test-host.svelte';

import { requireValue } from '../../../../scripts/test-assertions';
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
  it('translates queued files and action names without changing native files or notifying again', async () => {
    const onChange = vi.fn();
    const view = render(I18nHost, { settings: { name: 'attachment', onChange } });
    const input = requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]'));
    const selected = file('report.txt');
    await fireEvent.change(input, { target: { files: [selected] } });
    expect(view.getByRole('list', { name: 'Selected files' })).toBeTruthy();
    const calls = onChange.mock.calls.length;
    await view.component.setLocale('zh-CN');
    expect(view.getByRole('list', { name: '已选文件' })).toBeTruthy();
    expect(view.getByText('待上传')).toBeTruthy();
    expect(view.getByRole('button', { name: '移除文件' }).getAttribute('title')).toBe('移除文件');
    expect(input.files?.[0]).toBe(selected);
    expect(onChange).toHaveBeenCalledTimes(calls);
    await view.component.setLocale('en');
    expect(view.getByRole('button', { name: 'Remove file' })).toBeTruthy();
    expect(onChange).toHaveBeenCalledTimes(calls);
  });

  it.each([
    { settings: { accept: '.csv' }, reason: 'File type is not accepted.', translated: '不支持此文件类型。' },
    { settings: { maxSize: 1 }, reason: 'File is too large.', translated: '文件过大。' },
    { settings: { multiple: true, maxFiles: 1 }, reason: 'Maximum file count exceeded.', translated: '超出文件数量限制。' },
  ])('translates $reason while preserving the rejection callback contract', async ({ settings, reason, translated }) => {
    const onReject = vi.fn();
    const view = render(I18nHost, { settings: { ...settings, onReject } });
    const input = requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]'));
    if ('multiple' in settings) await fireEvent.change(input, { target: { files: [file('first.txt')] } });
    const rejected = file('rejected.txt');
    await fireEvent.change(input, { target: { files: [rejected] } });
    expect(view.getByText(`rejected.txt: ${reason}`)).toBeTruthy();
    await view.component.setLocale('zh-CN');
    expect(view.getByRole('list', { name: '被拒绝的文件' }).textContent).toContain(translated);
    expect(onReject).toHaveBeenCalledExactlyOnceWith(rejected, reason);
    await view.component.setLocale('en');
    expect(view.getByText(`rejected.txt: ${reason}`)).toBeTruthy();
    expect(onReject).toHaveBeenCalledOnce();
  });

  it.each([new Error('PRIVATE_SIGNED_URL'), new Error(''), 'PRIVATE_FAILURE'])(
    'shows localized generic failure and can retry without displaying raw errors: %s', async cause => {
      const upload = vi.fn().mockRejectedValueOnce(cause).mockResolvedValue({ url: '/uploads/report.txt' });
      const onChange = vi.fn();
      const view = render(I18nHost, { settings: { upload, onChange } });
      const input = requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]'));
      await fireEvent.change(input, { target: { files: [file('report.txt')] } });
      expect((await view.findByRole('alert')).textContent).toBe('Upload failed.');
      expect(view.container.textContent).not.toContain('PRIVATE');
      expect(view.container.innerHTML).not.toContain('PRIVATE');
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({
          status: 'error',
          error: cause instanceof Error ? cause.message : 'Upload failed.',
        }),
      ]);
      const calls = onChange.mock.calls.length;
      await view.component.setLocale('zh-CN');
      expect(view.getByRole('alert').textContent).toBe('上传失败，请重试。');
      expect(view.getByText('上传失败')).toBeTruthy();
      expect(view.container.innerHTML).not.toContain('PRIVATE');
      expect(onChange).toHaveBeenCalledTimes(calls);
      expect(upload).toHaveBeenCalledOnce();
      await fireEvent.click(view.getByRole('button', { name: '重试上传' }));
      await view.findByText('上传成功');
      expect(view.queryByRole('alert')).toBeNull();
      expect(upload).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ status: 'success' })]);
    },
  );

  it('translates an active cancellation and preserves the cancelled machine state', async () => {
    const pending = deferred<undefined>();
    const onChange = vi.fn();
    const view = render(I18nHost, { settings: { upload: () => pending.promise, onChange } });
    const input = requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]'));
    await fireEvent.change(input, { target: { files: [file('report.txt')] } });
    await view.component.setLocale('zh-CN');
    await fireEvent.click(view.getByRole('button', { name: '取消上传' }));
    expect(view.getByText('已取消')).toBeTruthy();
    expect(view.getByRole('alert').textContent).toBe('上传已取消。');
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ status: 'cancelled', error: 'Upload cancelled.' })]);
    await act(async () => { pending.resolve(undefined); await pending.promise; });
    expect(view.getByText('已取消')).toBeTruthy();
    await view.component.setLocale('en');
    expect(view.getByText('cancelled')).toBeTruthy();
    expect(view.getByRole('alert').textContent).toBe('Upload cancelled.');
  });

  it('keeps the native name only when no async upload handler is provided', () => {
    const withUpload = render(FileUpload, {
      name: 'attachment',
      required: true,
      upload: vi.fn(async () => undefined),
    });
    const asyncInput = withUpload.container.querySelector('input[type="file"]');
    if (!(asyncInput instanceof HTMLInputElement)) throw new Error('Expected file input');
    expect(asyncInput.name).toBe('');
    expect(asyncInput.required).toBe(false);
    withUpload.unmount();

    const native = render(FileUpload, { name: 'attachment', required: true });
    const nativeInput = native.container.querySelector('input[type="file"]');
    if (!(nativeInput instanceof HTMLInputElement)) throw new Error('Expected file input');
    expect(nativeInput.name).toBe('attachment');
    expect(nativeInput.required).toBe(true);
  });

  it('allows a new file to replace the existing file in single mode', async () => {
    const onReject = vi.fn();
    const upload = vi.fn(async (selected: File) => ({ url: `/uploads/${selected.name}` }));
    const view = render(FileUpload, { name: 'attachment', upload, onReject });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');

    await fireEvent.change(input, { target: { files: [file('first.txt')] } });
    await waitFor(() => expect(view.getByText('success')).toBeTruthy());
    await fireEvent.change(input, { target: { files: [file('second.txt')] } });

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    expect(onReject).not.toHaveBeenCalled();
    expect(view.getByText('second.txt')).toBeTruthy();
    expect(view.queryByText('first.txt')).toBeNull();
  });

  it('reports every file beyond the multi-file limit', async () => {
    const onReject = vi.fn();
    const view = render(FileUpload, { multiple: true, maxFiles: 2, onReject });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');

    await fireEvent.change(input, {
      target: { files: [file('one.txt'), file('two.txt'), file('three.txt'), file('four.txt')] },
    });

    expect(onReject).toHaveBeenCalledTimes(2);
    expect(onReject).toHaveBeenNthCalledWith(1, expect.any(File), 'Maximum file count exceeded.');
    expect(onReject).toHaveBeenNthCalledWith(2, expect.any(File), 'Maximum file count exceeded.');
    expect(view.getByRole('status').textContent).toContain('2/2');
    expect(view.container.textContent).toContain('three.txt: Maximum file count exceeded.');
    expect(view.container.textContent).toContain('four.txt: Maximum file count exceeded.');
  });

  it.each([0, -1, 1.5, NaN, Infinity])('falls back to a safe file count for %s', async (maxFiles) => {
    const onReject = vi.fn();
    const view = render(FileUpload, { multiple: true, maxFiles, onReject });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');

    await fireEvent.change(input, {
      target: { files: Array.from({ length: 11 }, (_, index) => file(`${index}.txt`)) },
    });

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(view.getByRole('status').textContent).toContain('10/10');
  });

  it.each(['resolve', 'reject'] as const)('cancels the old upload scope and ignores late %s', async (outcome) => {
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

    await fireEvent.change(input, { target: { files: [file('scoped.txt')] } });
    await waitFor(() => expect(sessions).toHaveLength(1));
    expect(view.getByText('0%')).toBeTruthy();

    const nextUpload = vi.fn(async () => ({ url: '/uploads/new-scope.txt' }));
    await view.rerender({ upload: nextUpload, onChange });

    expect(sessions[0]?.signal.aborted).toBe(true);
    expect(view.getByText('cancelled')).toBeTruthy();
    const count = onChange.mock.calls.length;
    await act(async () => {
      sessions[0]?.onProgress(99);
      if (outcome === 'resolve') pending.resolve({ url: '/uploads/stale.txt' });
      else pending.reject(new Error('Stale failure'));
      await pending.promise.catch(() => {});
    });
    expect(onChange).toHaveBeenCalledTimes(count);
    expect(view.queryByText('/uploads/stale.txt')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Retry upload' }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ status: 'success', url: '/uploads/new-scope.txt' }),
    ]));
    expect(nextUpload).toHaveBeenCalledTimes(1);
  });

  it('reports all extra single-mode files even with a larger maxFiles and duplicate names', async () => {
    const onReject = vi.fn();
    const view = render(FileUpload, { maxFiles: 5, onReject });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
    await fireEvent.change(input, {
      target: { files: [file('selected.txt'), file('duplicate.txt'), file('duplicate.txt')] },
    });
    expect(onReject).toHaveBeenCalledTimes(2);
    expect(view.getAllByText('duplicate.txt: Maximum file count exceeded.')).toHaveLength(2);
    expect(view.getByRole('status').textContent).toContain('1/1');
  });

  it('clears the async native input after selection so the same file can be selected again', async () => {
    const upload = vi.fn(async () => undefined);
    const view = render(FileUpload, { upload });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
    let nativeValue = 'C:\\fakepath\\repeat.txt';
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => nativeValue,
      set: (value: string) => { nativeValue = value; },
    });
    const selected = file('repeat.txt');
    await fireEvent.change(input, { target: { files: [selected] } });
    expect(nativeValue).toBe('');
    await fireEvent.change(input, { target: { files: [selected] } });
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('allows selecting the same filename again after removal', async () => {
    const view = render(FileUpload);
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
    const selected = file('repeat.txt');

    await fireEvent.change(input, { target: { files: [selected] } });
    await fireEvent.click(view.getByRole('button', { name: 'Remove file' }));
    expect(input.value).toBe('');
    await fireEvent.change(input, { target: { files: [selected] } });
    expect(view.getByText('repeat.txt')).toBeTruthy();
  });

  it('rejects files outside the declared type contract', async () => {
    const onReject = vi.fn();
    const view = render(FileUpload, { accept: 'image/*', onReject });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');

    await fireEvent.change(input, { target: { files: [file('notes.txt')] } });

    expect(onReject).toHaveBeenCalledWith(expect.any(File), 'File type is not accepted.');
    expect(view.container.querySelector('.svadmin-file-upload-list')).toBeNull();
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

  it('passes an idempotent upload session to server cleanup on cancellation', async () => {
    const pending = deferred<{ url: string }>();
    const cancelUpload = vi.fn(async () => {});
    const sessions: UploadSession[] = [];
    const upload = vi.fn((_file: File, session: UploadSession) => {
      sessions.push(session);
      session.setUploadId('object-123');
      return pending.promise;
    });
    const onChange = vi.fn();
    const view = render(FileUpload, { upload, cancelUpload, onChange });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
    await fireEvent.change(input, { target: { files: [file('cleanup.txt')] } });
    await waitFor(() => expect(sessions).toHaveLength(1));
    await fireEvent.click(view.getByRole('button', { name: 'Cancel upload' }));
    expect(sessions[0]?.signal.aborted).toBe(true);
    expect(cancelUpload).toHaveBeenCalledWith(expect.any(File), {
      uploadId: 'object-123',
      idempotencyKey: sessions[0]?.idempotencyKey,
      reason: 'cancel',
    });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ status: 'cancelled', cleanupStatus: 'success', uploadId: 'object-123' }),
    ]));
    pending.resolve({ url: '/uploads/late.txt' });
    await pending.promise;
  });

  it('exposes failed cleanup without changing cancelled upload state', async () => {
    const pending = deferred<{ url: string }>();
    const cancelUpload = vi.fn(async () => { throw new Error('cleanup failed'); });
    const upload = vi.fn((_file: File, session: UploadSession) => {
      session.setUploadId('object-failed');
      return pending.promise;
    });
    const view = render(FileUpload, { upload, cancelUpload });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
    await fireEvent.change(input, { target: { files: [file('failed-cleanup.txt')] } });
    await fireEvent.click(view.getByRole('button', { name: 'Cancel upload' }));
    await waitFor(() => expect(view.getByText('Cleanup failed')).toBeTruthy());
    expect(view.getByText('cancelled')).toBeTruthy();
    pending.resolve({ url: '/uploads/late.txt' });
    await pending.promise;
  });

  it('cleans a late registered session after cancellation exactly once', async () => {
    const pending = deferred<{ uploadId: string }>();
    let session: UploadSession | undefined;
    const cancelUpload = vi.fn(async () => {});
    const view = render(FileUpload, {
      upload: (_file, current) => { session = current; return pending.promise; },
      cancelUpload,
    });
    const input =requireValue( view.container.querySelector('input'));
    await fireEvent.change(input, { target: { files: [file('late.txt')] } });
    await fireEvent.click(view.getByRole('button', { name: 'Cancel upload' }));
    expect(cancelUpload).not.toHaveBeenCalled();
    await act(async () => {
      session?.setUploadId('late-object');
      pending.resolve({ uploadId: 'late-object' });
      await pending.promise;
    });
    expect(cancelUpload).toHaveBeenCalledTimes(1);
    expect(cancelUpload).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({
      uploadId: 'late-object', reason: 'cancel',
    }));
    expect(view.getByText('cancelled')).toBeTruthy();
  });

  it('isolates delayed cleanup from a new retry with a distinct idempotency key', async () => {
    const cleanupResult = deferred<undefined>();
    const sessions: UploadSession[] = [];
    const pending = deferred<undefined>();
    const onChange = vi.fn();
    const view = render(FileUpload, {
      upload: (_file, session) => {
        sessions.push(session);
        session.setUploadId(`object-${sessions.length}`);
        return pending.promise;
      },
      cancelUpload: () => cleanupResult.promise, onChange,
    });
    await fireEvent.change(requireValue(view.container.querySelector('input')), { target: { files: [file('retry.txt')] } });
    await fireEvent.click(view.getByRole('button', { name: 'Cancel upload' }));
    await fireEvent.click(view.getByRole('button', { name: 'Retry upload' }));
    expect(sessions[0]?.idempotencyKey).not.toBe(sessions[1]?.idempotencyKey);
    const calls = onChange.mock.calls.length;
    await act(async () => { cleanupResult.resolve(undefined); await cleanupResult.promise; });
    expect(onChange).toHaveBeenCalledTimes(calls);
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({
      status: 'uploading', uploadId: 'object-2',
    })]);
    expect(onChange.mock.lastCall?.[0][0]).not.toHaveProperty('cleanupStatus');
    await act(async () => { pending.resolve(undefined); await pending.promise; });
  });

  it('uses the captured cleanup provider on scope change and contains synchronous errors', async () => {
    const pending = deferred<undefined>();
    const oldCleanup = vi.fn(() => { throw new Error('private server detail'); });
    const nextCleanup = vi.fn(async () => {});
    const onChange = vi.fn();
    const view = render(FileUpload, {
      upload: (_file, session) => { session.setUploadId('old-object'); return pending.promise; },
      cancelUpload: oldCleanup, onChange,
    });
    await fireEvent.change(requireValue(view.container.querySelector('input')), { target: { files: [file('old.txt')] } });
    await view.rerender({ upload: async () => {}, cancelUpload: nextCleanup, onChange });
    await waitFor(() => expect(oldCleanup).toHaveBeenCalledTimes(1));
    expect(nextCleanup).not.toHaveBeenCalled();
    expect(view.queryByText('private server detail')).toBeNull();
    await act(async () => { pending.resolve(undefined); await pending.promise; });
  });

  it('starts cleanup on unmount without publishing changes after destruction', async () => {
    const pending = deferred<undefined>();
    const cleanupResult = deferred<undefined>();
    const cancelUpload = vi.fn(() => cleanupResult.promise);
    const onChange = vi.fn();
    const view = render(FileUpload, {
      upload: (_file, session) => { session.setUploadId('temporary'); return pending.promise; },
      cancelUpload, onChange,
    });
    await fireEvent.change(requireValue(view.container.querySelector('input')), { target: { files: [file('unmount.txt')] } });
    const calls = onChange.mock.calls.length;
    view.unmount();
    await act(async () => {
      cleanupResult.reject(new Error('private'));
      await cleanupResult.promise.catch(() => {});
      pending.resolve(undefined);
      await pending.promise;
    });
    expect(cancelUpload).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ reason: 'unmount' }));
    expect(onChange).toHaveBeenCalledTimes(calls);
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
  it('cleans a failed attempt session on removal with its captured callback', async () => {
    const sessions: UploadSession[] = [];
    const cancelUpload = vi.fn(async () => {});
    const view = render(FileUpload, {
      upload: (_file, session) => {
        sessions.push(session);
        session.setUploadId('failed-object');
        throw new Error('boom');
      },
      cancelUpload,
    });
    await fireEvent.change(requireValue(view.container.querySelector('input')), { target: { files: [file('failed.txt')] } });
    await waitFor(() => expect(view.getByText('error')).toBeTruthy());
    expect(cancelUpload).not.toHaveBeenCalled();
    await fireEvent.click(view.getByRole('button', { name: 'Remove file' }));
    expect(cancelUpload).toHaveBeenCalledTimes(1);
    expect(cancelUpload).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({
      uploadId: 'failed-object',
      idempotencyKey: sessions[0]?.idempotencyKey,
      reason: 'remove',
    }));
  });

  it('cleans a failed attempt session when a new file replaces it in single mode', async () => {
    const cancelUpload = vi.fn(async () => {});
    const upload = vi.fn()
      .mockImplementationOnce(async (_file: File, session: UploadSession) => {
        session.setUploadId('replaced-object');
        throw new Error('boom');
      })
      .mockResolvedValue({ url: '/uploads/new.txt' });
    const onChange = vi.fn();
    const view = render(FileUpload, { upload, cancelUpload, onChange });
    const input = requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]'));
    await fireEvent.change(input, { target: { files: [file('old.txt')] } });
    await waitFor(() => expect(view.getByText('error')).toBeTruthy());
    await fireEvent.change(input, { target: { files: [file('new.txt')] } });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ status: 'success', url: '/uploads/new.txt' }),
    ]));
    expect(cancelUpload).toHaveBeenCalledTimes(1);
    expect(cancelUpload).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({
      uploadId: 'replaced-object', reason: 'replace',
    }));
  });

  it.each(['unmount', 'scope-change'] as const)('cleans a failed attempt session on %s', async (action) => {
    const oldCleanup = vi.fn(async () => {});
    const nextCleanup = vi.fn(async () => {});
    const onChange = vi.fn();
    const view = render(FileUpload, {
      upload: async (_file: File, session: UploadSession) => {
        session.setUploadId('temporary-object');
        throw new Error('boom');
      },
      cancelUpload: oldCleanup,
      onChange,
    });
    await fireEvent.change(requireValue(view.container.querySelector('input')), { target: { files: [file('failed.txt')] } });
    await waitFor(() => expect(view.getByText('error')).toBeTruthy());
    const calls = onChange.mock.calls.length;
    if (action === 'scope-change') {
      // 作用域替换后必须使用旧尝试捕获的回调，而不是新作用域的 cancelUpload。
      await view.rerender({ upload: async () => ({}), cancelUpload: nextCleanup, onChange });
    } else {
      view.unmount();
    }
    await waitFor(() => expect(oldCleanup).toHaveBeenCalledTimes(1));
    expect(oldCleanup).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({
      uploadId: 'temporary-object',
      reason: action === 'unmount' ? 'unmount' : 'scope-change',
    }));
    expect(nextCleanup).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(calls);
  });

  it('cleans the failed attempt exactly once before retrying with a new key', async () => {
    const cleanupResult = deferred<undefined>();
    const sessions: UploadSession[] = [];
    const pending = deferred<{ url: string }>();
    const cancelUpload = vi.fn(() => cleanupResult.promise);
    const onChange = vi.fn();
    const view = render(FileUpload, {
      upload: (_file, session): Promise<{ url: string } | undefined> => {
        sessions.push(session);
        if (sessions.length === 1) {
          session.setUploadId('failed-object');
          return Promise.reject(new Error('boom'));
        }
        session.setUploadId('retry-object');
        return pending.promise;
      },
      cancelUpload,
      onChange,
    });
    await fireEvent.change(requireValue(view.container.querySelector('input')), { target: { files: [file('retry.txt')] } });
    await waitFor(() => expect(view.getByText('error')).toBeTruthy());
    await fireEvent.click(view.getByRole('button', { name: 'Retry upload' }));
    expect(cancelUpload).toHaveBeenCalledTimes(1);
    expect(cancelUpload).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({
      uploadId: 'failed-object', reason: 'replace',
    }));
    expect(sessions[0]?.idempotencyKey).not.toBe(sessions[1]?.idempotencyKey);
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ status: 'uploading', uploadId: 'retry-object' }),
    ]));
    const calls = onChange.mock.calls.length;
    await act(async () => { cleanupResult.resolve(undefined); await cleanupResult.promise; });
    expect(onChange).toHaveBeenCalledTimes(calls);
    expect(onChange.mock.lastCall?.[0][0]).not.toHaveProperty('cleanupStatus');
    await act(async () => { pending.resolve({ url: '/uploads/retry.txt' }); await pending.promise; });
  });

  it('does not clean the same failed attempt twice', async () => {
    const cleanupResult = deferred<undefined>();
    const cancelUpload = vi.fn(() => cleanupResult.promise);
    const onChange = vi.fn();
    const view = render(FileUpload, {
      upload: async (_file: File, session: UploadSession) => {
        session.setUploadId('once-object');
        throw new Error('boom');
      },
      cancelUpload,
      onChange,
    });
    await fireEvent.change(requireValue(view.container.querySelector('input')), { target: { files: [file('once.txt')] } });
    await waitFor(() => expect(view.getByText('error')).toBeTruthy());
    const nextUpload = vi.fn(async () => ({}));
    await view.rerender({ upload: nextUpload, cancelUpload, onChange });
    expect(cancelUpload).toHaveBeenCalledTimes(1);
    await fireEvent.click(view.getByRole('button', { name: 'Remove file' }));
    expect(cancelUpload).toHaveBeenCalledTimes(1);
    const calls = onChange.mock.calls.length;
    await act(async () => { cleanupResult.resolve(undefined); await cleanupResult.promise; });
    expect(onChange).toHaveBeenCalledTimes(calls);
    expect(nextUpload).not.toHaveBeenCalled();
  });

  it('does not retire a successful attachment when the host unmounts during success notification', async () => {
    const cancelUpload = vi.fn(async () => {});
    const upload = vi.fn(async (_file: File, session: UploadSession) => {
      session.setUploadId('success-unmount-object');
      return { url: '/uploads/success-unmount.txt' };
    });
    const view: { current?: { unmount: () => void; container: HTMLElement } } = {};
    const onChange = vi.fn((next: UploadItem[]) => {
      if (next.some(item => item.status === 'success')) view.current?.unmount();
    });
    view.current = render(FileUpload, { upload, cancelUpload, onChange });
    await fireEvent.change(requireValue(view.current.container.querySelector('input')), {
      target: { files: [file('success-unmount.txt')] },
    });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ status: 'success', uploadId: 'success-unmount-object' }),
    ]);
    expect(cancelUpload).not.toHaveBeenCalled();
  });

  it('keeps a successful attachment out of failed cleanup when the host notification throws', async () => {
    const cancelUpload = vi.fn(async () => {});
    const upload = vi.fn(async (_file: File, session: UploadSession) => {
      session.setUploadId('success-throw-object');
      return { url: '/uploads/success-throw.txt' };
    });
    let thrown = false;
    const onChange = vi.fn((next: UploadItem[]) => {
      if (!thrown && next.some(item => item.status === 'success')) {
        thrown = true;
        throw new Error('host notification failed');
      }
    });
    const view = render(FileUpload, { upload, cancelUpload, onChange });
    await fireEvent.change(requireValue(view.container.querySelector('input')), {
      target: { files: [file('success-throw.txt')] },
    });
    await waitFor(() => expect(view.getByText('success')).toBeTruthy());
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ status: 'success', uploadId: 'success-throw-object' }),
    ]);
    await fireEvent.click(view.getByRole('button', { name: 'Remove file' }));
    expect(cancelUpload).not.toHaveBeenCalled();
  });

  it('never cancels a successful attachment on removal or unmount', async () => {
    const cancelUpload = vi.fn(async () => {});
    const upload = vi.fn(async (_file: File, session: UploadSession) => {
      session.setUploadId('kept-object');
      return { url: '/uploads/kept.txt' };
    });
    const onChange = vi.fn();
    const view = render(FileUpload, { upload, cancelUpload, onChange });
    const input = requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]'));
    await fireEvent.change(input, { target: { files: [file('kept.txt')] } });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ status: 'success', uploadId: 'kept-object' }),
    ]));
    await fireEvent.click(view.getByRole('button', { name: 'Remove file' }));
    expect(cancelUpload).not.toHaveBeenCalled();
    await fireEvent.change(input, { target: { files: [file('kept.txt')] } });
    await waitFor(() => expect(view.getByText('success')).toBeTruthy());
    view.unmount();
    expect(cancelUpload).not.toHaveBeenCalled();
  });
});
