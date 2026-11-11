---
title: PostgREST 数据提供器
description: 将基于 PostgreSQL 的 PostgREST 自动化 REST API 网关接入 svadmin
---

`@svadmin/postgrest` 提供了针对 [PostgREST](https://postgrest.org/) 规范的原生 `DataProvider` 适配器，零第三方外部重型依赖，可直接驱动基于 PostgreSQL 的 REST API 服务端。

## 安装

```bash
bun add @svadmin/postgrest
```

## 基础使用

```typescript
import { createPostgrestDataProvider } from '@svadmin/postgrest';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createPostgrestDataProvider({
  apiUrl: 'https://api.example.com',
  headers: () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  }),
});

setDataProvider(dataProvider);
```

## 核心特性

- **原生 Content-Range 分页**：自动将 `pagination.current` 与 `pageSize` 映射为 HTTP `Range: 0-9` 请求头，并从服务端的 `Content-Range: 0-9/100` 解析出数据集总数。
- **限制总数计算**：客户端分页与关闭分页不会发送服务端范围或请求总数；服务端分页默认使用 `count=exact`，如果只需要近似总数，可以通过 `meta: { count: 'planned' | 'estimated' }` 降低计数开销。
- **单体对象高效解析**：在 `getOne` 请求中携带 `Accept: application/vnd.pgrst.object+json`，直接返回单条记录对象而非数组。
- **即时回写结果**：在 `create` 与 `update` 操作中携带 `Prefer: return=representation` 请求头，变动完成后无需二次查询即可获取最新完整记录。
- **丰富查询操作符**：支持 SvAdmin 过滤条件与 PostgREST 查询操作符的标准序列化（`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`, `is`, `cs`, `cd`）。
- **数据库存储过程调用**：通过 `dataProvider.custom({ url: '/rpc/my_procedure', method: 'post' })` 轻松调用 PostgreSQL 存储过程（RPC）。
- **极简依赖**：纯 TypeScript 原生实现，基于标准 Fetch API，无任何第三方冗余依赖。
