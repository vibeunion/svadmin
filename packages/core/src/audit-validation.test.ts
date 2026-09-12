import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import {
  auditWithProvider, resetAuditLogProvider, setAuditHandler, setAuditLogProvider,
  getAuditLogProvider, withValidatedAuditProvider, writeAuditEntry, recordMutationRollback,
  type AuditCreateParams, type AuditEntry,
} from './audit';
import { createAuditEntry, decodeAuditCreate, decodeAuditEntry } from './audit-contract';

const timestamp = '2026-09-09T00:00:00.000Z';
const input = { timestamp, action: 'update', resource: 'orders', recordId: 0 };

beforeEach(() => setAuditHandler(() => undefined));
afterEach(() => resetAuditLogProvider());

describe('validated audit contracts', () => {
  test('rejects invalid drafts before dispatching either sink', async () => {
    const handler = mock(() => undefined);
    const create = mock(async (params: AuditCreateParams) => params);
    const provider = { create, get: async () => [] };
    setAuditHandler(handler);
    for (const draft of [
      null, [], {}, { action: '' }, { action: 'update', resource: '' },
      { action: 'update', recordId: Infinity }, { action: 'update', recordId: 1.5 },
      { action: 'update', recordId: Number.MAX_SAFE_INTEGER + 1 },
      { action: 'update', id: 1 }, { action: 'update', timestamp },
      { action: 'update', details: { value: undefined } },
      { action: 'update', details: { value: new Date() } },
      { action: 'update', unknown: true }, { action: 'update', outcome: 'pending' },
    ]) {
      const result: unknown = Reflect.apply(writeAuditEntry, undefined, [draft, provider]);
      await expect(result).rejects.toMatchObject({ code: 'INVALID_AUDIT_INPUT', writeMayHaveSucceeded: false });
    }
    expect(handler).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  test('rejects accessors and serialization hooks without invoking them', () => {
    const getter = mock(() => 'login');
    for (const draft of [
      Object.defineProperty({}, 'action', { enumerable: true, get: getter }),
      { action: 'login', details: { toJSON: getter } },
    ]) expect(() => createAuditEntry(draft)).toThrow('Invalid audit input.');
    expect(getter).not.toHaveBeenCalled();
  });

  test('requires canonical UTC timestamps and rejects calendar overflow', () => {
    for (const value of [
      '', 'yesterday', '2026-02-30T00:00:00Z', '2026-09-09',
      '2026-09-09T00:00:00+00:00', '2026-09-09T00:00:00.1Z',
    ]) expect(() => decodeAuditCreate({ ...input, timestamp: value })).toThrow('Invalid audit input.');
    expect(decodeAuditEntry(input).timestamp).toBe(timestamp);
    expect(decodeAuditEntry({ ...input, timestamp: '2026-09-09T00:00:00Z' }).timestamp)
      .toBe('2026-09-09T00:00:00Z');
  });

  test('isolates nested provider mutations from the expected write receipt', async () => {
    const provider = withValidatedAuditProvider({
      async create(params) {
        params.action = 'delete';
        if (params.meta) params.meta['tenant'] = 'other';
        return params;
      },
      async get() { return []; },
    });
    const params = { ...input, meta: { tenant: 'original' } };
    await expect(provider.create(params)).rejects.toMatchObject({
      code: 'INVALID_AUDIT_RESPONSE', writeMayHaveSucceeded: true,
    });
    expect(params.action).toBe('update');
    expect(params.meta.tenant).toBe('original');
  });

  test('rejects missing, malformed and mismatched receipts after writes', async () => {
    for (const result of [
      null, {}, { ...input, recordId: '0' }, { ...input, action: 'delete' },
      { ...input, timestamp: '2026-02-30T00:00:00Z' },
      { ...input, extra: true }, { ...input, details: { unsafe: undefined } },
    ]) {
      const provider = withValidatedAuditProvider({ create: async () => result, get: async () => [] });
      await expect(provider.create(input)).rejects.toMatchObject({
        code: 'INVALID_AUDIT_RESPONSE', writeMayHaveSucceeded: true,
      });
    }
  });

  test('accepts server-generated fields and snapshots returned nested records', async () => {
    const result = { ...input, id: 'event-1', meta: { server: true } };
    const provider = withValidatedAuditProvider({ create: async () => result, get: async () => [result] });
    const created = await provider.create(input);
    const entries = await provider.get({});
    result.meta.server = false;
    expect(created.meta).toEqual({ server: true });
    expect(entries[0]?.meta).toEqual({ server: true });
  });

  test('handler mutations and caller mutations cannot change a pending write', async () => {
    let release = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    const seen: AuditEntry[] = [];
    setAuditHandler(async entry => {
      entry.action = 'delete';
      if (entry.details) entry.details['state'] = 'handler';
      await gate;
    });
    const draft = { action: 'update', details: { state: 'original' } };
    const pending = writeAuditEntry(draft, {
      async create(params) { seen.push(params); return params; },
      async get() { return []; },
    });
    draft.details.state = 'caller';
    release();
    const result = await pending;
    expect(result.action).toBe('update');
    expect(result.details).toEqual({ state: 'original' });
    expect(seen).toEqual([result]);
  });

  test('validates queries before dispatch and sanitizes read failures', async () => {
    const get = mock(async () => { throw new Error('secret read failure'); });
    const provider = withValidatedAuditProvider({ create: async params => params, get });
    for (const query of [null, { resource: '' }, { action: undefined }, { meta: { n: NaN } }, { extra: 1 }]) {
      const result: unknown = Reflect.apply(provider.get, provider, [query]);
      await expect(result).rejects.toMatchObject({ code: 'INVALID_AUDIT_INPUT' });
    }
    expect(get).not.toHaveBeenCalled();
    await expect(provider.get({})).rejects.toMatchObject({
      code: 'AUDIT_PROVIDER_FAILED', message: 'Audit provider request failed.', writeMayHaveSucceeded: false,
    });
  });

  test('validates every record of the read response', async () => {
    for (const response of [null, {}, [input, {}], [{ ...input, timestamp: 'yesterday' }]]) {
      const provider = withValidatedAuditProvider({ create: async params => params, get: async () => response });
      await expect(provider.get({})).rejects.toMatchObject({
        code: 'INVALID_AUDIT_RESPONSE', writeMayHaveSucceeded: false,
      });
    }
  });

  test('normalizes handler failures and does not dispatch the provider afterward', async () => {
    setAuditHandler(() => { throw new Error('secret handler failure'); });
    const create = mock(async (params: AuditCreateParams) => params);
    await expect(writeAuditEntry({ action: 'login' }, { create, get: async () => [] }))
      .rejects.toMatchObject({
        code: 'AUDIT_HANDLER_FAILED', message: 'Audit handler write could not be confirmed.', writeMayHaveSucceeded: true,
      });
    expect(create).not.toHaveBeenCalled();
  });

  test('global registration validates reads and preserves transport method receivers', async () => {
    const transport = {
      prefix: 'event',
      async create(params: AuditCreateParams) { return { ...params, id: this.prefix }; },
      async get() { return [{ ...input, id: this.prefix }]; },
    };
    setAuditLogProvider(transport);
    const provider = getAuditLogProvider();
    if (!provider) throw new Error('Expected registered audit provider.');
    expect((await provider.create(input)).id).toBe('event');
    expect((await provider.get({}))[0]?.id).toBe('event');
  });

  test('rollback omits absent context instead of encoding undefined or empty placeholders', async () => {
    const result = await recordMutationRollback({ resource: 'orders', recordId: 0 }, {
      create: async params => params, get: async () => [],
    });
    expect(result.recordId).toBe(0);
    expect(result.meta).toEqual({ actionType: 'mutation_rollback' });
    expect(Object.hasOwn(result, 'mutationId')).toBe(false);
    const login = await writeAuditEntry({ action: 'login' }, {
      create: async params => params, get: async () => [],
    });
    expect(Object.hasOwn(login, 'resource')).toBe(false);
  });

  test('best-effort delivery rejects malformed input and logs only sanitized failures', async () => {
    const errors = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const create = mock(async () => { throw new Error('secret database failure'); });
      const provider = { create, get: async () => [] };
      Reflect.apply(auditWithProvider, undefined, [{ action: '' }, provider]);
      expect(create).not.toHaveBeenCalled();
      auditWithProvider({ action: 'login' }, provider);
      await Promise.resolve();
      await Promise.resolve();
      expect(errors.mock.calls).toEqual([
        [expect.objectContaining({ code: 'INVALID_AUDIT_INPUT', message: 'Invalid audit input.' })],
        [expect.objectContaining({ code: 'AUDIT_PROVIDER_FAILED', message: 'Audit provider request failed.' })],
      ]);
    } finally { errors.mockRestore(); }
  });
});
