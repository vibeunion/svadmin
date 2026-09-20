import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'svelte';
import DateRangeInput from './DateRangeInput.svelte';
import FileUpload, { type UploadItem } from './FileUpload.svelte';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('strict integration regressions', () => {
  it.each(['start', 'end'] as const)('keeps both range fields when editing %s from null', async (part) => {
    const onchange = vi.fn();
    const view = render(DateRangeInput, { value: null, onchange });
    const inputs = view.container.querySelectorAll('input');
    const input = inputs[part === 'start' ? 0 : 1];
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected date input');
    await fireEvent.input(input, { target: { value: '2026-09-19' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: null, end: null, [part]: '2026-09-19' });
  });

  it('preserves the other date and forwards explicitly provided native limits', async () => {
    const onchange = vi.fn();
    const view = render(DateRangeInput, { value: { start: '2026-09-01', end: null }, min: '2026-01-01', startName: 'from', endName: 'to', onchange });
    const input = view.container.querySelector('input[name="to"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected named date input');
    expect(input.min).toBe('2026-01-01');
    await fireEvent.input(input, { target: { value: '2026-09-19' } });
    expect(onchange).toHaveBeenLastCalledWith({ start: '2026-09-01', end: '2026-09-19' });
  });

  const uploads: { name: string; upload: NonNullable<ComponentProps<typeof FileUpload>['upload']>; url?: string }[] = [
    { name: 'void callback', upload: async () => {} },
    { name: 'optional receipt', upload: async (file) => file.size === 0 ? { url: '/empty' } : undefined },
    { name: 'empty receipt', upload: async () => ({}) },
    { name: 'URL receipt', upload: async () => ({ url: '/uploaded.csv' }), url: '/uploaded.csv' },
  ];
  it.each(uploads)('accepts $name without adding undefined-valued optional fields', async ({ upload, url }) => {
    let latest: UploadItem[] = [];
    const view = render(FileUpload, { upload, onChange: (items) => { latest = items; } });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
    await fireEvent.change(input, { target: { files: [new File(['data'], 'data.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(latest[0]?.status).toBe('success'));
    const item = latest[0];
    if (!item) throw new Error('Expected successful item');
    expect(Object.hasOwn(item, 'error')).toBe(false);
    expect(Object.hasOwn(item, 'url')).toBe(url !== undefined);
    expect(item.url).toBe(url);
  });

  it('removes the old error on retry instead of publishing error: undefined', async () => {
    let attempt = 0;
    let latest: UploadItem[] = [];
    const view = render(FileUpload, {
      upload: async () => { if (++attempt === 1) throw new Error('Retry this upload'); return { url: '/ok' }; },
      onChange: (items) => { latest = items; },
    });
    const input = view.container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Expected file input');
    await fireEvent.change(input, { target: { files: [new File(['data'], 'data.csv')] } });
    await waitFor(() => expect(latest[0]?.status).toBe('error'));
    await fireEvent.click(view.getByRole('button', { name: 'Retry upload' }));
    await waitFor(() => expect(latest[0]?.status).toBe('success'));
    const item = latest[0];
    if (!item) throw new Error('Expected retry receipt');
    expect(item.url).toBe('/ok');
    expect(Object.hasOwn(item, 'error')).toBe(false);
    expect(view.queryByRole('alert')).toBeNull();
  });
});
