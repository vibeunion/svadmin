# @svadmin/medusa

Medusa DataProvider for svadmin

## Install

```bash
bun add @svadmin/medusa @refinedev/medusa
```

## Usage

```ts
import { createMedusaDataProvider } from '@svadmin/medusa';

const dataProvider = await createMedusaDataProvider('https://medusa.example.com');
```

Bridges `@refinedev/medusa` for Medusa commerce resources such as products, orders, and customers.

Documentation: https://svadmin.nestjs.cn

License: MIT
