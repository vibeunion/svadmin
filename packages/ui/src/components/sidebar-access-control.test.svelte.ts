import { render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import {
  resetContext,
  setAccessControlProvider,
  setResources,
  type AccessControlProvider,
  type CanParams,
  type CanResult,
  type MenuItem,
  type ResourceDefinition,
} from '@svadmin/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar.svelte';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    length: 0,
    clear: vi.fn(),
    getItem: vi.fn(() => null),
    key: vi.fn(() => null),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  } satisfies Storage);
});

afterEach(() => {
  resetContext();
  vi.unstubAllGlobals();
});

function renderSidebar(menu?: MenuItem[]) {
  return render(Sidebar, {
    collapsed: false,
    identity: null,
    title: 'Test Admin',
    onToggle: vi.fn(),
    onLogout: vi.fn(),
    menu,
  });
}

describe('Sidebar access control', () => {
  it('filters denied custom menu items before rendering and prunes empty groups', async () => {
    const permissionChecks: CanParams[] = [];
    const accessControlProvider: AccessControlProvider = {
      can: async (request) => {
        if (Array.isArray(request)) {
          return request.map(({ resource }) => ({ can: resource !== 'denied' }));
        }
        permissionChecks.push(request);
        return { can: request.resource !== 'denied' };
      },
    };
    setAccessControlProvider(accessControlProvider);

    renderSidebar([
      {
        name: 'catalog',
        label: 'Catalog',
        children: [
          {
            name: 'allowed',
            label: 'Allowed',
            href: '/allowed',
            meta: { resource: 'products', action: 'list' },
          },
          {
            name: 'denied',
            label: 'Denied',
            href: '/denied',
            meta: { resource: 'denied', action: 'list' },
          },
        ],
      },
      {
        name: 'empty-group',
        label: 'Empty Group',
        children: [
          {
            name: 'empty-denied',
            label: 'Empty Denied',
            href: '/empty-denied',
            meta: { resource: 'denied', action: 'show' },
          },
        ],
      },
      { name: 'public', label: 'Public', href: '/public' },
      {
        name: 'default-list-denied',
        label: 'Default List Denied',
        href: '/default-list-denied',
        meta: { resource: 'denied' },
      },
      { name: 'hidden', label: 'Hidden', href: '/hidden', meta: { hidden: true } },
    ]);

    expect(await screen.findByText('Allowed')).toBeTruthy();
    expect(screen.queryByText('Denied')).toBeNull();
    expect(screen.queryByText('Default List Denied')).toBeNull();
    expect(screen.queryByText('Empty Group')).toBeNull();
    expect(screen.queryByText('Hidden')).toBeNull();
    expect(screen.getByText('Catalog')).toBeTruthy();
    expect(screen.getByText('Public')).toBeTruthy();
    expect(permissionChecks
      .map(({ resource, action }) => `${resource}:${action}`)
      .sort()).toEqual([
      'denied:list',
      'denied:list',
      'denied:show',
      'products:list',
    ]);
  });

  it('keeps automatic resources filtered by their list permission', async () => {
    const resources = [
      { name: 'visible', label: 'Visible Resource', fields: [] },
      { name: 'denied', label: 'Denied Resource', fields: [] },
    ] satisfies ResourceDefinition[];
    setResources(resources);
    setAccessControlProvider({
      can: async (request) => {
        if (Array.isArray(request)) {
          return request.map(({ resource }) => ({ can: resource !== 'denied' }));
        }
        return { can: request.resource !== 'denied' };
      },
    });

    renderSidebar();

    expect(await screen.findByText('Visible Resource')).toBeTruthy();
    expect(screen.queryByText('Denied Resource')).toBeNull();
  });

  it('removes protected nested items when the access-control provider changes', async () => {
    setAccessControlProvider({ can: async () => ({ can: true }) });
    renderSidebar([
      {
        name: 'group',
        label: 'Group',
        children: [
          {
            name: 'protected-child',
            label: 'Protected Child',
            href: '/protected',
            meta: { resource: 'protected' },
          },
        ],
      },
    ]);

    expect(await screen.findByText('Protected Child')).toBeTruthy();

    setAccessControlProvider({ can: async () => ({ can: false }) });

    await waitFor(() => expect(screen.queryByText('Protected Child')).toBeNull());
  });

  it('ignores stale nested permission results after the provider changes', async () => {
    let resolveInitialAccess!: (result: CanResult) => void;
    const initialCan = vi.fn(
      () => new Promise<CanResult>((resolve) => { resolveInitialAccess = resolve; }),
    );
    setAccessControlProvider({ can: initialCan });
    renderSidebar([
      {
        name: 'group',
        label: 'Group',
        children: [
          {
            name: 'race-child',
            label: 'Race Child',
            href: '/race',
            meta: { resource: 'protected' },
          },
        ],
      },
      { name: 'public', label: 'Public', href: '/public' },
    ]);
    await waitFor(() => expect(initialCan).toHaveBeenCalledTimes(1));

    const denyCan = vi.fn(async () => ({ can: false }));
    setAccessControlProvider({ can: denyCan });
    await waitFor(() => expect(denyCan).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Public')).toBeTruthy();

    resolveInitialAccess({ can: true });
    // Let the superseded permission chain finish before checking that it cannot publish.
    await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    await tick();

    expect(screen.queryByText('Race Child')).toBeNull();
  });

  it('fails closed when a nested permission check rejects', async () => {
    setAccessControlProvider({
      can: async () => { throw new Error('permission service unavailable'); },
    });
    renderSidebar([
      {
        name: 'group',
        label: 'Group',
        children: [
          {
            name: 'protected-child',
            label: 'Protected Child',
            href: '/protected',
            meta: { resource: 'protected' },
          },
        ],
      },
      { name: 'public', label: 'Public', href: '/public' },
    ]);

    expect(await screen.findByText('Public')).toBeTruthy();
    expect(screen.queryByText('Protected Child')).toBeNull();
  });
});
