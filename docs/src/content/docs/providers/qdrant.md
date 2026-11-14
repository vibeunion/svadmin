---
title: Qdrant Vector Database Data Provider
description: High-performance vector similarity search, payload storage, and RAG retrieval using Qdrant
---

`@svadmin/qdrant` provides a vector database and document DataProvider for [Qdrant](https://qdrant.tech/), enabling vector similarity search, payload filtering, and hybrid retrieval inside svadmin views.

## Installation

```bash
bun add @svadmin/qdrant
```

## Basic Usage

```typescript
import { createQdrantDataProvider } from '@svadmin/qdrant';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createQdrantDataProvider({
  host: 'https://xyz-example.qdrant.io:6333',
  apiKey: process.env.QDRANT_API_KEY,
  collectionMap: {
    'documents': 'enterprise_kb_v2',
  },
});

setDataProvider(dataProvider);
```

## Vector Similarity Search

When performing similarity searches (such as RAG chunk retrieval or image vector matching), provide the embedding vector inside `meta.vector`:

```typescript
import { useList } from '@svadmin/core';

const { data, isLoading } = useList({
  resource: 'documents',
  pagination: { current: 1, pageSize: 10 },
  meta: {
    vector: [0.023, -0.412, 0.812],
    with_vector: false,
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

## Standard Point Browsing & CRUD

When `meta.vector` is omitted, the provider automatically uses Qdrant's `/collections/{collection}/points/scroll` endpoint for pagination and filtering:

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

Create, update, and delete operations map directly to Qdrant Point upsert and delete batch APIs with automatic schema alignment.
