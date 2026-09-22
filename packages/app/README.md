# @svadmin/app

Application composition layer for svadmin.

[`@svadmin/core`](https://www.npmjs.com/package/@svadmin/core) owns contracts and
runtime hooks; `@svadmin/app` owns how an application is assembled:

- `defineAdminConfig` / `defineSvadminPlugin` — typed application config and
  machine-readable plugin manifests.
- `resolveAdminConfig` / `assertAdminConfig` — fold plugin contributions into a
  deterministic snapshot plus diagnostics.
- `createAdminApp` — one-call convenience returning the provider bundle and
  normalized resource definitions.
- `provideAdminConfig` — install the resolved config into the scoped
  `AdminContext`.
- `buildAdminManifest` — serialize the resolved config into the stable
  `svadmin.ai.json` entrypoint that AI tooling and `svadmin doctor` read.
- `createProviderBundle` — first-class provider configuration object.

## Install

```bash
bun add @svadmin/app @svadmin/core
```

## Usage

```ts
import { createAdminApp, defineAdminConfig } from '@svadmin/app';

export const app = defineAdminConfig({
  name: 'my-admin',
  providers: createProviderBundle({ dataProvider }),
  resources: [ordersDefinition],
});

export default createAdminApp(app);
```

See `docs/architecture/admin-platform.md` for the full platform model.