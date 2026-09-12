import { describe, expect, mock, test } from 'bun:test';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAuditHandler, type SupabaseAuditRow } from './audit-handler';
import type { AuditEntry } from '@svadmin/core/audit';

const entry = {
  timestamp: '2026-09-09T00:00:00.000Z', action: 'update',
  resource: 'orders', recordId: 0, userId: 'user-1',
  details: { changed: ['status'] }, data: { status: 'paid' }, previousData: { status: 'new' },
  mutationId: 'mutation-1', tenantId: 'tenant-1', requestId: 'request-1', traceId: 'trace-1',
  outcome: 'success',
} satisfies AuditEntry;
const receipt = { data: null, error: null, count: null, status: 201, statusText: 'Created' };
const rejection = {
  data: null, count: null, status: 403, statusText: 'Forbidden',
  error: { code: '42501', message: 'secret database details', details: null, hint: null },
};

function fixture(response: unknown) {
  const insert = mock(async (_row: SupabaseAuditRow) => response);
  const from = mock((table: 'audit_log') => {
    expect(table).toBe('audit_log');
    return { insert };
  });
  return { handler: createSupabaseAuditHandler({ from }), insert, from };
}

describe('Supabase audit boundary', () => {
  test('preserves zero IDs and all enterprise context in an independent JSON event', async () => {
    const { handler, insert } = fixture(receipt);
    const value = { ...entry, details: { state: 'original' } };
    await handler(value);
    value.details.state = 'changed';
    expect(insert).toHaveBeenCalledWith({
      action: 'update', resource: 'orders', record_id: '0', user_id: 'user-1',
      details: { ...entry, details: { state: 'original' } }, created_at: entry.timestamp,
    });
  });

  test('omits absent optional columns for resource-independent events', async () => {
    const { handler, insert } = fixture({ ...receipt, status: 204 });
    const login = { action: 'login', timestamp: entry.timestamp };
    await handler(login);
    expect(insert).toHaveBeenCalledWith({
      action: 'login', record_id: null, details: login, created_at: entry.timestamp,
    });
  });

  test('rejects invalid input before accessing the SDK', async () => {
    const { handler, from } = fixture(receipt);
    for (const value of [
      null, {}, { ...entry, action: '' }, { ...entry, timestamp: 'yesterday' },
      { ...entry, recordId: NaN }, { ...entry, details: { hidden: undefined } },
      { ...entry, unknown: true },
    ]) {
      const result: unknown = Reflect.apply(handler, undefined, [value]);
      await expect(result).rejects.toMatchObject({ code: 'INVALID_AUDIT_INPUT', writeMayHaveSucceeded: false });
    }
    expect(from).not.toHaveBeenCalled();
  });

  test('reports validated write rejections without exposing database errors', async () => {
    for (const error of [
      rejection.error, { ...rejection.error, details: 'secret detail', hint: 'secret hint' },
    ]) {
      await expect(fixture({ ...rejection, error }).handler(entry)).rejects.toMatchObject({
        code: 'WRITE_REJECTED', message: 'Audit write was rejected.',
      });
    }
  });

  test('treats malformed, timed-out, or ambiguous responses as unknown write outcomes', async () => {
    for (const response of [
      null, {}, { data: null, error: null }, { ...receipt, status: 200 },
      { ...receipt, data: [] }, { ...receipt, count: 0 },
      { ...rejection, status: 408 }, { ...rejection, status: 499 },
      { ...rejection, status: 500 }, { ...rejection, error: { code: 42501 } },
      { ...receipt, get extra() { throw new Error('secret getter'); } },
    ]) {
      await expect(fixture(response).handler(entry)).rejects.toMatchObject({
        code: 'WRITE_OUTCOME_UNKNOWN', message: 'Audit write outcome could not be confirmed.',
      });
    }
  });

  test('sanitizes exceptions from dispatch and await', async () => {
    for (const from of [
      () => { throw new Error('secret dispatch error'); },
      () => ({ insert: async () => { throw new Error('secret request error'); } }),
    ]) {
      await expect(createSupabaseAuditHandler({ from })(entry)).rejects.toMatchObject({
        code: 'WRITE_OUTCOME_UNKNOWN', message: 'Audit write outcome could not be confirmed.',
      });
    }
  });

  test('uses actual SDK HTTP serialization and its empty insert receipt', async () => {
    const requests: { method: string; url: string; body: unknown }[] = [];
    const client = createClient('https://audit.example.test', 'test-anon-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
          const request = new Request(input, init);
          const body: unknown = await request.json();
          requests.push({ method: request.method, url: request.url, body });
          return new Response(null, { status: 201, statusText: 'Created' });
        }, { preconnect: () => {} }),
      },
    });
    await createSupabaseAuditHandler(client)(entry);
    expect(requests).toEqual([{
      method: 'POST', url: 'https://audit.example.test/rest/v1/audit_log',
      body: {
        action: 'update', resource: 'orders', record_id: '0', user_id: 'user-1',
        details: entry, created_at: entry.timestamp,
      },
    }]);
  });

  test('handles actual SDK rejected and timed-out HTTP responses', async () => {
    for (const status of [403, 408, 503]) {
      const client = createClient('https://audit.example.test', 'test-anon-key', {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: {
          fetch: Object.assign(async () => new Response(JSON.stringify(rejection.error), {
            status, headers: { 'content-type': 'application/json' },
          }), { preconnect: () => {} }),
        },
      });
      await expect(createSupabaseAuditHandler(client)(entry)).rejects.toMatchObject({
        code: status === 403 ? 'WRITE_REJECTED' : 'WRITE_OUTCOME_UNKNOWN',
      });
    }
  });
});
