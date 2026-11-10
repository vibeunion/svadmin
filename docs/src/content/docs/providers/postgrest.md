---
title: PostgREST Provider
description: Connect PostgreSQL REST API backends via PostgREST to svadmin
---

`@svadmin/postgrest` provides a native `DataProvider` adapter communicating directly with [PostgREST](https://postgrest.org/) REST API endpoints on top of any PostgreSQL database.

## Installation

```bash
bun add @svadmin/postgrest
```

## Basic Usage

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

## Features

- **Native Content-Range Pagination**: Maps `pagination.current` & `pagination.pageSize` to HTTP `Range: 0-9` request headers, reading total counts from response `Content-Range: 0-9/100`.
- **Singular Object Retrieval**: Uses `Accept: application/vnd.pgrst.object+json` for `getOne` queries to receive single entities without array wrapping.
- **Immediate Representation**: Passes `Prefer: return=representation` on `create` and `update` queries to return modified records immediately.
- **PostgREST Query Operators**: Automatically serializes SvAdmin filter expressions to PostgREST format (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`, `is`, `cs`, `cd`).
- **Custom Stored Procedures**: Supports database stored procedures execution via `dataProvider.custom({ url: '/rpc/my_procedure', method: 'post' })`.
- **Zero Heavy Dependencies**: Pure TypeScript native implementation using Web standard Fetch API.
