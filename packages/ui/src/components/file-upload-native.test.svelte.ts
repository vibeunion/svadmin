import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import type { ComponentProps } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FileUpload, { type UploadItem } from './FileUpload.svelte';

afterEach(cleanup);

type Source = 'input' | 'drop';

function file(name: string, content = 'data', type = 'text/csv'): File {
  return new File([content], name, { type });
}

function nativeForm(props: ComponentProps<typeof FileUpload> = {}) {
  const form = document.createElement('form');
  const target = document.createElement('div');
  form.append(target);
  document.body.append(form);
  const view = render(FileUpload, { target, props: { name: 'attachment', ...props } });
  const input = form.querySelector('input[type="file"]');
  const dropzone = form.querySelector('.svadmin-file-upload-dropzone');
  if (!(input instanceof HTMLInputElement) || !(dropzone instanceof HTMLElement)) {
    throw new Error('Expected file input and dropzone');
  }
  return { ...view, form, input, dropzone };
}

async function select(view: ReturnType<typeof nativeForm>, source: Source, files: File[]) {
  const transfer = new DataTransfer();
  for (const selected of files) transfer.items.add(selected);
  if (source === 'input') {
    view.input.files = transfer.files;
    await fireEvent.change(view.input);
  } else {
    await fireEvent.drop(view.dropzone, { dataTransfer: transfer });
  }
}

function submittedNames(form: HTMLFormElement): string[] {
  return new FormData(form).getAll('attachment').map(value => {
    if (!(value instanceof File)) throw new Error('Expected native file entry');
    return value.name;
  });
}

describe('FileUpload native form consistency', () => {
  it.each(['input', 'drop'] as const)('validates before counting capacity for %s', async source => {
    const onReject = vi.fn();
    const view = nativeForm({ multiple: true, accept: '.csv', maxSize: 4, maxFiles: 2, onReject });
    await select(view, source, [
      file('wrong.txt'), file('large.csv', 'oversized'),
      file('one.csv'), file('two.csv'), file('extra.csv'),
    ]);

    expect(submittedNames(view.form)).toEqual(['one.csv', 'two.csv']);
    expect(Array.from(view.input.files ?? [], selected => selected.name)).toEqual(['one.csv', 'two.csv']);
    expect(view.getByRole('status').textContent).toContain('2/2');
    expect(onReject.mock.calls.map(([selected, reason]) => [selected.name, reason])).toEqual([
      ['wrong.txt', 'File type is not accepted.'],
      ['large.csv', 'File is too large.'],
      ['extra.csv', 'Maximum file count exceeded.'],
    ]);
  });

  it.each(['input', 'drop'] as const)('preserves a valid single file when %s rejects its replacement', async source => {
    const view = nativeForm({ accept: '.csv', required: true });
    await select(view, 'input', [file('original.csv')]);
    await select(view, source, [file('rejected.txt')]);

    expect(submittedNames(view.form)).toEqual(['original.csv']);
    expect(view.input.checkValidity()).toBe(true);
    expect(view.getByText('original.csv')).toBeTruthy();
    expect(view.getByText('rejected.txt: File type is not accepted.')).toBeTruthy();
  });

  it.each([
    ['input', 'input'], ['input', 'drop'], ['drop', 'input'], ['drop', 'drop'],
  ] as const)('keeps both %s and %s batches and removes only the chosen file', async (first, second) => {
    const view = nativeForm({ multiple: true });
    await select(view, first, [file('one.csv'), file('two.csv')]);
    await select(view, second, [file('three.csv')]);
    expect(submittedNames(view.form)).toEqual(['one.csv', 'two.csv', 'three.csv']);

    const remove = view.getAllByRole('button', { name: 'Remove file' })[1];
    if (!remove) throw new Error('Expected second remove button');
    await fireEvent.click(remove);
    expect(submittedNames(view.form)).toEqual(['one.csv', 'three.csv']);
    expect(view.queryByText('two.csv')).toBeNull();
  });

  it.each(['input', 'drop'] as const)('synchronizes native data before %s onChange callbacks', async source => {
    const snapshots: { queue: string[]; submitted: string[] }[] = [];
    let form: HTMLFormElement | undefined;
    const view = nativeForm({
      multiple: true, maxFiles: 2, accept: '.csv',
      onChange: (items: UploadItem[]) => {
        if (!form) throw new Error('Expected mounted form');
        snapshots.push({ queue: items.map(item => item.file.name), submitted: submittedNames(form) });
      },
    });
    form = view.form;
    await select(view, source, [file('one.csv'), file('two.csv'), file('extra.csv')]);
    const remove = view.getAllByRole('button', { name: 'Remove file' })[0];
    if (!remove) throw new Error('Expected first remove button');
    await fireEvent.click(remove);

    expect(snapshots).toHaveLength(3);
    for (const snapshot of snapshots) expect(snapshot.submitted).toEqual(snapshot.queue);
  });

  it('fulfills native required on drop and restores missing validity after removal', async () => {
    const view = nativeForm({ required: true });
    expect(view.input.checkValidity()).toBe(false);
    await select(view, 'drop', [file('required.csv')]);
    expect(view.input.checkValidity()).toBe(true);
    expect(submittedNames(view.form)).toEqual(['required.csv']);
    await fireEvent.click(view.getByRole('button', { name: 'Remove file' }));
    expect(view.input.files).toHaveLength(0);
    expect(view.input.checkValidity()).toBe(false);
    await select(view, 'input', [file('required.csv')]);
    expect(submittedNames(view.form)).toEqual(['required.csv']);
  });

  it.each(['input', 'drop'] as const)('takes the first valid single file from %s', async source => {
    const onReject = vi.fn();
    const view = nativeForm({ accept: '.csv', onReject });
    await select(view, source, [file('wrong.txt'), file('accepted.csv'), file('extra.csv')]);
    expect(submittedNames(view.form)).toEqual(['accepted.csv']);
    expect(onReject).toHaveBeenCalledTimes(2);
  });

  it('does not accept dropped files while disabled', async () => {
    const onChange = vi.fn();
    const view = nativeForm({ onChange });
    await select(view, 'input', [file('existing.csv')]);
    await view.rerender({ name: 'attachment', disabled: true, onChange });
    onChange.mockClear();
    await select(view, 'drop', [file('ignored.csv')]);
    expect(Array.from(view.input.files ?? [], selected => selected.name)).toEqual(['existing.csv']);
    expect(onChange).not.toHaveBeenCalled();
    expect(new FormData(view.form).has('attachment')).toBe(false);
  });

  it('clears the native queue and rejections after a form reset', async () => {
    const onChange = vi.fn();
    const view = nativeForm({ multiple: true, required: true, accept: '.csv', onChange });
    await select(view, 'input', [file('old.csv'), file('rejected.txt')]);
    await act(() => view.form.reset());
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([]));
    expect(view.input.files).toHaveLength(0);
    expect(view.input.checkValidity()).toBe(false);
    expect(view.queryByText('old.csv')).toBeNull();
    expect(view.queryByText('rejected.txt: File type is not accepted.')).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith([]);
    await select(view, 'input', [file('new.csv')]);
    expect(submittedNames(view.form)).toEqual(['new.csv']);
  });

  it('preserves the queue when a later form listener prevents reset', async () => {
    const onChange = vi.fn();
    const view = nativeForm({ onChange });
    await select(view, 'input', [file('retained.csv')]);
    onChange.mockClear();
    view.form.addEventListener('reset', event => event.preventDefault());
    await act(async () => {
      view.form.reset();
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    });
    expect(submittedNames(view.form)).toEqual(['retained.csv']);
    expect(view.getByText('retained.csv')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not resurrect old files when reset and selection share a call stack', async () => {
    const view = nativeForm({ multiple: true });
    await select(view, 'input', [file('old.csv')]);
    await act(() => {
      view.form.reset();
      const transfer = new DataTransfer();
      transfer.items.add(file('new.csv'));
      view.input.files = transfer.files;
      view.input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(submittedNames(view.form)).toEqual(['new.csv']);
    expect(view.queryByText('old.csv')).toBeNull();
  });

  it('preserves a completed reset when a second reset in the same stack is cancelled', async () => {
    const onChange = vi.fn();
    const view = nativeForm({ multiple: true, onChange });
    await select(view, 'input', [file('old.csv')]);
    let resets = 0;
    view.form.addEventListener('reset', event => {
      resets += 1;
      if (resets === 2) event.preventDefault();
    });
    await act(async () => {
      view.form.reset();
      view.form.reset();
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    });
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(view.queryByText('old.csv')).toBeNull();
    await select(view, 'input', [file('new.csv')]);
    expect(submittedNames(view.form)).toEqual(['new.csv']);
  });

  it('does not notify a pending reset after destruction', async () => {
    const onChange = vi.fn();
    const view = nativeForm({ onChange });
    await select(view, 'input', [file('old.csv')]);
    onChange.mockClear();
    await act(async () => {
      view.form.reset();
      view.unmount();
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not reset an active async session with the native form', async () => {
    let finish: (() => void) | undefined;
    const upload = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const onChange = vi.fn();
    const view = nativeForm({ upload, onChange });
    await select(view, 'input', [file('async.csv')]);
    onChange.mockClear();
    await act(() => view.form.reset());
    expect(view.getByText('async.csv')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    await act(() => finish?.());
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ status: 'success' })]);
  });

  it.each(['input', 'drop'] as const)('keeps async %s out of multipart submission', async source => {
    const upload = vi.fn(async () => undefined);
    const view = nativeForm({ upload, required: true, accept: '.csv' });
    await select(view, source, [file('async.csv')]);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(view.input.name).toBe('');
    expect(view.input.required).toBe(false);
    expect(view.input.files).toHaveLength(0);
    expect(new FormData(view.form).has('attachment')).toBe(false);
  });
});
