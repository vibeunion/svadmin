---
title: 核心 Hook 契约
description: 0.39 的 Svelte-only 核心契约与 Query Key v2 迁移说明
---

从 0.39 开始，`@svadmin/core` 永久只面向 Svelte。公开集成面继续采用 Svelte 5 Hook 与 Svelte Context；路线图明确不再包含框架无关的 `@svadmin/kernel`、Vue 适配器或跨框架兼容层。

## 冻结范围

从 0.39 起，数据、变更、表单、表格、认证、任务、实时、权限和路由 Hook 的公开名称与主要职责冻结。新增能力应通过类型明确的选项和返回值扩展，不再用第二套框架抽象替代 Hook 模型。

少量适合纯 TypeScript 的内部规则仍保持独立：Query Key 构造与解析、类型化缓存匹配、Provider 解析、租户隔离和 Provider 接口。它们服务于 Svelte Hook，并不构成新的运行时或 kernel。

## 只支持 Query Key v2

0.39 删除旧的数组位置式 Query Key 兼容层。以下形式不再识别：

```ts
['default', 'posts', 'list', pagination, filters]
```

改用类型化 v2 builder：

```ts
import { keys, queryKeyMatches } from '@svadmin/core';

const queryKey = keys({ provider: 'default', tenant: tenantId })
  .data.list('posts', { pagination, filters });

queryKeyMatches(queryKey, {
  provider: 'default',
  tenant: tenantId,
  kind: 'data',
  resource: 'posts',
  action: 'list',
});
```

普通业务代码通常不需要自行构造 key：核心 Hook 会解析资源所属 Provider 与租户，并自动使用 v2。自定义集成应使用 `keys`、`parseQueryKey`、`queryKeyMatches` 或 `dataQueryMatches`，不要读取数组下标。

## 迁移清单

1. 删除 `appendTenantCacheKey` 与 `queryKeyMatchesTenant` 导入。
2. 将位置式 key 构造替换为 `keys(...)`。
3. 将 `queryKey[0]`、`queryKey[1]` 等判断替换为类型化 matcher。
4. 升级时重建或失效持久化缓存；旧 key 会被有意拒绝，不提供兼容读取。

DevTools 对 v2 key 只展示安全操作元数据：Provider、资源、操作、状态、重试次数、请求耗时、缓存年龄和通用失效状态。租户 ID、记录 ID、参数、URL、payload、缓存数据和错误体始终隐藏。
