# @svadmin/strapi

Strapi v4/v5 DataProvider for svadmin

## Install

```bash
bun add @svadmin/strapi @refinedev/strapi-v4
```

## Usage

```ts
import { createStrapiDataProvider } from '@svadmin/strapi';

const dataProvider = await createStrapiDataProvider('https://strapi.example.com');
```

Bridges `@refinedev/strapi-v4` for Strapi REST content APIs.

Documentation: https://svadmin.nestjs.cn

License: MIT
