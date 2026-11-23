---
title: 数据 Provider
description: 将 svadmin 连接到任意后端 API
---

`DataProvider` 接口定义了 svadmin 与后端通信的方式。只需实现一次，所有 Hook 和组件就能自动工作。

## 接口

```typescript
import type { BaseRecord } from '@svadmin/core';

interface DataProvider {
  getList: <TData extends BaseRecord>(params: GetListParams) => Promise<GetListResult<TData>>;
  getOne: <TData extends BaseRecord>(params: GetOneParams) => Promise<GetOneResult<TData>>;
  create: <TData extends BaseRecord, TVariables>(params: CreateParams<TVariables>) => Promise<CreateResult<TData>>;
  update: <TData extends BaseRecord, TVariables>(params: UpdateParams<TVariables>) => Promise<UpdateResult<TData>>;
  deleteOne: <TData extends BaseRecord, TVariables>(params: DeleteParams<TVariables>) => Promise<DeleteResult<TData>>;
  getApiUrl: () => string;

  // 可选
  getMany?: <TData extends BaseRecord>(params: GetManyParams) => Promise<GetManyResult<TData>>;
  createMany?: <TData extends BaseRecord, TVariables>(params: CreateManyParams<TVariables>) => Promise<CreateManyResult<TData>>;
  updateMany?: <TData extends BaseRecord, TVariables>(params: UpdateManyParams<TVariables>) => Promise<UpdateManyResult<TData>>;
  deleteMany?: <TData extends BaseRecord, TVariables>(params: DeleteManyParams<TVariables>) => Promise<DeleteManyResult<TData>>;
  custom?: <TData, TVariables>(params: CustomParams<TVariables>) => Promise<CustomResult<TData>>;
}
```

> `BaseRecord = Record<string, unknown>` — 所有数据类型都继承自此基础类型。

## 内置 Provider

> 大部分 svadmin 数据源通过 [`@svadmin/refine-adapter`](/zh-cn/providers/refine-adapter) 桥接对应的 `@refinedev/*` 包。你也可以直接使用该适配器来桥接 svadmin 尚未提供专用包的 Refine 数据源。

### Simple REST

```typescript
import { createSimpleRestProvider } from '@svadmin/simple-rest';
const dataProvider = createSimpleRestProvider('https://api.example.com');
```

映射为：`GET /posts`、`GET /posts/1`、`POST /posts`、`PUT /posts/1`、`DELETE /posts/1`

### Supabase

```typescript
import { createSupabaseDataProvider } from '@svadmin/supabase';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);
const dataProvider = createSupabaseDataProvider(supabase);
```

如果你同时使用 `@supacloud/js`，CRUD 仍然建议继续使用 `createSupabaseDataProvider()`。像提交任务、查询任务、重试任务这类平台语义能力，放在可选子入口 [`@svadmin/supabase/supacloud`](/zh-cn/providers/supacloud) 中，而不是塞进主数据 Provider 契约里。

### GraphQL

```typescript
import { createGraphQLDataProvider } from '@svadmin/graphql';
const dataProvider = createGraphQLDataProvider('https://api.example.com/graphql');
```

### Appwrite

```typescript
import { Client, Databases } from 'appwrite';
import { createAppwriteDataProvider } from '@svadmin/appwrite';

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('PROJECT_ID');
const databases = new Databases(client);
const dataProvider = createAppwriteDataProvider({ databases, databaseId: 'main' });
```

支持排序、10+ 过滤操作符和批量操作（`getMany`、`deleteMany`）。

### PocketBase

```typescript
import PocketBase from 'pocketbase';
import { createPocketBaseDataProvider } from '@svadmin/pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');
const dataProvider = createPocketBaseDataProvider({ pb });
```

支持排序、过滤和批量操作。PocketBase 还提供 `createPocketBaseAuthProvider` 和 `createPocketBaseLiveProvider`。

### Elysia（类型安全）

```typescript
import { createElysiaDataProvider } from '@svadmin/elysia';
import type { InferResourceMap } from '@svadmin/elysia';
import type { App } from './server';  // 你的 Elysia 应用类型

// 从 Elysia 路由自动推断资源类型
declare module '@svadmin/core' {
  interface ResourceTypeMap extends InferResourceMap<App> {}
}

const dataProvider = createElysiaDataProvider<App>('http://localhost:3000');
```

`@svadmin/elysia` 包通过从 Elysia 后端路由直接推断 `ResourceTypeMap` 实现端到端类型安全。

### Drizzle ORM

```typescript
import { createDrizzleDataProvider } from '@svadmin/drizzle';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';

const db = drizzle(new Database('./app.db'), { schema });
const dataProvider = await createDrizzleDataProvider({ connection: db, schema });
```

通过 Drizzle ORM 直接访问数据库 — 支持 SQLite、PostgreSQL、MySQL 和 Cloudflare D1。内置软删除、关联查询、事务、聚合查询和安全控制。详见 [Drizzle ORM 指南](/zh-cn/providers/drizzle)。

### Airtable

```typescript
// bun add @svadmin/airtable @refinedev/airtable
import { createAirtableDataProvider } from '@svadmin/airtable';

const dataProvider = await createAirtableDataProvider('base-id', process.env.AIRTABLE_API_KEY);
```

### Directus

```typescript
import { createDirectusDataProvider } from '@svadmin/directus';

const dataProvider = createDirectusDataProvider('https://directus.example.com', process.env.DIRECTUS_TOKEN);
```

### Firebase

```typescript
// 传入已初始化的 @refinedev/firebase（或兼容）Provider。
import { createFirebaseDataProvider } from '@svadmin/firebase';

const dataProvider = createFirebaseDataProvider(refineFirebaseProvider);
```

### Hasura

```typescript
// bun add @svadmin/hasura @refinedev/hasura graphql-request
import { createHasuraDataProvider } from '@svadmin/hasura';

const dataProvider = await createHasuraDataProvider({ endpoint: 'https://api.example.com/v1/graphql' });
```

### Medusa

```typescript
// bun add @svadmin/medusa @refinedev/medusa
import { createMedusaDataProvider } from '@svadmin/medusa';

const dataProvider = await createMedusaDataProvider('https://medusa.example.com');
```

### NestJS Query 与 NestJSX CRUD

```typescript
// bun add @svadmin/nestjs-query @refinedev/nestjs-query
import { createNestjsQueryDataProvider } from '@svadmin/nestjs-query';
const queryProvider = await createNestjsQueryDataProvider('https://api.example.com/graphql');

// bun add @svadmin/nestjsx-crud @refinedev/nestjsx-crud
import { createNestjsxCrudDataProvider } from '@svadmin/nestjsx-crud';
const crudProvider = await createNestjsxCrudDataProvider('https://api.example.com');
```

### Sanity

```typescript
import { createSanityDataProvider } from '@svadmin/sanity';

const dataProvider = createSanityDataProvider('project-id', 'production', process.env.SANITY_TOKEN);
```

### Strapi 与 Strapi GraphQL

```typescript
// bun add @svadmin/strapi @refinedev/strapi-v4
import { createStrapiDataProvider } from '@svadmin/strapi';
const restProvider = await createStrapiDataProvider('https://strapi.example.com');

// bun add @svadmin/strapi-graphql @refinedev/strapi-graphql
import { createStrapiGraphQLDataProvider } from '@svadmin/strapi-graphql';
const graphqlProvider = await createStrapiGraphQLDataProvider('https://strapi.example.com/graphql');
```

### 通用 REST 桥接

```typescript
// bun add @svadmin/rest @refinedev/rest @nestjsx/crud-request
import { createRestDataProvider } from '@svadmin/rest';

const dataProvider = await createRestDataProvider('https://api.example.com');
```

### PostgREST

```typescript
import { createPostgrestDataProvider } from '@svadmin/postgrest';

const dataProvider = createPostgrestDataProvider({
  apiUrl: 'https://api.example.com',
  headers: () => ({ Authorization: `Bearer ${token}` }),
});
```

### JSON:API

```typescript
import { createJsonApiDataProvider } from '@svadmin/jsonapi';

const dataProvider = createJsonApiDataProvider({ apiUrl: 'https://api.example.com' });
```

### Meilisearch

```typescript
import { createMeilisearchDataProvider } from '@svadmin/meilisearch';

const dataProvider = createMeilisearchDataProvider({
  host: 'https://search.example.com',
  apiKey: process.env.MEILISEARCH_KEY,
});
```

### Typesense

```typescript
import { createTypesenseDataProvider } from '@svadmin/typesense';

const dataProvider = createTypesenseDataProvider({
  host: 'https://typesense.example.com',
  apiKey: process.env.TYPESENSE_KEY,
});
```

### Elasticsearch 与 OpenSearch

```typescript
import { createElasticsearchDataProvider } from '@svadmin/elasticsearch';

const dataProvider = createElasticsearchDataProvider({
  node: 'https://search.example.com',
  apiKey: process.env.ELASTICSEARCH_API_KEY,
});
```

### ClickHouse

```typescript
import { createClickHouseDataProvider } from '@svadmin/clickhouse';

const dataProvider = createClickHouseDataProvider({
  url: 'https://clickhouse.example.com',
  database: 'analytics',
  authorization: `Basic ${btoa('default:')}`,
});
```

### Qdrant

```typescript
import { createQdrantDataProvider } from '@svadmin/qdrant';

const dataProvider = createQdrantDataProvider({
  host: 'https://qdrant.example.com',
  apiKey: process.env.QDRANT_API_KEY,
});
```

### S3 兼容对象列表

`@svadmin/s3` 是只读对象列表数据 Provider。上传、预签名 URL 和删除请使用
`@svadmin/storage`。它只能在可信服务端运行，不要把访问密钥打进浏览器包。

```typescript
import { createS3DataProvider } from '@svadmin/s3';

const objects = createS3DataProvider({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  bucket: process.env.S3_BUCKET,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  forcePathStyle: true,
});
```

## Provider 索引

| 包 | 工厂函数 | 说明 |
|----|----------|------|
| `@svadmin/simple-rest` | `createSimpleRestDataProvider` | 通用 REST |
| `@svadmin/rest` | `createRestDataProvider` | Refine REST 桥接 |
| `@svadmin/jsonapi` | `createJsonApiDataProvider` | JSON:API 1.0 |
| `@svadmin/postgrest` | `createPostgrestDataProvider` | PostgREST |
| `@svadmin/supabase` | `createSupabaseDataProvider` | 数据 + 认证 + 实时 |
| `@svadmin/pocketbase` | `createPocketBaseDataProvider` | 数据 + 认证 + 实时 |
| `@svadmin/appwrite` | `createAppwriteDataProvider` | 数据 + 认证 + 实时 |
| `@svadmin/graphql` | `createGraphQLDataProvider` | 通用 GraphQL |
| `@svadmin/hasura` | `createHasuraDataProvider` | Refine Hasura 桥接 |
| `@svadmin/nestjs-query` | `createNestjsQueryDataProvider` | Refine 桥接 |
| `@svadmin/nestjsx-crud` | `createNestjsxCrudDataProvider` | Refine 桥接 |
| `@svadmin/strapi` | `createStrapiDataProvider` | Refine 桥接 |
| `@svadmin/strapi-graphql` | `createStrapiGraphQLDataProvider` | Refine 桥接 |
| `@svadmin/directus` | `createDirectusDataProvider` | Directus 原生客户端 |
| `@svadmin/firebase` | `createFirebaseDataProvider` | Refine Firebase 桥接 |
| `@svadmin/airtable` | `createAirtableDataProvider` | Refine Airtable 桥接 |
| `@svadmin/medusa` | `createMedusaDataProvider` | Refine Medusa 桥接 |
| `@svadmin/sanity` | `createSanityDataProvider` | Sanity 原生客户端 |
| `@svadmin/meilisearch` | `createMeilisearchDataProvider` | 搜索与聚合 |
| `@svadmin/typesense` | `createTypesenseDataProvider` | 容错搜索 |
| `@svadmin/elasticsearch` | `createElasticsearchDataProvider` | Elasticsearch / OpenSearch |
| `@svadmin/clickhouse` | `createClickHouseDataProvider` | 分析查询 |
| `@svadmin/qdrant` | `createQdrantDataProvider` | 向量检索 |
| `@svadmin/drizzle` | `createDrizzleDataProvider` | 直连数据库 |
| `@svadmin/elysia` | `createElysiaDataProvider` | 端到端类型推导 |
| `@svadmin/s3` | `createS3DataProvider` | 只读对象列表 |

## 多数据 Provider

为不同资源使用不同后端：

```typescript
import { setDataProvider } from '@svadmin/core';

setDataProvider({
  default: restProvider,
  cms: graphqlProvider,
});
```

通过 `meta.dataProviderName` 标记资源的 Provider：

```typescript
const resources = [
  { name: 'posts', label: '文章', meta: { dataProviderName: 'cms' }, fields: [...] },
  { name: 'users', label: '用户', fields: [...] },  // 使用 'default'
];
```

## 过滤操作符

svadmin 支持 28 种字段操作符，以及逻辑 `and` / `or`：

| 操作符 | 说明 |
|--------|------|
| `eq`、`ne` | 等于、不等于 |
| `eqs`、`nes` | 严格等于、严格不等于 |
| `lt`、`gt`、`lte`、`gte` | 比较运算 |
| `in`、`nin` | 在数组中 / 不在数组中 |
| `ina`、`nina` | 数组字段包含 / 不包含 |
| `contains`、`ncontains` | 忽略大小写包含 / 不包含 |
| `containss`、`ncontainss` | 区分大小写包含 / 不包含 |
| `startswith`、`nstartswith` | 前缀 / 非前缀（忽略大小写） |
| `startswiths`、`nstartswiths` | 前缀 / 非前缀（区分大小写） |
| `endswith`、`nendswith` | 后缀 / 非后缀（忽略大小写） |
| `endswiths`、`nendswiths` | 后缀 / 非后缀（区分大小写） |
| `null`、`nnull` | 为空 / 不为空 |
| `between`、`nbetween` | 范围内 / 范围外 |

### 逻辑过滤器

用 `or` / `and` 组合过滤器：

```typescript
const filters: LogicalFilter = {
  operator: 'or',
  value: [
    { field: 'status', operator: 'eq', value: 'published' },
    { field: 'status', operator: 'eq', value: 'draft' },
  ],
};
```

## HttpError

数据 Provider 应抛出 `HttpError` 以实现结构化错误处理：

```typescript
import { HttpError } from '@svadmin/core';

throw new HttpError('验证失败', 422, {
  email: ['邮箱为必填项'],
  name: '名称太短',
});
```

`useForm` 会自动将 `HttpError.errors` 映射到表单字段错误。
