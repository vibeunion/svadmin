# @svadmin/nestjs-query

NestJS Query DataProvider for svadmin

## Install

```bash
bun add @svadmin/nestjs-query @refinedev/nestjs-query
```

## Usage

```ts
import { createNestjsQueryDataProvider } from '@svadmin/nestjs-query';

const dataProvider = await createNestjsQueryDataProvider(
  'https://api.example.com/graphql',
);
```

Bridges `@refinedev/nestjs-query` for NestJS GraphQL CRUD APIs.

Documentation: https://svadmin.nestjs.cn

License: MIT
