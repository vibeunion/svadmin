---
title: ClickHouse 数据适配器
description: 将 ClickHouse 分析型列式数据库接入 svadmin
---

`@svadmin/clickhouse` 为 ClickHouse OLAP 分析型列式数据库提供标准 `DataProvider` 适配器。

## 安装

```bash
bun add @svadmin/clickhouse @clickhouse/client-web
```

## 基础用法

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

## 特性

- **高性能分析引擎**：原生无缝对接 ClickHouse 亿级海量日志与指标分析查询。
- **自动化过滤与分页**：将 svadmin 标准 CRUD 过滤条件和分页语义精准转换为 SQL `WHERE`、`ORDER BY` 及 `LIMIT / OFFSET`。
- **自定义聚合查询**：内置支持 `custom` 方法，轻松实现多维下钻、直方图与时序分析大盘。
- **标准 CRUD 兼容**：具备完整的插入、单条查询及定制更新能力。
