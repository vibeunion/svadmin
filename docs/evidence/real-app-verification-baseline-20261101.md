# Real-app verification baseline (2026-11-01)

Operator checklist for local validation of the example app and for published-package upgrades. This note does not add a product surface, a provider capability row, or a `useRelation` option.

Run it from the maintainer checkout:

```sh
cd /Users/zhd/workspace/svadmin
git fetch origin main
git checkout 727cd5a4d3a0c5265f977bbb676e0aff6804095c
```

`727cd5a4` is `origin/main` at the time of this note: `refactor(core)!: retire unused compatibility APIs`. It sits after #636 and after release #635.

## Cited SHAs and versions

| Point | SHA / version | What it contains |
| --- | --- | --- |
| main tip | `727cd5a4` | Removes `useRelation`, `UseRelationOptions`, `appendTenantCacheKey`, and `queryKeyMatchesTenant`. No compatibility aliases. |
| #636 | `d19cb373` | FilterBuilder accepts the 28 core field operators, including `containss`. Strict `useSelect` accepts dotted `optionLabel` paths. |
| #633 | `1e45fac8` | Filter, hook, and CLI execution-semantics work. Commit subject is not a conventional `feat`/`fix`, so release-please does not emit a changelog bullet. |
| Release #635 | `b3f6bb73` | Git tags `ui-v0.108.5`, `surface-v0.20.6`, `create-svadmin-v0.50.2`. Includes the #636 UI diff. Does not bump `@svadmin/core`. |
| Published core | `core-v0.69.3` = `a5e0cf3d` | npm `@svadmin/core@0.69.3` (published 2026-11-01). Does **not** include #633, #636, or the `useRelation` removal. |

npm registry checked 2026-11-01, after those GitHub releases existed:

| Package | npm `latest` | GitHub release | npm status for the GitHub version |
| --- | --- | --- | --- |
| `@svadmin/core` | 0.69.3 | 0.69.3 | published |
| `@svadmin/ui` | 0.108.4 | 0.108.5 | 404 |
| `@svadmin/surface` | 0.20.5 | 0.20.6 | 404 |
| `@svadmin/create` | 0.50.1 | 0.50.2 | 404 |
| `@svadmin/lite` | 0.22.1 | 0.22.1 | published |
| `@svadmin/sveltekit` | 0.13.17 | 0.13.17 | published |

The workflow_dispatch publish for `b3f6bb73` failed in CI run [41267264536](https://github.com/vibeunion/svadmin/actions/runs/41267264536) at Lint (`@typescript-eslint/consistent-type-assertions` in `packages/elysia/src/data-provider.test.ts` and `packages/pocketbase/src/pocketbase.test.ts`). That failure does not stop the example from booting. Do not treat the GitHub tags `ui-v0.108.5` / `surface-v0.20.6` / `create-svadmin-v0.50.2` as packages a consumer can install.

Open release-please PR [#637](https://github.com/vibeunion/svadmin/pull/637) (`933c4b4e` on `release-please--branches--main` when this note was written) proposes `@svadmin/core@0.70.0` and matching workspace bumps (`ui` 0.108.6, `surface` 0.20.7, `create` 0.50.3). Its core changelog records only the `useRelation` removal. #633 and #636 are inside the `core-v0.69.3...core-v0.70.0` range and are absent from that changelog. Do not merge or publish #637 from this checklist.

## Apps and Bun commands

Bun `1.4.4`. Package exports point at `dist/`, so build packages before the example.

```sh
cd /Users/zhd/workspace/svadmin
bun install
NODE_OPTIONS=--max-old-space-size=4096 bun run build:packages
bun run dev
```

The example listens at `http://127.0.0.1:5173/`. The login form is prefilled with `demo@example.com` / `demo`. Routing is the hash router (`#/products`, not `/products`).

| App | Path | Command | Role |
| --- | --- | --- | --- |
| Browser example | `example/` | `bun run dev` | In-memory inventory demo. This is the real-app smoke host. |
| Lite SSR example | `packages/lite/example/` | `bun run dev:lite` for the dev server. `bun run --cwd packages/lite build && bun run check:lite:ssr` for the SSR check. | Server-rendered `/lite` subtree. Not the hash-router admin. |
| Scaffold CLI | `packages/create-svadmin/` | Published consumers: `bunx @svadmin/create@0.50.1`. Local tip: `bun run --cwd packages/create-svadmin build`, then `bun packages/create-svadmin/dist/index.js`. | `init` / `add provider`. Blueprints live in `packages/create-svadmin/blueprints/`. |
| Surface | `packages/surface/` | No standalone demo server. Fixtures are under `packages/surface/fixtures` and `packages/surface/test/fixtures`. | Declarative dashboard package, not a second example app. |

This session, on `727cd5a4` with Bun 1.4.4: `bun install` and `bun run build:packages` exited 0. Vite reported ready, and `GET /` plus `GET /src/App.svelte` both returned 200. No browser login and no Playwright run.

## Verification matrix

Stay on `useList`, `useMany`, and `useSelect`. Do not add provider capability rows and do not put `useRelation` back.

### 1. List and query

Products is `#/products` (`example/src/exampleMenuCatalog.ts`). `AutoTable` defaults `syncWithLocation` to true, so list state lives in the hash query (`filters`, `sorters`, plus legacy `sort`/`order`).

Positive path the demo provider implements: case-insensitive `contains`, `and` / `or` groups, and multi-field sort (`example/src/providers/inMemoryDb.ts`).

Paste a hash such as:

```text
#/products?sorters=%5B%7B%22field%22%3A%22name%22%2C%22order%22%3A%22asc%22%7D%2C%7B%22field%22%3A%22sku%22%2C%22order%22%3A%22desc%22%7D%5D&filters=%5B%7B%22field%22%3A%22name%22%2C%22operator%22%3A%22contains%22%2C%22value%22%3A%22a%22%7D%2C%7B%22key%22%3A%22group%22%2C%22operator%22%3A%22or%22%2C%22value%22%3A%5B%7B%22field%22%3A%22sku%22%2C%22operator%22%3A%22contains%22%2C%22value%22%3A%22A%22%7D%2C%7B%22field%22%3A%22name%22%2C%22operator%22%3A%22eq%22%2C%22value%22%3A%22Field%20Laptop%20Bundle%22%7D%5D%7D%5D
```

Pass: the address bar keeps both sorters and the keyed `or` group, and the table is a subset rather than the full seed list.

`containss` is accepted by core URL parsing and, on this tip, by FilterBuilder. The in-memory demo **rejects** it:

```text
Unsupported demo filter operator: containss
```

That throw is the expected fail-closed behavior (`example/src/demo-database.test.ts`). The list must show the error state, not an empty success. A real backend must either execute `containss` or fail closed the same way. Existing provider limits stay in `packages/core/src/provider-filter-capabilities.ts` (`pocketbase` and `scaffold-memory` do not execute `containss`; `directus` and `elysia` do). Do not extend that table in this phase.

Contract already covered by `bun test packages/core/src/url-sync.test.ts` (10 pass in this session): nested `and`/`or`, `containss`, keyed groups, and a two-field `sorters` array. Invalid operators and empty conditional keys are dropped from the URL state instead of being executed.

### 2. Edit and create

| Action | Hash | Expect |
| --- | --- | --- |
| Create | `#/products/create` | `AutoForm` saves through the demo provider and returns to the list (`redirect="list"`). |
| Edit | `#/products/edit/<id>` | One record updates. Refresh still shows the write (demo storage key `svadmin_inventory_demo_db_v5`). |
| Batch editable table | Not mounted in `example/` | Do not treat the products form as `EditableTable`. |

`EditableTable` batch integrity is the headless controller in `packages/core/src/editable-table.ts`. This session: `bun test packages/core/src/editable-table.test.ts` — 8 pass, including "validates, recovers from a failed save, and applies a batch edit" and "does not mark rows updated when a batch response misses the requested ids". On a real app that mounts `EditableTable`, repeat those two outcomes against its provider. A short or duplicate id set must not mark the rows saved.

### 3. Permission (custom route guard)

The example does not exercise this. `example/src/App.svelte` passes no `accessControlProvider`. Menu items do not set `meta.resource`. `RouteAccessGuard` renders its children when no access-control provider is present (`packages/ui/src/components/RouteAccessGuard.svelte`).

On the real app, one custom route needs both:

- `pageRoutes` entry with `access: { resource, action }` (or a menu item on the same path with `meta.resource` / `meta.action`), and
- an `accessControlProvider`.

Then:

- `can: false` shows the forbidden state and does not render the page.
- a thrown `can` shows `permissionUnavailable` (error), not a silent allow.
- `access: false` on the route stays public even when a parent menu item is guarded.
- a more specific menu item without `meta.resource` stays public and does not inherit the parent.

Resolver contract: `packages/ui/src/components/custom-route-access.test.ts` (Vitest). Not re-run in this session.

### 4. Tenant switch

`TenantSwitcher` exists (`packages/ui/src/components/TenantSwitcher.svelte`) and is documented under Enterprise. The example `AdminApp` does not receive a tenant list, so there is nothing to switch.

If the real app mounts it: switch tenant, confirm the previous list does not remain on screen, and confirm query keys go through `keys({ tenant })` / `queryKeyMatches`. Do not call `appendTenantCacheKey` or `queryKeyMatchesTenant`; those exports are gone on this tip. Do not add a tenant switcher to the example as part of this phase.

### 5. Failure recovery

| Case | How to see it on the example | Expect |
| --- | --- | --- |
| Unsupported operator | Apply `containss` on `#/products` | Error UI (`DataState` / `role="alert"`), not a blank successful table. Retry stays available. |
| Provider throw | Temporarily reject `getList` in `example/src/providers/inMemoryDb.ts`, then restore the file | Same error UI. After restore, Retry shows rows again. |
| Permission query failure | Real app only, with `accessControlProvider` | `permissionUnavailable` plus Retry on `AutoTable`. Distinct from an explicit deny. |

Demo writes already reject invalid payloads without persisting a partial database (`example/src/demo-database.test.ts`, 10 pass in this session).

## Upgrade compatibility

Consumers on npm today install `@svadmin/core@0.69.3`, `@svadmin/ui@0.108.4`, `@svadmin/surface@0.20.5`, `@svadmin/create@0.50.1`. That set does not include the #636 FilterBuilder change or the `useRelation` removal.

When #637 is published, upgrade **the set**. On current main, before that PR:

- `@svadmin/surface` peers: `@svadmin/core` `>=0.53.0 <0.70.0`, `@svadmin/ui` `>=0.73.0 <0.109.0`
- `@svadmin/lite` peers: `@svadmin/core` `>=0.34.2 <0.70.0`
- `@svadmin/sveltekit` peers: `@svadmin/core` `>=0.32.2 <0.70.0`

`@svadmin/core@0.70.0` is outside those ranges. #637 widens the three core peers to `<0.71.0` in the same release (`surface` 0.20.7, `lite` 0.22.2, `sveltekit` 0.13.18). Installing only the new core against today's surface/lite/sveltekit fails the peer range.

Breaking replacements are already documented in `docs/src/content/docs/guides/core-hooks-contract.md` (Chinese twin alongside it). There is no alias:

| Removed on `727cd5a4` (ships in core 0.70.0) | Replacement |
| --- | --- |
| `useRelation`, `UseRelationOptions` | `useList`, `useMany`, or `useSelect` bound to a `defineResource` contract |
| `useModalForm`, `useDrawerForm` | `useModal` / `useDrawer` with `useForm` or `<AutoForm>` |
| `appendTenantCacheKey`, `queryKeyMatchesTenant` | `keys({ tenant })`, `queryKeyMatches(queryKey, { tenant })` |

Positional query keys are not parsed. Recreate persisted caches on upgrade. Scaffold manifest on this tip still pins `@svadmin/core` `^0.69.3` and `@svadmin/ui` `^0.108.5` (`packages/create-svadmin/scaffold-manifest.json`). A project created from npm `@svadmin/create@0.50.1` will not pick up 0.70.0 until a published CLI release updates that manifest.

Root `CHANGELOG.md` "Unreleased" is the old monorepo log (explicit-`any` removal). Package changelogs under `packages/*/CHANGELOG.md` are the consumer surface. #633 and #636 are still missing there, including on #637.

## PARTIAL

- Browser login, filter clicks, create/edit, and the error screen were not driven in a browser. The dev server and `App.svelte` transform succeeded. No Playwright run.
- `packages/lite/example/tsconfig.json` extends `$app/tsconfig` and lists `$app/types`. Before `svelte-kit sync`, `tsc -p packages/lite/example/tsconfig.json` fails with `File '$app/tsconfig' not found` and `Cannot find type definition file for '$app/types'`. The package `check` script runs `svelte-kit sync` first. This session did not run `bun run check:lite:ssr`. Do not commit `.svelte-kit/` to paper over it.
- npm publish of ui 0.108.5 / surface 0.20.6 / create 0.50.2 is blocked by the lint failure above. Not fixed here.
- Example custom-route and tenant checks are not available without host wiring. That is a gap in the demo, not a task to add those features.
- `custom-route-access.test.ts` was not re-run (Vitest).

## Out of scope

Refine feature parity, new FilterBuilder operators, edits to `PROVIDER_FILTER_CAPABILITIES`, `useRelation` enhancements, merging #637, and any deploy.
