# @svadmin/sveltekit

SvelteKit integration for svadmin

## Install

```bash
bun add @svadmin/sveltekit
```

## Usage

```ts
import { createSvelteKitRouterProvider } from '@svadmin/sveltekit';

const routerProvider = createSvelteKitRouterProvider();
```

SvelteKit router integration built on `$app/navigation` and `$app/state`, including base-path handling.

Documentation: https://svadmin.nestjs.cn

License: MIT
