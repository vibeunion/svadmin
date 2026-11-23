# @svadmin/appwrite

Appwrite adapters — DataProvider, AuthProvider, LiveProvider for svadmin

## Install

```bash
bun add @svadmin/appwrite appwrite
```

## Usage

```ts
import { Client, Databases } from 'appwrite';
import { createAppwriteDataProvider } from '@svadmin/appwrite';

const client = new Client().setEndpoint('https://cloud.appwrite.io/v1').setProject('project-id');
const dataProvider = await createAppwriteDataProvider({
  databases: new Databases(client),
  databaseId: 'main',
});
```

Also exports `createAppwriteAuthProvider` and `createAppwriteLiveProvider`. Supports sorters, filter operators, and bulk operations.

Documentation: https://svadmin.nestjs.cn

License: MIT
