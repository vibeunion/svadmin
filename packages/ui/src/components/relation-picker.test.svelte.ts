import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Type } from '@sinclair/typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { defineResource, resetContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
import { type ComponentProps } from 'svelte';
import Host from './relation-picker.test-host.svelte';

const contract = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const resources: ResourceDefinition[] = [{ name: 'posts', fields: [], contract }];
const clients: QueryClient[] = [];
function provider(): DataProvider {
  return {
    getList: vi.fn(async ({ pagination }) => ({ data: [{ id: pagination?.current ?? 1,
      title: `Row ${pagination?.current ?? 1}` }], total: 2 })),
    getOne: async ({ id }) => ({ data: { id, title: `Row ${id}` } }),
    getApiUrl: () => '/api',
    create: async () => ({ data: {} }), update: async () => ({ data: {} }), deleteOne: async () => ({ data: {} }),
  };
}
function mount(settings: ComponentProps<typeof Host>['settings'] = {}, source = provider()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  const view = render(Host, { provider: source, resources, client,
    settings: { fetchSize: 1, multiple: true, title: 'Choose records', ...settings } });
  return { view, source };
}
async function open(view: ReturnType<typeof mount>['view']) {
  await waitFor(() => expect(view.getByRole('button', { name: /Select|选择/i }).hasAttribute('disabled')).toBe(false));
  await fireEvent.click(view.getByRole('button', { name: /Select|选择/i }));
  return within(await view.findByRole('dialog', { name: 'Choose records' }));
}
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
});

describe('RelationPicker', () => {
  it('hydrates an existing value outside the loaded page', async () => {
    const { view } = mount({ value: [9] });
    await waitFor(() => expect(view.container.textContent).toContain('Row 9'));
    expect(view.container.textContent).not.toContain('#9');
  });

  it('closes a draft when the owner replaces the value', async () => {
    const onchange = vi.fn();
    const { view } = mount({ onchange });
    const dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await view.rerender({ settings: { value: [9], multiple: true, onchange } });
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(view.container.textContent).toContain('Row 9'));
    expect(onchange).not.toHaveBeenCalled();
  });

  it('can retry failed list reads without committing a selection', async () => {
    const source = provider();
    vi.mocked(source.getList).mockRejectedValueOnce(new Error('Read failed'));
    const onchange = vi.fn();
    const { view } = mount({ onchange }, source);
    const dialog = await open(view);
    await dialog.findByRole('alert');
    await fireEvent.click(dialog.getByRole('button', { name: 'Retry' }));
    await dialog.findByRole('checkbox', { name: 'Row 1' });
    expect(onchange).not.toHaveBeenCalled();
  });

  it('keeps cross-page selection as a draft until confirmed', async () => {
    const onchange = vi.fn();
    const { view } = mount({ onchange });
    const dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(dialog.getByRole('button', { name: 'Load more' }));
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 2' }));
    await fireEvent.click(dialog.getByRole('button', { name: 'Confirm' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith([1, 2]);
  });

  it('discards cancelled drafts', async () => {
    const onchange = vi.fn();
    const { view } = mount({ onchange });
    let dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    dialog = await open(view);
    expect((await dialog.findByRole('checkbox', { name: 'Row 1' })).getAttribute('aria-checked')).toBe('false');
    expect(onchange).not.toHaveBeenCalled();
  });

  it('closes and discards drafts on tenant changes', async () => {
    const onchange = vi.fn();
    const { view } = mount({ onchange });
    const dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await view.rerender({ tenant: 'second' });
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    const next = await open(view);
    expect((await next.findByRole('checkbox', { name: 'Row 1' })).getAttribute('aria-checked')).toBe('false');
    expect(onchange).not.toHaveBeenCalled();
  });

  it('does not load lists when list permission is denied', async () => {
    const { view, source } = mount();
    await view.rerender({ access: { can: async () => ({ can: false }) } });
    await waitFor(() => expect(view.getByRole('button', { name: /Select|选择/i }).hasAttribute('disabled')).toBe(true));
    const count = vi.mocked(source.getList).mock.calls.length;
    await fireEvent.click(view.getByRole('button', { name: /Select|选择/i }));
    expect(view.queryByRole('dialog')).toBeNull();
    expect(source.getList).toHaveBeenCalledTimes(count);
  });
});
