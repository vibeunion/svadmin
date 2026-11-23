# @svadmin/hasura

Hasura GraphQL DataProvider for svadmin

## Install

```bash
bun add @svadmin/hasura @refinedev/hasura graphql-request
```

## Usage

```ts
import { GraphQLClient } from 'graphql-request';
import { createHasuraDataProvider } from '@svadmin/hasura';

const client = new GraphQLClient('https://api.example.com/v1/graphql', {
  headers: { 'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET ?? '' },
});
const dataProvider = await createHasuraDataProvider(client);
```

Bridges the official `@refinedev/hasura` provider, including CRUD, bulk operations, and custom requests. Keep the admin secret on the server; browser clients should send a Hasura JWT or role header instead.

Documentation: https://svadmin.nestjs.cn

License: MIT
