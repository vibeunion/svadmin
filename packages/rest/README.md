# @svadmin/rest

Generic REST data provider for svadmin, bridging the official
[`@refinedev/rest`](https://www.npmjs.com/package/@refinedev/rest) package.

Use it when your API does not follow the Simple REST envelope but you still want
declarative resource routing.

## Install

```bash
bun add @svadmin/rest @refinedev/rest @nestjsx/crud-request
```

## Usage

```ts
import { createRestDataProvider } from '@svadmin/rest';

const dataProvider = await createRestDataProvider({
  posts: { path: '/api/posts' },
  users: { path: '/api/users' },
});
```

All arguments are forwarded to `@refinedev/rest`; the result is adapted to the
svadmin `DataProvider` contract.

See `docs/architecture/admin-platform.md` for the platform model.