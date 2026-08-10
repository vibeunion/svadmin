import { render, screen } from '@testing-library/svelte';
import {
  resetContext,
  setAccessControlProvider,
  setResources,
  type AccessControlProvider,
  type CanParams,
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

    expect(screen.queryByText('Denied')).toBeNull();
    expect(screen.queryByText('Default List Denied')).toBeNull();
    expect(screen.queryByText('Empty Group')).toBeNull();
    expect(screen.queryByText('Hidden')).toBeNull();
    expect(await screen.findByText('Allowed')).toBeTruthy();
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
});
