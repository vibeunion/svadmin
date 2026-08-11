---
title: Comparison
description: How svadmin compares to Refine, React Admin, and other admin frameworks
---

svadmin is a compile-time admin framework — no virtual DOM, no runtime diffing, just direct DOM operations. Here's how it stacks up.

## Framework Comparison

| | **svadmin** | **Refine** | **React Admin** | **AdminJS** |
|---|---|---|---|---|
| **Framework** | Svelte 5 | React 18+ | React 18+ | React |
| **Runtime** | ✅ Compiled to direct DOM ops — no VDOM | VDOM → diff → patch | VDOM → diff → patch | VDOM → diff → patch |
| **Reactivity** | ✅ Runes — variable-level signals | Hooks — component re-renders | Hooks | Hooks |
| **Bundle size** | Project-dependent; measure your selected packages | Project-dependent | Project-dependent | Project-dependent |
| **Memory** | ✅ No VDOM copy in memory | VDOM tree overhead | VDOM tree overhead | VDOM tree overhead |
| **Headless** | ✅ | ✅ | Partial | ❌ |
| **Query** | TanStack Query (Svelte) | TanStack Query (React) | ra-core | Custom |
| **Types** | ✅ Full — ResourceTypeMap | Partial | Partial | Minimal |
| **SSR** | SvelteKit native | Next.js / Remix | Next.js | Express |

## Data Provider Ecosystem

| Backend | **svadmin** | **Refine** | **React Admin** |
|---------|-----------|-----------|----------------|
| REST API | ✅ `@svadmin/simple-rest` | ✅ `@refinedev/simple-rest` | ✅ `ra-data-simple-rest` |
| Supabase | ✅ `@svadmin/supabase` | ✅ `@refinedev/supabase` | Community |
| GraphQL | ✅ `@svadmin/graphql` | ✅ `@refinedev/graphql` | ✅ `ra-data-graphql` |
| **Drizzle ORM** | ✅ `@svadmin/drizzle` | ❌ | ❌ |
| Firebase | ✅ `@svadmin/firebase` | ✅ Community | ✅ `ra-data-firebase` |
| PocketBase | ✅ `@svadmin/pocketbase` | Community | Community |
| Appwrite | ✅ `@svadmin/appwrite` | ✅ `@refinedev/appwrite` | Community |
| Strapi | ✅ `@svadmin/strapi` | ✅ `@refinedev/strapi` | ✅ `ra-strapi-rest` |
| Directus | ✅ `@svadmin/directus` | Community | Community |
| Hasura | ✅ `@svadmin/hasura` | ✅ `@refinedev/hasura` | ✅ `ra-data-hasura` |
| NestJS | ✅ `@svadmin/nestjs-query` | ✅ `@refinedev/nestjs-query` | Community |
| **Elysia (Bun)** | ✅ `@svadmin/elysia` | ❌ | ❌ |
| Airtable | ✅ `@svadmin/airtable` | Community | ✅ `ra-data-airtable` |
| Medusa | ✅ `@svadmin/medusa` | ✅ `@refinedev/medusa` | ❌ |
| Sanity | ✅ `@svadmin/sanity` | Community | Community |

## Feature Comparison

### Architecture

| Feature | **svadmin** | **Refine** | **React Admin** |
|---------|-----------|-----------|----------------|
| Provider pattern | ✅ | ✅ | ✅ |
| Multi data provider | ✅ | ✅ | ✅ |
| Auth provider | ✅ | ✅ | ✅ |
| Live provider | ✅ WebSocket + SSE | ✅ WebSocket + SSE | ❌ Polling only |
| Access control | ✅ RBAC + ABAC + CASL + Casbin | ✅ RBAC + ABAC | ✅ RBAC |
| SSO (OIDC/OAuth2) | ✅ `@svadmin/sso` plugin | ✅ Enterprise (paid) | ❌ No |
| Router agnostic | ✅ Hash / SvelteKit | ✅ React Router / Next | ✅ React Router |
| i18n | ✅ | ✅ | ✅ |
| SSR-first / low-JS fallback | ✅ `@svadmin/lite` (server-driven, optional enhancement) | ❌ Hydration Required | ❌ Hydration Required |

### Data & Mutations

| Feature | **svadmin** | **Refine** | **React Admin** |
|---------|-----------|-----------|----------------|
| Optimistic updates | ✅ | ✅ | ✅ |
| Undoable mutations | ✅ | ✅ | ✅ |
| CSV import/export | ✅ Built-in | ✅ `useImport` / `useExport` | Community |
| Auto-save | ✅ Component | ✅ `useForm` auto-save | ❌ DIY |
| Field inferencer | ✅ Sample data + OpenAPI | ✅ Sample data | ❌ |
| Filter operators | 16 operators | 16 operators | Backend-dependent |

### UI Components

| Feature | **svadmin** | **Refine** | **React Admin** |
|---------|-----------|-----------|----------------|
| AutoTable | ✅ Zero-config | ❌ DIY | ✅ `<DataGrid>` |
| AutoForm | ✅ Zero-config | ❌ DIY | ✅ `<SimpleForm>` |
| Field components | 16 types (incl ArrayField) | UI kit dependent | 20+ types |
| Dark mode | ✅ 7 themes | UI kit dependent | ✅ |
| Glassmorphism | ✅ Auth pages | ❌ | ❌ |
| Command palette | ✅ Built-in | ✅ `@refinedev/kbar` | ❌ |
| Permission Matrix | ✅ Built-in component | ❌ Official unspecified | ❌ DIY |
| Audit JSON Snapshot Viewer | ✅ Built-in component | ✅ Paid feature | ❌ DIY |
| Tenant switcher control | ✅ App wiring required | ❌ DIY | ❌ DIY |

### Developer Experience

| Feature | **svadmin** | **Refine** | **React Admin** |
|---------|-----------|-----------|----------------|
| Resource Type Registry | ✅ Compile-time | ❌ | ❌ |
| End-to-end type inference | ✅ via Elysia/Drizzle | ❌ | ❌ |
| CLI scaffolding | ✅ `@svadmin/create` | ✅ `create-refine-app` | ✅ `create-react-admin` |
| Overtime tracking | ✅ Built-in hooks | ✅ `useLoadingOvertime` | ❌ |
| Steps form | ✅ `useStepsForm` | ✅ | ❌ |

### AI & Intelligence

| Feature | **svadmin** | **Refine** | **React Admin** |
|---------|-----------|-----------|----------------|
| AI chat integration | ✅ ChatProvider (streaming + sync) | ❌ | ❌ |
| Admin context injection | ✅ ChatContext auto-injects resource/view | ❌ | ❌ |
| Tool calling + approval gates | ✅ AgentProvider + AdminTool + needsApproval | ❌ | ❌ |
| Command palette AI mode | ✅ ⌘K natural language query | ❌ | ❌ |
| Field inference | ✅ Sample data + OpenAPI dual-engine | ✅ Sample data | ❌ |
| Agent-ready scaffolding | ✅ `AGENTS.md` built-in | ❌ | ❌ |
| MCP data gateway | ✅ `@svadmin/mcp` | ❌ | ❌ |
| AI code generation | ❌ | ✅ Refine AI Agent (commercial) | ❌ |

> **Positioning**: Refine focuses on “AI writes your Admin” (dev-time AI); svadmin focuses on “AI built into your Admin” (runtime AI). Both are valid, but runtime AI delivers direct value to end users.

## When to Choose svadmin

- **You prefer compiled Svelte rendering** — Components use Svelte 5 rather than a React virtual-DOM runtime; benchmark your own routes and data volume before choosing on performance
- **You're using Svelte** — svadmin provides headless admin APIs and components designed for Svelte 5
- **You want direct DB access** — `@svadmin/drizzle` lets you skip the API layer entirely
- **You need edge deployment** — SQLite + Cloudflare D1 support via Drizzle
- **You want full type safety** — ResourceTypeMap + Elysia/Drizzle inference
- **Bundle size matters** — You can select headless providers and UI packages independently; compare production builds with the same feature set
- **You need fine-grained reactivity** — svadmin components use Svelte 5 runes for reactive state
- **You want AI built into your admin** — ChatProvider + AgentProvider with tool calling, approval gates, and streaming out of the box

## When to Choose Refine

- **You're on React** — Refine's ecosystem is mature and React-focused
- **You need UI kit flexibility** — Refine supports Ant Design, Material UI, Chakra, Mantine
- **You need the largest community** — More third-party integrations and tutorials

## When to Choose React Admin

- **You want batteries-included** — Most complete out-of-the-box UI
- **You need enterprise support** — Commercial license and support available
- **You have complex list views** — DataGrid with inline editing, advanced filtering
