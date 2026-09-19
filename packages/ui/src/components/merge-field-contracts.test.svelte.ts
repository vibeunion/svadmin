import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import DateRangeInput from './DateRangeInput.svelte';
import FileUpload, { type UploadItem } from './FileUpload.svelte';
import { builtinDisplayComponents } from './fieldComponentMap';

afterEach(cleanup);

describe('nullable field boundary regressions', () => {
  it('fills the other endpoint with null when starting from a null range', async () => {
    const onchange = vi.fn();
    const view = render(DateRangeInput, { value: null, onchange });
    const inputs = view.container.querySelectorAll('input');
    const start = inputs[0];
    const end = inputs[1];
    if (!start || !end) throw new Error('Expected both range inputs');
    expect(start.value).toBe('');
    expect(end.value).toBe('');
    await fireEvent.input(start, { target: { value: '2026-09-01' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: '2026-09-01', end: null });
    await fireEvent.input(start, { target: { value: '' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: null, end: null });
  });

  it('initializes a null range from its end and preserves input constraints', async () => {
    const onchange = vi.fn();
    const view = render(DateRangeInput, {
      value: null, mode: 'time', min: '09:00', max: '18:00', step: 60,
      startId: 'range-start', endId: 'range-end', startName: 'from', endName: 'to',
      describedby: 'range-help', required: true, onchange,
    });
    const inputs = view.container.querySelectorAll('input');
    const start = inputs[0];
    const end = inputs[1];
    if (!start || !end) throw new Error('Expected both range inputs');
    expect(start.id).toBe('range-start');
    expect(start.name).toBe('from');
    expect(end.id).toBe('range-end');
    expect(end.name).toBe('to');
    expect(end.type).toBe('time');
    expect(end.min).toBe('09:00');
    expect(end.max).toBe('18:00');
    expect(end.step).toBe('60');
    expect(end.required).toBe(true);
    expect(end.getAttribute('aria-describedby')).toBe('range-help');
    await fireEvent.input(end, { target: { value: '17:30' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: null, end: '17:30' });
  });

  it('registers a datetime display that includes the time', () => {
    const value = '2026-09-19T10:30:00';
    const view = render(builtinDisplayComponents.datetime, { value });
    const expected = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium', timeStyle: 'short',
    }).format(new Date(value));
    expect(view.container.textContent).toContain(expected);
  });

  it('displays native clock strings without adding a date or timezone', () => {
    const view = render(builtinDisplayComponents.time, { value: '10:30:45' });
    expect(view.container.textContent).toContain('10:30:45');
  });

  it('clears a retry error and accepts a successful upload without a URL', async () => {
    let attempts = 0;
    const onChange = vi.fn<(items: UploadItem[]) => void>();
    const upload = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('temporary upload failure');
    });
    const view = render(FileUpload, { upload, onChange });
    const input = view.container.querySelector('input');
    if (!input) throw new Error('Expected a file input');
    await fireEvent.change(input, { target: { files: [new File(['test'], 'test.txt', { type: 'text/plain' })] } });
    await waitFor(() => expect(view.getByRole('alert').textContent).toBe('temporary upload failure'));
    await fireEvent.click(view.getByRole('button', { name: 'Retry upload' }));
    await waitFor(() => {
      const items = onChange.mock.calls.at(-1)?.[0];
      expect(items?.[0]?.status).toBe('success');
      expect(items?.[0]?.url).toBeUndefined();
      expect(items?.[0]?.error).toBeUndefined();
      expect(view.queryByRole('alert')).toBeNull();
    });
    expect(upload).toHaveBeenCalledTimes(2);
  });
});
