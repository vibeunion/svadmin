# @svadmin/qdrant

Qdrant vector database and hybrid similarity search DataProvider for svadmin

## Install

```bash
bun add @svadmin/qdrant
```

## Usage

```ts
import { createQdrantDataProvider } from '@svadmin/qdrant';

const dataProvider = createQdrantDataProvider({
  host: 'https://qdrant.example.com',
  apiKey: process.env.QDRANT_API_KEY,
});
```

Vector similarity search and payload storage with collection mapping.

Documentation: https://svadmin.nestjs.cn

License: MIT
