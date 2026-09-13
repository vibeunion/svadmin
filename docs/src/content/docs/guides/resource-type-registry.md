---
title: Resource Contracts
description: Schema-bound queries, writes, forms, and custom commands
---

Default `@svadmin/core` CRUD hooks require a resource contract. String resource
names, implicit routes, and replacement data generics are no longer accepted.
The same schema drives inference and validates actual provider requests and responses.

## Define Once

```typescript
import { Type } from '@sinclair/typebox';
import { defineResource, useList, useUpdate, useForm } from '@svadmin/core';

export const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
  create: Type.Object({ title: Type.String() }),
  update: Type.Object({ title: Type.Optional(Type.String()) }),
  delete: Type.Object({ reason: Type.String() }),
});

const list = useList({
  resource: posts,
  sorters: [{ field: 'title', order: 'asc' }],
  filters: [{ field: 'title', operator: 'contains', value: 'Draft' }],
});
const update = useUpdate({ resource: posts, id: 1 });
await update.mutation.mutateAsync({ variables: { title: 'Updated' } });
const form = useForm({
  resource: posts, action: 'create', defaultValues: { title: '' },
});
form.setFieldValue('title', 'Hello');
```

Define contracts at module scope, not on each render. Their identity separates
query caches. Declaration merging and separate input registration are unnecessary.

Records require a string or number `id`. Missing create/update schemas disable
those operations, including empty create batches. Without a delete schema,
only bodyless deletion is accepted.

Contracts support a closed JSON subset: objects, arrays, tuples, unions,
strings, numbers, integers, booleans, literals, null, and never. Objects are
closed recursively. Extra fields are rejected, not removed or coerced.
`Any`, `Unknown`, open dictionaries, references, transforms, and unsupported
schema kinds are rejected. Describe the full response, including nested fields.
The definition copies its schemas.

## Hook Rules

- `useList`, `useOne`, `useShow`, `useMany`, and `useTable` accept reactive option getters.
- `useInfiniteList` and `useSelect` use object options. Selection requires explicit `optionLabel` and `optionValue`.
- Field names, filter values/operators, IDs, write inputs, and response records are inferred.
- `useUpdate` and `useDelete` bind the ID when created. Mutation calls cannot change the resource, ID, or mode.
- Strict updates/deletes use pessimistic mode. Invalid optimistic values cannot become typed success data.
- Batch fallbacks validate all inputs and IDs before the first write. Partial deletion reports successful and failed IDs.
- Transport errors remain `unknown`; narrow them before reading properties.
- Forms use a fixed create/edit action and an object input schema. Defaults follow the operation schema. Edit backfill excludes record-only fields; incompatible backfill becomes a form error.
- Contract caches retain provider/tenant isolation and cannot be matched by unchecked hooks.
- Invalid write responses include `details.writeMayHaveSucceeded`. Inspect server state before retrying.

## Custom Commands

```typescript
import { defineCommand, useCustom } from '@svadmin/core';

const report = defineCommand('report', {
  url: '/reports',
  method: 'get',
  input: Type.Object({ year: Type.Number() }),
  output: Type.Object({ count: Type.Number() }),
});
const result = useCustom({ command: report, input: { year: 2026 } });
```

`useCustom` requires GET. `useCustomMutation({ command })` takes a typed input
directly in `mutation.mutateAsync(input)`. GET inputs become query parameters;
other inputs become the request payload. Inputs and responses are validated.
Individual calls cannot override the command URL or method.

## Explicit Boundaries

`@svadmin/core/unsafe` contains metadata-driven helpers and raw string/generic
CRUD hooks. It is an explicitly unchecked API, not a fallback overload.
Generic UI renderers still use it without application schemas.
`scripts/unsafe-boundaries.json` lists every remaining exception and reason.
`bun run check` rejects new unreviewed imports. Scaffold and showcase pages use strict hooks.
The showcase shares closed schemas with its seed data and storage validator.
Dynamic showcase queries retain unknown fields while validating against the selected schema;
unknown resources and invalid stored data fail explicitly.

`bun run check:types` also checks the independent core contract modules and demo
schema/storage modules with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noImplicitOverride`, `noPropertyAccessFromIndexSignature`,
`noFallthroughCasesInSwitch`, and `skipLibCheck: false`.
The broader application checks still inherit the repository configuration; this
limited strict project does not establish repository-wide compliance.

Provider construction, context access, authentication, task APIs, arbitrary
storage, and low-level utilities have separate contracts. This change does not
certify those APIs, authorize operations, or make arbitrary assertions safe.
Do not claim repository-wide 100% safety while unchecked exceptions remain.

## Acceptance

```gherkin
Scenario: No implicit contract
  Given a default CRUD hook
  When a caller supplies a string resource or replacement data generic
  Then consumer compilation fails

Scenario: Validate before batch writes
  Given a provider with single-record methods only
  When any batch input or ID violates the contract
  Then no record is written

Scenario: Reject invalid external responses
  Given a contract-bound query or command
  When a response has invalid fields or envelope
  Then it fails instead of publishing typed success data

Scenario: Keep unchecked imports reviewable
  Given a reviewed unchecked boundary inventory
  When an unlisted page imports @svadmin/core/unsafe
  Then local checks fail
```
