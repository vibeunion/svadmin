# OpenUI-style Surface architecture — phase 1

## Task contract

Source: explicit user request on 2026-09-19 to implement the OpenUI-style SVAdmin
architecture. This is the first implementation slice, not the entire migration.

Goal: one component contract drives model instructions, output schemas and runtime
validation; generated changes remain proposals rather than executable code.

Scope: existing `surface/v1`, optional catalog descriptions/examples, v2 agent
responses, bounded transport, and revision-checked edits. No new dependency,
provider, network transport, package version, release, deployment, or write
permission is introduced. Existing host APIs remain available.

Orchestration: one implementation writer; deterministic regression tests and the
repository CI are the verification gate. An independent reviewer/runtime was not
available in this execution environment. No independent-review or complete
migration claim is made. Keep the PR unmerged until CI and review are complete.

## Implemented boundaries

- `schema.ts` is the shared structural definition used by runtime validation and
  generation schemas. Resource/field/binding checks remain in `validation.ts`.
- Catalog `propsSchema`, optional `description` and validated `examples` produce a
  JSON manifest. Renderer functions and field resolvers never enter the manifest.
- `selectSurfaceCatalog()` returns a narrowed catalog, not just a shorter prompt.
  Use that same catalog for generation, validation and rendering.
- `buildSurfaceAgentMessages()` separates the system contract and user request.
  `createSurfaceAgentResponseSchema()` provides a JSON Schema for adapters. It is
  not claimed to match every model provider's restricted structured-output subset.
- `surface-agent/v2` adds a closed `cannot-fulfill` response. The legacy v1 builder
  and parser retain their signatures and proposal-only behavior.
- `createSurfaceAgentStream()` buffers bounded text and validates at `finish()`.
  It does **not** progressively render incomplete JSON or call a provider.
- `surface-edit/v1` supports title/layout changes, widget/source upsert/removal and
  complete widget reordering by stable ID. It does not support arbitrary JSON
  Pointer patches, generated functions, permissions or mutations.
- Revision edits produce detached immutable candidate snapshots. A stale revision,
  invalid operation, missing reference or denied field rejects the transaction.
  There is no persistence and no business or form state stored in the spec.

## Example host integration

```ts
import {
  applySurfaceEditProposal,
  buildSurfaceAgentMessages,
  buildSurfaceEditMessages,
  createSurfaceRevision,
  parseSurfaceAgentResponse,
  selectSurfaceCatalog,
} from '@svadmin/surface';
import { defaultSurfaceCatalog } from '@svadmin/surface/svelte';

const catalog = selectSurfaceCatalog(defaultSurfaceCatalog, ['metric', 'resource-table']);
const policy = {
  resources: {
    orders: { readFields: ['id', 'status', 'total'], filterFields: ['status'], maxPageSize: 20 },
  },
};
const messages = buildSurfaceAgentMessages('Create an orders overview', catalog, policy);
// Send messages using a trusted server-side model adapter; do not expose credentials.

function previewModelResponse(modelText: string) {
  const response = parseSurfaceAgentResponse(modelText, catalog, policy);
  if (!response.ok) return response;
  if (response.value.action === 'cannot-fulfill') return response;
  return createSurfaceRevision(response.value.spec, catalog, policy);
}

function proposeRename(current: Parameters<typeof applySurfaceEditProposal>[0], modelText: string) {
  const editMessages = buildSurfaceEditMessages('Rename the page to Order overview', current, catalog, policy);
  const candidate = applySurfaceEditProposal(current, modelText, catalog, policy);
  // Preview only. The host requires approval and commits with an atomic revision CAS.
  return { editMessages, candidate };
}
```

Rendering must revalidate against the **current** catalog and policy. Server-side
persistence must atomically compare the persisted revision; the client-side
`baseRevision` check alone is not a distributed concurrency or authorization gate.
The backend independently authorizes every data request. Display model text as
text, never raw HTML. Failed parsing never makes a partial document executable.

## Schema limits and compatibility

Exported catalog schemas must be closed object schemas (or closed object union/
intersection branches), inline, JSON-serializable TypeBox schemas. Transforms,
external or local references, executable properties, getters and unsupported
symbol metadata fail explicitly instead of silently losing validation semantics.
Existing runtime-only catalogs may keep using the old validator; unsupported
schemas must be inlined before using the new generation APIs.

Generation schemas narrow page sizes, resource names and filter/sort fields.
They cannot encode every cross-source binding relationship, field projection or
server authorization rule. Always run `parseSurfaceAgentResponse()` and the normal
runtime policy checks. Generated list sources explicitly provide `pageSize`, so a
policy limit below the host's default size does not create invalid proposals.

## Deliberately not implemented in this slice

1. Nested Surface v2 nodes, interactive resource forms, registered write actions,
   server confirmation and audit/idempotency persistence.
2. True OpenUI Lang parsing/streaming rendering or an OpenUI compatibility claim.
   Future adapters must normalize supported input into Surface and fail on any
   unsupported operation; they must not bypass the same policy checks.
3. Tailwind CSS dependency/build integration and component migration. Tailwind is the
   planned build-time recipe/token system, **not yet the default implementation**.
   A separate tested migration must pre-generate every allowed semantic variant
   and publish plain CSS; consumers and runtime AI must not need a compiler.
4. Form-state-preserving renderer integration, a complete orders CRUD pilot, visual
   evidence and browser acceptance for those future UI changes.

Do not report this phase as a complete OpenUI migration; the current implementation
uses Tailwind authoring and keeps the runtime contract compiler-free.

## Acceptance and validation

The regression suites cover shared schemas, descriptions/examples, narrowed
catalogs and policies, legacy v1 compatibility, v2 cannot-fulfill responses,
unsafe/oversized inputs, stream truncation, detached snapshots, atomic operations,
stale revisions, resource denials, ID/reference integrity and revision overflow.

```sh
bun install --frozen-lockfile
bun run --cwd packages/surface test
bun run --cwd packages/surface check
bun run lint
bun run test
bun run typecheck
bun run build:packages
bun run pack:check
```

These commands are acceptance gates, not a statement that they already passed.
The implementation environment could not resolve GitHub or install dependencies;
local checks cover TypeScript syntax and whitespace only. CI results belong to
the exact PR head commit, not to an earlier commit or the main branch.

## Architecture references

- OpenUI generation/execution separation: https://www.openui.com/docs/openui-lang/architecture
- Tailwind CSS: https://tailwindcss.com/docs
- shadcn-svelte: https://shadcn-svelte.com/
