# @svadmin/hasura

Hasura GraphQL DataProvider for svadmin

## Install

```bash
bun add @svadmin/hasura @refinedev/hasura graphql-request
```

## Usage

```ts
import { createHasuraDataProvider } from '@svadmin/hasura';

const dataProvider = await createHasuraDataProvider({
  endpoint: 'https://api.example.com/v1/graphql',
});
```

Bridges the official `@refinedev/hasura` provider, including CRUD, bulk operations, and custom requests.

Documentation: https://svadmin.nestjs.cn

License: MIT
