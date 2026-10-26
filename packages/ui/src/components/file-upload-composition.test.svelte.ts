import { act, fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FieldRenderer from './FieldRenderer.svelte';
import Host from '../../test/fixtures/AutoFormUploadHarness.svelte';
import ArrayHost from '../../test/fixtures/FileUploadArrayHarness.svelte';
import { requireValue } from '../../../../scripts/test-assertions';
import type { UploadCancelHandler, UploadHandler, UploadSession } from './file-upload-types.js';
import { exactRoleName } from '../../test/accessible-name';

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

async function select(input: HTMLInputElement, name: string) {
  const transfer = new DataTransfer();
  transfer.items.add(new File(['content'], name));
  input.files = transfer.files;
  await fireEvent.change(input);
}

function deferred() {
  let resolve!: (value: { url: string }) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<{ url: string }>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('file upload composition boundaries', () => {
  it('aggregates array queues across completion, row removal and retry', async () => {
    const first = deferred();
    const second = deferred();
    const retry = deferred();
    const upload = vi.fn<UploadHandler>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockImplementationOnce(() => retry.promise);
    const onState = vi.fn();
    const view = render(ArrayHost, { upload, onState });
    const inputs = view.container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    await select(requireValue(inputs[0]), 'first.txt');
    await select(requireValue(inputs[1]), 'second.txt');
    await act(async () => { first.resolve({ url: '/first' }); });
    expect(onState).toHaveBeenLastCalledWith({ busy: true, unresolved: false });

    await fireEvent.click(requireValue(view.getAllByRole('button', { name: exactRoleName('Remove') })[0]));
    expect(onState).toHaveBeenLastCalledWith({ busy: true, unresolved: false });
    await act(async () => { second.reject(new Error('failed')); });
    await waitFor(() => expect(onState).toHaveBeenLastCalledWith({ busy: false, unresolved: true }));
    await fireEvent.click(view.getByRole('button', { name: 'Retry upload' }));
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(3));
    expect(onState).toHaveBeenLastCalledWith({ busy: true, unresolved: false });
    await act(async () => { retry.resolve({ url: '/retried' }); });
    await waitFor(() => expect(onState).toHaveBeenLastCalledWith({ busy: false, unresolved: false }));
  });

  it('requires confirmation for a pending upload even when the edit draft is unchanged', async () => {
    const pending = deferred();
    let guard: ((navigate: () => void) => void) | undefined;
    const view = render(Host, {
      mode: 'edit',
      upload: () => pending.promise,
      onNavigationGuardReady: next => { guard = next; },
    });
    await view.findByText('/existing.pdf');
    await select(requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]')), 'draft.txt');
    const navigate = vi.fn();
    await act(() => requireValue(guard)(navigate));
    await waitFor(() => expect(view.getByRole('alertdialog')).toBeTruthy());
    expect(navigate).not.toHaveBeenCalled();
    await act(() => view.component.reset());
    await waitFor(() => expect(view.queryByRole('alertdialog')).toBeNull());
    await act(async () => { pending.resolve({ url: '/late' }); });
    expect(navigate).not.toHaveBeenCalled();
    expect(view.queryByText('draft.txt')).toBeNull();
  });

  it.each(['provider', 'upload'] as const)('retires pending uploads when %s identity changes', async change => {
    const pending = deferred();
    let session: UploadSession | undefined;
    const upload: UploadHandler = (_file, value) => {
      session = value;
      value.setUploadId('temporary');
      return pending.promise;
    };
    const cancelUpload = vi.fn<UploadCancelHandler>(async () => {});
    const view = render(Host, { mode: 'edit', upload, cancelUpload });
    await view.findByText('/existing.pdf');
    await select(requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]')), 'old.txt');
    await waitFor(() => expect(session).toBeDefined());
    if (change === 'provider') await view.rerender({ providerVersion: 1 });
    else await view.rerender({ upload: async () => ({ url: '/next' }) });
    await waitFor(() => expect(requireValue(session).signal.aborted).toBe(true));
    await waitFor(() => expect(cancelUpload).toHaveBeenCalledTimes(1));
    await act(async () => { pending.resolve({ url: '/late' }); });
    expect(view.queryByText('old.txt')).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: exactRoleName('Save') }));
    await waitFor(() => expect(view.component.writeCount()).toBe(1));
    expect(view.component.writeVariables(0)).toEqual({
      attachment: '/existing.pdf', attachments: ['/existing-a.pdf'],
    });
  });

  it('uses references when standalone FieldRenderer receives upload', async () => {
    const onchange = vi.fn();
    const view = render(FieldRenderer, {
      field: { key: 'file', label: 'File', type: 'file' },
      value: null, onchange,
      upload: async () => ({ url: '/file', uploadId: 'object-1' }),
    });
    await select(requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]')), 'file.txt');
    await waitFor(() => expect(onchange).toHaveBeenLastCalledWith({ url: '/file', uploadId: 'object-1' }));
  });

  it('blocks success receipts containing only whitespace identifiers', async () => {
    const onchange = vi.fn();
    const onUploadStateChange = vi.fn();
    const view = render(FieldRenderer, {
      field: { key: 'file', label: 'File', type: 'file' },
      value: null, onchange, onUploadStateChange,
      upload: async () => ({ url: '  ' }),
    });
    await select(requireValue(view.container.querySelector<HTMLInputElement>('input[type="file"]')), 'file.txt');
    await waitFor(() => expect(onUploadStateChange).toHaveBeenLastCalledWith({ busy: false, unresolved: true }));
    expect(onchange).not.toHaveBeenCalled();
  });
});
