---
title: Meilisearch 提供器
description: 将 Meilisearch 极速即时搜索引擎连接至 svadmin
---

`@svadmin/meilisearch` 提供符合 [Meilisearch](https://www.meilisearch.com/) REST API 规范的现代化 `DataProvider` 适配器。它将 Meilisearch 索引无缝转化为 svadmin 表格、表单与检索组件的响应式数据源。

## 安装

```bash
bun add @svadmin/meilisearch
```

## 基础用法

```typescript
import { createMeilisearchDataProvider } from '@svadmin/meilisearch';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createMeilisearchDataProvider({
  host: 'http://localhost:7700',
  apiKey: 'YOUR_MEILISEARCH_API_KEY',
  indexMap: {
    // 可选映射：资源名称 -> 索引 UID
    articles: 'blog_articles',
  },
});

setDataProvider(dataProvider);
```

## 功能特性

- **毫秒级即时搜索**：将 svadmin 的搜索关键词（`q` / `search` / filters）转换为优化的 Meilisearch 搜索请求。
- **分面过滤与排序**：支持复杂逻辑条件（`eq`、`in`、`gte`、`lte`、`and`、`or`）并自动编译为原生 Meilisearch 过滤字符串表达式。
- **拼写容错与关键字高亮**：默认请求关键词高亮片段（`attributesToHighlight: ['*']`），在前端直接呈现高亮检索词。
- **完整 CRUD 支持**：支持检索（`getList`、`getOne`）、新增、更新及删除索引文档。
- **零沉重依赖**：基于 Web 标准 Fetch API 实现的纯原生 TypeScript 驱动。
