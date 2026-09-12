import { requireValue } from "../../../scripts/test-assertions";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect } from 'bun:test';
import { createFirebaseDataProvider } from './data-provider';

describe('Firebase DataProvider', () => {
    // Mock the raw output from a refine-firebase DataProvider
    const mockRefineProvider = {
      getList: async () => ({ data: [{ id: 'doc-1', title: 'Test' }], total: 1 }),
      getOne: async () => ({ data: { id: 'doc-1', title: 'Test' } }),
      create: async (params: any) => ({ data: { id: 'doc-2', ...params.variables } }),
      update: async (params: any) => ({ data: { id: params.id, ...params.variables } }),
      deleteOne: async (params: any) => ({ data: { id: params.id } }),
    };

    const dp = createFirebaseDataProvider(mockRefineProvider);

    test('getList routes to wrapped provider', async () => {
      expect(dp).toBeDefined();
      const res = await dp.getList({ resource: 'posts' });
      expect(res.data).toHaveLength(1);
      expect(requireValue(res.data[0])['id']).toBe('doc-1');
      expect(res.total).toBe(1);
    });

    test('getOne routes to wrapped provider', async () => {
      const res = await dp.getOne({ resource: 'posts', id: 'doc-1' });
      expect(res.data['id']).toBe('doc-1');
    });

    test('create routes to wrapped provider', async () => {
      const res = await dp.create({ resource: 'posts', variables: { key: 'val' } });
      expect(res.data['id']).toBe('doc-2');
      expect(res.data['key']).toBe('val');
    });

    test('update routes to wrapped provider', async () => {
      const res = await dp.update({ resource: 'posts', id: 'doc-1', variables: { key: 'newVal' } });
      expect(res.data['id']).toBe('doc-1');
      expect(res.data['key']).toBe('newVal');
    });

    test('deleteOne routes to wrapped provider', async () => {
      const res = await dp.deleteOne({ resource: 'posts', id: 'doc-1' });
      expect(res.data['id']).toBe('doc-1');
    });
});
