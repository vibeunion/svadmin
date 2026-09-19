import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { Type } from '@sinclair/typebox';
import type { ComponentProps } from 'svelte';
import { defineResource, resetContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
import Host from './resource-workspace.test-host.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String() });
const resources: ResourceDefinition[] = ['posts', 'other'].map(name => ({
  name, label: name, contract: defineResource(name, { record }),
  canCreate: false, canEdit: false, canShow: false, canDelete: false,
  fields: [{ key: 'id', label: 'ID', type: 'number' }, {
    key: 'title', label: 'Title', type: 'text', searchable: true,
  }],
}));
const clients: QueryClient[] = [];
function mount(options: Partial<Pick<ComponentProps<typeof Host>, 'workspaceStyle' | 'tableProps'>> = {}) {
  const source: DataProvider = {
    getApiUrl: () => '/api',
    getList: vi.fn(async ({ pagination }) => ({
      data: [{ id: pagination?.current ?? 1, title: `Page ${pagination?.current ?? 1} record` }], total: 30,
    })),
    getOne: async () => ({ data: { id: 1, title: 'Detail' } }),
    create: vi.fn(async () => ({ data: {} })),
    update: vi.fn(async () => ({ data: {} })),
    deleteOne: vi.fn(async () => ({ data: {} })),
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  const onBatch = vi.fn();
  const view = render(Host, { provider: source, resources, queryClient: client, onBatch, ...options });
  return { view, source, onBatch };
}
beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true, value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  resetContext();
  vi.restoreAllMocks();
});

describe('ResourceOperationsPage real table composition', () => {
  it.each([
    'inventory', 'operations', 'orders', 'people', 'calendar', 'communications', 'crm',
    'property', 'ai', 'store', 'planning', 'generation', 'billing', 'security', 'referral',
  ] as const)('forwards table configuration and batch actions in the %s layout', async (workspaceStyle) => {
    const app = mount({ workspaceStyle, tableProps: { pagination: { current: 2, pageSize: 5 }, title: 'Configured list' } });
    await app.view.findAllByText('Page 2 record');
    expect(app.view.getByRole('heading', { name: 'Configured list' })).toBeTruthy();
    await fireEvent.click(app.view.getByRole('checkbox', { name: /Select all/i }));
    await fireEvent.click(app.view.getByRole('button', { name: 'Process selection' }));
    expect(app.onBatch).toHaveBeenLastCalledWith([2]);
  });

  it('passes controlled pagination and sorting to the provider and keeps search functional', async () => {
    const app = mount();
    await app.view.findAllByText('Page 1 record');
    await app.view.rerender({ tableProps: { pagination: { current: 2, pageSize: 5 }, sorters: [{ field: 'title', order: 'desc' }] } });
    await waitFor(() => expect(app.source.getList).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'posts', pagination: expect.objectContaining({ current: 2, pageSize: 5 }),
      sorters: [{ field: 'title', order: 'desc' }],
    })));
    await app.view.findAllByText('Page 2 record');
    expect(app.view.queryAllByText('Page 1 record')).toHaveLength(0);
    await fireEvent.input(app.view.getByPlaceholderText(/Search/), { target: { value: 'needle' } });
    await waitFor(() => expect(app.source.getList).toHaveBeenCalledWith(expect.objectContaining({
      filters: [{ field: 'title', operator: 'contains', value: 'needle' }],
    })));
    await app.view.findAllByText('Page 1 record');
  });

  it('passes cross-page selection to business batch actions and clears it on tenant change', async () => {
    const app = mount();
    await app.view.findAllByText('Page 1 record');
    await fireEvent.click(app.view.getByRole('checkbox', { name: /Select all/i }));
    await fireEvent.click(app.view.getByRole('button', { name: 'Process selection' }));
    expect(app.onBatch).toHaveBeenLastCalledWith([1]);
    await app.view.rerender({ tableProps: { pagination: { current: 2, pageSize: 10 } } });
    await waitFor(() => expect(app.source.getList).toHaveBeenCalledWith(expect.objectContaining({
      pagination: expect.objectContaining({ current: 2 }),
    })));
    await app.view.findAllByText('Page 2 record');
    await fireEvent.click(app.view.getByRole('checkbox', { name: /Select all/i }));
    await fireEvent.click(app.view.getByRole('button', { name: 'Process selection' }));
    expect(app.onBatch).toHaveBeenLastCalledWith([1, 2]);
    await app.view.rerender({ tenant: 'second' });
    await waitFor(() => expect(app.view.queryByRole('button', { name: 'Process selection' })).toBeNull());
    expect(app.source.create).not.toHaveBeenCalled();
    expect(app.source.deleteOne).not.toHaveBeenCalled();
  });

  it('removes cached records and custom batch actions when list permission is revoked', async () => {
    const app = mount();
    await app.view.findAllByText('Page 1 record');
    await fireEvent.click(app.view.getByRole('checkbox', { name: /Select all/i }));
    await app.view.rerender({ access: { can: async () => ({ can: false }) } });
    await app.view.findByRole('alert');
    expect(app.view.queryAllByText('Page 1 record')).toHaveLength(0);
    expect(app.view.queryByRole('button', { name: 'Process selection' })).toBeNull();
  });

  it('keeps resource identity owned by the workspace even with an untyped table override', async () => {
    const app = mount();
    await app.view.findAllByText('Page 1 record');
    const tableProps = { pagination: { current: 2, pageSize: 5 } };
    Reflect.set(tableProps, 'resourceName', 'other');
    await app.view.rerender({ tableProps });
    await waitFor(() => expect(app.source.getList).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'posts', pagination: expect.objectContaining({ current: 2 }),
    })));
    await app.view.findAllByText('Page 2 record');
    expect(vi.mocked(app.source.getList).mock.calls.every(([params]) => params.resource === 'posts')).toBe(true);
  });
});
