import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResourcePermissionVisibilityHost from './resource-permission-visibility.test-host.svelte';

const mocks = vi.hoisted(() => {
  const navigation = {
    create: vi.fn(),
    edit: vi.fn(),
    show: vi.fn(),
    clone: vi.fn(),
    list: vi.fn(),
  };

  return {
    deniedActions: new Set<string>(),
    permissionRequests: [] as Array<{
      resource: string;
      action: string;
      params?: Record<string, unknown>;
    }>,
    resource: {
      name: 'users',
      label: 'Users',
      fields: [],
      canCreate: true,
      canEdit: true,
      canShow: true,
      canDelete: true,
    },
    navigation,
  };
});

const translations: Record<string, string> = {
  'common.actions': 'Actions',
  'common.cancel': 'Cancel',
  'common.clone': 'Clone',
  'common.confirm': 'Confirm',
  'common.create': 'Create',
  'common.delete': 'Delete',
  'common.detail': 'Detail',
  'common.edit': 'Edit',
  'common.home': 'Home',
  'common.noData': 'No data',
  'common.search': 'Search',
  'common.toggleTheme': 'Toggle theme',
};

function useTranslation() {
  return { t: (key: string) => translations[key] ?? key };
}

vi.mock('@svadmin/core', () => ({
  captureAdminContext: () => ({
    accessControlProvider: { can: vi.fn() },
    agentProvider: undefined,
    chatProvider: undefined,
    formatLink: (path: string) => path,
    navigate: vi.fn(),
    resources: [mocks.resource],
    tenantCacheKey: undefined,
  }),
  getResource: () => mocks.resource,
  getResources: () => [mocks.resource],
  toggleTheme: vi.fn(),
  useCan: (options: () => { resource: string; action: string; params?: Record<string, unknown> }) => {
    const request = options();
    mocks.permissionRequests.push(request);
    return {
      get allowed() { return !mocks.deniedActions.has(request.action); },
      isLoading: false,
      reason: undefined,
    };
  },
  useDelete: () => ({ mutation: { mutateAsync: vi.fn() } }),
  useNavigation: () => mocks.navigation,
  useTranslation,
}));

vi.mock('@svadmin/core/i18n', () => ({ useTranslation }));

vi.mock('./AutoTable.svelte', async () => {
  const table = await import('./ResourceOperationsPage.test-table.svelte');
  return { default: table.default };
});

beforeEach(() => {
  mocks.deniedActions.clear();
  mocks.permissionRequests.length = 0;
  Object.assign(mocks.resource, {
    canCreate: true,
    canEdit: true,
    canShow: true,
    canDelete: true,
  });
  Object.values(mocks.navigation).forEach((fn) => fn.mockReset());
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

describe('resource permission visibility', () => {
  it('hides create actions on list and operations pages when create access is denied', async () => {
    mocks.deniedActions.add('create');

    const list = render(ResourcePermissionVisibilityHost, { surface: 'list' });
    await waitFor(() => expect(list.queryByRole('button', { name: 'Create' })).toBeNull());
    list.unmount();

    const operations = render(ResourcePermissionVisibilityHost, { surface: 'operations' });
    await waitFor(() => expect(operations.queryByRole('button', { name: 'Add user' })).toBeNull());
  });

  it.each(['command-palette', 'ai-command-bar'] as const)(
    'hides denied list and create commands in the %s',
    async (surface) => {
      mocks.deniedActions.add('list');
      mocks.deniedActions.add('create');

      const view = render(ResourcePermissionVisibilityHost, { surface });

      await waitFor(() => {
        expect(view.queryByText('Users')).toBeNull();
        expect(view.queryByText('Create Users')).toBeNull();
      });
    },
  );

  it.each(['command-palette', 'ai-command-bar'] as const)(
    'keeps the allowed list command but honors canCreate=false in the %s',
    async (surface) => {
      mocks.resource.canCreate = false;

      const view = render(ResourcePermissionVisibilityHost, { surface });

      expect(await view.findByText('Users')).not.toBeNull();
      expect(view.queryByText('Create Users')).toBeNull();
    },
  );

  it('hides every built-in CRUD button disabled by its resource definition', async () => {
    Object.assign(mocks.resource, {
      canCreate: false,
      canEdit: false,
      canShow: false,
      canDelete: false,
    });

    const view = render(ResourcePermissionVisibilityHost, { surface: 'buttons' });

    expect(view.queryByRole('button', { name: 'Create' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Detail' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Clone' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('hides denied CRUD buttons and scopes record permissions to the active id', async () => {
    ['create', 'edit', 'show', 'delete'].forEach((action) => mocks.deniedActions.add(action));

    const view = render(ResourcePermissionVisibilityHost, { surface: 'buttons' });

    await waitFor(() => {
      expect(view.queryByRole('button', { name: 'Create' })).toBeNull();
      expect(view.queryByRole('button', { name: 'Edit' })).toBeNull();
      expect(view.queryByRole('button', { name: 'Detail' })).toBeNull();
      expect(view.queryByRole('button', { name: 'Clone' })).toBeNull();
      expect(view.queryByRole('button', { name: 'Delete' })).toBeNull();
    });
    expect(mocks.permissionRequests).toEqual(expect.arrayContaining([
      expect.objectContaining({ resource: 'users', action: 'create' }),
      expect.objectContaining({ resource: 'users', action: 'create', params: { id: 'user-1' } }),
      expect.objectContaining({ resource: 'users', action: 'edit', params: { id: 'user-1' } }),
      expect.objectContaining({ resource: 'users', action: 'show', params: { id: 'user-1' } }),
      expect.objectContaining({ resource: 'users', action: 'delete', params: { id: 'user-1' } }),
    ]));
  });
});
