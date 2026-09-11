// @svadmin/pocketbase — Unit Tests
import { describe, test, expect, mock } from 'bun:test';
import { requireValue } from '../../../scripts/test-assertions';
import { createPocketBaseDataProvider } from './data-provider';
import { createPocketBaseAuthProvider } from './auth-provider';
import { createPocketBaseLiveProvider } from './live-provider';

// ─── Mock PocketBase Client ─────────────────────────────────

function createMockPB() {
  const dispose = mock(async () => {});
  const record: unknown = { id: 'user-1', name: 'Admin', email: 'admin@test.com' };
  const authStore = {
    isValid: true, record, token: 'test-token',
    clear: mock((): void => {
      authStore.isValid = false;
      authStore.record = null;
      authStore.token = '';
    }),
  };
  const mockCollection = {
    getList: mock(async (_page: number, _perPage: number, _options?: { sort?: string; filter?: string }) => ({
      items: [{ id: '1', name: 'Test' }, { id: '2', name: 'Test2' }],
      totalItems: 2,
    })),
    getOne: mock(async (id: string) => ({ id, name: 'Test' })),
    getFullList: mock(async (_options?: { filter?: string }) => [{ id: '1' }, { id: '2' }]),
    create: mock(async (data: Record<string, unknown>) => ({ id: 'new-1', ...data })),
    update: mock(async (id: string, data: Record<string, unknown>) => ({ id, ...data })),
    delete: mock(async () => true),
    subscribe: mock(async (_topic: string, _callback: (data: unknown) => void) => dispose),
    unsubscribe: mock(async () => {}),
    authWithPassword: mock(async () => ({ record: { id: 'user-1' }, token: 'tok' })),
    requestPasswordReset: mock(async () => true),
    confirmPasswordReset: mock(async () => true),
  };

  return {
    pb: {
      collection: mock(() => mockCollection),
      buildUrl: mock((path: string) => `http://localhost:8090${path}`),
      authStore,
    },
    mockCollection,
    dispose,
  };
}

// ─── DataProvider Tests ─────────────────────────────────────

describe('PocketBase DataProvider', () => {
  test('getList returns data with total', async () => {
    const { pb } = createMockPB();
    const dp = createPocketBaseDataProvider({ pb });
    const result = await dp.getList({ resource: 'posts' });
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  test('getList passes pagination', async () => {
    const { pb, mockCollection } = createMockPB();
    const dp = createPocketBaseDataProvider({ pb });
    await dp.getList({ resource: 'posts', pagination: { current: 3, pageSize: 20 } });
    expect(mockCollection.getList).toHaveBeenCalledWith(3, 20, expect.anything());
  });

  test('getList passes sorters', async () => {
    const { pb, mockCollection } = createMockPB();
    const dp = createPocketBaseDataProvider({ pb });
    await dp.getList({ resource: 'posts', sorters: [{ field: 'name', order: 'desc' }] });
    const opts = requireValue(mockCollection.getList.mock.calls[0]?.[2]);
    expect(opts.sort).toBe('-name');
  });

  test('getList passes filters', async () => {
    const { pb, mockCollection } = createMockPB();
    const dp = createPocketBaseDataProvider({ pb });
    await dp.getList({ resource: 'posts', filters: [{ field: 'status', operator: 'eq', value: 'active' }] });
    const opts = requireValue(mockCollection.getList.mock.calls[0]?.[2]);
    expect(opts.filter).toContain("status = 'active'");
  });

  test('getOne returns single record', async () => {
    const { pb } = createMockPB();
    const dp = createPocketBaseDataProvider({ pb });
    const result = await dp.getOne({ resource: 'posts', id: '1' });
    expect(result.data).toHaveProperty('id', '1');
  });

  test('create returns new record', async () => {
    const { pb } = createMockPB();
    const dp = createPocketBaseDataProvider({ pb });
    const result = await dp.create({ resource: 'posts', variables: { name: 'New' } });
    expect(result.data).toHaveProperty('name', 'New');
  });

  test('update returns updated record', async () => {
    const { pb } = createMockPB();
    const dp = createPocketBaseDataProvider({ pb });
    const result = await dp.update({ resource: 'posts', id: '1', variables: { name: 'Updated' } });
    expect(result.data).toHaveProperty('name', 'Updated');
  });

  test('deleteOne calls delete', async () => {
    const { pb, mockCollection } = createMockPB();
    const dp = createPocketBaseDataProvider({ pb });
    await dp.deleteOne({ resource: 'posts', id: '1' });
    expect(mockCollection.delete).toHaveBeenCalledWith('1');
  });

  test('getMany fetches all ids', async () => {
    const { pb, mockCollection } = createMockPB();
    const dp = createPocketBaseDataProvider({ pb });
    const result = await requireValue(dp.getMany)({ resource: 'posts', ids: ['1', '2'] });
    expect(result.data).toHaveLength(2);
    const filterArg = requireValue(mockCollection.getFullList.mock.calls[0]?.[0]);
    expect(filterArg.filter).toContain("id = '1'");
  });

  test('deleteMany deletes each', async () => {
    const { pb, mockCollection } = createMockPB();
    const dp = createPocketBaseDataProvider({ pb });
    await requireValue(dp.deleteMany)({ resource: 'posts', ids: ['1', '2'] });
    expect(mockCollection.delete).toHaveBeenCalledTimes(2);
  });

  test('getApiUrl returns correct url', () => {
    const { pb } = createMockPB();
    const dp = createPocketBaseDataProvider({ pb });
    expect(dp.getApiUrl()).toBe('http://localhost:8090/api');
  });
});

// ─── AuthProvider Tests ─────────────────────────────────────

describe('PocketBase AuthProvider', () => {
  test('login success', async () => {
    const { pb } = createMockPB();
    const auth = createPocketBaseAuthProvider({ pb });
    const result = await auth.login({ email: 'admin@test.com', password: 'pass' });
    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe('/');
  });

  test('login failure', async () => {
    const { pb, mockCollection } = createMockPB();
    mockCollection.authWithPassword = mock(async () => { throw new Error('Invalid credentials'); });
    const auth = createPocketBaseAuthProvider({ pb });
    const result = await auth.login({ email: 'bad', password: 'bad' });
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Login failed.');
  });

  test('logout clears auth store', async () => {
    const { pb } = createMockPB();
    const auth = createPocketBaseAuthProvider({ pb });
    const result = await auth.logout();
    expect(result.success).toBe(true);
    expect(pb.authStore.clear).toHaveBeenCalledTimes(1);
  });

  test('check returns authenticated when valid', async () => {
    const { pb } = createMockPB();
    const auth = createPocketBaseAuthProvider({ pb });
    const result = await auth.check();
    expect(result.authenticated).toBe(true);
  });

  test('check returns not authenticated when invalid', async () => {
    const { pb } = createMockPB();
    pb.authStore.isValid = false;
    const auth = createPocketBaseAuthProvider({ pb });
    const result = await auth.check();
    expect(result.authenticated).toBe(false);
  });

  test('getIdentity returns user', async () => {
    const { pb } = createMockPB();
    const auth = createPocketBaseAuthProvider({ pb });
    const identity = await auth.getIdentity();
    expect(identity).not.toBeNull();
    expect(requireValue(identity).name).toBe('Admin');
  });

  test('getIdentity returns null when no record', async () => {
    const { pb } = createMockPB();
    pb.authStore.record = null;
    const auth = createPocketBaseAuthProvider({ pb });
    const identity = await auth.getIdentity();
    expect(identity).toBeNull();
  });

  test('register success', async () => {
    const { pb } = createMockPB();
    const auth = createPocketBaseAuthProvider({ pb });
    const result = await requireValue(auth.register)({ email: 'new@test.com', password: 'pass', confirmPassword: 'pass' });
    expect(result.success).toBe(true);
  });
});

// ─── LiveProvider Tests ─────────────────────────────────────

describe('PocketBase LiveProvider', () => {
  test('subscribe calls pb.collection().subscribe', () => {
    const { pb, mockCollection } = createMockPB();
    const lp = createPocketBaseLiveProvider({ pb });
    const cb = mock(() => {});
    lp.subscribe({ resource: 'posts', callback: cb });
    expect(mockCollection.subscribe).toHaveBeenCalledWith('*', expect.any(Function));
  });

  test('unsubscribe calls only the disposer returned for this subscription', async () => {
    const { pb, mockCollection, dispose } = createMockPB();
    const lp = createPocketBaseLiveProvider({ pb });
    const unsub = lp.subscribe({ resource: 'posts', callback: () => {} });
    unsub();
    await Promise.resolve();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(mockCollection.unsubscribe).not.toHaveBeenCalled();
  });
});
