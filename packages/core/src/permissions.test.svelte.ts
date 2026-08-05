import { afterEach, describe, expect, test } from 'vitest';
import {
  canAccessAsync,
  createFeatureGate,
  resetAccessControlProvider,
  setAccessControlProvider,
  type AccessControlProvider,
  type CanParams,
  type CanResult,
} from './permissions.svelte';

afterEach(resetAccessControlProvider);

describe('permissions', () => {
  test('canAccessAsync respects deny rule', async () => {
    const provider: AccessControlProvider = {
      can: async (p) => {
        const { action } = p as CanParams;
        if (action === 'delete') return { can: false, reason: 'Denied' };
        return { can: true };
      },
    };
    expect(await provider.can({ resource: 'posts', action: 'delete' })).toEqual({ can: false, reason: 'Denied' });
    expect((await provider.can({ resource: 'posts', action: 'list' })) as CanResult).toEqual({ can: true });
  });

  test('canAccessAsync resolves with allowed status', async () => {
    const provider: AccessControlProvider = {
      can: async (params) => {
        expect((params as CanParams).params?.published).toBe(true);
        return { can: true };
      },
    };
    const result = await provider.can({ resource: 'posts', action: 'edit', params: { published: true } });
    expect((result as CanResult).can).toBe(true);
  });

  test('canAccessAsync resolves with denied status', async () => {
    const provider: AccessControlProvider = {
      can: async () => ({ can: false, reason: 'No permission' }),
    };
    const result = await provider.can({ resource: 'users', action: 'delete' });
    expect((result as CanResult).can).toBe(false);
    expect((result as CanResult).reason).toBe('No permission');
  });

  test('resource-specific rules', async () => {
    const provider: AccessControlProvider = {
      can: async (p) => {
        const { resource, action } = p as CanParams;
        if (resource === 'users' && action === 'delete') return { can: false, reason: 'Cannot delete users' };
        return { can: true };
      },
    };
    expect((await provider.can({ resource: 'users', action: 'delete' }) as CanResult).can).toBe(false);
    expect((await provider.can({ resource: 'users', action: 'list' }) as CanResult).can).toBe(true);
    expect((await provider.can({ resource: 'posts', action: 'delete' }) as CanResult).can).toBe(true);
  });

  test('params.id is passed through', async () => {
    const provider: AccessControlProvider = {
      can: async (p) => {
        const { params } = p as CanParams;
        if (params?.id === 42) return { can: false, reason: 'Record locked' };
        return { can: true };
      },
    };
    const result = await provider.can({ resource: 'posts', action: 'edit', params: { id: 42 } });
    expect((result as CanResult).can).toBe(false);
    expect((result as CanResult).reason).toBe('Record locked');
  });

  test('params and meta are available to access control providers', async () => {
    const provider: AccessControlProvider = {
      can: async (p) => {
        const request = p as CanParams;
        expect(request.params).toEqual({ id: 42, tenantId: 'tenant-1' });
        expect(request.meta).toEqual({ scope: 'row-action', source: 'DeleteButton' });
        return { can: true };
      },
    };

    const result = await provider.can({
      resource: 'orders',
      action: 'delete',
      params: { id: 42, tenantId: 'tenant-1' },
      meta: { scope: 'row-action', source: 'DeleteButton' },
    });

    expect(result).toEqual({ can: true });
  });

  test('extended action types work', async () => {
    const provider: AccessControlProvider = {
      can: async (p) => {
        const { action } = p as CanParams;
        if (action === 'show') return { can: false, reason: 'No show' };
        if (action === 'field') return { can: false, reason: 'No field' };
        return { can: true };
      },
    };
    expect(((await provider.can({ resource: 'posts', action: 'show' })) as CanResult).can).toBe(false);
    expect(((await provider.can({ resource: 'posts', action: 'field' })) as CanResult).can).toBe(false);
    expect(((await provider.can({ resource: 'posts', action: 'list' })) as CanResult).can).toBe(true);
  });

  test('getAccessControlOptions returns provider options', () => {
    const provider: AccessControlProvider = {
      can: async () => ({ can: true }),
      options: {
        buttons: { enableAccessControl: true, hideIfUnauthorized: true },
      },
    };
    expect(provider.options?.buttons?.enableAccessControl).toBe(true);
    expect(provider.options?.buttons?.hideIfUnauthorized).toBe(true);
  });

  test('getAccessControlOptions returns {} when no options', () => {
    const provider: AccessControlProvider = {
      can: async () => ({ can: true }),
    };
    expect(provider.options).toBeUndefined();
  });

  test('a forged feature-gate hint cannot override a configured access-control decision', async () => {
    const showAdminNavigation = createFeatureGate({ roles: ['admin'] });
    setAccessControlProvider({
      can: async () => ({ can: false, reason: 'Configured policy denied this action' }),
    });

    expect(showAdminNavigation({ role: 'admin', permissions: ['*'] })).toBe(true);
    expect(await canAccessAsync('users', 'delete')).toEqual({
      can: false,
      reason: 'Configured policy denied this action',
    });
  });
});

describe('CASL adapter', () => {
  test('createCaslAccessControl works', async () => {
    const { createCaslAccessControl } = await import('./adapters/casl');

    const ability = {
      can: (action: string, subject: string) => !(action === 'delete' && subject === 'users'),
      cannot: (action: string, subject: string) => action === 'delete' && subject === 'users',
    };

    const provider = createCaslAccessControl(ability);

    const allowed = await provider.can({ resource: 'posts', action: 'edit' }) as CanResult;
    expect(allowed.can).toBe(true);

    const denied = await provider.can({ resource: 'users', action: 'delete' }) as CanResult;
    expect(denied.can).toBe(false);
    expect(denied.reason).toContain('Cannot "delete" on "users"');
  });
});

describe('Casbin adapter', () => {
  test('createCasbinAccessControl works', async () => {
    const { createCasbinAccessControl } = await import('./adapters/casbin');

    const enforcer = {
      enforce: async (sub: string, obj: string, act: string) =>
        !(sub === 'alice' && obj === 'users' && act === 'delete'),
    };

    const provider = createCasbinAccessControl(enforcer, {
      getUser: () => 'alice',
    });

    const allowed = await provider.can({ resource: 'posts', action: 'edit' }) as CanResult;
    expect(allowed.can).toBe(true);

    const denied = await provider.can({ resource: 'users', action: 'delete' }) as CanResult;
    expect(denied.can).toBe(false);
    expect(denied.reason).toContain('alice');
  });
});
