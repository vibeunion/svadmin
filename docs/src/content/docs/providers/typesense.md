---
title: Typesense Provider
description: Connect Typesense in-memory typo-tolerant search engine to svadmin
---

`@svadmin/typesense` provides an official, lightweight `DataProvider` adapter compliant with the [Typesense](https://typesense.org/) REST API. It turns Typesense collections into reactive, typo-tolerant search and CRUD data sources for svadmin's `<AutoTable>`, search controls, and filter panels.

## Installation

```bash
bun add @svadmin/typesense
```

## Basic Usage

```typescript
import { createTypesenseDataProvider } from '@svadmin/typesense';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createTypesenseDataProvider({
  host: 'http://localhost:8108',
  apiKey: 'YOUR_TYPESENSE_API_KEY',
  collectionMap: {
    // Optional resource name to collection name mapping
    articles: 'articles_v2',
  },
  queryBy: ['title', 'content', 'author'],
});

setDataProvider(dataProvider);
```

## Features

- **In-Memory Blazing-Fast Search**: Translates svadmin fulltext query keywords (`q`, `search`, filters) into optimized Typesense search queries with native typo tolerance.
- **Faceted Search & Multi-field Filtering**: Compiles svadmin filters (`eq`, `ne`, `in`, `nin`, `gt`, `gte`, `lt`, `lte`, `and`, `or`) into valid Typesense `filter_by` syntax expressions.
- **Typo Tolerance & Dynamic Snippet Highlighting**: Seamlessly extracts Typesense match highlights (`_highlight`) for rendering emphasized matches in UI components.
- **Full CRUD Support**: Complete support for `getList`, `getOne`, `create` (with optional upsert), `update` (patch), and `deleteOne`.
- **Zero Heavy Dependencies**: Pure TypeScript native implementation using Web standard Fetch API without bloated client libraries.
