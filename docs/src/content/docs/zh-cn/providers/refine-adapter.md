---
title: Refine 适配器
description: 在 svadmin 中使用任意 @refinedev/* 数据源
---

`@svadmin/refine-adapter` 提供了一个通用桥接层，可以将官方 [Refine](https://refine.dev/) 的数据、认证、权限、通知、实时、路由和 i18n Provider 适配为 svadmin 契约。

## 为什么需要它？

Refine 拥有成熟的生态系统，提供了 10+ 个生产级数据源适配器，涵盖 Supabase、Hasura、Strapi、Appwrite、GraphQL、REST 等后端。svadmin 无需从头实现这些集成，可以通过该适配器直接复用。

## 安装

```bash
bun add @svadmin/refine-adapter @svadmin/core
# 加上你想要的 Refine 数据源：
bun add @refinedev/supabase
```

如果你的项目运行在 Vite 上，并且同时用了 `@svadmin/ui` 或 `@svadmin/supabase`，请把 svadmin 相关包加入 `optimizeDeps.exclude`，避免开发环境预打包后出现导出缺失之类的问题：

```ts
optimizeDeps: {
  exclude: ['@svadmin/core', '@svadmin/ui', '@svadmin/supabase'],
}
```

## 使用

```typescript
import { createRefineAdapter } from '@svadmin/refine-adapter';
import { dataProvider as createRefineSupabase } from '@refinedev/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
const refineProvider = createRefineSupabase(supabaseClient);

// 将 Refine 数据源包装为 svadmin 格式
const dataProvider = createRefineAdapter(refineProvider);
```

然后将 `dataProvider` 传给 `<AdminApp>` 或 `setDataProvider()`：

```svelte
<AdminApp {dataProvider} {resources} title="管理后台" />
```

## 其他 Refine Provider

```typescript
import {
  createRefineAuthAdapter,
  createRefineAccessControlAdapter,
  createRefineNotificationAdapter,
  createRefineLiveAdapter,
  createRefineRouterAdapter,
  createRefineI18nAdapter,
} from '@svadmin/refine-adapter';

const authProvider = createRefineAuthAdapter(refineAuthProvider);
const accessControlProvider = createRefineAccessControlAdapter(refineAccessControlProvider);
const notificationProvider = createRefineNotificationAdapter(refineNotificationProvider);
const liveProvider = createRefineLiveAdapter(refineLiveProvider);
const routerProvider = createRefineRouterAdapter(refineRouterProvider);
const i18nProvider = createRefineI18nAdapter(refineI18nProvider);
```

## UI 仍然交给 UI 层

与 Refine 的架构一致，这个桥接包不会把 UI 组件搬进 core。Table、Upload、
DatePicker、Modal/Drawer 组合和表单校验仍由 svadmin UI 层或宿主应用负责。
Refine 自己的 UI 包也遵循同一原则：core 只拥有 hooks 和 Provider 契约，组件由
Ant Design、MUI、Mantine、Chakra 或 TanStack Table 提供。

## 工作原理

Refine 的 `DataProvider` 接口与 svadmin 的 `DataProvider` 高度一致。适配器的工作方式：

1. 绑定 5 个必需方法（`getList`、`getOne`、`create`、`update`、`deleteOne`、`getApiUrl`）。
2. 仅在底层 Refine 数据源实现了可选方法时，才附加它们（`getMany`、`createMany`、`updateMany`、`deleteMany`、`custom`）。

这意味着你可以获得所选 Refine 数据源的完整功能集——包括排序、过滤、分页和批量操作支持。

## 内置使用

如果你已经在使用 `@svadmin/*` 提供器包，则无需直接使用此包。以下包内部使用了 `@svadmin/refine-adapter`：

| svadmin 包 | 桥接目标 | Refine 包 |
|------------|---------|-----------|
| `@svadmin/supabase` | Supabase 数据/认证/实时 | `@refinedev/supabase` |
| `@svadmin/appwrite` | Appwrite 数据/认证/实时 | `@refinedev/appwrite` |
| `@svadmin/strapi` | Strapi CMS | `@refinedev/strapi-v4` |
| `@svadmin/hasura` | Hasura GraphQL | `@refinedev/hasura` |
| `@svadmin/graphql` | 通用 GraphQL | `@refinedev/graphql` |
| `@svadmin/airtable` | Airtable | `@refinedev/airtable` |
| `@svadmin/medusa` | Medusa Commerce | `@refinedev/medusa` |
| `@svadmin/nestjs-query` | NestJS GraphQL | `@refinedev/nestjs-query` |
| `@svadmin/nestjsx-crud` | NestJS CRUD | `@refinedev/nestjsx-crud` |
| `@svadmin/simple-rest` | REST API | `@refinedev/simple-rest` |

## 直接使用

当你想使用 svadmin 尚未提供专用包的 Refine 数据源时，可以直接使用 `createRefineAdapter`：

```typescript
import { createRefineAdapter } from '@svadmin/refine-adapter';
import { dataProvider as createRefineDirectus } from '@tspvivek/refine-directus';

const directusProvider = createRefineDirectus('https://my-directus.example.com');
const dataProvider = createRefineAdapter(directusProvider);
```

## 未使用此适配器的提供器

某些 svadmin 提供器直接连接后端，不经过 Refine，因为它们使用非 Refine 后端或提供了更深层的集成：

| 包 | 原因 |
|----|------|
| `@svadmin/drizzle` | 通过 Drizzle ORM 直连数据库（无 HTTP API） |
| `@svadmin/elysia` | 通过 Eden Treaty 实现类型安全，从 Elysia 路由推断 `ResourceTypeMap` |
| `@svadmin/pocketbase` | 直接使用 PocketBase SDK，集成认证和实时订阅 |
| `@svadmin/firebase` | 直接使用 Firebase SDK，支持 Firestore 序列化 |
