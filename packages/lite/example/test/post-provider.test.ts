import { describe, expect, test } from 'bun:test';
import type { DataProvider } from '@svadmin/core';
import { createPostProvider } from '../src/lib/post-provider';

const fallback: DataProvider = {
  getApiUrl: () => '/api',
  getList: async () => ({ data: [{ id: 'fallback' }], total: 1 }),
  getOne: async () => ({ data: { id: 'fallback' } }),
  create: async () => ({ data: { id: 'fallback' } }),
  update: async () => ({ data: { id: 'fallback' } }),
  deleteOne: async () => ({ data: { id: 'fallback' } }),
};

describe('Lite example post provider', () => {
  test('validates writes and snapshots returned records', async () => {
    const provider = createPostProvider(fallback);
    const variables = { title: 'Created' };
    const result = await provider.create({ resource: 'posts', variables });
    expect(result.data).toEqual({ id: 4, title: 'Created', status: 'draft' });
    variables.title = 'caller modified';
    result.data['title'] = 'receipt modified';
    expect((await provider.getOne({ resource: 'posts', id: 4 })).data['title']).toBe('Created');
    await provider.update({ resource: 'posts', id: '4', variables: { status: 'published' } });
    expect((await provider.getOne({ resource: 'posts', id: 4 })).data['status']).toBe('published');
  });

  test('rejects malformed inputs and ID overrides without changing records', async () => {
    const provider = createPostProvider(fallback);
    const before = await provider.getList({ resource: 'posts' });
    for (const variables of [null, { title: 1 }, { title: '' }, { title: 'X', status: 'admin' }, { title: 'X', id: 10 }]) {
      await expect(provider.create({ resource: 'posts', variables })).rejects.toThrow('Invalid post input.');
    }
    await expect(provider.update({ resource: 'posts', id: 1, variables: { id: 2 } })).rejects.toThrow('Invalid post input.');
    expect(await provider.getList({ resource: 'posts' })).toEqual(before);
  });

  test('does not invoke accessors in post input', async () => {
    let reads = 0;
    const provider = createPostProvider(fallback);
    await expect(provider.create({ resource: 'posts', variables: {
      get title() { reads++; throw new Error('private-token'); },
    } })).rejects.toThrow('Invalid plain data');
    expect(reads).toBe(0);
  });

  test('handles search, sorting, pagination and missing records explicitly', async () => {
    const provider = createPostProvider(fallback);
    const list = await provider.getList({
      resource: 'posts', filters: [{ field: 'title', operator: 'contains', value: 'native' }],
      sorters: [{ field: 'id', order: 'desc' }], pagination: { current: 1, pageSize: 1 },
    });
    expect(list.data).toEqual([{ id: 2, title: 'Native form actions', status: 'draft' }]);
    expect(list.total).toBe(1);
    await expect(provider.getList({ resource: 'posts', pagination: { current: 0, pageSize: 1 } }))
      .rejects.toThrow('Invalid post pagination.');
    await expect(provider.update({ resource: 'posts', id: 999, variables: { title: 'X' } })).rejects.toThrow('Post not found.');
    await expect(provider.deleteOne({ resource: 'posts', id: 999 })).rejects.toThrow('Post not found.');
    expect((await provider.getList({ resource: 'posts' })).total).toBe(3);
    expect((await provider.deleteOne({ resource: 'posts', id: '1' })).data['id']).toBe(1);
  });

  test('delegates other resources to the existing validated example provider', async () => {
    const provider = createPostProvider(fallback);
    expect(await provider.getList({ resource: 'products' })).toEqual({ data: [{ id: 'fallback' }], total: 1 });
  });
});
