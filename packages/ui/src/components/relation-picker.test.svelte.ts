import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Type } from 'typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { defineResource, resetContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
import { type ComponentProps } from 'svelte';
import Host from './relation-picker.test-host.svelte';

const contract = defineResource('posts', { record: Type.Object({ id: Type.Number(), title: Type.String() }) });
const resources: ResourceDefinition[] = [{ name: 'posts', label: 'Posts', fields: [], contract }];
const namedResources: ResourceDefinition[] = [{
  name: 'posts',
  label: 'Posts',
  fields: [],
  contract,
  provider: { dataProviderName: 'named' },
}];
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
function mount(settings: ComponentProps<typeof Host>['settings'] = {}, source = provider(),
  environment: Pick<ComponentProps<typeof Host>, 'access' | 'tenant'> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  const view = render(Host, { provider: source, resources, client, ...environment,
    settings: { fetchSize: 1, multiple: true, title: 'Choose records', ...settings } });
  return { view, source, client };
}
async function open(view: ReturnType<typeof mount>['view']) {
  await waitFor(() => expect(view.getByRole('button', { name: /Select|选择/i }).hasAttribute('disabled')).toBe(false));
  const trigger = view.getByRole('button', { name: /Select|选择/i });
  trigger.focus();
  await fireEvent.click(trigger);
  return within(await view.findByRole('dialog', { name: 'Choose records' }));
}
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
});

describe('RelationPicker', () => {
  it.each(['pending', 'applied'] as const)('resets %s search on mode changes while preserving the selection draft', async state => {
    const onchange = vi.fn();
    const settings = { fetchSize: 1, multiple: true, title: 'Choose records', onchange };
    const { view, source } = mount(settings);
    const dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await fireEvent.input(dialog.getByRole('textbox', { name: /Search/ }), { target: { value: 'searched' } });
    if (state === 'applied') {
      await waitFor(() => expect(source.getList).toHaveBeenCalledWith(expect.objectContaining({
        filters: [{ field: 'title', operator: 'contains', value: 'searched' }],
      })));
      await waitFor(() => expect(dialog.getByRole('button', { name: 'Load more' }).hasAttribute('disabled')).toBe(false));
      await fireEvent.click(dialog.getByRole('button', { name: 'Load more' }));
      await dialog.findByRole('checkbox', { name: 'Row 2' });
    }
    const callsBefore = vi.mocked(source.getList).mock.calls.length;
    await view.rerender({ settings: { ...settings, searchable: false } });
    expect(dialog.queryByRole('textbox')).toBeNull();
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Confirm' }).hasAttribute('disabled')).toBe(false));
    await waitFor(() => expect(dialog.queryByRole('checkbox', { name: 'Row 2' })).toBeNull());
    expect(dialog.getByRole('checkbox', { name: 'Row 1' }).getAttribute('aria-checked')).toBe('true');
    await new Promise<void>(resolve => setTimeout(resolve, 300));
    expect(vi.mocked(source.getList).mock.calls.slice(callsBefore).every(([params]) =>
      params.pagination?.current === 1 && params.filters?.length === 0)).toBe(true);
    await view.rerender({ settings: { ...settings, searchable: true } });
    expect(dialog.getByRole('textbox')).toHaveProperty('value', '');
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Confirm' }).hasAttribute('disabled')).toBe(false));
    await fireEvent.click(dialog.getByRole('button', { name: 'Confirm' }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith([1]);
  });

  it('keeps the first-page draft when the next page fails and recovers both pages on retry', async () => {
    const source = provider();
    let pageTwoAttempts = 0;
    vi.mocked(source.getList).mockImplementation(async ({ pagination }) => {
      const current = pagination?.current ?? 1;
      if (current === 2 && ++pageTwoAttempts === 1) throw new Error('PRIVATE relation token');
      return { data: [{ id: current, title: `Row ${current}` }], total: 2 };
    });
    const onchange = vi.fn();
    const { view } = mount({ onchange }, source);
    const dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await fireEvent.click(dialog.getByRole('button', { name: 'Load more' }));
    const alert = await dialog.findByRole('alert');
    expect(alert.textContent).toContain('Unable to load options.');
    expect(view.container.textContent).not.toContain('PRIVATE');
    const confirm = dialog.getByRole('button', { name: 'Confirm' });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(confirm);
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(dialog.getByRole('button', { name: 'Retry' }));
    await dialog.findByRole('checkbox', { name: 'Row 2' });
    expect(dialog.getByRole('checkbox', { name: 'Row 1' }).getAttribute('aria-checked')).toBe('true');
    expect(view.container.textContent).not.toContain('PRIVATE');
    await fireEvent.click(dialog.getByRole('checkbox', { name: 'Row 2' }));
    await waitFor(() => expect(confirm.hasAttribute('disabled')).toBe(false));
    await fireEvent.click(confirm);
    expect(onchange).toHaveBeenCalledExactlyOnceWith([1, 2]);
  });

  it('blocks repeated retry activation while the retry request is in flight', async () => {
    let releasePageTwo: (() => void) | undefined;
    let pageTwoCalls = 0;
    const source = provider();
    vi.mocked(source.getList).mockImplementation(async ({ pagination }) => {
      const current = pagination?.current ?? 1;
      if (current === 2) {
        pageTwoCalls += 1;
        if (pageTwoCalls === 1) throw new Error('PRIVATE relation token');
        if (pageTwoCalls === 2) await new Promise<void>(done => { releasePageTwo = done; });
      }
      return { data: [{ id: current, title: `Row ${current}` }], total: 2 };
    });
    const onchange = vi.fn();
    const { view } = mount({ onchange }, source);
    const dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await fireEvent.click(dialog.getByRole('button', { name: 'Load more' }));
    await dialog.findByRole('alert');
    const retry = dialog.getByRole('button', { name: 'Retry' });
    retry.focus();
    await fireEvent.click(retry);
    await waitFor(() => expect(pageTwoCalls).toBe(2));
    // In flight: no enabled retry control, no actionable rows, no enabled confirm.
    const retryInFlight = dialog.queryByRole('button', { name: 'Retry' });
    expect(retryInFlight === null || retryInFlight.hasAttribute('disabled')).toBe(true);
    const firstPageRow = dialog.getByRole('checkbox', { name: 'Row 1' });
    expect(firstPageRow.hasAttribute('disabled')).toBe(true);
    const confirm = dialog.getByRole('button', { name: 'Confirm' });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    retryInFlight?.focus();
    await fireEvent.keyDown(retryInFlight ?? document.body, { key: 'Enter' });
    await fireEvent.click(confirm);
    expect(pageTwoCalls).toBe(2);
    expect(onchange).not.toHaveBeenCalled();
    await act(async () => {
      releasePageTwo?.();
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    });
    await dialog.findByRole('checkbox', { name: 'Row 2' });
    expect(dialog.getByRole('checkbox', { name: 'Row 1' }).getAttribute('aria-checked')).toBe('true');
    expect(onchange).not.toHaveBeenCalled();
  });

  it('does not restart the request when retry is activated twice in one tick', async () => {
    let releasePageTwo: (() => void) | undefined;
    let pageTwoCalls = 0;
    const source = provider();
    vi.mocked(source.getList).mockImplementation(async ({ pagination }) => {
      const current = pagination?.current ?? 1;
      if (current === 2) {
        pageTwoCalls += 1;
        if (pageTwoCalls === 1) throw new Error('PRIVATE relation token');
        await new Promise<void>(done => { releasePageTwo = done; });
      }
      return { data: [{ id: current, title: `Row ${current}` }], total: 2 };
    });
    const onchange = vi.fn();
    const { view } = mount({ onchange }, source);
    const dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await fireEvent.click(dialog.getByRole('button', { name: 'Load more' }));
    await dialog.findByRole('alert');
    const retry = dialog.getByRole('button', { name: 'Retry' });
    await Promise.all([fireEvent.click(retry), fireEvent.click(retry)]);
    await new Promise<void>(resolve => setTimeout(resolve, 50));
    expect(pageTwoCalls).toBe(2);
    expect(onchange).not.toHaveBeenCalled();
    await act(async () => {
      releasePageTwo?.();
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    });
    await dialog.findByRole('checkbox', { name: 'Row 2' });
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(['Cancel', 'Escape'] as const)('does not submit a recovered cross-page draft on %s', async action => {
    const source = provider();
    let pageTwoAttempts = 0;
    vi.mocked(source.getList).mockImplementation(async ({ pagination }) => {
      const current = pagination?.current ?? 1;
      if (current === 2 && ++pageTwoAttempts === 1) throw new Error('PRIVATE relation token');
      return { data: [{ id: current, title: `Row ${current}` }], total: 2 };
    });
    const onchange = vi.fn();
    const { view } = mount({ onchange }, source);
    let dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await fireEvent.click(dialog.getByRole('button', { name: 'Load more' }));
    await dialog.findByRole('alert');
    await fireEvent.click(dialog.getByRole('button', { name: 'Retry' }));
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 2' }));
    if (action === 'Escape') await fireEvent.keyDown(dialog.getByRole('textbox', { name: /Search/ }), { key: 'Escape' });
    else await fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    expect(onchange).not.toHaveBeenCalled();
    dialog = await open(view);
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Confirm' }).hasAttribute('disabled')).toBe(false));
    expect((await dialog.findByRole('checkbox', { name: 'Row 1' })).getAttribute('aria-checked')).toBe('false');
    expect(onchange).not.toHaveBeenCalled();
  });

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

  it.each(['Cancel', 'Close', 'Escape'] as const)('resets search and pagination after %s without committing drafts', async action => {
    const onchange = vi.fn();
    const { view, source } = mount({ onchange });
    let dialog = await open(view);
    const input = dialog.getByRole('textbox', { name: /Search/ });
    await fireEvent.input(input, { target: { value: 'searched' } });
    await waitFor(() => expect(source.getList).toHaveBeenCalledWith(expect.objectContaining({
      filters: [{ field: 'title', operator: 'contains', value: 'searched' }],
    })));
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Confirm' }).hasAttribute('disabled')).toBe(false));
    await fireEvent.click(dialog.getByRole('checkbox', { name: 'Row 1' }));
    await fireEvent.click(dialog.getByRole('button', { name: 'Load more' }));
    await dialog.findByRole('checkbox', { name: 'Row 2' });
    if (action === 'Escape') await fireEvent.keyDown(input, { key: 'Escape' });
    else await fireEvent.click(dialog.getByRole('button', { name: action }));
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(view.getByRole('button', { name: /Select/i })));
    dialog = await open(view);
    const reopenedInput = dialog.getByRole('textbox', { name: /Search/ });
    expect(reopenedInput).toHaveProperty('value', '');
    await waitFor(() => expect(dialog.queryByRole('checkbox', { name: 'Row 2' })).toBeNull());
    expect((await dialog.findByRole('checkbox', { name: 'Row 1' })).getAttribute('aria-checked')).toBe('false');
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(['Close', 'Escape'] as const)('cancels pending search when dismissed with %s and immediately reopened', async action => {
    const { view, source } = mount();
    const dialog = await open(view);
    await dialog.findByRole('checkbox', { name: 'Row 1' });
    const input = dialog.getByRole('textbox', { name: /Search/ });
    await fireEvent.input(input, { target: { value: 'abandoned' } });
    if (action === 'Escape') await fireEvent.keyDown(input, { key: 'Escape' });
    else await fireEvent.click(dialog.getByRole('button', { name: action }));
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    const reopened = await open(view);
    await new Promise<void>(resolve => setTimeout(resolve, 300));
    expect(vi.mocked(source.getList).mock.calls.some(([params]) =>
      params.filters?.some(filter => 'field' in filter && filter.value === 'abandoned'))).toBe(false);
    expect(reopened.getByRole('textbox', { name: /Search/ })).toHaveProperty('value', '');
  });

  it('restores trigger focus after confirming a draft', async () => {
    const onchange = vi.fn();
    const { view } = mount({ onchange });
    const trigger = view.getByRole('button', { name: /Select/i });
    const dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await fireEvent.click(dialog.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(onchange).toHaveBeenCalledExactlyOnceWith([1]);
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

  it.each(['tenant', 'permission', 'disabled', 'provider'] as const)('discards draft searches when %s changes', async change => {
    const onchange = vi.fn();
    const settings = { fetchSize: 1, multiple: true, title: 'Choose records', onchange };
    const { view, source } = mount(settings);
    const dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await fireEvent.input(dialog.getByRole('textbox', { name: /Search/ }), { target: { value: 'abandoned' } });
    if (change === 'tenant') await view.rerender({ tenant: 'second' });
    if (change === 'permission') await view.rerender({ access: { can: async () => ({ can: false }) } });
    if (change === 'disabled') await view.rerender({ settings: { ...settings, disabled: true } });
    if (change === 'provider') await view.rerender({ provider: provider() });
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    if (change === 'permission') await view.rerender({ access: { can: async () => ({ can: true }) } });
    if (change === 'disabled') await view.rerender({ settings });
    const next = await open(view);
    await new Promise<void>(resolve => setTimeout(resolve, 300));
    expect(next.getByRole('textbox', { name: /Search/ })).toHaveProperty('value', '');
    expect((await next.findByRole('checkbox', { name: 'Row 1' })).getAttribute('aria-checked')).toBe('false');
    expect(onchange).not.toHaveBeenCalled();
    expect(vi.mocked(source.getList).mock.calls.some(([params]) =>
      params.filters?.some(filter => 'field' in filter && filter.value === 'abandoned'))).toBe(false);
  });

  it('does not start list or selected-label reads when mounted without list permission', async () => {
    const source = provider();
    const getOne = vi.spyOn(source, 'getOne');
    const { view } = mount({ value: [9] }, source, { access: { can: async () => ({ can: false }) } });
    await new Promise<void>(resolve => setTimeout(resolve, 30));
    expect(view.getByRole('button', { name: /Select/i }).hasAttribute('disabled')).toBe(true);
    expect(source.getList).not.toHaveBeenCalled();
    expect(getOne).not.toHaveBeenCalled();
    expect(view.container.textContent).not.toContain('Row 9');
  });

  it('keeps the previous controlled value invalidated after permission recovery until the owner replaces it', async () => {
    const onchange = vi.fn();
    const settings = { value: [9], fetchSize: 1, multiple: true, title: 'Choose records', onchange };
    const { view } = mount(settings);
    await waitFor(() => expect(view.container.textContent).toContain('Row 9'));
    await view.rerender({ access: { can: async () => ({ can: false }) } });
    await waitFor(() => expect(view.container.textContent).not.toContain('Row 9'));
    await view.rerender({ access: { can: async () => ({ can: true }) } });
    const dialog = await open(view);
    await dialog.findByRole('checkbox', { name: 'Row 1' });
    expect(dialog.queryByRole('checkbox', { name: 'Row 9' })).toBeNull();
    await fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(view.container.textContent).not.toContain('Row 9');
    await view.rerender({ settings: { ...settings, value: [9] } });
    await waitFor(() => expect(view.container.textContent).toContain('Row 9'));
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(['tenant', 'provider'] as const)('ignores an in-flight search response after the %s changes', async change => {
    type ListResult = Awaited<ReturnType<DataProvider['getList']>>;
    let resolve: (result: ListResult) => void = () => { throw new Error('Search not initialized'); };
    const pending = new Promise<ListResult>(done => { resolve = done; });
    const source = provider();
    const nextSource = provider();
    const nextPage = { data: [{ id: 2, title: 'Current scope' }], total: 1 };
    vi.mocked(source.getList).mockImplementation(async ({ filters, meta }) => {
      if (filters?.some(filter => 'field' in filter && filter.value === 'slow')) return pending;
      return meta?.['tenantId'] === 'second' ? nextPage : { data: [{ id: 1, title: 'Row 1' }], total: 1 };
    });
    vi.mocked(nextSource.getList).mockResolvedValue(nextPage);
    const onchange = vi.fn();
    const { view, client } = mount({ onchange }, source);
    const dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await fireEvent.input(dialog.getByRole('textbox', { name: /Search/ }), { target: { value: 'slow' } });
    await waitFor(() => expect(source.getList).toHaveBeenCalledWith(expect.objectContaining({
      filters: [{ field: 'title', operator: 'contains', value: 'slow' }],
    })));
    await view.rerender(change === 'tenant' ? { tenant: 'second' } : { provider: nextSource });
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    const next = await open(view);
    await next.findByRole('checkbox', { name: 'Current scope' });
    await act(async () => {
      resolve({ data: [{ id: 99, title: 'Obsolete scope' }], total: 1 });
      await pending;
    });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(next.queryByRole('checkbox', { name: 'Obsolete scope' })).toBeNull();
    expect(next.getByRole('checkbox', { name: 'Current scope' }).getAttribute('aria-checked')).toBe('false');
    expect(next.getByRole('textbox', { name: /Search/ })).toHaveProperty('value', '');
    expect(onchange).not.toHaveBeenCalled();
    if (change === 'provider') {
      expect(nextSource.getList).toHaveBeenCalledWith(expect.objectContaining({ filters: [] }));
      expect(vi.mocked(nextSource.getList).mock.calls.some(([params]) => params.filters?.length)).toBe(false);
    }
  });

  it('does not send the previous page or selected IDs to a replacement provider', async () => {
    const source = provider();
    const nextSource = provider();
    const nextGetOne = vi.spyOn(nextSource, 'getOne');
    const onchange = vi.fn();
    const { view } = mount({ value: [9], onchange }, source);
    await waitFor(() => expect(view.container.textContent).toContain('Row 9'));
    await fireEvent.click(view.getByRole('button', { name: 'Edit' }));
    const dialog = within(await view.findByRole('dialog'));
    await fireEvent.click(dialog.getByRole('button', { name: 'Load more' }));
    await dialog.findByRole('checkbox', { name: 'Row 2' });
    await view.rerender({ provider: nextSource });
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    const next = await open(view);
    await next.findByRole('checkbox', { name: 'Row 1' });
    expect(nextGetOne).not.toHaveBeenCalled();
    expect(vi.mocked(nextSource.getList).mock.calls.every(([params]) => params.pagination?.current === 1)).toBe(true);
    expect(next.queryByRole('checkbox', { name: 'Row 9' })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it('resets drafts when the provider route name changes on the same provider object', async () => {
    const source = provider();
    const onchange = vi.fn();
    const providers = { default: source, named: source };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    clients.push(client);
    const view = render(Host, { provider: providers, resources, client,
      settings: { fetchSize: 1, multiple: true, title: 'Choose records', onchange } });
    const dialog = await open(view);
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await view.rerender({ resources: namedResources });
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    const next = await open(view);
    expect((await next.findByRole('checkbox', { name: 'Row 1' })).getAttribute('aria-checked')).toBe('false');
    expect(onchange).not.toHaveBeenCalled();
  });

  it('hydrates a newly supplied value when the provider and owner value change together', async () => {
    const settings = { value: [9], multiple: true };
    const { view } = mount(settings);
    await waitFor(() => expect(view.container.textContent).toContain('Row 9'));
    const nextSource = provider();
    const nextGetOne = vi.spyOn(nextSource, 'getOne');
    await view.rerender({ provider: nextSource, settings: { ...settings, value: [7] } });
    await waitFor(() => expect(view.container.textContent).toContain('Row 7'));
    expect(view.container.textContent).not.toContain('Row 9');
    expect(nextGetOne).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
    expect(nextGetOne.mock.calls.every(([params]) => params.id === 7)).toBe(true);
  });

  it('drops loaded pages, drafts, and labels when list permission is revoked and re-granted', async () => {
    const onchange = vi.fn();
    const settings = { value: [9], fetchSize: 1, multiple: true, title: 'Choose records', onchange };
    const { view, source } = mount(settings);
    await waitFor(() => expect(view.container.textContent).toContain('Row 9'));
    const trigger = view.getByRole('button', { name: /Edit/ });
    await waitFor(() => expect(trigger.hasAttribute('disabled')).toBe(false));
    await fireEvent.click(trigger);
    let dialog = within(await view.findByRole('dialog', { name: 'Choose records' }));
    await fireEvent.click(await dialog.findByRole('checkbox', { name: 'Row 1' }));
    await fireEvent.click(dialog.getByRole('button', { name: 'Load more' }));
    await dialog.findByRole('checkbox', { name: 'Row 2' });

    const callsBefore = vi.mocked(source.getList).mock.calls.length;
    await view.rerender({ access: { can: async () => ({ can: false }) } });
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(view.getByRole('button', { name: /Select/ }).hasAttribute('disabled')).toBe(true));
    expect(view.container.textContent).not.toContain('Row 9');
    expect(view.container.textContent).not.toContain('Row 1');
    await new Promise<void>(resolve => setTimeout(resolve, 30));
    expect(vi.mocked(source.getList).mock.calls.length).toBe(callsBefore);
    expect(onchange).not.toHaveBeenCalled();

    await view.rerender({ access: { can: async () => ({ can: true }) } });
    dialog = await open(view);
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Confirm' }).hasAttribute('disabled')).toBe(false));
    expect(dialog.queryByRole('checkbox', { name: 'Row 2' })).toBeNull();
    expect((await dialog.findByRole('checkbox', { name: 'Row 1' })).getAttribute('aria-checked')).toBe('false');
    expect(dialog.getByRole('textbox', { name: /Search/ })).toHaveProperty('value', '');
    expect(view.container.textContent).not.toContain('Row 9');
    expect(vi.mocked(source.getList).mock.calls.slice(callsBefore)
      .every(([params]) => params.pagination?.current === 1)).toBe(true);
    await fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
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
