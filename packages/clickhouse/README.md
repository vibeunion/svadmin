# @svadmin/clickhouse

ClickHouse analytical DataProvider adapter for svadmin

## Install

```bash
bun add @svadmin/clickhouse
```

## Usage

```ts
import { createClickHouseDataProvider } from '@svadmin/clickhouse';

const dataProvider = createClickHouseDataProvider({
  url: process.env.CLICKHOUSE_URL,
  database: 'analytics',
  authorization: `Basic ${btoa('default:')}`,
});
```

Analytical data provider for ClickHouse HTTP endpoints. Use it for reporting resources rather than high-frequency CRUD.

Documentation: https://svadmin.nestjs.cn

License: MIT
