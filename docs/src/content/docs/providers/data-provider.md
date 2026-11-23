---
title: Data Provider
description: Connect svadmin to any backend API
---

The `DataProvider` interface defines how svadmin talks to your backend. Implement it once, and all hooks and components work automatically.

## Interface

```typescript
import type { BaseRecord } from '@svadmin/core';

interface DataProvider {
  getList: <TData extends BaseRecord>(params: GetListParams) => Promise<GetListResult<TData>>;
  getOne: <TData extends BaseRecord>(params: GetOneParams) => Promise<GetOneResult<TData>>;
  create: <TData extends BaseRecord, TVariables>(params: CreateParams<TVariables>) => Promise<CreateResult<TData>>;
  update: <TData extends BaseRecord, TVariables>(params: UpdateParams<TVariables>) => Promise<UpdateResult<TData>>;
  deleteOne: <TData extends BaseRecord, TVariables>(params: DeleteParams<TVariables>) => Promise<DeleteResult<TData>>;
  getApiUrl: () => string;

  // Optional
  getMany?: <TData extends BaseRecord>(params: GetManyParams) => Promise<GetManyResult<TData>>;
  createMany?: <TData extends BaseRecord, TVariables>(params: CreateManyParams<TVariables>) => Promise<CreateManyResult<TData>>;
  updateMany?: <TData extends BaseRecord, TVariables>(params: UpdateManyParams<TVariables>) => Promise<UpdateManyResult<TData>>;
  deleteMany?: <TData extends BaseRecord, TVariables>(params: DeleteManyParams<TVariables>) => Promise<DeleteManyResult<TData>>;
  custom?: <TData, TVariables>(params: CustomParams<TVariables>) => Promise<CustomResult<TData>>;
}
```

> `BaseRecord = Record<string, unknown>` — all data types extend this base type.

## Built-in Providers

> Most svadmin data providers are powered by their corresponding `@refinedev/*` package via [`@svadmin/refine-adapter`](/providers/refine-adapter). You can also use the adapter directly to bridge any Refine provider that svadmin doesn't have a dedicated package for yet.

### Simple REST

```typescript
import { createSimpleRestProvider } from '@svadmin/simple-rest';
const dataProvider = createSimpleRestProvider('https://api.example.com');
```

Maps to: `GET /posts`, `GET /posts/1`, `POST /posts`, `PUT /posts/1`, `DELETE /posts/1`

### Supabase

```typescript
import { createSupabaseDataProvider } from '@svadmin/supabase';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);
const dataProvider = createSupabaseDataProvider(supabase);
```

If you also use `@supacloud/js`, keep using `createSupabaseDataProvider()` for CRUD. Task APIs such as submit/list/retry live under the optional [`@svadmin/supabase/supacloud`](/providers/supacloud) entry instead of the main data provider contract.

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

Supports sorters, 10+ filter operators, and bulk operations (`getMany`, `deleteMany`).

### PocketBase

```typescript
import PocketBase from 'pocketbase';
import { createPocketBaseDataProvider } from '@svadmin/pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');
const dataProvider = createPocketBaseDataProvider({ pb });
```

Supports sorters, filters, and bulk operations. PocketBase also provides `createPocketBaseAuthProvider` and `createPocketBaseLiveProvider`.

### Elysia (Type-Safe)

```typescript
import { createElysiaDataProvider } from '@svadmin/elysia';
import type { InferResourceMap } from '@svadmin/elysia';
import type { App } from './server';  // your Elysia app type

// Auto-infer resource types from Elysia routes
declare module '@svadmin/core' {
  interface ResourceTypeMap extends InferResourceMap<App> {}
}

const dataProvider = createElysiaDataProvider<App>('http://localhost:3000');
```

The `@svadmin/elysia` package provides end-to-end type safety by inferring `ResourceTypeMap` directly from your Elysia backend routes.

### Drizzle ORM

```typescript
import { createDrizzleDataProvider } from '@svadmin/drizzle';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';

const db = drizzle(new Database('./app.db'), { schema });
const dataProvider = await createDrizzleDataProvider({ connection: db, schema });
```

Direct database access via Drizzle ORM — supports SQLite, PostgreSQL, MySQL, and Cloudflare D1. Includes built-in soft delete, relations, transactions, aggregations, and security guard. See the [Drizzle ORM guide](/providers/drizzle) for full documentation.

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
// Pass an initialized @refinedev/firebase (or compatible) provider.
import { createFirebaseDataProvider } from '@svadmin/firebase';

const dataProvider = createFirebaseDataProvider(refineFirebaseProvider);
```

### Hasura

```typescript
// bun add @svadmin/hasura @refinedev/hasura graphql-request
import { GraphQLClient } from 'graphql-request';
import { createHasuraDataProvider } from '@svadmin/hasura';

const client = new GraphQLClient('https://api.example.com/v1/graphql', {
  headers: { 'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET ?? '' },
});
const dataProvider = await createHasuraDataProvider(client);
```

Keep the Hasura admin secret on the server. Browser clients should send a Hasura JWT or role header instead.

### Medusa

```typescript
// bun add @svadmin/medusa @refinedev/medusa
import { createMedusaDataProvider } from '@svadmin/medusa';

const dataProvider = await createMedusaDataProvider('https://medusa.example.com');
```

### NestJS Query and NestJSX CRUD

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

### Strapi and Strapi GraphQL

```typescript
// bun add @svadmin/strapi @refinedev/strapi-v4
import { createStrapiDataProvider } from '@svadmin/strapi';
const restProvider = await createStrapiDataProvider('https://strapi.example.com');

// bun add @svadmin/strapi-graphql @refinedev/strapi-graphql
import { createStrapiGraphQLDataProvider } from '@svadmin/strapi-graphql';
const graphqlProvider = await createStrapiGraphQLDataProvider('https://strapi.example.com/graphql');
```

### Generic REST bridge

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

### Elasticsearch and OpenSearch

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

### S3-compatible object listing

`@svadmin/s3` is a read-only data provider for listing bucket objects. Use
`@svadmin/storage` for uploads, presigned URLs, and deletes. Run it on a trusted
server; never ship access keys to the browser.

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

## Provider index

| Package | Factory | Notes |
|---------|---------|-------|
| `@svadmin/simple-rest` | `createSimpleRestDataProvider` | Generic REST envelope |
| `@svadmin/rest` | `createRestDataProvider` | Refine REST bridge |
| `@svadmin/jsonapi` | `createJsonApiDataProvider` | JSON:API 1.0 |
| `@svadmin/postgrest` | `createPostgrestDataProvider` | PostgREST |
| `@svadmin/supabase` | `createSupabaseDataProvider` | Data + auth + live |
| `@svadmin/pocketbase` | `createPocketBaseDataProvider` | Data + auth + live |
| `@svadmin/appwrite` | `createAppwriteDataProvider` | Data + auth + live |
| `@svadmin/graphql` | `createGraphQLDataProvider` | Generic GraphQL |
| `@svadmin/hasura` | `createHasuraDataProvider` | Refine Hasura bridge |
| `@svadmin/nestjs-query` | `createNestjsQueryDataProvider` | Refine bridge |
| `@svadmin/nestjsx-crud` | `createNestjsxCrudDataProvider` | Refine bridge |
| `@svadmin/strapi` | `createStrapiDataProvider` | Refine bridge |
| `@svadmin/strapi-graphql` | `createStrapiGraphQLDataProvider` | Refine bridge |
| `@svadmin/directus` | `createDirectusDataProvider` | Native Directus client |
| `@svadmin/firebase` | `createFirebaseDataProvider` | Refine Firebase bridge |
| `@svadmin/airtable` | `createAirtableDataProvider` | Refine Airtable bridge |
| `@svadmin/medusa` | `createMedusaDataProvider` | Refine Medusa bridge |
| `@svadmin/sanity` | `createSanityDataProvider` | Native Sanity client |
| `@svadmin/meilisearch` | `createMeilisearchDataProvider` | Search and facets |
| `@svadmin/typesense` | `createTypesenseDataProvider` | Typo-tolerant search |
| `@svadmin/elasticsearch` | `createElasticsearchDataProvider` | Elasticsearch / OpenSearch |
| `@svadmin/clickhouse` | `createClickHouseDataProvider` | Analytical queries |
| `@svadmin/qdrant` | `createQdrantDataProvider` | Vector search |
| `@svadmin/drizzle` | `createDrizzleDataProvider` | Direct database access |
| `@svadmin/elysia` | `createElysiaDataProvider` | End-to-end type inference |
| `@svadmin/s3` | `createS3DataProvider` | Read-only object listing |

## Multiple Data Providers

Use different backends for different resources:

```typescript
import { setDataProvider } from '@svadmin/core';

setDataProvider({
  default: restProvider,
  cms: graphqlProvider,
});
```

Tag resources with their provider via `meta.dataProviderName`:

```typescript
const resources = [
  { name: 'posts', label: 'Posts', meta: { dataProviderName: 'cms' }, fields: [...] },
  { name: 'users', label: 'Users', fields: [...] },  // uses 'default'
];
```

## Filter Operators

svadmin supports 28 field operators plus logical `and` / `or`:

| Operator | Description |
|----------|-------------|
| `eq`, `ne` | Equal, not equal |
| `eqs`, `nes` | Strict equal, strict not equal |
| `lt`, `gt`, `lte`, `gte` | Comparisons |
| `in`, `nin` | In array / not in array |
| `ina`, `nina` | In array (array field) / not in array (array field) |
| `contains`, `ncontains` | Case-insensitive contains / not contains |
| `containss`, `ncontainss` | Case-sensitive contains / not contains |
| `startswith`, `nstartswith` | Prefix / not prefix (case-insensitive) |
| `startswiths`, `nstartswiths` | Prefix / not prefix (case-sensitive) |
| `endswith`, `nendswith` | Suffix / not suffix (case-insensitive) |
| `endswiths`, `nendswiths` | Suffix / not suffix (case-sensitive) |
| `null`, `nnull` | Is null / not null |
| `between`, `nbetween` | Range / not in range |

### Logical Filters

Combine filters with `or` / `and`:

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

Data providers should throw `HttpError` for structured error handling:

```typescript
import { HttpError } from '@svadmin/core';

throw new HttpError('Validation Failed', 422, {
  email: ['Email is required'],
  name: 'Name is too short',
});
```

`useForm` automatically maps `HttpError.errors` to form field errors.
