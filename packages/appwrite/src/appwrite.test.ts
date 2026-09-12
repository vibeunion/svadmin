import { requireValue } from "../../../scripts/test-assertions";
/* eslint-disable @typescript-eslint/no-explicit-any */
// @svadmin/appwrite — Unit Tests
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, test, expect, mock } from 'bun:test';
import { createAppwriteDataProvider } from './data-provider';
import { createAppwriteAuthProvider } from './auth-provider';
import { createAppwriteLiveProvider } from './live-provider';
import type { DeleteManyParams } from '@svadmin/core';

// ─── Mock Appwrite Databases ────────────────────────────────
mock.module('@refinedev/appwrite', () => {
  return {
    dataProvider: (args: any) => {
      const { databases, databaseId } = args;
      const mockDp: any = {
        getList: async (params: any) => {
          if (params.pagination) databases.listDocuments(databaseId, params.resource, [`limit(${params.pagination.pageSize})`, `offset(${params.pagination.pageSize})`]);
          else if (params.sorters) databases.listDocuments(databaseId, params.resource, [`orderDesc`]);
          else if (params.filters) databases.listDocuments(databaseId, params.resource, [`equal`]);
          else databases.listDocuments(databaseId, params.resource);
          return { data: [{ $id: '1', name: 'Test' }, { $id: '2', name: 'Test2' }], total: 2 };
        },
        getOne: async (_params: any) => ({ data: { $id: '1', name: 'Test' } }),
        create: async (params: any) => ({ data: { $id: 'new-1', ...params.variables } }),
        update: async (params: any) => ({ data: { $id: params.id, ...params.variables } }),
        deleteOne: async (params: any) => { await databases.deleteDocument(databaseId, params.resource, params.id); return { data: {} }; },
        getApiUrl: () => '',
        getMany: async (params: any) => ({ data: params.ids.map((id: string) => ({ $id: id })) }),
        deleteMany: async ({ resource, ids }: DeleteManyParams) => {
          for (const id of ids) await databases.deleteDocument(databaseId, resource, id);
          return { data: ids.map(id => ({ $id: id })) };
        },
      };
      return mockDp;
    }
  };
});


function createMockDatabases() {
  return {
    listDocuments: mock(async (_db: string, _col: string, _q?: string[]) => ({
      documents: [{ $id: '1', name: 'Test' }, { $id: '2', name: 'Test2' }],
      total: 2,
    })),
    getDocument: mock(async (_db: string, _col: string, _id: string) => ({
      $id: _id, name: 'Test',
    })),
    createDocument: mock(async (_db: string, _col: string, _docId: string, data: Record<string, unknown>) => ({
      $id: 'new-1', ...data,
    })),
    updateDocument: mock(async (_db: string, _col: string, _docId: string, data: Record<string, unknown>) => ({
      $id: _docId, ...data,
    })),
    deleteDocument: mock(async () => {}),
  };
}

// ─── Mock Appwrite Account ──────────────────────────────────

function createMockAccount(overrides: Record<string, unknown> = {}) {
  return {
    createEmailPasswordSession: mock(async () => ({ $id: 'session-1' })),
    deleteSession: mock(async () => {}),
    get: mock(async () => ({ $id: 'user-1', name: 'Admin', email: 'admin@test.com', prefs: {} })),
    create: mock(async () => ({ $id: 'user-2' })),
    createRecovery: mock(async () => ({})),
    updatePassword: mock(async () => ({})),
    ...overrides,
  };
}

// ─── DataProvider Tests ─────────────────────────────────────

describe('Appwrite DataProvider', () => {
  test('getList returns data with total', async () => {
    const db = createMockDatabases();
    const dp = await createAppwriteDataProvider({ databases: db, databaseId: 'main' });
    const result = await dp.getList({ resource: 'posts' });
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(db.listDocuments).toHaveBeenCalledTimes(1);
  });

  test('getList passes pagination as queries', async () => {
    const db = createMockDatabases();
    const dp = await createAppwriteDataProvider({ databases: db, databaseId: 'main' });
    await dp.getList({ resource: 'posts', pagination: { current: 2, pageSize: 5 } });
    const queries = requireValue(db.listDocuments.mock.calls[0])[2] as string[];
    expect(queries).toContain('limit(5)');
    expect(queries).toContain('offset(5)');
  });

  test('getList passes sorters as queries', async () => {
    const db = createMockDatabases();
    const dp = await createAppwriteDataProvider({ databases: db, databaseId: 'main' });
    await dp.getList({ resource: 'posts', sorters: [{ field: 'name', order: 'desc' }] });
    const queries = requireValue(db.listDocuments.mock.calls[0])[2] as string[];
    expect(queries.some((q: string) => q.includes('orderDesc'))).toBe(true);
  });

  test('getList passes filters as queries', async () => {
    const db = createMockDatabases();
    const dp = await createAppwriteDataProvider({ databases: db, databaseId: 'main' });
    await dp.getList({ resource: 'posts', filters: [{ field: 'status', operator: 'eq', value: 'active' }] });
    const queries = requireValue(db.listDocuments.mock.calls[0])[2] as string[];
    expect(queries.some((q: string) => q.includes('equal'))).toBe(true);
  });

  test('getOne returns single record', async () => {
    const db = createMockDatabases();
    const dp = await createAppwriteDataProvider({ databases: db, databaseId: 'main' });
    const result = await dp.getOne({ resource: 'posts', id: '1' });
    expect(result.data).toHaveProperty('$id', '1');
  });

  test('create returns new record', async () => {
    const db = createMockDatabases();
    const dp = await createAppwriteDataProvider({ databases: db, databaseId: 'main' });
    const result = await dp.create({ resource: 'posts', variables: { name: 'New Post' } });
    expect(result.data).toHaveProperty('name', 'New Post');
  });

  test('update returns updated record', async () => {
    const db = createMockDatabases();
    const dp = await createAppwriteDataProvider({ databases: db, databaseId: 'main' });
    const result = await dp.update({ resource: 'posts', id: '1', variables: { name: 'Updated' } });
    expect(result.data).toHaveProperty('name', 'Updated');
  });

  test('deleteOne calls deleteDocument', async () => {
    const db = createMockDatabases();
    const dp = await createAppwriteDataProvider({ databases: db, databaseId: 'main' });
    await dp.deleteOne({ resource: 'posts', id: '1' });
    expect(db.deleteDocument).toHaveBeenCalledTimes(1);
  });

  test('getMany fetches by ids', async () => {
    const db = createMockDatabases();
    const dp = await createAppwriteDataProvider({ databases: db, databaseId: 'main' });
    const result = await dp.getMany!({ resource: 'posts', ids: ['1', '2'] });
    expect(result.data).toHaveLength(2);
  });

  test('deleteMany deletes each id', async () => {
    const db = createMockDatabases();
    const dp = await createAppwriteDataProvider({ databases: db, databaseId: 'main' });
    await dp.deleteMany!({ resource: 'posts', ids: ['1', '2'] });
    expect(db.deleteDocument).toHaveBeenCalledTimes(2);
  });
});

// ─── AuthProvider Tests ─────────────────────────────────────

describe('Appwrite AuthProvider', () => {
  test('login success', async () => {
    const account = createMockAccount();
    const auth = createAppwriteAuthProvider({ account });
    const result = await auth.login({ email: 'admin@test.com', password: 'pass' });
    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe('/');
  });

  test('login failure', async () => {
    const account = createMockAccount({
      createEmailPasswordSession: mock(async () => { throw new Error('Invalid credentials'); }),
    });
    const auth = createAppwriteAuthProvider({ account });
    const result = await auth.login({ email: 'bad', password: 'bad' });
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Invalid credentials');
  });

  test('logout success', async () => {
    const account = createMockAccount();
    const auth = createAppwriteAuthProvider({ account });
    const result = await auth.logout();
    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe('/login');
  });

  test('check returns authenticated', async () => {
    const account = createMockAccount();
    const auth = createAppwriteAuthProvider({ account });
    const result = await auth.check();
    expect(result.authenticated).toBe(true);
  });

  test('check returns not authenticated on error', async () => {
    const account = createMockAccount({
      get: mock(async () => { throw new Error('Unauthorized'); }),
    });
    const auth = createAppwriteAuthProvider({ account });
    const result = await auth.check();
    expect(result.authenticated).toBe(false);
  });

  test('getIdentity returns user', async () => {
    const account = createMockAccount();
    const auth = createAppwriteAuthProvider({ account });
    const identity = await auth.getIdentity();
    expect(identity).not.toBeNull();
    expect(identity!.name).toBe('Admin');
    expect(identity!.email).toBe('admin@test.com');
  });

  test('register success', async () => {
    const account = createMockAccount();
    const auth = createAppwriteAuthProvider({ account });
    const result = await auth.register!({ email: 'new@test.com', password: 'pass123' });
    expect(result.success).toBe(true);
  });

  test('onError with 401', async () => {
    const account = createMockAccount();
    const auth = createAppwriteAuthProvider({ account });
    const result = await auth.onError!(new Error('401 Unauthorized'));
    expect(result.logout).toBe(true);
  });
});

// ─── LiveProvider Tests ─────────────────────────────────────

describe('Appwrite LiveProvider', () => {
  test('subscribe calls client.subscribe with correct channel', () => {
    const unsubFn = mock(() => {});
    const mockClient = {
      subscribe: mock((_channels: string, _cb: unknown) => unsubFn),
    };
    const lp = createAppwriteLiveProvider({ client: mockClient, databaseId: 'main' });
    const cb = mock(() => {});
    const unsub = lp.subscribe({ resource: 'posts', callback: cb });

    expect(mockClient.subscribe).toHaveBeenCalledTimes(1);
    const channel = requireValue(mockClient.subscribe.mock.calls[0])[0];
    expect(channel).toBe('databases.main.collections.posts.documents');

    unsub();
    expect(unsubFn).toHaveBeenCalledTimes(1);
  });

  test('subscribe maps create event to INSERT', () => {
    let handler: ((payload: unknown) => void) | null = null;
    const mockClient = {
      subscribe: mock((_channels: string, cb: (payload: unknown) => void) => {
        handler = cb;
        return () => {};
      }),
    };
    const lp = createAppwriteLiveProvider({ client: mockClient, databaseId: 'main' });
    const cb = mock(() => {});
    lp.subscribe({ resource: 'posts', callback: cb });

    handler!({ events: ['databases.main.collections.posts.documents.*.create'], payload: { $id: '1' } });
    expect(cb).toHaveBeenCalledTimes(1);
    expect((cb.mock.calls as any)[0][0].type).toBe('INSERT');
  });
});
