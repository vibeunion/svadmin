# @svadmin/create

The official scaffolding CLI for `headless-admin-svelte` (svadmin).

Quickly bootstrap a completely configured, headless admin panel project built on Svelte 5, Shadcn Svelte, and TanStack Query.

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

## What's Included

The generated project is pre-configured with:
- **Svelte 5** + **Vite**
- **Tailwind CSS** + **Shadcn Svelte** UI components
- **@svadmin/core**: The headless business logic and hooks (useTable, useForm, useAuth, etc.)
- **@svadmin/ui**: Beautiful default dashboard UI, standalone CRUD buttons, and data tables.
- Pre-wired **TanStack Query** for client-state management.

## Start Developing

Once scaffolded, `cd` into your directory, install dependencies, and start the development server:

```bash
cd my-admin-app
bun install
bun run dev
```

## Eject Components / 组件弹出

Extract internal `@svadmin/ui` components into your project for deep customization:

将 `@svadmin/ui` 内部组件提取到你的项目中，实现深度定制：

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

`Layout` · `Sidebar` · `Header` · `LoginPage` · `AutoTable` · `AutoForm` · `ShowPage` · `ProfilePage` · `StatsCard` · `AuditLogDrawer` · `LiveIndicator` · `CommandPalette` · `AICommandBar` · `ChatDialog` · `PasswordInput` · `BooleanField` · `FieldRenderer` · `MarkdownRenderer` · `AnomalyBadge` · `Toast` · `ConfirmDialog` · `TooltipButton` · `Breadcrumbs` · `ConfigErrorScreen` · `DevTools`

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

Both commands accept an optional project-directory argument. Upgrade only manages dependencies known by the shipped scaffold; custom dependencies, scripts, and other package fields are preserved.

## Development

```bash
# Sync template from /example
bun src/sync-template.ts

# Build CLI (for npm publishing)
bun run build
```
Generated projects include root-level `DESIGN.md` and `AGENTS.md` files. They
define the Stripe-first visual language, page information budget, feedback
ownership, and AI generation acceptance rules.

Existing projects can preview and install any missing guidance files without
overwriting local standards:

```bash
bunx @svadmin/create guidance .
bunx @svadmin/create guidance . --write
```
