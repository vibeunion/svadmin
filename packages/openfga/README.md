# @svadmin/openfga

OpenFGA Fine-Grained Authorization adapter for svadmin

## Install

```bash
bun add @svadmin/openfga @openfga/sdk
```

## Usage

```ts
import { createOpenFgaAccessControl } from '@svadmin/openfga';

const accessControl = createOpenFgaAccessControl({
  client: fgaClient,
  user: () => `user:${currentUser.id}`,
});
```

Fine-grained authorization through OpenFGA relationship tuples. Resource actions map to relations configured by the host.

Documentation: https://svadmin.nestjs.cn

License: MIT
