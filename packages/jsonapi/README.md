# @svadmin/jsonapi

JSON:API 1.0 specification DataProvider adapter for svadmin

## Install

```bash
bun add @svadmin/jsonapi
```

## Usage

```ts
import { createJsonApiDataProvider } from '@svadmin/jsonapi';

const dataProvider = createJsonApiDataProvider({
  apiUrl: 'https://api.example.com',
});
```

JSON:API 1.0 data provider with page/offset pagination strategies and relationship-aware responses.

Documentation: https://svadmin.nestjs.cn

License: MIT
