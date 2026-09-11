import type { ColumnBuilder } from 'drizzle-orm/column-builder';
import type { PgColumnBuilder } from 'drizzle-orm/pg-core/columns/common';
import { QueryBuilder, mysqlTable, int } from 'drizzle-orm/mysql-core';
import { pgPolicy, pgRole } from 'drizzle-orm/pg-core';
import { PgDialect } from 'drizzle-orm/pg-core/dialect';
import { PostgresJsSession } from 'drizzle-orm/postgres-js/session';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import type { D1Database, D1DatabaseSession } from '@cloudflare/workers-types';
import type { Sql, TransactionSql } from 'postgres';
import { sql } from 'drizzle-orm';

type Narrow = { dataType: 'string'; data: 'staff'; driverParam: string };
type Wide = { dataType: 'string'; data: string; driverParam: string };
declare const narrow: ColumnBuilder<Narrow>;
declare const narrowPg: PgColumnBuilder<Narrow>;

// @ts-expect-error A wider mutable builder could install a non-staff default.
const wider: ColumnBuilder<Wide> = narrow;
// @ts-expect-error PostgreSQL builders must preserve the same invariant.
const widerPg: PgColumnBuilder<Wide> = narrowPg;
void wider;
void widerPg;

const table = mysqlTable('users', { id: int('id') });
const query = new QueryBuilder().select().from(table);
const union = query.union(new QueryBuilder().select().from(table));
union.orderBy(table.id);
// @ts-expect-error A protected driver session is not part of the public query API.
void query.session;
// @ts-expect-error Union typing must not expose the protected session either.
void union.session;
// @ts-expect-error The union-level query cannot add a new WHERE clause.
union.where(sql`true`);

pgPolicy('optional', { as: undefined, using: undefined });
pgRole('optional', { createDb: undefined });
// @ts-expect-error Correct optionality must not admit invalid policy modes.
pgPolicy('invalid', { as: 'allow-everything' });
// @ts-expect-error Role flags remain boolean rather than arbitrary strings.
pgRole('invalid', { createDb: 'yes' });

declare const base: Sql;
declare const transactional: TransactionSql;
new PostgresJsSession(base, new PgDialect(), {});
new PostgresJsSession(transactional, new PgDialect(), {});
// @ts-expect-error A session must have a real driver query interface.
new PostgresJsSession({}, new PgDialect(), {});

declare const d1: D1Database;
declare const d1Session: D1DatabaseSession;
drizzleD1(d1);
drizzleD1(d1Session);
// @ts-expect-error A legacy or unknown object is not a validated D1 connection.
drizzleD1({});
