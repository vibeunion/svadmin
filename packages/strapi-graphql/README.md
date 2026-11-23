# @svadmin/strapi-graphql

Strapi GraphQL DataProvider adapter — bridge @refinedev/strapi-graphql to svadmin

## Install

```bash
bun add @svadmin/strapi-graphql @refinedev/strapi-graphql
```

## Usage

```ts
import { createStrapiGraphQLDataProvider } from '@svadmin/strapi-graphql';

const dataProvider = await createStrapiGraphQLDataProvider(
  'https://strapi.example.com/graphql',
);
```

Bridges `@refinedev/strapi-graphql` for Strapi GraphQL content APIs.

Documentation: https://svadmin.nestjs.cn

License: MIT
