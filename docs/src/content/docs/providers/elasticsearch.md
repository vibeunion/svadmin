---
title: Full-text Search Data Provider
description: Full-text search, audit logging, and document querying through a search REST API
---

`@svadmin/elasticsearch` provides a search REST API DataProvider that translates svadmin CRUD queries into a query DSL.

## Installation

```bash
bun add @svadmin/elasticsearch
```

## Basic Usage

```typescript
import { createElasticsearchDataProvider } from '@svadmin/elasticsearch';
import { setDataProvider } from '@svadmin/core';

const dataProvider = createElasticsearchDataProvider({
  node: 'http://localhost:9200',
  apiKey: process.env.ES_API_KEY,
  indexMap: {
    'system-logs': 'logs-app-*',
  },
});

setDataProvider(dataProvider);
```
