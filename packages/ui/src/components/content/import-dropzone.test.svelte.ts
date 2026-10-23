import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ImportDropzone from './ImportDropzone.svelte';

afterEach(cleanup);

function file(name = 'data.csv', type = 'text/csv') {
  return new File(['data'], name, { type });
}

function transfer(files: File[]) {
  const value = new DataTransfer();
  for (const file of files) value.items.add(file);
  return value;
}

function input(view: { container: HTMLElement }) {
  const node = view.container.querySelector('input[type=file]');
  if (!(node instanceof HTMLInputElement)) throw new Error('Expected file input');
  return node;
}

async function select(view: { container: HTMLElement }, source: 'input' | 'drop', files: File[]) {
  const data = transfer(files);
  if (source === 'input') {
    const node = input(view);
    node.files = data.files;
    await fireEvent.change(node);
  } else {
    const node = view.container.querySelector('[data-svadmin-import-dropzone]');
    if (!node) throw new Error('Expected dropzone');
    await fireEvent.drop(node, { dataTransfer: data });
  }
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe('ImportDropzone import contract', () => {
  it.each(['input', 'drop'] as const)('imports once through %s and clears selection for same-file reuse', async source => {
    const onimport = vi.fn<(files: FileList | null) => void>();
    const view = render(ImportDropzone, { onimport });
    const selected = file();
    await select(view, source, [selected]);
    expect(onimport).toHaveBeenCalledTimes(1);
    const received = onimport.mock.calls[0]?.[0];
    expect(Array.from(received ?? [])).toEqual([selected]);
    expect(view.queryByRole('button', { name: /^Import/ })).toBeNull();
    expect(input(view).files).toHaveLength(0);
    expect(input(view).value).toBe('');
    await select(view, source, [selected]);
    expect(onimport).toHaveBeenCalledTimes(2);
  });

  it.each(['input', 'drop'] as const)('rejects invalid types from %s without partial import', async source => {
    const onimport = vi.fn();
    const view = render(ImportDropzone, { onimport, multiple: true });
    await select(view, source, [file('valid.csv'), file('bad.txt', 'text/plain')]);
    expect(onimport).not.toHaveBeenCalled();
    expect(view.getByRole('alert').textContent).toBe('File type is not accepted.');
    expect(input(view).files).toHaveLength(0);
  });

  it.each(['input', 'drop'] as const)('enforces single-file mode for %s', async source => {
    const onimport = vi.fn();
    const view = render(ImportDropzone, { onimport });
    await select(view, source, [file('one.csv'), file('two.csv')]);
    expect(onimport).not.toHaveBeenCalled();
    expect(view.getByRole('alert').textContent).toBe('Select one file at a time.');
    await view.rerender({ multiple: true });
    await select(view, source, [file('one.csv'), file('two.csv')]);
    expect(onimport).toHaveBeenCalledTimes(1);
    expect(onimport.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it.each(['.CSV', 'text/csv', 'text/*', ''] as const)('honors the custom accept contract %s', async accept => {
    const onimport = vi.fn();
    const view = render(ImportDropzone, { onimport, accept });
    await select(view, 'drop', [file('data.CSV')]);
    expect(onimport).toHaveBeenCalledTimes(1);
    expect(input(view).accept).toBe(accept);
    expect(view.queryByText('CSV or spreadsheet files are accepted.')).toBeNull();
  });

  it.each(['input', 'drop'] as const)('does not accept empty accept tokens from %s', async source => {
    const onimport = vi.fn();
    const view = render(ImportDropzone, { onimport, accept: '.csv,' });
    await select(view, source, [file('bad.bin', '')]);
    expect(onimport).not.toHaveBeenCalled();
    expect(view.getByRole('alert').textContent).toBe('File type is not accepted.');
  });

  it('locks selection while loading without dispatching queued work on recovery', async () => {
    const onimport = vi.fn();
    const view = render(ImportDropzone, { onimport, loading: true });
    await select(view, 'input', [file()]);
    await select(view, 'drop', [file()]);
    expect(onimport).not.toHaveBeenCalled();
    expect(input(view).disabled).toBe(true);
    expect(view.getByRole('group').getAttribute('aria-busy')).toBe('true');
    await view.rerender({ loading: false });
    expect(onimport).not.toHaveBeenCalled();
    await select(view, 'drop', [file()]);
    expect(onimport).toHaveBeenCalledTimes(1);
  });

  it('locks async attempts, retries only failures, and keeps private errors out of the UI', async () => {
    const first = deferred();
    const onimport = vi.fn<(files: FileList | null) => Promise<void>>()
      .mockImplementationOnce(() => first.promise).mockResolvedValue(undefined);
    const view = render(ImportDropzone, { onimport });
    await select(view, 'input', [file('retry.csv')]);
    expect(input(view).disabled).toBe(true);
    await select(view, 'drop', [file('ignored.csv')]);
    expect(onimport).toHaveBeenCalledTimes(1);
    await act(async () => { first.reject(new Error('private backend detail')); await first.promise.catch(() => {}); });
    expect(view.getByRole('alert').textContent).toBe('Something went wrong');
    expect(view.container.textContent).not.toContain('private backend detail');
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    expect(onimport).toHaveBeenCalledTimes(2);
    expect(onimport.mock.calls[1]?.[0]?.[0]?.name).toBe('retry.csv');
    await waitFor(() => expect(view.queryByRole('button', { name: 'Retry' })).toBeNull());
    expect(view.queryByRole('alert')).toBeNull();
    expect(input(view).files).toHaveLength(0);
  });

  it('contains synchronous failures and never submits the surrounding form on retry', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    const target = document.createElement('div');
    form.append(target);
    const submit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener('submit', submit);
    const onimport = vi.fn(() => { throw new Error('private sync error'); });
    const view = render(ImportDropzone, { target, props: { onimport } });
    await select(view, 'input', [file()]);
    const retry = view.getByRole('button', { name: 'Retry' });
    expect(retry.getAttribute('type')).toBe('button');
    await fireEvent.click(retry);
    expect(onimport).toHaveBeenCalledTimes(2);
    expect(submit).not.toHaveBeenCalled();
  });

  it('keeps a synchronously reentrant change exactly once', async () => {
    let node: HTMLInputElement | undefined;
    const onimport = vi.fn(() => {
      if (!node) return;
      const next = transfer([file('reentrant.csv')]);
      node.files = next.files;
      node.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const view = render(ImportDropzone, { onimport });
    node = input(view);
    await fireEvent.change(node, { target: { files: transfer([file('first.csv')]).files } });
    expect(onimport).toHaveBeenCalledTimes(1);
  });

  it.each(['resolve', 'reject'] as const)('ignores stale %s after handler replacement', async outcome => {
    const old = deferred();
    const current = deferred();
    const view = render(ImportDropzone, { onimport: () => old.promise });
    await select(view, 'drop', [file('old.csv')]);
    await view.rerender({ onimport: () => current.promise });
    expect(input(view).files).toHaveLength(0);
    await select(view, 'drop', [file('new.csv')]);
    await act(async () => {
      if (outcome === 'resolve') old.resolve();
      else old.reject(new Error('old error'));
      await old.promise.catch(() => {});
    });
    expect(input(view).disabled).toBe(true);
    expect(input(view).files?.[0]?.name).toBe('new.csv');
    expect(view.queryByRole('alert')).toBeNull();
    await act(async () => { current.resolve(); await current.promise; });
    expect(input(view).disabled).toBe(false);
  });

  it('discards a failed old file when the handler changes', async () => {
    const next = vi.fn();
    const view = render(ImportDropzone, { onimport: () => { throw new Error('old'); } });
    await select(view, 'input', [file()]);
    expect(view.getByRole('button', { name: 'Retry' })).toBeTruthy();
    await view.rerender({ onimport: next });
    expect(view.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(view.queryByRole('alert')).toBeNull();
    expect(next).not.toHaveBeenCalled();
  });

  it('contains a late failure after unmount', async () => {
    const pending = deferred();
    const view = render(ImportDropzone, { onimport: () => pending.promise });
    await select(view, 'input', [file()]);
    view.unmount();
    await act(async () => { pending.reject(new Error('late')); await pending.promise.catch(() => {}); });
    expect(view.container.textContent).toBe('');
  });

  it('disables a missing handler and names the native input without nested button semantics', () => {
    const view = render(ImportDropzone, { status: 'Awaiting configuration' });
    expect(view.getByLabelText('Choose file')).toBe(input(view));
    expect(input(view).disabled).toBe(true);
    expect(view.getByRole('group', { name: 'Import data' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Import data' })).toBeNull();
    expect(view.getByRole('status').textContent).toBe('Awaiting configuration');
  });
});
