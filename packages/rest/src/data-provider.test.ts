import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createRestDataProvider } from './data-provider';

const refineInit = mock((..._args: unknown[]) => ({
  getApiUrl: () => 'https://api.example.test',
  getList: mock(async () => ({ data: [{ id: 1, title: 'First' }], total: 1 })),
  getOne: mock(async ({ id }: { id: string | number }) => ({ data: { id, title: 'First' } })),
  create: mock(async ({ variables }: { variables: Record<string, unknown> }) => ({ data: { id: 2, ...variables } })),
  update: mock(async ({ id, variables }: { id: string | number; variables: Record<string, unknown> }) => ({ data: { id, ...variables } })),
  deleteOne: mock(async ({ id }: { id: string | number }) => ({ data: { id } })),
}));

mock.module('@refinedev/rest', () => ({
  default: refineInit,
}));

describe('createRestDataProvider', () => {
  beforeEach(() => {
    refineInit.mockClear();
  });

  test('forwards arguments to @refinedev/rest', async () => {
    const resources = { posts: { path: '/posts' } };
    const provider = await createRestDataProvider(resources);

    expect(refineInit).toHaveBeenCalledWith(resources);
    expect(provider.getApiUrl()).toBe('https://api.example.test');
    await expect(provider.getList({ resource: 'posts' })).resolves.toEqual({
      data: [{ id: 1, title: 'First' }],
      total: 1,
    });
  });

  test('passes create, update, and delete through the adapter', async () => {
    const provider = await createRestDataProvider({});

    await expect(provider.create({ resource: 'posts', variables: { title: 'New' } })).resolves.toEqual({
      data: { id: 2, title: 'New' },
    });
    await expect(provider.update({ resource: 'posts', id: 2, variables: { title: 'Updated' } })).resolves.toEqual({
      data: { id: 2, title: 'Updated' },
    });
    await expect(provider.deleteOne({ resource: 'posts', id: 2 })).resolves.toEqual({
      data: { id: 2 },
    });
  });
});