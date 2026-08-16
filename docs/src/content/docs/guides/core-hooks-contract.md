---
title: Core Hook Contract
description: Svelte-only core contract and Query Key v2 migration; 0.36 deprecates positional helpers, 0.39 removes them
---

Starting with 0.39, `@svadmin/core` is permanently Svelte-only. Its public integration surface remains Svelte 5 hooks and Svelte context. A framework-neutral `@svadmin/kernel`, Vue adapter, and cross-framework compatibility layer are intentionally outside the roadmap.

## What is frozen

The public names and primary responsibilities of the data, mutation, form, table, auth, task, live, permission, and routing hooks are frozen from 0.36 (preliminary freeze; permanent from 0.39). New capabilities should extend typed options and return values without replacing the hook model or splitting behavior into a second framework abstraction.

The internal rules that benefit from being pure TypeScript remain small and focused: Query Key construction/parsing, typed cache matching, provider resolution, tenant isolation, and provider interfaces. They support the Svelte hooks; they are not a separate runtime.

## Query Key v2 only

0.36 introduces the typed Query Key v2 builder and deprecates the positional compatibility helpers `appendTenantCacheKey` and `queryKeyMatchesTenant`. They remain available through 0.38 and are removed in 0.39. Keys such as the following are no longer recognized by v2:

```ts
['default', 'posts', 'list', pagination, filters]
```

Use the typed v2 builder instead:

```ts
import { keys, queryKeyMatches } from '@svadmin/core';

const queryKey = keys({ provider: 'default', tenant: tenantId })
  .data.list('posts', { pagination, filters });

queryKeyMatches(queryKey, {
  provider: 'default',
  tenant: tenantId,
  kind: 'data',
  resource: 'posts',
  action: 'list',
});
```

Application code normally does not need to construct keys: core hooks resolve the resource provider and tenant and use v2 automatically. Custom integrations should use `keys`, `parseQueryKey`, `queryKeyMatches`, or `dataQueryMatches`; do not inspect array offsets.

## Migration checklist

1. Stop using `appendTenantCacheKey` and `queryKeyMatchesTenant` — they are deprecated in 0.36 and removed in 0.39.
2. Replace positional key construction with `keys(...)`.
3. Replace `queryKey[0]`, `queryKey[1]`, and similar checks with typed matchers.
4. Recreate or invalidate persisted caches during the upgrade; legacy keys are deliberately not parsed or matched.

DevTools only displays safe operation metadata for v2 keys: provider, resource, operation, status, retry count, request duration, cache age, and generic invalidation state. Tenant IDs, record IDs, parameters, URLs, payloads, cached data, and error bodies remain hidden.
