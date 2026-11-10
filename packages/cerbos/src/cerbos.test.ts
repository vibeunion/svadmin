import { describe, expect, it, mock } from 'bun:test';
import {
  createCerbosAccessControl,
  type CerbosClientLike,
  type CerbosCheckResponseLike,
} from './cerbos-access-control.js';

describe('@svadmin/cerbos access control adapter', () => {
  it('evaluates permission using provided CerbosClientLike', async () => {
    const mockCheckResponse: CerbosCheckResponseLike = {
      isAllowed(action: string) {
        return action === 'view';
      },
    };

    const mockClient: CerbosClientLike = {
      checkResource: mock(async () => mockCheckResponse),
    };

    const provider = createCerbosAccessControl({
      client: mockClient,
      principal: () => ({
        id: 'usr-123',
        roles: ['user'],
        attr: { department: 'IT' },
      }),
    });

    const allowed = await provider.can({
      resource: 'contact',
      action: 'view',
      params: { id: 'c-456' },
    });

    expect(allowed.can).toBe(true);
    expect(mockClient.checkResource).toHaveBeenCalledWith({
      principal: {
        id: 'usr-123',
        roles: ['user'],
        attr: { department: 'IT' },
      },
      resource: {
        kind: 'contact',
        id: 'c-456',
        attr: { id: 'c-456' },
      },
      actions: ['view'],
    });

    const denied = await provider.can({
      resource: 'contact',
      action: 'delete',
      params: { id: 'c-456' },
    });

    expect(denied.can).toBe(false);
    expect(denied.reason).toContain('Cerbos policy denied action "delete"');
  });

  it('queries Cerbos PDP HTTP API when client is omitted', async () => {
    const mockFetch = mock((_url: string | URL | Request, init?: RequestInit) => {
      const parsedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
      const actionsObj = (parsedBody['resources'] as Array<{ actions: string[] }>)[0]?.actions;
      const isCreate = actionsObj?.includes('create') ?? false;

      return Promise.resolve(
        new Response(
          JSON.stringify({
            results: [
              {
                actions: {
                  create: isCreate ? 'EFFECT_ALLOW' : 'EFFECT_DENY',
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    const provider = createCerbosAccessControl({
      apiUrl: 'http://localhost:3592',
      token: 'jwt-pdp-secret',
      principal: () => ({
        id: 'admin-01',
        roles: ['admin'],
      }),
      fetch: mockFetch as unknown as typeof fetch,
    });

    const res = await provider.can({
      resource: 'invoice',
      action: 'create',
      params: { amount: 5000 },
    });

    expect(res.can).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const call = mockFetch.mock.calls[0];
    expect(call).toBeDefined();
    expect(String(call?.[0])).toBe('http://localhost:3592/api/check/resources');

    const headers = call?.[1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer jwt-pdp-secret');
  });

  it('fails closed when PDP is unreachable or returns error status', async () => {
    const mockFetch = mock(() => {
      return Promise.resolve(new Response('Internal Server Error', { status: 500 }));
    });

    const provider = createCerbosAccessControl({
      apiUrl: 'http://localhost:3592',
      principal: () => ({
        id: 'guest',
        roles: ['guest'],
      }),
      fetch: mockFetch as unknown as typeof fetch,
    });

    const res = await provider.can({
      resource: 'settings',
      action: 'edit',
    });

    expect(res.can).toBe(false);
    expect(res.reason).toContain('Cerbos authorization error');
  });
});
