# @svadmin/directus

Directus DataProvider for svadmin

## Install

```bash
bun add @svadmin/directus
```

## Usage

```ts
import { createDirectusDataProvider } from '@svadmin/directus';

const dataProvider = createDirectusDataProvider(
  'https://directus.example.com',
  process.env.DIRECTUS_TOKEN,
);
```

Native Directus data provider with validated responses and Directus filter mapping.

Documentation: https://svadmin.nestjs.cn

License: MIT
