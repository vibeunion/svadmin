# @svadmin/casbin

Casbin policy-based AccessControlProvider adapter for svadmin

## Install

```bash
bun add @svadmin/casbin casbin
```

## Usage

```ts
import { createCasbinAccessControl } from '@svadmin/casbin';

const accessControl = createCasbinAccessControl({
  enforcer,
  user: () => currentUser.id,
});
```

Adapts a Casbin enforcer to svadmin AccessControlProvider, including optional domain-based multi-tenant RBAC.

Documentation: https://svadmin.nestjs.cn

License: MIT
