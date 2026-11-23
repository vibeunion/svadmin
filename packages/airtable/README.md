# @svadmin/airtable

Airtable DataProvider for svadmin

## Install

```bash
bun add @svadmin/airtable @refinedev/airtable
```

## Usage

```ts
import { createAirtableDataProvider } from '@svadmin/airtable';

const dataProvider = await createAirtableDataProvider('base-id', process.env.AIRTABLE_API_KEY);
```

Bridges the official `@refinedev/airtable` data provider to the svadmin DataProvider contract.

Documentation: https://svadmin.nestjs.cn

License: MIT
