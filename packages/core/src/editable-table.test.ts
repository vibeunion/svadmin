import { describe, expect, test } from 'bun:test';
import { Type } from 'typebox';
import { createEditableTableController, resolveEditableTableQuery } from './editable-table';
import { defineResource } from './resource-contract';
import type { DataProvider } from './types';

const posts = defineResource('posts', {
  record: Type.Object({
    id: Type.String(),
    title: Type.String(),
  }, { additionalProperties: false }),
  create: Type.Object({
    title: Type.String(),
  }, { additionalProperties: false }),
  update: Type.Object({
    title: Type.Optional(Type.String()),
  }, { additionalProperties: false }),
});

function provider(failUpdates = 0): DataProvider & { updates: unknown[]; batches: unknown[] } {
  const updates: unknown[] = [];
  const batches: unknown[] = [];
  let remainingFailures = failUpdates;
  return {
    updates,
    batches,
    getApiUrl: () => 'https://example.test',
    getList: async () => ({ data: [{ id: '1', title: 'One' }], total: 1 }),
    getOne: async () => ({ data: { id: '1', title: 'One' } }),
    create: async (params) => ({ data: { id: '2', ...(params.variables as Record<string, unknown>) } }),
    update: async (params) => {
      updates.push(params.variables);
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw new Error('secret-failure-body');
      }
      return { data: { id: params.id, ...(params.variables as Record<string, unknown>) } };
    },
    deleteOne: async () => ({ data: { id: '1' } }),
    updateMany: async (params) => {
      batches.push(params.variables);
      return { data: params.ids.map((id) => ({ id, ...(params.variables as Record<string, unknown>) })) };
    },
  };
}

describe('useEditableTable contract', () => {
  test('prefers URL page, sort, and filters when sync is enabled', () => {
    expect(resolveEditableTableQuery({
      syncWithLocation: true,
      pagination: { current: 1, pageSize: 50 },
      filters: [{ field: 'title', operator: 'eq', value: 'local' }],
    }, {
      page: 4,
      pageSize: 25,
      sortField: 'title',
      sortOrder: 'desc',
      filters: [{ field: 'title', operator: 'containss', value: 'Remote' }],
    })).toEqual({
      pagination: { current: 4, pageSize: 25 },
      sorters: [{ field: 'title', order: 'desc' }],
      filters: [{ field: 'title', operator: 'containss', value: 'Remote' }],
    });
  });
  test('validates, recovers from a failed save, and applies a batch edit', async () => {
    const data = provider(1);
    const table = createEditableTableController(posts, data);
    await table.load();
    expect(table.snapshot().rows).toEqual([{ id: '1', title: 'One' }]);

    table.setCell(0, 'title', 12);
    await table.submit();
    expect(table.snapshot().errors['1']).toBe('Invalid update input');
    expect(table.snapshot().rows[0]?.title).toBe(12);
    expect(data.updates).toHaveLength(0);

    table.setCell(0, 'title', 'Two');
    await table.submit();
    expect(table.snapshot().failure).toBe('1 row(s) were not saved');
    expect(table.snapshot().errors['1']).toBe('Save failed');
    expect(JSON.stringify(table.snapshot())).not.toContain('secret-failure-body');

    await table.retry();
    expect(table.snapshot().failure).toBeNull();
    expect(table.snapshot().rows[0]?.title).toBe('Two');

    await table.submitBatch({ title: 'Batch' });
    expect(data.batches).toEqual([{ title: 'Batch' }]);
    expect(table.snapshot().rows[0]?.title).toBe('Batch');
  });

  test('creates a new row through the create schema', async () => {
    const data = provider();
    const table = createEditableTableController(posts, data);
    await table.load();
    table.addRow();
    const createdIndex = table.snapshot().rows.length - 1;
    table.setCell(createdIndex, 'title', 'Fresh');
    await table.submit();
    expect(table.snapshot().failure).toBeNull();
    expect(table.snapshot().rows.some((row) => row.title === 'Fresh' && row.id === '2')).toBe(true);
  });

  test('ignores a second submit while the first create is still in flight', async () => {
    let creates = 0;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const data = provider();
    data.create = async (params) => {
      creates += 1;
      await gate;
      return { data: { id: '2', ...(params.variables as Record<string, unknown>) } };
    };
    const table = createEditableTableController(posts, data);
    await table.load();
    table.addRow();
    const createdIndex = table.snapshot().rows.length - 1;
    table.setCell(createdIndex, 'title', 'Fresh');
    const pending = Promise.all([table.submit(), table.submit()]);
    expect(creates).toBe(1);
    expect(table.snapshot().saving).toBe(true);
    release();
    await pending;
    expect(creates).toBe(1);
    expect(table.snapshot().failure).toBeNull();
  });

  test('rejects a provider record that does not match the contract', async () => {
    const data = provider();
    data.create = async () => ({ data: { id: 2, title: 9 } });
    const table = createEditableTableController(posts, data);
    await table.load();
    table.addRow();
    const createdIndex = table.snapshot().rows.length - 1;
    table.setCell(createdIndex, 'title', 'Fresh');
    await table.submit();
    expect(table.snapshot().failure).toBe('1 row(s) were not saved');
    expect(table.snapshot().rows.some((row) => row.title === 9 || row.id === 2)).toBe(false);
    expect(table.snapshot().rows[createdIndex]?.title).toBe('Fresh');
  });

  test('loads with the caller filters, sorters, and pagination', async () => {
    const lists: unknown[] = [];
    const data = provider();
    data.getList = async (params) => {
      lists.push(params);
      return { data: [{ id: '1', title: 'One' }], total: 1 };
    };
    const table = createEditableTableController(posts, data, {
      pagination: { current: 3, pageSize: 5 },
      sorters: [{ field: 'title', order: 'desc' }],
      filters: [{ field: 'title', operator: 'containss', value: 'One' }],
      retry: 1,
    });
    await table.load();
    expect(lists).toEqual([{
      resource: 'posts',
      pagination: { current: 3, pageSize: 5 },
      sorters: [{ field: 'title', order: 'desc' }],
      filters: [{ field: 'title', operator: 'containss', value: 'One' }],
    }]);
  });

  test('retries a failed load and does not retry an invalid record', async () => {
    let reads = 0;
    const data = provider();
    data.getList = async () => {
      reads += 1;
      if (reads === 1) throw new Error('temporary');
      return { data: [{ id: '1', title: 'One' }], total: 1 };
    };
    const retried = createEditableTableController(posts, data, { retry: 1 });
    await retried.load();
    expect(reads).toBe(2);
    expect(retried.snapshot().rows[0]?.title).toBe('One');

    const invalid = provider();
    invalid.getList = async () => ({ data: [{ id: '1' }], total: 1 });
    const rejected = createEditableTableController(posts, invalid, { retry: 2 });
    await expect(rejected.load()).rejects.toBeDefined();
    expect(rejected.snapshot().failure).toBe('Could not load rows');
    expect(rejected.snapshot().rows).toEqual([]);
  });
});
