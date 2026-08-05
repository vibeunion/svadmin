/* eslint-disable @typescript-eslint/no-explicit-any */
// @svadmin/supabase — Unit Tests
/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
  const client = {
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
  // If there are top-level overrides besides auth, merge them
  for (const [key, val] of Object.entries(overrides)) {
    if (key !== 'auth') (client as any)[key] = val;
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
    const auth = createSupabaseAuthProvider(createMockSupabaseClient({
      auth: { getSession: mock(async () => ({ data: { session: null } })) }
    }));
    const result = await auth.check();
    expect(result.authenticated).toBe(false);
    expect(result.redirectTo).toBe('/login');
    expect(result.logout).toBe(true);
  });

  test('check clears invalid refresh token sessions', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const client = createMockSupabaseClient({
      auth: {
        getSession: mock(async () => ({
          data: { session: null },
          error: new Error('Refresh token is not valid'),
        })),
      }
    });
    const auth = createSupabaseAuthProvider(client);
    const result = await auth.check();
    expect(result.authenticated).toBe(false);
    expect(result.logout).toBe(true);
    expect(result.redirectTo).toBe('/login');
    expect(client.auth.signOut).toHaveBeenCalled();
  });

  test('getIdentity surfaces user metadata', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const auth = createSupabaseAuthProvider(createMockSupabaseClient());
    const identity = await auth.getIdentity();
    expect(identity).not.toBeNull();
    expect(identity!.id).toBe('user-1');
    expect(identity!.name).toBe('Admin');
    expect(identity!.avatar).toBe('http://avatar');
  });

  test('getPermissions fails closed without a trusted resolver', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const auth = createSupabaseAuthProvider(createMockSupabaseClient());
    const permissions = await auth.getPermissions?.();
    expect(permissions).toBeNull();
  });

  test('getPermissions uses the configured permission resolver', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const client = createMockSupabaseClient();
    const auth = createSupabaseAuthProvider(client, {
      getPermissions: ({ user }) => user.email === 'admin@test.com'
        ? ['admin', 'posts:edit']
        : [],
    });
    const permissions = await auth.getPermissions?.();
    expect(permissions).toEqual(['admin', 'posts:edit']);
  });

  test('getIdentity clears invalid refresh token sessions', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const client = createMockSupabaseClient({
      auth: {
        getUser: mock(async () => ({
          data: { user: null },
          error: new Error('Invalid refresh token'),
        })),
      }
    });
    const auth = createSupabaseAuthProvider(client);
    const identity = await auth.getIdentity();
    expect(identity).toBeNull();
    expect(client.auth.signOut).toHaveBeenCalled();
  });

  test('onError returns logout true on 401 with no session', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const client = createMockSupabaseClient({
      auth: { getSession: mock(async () => ({ data: { session: null } })) }
    });
    const auth = createSupabaseAuthProvider(client);
    const result = await auth.onError!(new Error('401 Unauthorized'));
    expect(result.logout).toBe(true);
    expect(result.redirectTo).toBe('/login');
    expect(client.auth.signOut).toHaveBeenCalled();
  });

  test('onError swallows 401 if token actually exists (race condition guard)', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const client = createMockSupabaseClient();
    const auth = createSupabaseAuthProvider(client);
    const result = await auth.onError!(new Error('401 Unauthorized'));
    expect(result.logout).toBeUndefined();
    expect(client.auth.signOut).not.toHaveBeenCalled();
  });

  test('onError logs out on invalid refresh token', async () => {
    const { createSupabaseAuthProvider } = await import('./auth-provider');
    const client = createMockSupabaseClient();
    const auth = createSupabaseAuthProvider(client);
    const result = await auth.onError!(new Error('Refresh token is not valid'));
    expect(result.logout).toBe(true);
    expect(result.redirectTo).toBe('/login');
    expect(client.auth.signOut).toHaveBeenCalled();
  });
});


// ─── LiveProvider Tests ──────────────────────────────────────────
describe('Supabase LiveProvider', () => {
  test('subscribe builds channel and binds events', async () => {
    const { createSupabaseLiveProvider } = await import('./live-provider');
    const client = createMockSupabaseClient();
    const live = createSupabaseLiveProvider(client);
    
    let callbackEvent: unknown;
    const unsub = live.subscribe({
      resource: 'posts',
      callback: (event) => { callbackEvent = event; }
    });
    
    expect(client.channel).toHaveBeenCalledWith('live-posts');
    const channelMock = (client.channel as ReturnType<typeof mock>).mock.results[0].value;
    expect(channelMock.on).toHaveBeenCalled();
    expect(channelMock.subscribe).toHaveBeenCalled();

    const postgresChangesHandler = channelMock.on.mock.calls[0][2] as (payload: {
      eventType: 'INSERT';
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
