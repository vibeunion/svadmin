---
title: Orama In-Memory Search Data Provider
description: Zero-backend, edge-ready, in-memory full-text and hybrid search DataProvider using Orama
---

`@svadmin/orama` provides a zero-backend, in-memory, edge-ready `DataProvider` adapter for [Orama](https://orama.com/). It enables blazing-fast full-text search, typo-tolerant fuzzy matching, and multi-field faceting directly in the browser, edge workers (Cloudflare Workers, Deno), or offline desktop applications.

## Installation

```bash
bun add @svadmin/orama
```

## Basic Usage

```typescript
import { createOramaDataProvider } from '@svadmin/orama';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createOramaDataProvider({
  initialData: {
    articles: [
      { id: '1', title: 'Svelte 5 Runes In Depth', category: 'frontend', views: 1200 },
      { id: '2', title: 'Edge Computing and Offline Search', category: 'architecture', views: 2400 },
    ],
  },
  tolerance: 1, // Typo-tolerance threshold
});

setDataProvider(dataProvider);
```

## Features

- **Zero External Dependencies**: Operates entirely in memory without requiring Elasticsearch, Meilisearch, or Docker containers.
- **Typo Tolerance**: Automatically corrects misspellings and ranks hits with normalized relevance scoring (`_score`).
- **Complete CRUD Lifecycle**: Full support for `getList`, `getOne`, `create`, `update`, and `deleteOne` operations.
- **Edge & Offline Ready**: Perfect for Electron desktop apps, mobile PWA, Local-First architectures, and Cloudflare Workers.
