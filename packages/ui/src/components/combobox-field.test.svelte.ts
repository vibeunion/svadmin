import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '@svadmin/core/i18n';
import { Type } from '@sinclair/typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { defineResource, resetContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
import Host from './select-contract.test-host.svelte';

const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
});
const resources: ResourceDefinition[] = [{
  name: 'posts',
  label: 'Posts',
  fields: [],
  contract: posts,
}];
const clients: QueryClient[] = [];

function provider(): DataProvider {
  return {
    getList: vi.fn(async () => ({
      data: [{ id: 1, title: 'First' }],
      total: 1,
    })),
    getMany: vi.fn(async ({ ids }) => ({
      data: ids.map(id => ({ id: Number(id), title: `Selected ${id}` })),
    })),
    getOne: async ({ id }) => ({ data: { id: Number(id), title: `Selected ${id}` } }),
    getApiUrl: () => '/api',
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
}

function mount(options: {
  value?: string | number | null | (string | number)[];
  multiple?: boolean;
  fetchSize?: number;
  onchange?: (value: string | number | null | (string | number)[]) => void;
} = {}, overrides: Partial<DataProvider> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  clients.push(queryClient);
  return render(Host, {
    provider: { ...provider(), ...overrides },
    resources,
    queryClient,
    field: true,
    ...options,
  });
}

beforeEach(() => setLocale('en'));
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
});

describe('ComboboxField', () => {
  it('retains search and previous pages when loading more and preserves cross-page selection', async () => {
    const getList = vi.fn<DataProvider['getList']>(async ({ pagination, filters }) => {
      const current = pagination?.current ?? 1;
      const searched = filters?.length ? 'Match' : 'Initial';
      return { data: Array.from({ length: current === 3 ? 1 : 10 }, (_, index) => ({
        id: (current - 1) * 10 + index + 1, title: `${searched} ${(current - 1) * 10 + index + 1}`,
      })), total: 21 };
    });
    const onchange = vi.fn();
    const view = mount({ fetchSize: 10, multiple: true, onchange }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await view.findByRole('option', { name: 'Initial 1' });
    await fireEvent.input(view.getByPlaceholderText('Search...'), { target: { value: 'Match' } });
    await view.findByRole('option', { name: 'Match 1' });
    expect(view.queryByRole('option', { name: 'Initial 1' })).toBeNull();
    await fireEvent.click(view.getByRole('option', { name: 'Match 1' }));
    await waitFor(() => expect(view.getByRole('button', { name: 'Load more' }).hasAttribute('disabled')).toBe(false));
    await fireEvent.click(view.getByRole('button', { name: 'Load more' }));
    await view.findByRole('option', { name: 'Match 11' });
    expect(getList).toHaveBeenLastCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 2, pageSize: 10 }),
      filters: [{ field: 'title', operator: 'contains', value: 'Match' }],
    }));
    expect(view.getAllByRole('option')).toHaveLength(20);
    await fireEvent.click(view.getByRole('option', { name: 'Match 11' }));
    expect(onchange).toHaveBeenLastCalledWith([1, 11]);
    await waitFor(() => expect(view.getByRole('button', { name: 'Load more' }).hasAttribute('disabled')).toBe(false));
    await fireEvent.click(view.getByRole('button', { name: 'Load more' }));
    await view.findByRole('option', { name: 'Match 21' });
    expect(view.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(view.getAllByRole('option')).toHaveLength(21);
  });

  it('retries a failed next page without skipping it', async () => {
    let fail = true;
    const getList = vi.fn<DataProvider['getList']>(async ({ pagination }) => {
      if (pagination?.current === 2 && fail) throw new Error('PRIVATE');
      const id = pagination?.current ?? 1;
      return { data: [{ id, title: `Page ${id}` }], total: 20 };
    });
    const view = mount({ fetchSize: 10 }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await view.findByRole('option', { name: 'Page 1' });
    await fireEvent.click(view.getByRole('button', { name: 'Load more' }));
    await view.findByRole('alert');
    expect(view.queryByText('PRIVATE')).toBeNull();
    expect(view.queryByRole('button', { name: 'Load more' })).toBeNull();
    fail = false;
    await fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    await view.findByRole('option', { name: 'Page 2' });
    expect(view.getByRole('option', { name: 'Page 1' })).toBeTruthy();
    expect(getList).toHaveBeenLastCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 2 }),
    }));
  });

  it('drops accumulated and late pages when the tenant changes', async () => {
    let finish!: (value: { data: { id: number; title: string }[]; total: number }) => void;
    const pending = new Promise<{ data: { id: number; title: string }[]; total: number }>(resolve => { finish = resolve; });
    const getList = vi.fn<DataProvider['getList']>()
      .mockResolvedValueOnce({ data: [{ id: 1, title: 'Old first' }], total: 20 })
      .mockImplementationOnce(() => pending)
      .mockResolvedValue({ data: [{ id: 3, title: 'New tenant' }], total: 1 });
    const view = mount({ fetchSize: 10 }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await view.findByRole('option', { name: 'Old first' });
    await fireEvent.click(view.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(2));
    await view.rerender({ tenant: 'second' });
    await waitFor(() => expect(view.getByRole('button', { name: 'Record' }).getAttribute('aria-expanded')).toBe('false'));
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await view.findByRole('option', { name: 'New tenant' });
    await act(async () => { finish({ data: [{ id: 2, title: 'Old late' }], total: 20 }); await pending; });
    expect(view.queryByRole('option', { name: 'Old first' })).toBeNull();
    expect(view.queryByRole('option', { name: 'Old late' })).toBeNull();
    expect(view.getAllByRole('option')).toHaveLength(1);
  });

  it.each([undefined, 0, Infinity, 201])('uses bounded default page size for %s', async fetchSize => {
    const getList = vi.fn<DataProvider['getList']>(async () => ({ data: [], total: 0 }));
    const view = mount(fetchSize === undefined ? {} : { fetchSize }, { getList });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    await waitFor(() => expect(getList).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 1, pageSize: 50 }),
    })));
  });

  it('localizes search and empty state', async () => {
    setLocale('zh-CN');
    const view = mount({}, { getList: async () => ({ data: [], total: 0 }) });
    await fireEvent.click(view.getByRole('button', { name: 'Record' }));
    expect(view.getByPlaceholderText('搜索...')).toBeTruthy();
    await view.findByText('无匹配结果。');
  });

  it('supports controlled multi-select while keeping the menu open', async () => {
    const changes: (string | number | null | (string | number)[])[] = [];
    const view = mount({ multiple: true, onchange: value => changes.push(value) });

    const trigger = await view.findByRole('button', { name: 'Record' });
    await fireEvent.click(trigger);
    const first = await view.findByRole('option', { name: 'First' });
    await fireEvent.click(first);

    expect(changes).toEqual([[1]]);
    expect(view.getByRole('listbox')).toBeTruthy();

    await waitFor(() => expect(view.getByRole('button', { name: 'Record' }).textContent).toContain('First'));
    await fireEvent.click(view.getByRole('option', { name: 'First' }));
    expect(changes).toEqual([[1], []]);
  });

  it('loads selected records separately so a filtered list does not lose the selection', async () => {
    const view = mount({ value: [2], multiple: true });

    const trigger = await view.findByRole('button', { name: 'Record' });
    await fireEvent.click(trigger);
    await waitFor(() => expect(view.getByRole('option', { name: 'First' })).toBeTruthy());
    expect(view.getByRole('option', { name: 'Selected 2' })).toBeTruthy();
  });

  it('clears all selected values with one explicit action', async () => {
    const changes: (string | number | null | (string | number)[])[] = [];
    const view = mount({ value: [2], multiple: true, onchange: value => changes.push(value) });

    await view.findByRole('button', { name: 'Record' });
    await fireEvent.click(view.getByRole('button', { name: /clear/i }));
    expect(changes).toEqual([[]]);
  });
});
