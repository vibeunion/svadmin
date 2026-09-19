import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileUpload, { type UploadItem } from './FileUpload.svelte';

afterEach(cleanup);

describe('FileUpload reentrant host callbacks', () => {
  it.each(['queued', 'uploading'] as const)('does not dispatch after unmount from the %s notification', async phase => {
    const lifecycle: { teardown?: () => void } = {};
    const upload = vi.fn(async () => undefined);
    const onChange = vi.fn((items: UploadItem[]) => {
      if (items[0]?.status === phase) lifecycle.teardown?.();
    });
    const view = render(FileUpload, { upload, onChange });
    lifecycle.teardown = () => { view.unmount(); };
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected a native file input');
    await fireEvent.change(input, { target: { files: [new File(['draft'], 'draft.txt', { type: 'text/plain' })] } });
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ status: phase })]);
    expect(upload).not.toHaveBeenCalled();
    expect(view.container.querySelector('input[type="file"]')).toBeNull();
  });
});

describe('FileUpload reentrant multi-file batches', () => {
  it.each(['queued', 'uploading'] as const)('stops the batch after unmount from %s', async phase => {
    const lifecycle: { teardown?: () => void } = {};
    const upload = vi.fn(async () => undefined);
    const onChange = vi.fn((items: UploadItem[]) => {
      if (items[0]?.status === phase) lifecycle.teardown?.();
    });
    const view = render(FileUpload, { upload, onChange, multiple: true });
    lifecycle.teardown = () => { view.unmount(); };
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected a native file input');
    await fireEvent.change(input, { target: { files: [
      new File(['first'], 'first.txt', { type: 'text/plain' }),
      new File(['second'], 'second.txt', { type: 'text/plain' }),
    ] } });
    expect(onChange).toHaveBeenCalledTimes(phase === 'queued' ? 1 : 2);
    expect(upload).not.toHaveBeenCalled();
    expect(view.container.querySelector('input[type="file"]')).toBeNull();
  });

  it('stops rejected-file callbacks after the host unmounts', async () => {
    const lifecycle: { teardown?: () => void } = {};
    const upload = vi.fn(async () => undefined);
    const onReject = vi.fn(() => lifecycle.teardown?.());
    const view = render(FileUpload, { upload, onReject, multiple: true, accept: '.csv' });
    lifecycle.teardown = () => { view.unmount(); };
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected a native file input');
    await fireEvent.change(input, { target: { files: [
      new File(['first'], 'first.txt', { type: 'text/plain' }),
      new File(['second'], 'second.txt', { type: 'text/plain' }),
    ] } });
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(upload).not.toHaveBeenCalled();
    expect(view.container.querySelector('input[type="file"]')).toBeNull();
  });
});
