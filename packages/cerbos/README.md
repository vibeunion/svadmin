# @svadmin/cerbos

Cerbos Cloud-Native Policy PDP AccessControl adapter for svadmin

## Install

```bash
bun add @svadmin/cerbos @cerbos/http
```

## Usage

```ts
import { createCerbosAccessControl } from '@svadmin/cerbos';

const accessControl = createCerbosAccessControl({
  client: cerbosClient,
  principal: () => ({ id: currentUser.id, roles: currentUser.roles }),
});
```

Maps svadmin resources and actions to Cerbos `checkResource` calls. Principal attributes are supplied by the host.

Documentation: https://svadmin.nestjs.cn

License: MIT
