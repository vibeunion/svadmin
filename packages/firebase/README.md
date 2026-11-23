# @svadmin/firebase

Firebase DataProvider for svadmin

## Install

```bash
bun add @svadmin/firebase
```

## Usage

```ts
import { createFirebaseDataProvider } from '@svadmin/firebase';

const dataProvider = createFirebaseDataProvider(refineFirebaseProvider);
```

Bridges an initialized Refine-compatible Firebase provider to svadmin. Firebase setup stays in the host app.

Documentation: https://svadmin.nestjs.cn

License: MIT
