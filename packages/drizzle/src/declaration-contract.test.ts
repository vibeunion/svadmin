import { describe, expect, it } from 'bun:test';
import { QueryBuilder as SQLiteQueryBuilder, sqliteTable, integer } from 'drizzle-orm/sqlite-core';
import { QueryBuilder as MySqlQueryBuilder, mysqlTable, int } from 'drizzle-orm/mysql-core';
import { SQL } from 'drizzle-orm/sql';
import { ColumnBuilder } from 'drizzle-orm/column-builder';
import { pgRole, pgPolicy } from 'drizzle-orm/pg-core';
import { cockroachRole, cockroachPolicy } from 'drizzle-orm/cockroach-core';
import { CockroachRelationalQuery } from 'drizzle-orm/cockroach-core/query-builders/query';
import { MySqlDeleteBase } from 'drizzle-orm/mysql-core/query-builders/delete';
import { PgRefreshMaterializedView } from 'drizzle-orm/pg-core/query-builders/refresh-materialized-view';
import { SQLiteRelationalQuery } from 'drizzle-orm/sqlite-core/query-builders/query';
import { SQLiteRelationalQuery as LegacySQLiteRelationalQuery } from 'drizzle-orm/sqlite-core/query-builders/_query';

describe('restored Drizzle declarations', () => {
  it('matches the installed column builder runtime', () => {
    const column = integer('id');
    expect(column).toBeInstanceOf(ColumnBuilder);
    expect(column).toHaveProperty('config', expect.objectContaining({
      name: 'id', dataType: 'number int53', columnType: 'SQLiteInteger',
    }));
  });

  it('exposes SQLite query SQL and configuration without assertions', () => {
    const table = sqliteTable('users', { id: integer('id') });
    const query = new SQLiteQueryBuilder().select().from(table);
    expect(query.getSQL()).toBeInstanceOf(SQL);
    expect(query.config.table).toBe(table);
    const union = query.union(new SQLiteQueryBuilder().select().from(table));
    expect(union.getSQL()).toBeInstanceOf(SQL);
    expect(union.toSQL().sql).toContain('union');
  });

  it('exposes the existing MySQL query SQL method', () => {
    const table = mysqlTable('users', { id: int('id') });
    const query = new MySqlQueryBuilder().select().from(table);
    expect(query.getSQL()).toBeInstanceOf(SQL);
    expect(query.toSQL().sql).toContain('`users`');
    const union = query.union(new MySqlQueryBuilder().select().from(table));
    expect(union.toSQL().sql).toContain('union');
  });

  it('models optional role and policy values as they exist at runtime', () => {
    const pg = pgRole('viewer', { createDb: false, inherit: true });
    const cr = cockroachRole('viewer', { createDb: undefined, createRole: false });
    expect(pg.createDb).toBe(false);
    expect(pg.inherit).toBe(true);
    expect(pg.createRole).toBeUndefined();
    expect(cr.createDb).toBeUndefined();
    expect(cr.createRole).toBe(false);
    expect(pgPolicy('optional', { as: undefined }).as).toBeUndefined();
    expect(cockroachPolicy('optional', { using: undefined }).using).toBeUndefined();
    expect(pgPolicy('restricted', { as: 'restrictive', for: 'select' }).for).toBe('select');
  });

  it('restores only SQL methods already present in driver prototypes', () => {
    const prototypes: unknown[] = [
      MySqlDeleteBase.prototype,
      PgRefreshMaterializedView.prototype,
      SQLiteRelationalQuery.prototype,
      LegacySQLiteRelationalQuery.prototype,
      CockroachRelationalQuery.prototype,
    ];
    for (const prototype of prototypes) {
      expect(prototype).toHaveProperty('getSQL', expect.any(Function));
    }
  });
});
