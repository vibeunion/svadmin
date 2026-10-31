import { describe, expect, test } from 'bun:test';
import { Type } from 'typebox';
import { createEditableTableController } from './editable-table';
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
});
