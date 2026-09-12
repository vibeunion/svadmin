import { requireValue } from "../../../scripts/test-assertions";
/* eslint-disable @typescript-eslint/no-explicit-any */
// @svadmin/supabase — Unit Tests
import { describe, test, expect, mock } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Mock @svadmin/core ───────────────────────────────────────────
mock.module('@svadmin/core', () => {
  return {
    audit: mock(() => {}),
  };
});

// ─── Mock Refine Supabase Provider ────────────────────────────────
mock.module('@refinedev/supabase', () => {
  return {
    dataProvider: (..._args: any[]) => {
      const mockDp: any = {
        getList: async () => ({ data: [{ id: 1, title: 'Item 1' }], total: 1 }),
        getOne: async () => ({ data: { id: 1, title: 'Item 1' } }),
        create: async () => ({ data: { id: 2, title: 'New Item' } }),
        update: async () => ({ data: { id: 1, title: 'Updated' } }),
        deleteOne: async () => ({ data: { id: 1, title: 'Deleted' } }),
      };
      return mockDp;
    }
  };
});

// ─── Mock Supabase Client ──────────────────────────────────────────
function createMockSupabaseClient(overrides: Record<string, any> = {}) {
  const client: any = {
    auth: {
      signInWithPassword: mock(async ({ _email, password }) => {
        if (password === 'bad') return { error: { message: 'Invalid credentials' } };
        return { data: { user: { id: 'user-1' } }, error: null };
      }),
      signOut: mock(async () => ({ error: null })),
      getSession: mock(async () => ({ data: { session: { access_token: 'valid-token' } } })),
      getUser: mock(async () => ({
        data: {
          user: {
            id: 'user-1',
            email: 'admin@test.com',
            user_metadata: { name: 'Admin', avatar_url: 'http://avatar', role: 'admin' }
          }
        }
      })),
      signUp: mock(async ({ email }) => {
        if (email === 'bad@test.com') return { error: { message: 'Signup failed' } };
        return { error: null };
      }),
      resetPasswordForEmail: mock(async () => ({ error: null })),
      updateUser: mock(async () => ({ error: null })),
      ...(overrides['auth'] || {}),
    },
    rpc: mock(async (fnName: string, args: any, options?: any) => {
      if (fnName === 'fail_proc') {
        return { data: null, error: { message: 'Database error occurred' } };
      }
      return { data: { procResult: true, fnName, args, options }, error: null };
    }),
    functions: {
      invoke: mock(async (fnName: string, options?: any) => {
        if (fnName === 'fail-fn') {
          return { data: null, error: { message: 'Edge Function timeout' } };
        }
        return { data: { functionResult: true, fnName, options }, error: null };
      }),
      ...(overrides['functions'] || {}),
    },
    from: mock((tableName: string) => {
      const builder: any = {
        tableName,
        select: mock((fields: string) => {
          builder.selectedFields = fields;
          return builder;
        }),
        insert: mock((values: any) => {
          builder.insertedValues = values;
          return builder;
        }),
        update: mock((values: any) => {
          builder.updatedValues = values;
          return builder;
        }),
        delete: mock(() => {
          builder.isDelete = true;
          return builder;
        }),
        eq: mock((col: string, val: any) => {
          builder.filterEq = { col, val };
          return builder;
        }),
        order: mock((col: string, opt: any) => {
          builder.orderBy = { col, opt };
          return builder;
        }),
        then: (onfulfilled: any) => {
          if (builder.isDelete) {
            return Promise.resolve({ data: [{ id: 1 }], error: null }).then(onfulfilled);
          }
          if (builder.updatedValues) {
            return Promise.resolve({ data: [{ id: 1, ...builder.updatedValues }], error: null }).then(onfulfilled);
          }
          if (builder.insertedValues) {
            return Promise.resolve({ data: [{ id: 10, ...builder.insertedValues }], error: null }).then(onfulfilled);
          }
          return Promise.resolve({
            data: [{ id: 1, name: 'Table Record', table: tableName }],
            error: null,
          }).then(onfulfilled);
        },
      };
      return builder;
    }),
    schema: mock((schemaName: string) => {
      const scopedClient: any = {
        ...client,
        schemaName,
        rpc: mock(async (fnName: string, args: any, options?: any) => {
          return { data: { schema: schemaName, fnName, args, options }, error: null };
        }),
        from: mock((tableName: string) => {
          return client.from(`${schemaName}.${tableName}`);
        }),
      };
      return scopedClient;
    }),
    channel: mock((name: string) => {
      const c: any = {
        name,
        on: mock(() => c),
        subscribe: mock(() => c),
        unsubscribe: mock(() => c),
        send: mock(() => c)
      };
      return c;
    }),
  };
  // If there are top-level overrides besides auth/functions, merge them
  for (const [key, val] of Object.entries(overrides)) {
    if (key !== 'auth' && key !== 'functions') (client as any)[key] = val;
  }
  return client as unknown as SupabaseClient;
}


// ─── DataProvider Tests ──────────────────────────────────────────
describe('Supabase DataProvider', () => {
  test('getList routes through refine-adapter', async () => {
    const { createSupabaseDataProvider } = await import('./data-provider');
    const dp = await createSupabaseDataProvider({} as any);
    const result = await dp.getList({ resource: 'posts' });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(requireValue(result.data[0])['id']).toBe(1);
  });

  test('create returns new record', async () => {
    const { createSupabaseDataProvider } = await import('./data-provider');
    const dp = await createSupabaseDataProvider({} as any);
    const result = await dp.create({ resource: 'posts', variables: { title: 'New Item' } });
    expect(result.data['id']).toBe(2);
  });

  test('custom invokes RPC with prefix rpc/', async () => {
    const { createSupabaseDataProvider } = await import('./data-provider');
    const client = createMockSupabaseClient();
    const dp = createSupabaseDataProvider(client);

    if (!dp.custom) throw new Error('dp.custom should be defined');
    const res = await dp.custom({
      url: 'rpc/calculate_order_stats',
      method: 'post',
      payload: { order_id: 123 },
    });

    expect(client.rpc).toHaveBeenCalled();
    expect((res.data as any).fnName).toBe('calculate_order_stats');
    expect((res.data as any).args).toEqual({ order_id: 123 });
  });

  test('custom invokes RPC with meta.rpc and schema targeting', async () => {
    const { createSupabaseDataProvider } = await import('./data-provider');
    const client = createMockSupabaseClient();
    const dp = createSupabaseDataProvider(client);

    if (!dp.custom) throw new Error('dp.custom should be defined');
    const res = await dp.custom({
      url: 'atomic_intake',
      method: 'post',
      payload: { case_id: 'c1' },
      meta: { rpc: true, schema: 'api' },
    });

    expect(client.schema).toHaveBeenCalledWith('api');
    expect((res.data as any).schema).toBe('api');
    expect((res.data as any).fnName).toBe('atomic_intake');
  });

  test('custom throws descriptive error on RPC failure', async () => {
    const { createSupabaseDataProvider } = await import('./data-provider');
    const client = createMockSupabaseClient();
    const dp = createSupabaseDataProvider(client);

    if (!dp.custom) throw new Error('dp.custom should be defined');
    await expect(
      dp.custom({
        url: 'rpc/fail_proc',
        method: 'post',
      })
    ).rejects.toThrow('[svadmin/supabase] RPC function "fail_proc" failed: Database error occurred');
  });

  test('custom invokes Edge Functions with prefix functions/', async () => {
    const { createSupabaseDataProvider } = await import('./data-provider');
    const client = createMockSupabaseClient();
    const dp = createSupabaseDataProvider(client);

    if (!dp.custom) throw new Error('dp.custom should be defined');
    const res = await dp.custom({
      url: 'functions/generate-report',
      method: 'post',
      payload: { report_id: 'r100' },
      headers: { 'X-Custom-Header': 'test' },
    });

    expect(client.functions.invoke).toHaveBeenCalled();
    expect((res.data as any).fnName).toBe('generate-report');
    expect((res.data as any).options.body).toEqual({ report_id: 'r100' });
    expect((res.data as any).options.headers).toEqual({ 'X-Custom-Header': 'test' });
  });

  test('custom throws descriptive error on Edge Function failure', async () => {
    const { createSupabaseDataProvider } = await import('./data-provider');
    const client = createMockSupabaseClient();
    const dp = createSupabaseDataProvider(client);

    if (!dp.custom) throw new Error('dp.custom should be defined');
    await expect(
      dp.custom({
        url: 'functions/fail-fn',
        method: 'post',
      })
    ).rejects.toThrow('[svadmin/supabase] Edge Function "fail-fn" failed: Edge Function timeout');
  });

  test('custom handles direct table queries and mutations', async () => {
    const { createSupabaseDataProvider } = await import('./data-provider');
    const client = createMockSupabaseClient();
    const dp = createSupabaseDataProvider(client);

    if (!dp.custom) throw new Error('dp.custom should be defined');

    // GET
    const getRes = await dp.custom({
      url: 'cases_summary',
      method: 'get',
      query: { status: 'active' },
      filters: [{ field: 'tenant_id', operator: 'eq', value: 't1' }],
      sorters: [{ field: 'created_at', order: 'desc' }],
    });
    expect(client.from).toHaveBeenCalledWith('cases_summary');
    expect(Array.isArray(getRes.data)).toBe(true);

    // POST
    const postRes = await dp.custom({
      url: 'custom_events',
      method: 'post',
      payload: { event: 'clicked' },
    });
    expect(postRes.data).toEqual({ id: 10, event: 'clicked' });

    // PUT
    const putRes = await dp.custom({
      url: 'custom_events',
      method: 'put',
      payload: { name: 'updated' },
      query: { id: 1 },
    });
    expect(putRes.data).toEqual({ id: 1, name: 'updated' });

    // DELETE
    const delRes = await dp.custom({
      url: 'custom_events',
      method: 'delete',
      query: { id: 1 },
    });
    expect(delRes.data).toEqual([{ id: 1 }]);
  });
});


// ─── RPC Helper Tests ────────────────────────────────────────────
describe('Supabase RPC Helper', () => {
  test('createSupabaseRpc executes procedure and returns data', async () => {
    const { createSupabaseRpc } = await import('./rpc');
    const client = createMockSupabaseClient();
    const rpc = createSupabaseRpc(client);

    const result = await rpc.call('get_user_metrics', { user_id: 'u1' });
    expect(client.rpc).toHaveBeenCalledWith('get_user_metrics', { user_id: 'u1' }, {});
    expect((result as any).procResult).toBe(true);
    expect((result as any).fnName).toBe('get_user_metrics');
  });

  test('createSupabaseRpc respects default options and schema override', async () => {
    const { createSupabaseRpc } = await import('./rpc');
    const client = createMockSupabaseClient();
    const rpc = createSupabaseRpc(client, { schema: 'analytics', get: true });

    const result = await rpc.call('daily_active_users', { day: '2026-08-20' });
    expect(client.schema).toHaveBeenCalledWith('analytics');
    expect((result as any).schema).toBe('analytics');
    expect((result as any).options.get).toBe(true);
  });

  test('createSupabaseRpc throws formatted error on RPC failure', async () => {
    const { createSupabaseRpc } = await import('./rpc');
    const client = createMockSupabaseClient();
    const rpc = createSupabaseRpc(client);

    await expect(rpc.call('fail_proc')).rejects.toThrow(
      '[svadmin/supabase] RPC function "fail_proc" failed: Database error occurred'
    );
  });
});
