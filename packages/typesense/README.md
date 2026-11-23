# @svadmin/typesense

Typesense instant in-memory search & faceted DataProvider for svadmin

## Install

```bash
bun add @svadmin/typesense
```

## Usage

```ts
import { createTypesenseDataProvider } from '@svadmin/typesense';

const dataProvider = createTypesenseDataProvider({
  host: 'https://typesense.example.com',
  apiKey: process.env.TYPESENSE_KEY,
});
```

Typo-tolerant search with collection mapping, query fields, highlights, and faceted filters.

Documentation: https://svadmin.nestjs.cn

License: MIT
