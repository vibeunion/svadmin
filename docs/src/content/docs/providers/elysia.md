---
title: Elysia Data Provider
description: Type-safe data provider for Elysia backends
---

The `@svadmin/elysia` package provides a DataProvider that connects to [Elysia](https://elysiajs.com/) backends following CRUD conventions, with optional end-to-end type inference via Eden Treaty.

## Installation

```bash
bun add @svadmin/elysia
```

## Basic Usage

```typescript
import { createElysiaDataProvider } from '@svadmin/elysia';

const dataProvider = createElysiaDataProvider({
  apiUrl: 'http://localhost:3000',
});
```

## With Auth Headers

```typescript
const dataProvider = createElysiaDataProvider({
  apiUrl: 'http://localhost:3000',
  headers: () => ({
    Authorization: `Bearer ${getToken()}`,
  }),
});
```

## Per-Resource Transport Adapters

Use a stable resource name when one backend exposes different URL, pagination,
or response-envelope conventions. Dynamic path segments must be encoded inside
the resolver; the complete path is intentionally left unencoded.

```typescript
const dataProvider = createElysiaDataProvider({
  apiUrl: 'https://console.example.com',
  resourceAdapters: [{
    match: 'project-tables',
    resourcePath: ({ meta }) => {
      const projectRef = meta?.projectRef;
      if (typeof projectRef !== 'string' || projectRef.length === 0) {
        throw new Error('projectRef is required for project-tables');
      }
      return `v1/projects/${encodeURIComponent(projectRef)}/database/tables`;
    },
    buildListSearchParams: ({ pagination }) => new URLSearchParams({
      page: String(pagination.current),
      limit: String(pagination.pageSize),
    }),
    parseListResponse: <T>(payload: unknown) => {
      const response = payload as { rows: T[]; total: number; nextCursor?: string };
      return {
        data: response.rows,
        total: response.total,
        nextCursor: response.nextCursor,
      };
    },
  }],
});

await dataProvider.getList({
  resource: 'project-tables',
  meta: { projectRef: 'project-a' },
});
```

The default `{ items, total }` and `{ data, total }` parsers also retain custom
top-level metadata such as cursors or facets in the returned `GetListResult`.

## Expected Backend Routes

The provider expects standard RESTful routes:

| Operation | Method | Route | Request | Response |
|-----------|--------|-------|---------|----------|
| List | `GET` | `/resource?_page=1&_limit=10` | query params | `{ items: T[], total: number }` / `{ data: T[], total: number }` / `T[]` |
| Get one | `GET` | `/resource/:id` | — | `T` |
| Create | `POST` | `/resource` | JSON body | `T` |
| Update | `PATCH` | `/resource/:id` | JSON body | `T` |
| Delete | `DELETE` | `/resource/:id` | — | `T` |

### Query Parameters

| Param | Format | Example |
|-------|--------|---------|
| Pagination | `_page`, `_limit` | `?_page=1&_limit=10` |
| Sorting | `_sort`, `_order` | `?_sort=name&_order=asc` |
| Filtering | `field_operator` | `?status_eq=active&name_contains=foo` |
| Logical filtering | `_filters` JSON | `?_filters=[{"operator":"or",...}]` |

### Filter Operators

Filters are appended as query params using `field_operator=value` format:

```
?status_eq=active        → status = 'active'
?price_gte=100           → price >= 100
?name_contains=widget    → name LIKE '%widget%'
?category_in=1,2,3       → category IN (1, 2, 3)
```

Flat filters keep the compact query format above. When a filter contains a
nested `and`/`or` group, the provider additionally sends the complete filter
tree as JSON in `_filters`; the Elysia endpoint should parse and validate that
parameter before applying it.

## End-to-End Type Safety

The main advantage of `@svadmin/elysia` is auto-inferring `ResourceTypeMap` from your Elysia server:

### Server Side

```typescript
// server.ts
import { Elysia } from 'elysia';

const app = new Elysia()
  .get('/posts', () => db.posts.findMany())
  .get('/posts/:id', ({ params }) => db.posts.findUnique({ where: { id: params.id } }))
  .post('/posts', ({ body }) => db.posts.create({ data: body }))
  .patch('/posts/:id', ({ params, body }) => db.posts.update({ where: { id: params.id }, data: body }))
  .delete('/posts/:id', ({ params }) => db.posts.delete({ where: { id: params.id } }));

export type App = typeof app;
```

### Client Side

```typescript
// resource-types.d.ts
import type { InferResourceMap } from '@svadmin/elysia';
import type { App } from './server';

declare module '@svadmin/core' {
  interface ResourceTypeMap extends InferResourceMap<App> {}
}
```

Now all hooks automatically know your resource names and data shapes:

```typescript
// Resource name is constrained at compile time
useList({ resource: 'posts' });   // ✅
useList({ resource: 'postz' });   // ❌ TypeScript error

// Data types auto-inferred
const query = useOne({ resource: 'posts', id: 1 });
query.data?.data.title; // string ✓ — no manual type annotation needed
```

## Options Reference

```typescript
interface ElysiaDataProviderOptions {
  /** Base API URL, e.g. 'http://localhost:3000' */
  apiUrl: string;
  /** Static headers or a function returning headers */
  headers?: Record<string, string> | (() => Record<string, string>);
  /** HTTP method for updates ('PATCH' or 'PUT') @default 'PATCH' */
  updateMethod?: 'PATCH' | 'PUT';
  /** Include credentials (cookies) in requests @default false */
  withCredentials?: boolean;
  /** Custom resource-to-URL segment mapping */
  resourceUrlMap?: Record<string, string>;
  /** Custom response parser for list endpoints */
  parseListResponse?: <TData extends BaseRecord = BaseRecord>(
    json: unknown,
    resource: string,
  ) => GetListResult<TData>;
  /** Ordered URL/query/envelope overrides; the first matching adapter wins */
  resourceAdapters?: readonly ElysiaResourceAdapter[];
}
```

## Bulk Operations

The provider also supports batch operations:

- `getMany` — fetches multiple records by repeating the ID parameter, e.g. `?id=1&id=2&id=3`
- `createMany` — sequential POST calls
- `updateMany` — sequential PATCH calls
- `deleteMany` — sequential DELETE calls
- `custom` — arbitrary HTTP requests

`custom` also accepts `query`, `sorters`, and `filters`. Provider-level auth
headers and `credentials: include` are inherited only for same-origin URLs.
For cross-origin URLs, sensitive default headers are removed; pass an explicit
header only when that destination is intentionally trusted. Delete endpoints
may return `204`, `205`, `Content-Length: 0`, or an otherwise empty body.

## Comparison with Simple REST

| Feature | `@svadmin/simple-rest` | `@svadmin/elysia` |
|---------|----------------------|-------------------|
| Type inference | Manual | Auto via Eden Treaty |
| Response format | `{ data: T[] }` | `{ items: T[], total: number }` / `{ data: T[], total: number }` / `T[]` |
| Filter format | Header-based | Query param `field_operator` |
| Auth | JWT/Cookie built-in | Via `headers` option |
| Dependencies | Zero | Zero (Eden Treaty optional) |
