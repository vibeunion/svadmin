---
title: Typesense 提供器
description: 将 Typesense 极速内存搜索引擎与拼写纠错连接至 svadmin
---

`@svadmin/typesense` 提供符合 [Typesense](https://typesense.org/) REST API 规范的官方极轻量 `DataProvider` 适配器。它将 Typesense 内存集合无缝转化为 svadmin `<AutoTable>`、检索组件与分面过滤面板的响应式数据源。

## 安装

```bash
bun add @svadmin/typesense
```

## 基础用法

```typescript
import { createTypesenseDataProvider } from '@svadmin/typesense';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createTypesenseDataProvider({
  host: 'http://localhost:8108',
  apiKey: 'YOUR_TYPESENSE_API_KEY',
  collectionMap: {
    // 可选映射：svadmin 资源名称 -> Typesense collection 集合名称
    articles: 'articles_v2',
  },
  queryBy: ['title', 'content', 'author'],
});

setDataProvider(dataProvider);
```

## 功能特性

- **内存级极速检索**：将 svadmin 的检索关键词（`q` / `search` / filters）转换为优化的 Typesense 搜索请求，内置强大的拼写容错（Typo Tolerance）。
- **多面分面（Faceting）与过滤**：支持复杂逻辑条件（`eq`、`ne`、`in`、`nin`、`gte`、`lte`、`and`、`or`）并自动编译为 Typesense 原生 `filter_by` 表达式。
- **动态关键词高亮**：原生解包 Typesense 高亮匹配（`_highlight`），可在前端表格中直接高亮显示搜索关键词。
- **完整 CRUD 协议支持**：全面实现 `getList`、`getOne`、`create`（支持 upsert 覆盖写入）、`update`（局部更新）与 `deleteOne`。
- **零沉重依赖**：基于标准 Fetch API 实现的纯原生 TypeScript 驱动，不附带冗余客户端依赖。
