# @svadmin/drizzle

Drizzle ORM DataProvider — SQLite, PostgreSQL, MySQL, Cloudflare D1 via refine-sqlx

## Install

```bash
bun add @svadmin/drizzle
```

## Usage

```ts
import { createDrizzleDataProvider } from '@svadmin/drizzle';

const dataProvider = await createDrizzleDataProvider({ connection: db, schema });
```

Direct database access for SQLite, PostgreSQL, MySQL, and Cloudflare D1, including soft delete, relations, transactions, and aggregations.

Documentation: https://svadmin.nestjs.cn

License: MIT
