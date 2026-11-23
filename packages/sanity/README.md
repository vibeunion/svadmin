# @svadmin/sanity

Sanity DataProvider for svadmin

## Install

```bash
bun add @svadmin/sanity
```

## Usage

```ts
import { createSanityDataProvider } from '@svadmin/sanity';

const dataProvider = createSanityDataProvider(
  'project-id',
  'production',
  process.env.SANITY_TOKEN,
);
```

Sanity Content Lake data provider with GROQ-backed filters and validated responses.

Documentation: https://svadmin.nestjs.cn

License: MIT
