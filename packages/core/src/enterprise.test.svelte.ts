import { describe, expect, it } from 'vitest';
import {
  assertEnterpriseRequestContext,
  createEnterpriseRequestContext,
  type EnterpriseRequestContext,
} from './enterprise';

describe('enterprise request context', () => {
  it('preserves explicit tenant and trace identifiers', () => {
    const context = createEnterpriseRequestContext({
      tenantId: 'tenant-a',
      requestId: 'request-a',
      traceId: 'trace-a',
      meta: { region: 'cn' },
    });

    expect(context).toEqual({
      tenantId: 'tenant-a',
      requestId: 'request-a',
      traceId: 'trace-a',
      meta: { region: 'cn' },
    });
  });

  it('generates one request identifier and reuses it as the default trace', () => {
    const context = createEnterpriseRequestContext({ tenantId: 42 });

    expect(context.tenantId).toBe(42);
    expect(context.requestId).toBeTruthy();
    expect(context.traceId).toBe(context.requestId);
  });

  it('fails closed for incomplete or blank provider contexts', () => {
    expect(() => createEnterpriseRequestContext({ tenantId: ' ' })).toThrow('tenantId must not be empty');
    expect(() => createEnterpriseRequestContext({ tenantId: Number.NaN })).toThrow('tenantId must be a finite number');
    expect(() => createEnterpriseRequestContext({ tenantId: 'tenant-a', requestId: ' ' })).toThrow('requestId must not be empty');
    expect(() => createEnterpriseRequestContext({ tenantId: 'tenant-a', traceId: ' ' })).toThrow('traceId must not be empty');

    const incomplete: EnterpriseRequestContext = { tenantId: 'tenant-a' };
    expect(() => assertEnterpriseRequestContext(incomplete)).toThrow('requestId must not be empty');
    expect(() => assertEnterpriseRequestContext({ requestId: 'request-a', traceId: 'trace-a' })).toThrow('tenantId must not be empty');
  });
});
