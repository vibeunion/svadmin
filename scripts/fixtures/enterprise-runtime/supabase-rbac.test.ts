import { describe, expect, it } from 'bun:test';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseDataProvider } from '../../../packages/supabase/src/data-provider';
import type { DataProvider } from '@svadmin/core';
import { SignJWT } from 'jose';

const apiUrl = process.env['SVADMIN_TEST_API_URL'] ?? 'http://127.0.0.1:15433';
const jwtSecret = process.env['SVADMIN_TEST_JWT_SECRET'];
const anonKey = process.env['SVADMIN_TEST_ANON_KEY'] ?? 'local-test-anon-key';
const enabled = Boolean(jwtSecret);

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is required for the OrbStack integration test`);
  if (name === 'SVADMIN_TEST_JWT_SECRET' && value.length < 32) {
    throw new Error(`${name} must contain at least 32 characters for PostgREST JWT verification`);
  }
  return value;
}

async function clientFor(tenantId: string, actorId: string) {
  const secret = new TextEncoder().encode(requireEnv('SVADMIN_TEST_JWT_SECRET', jwtSecret));
  const token = await new SignJWT({ sub: actorId, role: 'authenticated', tenant_id: tenantId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secret);
  return createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: barePostgrestFetch,
    },
  });
}

async function providerFor(tenantId: string, actorId: string): Promise<DataProvider> {
  return createSupabaseDataProvider(await clientFor(tenantId, actorId));
}

function anonymousProvider(): DataProvider {
  return createSupabaseDataProvider(createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: barePostgrestFetch },
  }));
}

async function barePostgrestFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = input instanceof Request ? new Request(input) : new Request(input, init);
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/^\/rest\/v1(?=\/|$)/, '') || '/';
  return fetch(new Request(url, request));
}

barePostgrestFetch.preconnect = fetch.preconnect;

describe.skipIf(!enabled)('OrbStack Supabase/PostgREST tenant boundary', () => {
  it('reads and writes only the authenticated tenant records', async () => {
    const tenantA = await providerFor('tenant-a', 'alice');
    const tenantB = await providerFor('tenant-b', 'bob');
    const anonymous = anonymousProvider();

    await expect(anonymous.getList({ resource: 'enterprise_records' })).rejects.toThrow();

    const aList = await tenantA.getList({
      resource: 'enterprise_records',
      sorters: [{ field: 'title', order: 'asc' }],
    });
    const bList = await tenantB.getList({ resource: 'enterprise_records' });

    expect(aList.data.map(record => record['tenant_id'])).toEqual(['tenant-a']);
    expect(bList.data.map(record => record['tenant_id'])).toEqual(['tenant-b']);

    let createdId: string | undefined;
    try {
      const created = await tenantA.create({
        resource: 'enterprise_records',
        variables: { tenant_id: 'tenant-a', title: 'A created record' },
      });
      expect(created.data['tenant_id']).toBe('tenant-a');

      const createdIdValue = created.data['id'];
      if (typeof createdIdValue !== 'string') throw new Error('Created enterprise record did not return a string id');
      createdId = createdIdValue;

      await expect(tenantB.create({
        resource: 'enterprise_records',
        variables: { tenant_id: 'tenant-a', title: 'B forbidden insert' },
      })).rejects.toThrow();

      await expect(tenantB.update({
        resource: 'enterprise_records',
        id: createdId,
        variables: { title: 'B forbidden update', version: 99 },
      })).rejects.toThrow();

      await expect(tenantB.deleteOne({
        resource: 'enterprise_records',
        id: createdId,
      })).rejects.toThrow();

      const forbidden = await tenantB.getList({
        resource: 'enterprise_records',
        filters: [{ field: 'id', operator: 'eq', value: createdId }],
      });
      expect(forbidden.data).toEqual([]);

      const independentTenantA = await providerFor('tenant-a', 'alice');
      const unchanged = await independentTenantA.getOne({
        resource: 'enterprise_records',
        id: createdId,
      });
      expect(unchanged.data['title']).toBe('A created record');
      expect(unchanged.data['version']).toBe(1);

      const updated = await tenantA.update({
        resource: 'enterprise_records',
        id: createdId,
        variables: { title: 'A updated record', version: 2 },
      });
      expect(updated.data['title']).toBe('A updated record');

      const afterUpdate = await tenantA.getOne({
        resource: 'enterprise_records',
        id: createdId,
      });
      expect(afterUpdate.data['title']).toBe('A updated record');
      expect(afterUpdate.data['version']).toBe(2);

      await tenantA.deleteOne({ resource: 'enterprise_records', id: createdId });
      await expect(tenantA.getOne({ resource: 'enterprise_records', id: createdId })).rejects.toThrow();
    } finally {
      if (createdId !== undefined) {
        await tenantA.deleteOne({ resource: 'enterprise_records', id: createdId }).catch(() => undefined);
      }
    }
  });
});
