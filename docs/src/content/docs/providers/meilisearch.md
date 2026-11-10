---
title: Meilisearch Provider
description: Connect Meilisearch instant search engine to svadmin
---

`@svadmin/meilisearch` provides a native `DataProvider` adapter compliant with the [Meilisearch](https://www.meilisearch.com/) REST API. It turns Meilisearch indexes into reactive data sources for svadmin's tables, forms, and search fields.

## Installation

```bash
bun add @svadmin/meilisearch
```

## Basic Usage

```typescript
import { createMeilisearchDataProvider } from '@svadmin/meilisearch';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createMeilisearchDataProvider({
  host: 'http://localhost:7700',
  apiKey: 'YOUR_MEILISEARCH_API_KEY',
  indexMap: {
    // Optional mapping: resource name -> index UID
    articles: 'blog_articles',
  },
});

setDataProvider(dataProvider);
```

## Features

- **Blazing-Fast Search**: Translates svadmin query parameters and filters (`q`, `search`, filters) into optimized Meilisearch search requests.
- **Faceted Filters & Sorting**: Translates complex logical filters (`eq`, `in`, `gte`, `lte`, `and`, `or`) into native Meilisearch filter string expressions.
- **Typo Tolerance & Highlighting**: Automatically requests highlighted snippets (`attributesToHighlight: ['*']`) to render emphasized matching keywords.
- **Full CRUD Support**: Supports reading (`getList`, `getOne`), creating, updating, and deleting documents.
- **Zero Heavy Dependencies**: Pure TypeScript native implementation using the Web standard Fetch API.
