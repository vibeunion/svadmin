---
title: 全文检索数据提供器
description: 通过检索 REST API 接入全文检索、日志审计与文档查询
---

`@svadmin/elasticsearch` 提供基于检索 REST API 的数据适配器，将 svadmin 的统一 CRUD 契约映射为查询 DSL。

## 安装

```bash
bun add @svadmin/elasticsearch
```

## 基本用法

```typescript
import { createElasticsearchDataProvider } from '@svadmin/elasticsearch';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createElasticsearchDataProvider({
  node: 'http://localhost:9200',
  apiKey: process.env.ES_API_KEY,
  indexMap: {
    'system-logs': 'logs-app-*',
  },
});

setDataProvider(dataProvider);
```
