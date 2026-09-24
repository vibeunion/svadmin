# Customer Application Boundaries

This starter is a modular application, not a microservice platform. Keep the
existing backend and adapt it through providers. The in-memory demo does not
provide server authorization, durable storage, tenants, or a trusted audit log.

## Ownership

| Layer | Owner | Public entry |
| --- | --- | --- |
| Composition | Brand, navigation, page registration | `src/App.svelte` |
| Services | Providers and application configuration | `src/svadmin.config.ts` |
| Resources | Registered resource definitions | `src/resources.ts` |
| Business feature | Contracts, queries, actions, pages | `src/features/<name>/index.ts` |
| Headless feature data | Contracts/types without Svelte imports | `src/features/<name>/data.ts` |
| Presentation | Shared tokens and design presets | `DESIGN.md`, `src/design.svelte.ts` |

Use `create-svadmin add resource <name>` to preview a new feature, then explicitly
apply it with `--write` and register its public definition. Keep feature-specific
state inside the feature; communicate through public contracts. Do not reach
into another feature's component, store, or contract implementation.

`index.ts` exports UI composition. Use optional `data.ts` when CLI, server, or
resource registration needs contracts without loading Svelte components.
Customer customization belongs in application composition, providers and
feature sources, not private `@svadmin/*/src` or `dist` imports.

## Generation

Search the shipped catalog with `create-svadmin vibe catalog --query "approval"`.
Read a selected reference using `create-svadmin vibe inspect approval`.
The JSON includes source, contracts, composition, design guidance and acceptance
requirements. It is reference context, not a standalone page installer.
For existing applications inspect the customer's current code first; never
replace their schema, provider, permissions or workflows with demo equivalents.

Generation is separate from execution. A generated mutation must use an explicit
resource/command contract. Browser permission visibility does not authorize it.
Keep record-level permissions, tenant isolation, approval transitions, audit,
idempotency and persistence on the server. Review changes before applying them;
never automatically retry a write whose outcome is unknown.

## Verification

`bun run check` first runs `check:architecture`, then the existing type check.
The architecture check parses TypeScript and both Svelte script blocks. It
checks imports, re-exports, import types, import-equals and literal dynamic imports
(including Svelte template expressions); rejects parse errors,
computed module imports and private package paths; resolves TypeScript aliases
and resolves existing Svelte aliases, failing unresolved aliases closed. It allows cross-feature imports only via
`index.ts` or `data.ts` (including a feature directory import).

This is an import-boundary check, not a security sandbox, dependency-cycle
detector or proof of backend authorization. Keep public entrypoints small.
Follow it with `bun run build`, `bun run test:ui`, screenshot inspection and
human review of real business rules before claiming customer acceptance.
