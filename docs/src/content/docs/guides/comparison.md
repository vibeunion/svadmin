---
title: Comparison
description: How svadmin compares to Refine, React Admin, AdminJS, and backend-plus-admin platforms
---

svadmin is a headless admin framework for Svelte 5. Refine is the closest
architectural peer: both keep data, auth, access control, routing, and UI
separate. React Admin and AdminJS are React admin frameworks with a more
opinionated UI layer. Directus, Payload, and Filament bundle the backend and the
admin UI together, so they solve a different problem.

Version context: this page describes Refine 5, React Admin 5, AdminJS 7, and the
Svelte 5 line of svadmin. Package versions move quickly; verify details in each
project's documentation before making a decision.

## Framework comparison

| | **svadmin** | **Refine** | **React Admin** | **AdminJS** |
|---|---|---|---|---|
| **Framework** | Svelte 5 | React 18+ | React 18+ | React |
| **Rendering model** | Compiled Svelte components; runes update the DOM directly | React virtual DOM | React virtual DOM | React virtual DOM |
| **Headless** | ✅ Core providers and hooks are UI-independent | ✅ | Partial | ❌ |
| **Query layer** | TanStack Query for Svelte | TanStack Query for React | `ra-core` | Custom |
| **Type model** | Strict generics + `ResourceTypeMap` | Strict generics | TypeScript support | Minimal |
| **SSR** | SvelteKit, plus `@svadmin/lite` for server-driven/low-JS pages | Next.js / Remix SSR with hydration | Next.js SSR with hydration | Express |
| **First-party UI** | shadcn-svelte components (`@svadmin/ui`) | Integrations for Ant Design, MUI, and Mantine; UI remains your choice | Material UI | AdminJS UI |
| **Bring your own UI kit** | ✅ Core hooks are headless | ✅ | Partial | ❌ |
| **Current major line** | Pre-1.0 packages | 5.x | 5.x | 7.x |

## Data provider ecosystem

| Backend | **svadmin** | **Refine** | **React Admin** |
|---------|-----------|-----------|----------------|
| REST API | ✅ `@svadmin/simple-rest`, `@svadmin/rest` | ✅ `@refinedev/simple-rest`, `@refinedev/rest` | ✅ `ra-data-simple-rest` |
| Supabase | ✅ `@svadmin/supabase` | ✅ `@refinedev/supabase` | Community |
| GraphQL | ✅ `@svadmin/graphql` | ✅ `@refinedev/graphql` | ✅ `ra-data-graphql` |
| Drizzle ORM | ✅ `@svadmin/drizzle` | Community | Community |
| Firebase | ✅ `@svadmin/firebase` | Community | ✅ `ra-data-firebase` |
| PocketBase | ✅ `@svadmin/pocketbase` | Community | Community |
| Appwrite | ✅ `@svadmin/appwrite` | ✅ `@refinedev/appwrite` | Community |
| Strapi | ✅ `@svadmin/strapi`, `@svadmin/strapi-graphql` | ✅ `@refinedev/strapi-v4`, `@refinedev/strapi-graphql` | ✅ `ra-strapi-rest` |
| Directus | ✅ `@svadmin/directus` | Community | Community |
| Hasura | ✅ `@svadmin/hasura` | ✅ `@refinedev/hasura` | ✅ `ra-data-hasura` |
| NestJS | ✅ `@svadmin/nestjs-query`, `@svadmin/nestjsx-crud` | ✅ `@refinedev/nestjs-query`, `@refinedev/nestjsx-crud` | Community |
| Elysia (Bun) | ✅ `@svadmin/elysia` | Community | Community |
| Airtable | ✅ `@svadmin/airtable` | Community | ✅ `ra-data-airtable` |
| Medusa | ✅ `@svadmin/medusa` | ✅ `@refinedev/medusa` | Community |
| Sanity | ✅ `@svadmin/sanity` | Community | Community |
| Full-text search | ✅ `@svadmin/elasticsearch`, `@svadmin/meilisearch`, `@svadmin/typesense` | Community | Community |
| Analytical / vector data | ✅ `@svadmin/clickhouse`, `@svadmin/qdrant` | Community | Community |
| Cloud storage | ✅ `@svadmin/storage`, `@svadmin/s3` | Community | Community |
| Realtime events | ✅ `@svadmin/pusher`, `@svadmin/ably`, `@svadmin/sse` | ✅ Live provider ecosystem | ❌ Polling only |
| External authentication | ✅ `@svadmin/clerk`, `@svadmin/auth0`, `@svadmin/kinde`, `@svadmin/keycloak` | ✅ Auth provider ecosystem | Community |

svadmin currently ships 24 first-party data providers, plus the
[`@svadmin/rest`](/providers/data-provider#generic-rest-bridge) bridge and the
read-only [`@svadmin/s3`](/providers/data-provider#s3-compatible-object-listing)
object listing. The [`@svadmin/refine-adapter`](/providers/refine-adapter) can
bridge any remaining Refine data provider.

## Feature comparison

### Architecture

| Feature | **svadmin** | **Refine** | **React Admin** |
|---------|-----------|-----------|----------------|
| Provider pattern | ✅ | ✅ | ✅ |
| Reuse Refine providers | ✅ Data / Auth / AccessControl / Notification / Live adapters | — | — |
| Multiple data providers | ✅ | ✅ | ✅ |
| Auth provider | ✅ | ✅ | ✅ |
| Live provider | ✅ WebSocket / SSE / Supabase / Ably / Firebase / GraphQL subscriptions | ✅ WebSocket / SSE / Supabase / Ably / Firebase / GraphQL subscriptions | ❌ Polling only |
| Access control | ✅ RBAC + ABAC + CASL + Casbin + Cerbos + Permit.io | ✅ RBAC + ABAC + Casbin / Cerbos / Permit.io | ✅ RBAC |
| SSO (OIDC/OAuth2) | ✅ `@svadmin/sso` plugin | ✅ Auth0 / Keycloak and other provider integrations | ❌ No first-party SSO |
| Router agnostic | ✅ Hash / SvelteKit | ✅ React Router / Next | ✅ React Router |
| i18n | ✅ | ✅ | ✅ |
| SSR | ✅ SvelteKit SSR; `@svadmin/lite` adds server-driven, optional-enhancement pages | ✅ Next.js / Remix SSR with hydration | ✅ Next.js SSR with hydration |

### Data and mutations

| Feature | **svadmin** | **Refine** | **React Admin** |
|---------|-----------|-----------|----------------|
| Optimistic updates | ✅ | ✅ | ✅ |
| Undoable mutations | ✅ | ✅ | ✅ |
| CSV import/export | ✅ Built-in | ✅ `useImport` / `useExport` | Community |
| Auto-save | ✅ `useForm` / `AutoForm` + `AutoSaveIndicator` | ✅ `useForm` autoSave + AutoSaveIndicator | ❌ DIY |
| Field inferencer | ✅ Sample data + OpenAPI | ✅ Sample data | ❌ |
| Filter operators | 28 field operators + keyed `and` / `or` | 28 field operators + keyed `and` / `or` | Backend-dependent |

### UI components

| Feature | **svadmin** | **Refine** | **React Admin** |
|---------|-----------|-----------|----------------|
| AutoTable | ✅ Zero-config | ❌ Requires composing a UI kit | ✅ `<DataGrid>` |
| AutoForm | ✅ Zero-config | ❌ Requires composing a UI kit | ✅ `<SimpleForm>` |
| Field components | 27 exported field components, plus nested `ArrayField` | UI-kit dependent | 20+ types |
| Dark mode | ✅ Light / Dark / System | UI-kit dependent | ✅ |
| Color presets | ✅ 9 built-in presets | UI-kit dependent | ✅ |
| Auth page shell | ✅ `AuthPageShell` | UI-kit dependent | ✅ |
| Command palette | ✅ Built-in | ✅ `@refinedev/kbar` | ❌ |
| Permission matrix | ✅ Built-in component | No official component | DIY |
| Audit JSON snapshot viewer | ✅ Built-in component | ✅ Core `auditLogProvider` | DIY |
| Tenant switcher | ✅ `TenantSwitcher` component; host wires tenant state | DIY | DIY |
| UI kit flexibility | 🔶 shadcn-svelte first-party; headless users can bring their own | ✅ Ant Design / MUI / Mantine integrations | 🔶 Material UI |

### Developer experience

| Feature | **svadmin** | **Refine** | **React Admin** |
|---------|-----------|-----------|----------------|
| Resource Type Registry | ✅ Compile-time | ❌ | ❌ |
| End-to-end type inference | ✅ via Elysia / Drizzle | ❌ | ❌ |
| CLI scaffolding | ✅ `@svadmin/create` with add / infer / swizzle / doctor / upgrade / migrate | ✅ `create-refine-app` + Refine CLI | ✅ `create-react-admin` |
| Overtime tracking | ✅ `useLoadingOvertime` | ✅ `useLoadingOvertime` | ❌ |
| Steps form | ✅ `useStepsForm` | ✅ | ❌ |
| Component customization | ✅ `svadmin swizzle` | Community | ❌ |
| Code and schema inference | ✅ `svadmin infer` | Community | ❌ |
| DevTools | ✅ Headless diagnostics + `DevTools` component | ✅ Refine DevTools | ❌ |

### AI and intelligence

| Feature | **svadmin** | **Refine** | **React Admin** |
|---------|-----------|-----------|----------------|
| AI chat integration | ✅ ChatProvider (streaming + sync) | Not a core package | ❌ |
| Admin context injection | ✅ ChatContext injects the current resource/view | DIY | DIY |
| Tool calling + approval gates | ✅ AgentProvider + AdminTool + `needsApproval` | DIY | DIY |
| Command palette AI mode | ✅ ⌘K natural-language mode | ❌ | ❌ |
| Field inference | ✅ Sample data + OpenAPI | ✅ Sample data | ❌ |
| Agent-ready scaffolding | ✅ `AGENTS.md` generated by the CLI | Not built into core | ❌ |
| MCP data gateway | ✅ `@svadmin/mcp` | Not built into core | ❌ |
| Vendor AI code generation | Not a first-party product | Check the vendor's current AI offering | ❌ |

> **Positioning**: Refine is the stronger choice for React teams that want
> multiple UI-kit integrations and the largest third-party ecosystem. svadmin is
> for Svelte 5 teams that want headless admin primitives, first-party
> AutoTable/AutoForm, a server-driven low-JS option, and runtime AI. AI product
> offerings change quickly, so verify current capabilities before committing.

## Backend-plus-admin platforms

Directus, Payload, and Filament are not drop-in replacements for a headless
admin framework. They include the backend, schema, API, and admin UI. Choose one
when you want the whole stack; choose svadmin when the backend already exists or
must remain independent.

| | **svadmin** | **Directus** | **Payload** | **Filament** |
|---|---|---|---|---|
| **Category** | Headless admin framework | Data platform + admin app | Backend / CMS + admin app | PHP admin panel |
| **Backend included** | ❌ Bring your own | ✅ | ✅ | ✅ Laravel |
| **Frontend stack** | Svelte 5 | Vue-based admin | React / Next.js | PHP / Livewire |
| **Use existing API** | ✅ DataProvider adapters | Limited | Limited | Eloquent-first |
| **Best fit** | Custom admin on an existing backend | Content/data platform teams | Next.js product teams | Laravel teams |

## When to choose svadmin

- **You are building on Svelte 5** — svadmin provides headless admin APIs and
  first-party shadcn-svelte components designed for runes.
- **You want first-party table and form ergonomics** — `AutoTable`, `AutoForm`,
  CRUD pages, settings pages, and auth pages are included.
- **You need to connect an existing backend** — 24 first-party data providers
  plus the Refine adapter cover REST, GraphQL, databases, search, and storage.
- **You want direct database access** — `@svadmin/drizzle` skips the API layer
  for SQLite, PostgreSQL, MySQL, and Cloudflare D1.
- **You need a server-driven or low-JS option** — `@svadmin/lite` renders
  server-first pages with optional progressive enhancement.
- **You want strong type safety** — `ResourceTypeMap` plus Elysia/Drizzle
  inference.
- **You want runtime AI inside the admin** — ChatProvider, AgentProvider, tool
  approval gates, and the MCP gateway ship as packages.

## When to choose Refine

- **You are on React** — Refine's ecosystem is mature and React-focused.
- **You need multiple official UI-kit integrations** — Ant Design, MUI, and
  Mantine are supported.
- **You need the largest community** — More third-party integrations, tutorials,
  and templates.

## When to choose React Admin

- **You want a batteries-included Material UI admin** — The most complete
  out-of-the-box UI in this comparison.
- **You need commercial support** — React Admin has commercial backing and
  support options.
- **You need complex list views** — DataGrid inline editing and advanced
  filtering.

## When not to choose svadmin

- **Your team is React-only and wants official UI-kit integrations** — Refine or
  React Admin will fit faster.
- **You need a bundled backend and admin UI today** — Directus, Payload, or
  Filament cover that scope.
- **You require a stable 1.0 API and long-term support contract today** — svadmin
  packages are still pre-1.0; evaluate the upgrade policy for your risk profile.
- **You need a large plugin marketplace** — Refine's ecosystem is larger.

Performance depends on the route, data volume, and selected packages. Measure a
production build with the same feature set instead of relying on framework-level
claims.