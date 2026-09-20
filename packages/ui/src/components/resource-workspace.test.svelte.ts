import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { Type } from '@sinclair/typebox';
import type { ComponentProps } from 'svelte';
import { defineResource, resetContext, type DataProvider, type ResourceDefinition } from '@svadmin/core';
import { setLocale } from '@svadmin/core/i18n';
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
function mount(options: Partial<Pick<ComponentProps<typeof Host>, 'workspaceStyle' | 'tableProps'>> = {}, overrides: Partial<DataProvider> = {}) {
  const source: DataProvider = {
    getApiUrl: () => '/api',
    getList: vi.fn(async ({ pagination }) => ({
      data: [{ id: pagination?.current ?? 1, title: `Page ${pagination?.current ?? 1} record` }], total: 30,
    })),
    getOne: async () => ({ data: { id: 1, title: 'Detail' } }),
    create: vi.fn(async () => ({ data: {} })),
    update: vi.fn(async () => ({ data: {} })),
    deleteOne: vi.fn(async () => ({ data: {} })),
    ...overrides,
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  const onBatch = vi.fn();
  const onSelection = vi.fn();
  const view = render(Host, { provider: source, resources, queryClient: client, onBatch, onSelection, ...options });
  return { view, source, onBatch, onSelection };
}
beforeEach(() => {
  setLocale('en');
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
  it('does not read destroyed table derivations after unmount and late query settlement', async () => {
    let resolveOld!: (page: { data: { id: number; title: string }[]; total: number }) => void;
    const getList = vi.fn<DataProvider['getList']>(() => new Promise(resolve => { resolveOld = resolve; }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = mount({}, { getList });
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
    app.view.unmount();
    resolveOld({ data: [{ id: 77, title: 'Late destroyed record' }], total: 1 });
    await new Promise(resolve => setTimeout(resolve, 30));
    const output = [...warn.mock.calls, ...error.mock.calls].flat().join(' ');
    expect(output).not.toContain('derived_inert');
    expect(output).not.toContain('Late destroyed record');
  });

  it('keeps the current tenant usable when the previous query fails late', async () => {
    let rejectOld!: (error: Error) => void;
    const oldResponse = new Promise<never>((_, reject) => { rejectOld = reject; });
    const getList = vi.fn<DataProvider['getList']>()
      .mockImplementationOnce(() => oldResponse)
      .mockResolvedValue({ data: [{ id: 8, title: 'Current tenant record' }], total: 1 });
    const app = mount({}, { getList });
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
    await app.view.rerender({ tenant: 'second' });
    await app.view.findAllByText('Current tenant record');
    rejectOld(new Error('PRIVATE_PREVIOUS_TENANT_ERROR'));
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(app.view.queryByRole('alert')).toBeNull();
    expect(app.view.queryByText('PRIVATE_PREVIOUS_TENANT_ERROR')).toBeNull();
    expect(app.view.getAllByText('Current tenant record').length).toBeGreaterThan(0);
    await fireEvent.click(app.view.getByRole('checkbox', { name: /Select all/i }));
    await fireEvent.click(app.view.getByRole('button', { name: 'Process selection' }));
    expect(app.onBatch).toHaveBeenLastCalledWith([8]);
  });

  it('does not restore records or batch actions when a query finishes after permission revocation', async () => {
    type Page = { data: { id: number; title: string }[]; total: number };
    let resolveOld!: (page: Page) => void;
    const oldResponse = new Promise<Page>(resolve => { resolveOld = resolve; });
    const getList = vi.fn<DataProvider['getList']>(() => oldResponse);
    const app = mount({}, { getList });
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
    await app.view.rerender({ access: { can: async () => ({ can: false }) } });
    await app.view.findByRole('alert');
    resolveOld({ data: [{ id: 99, title: 'Revoked private record' }], total: 1 });
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(app.view.getByRole('alert')).toBeTruthy();
    expect(app.view.queryAllByText('Revoked private record')).toHaveLength(0);
    expect(app.view.queryByRole('button', { name: 'Process selection' })).toBeNull();
    expect(app.view.queryByRole('checkbox', { name: /Select all/i })).toBeNull();
    expect(app.onBatch).not.toHaveBeenCalled();
    expect(getList).toHaveBeenCalledTimes(1);
  });

  it.each(['tenant', 'provider'] as const)('ignores a late previous-%s response after switching context', async change => {
    type Page = { data: { id: number; title: string }[]; total: number };
    let resolveOld!: (page: Page) => void;
    const oldResponse = new Promise<Page>(resolve => { resolveOld = resolve; });
    const getList = vi.fn<DataProvider['getList']>()
      .mockImplementationOnce(() => oldResponse)
      .mockResolvedValue({ data: [{ id: 8, title: 'Current context record' }], total: 1 });
    const app = mount({}, { getList });
    await waitFor(() => expect(getList).toHaveBeenCalledTimes(1));
    if (change === 'tenant') {
      await app.view.rerender({ tenant: 'second' });
    } else {
      await app.view.rerender({ provider: {
        ...app.source,
        getList: vi.fn(async () => ({ data: [{ id: 8, title: 'Current context record' }], total: 1 })),
      } });
    }
    await app.view.findAllByText('Current context record');
    resolveOld({ data: [{ id: 99, title: 'Private old context record' }], total: 1 });
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(app.view.queryAllByText('Private old context record')).toHaveLength(0);
    expect(app.view.getAllByText('Current context record').length).toBeGreaterThan(0);
    await fireEvent.click(app.view.getByRole('checkbox', { name: /Select all/i }));
    await fireEvent.click(app.view.getByRole('button', { name: 'Process selection' }));
    expect(app.onBatch).toHaveBeenLastCalledWith([8]);
    expect(app.source.create).not.toHaveBeenCalled();
    expect(app.source.deleteOne).not.toHaveBeenCalled();
  });

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

  it('keeps page deselection local and exposes selected IDs on the current page', async () => {
    const app = mount();
    await app.view.findAllByText('Page 1 record');
    await fireEvent.click(app.view.getByRole('checkbox', { name: /Select all on this page/i }));
    expect(app.view.queryByRole('button', { name: /Select all matching/i })).toBeNull();
    await app.view.rerender({ tableProps: { pagination: { current: 2, pageSize: 10 } } });
    await app.view.findAllByText('Page 2 record');
    await fireEvent.click(app.view.getByRole('checkbox', { name: /Select all on this page/i }));
    await fireEvent.click(app.view.getByRole('button', { name: 'Process selection' }));
    expect(app.onSelection).toHaveBeenLastCalledWith({
      scope: 'selected', ids: [1, 2], currentPageIds: [2],
    });
    await fireEvent.click(app.view.getByRole('checkbox', { name: /Select all on this page/i }));
    await fireEvent.click(app.view.getByRole('button', { name: 'Process selection' }));
    expect(app.onSelection).toHaveBeenLastCalledWith({
      scope: 'selected', ids: [1], currentPageIds: [],
    });
  });

  it('passes all matches as a query without IDs or pagination and disables built-in batch deletion', async () => {
    const tableProps = { allowSelectAllMatching: true };
    const app = mount({ tableProps });
    await app.view.rerender({ resources: resources.map(resource => ({ ...resource, canDelete: true })) });
    await app.view.findAllByText('Page 1 record');
    await fireEvent.input(app.view.getByPlaceholderText(/Search/), { target: { value: 'needle' } });
    await waitFor(() => expect(app.source.getList).toHaveBeenLastCalledWith(expect.objectContaining({
      filters: [{ field: 'title', operator: 'contains', value: 'needle' }],
    })));
    await app.view.findAllByText('Page 1 record');
    await fireEvent.click(app.view.getByRole('checkbox', { name: /Select all on this page/i }));
    await fireEvent.click(await app.view.findByRole('button', { name: /Select all matching/i }));
    await fireEvent.click(app.view.getByRole('button', { name: 'Process selection' }));
    expect(app.onBatch).toHaveBeenLastCalledWith([]);
    expect(app.onSelection).toHaveBeenLastCalledWith({
      scope: 'all', total: 30, excludedIds: [], filters: [{ field: 'title', operator: 'contains', value: 'needle' }], sorters: [],
    });
    expect(app.view.queryByRole('button', { name: /Batch Delete/i })).toBeNull();
    expect(app.view.getAllByRole('checkbox', { name: /Select record/i }).every(
      input => input.getAttribute('aria-checked') === 'true' && !input.hasAttribute('disabled')
    )).toBe(true);
    await fireEvent.click(app.view.getAllByRole('checkbox', { name: /Select record 1/i })[0]!);
    await fireEvent.click(app.view.getByRole('button', { name: 'Process selection' }));
    expect(app.onSelection).toHaveBeenLastCalledWith(expect.objectContaining({
      scope: 'all', excludedIds: [1], total: 30,
    }));
    expect(app.view.getAllByRole('checkbox', { name: /Select record 1/i })[0]!.getAttribute('aria-checked')).toBe('false');
    await app.view.rerender({ tableProps: { ...tableProps, pagination: { current: 2, pageSize: 10 } } });
    await app.view.findAllByText('Page 2 record');
    await fireEvent.click(app.view.getByRole('button', { name: 'Process selection' }));
    expect(app.onSelection).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'all', total: 30, excludedIds: [1] }));
    await app.view.rerender({ tableProps: { ...tableProps, pagination: { current: 1, pageSize: 10 } } });
    await app.view.findAllByText('Page 1 record');
    expect(app.view.getAllByRole('checkbox', { name: /^Select record 1$/i })[0]!.getAttribute('aria-checked')).toBe('false');
    await fireEvent.click(app.view.getAllByRole('checkbox', { name: /^Select record 1$/i })[0]!);
    await fireEvent.click(app.view.getByRole('button', { name: 'Process selection' }));
    expect(app.onSelection).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'all', excludedIds: [] }));
    await fireEvent.click(app.view.getByRole('button', { name: /Clear selection/i }));
    expect(app.view.queryByRole('button', { name: 'Process selection' })).toBeNull();
    expect(app.source.deleteOne).not.toHaveBeenCalled();
  });

  it.each(['selected', 'all'] as const)('clears %s selection when search changes', async scope => {
    const app = mount({ tableProps: { allowSelectAllMatching: true } });
    await app.view.findAllByText('Page 1 record');
    await fireEvent.click(app.view.getByRole('checkbox', { name: /Select all on this page/i }));
    if (scope === 'all') await fireEvent.click(app.view.getByRole('button', { name: /Select all matching/i }));
    await fireEvent.input(app.view.getByPlaceholderText(/Search/), { target: { value: 'changed' } });
    await waitFor(() => expect(app.source.getList).toHaveBeenLastCalledWith(expect.objectContaining({
      filters: [{ field: 'title', operator: 'contains', value: 'changed' }],
    })));
    expect(app.view.queryByRole('button', { name: 'Process selection' })).toBeNull();
    expect(app.view.container.querySelector('[data-svadmin-batch-toolbar]')).toBeNull();
  });

  it.each(['tenant', 'optOut', 'selectable', 'permission'] as const)('clears all-matching selection on %s change', async change => {
    const app = mount({ tableProps: { allowSelectAllMatching: true } });
    await app.view.findAllByText('Page 1 record');
    await fireEvent.click(app.view.getByRole('checkbox', { name: /Select all on this page/i }));
    await fireEvent.click(app.view.getByRole('button', { name: /Select all matching/i }));
    if (change === 'tenant') await app.view.rerender({ tenant: 'second' });
    else if (change === 'permission') await app.view.rerender({ access: { can: async () => ({ can: false }) } });
    else await app.view.rerender({ tableProps: change === 'optOut' ? {} : { allowSelectAllMatching: true, selectable: false } });
    await waitFor(() => expect(app.view.container.querySelector('[data-svadmin-batch-toolbar]')).toBeNull());
    expect(app.onBatch).not.toHaveBeenCalled();
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
