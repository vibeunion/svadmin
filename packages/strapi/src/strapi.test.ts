import { describe, test, expect, mock } from 'bun:test';
import { createStrapiDataProvider } from './data-provider';

mock.module('@refinedev/strapi-v4', () => {
  return {
    DataProvider: (..._args: unknown[]) => {
      return {
        getList: async () => ({ data: [{ id: 1 }], total: 1 }),
        getOne: async () => ({ data: { id: 1 } }),
        create: async () => ({ data: { id: "new-1" } }),
        update: async () => ({ data: { id: 1 } }),
        deleteOne: async () => ({ data: { id: 1 } }),
      };
    }
  };
});

describe('Strapi DataProvider', () => {
  test('creates svadmin-compatible wrapper', async () => {
    const dp = await createStrapiDataProvider('http://localhost:1337');
    
    // Test base operations
    const listRes = await dp.getList({ resource: 'posts' });
    expect(listRes.data).toHaveLength(1);
    expect(listRes.total).toBe(1);

    const oneRes = await dp.getOne({ resource: 'posts', id: 1 });
    expect(oneRes.data['id']).toBe(1);

    const createRes = await dp.create({ resource: 'posts', variables: {} });
    expect(createRes.data['id']).toBe('new-1');

    const updateRes = await dp.update({ resource: 'posts', id: 1, variables: {} });
    expect(updateRes.data['id']).toBe(1);
    
    const deleteRes = await dp.deleteOne({ resource: 'posts', id: 1 });
    expect(deleteRes.data['id']).toBe(1);
  });
});
