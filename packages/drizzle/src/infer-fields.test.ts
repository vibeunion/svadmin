import { describe, expect, it } from 'bun:test';
import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { pgTable, pgEnum, numeric, timestamp } from 'drizzle-orm/pg-core';
import { mysqlTable, boolean, varchar } from 'drizzle-orm/mysql-core';
import { inferFieldsFromDrizzle } from './infer-fields';

describe('inferFieldsFromDrizzle', () => {
  it('uses property keys instead of SQL column names, preserving read/write models', () => {
    const table = sqliteTable('users', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      displayName: text('display_name').notNull(),
      balance: real('balance'),
      enabled: integer('enabled', { mode: 'boolean' }).notNull(),
      createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
      role: text('role', { enum: ['staff', 'team_admin'] }).default('staff'),
      _privateNote: text('private_note'),
    });
    // Drizzle's "_" metadata is type-only; it is absent from actual table objects.
    expect(Object.hasOwn(table, '_')).toBe(false);
    expect(inferFieldsFromDrizzle(table)).toEqual([
      { key: 'id', label: 'Id', type: 'number', required: false, showInForm: false },
      { key: 'displayName', label: 'Display Name', type: 'text', required: true },
      { key: 'balance', label: 'Balance', type: 'number', required: false },
      { key: 'enabled', label: 'Enabled', type: 'boolean', required: true },
      { key: 'createdAt', label: 'Created At', type: 'date', required: true, showInForm: false },
      { key: 'role', label: 'Role', type: 'select', required: false, options: [
        { label: 'Staff', value: 'staff' }, { label: 'Team Admin', value: 'team_admin' },
      ] },
      { key: '_privateNote', label: ' Private Note', type: 'text', required: false },
    ]);
  });

  it('derives PostgreSQL and MySQL fields from actual table instances', () => {
    const status = pgEnum('status', ['pending', 'approved']);
    const postgres = pgTable('orders', {
      total: numeric('order_total'),
      status: status('status').notNull(),
      timestamp: timestamp('created_time'),
    });
    expect(inferFieldsFromDrizzle(postgres).map(field => field.type))
      .toEqual(['number', 'select', 'date']);
    const mysql = mysqlTable('settings', {
      enabled: boolean('enabled'),
      title: varchar('title', { length: 100 }).notNull(),
    });
    expect(inferFieldsFromDrizzle(mysql).map(field => field.type))
      .toEqual(['boolean', 'text']);
  });

  it('applies field overrides by model key', () => {
    const table = sqliteTable('users', {
      displayName: text('display_name'),
      secret: text('secret'),
    });
    expect(inferFieldsFromDrizzle(table, {
      labels: { displayName: 'Name' },
      exclude: ['secret'],
      readOnly: ['displayName'],
      hideFromList: ['displayName'],
    })).toEqual([{
      key: 'displayName', label: 'Name', type: 'text', required: false,
      showInForm: false, showInList: false,
    }]);
  });

  it('rejects malformed table metadata, even on excluded columns', () => {
    const table = sqliteTable('users', { id: integer('id') });
    Object.defineProperty(table.id, 'notNull', { value: 'yes' });
    expect(() => inferFieldsFromDrizzle(table, { exclude: ['id'] }))
      .toThrow('Invalid Drizzle column metadata');
  });

  it('rejects legacy duck-typed objects and malformed runtime column maps', () => {
    const invalidInputs: unknown[] = [null, {}, { _: { columns: {} } }];
    for (const value of invalidInputs) {
      expect(() => Reflect.apply(inferFieldsFromDrizzle, undefined, [value]))
        .toThrow('Expected a Drizzle table');
    }
    const table = sqliteTable('empty', {});
    expect(inferFieldsFromDrizzle(table)).toEqual([]);
    Object.defineProperty(table, Symbol.for('drizzle:Columns'), { value: null });
    expect(() => inferFieldsFromDrizzle(table)).toThrow('Invalid Drizzle table columns');
  });
});
