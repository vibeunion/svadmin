# @svadmin/refine-adapter

> Bridge [@refinedev](https://github.com/refinedev/refine) data and framework providers to svadmin

[![npm](https://img.shields.io/npm/v/@svadmin/refine-adapter?color=ff3e00&label=npm)](https://www.npmjs.com/package/@svadmin/refine-adapter)

## Why?

[Refine](https://refine.dev/) has a rich ecosystem of battle-tested data providers for services like Supabase, Appwrite, Hasura, Strapi, Airtable, NestJS, and more. `@svadmin/refine-adapter` lets you use **any** of those providers inside svadmin — zero rewrite required.

Since Refine's `DataProvider` interface closely mirrors svadmin's `DataProvider`, the adapter is a thin bridge that binds method calls and forwards optional methods when present.

## Installation

```bash
bun add @svadmin/refine-adapter @svadmin/core
```

If your app is powered by Vite and also uses `@svadmin/ui` or `@svadmin/supabase`, exclude svadmin packages from `optimizeDeps` to avoid dev-time pre-bundling issues:

```ts
optimizeDeps: {
  exclude: ['@svadmin/core', '@svadmin/ui', '@svadmin/supabase'],
}
```

Then install the Refine data provider you want to use, e.g.:

```bash
bun add @refinedev/supabase
bun add @refinedev/strapi-v4
bun add @refinedev/appwrite
```

## Usage

```typescript
import { createRefineAdapter } from '@svadmin/refine-adapter';
import { dataProvider as createRefineSupabase } from '@refinedev/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
const refineProvider = createRefineSupabase(supabaseClient);

// Bridge it to svadmin
const dataProvider = createRefineAdapter(refineProvider);
```

Then pass `dataProvider` to `<AdminApp>` or `setDataProvider()` as usual.

## Supported Methods

| Method | Required | Description |
|--------|----------|-------------|
| `getList` | ✅ | List with pagination, sorting, filtering |
| `getOne` | ✅ | Get single record |
| `create` | ✅ | Create record |
| `update` | ✅ | Update record |
| `deleteOne` | ✅ | Delete record |
| `getApiUrl` | ✅ | Return API base URL |
| `getMany` | Optional | Bulk get |
| `createMany` | Optional | Bulk create |
| `updateMany` | Optional | Bulk update |
| `deleteMany` | Optional | Bulk delete |
| `custom` | Optional | Custom endpoint |

Optional methods are only wired if the underlying Refine provider implements them.

## Other Refine providers

```typescript
import {
  createRefineAuthAdapter,
  createRefineAccessControlAdapter,
  createRefineNotificationAdapter,
  createRefineLiveAdapter,
  createRefineRouterAdapter,
  createRefineI18nAdapter,
} from '@svadmin/refine-adapter';

const authProvider = createRefineAuthAdapter(refineAuthProvider);
const accessControlProvider = createRefineAccessControlAdapter(refineAccessControlProvider);
const notificationProvider = createRefineNotificationAdapter(refineNotificationProvider);
const liveProvider = createRefineLiveAdapter(refineLiveProvider);
const routerProvider = createRefineRouterAdapter(refineRouterProvider);
const i18nProvider = createRefineI18nAdapter(refineI18nProvider);
```

Router adapters resolve Refine's function-generator bindings at call time. I18n
adapters normalize translations to strings and map `changeLocale` to
`setLocale`.

## UI boundary

Like Refine, this package keeps the core headless. It does not ship Table,
Upload, DatePicker, Modal/Drawer, or form components. Those stay in the UI layer
or host application, while Refine-style provider contracts stay in core.

## Which Svadmin Providers Use This?

The following `@svadmin/*` packages internally use `@svadmin/refine-adapter` to bridge their corresponding `@refinedev/*` provider:

| svadmin Package | Refine Package |
|-----------------|---------------|
| `@svadmin/supabase` | `@refinedev/supabase` |
| `@svadmin/appwrite` | `@refinedev/appwrite` |
| `@svadmin/strapi` | `@refinedev/strapi-v4` |
| `@svadmin/hasura` | `@refinedev/hasura` |
| `@svadmin/graphql` | `@refinedev/graphql` |
| `@svadmin/airtable` | `@refinedev/airtable` |
| `@svadmin/medusa` | `@refinedev/medusa` |
| `@svadmin/nestjs-query` | `@refinedev/nestjs-query` |
| `@svadmin/nestjsx-crud` | `@refinedev/nestjsx-crud` |
| `@svadmin/simple-rest` | `@refinedev/simple-rest` |

## License

MIT
