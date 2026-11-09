---
title: ClickHouse Provider
description: Connect ClickHouse analytical column-oriented database to svadmin
---

`@svadmin/clickhouse` provides an analytical `DataProvider` adapter for ClickHouse OLAP databases.

## Installation

```bash
bun add @svadmin/clickhouse @clickhouse/client-web
```

## Basic Usage

```typescript
import { createClient } from '@clickhouse/client-web';
import { createClickHouseDataProvider } from '@svadmin/clickhouse';
import { setDataProvider } from '@svadmin/core';

const client = createClient({
  url: 'https://your-clickhouse-host:8443',
  username: 'default',
  password: 'secret-password',
  database: 'analytics',
});

const dataProvider = createClickHouseDataProvider({
  client,
  format: 'JSONEachRow',
});

setDataProvider(dataProvider);
```

## Features

- **High-Performance OLAP**: Native integration with ClickHouse analytical queries.
- **Filtering & Pagination**: Converts svadmin standard filters and pagination into SQL `WHERE`, `ORDER BY`, and `LIMIT / OFFSET`.
- **Custom Aggregations**: Supports `custom` queries for complex aggregation matrices, histograms, and time-series rollups.
- **Read-Heavy & Append-Only Optimizations**: Full CRUD compatibility with SQL generation.
