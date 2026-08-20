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
      ...(overrides.auth || {}),
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
      ...(overrides.functions || {}),
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
            return Promise.resolve({ data: { success: true }, error: null }).then(onfulfilled);
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
    expect(result.data[0].id).toBe(1);
  });

  test('create returns new record', async () => {
    const { createSupabaseDataProvider } = await import('./data-provider');
    const dp = await createSupabaseDataProvider({} as any);
    const result = await dp.create({ resource: 'posts', variables: { title: 'New Item' } });
    expect(result.data.id).toBe(2);
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
    expect(delRes.data).toEqual({ success: true });
  });
});


// ─── RPC Helper Tests ────────────────────────────────────────────
describe('Supabase RPC Helper', () => {
  test('createSupabaseRpc executes procedure and returns data', async () => {
    const { createSupabaseRpc } = await import('./rpc');
    const client = createMockSupabaseClient();
    const rpc = createSupabaseRpc(client);

    const result = await rpc.call('get_user_metrics', { user_id: 'u1' });
    expect(client.rpc).toHaveBeenCalledWith('get_user_metrics', { user_id: 'u1' }, { head: undefined, count: undefined, get: undefined });
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


// ─── AuthProvider Tests ──────────────────────────────────────────
describe('Supabase AuthProvider', () => {
  test('login success', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const auth = createSupabaseAuthProvider(createMockSupabaseClient());
    const result = await auth.login({ email: 'admin@test.com', password: 'pass' });
    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe('/');
  });

  test('login failure', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const auth = createSupabaseAuthProvider(createMockSupabaseClient());
    const result = await auth.login({ email: 'admin@test.com', password: 'bad' });
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Invalid credentials');
  });

  test('logout success', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const auth = createSupabaseAuthProvider(createMockSupabaseClient());
    const result = await auth.logout();
    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe('/login');
  });

  test('check returns authenticated when session exists', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const auth = createSupabaseAuthProvider(createMockSupabaseClient());
    const result = await auth.check();
    expect(result.authenticated).toBe(true);
  });

  test('check returns unauthenticated when no session', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const client = createMockSupabaseClient({
      auth: { getSession: mock(async () => ({ data: { session: null } })) }
    });
    const auth = createSupabaseAuthProvider(client);
    const result = await auth.check();
    expect(result.authenticated).toBe(false);
    expect(result.redirectTo).toBe('/login');
  });

  test('check clears invalid refresh token sessions', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const client = createMockSupabaseClient({
      auth: {
        getSession: mock(async () => ({
          data: { session: null },
          error: new Error('Invalid Refresh Token: Refresh Token Not Found'),
        })),
        signOut: mock(async () => ({ error: null })),
      },
    });
    const auth = createSupabaseAuthProvider(client);
    const result = await auth.check();

    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result).toEqual({
      authenticated: false,
      redirectTo: '/login',
      logout: true,
      error: { message: 'Session expired, please sign in again.' },
    });
  });

  test('getIdentity surfaces user metadata', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const auth = createSupabaseAuthProvider(createMockSupabaseClient());
    const identity = await auth.getIdentity?.();
    expect(identity?.id).toBe('user-1');
    expect(identity?.name).toBe('Admin');
    expect(identity?.avatar).toBe('http://avatar');
    expect(identity?.token).toBe('valid-token');
  });

  test('getPermissions fails closed without a trusted resolver', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const auth = createSupabaseAuthProvider(createMockSupabaseClient());
    const perms = await auth.getPermissions?.();
    expect(perms).toBeNull();
  });

  test('getPermissions uses the configured permission resolver', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const auth = createSupabaseAuthProvider(createMockSupabaseClient(), {
      getPermissions: ({ user }) => ({
        role: user.user_metadata?.role,
        capabilities: ['billing.read'],
      }),
    });
    const perms = await auth.getPermissions?.();
    expect(perms).toEqual({
      role: 'admin',
      capabilities: ['billing.read'],
    });
  });

  test('getPermissions surfaces transient user lookup errors without calling the resolver', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const resolver = mock(() => ({ role: 'admin' }));
    const client = createMockSupabaseClient({
      auth: {
        getUser: mock(async () => ({
          data: { user: null },
          error: new Error('Network error'),
        })),
      },
    });
    const auth = createSupabaseAuthProvider(client, { getPermissions: resolver });

    await expect(auth.getPermissions?.()).rejects.toThrow('Network error');
    expect(resolver).not.toHaveBeenCalled();
  });

  test('getIdentity clears invalid refresh token sessions', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const client = createMockSupabaseClient({
      auth: {
        getUser: mock(async () => ({
          data: { user: null },
          error: new Error('Invalid Refresh Token: Refresh Token Not Found'),
        })),
        signOut: mock(async () => ({ error: null })),
      },
    });
    const auth = createSupabaseAuthProvider(client);
    const identity = await auth.getIdentity?.();

    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(identity).toBeNull();
  });

  test('onError returns logout true on 401 with no session', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const client = createMockSupabaseClient({
      auth: { getSession: mock(async () => ({ data: { session: null } })) }
    });
    const auth = createSupabaseAuthProvider(client);
    const result = await auth.onError?.(new Error('401 Unauthorized'));
    expect(result?.logout).toBe(true);
    expect(result?.redirectTo).toBe('/login');
  });

  test('onError swallows 401 if token actually exists (race condition guard)', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const auth = createSupabaseAuthProvider(createMockSupabaseClient());
    const result = await auth.onError?.(new Error('401 Unauthorized'));
    expect(result?.logout).toBeUndefined();
    expect(result?.redirectTo).toBeUndefined();
  });

  test('onError logs out on invalid refresh token', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const client = createMockSupabaseClient({
      auth: {
        signOut: mock(async () => ({ error: null })),
      },
    });
    const auth = createSupabaseAuthProvider(client);
    const result = await auth.onError?.(new Error('Invalid Refresh Token: Refresh Token Not Found'));

    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result).toEqual({
      redirectTo: '/login',
      logout: true,
    });
  });
});


// ─── LiveProvider Tests ──────────────────────────────────────────
describe('Supabase LiveProvider', () => {
  test('subscribe builds channel and binds events', async () => {
    const { createSupabaseLiveProvider } = await import('./live-provider');
    const client = createMockSupabaseClient();
    const live = createSupabaseLiveProvider(client);
    
    let callbackEvent: any = null;
    const unsub = live.subscribe({
      resource: 'posts',
      callback: (e) => { callbackEvent = e; }
    });

    expect(client.channel).toHaveBeenCalledWith('live-posts');
    const channelMock = (client.channel as ReturnType<typeof mock>).mock.results[0].value;
    expect(channelMock.on).toHaveBeenCalled();
    expect(channelMock.subscribe).toHaveBeenCalled();

    const onCalls = channelMock.on.mock.calls;
    const postgresChangesCall = onCalls.find((call: any[]) => call[0] === 'postgres_changes');
    expect(postgresChangesCall).toBeDefined();

    const postgresChangesHandler = postgresChangesCall[2] as (payload: {
      eventType: string;
      new: Record<string, unknown>;
      old: null;
    }) => void;
    postgresChangesHandler({ eventType: 'INSERT', new: { id: 1 }, old: null });
    expect(callbackEvent).toEqual({
      type: 'INSERT',
      resource: 'posts',
      payload: { id: 1 },
    });

    unsub();
    expect(channelMock.unsubscribe).toHaveBeenCalled();
  });

  test('publish triggers broadcast send', async () => {
    const { createSupabaseLiveProvider } = await import('./live-provider');
    const client = createMockSupabaseClient();
    const live = createSupabaseLiveProvider(client);
    
    live.publish?.({ type: 'INSERT', resource: 'posts', payload: { a: 1 } });
    
    const channelMock = (client.channel as ReturnType<typeof mock>).mock.results[0].value;
    expect(channelMock.send).toHaveBeenCalled();
    const sendArgs = channelMock.send.mock.calls[0][0];
    expect(sendArgs.type).toBe('broadcast');
    expect(sendArgs.event).toBe('live-event');
    expect(sendArgs.payload.type).toBe('INSERT');
  });
});


// ─── SupaCloud Task Provider Tests ───────────────────────────────
describe('SupaCloud Task Provider', () => {
  test('submit proxies to supacloud tasks client', async () => {
    const { createSupaCloudTaskProvider } = await import('./supacloud');
    const taskHandle = {
      id: 'task-1',
      wait: mock(async () => ({ id: 'task-1', status: 'done' })),
    };
    const supacloud = {
      submit: mock(async () => taskHandle),
      get: mock(async () => ({ id: 'task-1', status: 'done' })),
    };

    const provider = createSupaCloudTaskProvider({ supacloud });
    const result = await provider.submit('image.generate', {
      body: { prompt: 'poster' },
      idempotencyKey: 'job-1',
    });

    expect(supacloud.submit).toHaveBeenCalledWith('image.generate', {
      body: { prompt: 'poster' },
      idempotencyKey: 'job-1',
    });
    expect(result).toBe(taskHandle);
  });

  test('list normalizes object payload with data field', async () => {
    const { createSupaCloudTaskProvider } = await import('./supacloud');
    const supacloud: import('@svadmin/core').TaskProvider<{ id: string; status: string }> = {
      submit: mock(async () => ({ wait: async () => ({ id: 'task-1', status: 'queued' }) })),
      get: mock(async () => ({ id: 'task-1', status: 'queued' })),
      list: mock(async () => ({ data: [{ id: 'task-1', status: 'queued' }] })),
    };

    const provider = createSupaCloudTaskProvider({ supacloud });
    if (!provider.list) throw new Error('provider.list should exist');
    const tasks = await provider.list();

    expect(tasks).toEqual({
      data: [{ id: 'task-1', status: 'queued' }],
      total: 1,
    });
  });

  test('listDlq throws clear error when capability is missing', async () => {
    const { createSupaCloudTaskProvider } = await import('./supacloud');
    const supacloud: import('@svadmin/core').TaskProvider<{ id: string }> = {
      submit: mock(async () => ({ wait: async () => ({ id: 'task-1' }) })),
      get: mock(async () => ({ id: 'task-1' })),
    };

    const provider = createSupaCloudTaskProvider({ supacloud });
    if (!provider.listDlq) throw new Error('provider.listDlq should exist');

    await expect(provider.listDlq()).rejects.toThrow('tasks.listDlq');
  });
});


// ─── SupaCloud Task LiveProvider Tests ───────────────────────────
describe('SupaCloud Task LiveProvider', () => {
  test('subscribe requires taskId in liveParams', async () => {
    const { createSupaCloudTaskLiveProvider } = await import('./supacloud');
    const supacloud = {
      subscribe: mock(() => ({ unsubscribe: mock(() => {}) })),
    };

    const live = createSupaCloudTaskLiveProvider({ supacloud });

    expect(() =>
      live.subscribe({
        resource: 'tasks',
        callback: () => {},
      }),
    ).toThrow('liveParams.taskId');
  });

  test('subscribe maps task updates into svadmin live events', async () => {
    const { createSupaCloudTaskLiveProvider } = await import('./supacloud');
    let receivedTaskCallback: ((task: Record<string, unknown>) => void) | undefined;
    const unsubscribe = mock(() => {});
    const supacloud = {
      subscribe: mock((taskId: string, callback: (task: Record<string, unknown>) => void) => {
        receivedTaskCallback = callback;
        expect(taskId).toBe('task-42');
        return { unsubscribe };
      }),
    };

    const live = createSupaCloudTaskLiveProvider({ supacloud });
    const callback = mock(() => {});
    const stop = live.subscribe({
      resource: 'tasks',
      liveParams: { taskId: 'task-42' },
      callback,
    });

    receivedTaskCallback?.({ id: 'task-42', status: 'running' });

    expect(callback).toHaveBeenCalledWith({
      type: 'UPDATE',
      resource: 'tasks',
      payload: { id: 'task-42', status: 'running' },
    });

    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
