import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Value } from '@sinclair/typebox/value';
import { parseDemoDatabase } from './demo-database';
import { demoSchemas, isDemoResource } from './resource-schemas';
import { inMemoryDataProvider as provider } from './providers/inMemoryDb';

const storageKey = 'svadmin_inventory_demo_db_v5';
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let values = new Map<string, string>();
const storage: Storage = {
  get length() { return values.size; },
  clear() { values.clear(); },
  getItem(key) { return values.get(key) ?? null; },
  key(index) { return [...values.keys()][index] ?? null; },
  removeItem(key) { values.delete(key); },
  setItem(key, value) { values.set(key, value); },
};

beforeEach(() => {
  values = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
});
afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

function fixture(): Record<string, unknown> {
  return Object.fromEntries(Object.entries(demoSchemas).map(([resource, schema]) => {
    const row: unknown = Value.Create(schema);
    return [resource, [row]];
  }));
}

describe('demo schemas and storage boundary', () => {
  test('validates every owned seed resource against its shared schema', async () => {
    for (const [resource, schema] of Object.entries(demoSchemas)) {
      const result = await provider.getList({ resource, pagination: { mode: 'off' } });
      for (const row of result.data) expect(Value.Check(schema, row)).toBe(true);
    }
  });

  test('parses the complete database without coercion or projection', () => {
    const data = fixture();
    const parsed = parseDemoDatabase(data);
    expect(Object.is(parsed, data)).toBe(true);
    expect(Object.keys(parsed)).toHaveLength(Object.keys(demoSchemas).length);
    expect(typeof parsed.todos[0]?.completed).toBe('boolean');
  });

  test('rejects unknown resource names, including inherited object keys', async () => {
    for (const name of ['missing', '__proto__', 'constructor', 'toString']) {
      expect(isDemoResource(name)).toBe(false);
      await expect(provider.getList({ resource: name })).rejects.toThrow();
    }
  });

  test('rejects missing resources, extra resources and malformed row collections', () => {
    const missing = fixture();
    delete missing['todos'];
    expect(() => parseDemoDatabase(missing)).toThrow('Invalid stored demo database');
    expect(() => parseDemoDatabase({ ...fixture(), unknown: [] })).toThrow();
    for (const invalid of [null, {}, 'records', [null], [{ id: '1' }]]) {
      expect(() => parseDemoDatabase({ ...fixture(), todos: invalid })).toThrow();
    }
  });

  test('rejects fields with wrong types and additions without changing the payload', () => {
    const data = fixture();
    const valid = parseDemoDatabase(data);
    const first = valid.todos[0];
    if (!first) throw new Error('Expected a todo');
    for (const todo of [{ ...first, completed: 'false' }, { ...first, invented: true }]) {
      const invalid = { ...data, todos: [todo] };
      const before = JSON.stringify(invalid);
      expect(() => parseDemoDatabase(invalid)).toThrow();
      expect(JSON.stringify(invalid)).toBe(before);
    }
  });

  test('surfaces corrupt storage instead of silently replacing it with seeds', async () => {
    for (const invalid of ['{', 'null', JSON.stringify({ ...fixture(), todos: [{ id: 'wrong' }] })]) {
      storage.setItem(storageKey, invalid);
      await expect(provider.getList({ resource: 'todos' })).rejects.toThrow();
      expect(storage.getItem(storageKey)).toBe(invalid);
    }
  });

  test('rejects invalid writes without persisting partial changes', async () => {
    const original = JSON.stringify(fixture());
    storage.setItem(storageKey, original);
    await expect(provider.update({
      resource: 'todos', id: 0, variables: { completed: 'false' },
    })).rejects.toThrow();
    expect(storage.getItem(storageKey)).toBe(original);
    const result = await provider.getOne({ resource: 'todos', id: 0 });
    expect(result.data['completed']).toBe(false);
  });

  test('does not contaminate memory after a rejected write without browser storage', async () => {
    Reflect.deleteProperty(globalThis, 'localStorage');
    const before = await provider.getList({ resource: 'todos' });
    const first = before.data[0];
    if (!first || typeof first['id'] !== 'number') throw new Error('Expected a seeded todo');
    await expect(provider.update({
      resource: 'todos', id: first['id'], variables: { completed: 'false' },
    })).rejects.toThrow();
    expect(await provider.getList({ resource: 'todos' })).toEqual(before);
  });
});
