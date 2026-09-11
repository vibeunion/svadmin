import { describe, expect, test } from 'bun:test';
import { decodeTaskRecord, decodeTaskList, decodeTaskSubmitOptions } from './task-contract';

describe('task data contracts', () => {
  test('preserves nullable SDK values and independent JSON snapshots', () => {
    const task = { id: 'task-1', progress: null, updated_at: null, metadata: { tenant: 'a' } };
    const record = decodeTaskRecord(task);
    task.metadata.tenant = 'b';
    expect(record).toEqual({ id: 'task-1', progress: null, updated_at: null, metadata: { tenant: 'a' } });
  });

  test('rejects invalid known fields and non-JSON extension data', () => {
    for (const value of [
      null, [], {}, { id: '' }, { id: 1 }, { id: 'task', title: 4 },
      { id: 'task', progress: Infinity }, { id: 'task', progress: 101 },
      { id: 'task', progress: -1 }, { id: 'task', priority: 0.5 },
      { id: 'task', created_at: new Date() }, { id: 'task', extra: { nested: undefined } },
      { id: 'task', get status() { throw new Error('secret getter'); } },
    ]) expect(() => decodeTaskRecord(value)).toThrow('Invalid task response.');
  });

  test('rejects mismatched records and malformed list totals', () => {
    expect(() => decodeTaskRecord({ id: 'other' }, 'requested', true)).toThrow('Invalid task response.');
    for (const value of [
      {}, { data: [{}] }, { data: [], total: -1 }, { data: [], total: Infinity },
      { data: [], total: 0.5 }, { data: [], total: 1, extra: true },
    ]) expect(() => decodeTaskList(value)).toThrow('Invalid task response.');
    expect(decodeTaskList({ data: [{ id: 'task' }] })).toEqual({ data: [{ id: 'task' }] });
  });

  test('checks submission input without admitting optional undefined or unknown options', () => {
    for (const value of [
      null, [], { body: [] }, { headers: { key: 1 } }, { idempotencyKey: '' },
      { body: undefined }, { meta: { value: new Date() } }, { metadata: {} },
    ]) expect(() => decodeTaskSubmitOptions(value)).toThrow('Invalid task input.');
    const input = { body: { nested: [0, false, null] }, meta: { tenant: 'a' } };
    expect(decodeTaskSubmitOptions(input)).toEqual(input);
  });
});
