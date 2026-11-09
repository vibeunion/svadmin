import { describe, expect, it, mock } from 'bun:test';
import { createCasbinAccessControl } from './casbin-access-control.js';

describe('createCasbinAccessControl', () => {
  it('checks standard RBAC permission using local enforcer', async () => {
    const fakeEnforcer = {
      enforce: mock((sub: string, obj: string, act: string) => {
        return sub === 'alice' && obj === 'posts' && act === 'read';
      }),
    };

    const accessControl = createCasbinAccessControl({
      enforcer: fakeEnforcer,
      user: () => 'alice',
    });

    const resAllowed = await accessControl.can({
      resource: 'posts',
      action: 'list',
    });

    expect(resAllowed.can).toBe(true);
    expect(fakeEnforcer.enforce).toHaveBeenCalledWith('alice', 'posts', 'read');

    const resDenied = await accessControl.can({
      resource: 'posts',
      action: 'delete',
    });

    expect(resDenied.can).toBe(false);
    expect(resDenied.reason).toContain('Casbin policy denied');
  });

  it('supports domain-based multi-tenant RBAC enforcement', async () => {
    const fakeEnforcer = {
      enforce: mock((sub: string, dom: string, obj: string, act: string) => {
        return sub === 'bob' && dom === 'tenant_a' && obj === 'users' && act === 'write';
      }),
    };

    const accessControl = createCasbinAccessControl({
      enforcer: fakeEnforcer,
      user: () => 'bob',
      domain: () => 'tenant_a',
    });

    const result = await accessControl.can({
      resource: 'users',
      action: 'edit',
    });

    expect(result.can).toBe(true);
    expect(fakeEnforcer.enforce).toHaveBeenCalledWith('bob', 'tenant_a', 'users', 'write');
  });

  it('queries remote Casbin REST API when enforcer is omitted', async () => {
    const fakeFetch = mock((url: string | URL | Request, init?: RequestInit) => {
      return Promise.resolve(
        new Response(JSON.stringify({ allowed: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    const accessControl = createCasbinAccessControl({
      apiUrl: 'https://casbin.company.internal',
      token: 'casbin-secret-token',
      user: () => 'carol',
      fetch: fakeFetch as unknown as typeof fetch,
    });

    const result = await accessControl.can({
      resource: 'orders',
      action: 'show',
    });

    expect(result.can).toBe(true);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    const callArgs = fakeFetch.mock.calls[0];
    expect(String(callArgs[0])).toBe('https://casbin.company.internal/api/enforce');
    const requestBody = JSON.parse(callArgs[1]?.body as string);
    expect(requestBody.params).toEqual(['carol', 'orders', 'read']);
  });

  it('handles remote error with fail-closed reason', async () => {
    const fakeFetch = mock(() => {
      return Promise.resolve(new Response('Forbidden', { status: 403 }));
    });

    const accessControl = createCasbinAccessControl({
      apiUrl: 'https://casbin.company.internal',
      user: () => 'carol',
      fetch: fakeFetch as unknown as typeof fetch,
    });

    const result = await accessControl.can({
      resource: 'invoices',
      action: 'edit',
    });

    expect(result.can).toBe(false);
    expect(result.reason).toContain('Casbin enforce check failed with status 403');
  });
});
