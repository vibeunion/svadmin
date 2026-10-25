import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileList, { type FileItem } from './FileList.svelte';

afterEach(cleanup);

const first: FileItem = { id: 'report', name: 'report.pdf', size: '2 MB', updatedAt: '2026-10-21' };
const second: FileItem = { id: 'sheet', name: 'sheet.csv', type: 'text/csv' };
const actions = ['Preview', 'Download', 'Remove'] as const;

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe('FileList action contract', () => {
  it.each(actions)('locks all actions on a row during %s without locking other rows', async action => {
    const operation = deferred();
    const handler = vi.fn(() => operation.promise);
    const view = render(FileList, {
      files: [first, second], onpreview: handler, ondownload: handler, onremove: handler,
    });
    await fireEvent.click(view.getByRole('button', { name: `${action} report.pdf` }));
    for (const label of actions) {
      expect(view.getByRole('button', { name: `${label} report.pdf` }).hasAttribute('disabled')).toBe(true);
      expect(view.getByRole('button', { name: `${label} sheet.csv` }).hasAttribute('disabled')).toBe(false);
      await fireEvent.click(view.getByRole('button', { name: `${label} report.pdf` }));
    }
    expect(handler).toHaveBeenCalledTimes(1);
    expect(view.getByRole('status').textContent).toContain('Loading');
    await act(async () => { operation.resolve(); await operation.promise; });
    expect(view.getByRole('button', { name: `${action} report.pdf` }).hasAttribute('disabled')).toBe(false);
  });

  it.each(actions)('contains %s failures and allows a deliberate retry without exposing private details', async action => {
    const handler = vi.fn<(file: FileItem) => Promise<void>>()
      .mockRejectedValueOnce(new Error('private signed URL')).mockResolvedValue(undefined);
    const view = render(FileList, {
      files: [first], onpreview: handler, ondownload: handler, onremove: handler,
    });
    await fireEvent.click(view.getByRole('button', { name: `${action} report.pdf` }));
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('Something went wrong'));
    expect(view.getByRole('alert').textContent).toContain(action);
    expect(view.container.textContent).not.toContain('private signed URL');
    expect(handler).toHaveBeenCalledTimes(1);
    await fireEvent.click(view.getByRole('button', { name: `${action} report.pdf` }));
    expect(handler).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(view.queryByRole('alert')).toBeNull());
    expect(view.getByText('report.pdf')).toBeTruthy();
  });

  it('contains synchronous errors and blocks synchronously reentrant actions', async () => {
    const preview: { current?: HTMLElement } = {};
    const onpreview = vi.fn();
    const onremove = vi.fn(() => {
      preview.current?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      throw new Error('private failure');
    });
    const view = render(FileList, { files: [first], onpreview, onremove });
    preview.current = view.getByRole('button', { name: 'Preview report.pdf' });
    await fireEvent.click(view.getByRole('button', { name: 'Remove report.pdf' }));
    expect(onremove).toHaveBeenCalledTimes(1);
    expect(onpreview).not.toHaveBeenCalled();
    expect(view.getByRole('alert').textContent).not.toContain('private failure');
  });

  it('keeps same-row locks independent of another row completing', async () => {
    const a = deferred();
    const b = deferred();
    const ondownload = vi.fn((file: FileItem) => file.id === first.id ? a.promise : b.promise);
    const view = render(FileList, { files: [first, second], ondownload });
    await fireEvent.click(view.getByRole('button', { name: 'Download report.pdf' }));
    await fireEvent.click(view.getByRole('button', { name: 'Download sheet.csv' }));
    await act(async () => { b.resolve(); await b.promise; });
    expect(view.getByRole('button', { name: 'Download report.pdf' }).hasAttribute('disabled')).toBe(true);
    expect(view.getByRole('button', { name: 'Download sheet.csv' }).hasAttribute('disabled')).toBe(false);
    await act(async () => { a.resolve(); await a.promise; });
  });

  it.each(['file', 'handler'] as const)('isolates an obsolete failure after the %s changes', async change => {
    const old = deferred();
    const next = deferred();
    const handler = vi.fn<(file: FileItem) => Promise<void>>()
      .mockImplementationOnce(() => old.promise).mockImplementation(() => next.promise);
    const view = render(FileList, { files: [first], ondownload: handler });
    await fireEvent.click(view.getByRole('button', { name: 'Download report.pdf' }));
    if (change === 'file') await view.rerender({ files: [{ ...first }] });
    else await view.rerender({ ondownload: () => next.promise });
    await fireEvent.click(view.getByRole('button', { name: 'Download report.pdf' }));
    await act(async () => { old.reject(new Error('obsolete')); await old.promise.catch(() => {}); });
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('button', { name: 'Download report.pdf' }).hasAttribute('disabled')).toBe(true);
    await act(async () => { next.resolve(); await next.promise; });
    expect(view.getByRole('button', { name: 'Download report.pdf' }).hasAttribute('disabled')).toBe(false);
  });

  it.each(['remove', 'unmount'] as const)('does not publish a failure after %s', async action => {
    const operation = deferred();
    const view = render(FileList, { files: [first], ondownload: () => operation.promise });
    await fireEvent.click(view.getByRole('button', { name: 'Download report.pdf' }));
    if (action === 'remove') await view.rerender({ files: [] });
    else view.unmount();
    await act(async () => { operation.reject(new Error('late')); await operation.promise.catch(() => {}); });
    expect(view.queryByRole('alert')).toBeNull();
  });

  it.each(['loading', 'error', 'forbidden', 'empty', 'filtered-empty'] as const)('keeps %s authoritative over file actions', state => {
    const view = render(FileList, { files: [first], state, emptyTitle: 'No attachments', onremove: vi.fn() });
    expect(view.container.querySelector(`[data-svadmin-data-state="${state}"]`)).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Remove report.pdf' })).toBeNull();
    if (state === 'error' || state === 'forbidden') expect(view.queryByText('No attachments')).toBeNull();
  });

  it('renders host error recovery and explicit state text', async () => {
    const retry = vi.fn();
    const view = render(FileList, {
      state: 'error', stateTitle: 'Cannot read attachments', stateDescription: 'Try again later',
      retry, retryLabel: 'Reload attachments',
    });
    expect(view.getByRole('alert').textContent).toContain('Cannot read attachments');
    await fireEvent.click(view.getByRole('button', { name: 'Reload attachments' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('does not delete host-owned files or directly create URL links', async () => {
    const item: FileItem & { url: string } = { ...first, url: 'javascript:invalid' };
    const onremove = vi.fn();
    const view = render(FileList, { files: [item], onremove });
    await fireEvent.click(view.getByRole('button', { name: 'Remove report.pdf' }));
    expect(onremove).toHaveBeenCalledWith(item);
    expect(view.getByText('report.pdf')).toBeTruthy();
    expect(view.container.querySelector('a, iframe, img')).toBeNull();
    expect(view.container.innerHTML).not.toContain('javascript:invalid');
  });

  it('distinguishes duplicate names without ids and renders inert rows without handlers', () => {
    const view = render(FileList, { files: [{ name: 'same.txt' }, { name: 'same.txt' }] });
    expect(view.getAllByRole('listitem')).toHaveLength(2);
    expect(view.getAllByText('same.txt')).toHaveLength(2);
    expect(view.queryByRole('button')).toBeNull();
  });

  it('preserves duplicate ids and keeps pending actions and failures local to each row', async () => {
    const duplicate: FileItem = { id: 'report', name: 'other-report.pdf' };
    const a = deferred();
    const b = deferred();
    const ondownload = vi.fn((file: FileItem) => file === first ? a.promise : b.promise);
    const view = render(FileList, { files: [first, duplicate], ondownload });
    expect(view.getAllByRole('listitem')).toHaveLength(2);
    await fireEvent.click(view.getByRole('button', { name: 'Download report.pdf' }));
    expect(view.getByRole('button', { name: 'Download other-report.pdf' }).hasAttribute('disabled')).toBe(false);
    await fireEvent.click(view.getByRole('button', { name: 'Download other-report.pdf' }));
    expect(ondownload).toHaveBeenNthCalledWith(1, first);
    expect(ondownload).toHaveBeenNthCalledWith(2, duplicate);
    await act(async () => { a.reject(new Error('private')); await a.promise.catch(() => {}); });
    expect(within(view.getByRole('listitem', { name: 'report.pdf' })).getByRole('alert')).toBeTruthy();
    expect(within(view.getByRole('listitem', { name: 'other-report.pdf' })).queryByRole('alert')).toBeNull();
    expect(view.getByRole('button', { name: 'Download other-report.pdf' }).hasAttribute('disabled')).toBe(true);
    await act(async () => { b.resolve(); await b.promise; });
    expect(view.getByRole('button', { name: 'Download other-report.pdf' }).hasAttribute('disabled')).toBe(false);
  });

  it('keeps unique-id row instances and pending actions through a reorder', async () => {
    const operation = deferred();
    const view = render(FileList, { files: [first, second], ondownload: () => operation.promise });
    const row = view.getByRole('listitem', { name: 'report.pdf' });
    await fireEvent.click(within(row).getByRole('button'));
    await view.rerender({ files: [second, first] });
    expect(view.getByRole('listitem', { name: 'report.pdf' })).toBe(row);
    expect(within(row).getByRole('button').hasAttribute('disabled')).toBe(true);
    await act(async () => { operation.resolve(); await operation.promise; });
    expect(within(row).getByRole('button').hasAttribute('disabled')).toBe(false);
  });

  it('does not let a replaced duplicate-id occurrence receive an old failure', async () => {
    const duplicate: FileItem = { id: 'report', name: 'other-report.pdf' };
    const old = deferred();
    const current = deferred();
    const ondownload = vi.fn<(file: FileItem) => Promise<void>>()
      .mockImplementationOnce(() => old.promise).mockImplementationOnce(() => current.promise);
    const view = render(FileList, { files: [first, duplicate], ondownload });
    await fireEvent.click(view.getByRole('button', { name: 'Download report.pdf' }));
    await view.rerender({ files: [duplicate] });
    await fireEvent.click(view.getByRole('button', { name: 'Download other-report.pdf' }));
    await act(async () => { old.reject(new Error('obsolete')); await old.promise.catch(() => {}); });
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('button', { name: 'Download other-report.pdf' }).hasAttribute('disabled')).toBe(true);
    await act(async () => { current.resolve(); await current.promise; });
    expect(view.getByRole('button', { name: 'Download other-report.pdf' }).hasAttribute('disabled')).toBe(false);
  });

  it('does not collide duplicate occurrence keys with delimiter-like ids or id-less rows', () => {
    const files: FileItem[] = [
      { id: 'a', name: 'same.txt' }, { id: 'a', name: 'same.txt' },
      { id: 'a:1', name: 'same.txt' }, { id: '', name: 'same.txt' },
      { id: 'index:5:same.txt', name: 'same.txt' }, { name: 'same.txt' },
    ];
    const view = render(FileList, { files });
    expect(view.getAllByRole('listitem')).toHaveLength(files.length);
  });

  it('retires occurrence state when duplicate-id objects exchange positions', async () => {
    const duplicate: FileItem = { id: 'report', name: 'other-report.pdf' };
    const old = deferred();
    const current = deferred();
    const ondownload = vi.fn<(file: FileItem) => Promise<void>>()
      .mockImplementationOnce(() => old.promise).mockImplementationOnce(() => current.promise);
    const view = render(FileList, { files: [first, duplicate], ondownload });
    await fireEvent.click(view.getByRole('button', { name: 'Download report.pdf' }));
    await view.rerender({ files: [duplicate, first] });
    expect(view.getByRole('button', { name: 'Download report.pdf' }).hasAttribute('disabled')).toBe(false);
    await fireEvent.click(view.getByRole('button', { name: 'Download other-report.pdf' }));
    await act(async () => {
      old.reject(new Error('obsolete'));
      await old.promise.catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByRole('button', { name: 'Download other-report.pdf' }).hasAttribute('disabled')).toBe(true);
    expect(ondownload).toHaveBeenNthCalledWith(2, duplicate);
    await act(async () => { current.resolve(); await current.promise; });
  });

  it('never submits the surrounding form through an attachment action', async () => {
    const form = document.createElement('form');
    const target = document.createElement('div');
    form.append(target);
    document.body.append(form);
    const submit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener('submit', submit);
    const handler = vi.fn();
    const view = render(FileList, { target, props: {
      files: [first], onpreview: handler, ondownload: handler, onremove: handler,
    } });
    for (const action of actions) {
      const button = view.getByRole('button', { name: `${action} report.pdf` });
      expect(button.getAttribute('type')).toBe('button');
      expect(button.getAttribute('title')).toBe(`${action} report.pdf`);
      await fireEvent.click(button);
    }
    expect(submit).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(3);
  });
});
