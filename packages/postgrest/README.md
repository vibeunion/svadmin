# @svadmin/postgrest

Native PostgREST DataProvider adapter for svadmin

## Install

```bash
bun add @svadmin/postgrest
```

## Usage

```ts
import { createPostgrestDataProvider } from '@svadmin/postgrest';

const dataProvider = createPostgrestDataProvider({
  apiUrl: 'https://api.example.com',
  headers: () => ({ Authorization: `Bearer ${token}` }),
});
```

PostgREST data provider with count modes, pagination, sorting, and PostgREST filter mapping.

Documentation: https://svadmin.nestjs.cn

License: MIT
