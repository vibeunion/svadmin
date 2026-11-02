import { describe, expect, it } from 'bun:test';
import { createMockDataProvider } from './mock-provider';

describe('createMockDataProvider', () => {
  it('initializes with default enterprise records', async () => {
    const provider = createMockDataProvider();
    const result = await provider.getList({ resource: 'users' });

    expect(result.total).toBe(4);
    expect(result.data.length).toBe(4);
    expect(result.data[0].name).toBe('Alice Chen');
    expect(provider.getApiUrl()).toBe('mock://local');
  });

  it('handles filtering, sorting, and pagination', async () => {
    const provider = createMockDataProvider();

    // Filter by role = 'editor'
    const filtered = await provider.getList({
      resource: 'users',
      filters: [{ field: 'role', operator: 'eq', value: 'editor' }],
    });
    expect(filtered.total).toBe(2);
    expect(filtered.data.every(u => u['role'] === 'editor')).toBe(true);

    // Sorting by views desc
    const sorted = await provider.getList({
      resource: 'posts',
      sorters: [{ field: 'views', order: 'desc' }],
    });
    expect(sorted.data[0]['views']).toBe(3420);

    // Pagination
    const page = await provider.getList({
      resource: 'posts',
      pagination: { current: 1, pageSize: 2 },
    });
    expect(page.data.length).toBe(2);
    expect(page.total).toBe(5);
  });

  it('supports full CRUD cycle', async () => {
    const provider = createMockDataProvider();

    // 1. Create
    const created = await provider.create({
      resource: 'posts',
      variables: { title: 'New Test Post', status: 'draft', views: 10 },
    });
    expect(created.data['title']).toBe('New Test Post');
    const newId = created.data['id'];
    expect(newId).toBeDefined();

    // 2. GetOne
    const fetched = await provider.getOne({ resource: 'posts', id: newId as number });
    expect(fetched.data['title']).toBe('New Test Post');

    // 3. Update
    const updated = await provider.update({
      resource: 'posts',
      id: newId as number,
      variables: { status: 'published' },
    });
    expect(updated.data['status']).toBe('published');

    // 4. DeleteOne
    const deleted = await provider.deleteOne({ resource: 'posts', id: newId as number });
    expect(deleted.data['id']).toBe(newId);

    // Verify deleted
    expect(provider.getOne({ resource: 'posts', id: newId as number })).rejects.toThrow();
  });

  it('resets data cleanly', async () => {
    const provider = createMockDataProvider();
    await provider.create({
      resource: 'users',
      variables: { name: 'Temporary User' },
    });
    expect((await provider.getList({ resource: 'users' })).total).toBe(5);

    provider.resetData();
    expect((await provider.getList({ resource: 'users' })).total).toBe(4);
  });
});
