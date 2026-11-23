# @svadmin/nestjsx-crud

NestJSX CRUD DataProvider for svadmin

## Install

```bash
bun add @svadmin/nestjsx-crud @refinedev/nestjsx-crud
```

## Usage

```ts
import { createNestjsxCrudDataProvider } from '@svadmin/nestjsx-crud';

const dataProvider = await createNestjsxCrudDataProvider('https://api.example.com');
```

Bridges `@refinedev/nestjsx-crud` for NestJSX CRUD REST APIs.

Documentation: https://svadmin.nestjs.cn

License: MIT
