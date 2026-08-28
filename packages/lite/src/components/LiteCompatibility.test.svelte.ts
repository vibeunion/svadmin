import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MenuItem, ResourceDefinition, Role } from '@svadmin/core';
import LitePermissionMatrix from './LitePermissionMatrix.svelte';
import LiteShow from './LiteShow.svelte';
import LiteTable from './LiteTable.svelte';
import LiteVirtualTable from './advanced/LiteVirtualTable.svelte';
import LiteBooleanField from './fields/LiteBooleanField.svelte';
import LiteDateField from './fields/LiteDateField.svelte';
import LiteImageField from './fields/LiteImageField.svelte';
import LiteMultiSelectField from './fields/LiteMultiSelectField.svelte';
import LiteSelectField from './fields/LiteSelectField.svelte';
import LiteRefreshButton from './buttons/LiteRefreshButton.svelte';
import LiteCatchAllNavigate from './layout/LiteCatchAllNavigate.svelte';
import LiteNavigateToResource from './layout/LiteNavigateToResource.svelte';
import LiteSidebar from './layout/LiteSidebar.svelte';
import LiteEditPage from './pages/LiteEditPage.svelte';
import LiteListPage from './pages/LiteListPage.svelte';
import LiteShowPage from './pages/LiteShowPage.svelte';
import LiteAnomalyBadge from './widgets/LiteAnomalyBadge.svelte';

vi.mock('@svadmin/core/i18n', () => ({
  t: (key: string) => key,
}));

const resource: ResourceDefinition = {
  name: 'posts',
  label: 'Posts',
  fields: [{ key: 'id', label: 'ID', type: 'number' }],
};

afterEach(() => {
  document.head.querySelectorAll('meta[http-equiv="refresh"]').forEach((node) => node.remove());
});

describe('Lite no-JavaScript navigation', () => {
  it('renders refresh as a native reload link', () => {
    const { container } = render(LiteRefreshButton);

    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('a')?.getAttribute('href')).toBe('');
  });

  it('renders redirects in the document head with clickable fallbacks', () => {
    const resourceView = render(LiteNavigateToResource, {
      resource: 'posts',
      basePath: '/backoffice',
    });
    expect(document.head.querySelector('meta[http-equiv="refresh"]')?.getAttribute('content'))
      .toBe('0; url=/backoffice/posts');
    expect(resourceView.container.querySelector('a')?.getAttribute('href')).toBe('/backoffice/posts');
    resourceView.unmount();

    const catchAllView = render(LiteCatchAllNavigate, {
      basePath: '/backoffice',
      defaultResource: 'users',
    });
    expect(document.head.querySelector('meta[http-equiv="refresh"]')?.getAttribute('content'))
      .toBe('0; url=/backoffice/users');
    expect(catchAllView.container.querySelector('a')?.getAttribute('href')).toBe('/backoffice/users');
  });

  it('opens row deletion confirmation through an IE11-compatible fragment', () => {
    const { container } = render(LiteTable, {
      records: [{ id: 7 }],
      resource: {
        ...resource,
        canShow: false,
        canEdit: false,
      },
    });

    expect(container.querySelector('details')).toBeNull();
    const confirmation = container.querySelector('.lite-confirm-target');
    expect(confirmation?.id).toBeTruthy();
    expect(container.querySelector(`a[href="#${confirmation?.id}"]`)).not.toBeNull();
    expect(confirmation?.querySelector('form')?.getAttribute('action')).toBe('?/delete');
    expect(confirmation?.querySelector(`a[href="#${confirmation?.id}-closed"]`)).not.toBeNull();
    expect(confirmation?.getAttribute('role')).toBe('dialog');
  });
});

describe('Lite ResourceDefinition permissions', () => {
  it('inherits show/edit/delete flags in row actions', () => {
    const { container } = render(LiteTable, {
      records: [{ id: 1 }],
      resource: {
        ...resource,
        canShow: false,
        canEdit: false,
        canDelete: false,
      },
    });

    expect(container.querySelector('a[href*="/show/"]')).toBeNull();
    expect(container.querySelector('a[href*="/edit/"]')).toBeNull();
    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('th:last-child')?.textContent).not.toContain('common.actions');

    const showView = render(LiteShow, {
      record: { id: 1 },
      resource: { ...resource, canEdit: false },
    });
    expect(showView.container.querySelector('a[href*="/edit/"]')).toBeNull();
    showView.unmount();

    const virtualView = render(LiteVirtualTable, {
      records: [{ id: 1 }],
      resource: {
        ...resource,
        canShow: false,
        canEdit: false,
        canDelete: false,
      },
    });
    expect(virtualView.container.querySelector('a[href*="/show/"]')).toBeNull();
    expect(virtualView.container.querySelector('a[href*="/edit/"]')).toBeNull();
    expect(virtualView.container.querySelector('details')).toBeNull();
  });

  it('normalizes boolean and numeric option values in list rendering', () => {
    const typedResource: ResourceDefinition = {
      name: 'members',
      label: 'Members',
      fields: [
        { key: 'active', label: 'Active', type: 'boolean' },
        { key: 'role', label: 'Role', type: 'select', options: [{ label: 'Admin', value: 1 }] },
      ],
      canShow: false,
      canEdit: false,
      canDelete: false,
    };
    const { container } = render(LiteTable, {
      records: [{ id: 1, active: 'false', role: '1' }],
      resource: typedResource,
    });

    expect(container.querySelector('.lite-bool-true')).toBeNull();
    expect(container.textContent).toContain('Admin');
  });

  it('inherits resource flags across list, edit, and show pages', () => {
    const lockedResource: ResourceDefinition = {
      ...resource,
      canCreate: false,
      canShow: false,
      canEdit: false,
      canDelete: false,
    };
    const listView = render(LiteListPage, {
      resource: lockedResource,
      records: [{ id: 1 }],
      total: 1,
      pagination: { page: 1, perPage: 10 },
    });
    expect(listView.container.querySelector('a[href$="/create"]')).toBeNull();
    expect(listView.container.querySelector('a[href*="/show/"]')).toBeNull();
    expect(listView.container.querySelector('a[href*="/edit/"]')).toBeNull();
    expect(listView.container.querySelector('details')).toBeNull();
    expect(listView.container.querySelector('.lite-table-scroll')).not.toBeNull();
    listView.unmount();

    const editView = render(LiteEditPage, {
      resource: lockedResource,
      record: { id: 1 },
    });
    expect(editView.container.querySelector('a[href*="/show/"]')).toBeNull();
    expect(editView.container.querySelector('details')).toBeNull();
    editView.unmount();

    const showView = render(LiteShowPage, {
      resource: lockedResource,
      record: { id: 1 },
    });
    expect(showView.container.querySelector('a[href*="/edit/"]')).toBeNull();
    expect(showView.container.querySelector('details')).toBeNull();
  });

  it('does not reveal fallback resources when a custom menu is fully filtered', () => {
    const menu: MenuItem[] = [
      { name: 'hidden', label: 'Hidden', href: '/hidden', meta: { hidden: true } },
      {
        name: 'restricted-group',
        label: 'Restricted group',
        children: [
          { name: 'restricted', label: 'Restricted', href: '/restricted', meta: { resource: 'posts' } },
        ],
      },
    ];
    const { container } = render(LiteSidebar, {
      resources: [resource],
      menu,
      canAccess: () => { throw new Error('permission service unavailable'); },
    });

    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(container.textContent).not.toContain('Posts');
    expect(container.textContent).not.toContain('Hidden');
    expect(container.textContent).not.toContain('Restricted group');
    expect(container.textContent).not.toContain('Restricted');
  });

  it('keeps explicit empty-children entries as navigable leaves', () => {
    const { container } = render(LiteSidebar, {
      resources: [],
      menu: [{ name: 'posts', label: 'Posts', children: [] }],
      basePath: '/lite',
    });

    expect(container.querySelector('a')?.getAttribute('href')).toBe('/lite/posts');
    expect(container.textContent).toContain('Posts');
  });

  it('filters automatic resources through the server-computed access callback', () => {
    const { container } = render(LiteSidebar, {
      resources: [resource],
      canAccess: () => false,
    });

    expect(container.querySelectorAll('a')).toHaveLength(0);
  });
});

describe('Lite AuthProvider permission types', () => {
  it('prefers core identifiers when records also contain legacy-shaped fields', () => {
    const roles: Role[] = [{ id: 'role-uuid', name: 'Administrators', code: 'admin' }];
    const coreResource: ResourceDefinition & { code: string } = {
      ...resource,
      label: 'Blog posts',
      code: 'legacy-post-code',
    };
    const { container } = render(LitePermissionMatrix, {
      roles,
      resources: [coreResource],
      actions: [{ code: 'read', name: 'Read' }, { code: 'edit', name: 'Edit' }],
      permissions: { posts: ['read'] },
    });

    expect(container.querySelector<HTMLAnchorElement>('a[href="?role=role-uuid"]')).not.toBeNull();
    expect(container.querySelector<HTMLInputElement>('input[name="role"]')?.value).toBe('role-uuid');
    expect(container.querySelector<HTMLInputElement>('input[name="perm_posts_read"]')?.checked).toBe(true);
    expect(container.querySelector<HTMLInputElement>('input[name="perm_posts_edit"]')?.checked).toBe(false);
    expect(container.querySelector<HTMLInputElement>('input[name="perm_legacy-post-code_read"]')).toBeNull();
    expect(container.textContent).toContain('Blog posts');
  });
});

describe('Lite widget parity', () => {
  it('treats a non-zero value against a zero baseline as an anomaly', () => {
    const { container } = render(LiteAnomalyBadge, { value: 5, baseline: 0 });

    expect(container.querySelector('.lite-badge')?.textContent).toContain('↑');
    expect(container.querySelector('.lite-badge')?.getAttribute('title')).toContain('Infinity%');
  });
});

describe('Lite boolean field compatibility', () => {
  it('normalizes false strings and keeps the styled label adjacent to its checkbox', () => {
    const field = { key: 'active', label: 'Active', type: 'boolean' } as const;
    const editView = render(LiteBooleanField, { field, value: 'false', mode: 'edit' });
    const checkbox = editView.container.querySelector<HTMLInputElement>('input[type="checkbox"]');

    expect(checkbox?.checked).toBe(false);
    expect(checkbox?.nextElementSibling?.tagName).toBe('LABEL');
    expect(checkbox?.nextElementSibling?.nextElementSibling?.getAttribute('type')).toBe('hidden');
    editView.unmount();

    const showView = render(LiteBooleanField, { field, value: 'false', mode: 'show' });
    expect(showView.container.querySelector('.lite-bool-true')).toBeNull();
    expect(showView.container.textContent).toContain('No');
  });
});

describe('Lite standalone field compatibility', () => {
  it('uses URL strings for image fields and preserves date-time values', () => {
    const imageView = render(LiteImageField, {
      field: { key: 'avatar', label: 'Avatar', type: 'image', required: true },
      value: 'https://cdn.example/avatar.png',
      mode: 'edit',
    });
    expect(imageView.container.querySelector<HTMLInputElement>('[name="avatar"]')?.type).toBe('text');
    expect(imageView.container.querySelector<HTMLInputElement>('[name="avatar"]')?.value)
      .toBe('https://cdn.example/avatar.png');
    imageView.unmount();

    const imagesView = render(LiteImageField, {
      field: { key: 'gallery', label: 'Gallery', type: 'images' },
      value: ['/one.png', '/two.png'],
      mode: 'edit',
    });
    expect(imagesView.container.querySelector<HTMLTextAreaElement>('[name="gallery"]')?.value)
      .toBe('/one.png\n/two.png');
    imagesView.unmount();

    const dateView = render(LiteDateField, {
      field: { key: 'publishedAt', label: 'Published', type: 'date' },
      value: '2026-08-11T08:00:00.000Z',
      mode: 'edit',
    });
    const dateInput = dateView.container.querySelector<HTMLInputElement>('[name="publishedAt"]');
    expect(dateInput?.type).toBe('datetime-local');
    expect(dateInput?.value).toBe('2026-08-11T08:00');
  });

  it('retains numeric values in standalone select controls', () => {
    const options = [{ label: 'One', value: 1 }, { label: 'Two', value: 2 }];
    const selectView = render(LiteSelectField, {
      field: { key: 'role', label: 'Role', type: 'select', options },
      value: '2',
      mode: 'edit',
    });
    expect(selectView.container.querySelector<HTMLSelectElement>('select')?.value).toBe('2');
    selectView.unmount();

    const multiView = render(LiteMultiSelectField, {
      field: { key: 'teams', label: 'Teams', type: 'multiselect', options },
      value: ['1', 2],
      mode: 'edit',
    });
    expect(Array.from(multiView.container.querySelectorAll<HTMLOptionElement>('option'))
      .filter((option) => option.selected)
      .map((option) => option.value)).toEqual(['1', '2']);
  });
});
