# @svadmin/elasticsearch

Elasticsearch & OpenSearch DataProvider for svadmin

## Install

```bash
bun add @svadmin/elasticsearch
```

## Usage

```ts
import { createElasticsearchDataProvider } from '@svadmin/elasticsearch';

const dataProvider = createElasticsearchDataProvider({
  node: process.env.ELASTICSEARCH_URL,
  apiKey: process.env.ELASTICSEARCH_API_KEY,
});
```

Elasticsearch and OpenSearch data provider with index mapping, filters, sorting, and pagination.

Documentation: https://svadmin.nestjs.cn

License: MIT
