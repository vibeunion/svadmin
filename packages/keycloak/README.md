# @svadmin/keycloak

Enterprise Keycloak OIDC/PKCE AuthProvider adapter for svadmin

## Install

```bash
bun add @svadmin/keycloak keycloak-js
```

## Usage

```ts
import { createKeycloakAuthProvider } from '@svadmin/keycloak';

const authProvider = createKeycloakAuthProvider(keycloakClient);
```

Keycloak OIDC/PKCE AuthProvider. Pass an initialized `keycloak-js` client; token refresh and identity stay with Keycloak.

Documentation: https://svadmin.nestjs.cn

License: MIT
