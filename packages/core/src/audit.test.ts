import { afterEach, describe, expect, test, mock } from 'bun:test';
import {
  resetAuditLogProvider,
  setAuditHandler,
  writeAuditEntry,
  type AuditEntry,
  type AuditLogProvider,
} from './audit';

afterEach(() => {
  resetAuditLogProvider();
});

describe('writeAuditEntry', () => {
  test('waits for the handler and persists enterprise context', async () => {
    const calls: string[] = [];
    setAuditHandler(async () => {
      await Promise.resolve();
      calls.push('handler');
    });
    const provider: AuditLogProvider = {
      create: mock(async (params): Promise<AuditEntry> => {
        calls.push('provider');
        return { timestamp: '2026-08-25T00:00:00.000Z', action: 'update', resource: params.resource, meta: params.meta };
      }),
      get: mock(async () => []),
    };

    await writeAuditEntry({
      action: 'update',
      resource: 'enterprise-policy',
      recordId: 'policy-1',
      userId: 'user-1',
      outcome: 'success',
      tenantId: 'tenant-1',
      requestId: 'request-1',
      traceId: 'trace-1',
    }, provider);

    expect(calls).toEqual(['handler', 'provider']);
    expect(provider.create).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'enterprise-policy',
      timestamp: expect.any(String),
      recordId: 'policy-1',
      userId: 'user-1',
      outcome: 'success',
      meta: expect.objectContaining({
        outcome: 'success',
        tenantId: 'tenant-1',
        requestId: 'request-1',
        traceId: 'trace-1',
      }),
    }));
  });

  test('propagates persistence failures', async () => {
    setAuditHandler(() => undefined);
    const provider: AuditLogProvider = {
      create: mock(async () => { throw new Error('audit storage unavailable'); }),
      get: mock(async () => []),
    };

    await expect(writeAuditEntry({ action: 'delete', resource: 'api-credentials' }, provider))
      .rejects.toThrow('audit storage unavailable');
  });

  test('fails closed when no persistent provider is configured', async () => {
    setAuditHandler(() => undefined);

    await expect(writeAuditEntry({ action: 'update', resource: 'enterprise-policy' }))
      .rejects.toThrow('Strict audit logging requires an AuditLogProvider.');
  });
});
