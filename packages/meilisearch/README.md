# @svadmin/meilisearch

Meilisearch instant search & faceted DataProvider for svadmin

## Install

```bash
bun add @svadmin/meilisearch
```

## Usage

```ts
import { createMeilisearchDataProvider } from '@svadmin/meilisearch';

const dataProvider = createMeilisearchDataProvider({
  host: 'https://search.example.com',
  apiKey: process.env.MEILISEARCH_KEY,
});
```

Instant search and faceted filtering with index mapping, highlights, and pagination.

Documentation: https://svadmin.nestjs.cn

License: MIT
