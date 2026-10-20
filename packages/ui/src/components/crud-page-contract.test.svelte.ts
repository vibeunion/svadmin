import { cleanup, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Type } from 'typebox';
import { QueryClient } from '@tanstack/svelte-query';
import { defineResource, resetContext, type DataProvider, type ResourceDefinition, type RouterProvider } from '@svadmin/core';
import Host from './crud-page-contract.test-host.svelte';

const record = Type.Object({ id: Type.Number(), title: Type.String() });
const posts = defineResource('posts', {
  record,
  create: Type.Object({ title: Type.String() }),
  update: Type.Object({ title: Type.Optional(Type.String()) }),
});
const resources: ResourceDefinition[] = [{
  name: 'posts',
  label: 'Posts',
  contract: posts,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  fields: [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'title', label: 'Title', type: 'text' },
  ],
}];

function provider(): DataProvider {
  return {
    getApiUrl: () => '/api',
    getList: vi.fn(async () => ({ data: [{ id: 1, title: 'First post' }], total: 1 })),
    getOne: vi.fn(async ({ id }) => ({ data: { id: Number(id), title: 'First post' } })),
    create: vi.fn(async () => ({ data: { id: 2, title: 'Created post' } })),
    update: vi.fn(async () => ({ data: { id: 1, title: 'Updated post' } })),
    deleteOne: vi.fn(async () => ({ data: { id: 1 } })),
  };
}

function router(): RouterProvider {
  return {
    go: vi.fn(),
    back: vi.fn(),
    parse: () => ({ pathname: '/posts', params: {} }),
  };
}

function mount(page: 'list' | 'create' | 'edit') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(Host, { page, provider: provider(), resources, queryClient: client, router: router() });
  return { view, client };
}

afterEach(() => {
  cleanup();
  resetContext();
});

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

describe('CRUD page composition contract', () => {
  it('keeps list page regions ordered around one resource table', async () => {
    const { view } = mount('list');

    await view.findByRole('heading', { level: 1, name: 'Posts' });
    const page = view.container.querySelector('[data-svadmin-list-page="posts"]');
    expect(page).toBeTruthy();
    expect(page?.querySelector('[data-svadmin-list-page-status-tabs]')).toBeTruthy();
    expect(page?.querySelector('[data-svadmin-list-page-filter-toolbar]')).toBeTruthy();
    expect(page?.querySelector('[data-svadmin-list-page-table]')).toBeTruthy();
    expect(page?.querySelector('[data-svadmin-list-page-status-tabs]')?.nextElementSibling)
      .toBe(page?.querySelector('[data-svadmin-list-page-filter-toolbar]'));
    expect(view.getByRole('table')).toBeTruthy();
  });

  it('keeps create form actions inside the page form and preserves list recovery', async () => {
    const { view } = mount('create');

    await view.findByRole('textbox', { name: /^Title/ });
    expect(view.container.querySelector('[data-svadmin-crud-page="create"]')).toBeTruthy();
    const action = view.getByTestId('custom-form-action');
    expect(action.closest('[data-svadmin-crud-page-form]')).toBeTruthy();
    expect(view.queryByRole('button', { name: /^Save$/i })).toBeNull();

    const back = view.getByRole('button', { name: 'Back to List' });
    expect(back).toBeTruthy();
  });

  it('exposes edit context and destructive header actions without duplicating form submit', async () => {
    const { view } = mount('edit');

    await view.findByRole('textbox', { name: /^Title/ });
    const page = view.container.querySelector('[data-svadmin-crud-page="edit"]');
    expect(page?.getAttribute('data-svadmin-record-id')).toBe('1');
    expect(view.getByTestId('custom-form-action').closest('[data-svadmin-crud-page-form]')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Back to List' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Detail' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Refresh' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(view.queryByRole('button', { name: /^Save$/i })).toBeNull();
  });
});
