import { describe, expect, it } from 'vitest';
import type { MenuItem } from '@svadmin/core';
import { resolveCustomRouteAccess } from './custom-route-access.js';

const menu: MenuItem[] = [
  {
    name: 'reports',
    label: 'Reports',
    href: '/reports',
    meta: { resource: 'reports', action: 'list' },
    children: [
      { name: 'public-note', label: 'Public note', href: '/reports/public-note' },
      {
        name: 'secret',
        label: 'Secret',
        href: '/reports/secret',
        meta: { resource: 'secrets', action: 'show' },
      },
    ],
  },
  { name: 'hidden', label: 'Hidden', href: '#/audit', meta: { resource: 'audit', hidden: true } },
];

describe('custom route access', () => {
  it('inherits the most specific menu permission for a direct path', () => {
    expect(resolveCustomRouteAccess({}, '/reports', menu)).toEqual({
      resource: 'reports',
      action: 'list',
    });
    expect(resolveCustomRouteAccess({}, '/reports/42', menu)).toEqual({
      resource: 'reports',
      action: 'list',
    });
    expect(resolveCustomRouteAccess({}, '/reports/secret', menu)).toEqual({
      resource: 'secrets',
      action: 'show',
    });
    expect(resolveCustomRouteAccess({}, '/audit?tab=1', menu)).toEqual({
      resource: 'audit',
      action: 'list',
    });
  });

  it('treats a more specific menu item without a resource as public', () => {
    expect(resolveCustomRouteAccess({}, '/reports/public-note', menu)).toBeUndefined();
    expect(resolveCustomRouteAccess({}, '/unknown', menu)).toBeUndefined();
  });

  it('lets an explicit route access override or disable menu inheritance', () => {
    expect(resolveCustomRouteAccess({
      access: { resource: 'reports', action: 'show', idParam: 'id' },
    }, '/reports/42', menu, { id: '42' })).toEqual({
      resource: 'reports',
      action: 'show',
      id: '42',
    });
    expect(resolveCustomRouteAccess({
      access: { resource: 'reports', id: 7 },
    }, '/reports', menu)).toEqual({
      resource: 'reports',
      action: 'list',
      id: 7,
    });
    expect(resolveCustomRouteAccess({ access: false }, '/reports', menu)).toBeUndefined();
  });
});
