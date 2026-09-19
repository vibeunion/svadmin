import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
    getMany: vi.fn<NonNullable<DataProvider['getMany']>>(async ({ ids }) => ({
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
  onchange?: (value: string | number | null | (string | number)[]) => void;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  clients.push(queryClient);
  return render(Host, {
    provider: provider(),
    resources,
    queryClient,
    field: true,
    ...options,
  });
}

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
});

describe('ComboboxField', () => {
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
