# @svadmin/simple-rest

Simple REST adapters — fetch-based DataProvider and JWT/Cookie AuthProvider

## Install

```bash
bun add @svadmin/simple-rest
```

## Usage

```ts
import {
  createSimpleRestDataProvider,
  createSimpleRestAuthProvider,
} from '@svadmin/simple-rest';

const dataProvider = await createSimpleRestDataProvider('https://api.example.com');
const authProvider = createSimpleRestAuthProvider({ loginUrl: '/auth/login' });
```

Zero-dependency REST data provider plus a JWT/cookie auth provider. The default choice for conventional REST APIs.

Documentation: https://svadmin.nestjs.cn

License: MIT
