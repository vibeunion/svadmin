---
title: Qdrant 向量数据库提供器
description: 将 Qdrant 高性能开源向量数据库无缝接入 svadmin，支持向量近邻相似度检索与标量载荷过滤
---

`@svadmin/qdrant` 为企业级开源向量数据库 [Qdrant](https://qdrant.tech/) 提供高性能的 `DataProvider` 适配器，使得在大语言模型（LLM）RAG 知识库检索、多模态图搜图、语义聚类与向量中后台应用中，开发者可以像操作普通 CRUD 资源一样管理集合与向量点（Points）。

## 安装

```bash
bun add @svadmin/qdrant
```

## 基础用法

```typescript
import { createQdrantDataProvider } from '@svadmin/qdrant';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createQdrantDataProvider({
  host: 'https://xyz-example.qdrant.io:6333',
  apiKey: process.env.QDRANT_API_KEY,
  collectionMap: {
    // 可选映射：svadmin 资源名称 -> Qdrant 集合名
    documents: 'enterprise_kb_v2',
  },
});

setDataProvider(dataProvider);
```

## 向量近邻相似度搜索

在进行向量相似度搜索（例如知识库切片命中或特征检索）时，只需在 `meta.vector` 中传入查询 Embedding 向量：

```typescript
import { useList } from '@svadmin/core';

const { data, isLoading } = useList({
  resource: 'documents',
  pagination: { current: 1, pageSize: 10 },
  meta: {
    vector: [0.023, -0.412, 0.812], // 查询向量
    with_vector: false, // 默认不返回冗余浮点数组，显著减小传输体积
  },
  filters: [
    {
      field: 'department',
      operator: 'eq',
      value: 'engineering',
    },
  ],
});
```

返回的每条记录会自动包含 `_score` 相似度分值以及解析后的载荷字段（Payload）。

## 标准点滚动浏览与 CRUD 操作

当未提供 `meta.vector` 时，提供器自动调用 Qdrant 的 `/collections/{collection}/points/scroll` 接口，支持按过滤条件快速浏览与分页点列表：

```typescript
const { data } = useList({
  resource: 'documents',
  pagination: { current: 1, pageSize: 20 },
  filters: [
    {
      field: 'status',
      operator: 'eq',
      value: 'published',
    },
  ],
});
```

新增、修改与删除（`create` / `update` / `deleteOne` / `deleteMany`）均自动对齐 Qdrant Points API 规范。
