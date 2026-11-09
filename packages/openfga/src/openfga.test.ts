import { describe, expect, it, mock } from 'bun:test';
import { createOpenFgaAccessControl, type OpenFgaClientLike } from './index.js';

describe('createOpenFgaAccessControl', () => {
  it('maps resource and action to OpenFGA tuple and returns allowed result', async () => {
    let capturedTuple: unknown;
    const client: OpenFgaClientLike = {
      check: mock((tuple) => {
        capturedTuple = tuple;
        return Promise.resolve({ allowed: true });
      }),
    };

    const provider = createOpenFgaAccessControl({
      client,
      user: () => 'user:sarah',
    });

    const result = await provider.can({
      resource: 'documents',
      action: 'edit',
      params: { id: 'doc_123' },
    });

    expect(result.can).toBe(true);
    expect(capturedTuple).toEqual({
      user: 'user:sarah',
      relation: 'editor',
      object: 'documents:doc_123',
    });
  });

  it('handles denied permission and returns reason', async () => {
    const client: OpenFgaClientLike = {
      check: mock(() => Promise.resolve({ allowed: false })),
    };

    const provider = createOpenFgaAccessControl({
      client,
      user: () => 'user:guest',
    });

    const result = await provider.can({
      resource: 'secrets',
      action: 'delete',
      params: { id: 'key_99' },
    });

    expect(result.can).toBe(false);
    expect(result.reason).toContain('OpenFGA denied delete on secrets:key_99');
  });

  it('supports custom relationMap and objectTypeMap', async () => {
    let capturedTuple: unknown;
    const client: OpenFgaClientLike = {
      check: mock((tuple) => {
        capturedTuple = tuple;
        return Promise.resolve({ allowed: true });
      }),
    };

    const provider = createOpenFgaAccessControl({
      client,
      user: () => 'user:lead_dev',
      relationMap: (action) => `can_${action}`,
      objectTypeMap: (res) => `tenant_corp_${res}`,
    });

    const result = await provider.can({
      resource: 'repositories',
      action: 'push',
      params: { id: 'core_app' },
    });

    expect(result.can).toBe(true);
    expect(capturedTuple).toEqual({
      user: 'user:lead_dev',
      relation: 'can_push',
      object: 'tenant_corp_repositories:core_app',
    });
  });
});
