import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DateRangeInput from './DateRangeInput.svelte';
import FileUpload, { type UploadItem, type UploadSession } from './FileUpload.svelte';
import FieldDisplay from './FieldDisplay.svelte';
import DateField from './fields/DateField.svelte';
import JsonSchemaForm from './JsonSchemaForm.svelte';

afterEach(cleanup);
async function select(view: { container: HTMLElement }, name = 'file.txt') {
  const input = view.container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('Missing file input');
  await fireEvent.change(input, { target: { files: [new File(['test'], name, { type: 'text/plain' })] } });
}
function pendingUpload() {
  let finish: (value: { url?: string }) => void = () => { throw new Error('Upload not started'); };
  let session: UploadSession | undefined;
  const upload = vi.fn((_file: File, current: UploadSession) => {
    session = current;
    return new Promise<{ url?: string }>(resolve => { finish = resolve; });
  });
  return { upload, finish: (value: { url?: string }) => finish(value), session: () => session };
}

describe('workflow prerequisite regressions', () => {
  it('initializes both sides from a null date range and forwards optional native constraints', async () => {
    const onchange = vi.fn();
    const view = render(DateRangeInput, { value: null, min: '2026-01-01', startId: 'start', onchange });
    const input = view.container.querySelector('input');
    if (!input) throw new Error('Missing date input');
    expect(input.min).toBe('2026-01-01');
    await fireEvent.input(input, { target: { value: '2026-09-19' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: '2026-09-19', end: null });
  });
  it('registers datetime and time displays, preserving wall-clock values', () => {
    const datetime = render(FieldDisplay, { type: 'datetime', value: '2026-09-19T13:45:00' });
    const time = render(FieldDisplay, { type: 'time', value: '13:45' });
    expect(datetime.container.querySelector('[data-svadmin-invalid-field]')).toBeNull();
    expect(datetime.container.textContent).toContain('2026');
    expect(time.container.textContent).toMatch(/(?:13:45|1:45)/);
    // Native field values stay literal; explicit DateField formatting is opt-in.
    const formatted = render(DateField, { value: '13:45', format: 'time' });
    expect(formatted.container.textContent).toContain('1:45');
    expect(formatted.container.querySelector('span')?.title).toBe('13:45');
  });
  it('does not turn cancellation into success when an executor ignores AbortSignal', async () => {
    const pending = pendingUpload(); const onChange = vi.fn();
    const view = render(FileUpload, { upload: pending.upload, onChange });
    await select(view);
    await fireEvent.click(view.getByRole('button', { name: 'Cancel upload' }));
    expect(pending.session()?.signal.aborted).toBe(true);
    const calls = onChange.mock.calls.length;
    pending.session()?.onProgress(99); pending.finish({ url: '/late' });
    await Promise.resolve(); await Promise.resolve();
    expect(onChange).toHaveBeenCalledTimes(calls);
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ status: 'cancelled' })]);
  });
  it('clears obsolete metadata and accepts a successful upload without a URL', async () => {
    let items: UploadItem[] = [];
    const upload = vi.fn<(file: File, session: UploadSession) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Try again')).mockResolvedValueOnce(undefined);
    const view = render(FileUpload, { upload, onChange: next => { items = next; } });
    await select(view); await waitFor(() => expect(items[0]?.status).toBe('error'));
    await fireEvent.click(view.getByRole('button', { name: 'Retry upload' }));
    await waitFor(() => expect(items[0]?.status).toBe('success'));
    expect(items[0]).not.toHaveProperty('error'); expect(items[0]).not.toHaveProperty('url');
  });
  it('retires requests on replacement and unmount without late notifications', async () => {
    const first = pendingUpload(), second = pendingUpload(), onChange = vi.fn();
    const upload = vi.fn<(file: File, session: UploadSession) => Promise<{ url?: string }>>()
      .mockImplementationOnce(first.upload).mockImplementationOnce(second.upload);
    const view = render(FileUpload, { upload, onChange });
    await select(view, 'first.txt'); await select(view, 'second.txt');
    expect(first.session()?.signal.aborted).toBe(true);
    const calls = onChange.mock.calls.length;
    first.finish({ url: '/obsolete' }); await Promise.resolve(); await Promise.resolve();
    expect(onChange).toHaveBeenCalledTimes(calls);
    view.unmount(); expect(second.session()?.signal.aborted).toBe(true);
    second.finish({ url: '/unmounted' }); await Promise.resolve(); await Promise.resolve();
    expect(onChange).toHaveBeenCalledTimes(calls);
  });
  it('submits untouched required false booleans and decimal values', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema: { type: 'object', required: ['active', 'amount'], properties: {
      active: { type: 'boolean' }, amount: { type: 'number' }, count: { type: 'integer' },
    } }, onsubmit });
    const amount = view.getByLabelText('amount', { exact: false });
    await fireEvent.input(amount, { target: { value: '1.25' } });
    expect(amount.getAttribute('step')).toBe('any');
    expect(view.getByLabelText('count').getAttribute('step')).toBe('1');
    const form = view.container.querySelector('form');
    if (!form) throw new Error('Missing schema form');
    await fireEvent.submit(form);
    expect(onsubmit).toHaveBeenCalledWith(expect.objectContaining({ active: false, amount: 1.25 }));
  });
});
