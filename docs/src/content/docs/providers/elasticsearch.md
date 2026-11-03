---
title: Elasticsearch Data Provider
description: Full-text search, audit logging, and document querying with Elasticsearch & OpenSearch
---

`@svadmin/elasticsearch` provides an Elasticsearch & OpenSearch REST API DataProvider translating svadmin CRUD queries into Elasticsearch Query DSL.

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
