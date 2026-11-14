---
title: Orama 纯内存/边缘搜索引擎提供器
description: 基于 Orama 的零后端、边缘就绪、内存级全文检索与混合搜索 DataProvider
---

`@svadmin/orama` 提供基于 [Orama](https://orama.com/) 规范的官方极速内存级、边缘就绪 `DataProvider` 适配器。它支持在浏览器纯前端、边缘计算节点（Cloudflare Workers、Vercel Edge、Deno）或离线桌面应用（Tauri / Electron / Local-First）中直接运行全文索引、Levenshtein 拼写容错检索与多面分面过滤。

## 安装

```bash
bun add @svadmin/orama
```

## 基础用法

```typescript
import { createOramaDataProvider } from '@svadmin/orama';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createOramaDataProvider({
  initialData: {
    articles: [
      { id: '1', title: 'Svelte 5 Runes 深入浅出', category: 'frontend', views: 1200 },
      { id: '2', title: '边缘计算与离线全文检索实战', category: 'architecture', views: 2400 },
    ],
  },
  tolerance: 1, // 拼写容错阈值（默认 1）
  exactMatchBoost: 2.0,
});

setDataProvider(dataProvider);
```

## 核心特性

- **零后端依赖与极轻量**：纯内存倒排索引，无需安装任何外部搜索引擎或后端数据库服务，特别适合 Demo、离线管理后台或边缘应用。
- **智能拼写容错（Typo Tolerance）**：内置 Levenshtein 模糊纠错算法与相关度自动打分（`_score`），即使用户输入有错别字也能高命中率检索。
- **完整 CRUD 生命周期契约**：严格遵循 svadmin 规范，全面支持 `getList`、`getOne`、`create`、`update` 与 `deleteOne`（兼容器 delete）。
- **边缘与本地优先（Local-First）**：完美契合 PWA、Electron 桌面管理系统与移动端应用离线缓存场景。
