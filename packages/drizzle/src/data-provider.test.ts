/**
 * @svadmin/drizzle — DataProvider integration test
 *
 * Uses bun:sqlite in-memory database to verify the full CRUD lifecycle
 * through the wrapper layer.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { createDrizzleDataProvider } from './data-provider';
import type { BaseRecord, DataProvider } from '@svadmin/core';
import { requireValue } from '../../../scripts/test-assertions';

// ─── Test Schema ──────────────────────────────────────────────────

const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').default('user'),
});

const schema = { users };

function recordId(record: BaseRecord): string | number {
  const id = record['id'];
  if (typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id))) return id;
  throw new Error('Expected a record ID');
}

// ─── Tests ────────────────────────────────────────────────────────

describe('@svadmin/drizzle DataProvider', () => {
  let dataProvider: DataProvider;
  let sqlite: Database;

  beforeAll(async () => {
    sqlite = new Database(':memory:');
    sqlite.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT DEFAULT 'user'
      )
    `);
    const connection = drizzle({ client: sqlite, schema });
    dataProvider = await createDrizzleDataProvider({ connection, schema });
  });

  afterAll(() => sqlite.close());

  it('returns a valid DataProvider with all required methods', () => {
    expect(dataProvider.getList).toBeFunction();
    expect(dataProvider.getOne).toBeFunction();
    expect(dataProvider.create).toBeFunction();
    expect(dataProvider.update).toBeFunction();
    expect(dataProvider.deleteOne).toBeFunction();
    expect(dataProvider.getApiUrl).toBeFunction();
  });

  it('declares the statically imported refine-sqlx runtime as a required peer', async () => {
    const manifest: unknown = await Bun.file(new URL('../package.json', import.meta.url)).json();

    expect(manifest).toMatchObject({ peerDependencies: { 'refine-sqlx': '^0.10.3' } });
    expect(manifest).not.toHaveProperty('peerDependenciesMeta.refine-sqlx.optional', true);
  });

  it('create → getOne roundtrip', async () => {
    const created = await dataProvider.create({
      resource: 'users',
      variables: { name: 'Alice', email: 'alice@example.com', role: 'admin' },
    });

    expect(created.data).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com',
      role: 'admin',
    });

    const fetched = await dataProvider.getOne({
      resource: 'users',
      id: recordId(created.data),
    });

    expect(fetched.data).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com',
    });
  });

  it('getList with pagination and sorting', async () => {
    // Seed more data
    await dataProvider.create({ resource: 'users', variables: { name: 'Bob', email: 'bob@example.com' } });
    await dataProvider.create({ resource: 'users', variables: { name: 'Charlie', email: 'charlie@example.com' } });

    const result = await dataProvider.getList({
      resource: 'users',
      pagination: { current: 1, pageSize: 2 },
      sorters: [{ field: 'name', order: 'asc' }],
    });

    expect(result.data.length).toBe(2);
    expect(result.total).toBeGreaterThanOrEqual(3);
    // Sorted ascending: Alice before Bob
    expect(requireValue(result.data[0])['name']).toBe('Alice');
  });

  it('getList with filters', async () => {
    const result = await dataProvider.getList({
      resource: 'users',
      filters: [{ field: 'role', operator: 'eq', value: 'admin' }],
    });

    expect(result.data.length).toBe(1);
    expect(requireValue(result.data[0])['name']).toBe('Alice');
  });

  it('update modifies a record', async () => {
    const list = await dataProvider.getList({ resource: 'users', filters: [{ field: 'name', operator: 'eq', value: 'Bob' }] });
    const bobId = recordId(requireValue(list.data[0]));

    const updated = await dataProvider.update({
      resource: 'users',
      id: bobId,
      variables: { role: 'editor' },
    });

    expect(updated.data['role']).toBe('editor');
  });

  it('deleteOne removes a record', async () => {
    const list = await dataProvider.getList({ resource: 'users', filters: [{ field: 'name', operator: 'eq', value: 'Charlie' }] });
    const charlieId = recordId(requireValue(list.data[0]));

    await dataProvider.deleteOne({ resource: 'users', id: charlieId });

    const afterDelete = await dataProvider.getList({
      resource: 'users',
      filters: [{ field: 'name', operator: 'eq', value: 'Charlie' }],
    });
    expect(afterDelete.data.length).toBe(0);
  });

  it('getMany fetches multiple records by IDs', async () => {
    const getMany = requireValue(dataProvider.getMany);

    const list = await dataProvider.getList({ resource: 'users' });
    const ids = list.data.slice(0, 2).map(recordId);

    const result = await getMany.call(dataProvider, { resource: 'users', ids });
    expect(result.data.length).toBe(2);
  });

  it('getApiUrl returns empty string', () => {
    expect(dataProvider.getApiUrl()).toBe('');
  });
});
