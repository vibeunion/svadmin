# @svadmin/create

The official scaffolding CLI for `headless-admin-svelte` (svadmin).

Quickly bootstrap a completely configured, headless admin panel project built on Svelte 5, the native-CSS `@svadmin/ui` components, and TanStack Query.

## Quick Start

```bash
npx @svadmin/create@latest my-admin-app
# or
bunx @svadmin/create@latest my-admin-app
```

Follow the interactive prompts to:
1. Name your project.
2. Choose a default Data Provider (Simple REST, Supabase, GraphQL, or Custom).
3. Choose an Auth Provider (Mock, JWT, Supabase, or None).

### Golden-path presets

Skip the prompts with a curated preset:

```bash
npx @svadmin/create init my-admin-app --preset supabase
npx @svadmin/create init my-admin-app --preset rest
npx @svadmin/create init my-admin-app --preset graphql
```

| Preset | Data provider | Auth provider |
| --- | --- | --- |
| `supabase` | Supabase | Supabase Auth |
| `rest` | Simple REST | REST JWT |
| `graphql` | GraphQL | Mock (demo) |

Override any field explicitly: `--data-provider graphql --auth-provider none`, and
skip install with `--no-install`. Explicit flags always win over the preset.

## What's Included

The generated project is pre-configured with:
- **Svelte 5** + **Vite**
- **@svadmin/ui** native CSS, semantic tokens and Bits UI interactions; no host CSS compiler is required
- **@svadmin/core**: The headless business logic and hooks (useTable, useForm, useAuth, etc.)
- **@svadmin/ai-elements**: Composable Svelte 5 AI conversation, tool, reasoning, and source components.
- **@svadmin/ui**: Beautiful default dashboard UI, standalone CRUD buttons, and data tables.
- Pre-wired **TanStack Query** for client-state management.

### Platform entrypoints

Two stable files are generated for humans and AI tooling:

- `src/svadmin.config.ts` — the application entrypoint. It composes the selected
  data/auth providers into one `defineAdminConfig(...)` bundle and exports the
  resource registry. Async providers are resolved with top-level await, so the
  exported config is always a fully-resolved static bundle.
- `svadmin.ai.json` — the machine-readable manifest: provider capability matrix,
  resource fields and operations, project commands, and forbidden internal imports.

`src/App.svelte` consumes the config through `resolveAdminConfig(config)` and passes
`providerBundle` + `resources` to `AdminApp`.

- `svadmin.schema.json` — JSON Schema (draft 2020-12) describing `svadmin.ai.json`.
  Editors and AI tools can validate the manifest against it.

`create-svadmin doctor` validates the manifest when it exists: it must be valid
JSON with `version: 1`, its provider packages must be present in `package.json`,
and `svadmin.schema.json` must sit beside it. Legacy projects without
`src/svadmin.config.ts` are unaffected.

## Add Platform Pieces / 追加平台能力

Add a business feature module or a provider dependency pack without rewriting the
project. Every command is idempotent, dry-run by default, and preserves existing
files; pass `--write` to apply.

```bash
# Scaffold src/features/orders/{index.ts,orders.resource.ts}
npx @svadmin/create add resource orders --write

# Add the Supabase data provider dependency pack
npx @svadmin/create add provider supabase --write

# Add the JWT auth dependency pack
npx @svadmin/create add auth jwt --write

# Target a project directory other than the current one
npx @svadmin/create add resource orders --project-dir ./my-admin-app --write
```

`add provider` / `add auth` update `package.json` and `svadmin.ai.json` and print
the remaining step: wire the provider in `src/svadmin.config.ts`. `add resource`
creates the module and prints the `src/resources.ts` registration snippet.

## Start Developing

Once scaffolded, `cd` into your directory, install dependencies, and start the development server:

```bash
cd my-admin-app
bun install
bun run dev
```

## Automated Inference CLI / 接口代码推断器

Automatically infer ResourceDefinitions, TypeBox schemas, and Svelte 5 CRUD components from REST endpoints, OpenAPI / Swagger specs, GraphQL endpoints (introspection), or local schema/sample files:

根据 REST 接口、OpenAPI 规范、GraphQL 端点或本地样本数据自动推导资源定义、TypeBox Schema 及 Svelte 5 完整 CRUD 页面：

```bash
# Infer from OpenAPI JSON spec URL
npx @svadmin/create infer --url https://api.example.com/openapi.json --out-dir src/resources --write

# Infer from GraphQL endpoint (automatic introspection)
npx @svadmin/create infer --url https://api.example.com/graphql --out-dir src/resources --write

# Infer from REST sample data endpoint
npx @svadmin/create infer --url https://api.example.com/api/v1/posts --resource posts --out-dir src/resources --write

# Infer from local GraphQL SDL or OpenAPI file
npx @svadmin/create infer --file schema.graphql --out-dir src/resources --write
```

Generated artifacts include:
- `<resource>.resource.ts`: ResourceDefinition with field types, relations, and CRUD capabilities
- `<resource>.schema.ts`: Sinclair TypeBox schema and static TypeScript types
- `<resource>/ListPage.svelte`, `<resource>/CreatePage.svelte`, `<resource>/EditPage.svelte`, `<resource>/ShowPage.svelte`: Svelte 5 page components
- `index.ts`: Barrel export file

## Eject Components / 组件弹出

Extract internal `@svadmin/ui` components into your project for deep customization. AI components are published separately in `@svadmin/ai-elements`:

将 `@svadmin/ui` 内部组件提取到你的项目中，实现深度定制；AI 组件单独发布在 `@svadmin/ai-elements`：

```bash
# Eject all components / 弹出全部组件
npx @svadmin/create eject

# Eject specific components / 弹出指定组件
npx @svadmin/create eject Layout Header Sidebar
```

Ejected files are placed in `src/components/svadmin/`. Then pass them via the `components` prop:

弹出的文件会放到 `src/components/svadmin/` 目录，然后通过 `components` prop 传入：

```svelte
<script lang="ts">
  import CustomLayout from './components/svadmin/Layout.svelte';
</script>

<AdminApp components={{ Layout: CustomLayout }} {dataProvider} {resources} />
```

### Available Components / 可弹出的组件

`Layout` · `Sidebar` · `Header` · `LoginPage` · `AutoTable` · `AutoForm` · `ShowPage` · `ProfilePage` · `StatsCard` · `AuditLogDrawer` · `LiveIndicator` · `CommandPalette` · `PasswordInput` · `BooleanField` · `FieldRenderer` · `AnomalyBadge` · `Toast` · `ConfirmDialog` · `TooltipButton` · `Breadcrumbs` · `ConfigErrorScreen` · `DevTools`

AI 组件请直接从 `@svadmin/ai-elements` 导入，例如 `ChatDialog`、`Conversation`、`Message`、`Response`、`PromptInput`、`Reasoning`、`Tool`、`Sources` 和 `InlineCitation`。

## Project Maintenance

Check the current project against the dependency versions shipped with the CLI. This command is read-only and does not access the network:

```bash
npx @svadmin/create doctor
```

Preview an upgrade plan without changing `package.json`:

```bash
npx @svadmin/create upgrade
```

Apply the plan explicitly. The CLI creates a timestamped `package.json.svadmin-backup-*` file before replacing `package.json`:

```bash
npx @svadmin/create upgrade --write
```

`migrate` is an alias for `upgrade` and runs the same dependency-migration plan:

```bash
npx @svadmin/create migrate --write
```

Both commands accept an optional project-directory argument. Upgrade only manages dependencies known by the shipped scaffold; custom dependencies, scripts, and other package fields are preserved.

## Development

```bash
# Sync template from /example
bun src/sync-template.ts

# Build CLI (for npm publishing)
bun run build
```
Generated projects include root-level `DESIGN.md` and `AGENTS.md` files. They
define svadmin's Admin UI design principles, page information budget, feedback
ownership, and AI generation acceptance rules.

Existing projects can preview and install any missing guidance files without
overwriting local standards:

```bash
bunx @svadmin/create guidance .
bunx @svadmin/create guidance . --write
```

## Add Lite routes to an existing SPA

Lite is an optional SvelteKit server-rendered route tree. It does not modify the
existing SPA or add IE11 branches to the SPA bundle. In a project that already
has a SvelteKit `src/routes` directory, run:

```bash
# Preview the files first; nothing is written
bunx @svadmin/create lite init .

# Generate the shared adapter and dynamic CRUD routes
bunx @svadmin/create lite init . --write
```

The generator creates one `[resource]` route for all resources plus the shared
`src/lib/svadmin-lite.ts` adapter. Your existing `$lib/admin` module only needs
to export `resources` and `dataProvider`; resources are resolved dynamically at
request time. Existing files are preserved, so rerunning the command is safe.
