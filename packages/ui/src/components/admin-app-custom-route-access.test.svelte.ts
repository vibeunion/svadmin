import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AccessControlProvider, CanParams, DataProvider, MenuItem, ResourceDefinition } from '@svadmin/core';
import { resetContext } from '@svadmin/core';
import AdminApp from './AdminApp.svelte';
import ProtectedReport from './admin-app-custom-route.test-page.svelte';

const resources = [{ name: 'posts', label: 'Posts', fields: [] }] satisfies ResourceDefinition[];

const menu: MenuItem[] = [
  { name: 'reports', label: 'Reports', href: '/reports', meta: { resource: 'reports', action: 'list' } },
  { name: 'notes', label: 'Notes', href: '/notes' },
];

function createDataProvider(): DataProvider {
  return {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: '1' } }),
    create: async () => ({ data: { id: '1' } }),
    update: async () => ({ data: { id: '1' } }),
    deleteOne: async () => ({ data: { id: '1' } }),
    getApiUrl: () => 'https://example.test',
  } as DataProvider;
}

beforeEach(() => {
  window.location.hash = '#/';
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
  resetContext();
});

afterEach(() => {
  cleanup();
  resetContext();
  window.location.hash = '#/';
});

function renderAt(path: string, accessControlProvider?: AccessControlProvider, pageRoutes = [
  { path: '/reports', component: ProtectedReport, title: 'Reports' },
  { path: '/notes', component: ProtectedReport, title: 'Notes' },
]) {
  window.location.hash = `#${path}`;
  return render(AdminApp, {
    dataProvider: createDataProvider(),
    resources,
    menu,
    pageRoutes,
    queryClientDefaultOptions: { queries: { retry: false } },
    ...(accessControlProvider ? { accessControlProvider } : {}),
  });
}

describe('AdminApp custom route permissions', () => {
  it('blocks a direct URL when the matching menu permission is denied', async () => {
    renderAt('/reports', { can: async () => ({ can: false }) });
    expect(await screen.findByText('Access restricted')).toBeTruthy();
    expect(screen.getByText('You do not have permission to perform this action')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Protected report' })).toBeNull();
  });

  it('renders the custom page when the inherited menu permission allows it', async () => {
    const calls: CanParams[] = [];
    renderAt('/reports', {
      can: async (request) => {
        calls.push(request);
        return { can: request.resource === 'reports' && request.action === 'list' };
      },
    });
    expect(await screen.findByRole('region', { name: 'Protected report' })).toBeTruthy();
    expect(screen.queryByText('Access restricted')).toBeNull();
    await waitFor(() => expect(calls.some((call) => call.resource === 'reports' && call.action === 'list')).toBe(true));
  });

  it('keeps a direct URL public when the menu item has no permission metadata', async () => {
    const calls: CanParams[] = [];
    renderAt('/notes', {
      can: async (request) => {
        calls.push(request);
        return { can: false };
      },
    });
    expect(await screen.findByRole('region', { name: 'Protected report' })).toBeTruthy();
    expect(calls.some((call) => call.resource === 'notes')).toBe(false);
  });

  it('checks the record id from a direct URL when the route declares idParam', async () => {
    const calls: CanParams[] = [];
    renderAt('/reports/42', {
      can: async (request) => {
        calls.push(request);
        return { can: request.params?.id === '42' };
      },
    }, [
      { path: '/reports/:id', component: ProtectedReport, access: { resource: 'reports', action: 'show', idParam: 'id' } },
    ]);
    expect(await screen.findByRole('region', { name: 'Protected report' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Protected report' }).textContent).toContain('42');
    await waitFor(() => expect(calls.some((call) => call.action === 'show' && call.params?.id === '42')).toBe(true));
  });

  it('fails closed when the permission check rejects', async () => {
    renderAt('/reports', { can: async () => { throw new Error('permission service unavailable'); } });
    expect(await screen.findByText('Permission check is unavailable. Please retry.')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Protected report' })).toBeNull();
  });
});
