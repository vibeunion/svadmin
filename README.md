# svadmin

> Headless admin framework for Svelte 5 — bring your own backend
>
> 面向 Svelte 5 的 Headless 管理后台框架 — 自带后端适配

[![npm](https://img.shields.io/npm/v/@svadmin/core?color=ff3e00&label=npm)](https://www.npmjs.com/package/@svadmin/core)
[![license](https://img.shields.io/github/license/zuohuadong/svadmin)](LICENSE)

[English](#-features) | [中文](#-特性) | [📖 Documentation / 文档](https://svadmin.nestjs.cn)

---

## ✨ Features

- 🎯 **Headless Architecture** — DataProvider / AuthProvider / RouterProvider / LiveProvider, swap backends freely
- ⚡ **30+ Reactive Hooks** — `useList`, `useOne`, `useCreate`, `useUpdate`, `useDelete`, `useTable`, `useForm`, `useSelect`, `useInfiniteList`, `useShow`, `useStepsForm`, `useModalForm`, `useDrawerForm`, etc.
- 🔑 **Auth Hooks** — `useLogin`, `useLogout`, `useRegister`, `useForgotPassword`, `useUpdatePassword`, `useGetIdentity`, `useIsAuthenticated`, `useOnError`, `usePermissions`
- 🧩 **Pre-built UI** — AdminApp, AutoTable, AutoForm, ShowPage, Sidebar, Layout, SettingsPage, SecuritySettings, IntegrationsSettings, NotificationsSettings, ApiSettings, ErrorPage, StepsForm, CommandPalette, Sheet, Drawer, Collapsible, Tooltip (shadcn-svelte)
- 🔠 **16 Field Components** — TextField, UrlField, EmailField, BooleanField, TagField, FileField, ImageField, MarkdownField, RichTextField, SelectField, MultiSelectField, RelationField, JsonField, ComboboxField, PasswordInput
- 🔘 **CRUD Buttons** — CreateButton, EditButton, DeleteButton, ShowButton, ListButton, RefreshButton, ExportButton, ImportButton, SaveButton, CloneButton
- 🛡️ **`<Authenticated>`** — Conditionally render based on auth state with loading/fallback
- ⚙️ **ConfigErrorScreen** — Glassmorphism screen for missing env vars with copy-to-clipboard
- 🌍 **i18n** — Built-in zh-CN/en with browser auto-detection, one-click locale toggle
- 🔐 **Auth & RBAC** — AuthProvider + permission system with resource-level access control
- 🌓 **Dark Mode** — Light / Dark / System with one-click toggle, persisted to localStorage
- 🎨 **Multi-Color Themes** — 6 color palettes (Blue, Green, Rose, Orange, Violet, Zinc) with sidebar picker
- 🪟 **Glassmorphism UI** — Translucent sidebar with backdrop blur for a premium look
- 📡 **Real-time** — LiveProvider interface with WebSocket & SSE built-in providers
- 🔀 **RouterProvider** — Pluggable routing with hash and history router providers
- 📋 **Audit Logging** — Pluggable audit handler for tracking admin operations
- 🔍 **Inferencer** — Auto-generate admin UI from sample data or OpenAPI 3.x specs
- 🏷️ **Resource Type Registry** — Compile-time resource name checking via `KnownResources` + auto type inference via `InferData<R>`
- 🧰 **Helpers** — `unionFilters`, `unionSorters`, `file2Base64`, `getDefaultFilter`, `getDefaultSortOrder`, `generateDefaultDocumentTitle`
- 📤 **Data Transfer** — `useExport` / `useImport` for CSV export/import with batch support
- 🔄 **Optimistic Updates** — Built-in pessimistic / optimistic / undoable mutation modes

## ✨ 特性

- 🎯 **Headless 架构** — DataProvider / AuthProvider / RouterProvider / LiveProvider，自由切换后端
- ⚡ **30+ 响应式 Hook** — `useList`、`useOne`、`useCreate`、`useUpdate`、`useDelete`、`useTable`、`useForm`、`useSelect`、`useInfiniteList`、`useShow`、`useStepsForm`、`useModalForm`、`useDrawerForm` 等
- 🔑 **Auth Hooks** — `useLogin`、`useLogout`、`useRegister`、`useForgotPassword`、`useUpdatePassword`、`useGetIdentity`、`useIsAuthenticated`、`useOnError`、`usePermissions`
- 🧩 **开箱即用 UI** — AdminApp、AutoTable、AutoForm、ShowPage、Sidebar、Layout、SettingsPage、SecuritySettings、IntegrationsSettings、NotificationsSettings、ApiSettings、ErrorPage、StepsForm、CommandPalette、Sheet、Drawer、Collapsible、Tooltip（基于 shadcn-svelte）
- 🔠 **16 种字段组件** — TextField、UrlField、EmailField、BooleanField、TagField、FileField、ImageField、MarkdownField、RichTextField、SelectField、MultiSelectField、RelationField、JsonField、ComboboxField、PasswordInput
- 🔘 **CRUD 按钮** — CreateButton、EditButton、DeleteButton、ShowButton、ListButton、RefreshButton、ExportButton、ImportButton、SaveButton、CloneButton
- 🛡️ **`<Authenticated>`** — 根据认证状态条件渲染，支持 loading/fallback
- ⚙️ **ConfigErrorScreen** — 环境变量缺失提示页，毛玻璃风格，支持一键复制
- 🌍 **国际化** — 内置中英文，浏览器自动检测，侧边栏一键切换语言
- 🔐 **认证与权限** — AuthProvider + 资源级权限控制
- 🌓 **暗色模式** — 亮色 / 暗色 / 跟随系统，一键切换，持久化到 localStorage
- 🎨 **多色主题** — 6 种配色方案（Blue、Green、Rose、Orange、Violet、Zinc），侧边栏选色器切换
- 🪟 **毛玻璃 UI** — 半透明侧边栏 + 背景模糊，质感拉满
- 📡 **实时订阅** — LiveProvider 接口，内置 WebSocket 及 SSE 实现，自动重连
- 🔀 **RouterProvider** — 可插拔路由，内置 Hash 和 History 路由
- 📋 **审计日志** — 可插拔的审计处理器
- 🔍 **推断器（Inferencer）** — 从样本数据或 OpenAPI 3.x 自动生成管理 UI
- 🏷️ **资源类型注册表** — 编译时资源名检查（`KnownResources`）+ 自动类型推断（`InferData<R>`）
- 🧰 **工具函数** — `unionFilters`、`unionSorters`、`file2Base64`、`getDefaultFilter`、`getDefaultSortOrder`、`generateDefaultDocumentTitle`
- 📤 **数据导入导出** — `useExport` / `useImport`，支持 CSV 批量导入导出
- 🔄 **乐观更新** — 内置悲观 / 乐观 / 可撤销三种变更模式

## 📦 Packages / 包

### Core / 核心

| Package                  | Description / 描述                                           |
| ------------------------ | ------------------------------------------------------------ |
| `@svadmin/core`          | Hooks, providers, types, utilities, Resource Type Registry   |
| `@svadmin/ui`            | Pre-built admin components / 预构建管理组件（shadcn-svelte） |
| `@svadmin/create`        | CLI scaffolding tool / CLI 脚手架工具                        |
| `@svadmin/refine-adapter`| Bridge any @refinedev/* data provider to svadmin / 桥接 Refine 生态数据源 |
| `@svadmin/sveltekit`     | SvelteKit router integration / SvelteKit 路由集成            |
| `@svadmin/lite`          | SSR-first variant with optional progressive enhancement / SSR 优先，可选渐进增强 |
| `@svadmin/sso`           | OIDC/OAuth2 SSO plugin / 单点登录插件                        |
| `@svadmin/editor`        | Rich-text editor component / 富文本编辑器组件                |
| `@svadmin/mcp`           | MCP (Model Context Protocol) integration / AI 工具集成       |
| `@svadmin/surface`       | Validated declarative dashboards / 严格校验的声明式仪表盘    |
| `@svadmin/surface-agent` | Human-approved Surface proposals / 人工审批的 Surface 提案 |

### Data Providers / 数据适配器

| Package                 | Backend                                      |
| ----------------------- | -------------------------------------------- |
| `@svadmin/simple-rest`  | REST API (zero deps, JWT/Cookie auth)        |
| `@svadmin/supabase`     | Supabase (data + auth + live)                |
| `@svadmin/drizzle`      | Drizzle ORM (SQLite, PostgreSQL, MySQL, D1)  |
| `@svadmin/pocketbase`   | PocketBase (data + auth + live)              |
| `@svadmin/appwrite`     | Appwrite (data + auth + live)                |
| `@svadmin/graphql`      | GraphQL                                      |
| `@svadmin/elysia`       | Elysia (auto type inference via Eden Treaty) |
| `@svadmin/strapi`       | Strapi CMS                                   |
| `@svadmin/directus`     | Directus                                     |
| `@svadmin/firebase`     | Firebase / Firestore                         |
| `@svadmin/hasura`       | Hasura GraphQL                               |
| `@svadmin/sanity`       | Sanity.io                                    |
| `@svadmin/airtable`     | Airtable                                     |
| `@svadmin/medusa`       | Medusa Commerce                              |
| `@svadmin/nestjs-query` | NestJS GraphQL                               |
| `@svadmin/nestjsx-crud` | NestJS CRUD                                  |

## 🚀 Quick Start / 快速开始

```bash
# Install
bun add @svadmin/core @svadmin/ui @svadmin/simple-rest
```

### One-Line Setup / 一行配置

```svelte
<script lang="ts">
  import { AdminApp } from '@svadmin/ui';
  import { createSimpleRestDataProvider } from '@svadmin/simple-rest';
  import { resources } from './resources';

  const dataProvider = createSimpleRestDataProvider({
    apiUrl: 'https://jsonplaceholder.typicode.com',
  });
</script>

<AdminApp {dataProvider} {resources} title="My Admin" defaultTheme="system" />
```

### Define Resources / 定义资源

```typescript
import type { ResourceDefinition } from "@svadmin/core";

export const resources: ResourceDefinition[] = [
  {
    name: "products",
    label: "Products",
    fields: [
      { key: "id", label: "ID", type: "number", showInForm: false },
      {
        key: "name",
        label: "Name",
        type: "text",
        required: true,
        searchable: true,
      },
      { key: "price", label: "Price", type: "number", required: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Active", value: "active" },
          { label: "Draft", value: "draft" },
        ],
      },
    ],
  },
];
```

### With Supabase / 使用 Supabase

```svelte
<script lang="ts">
  import { AdminApp } from '@svadmin/ui';
  import {
    createSupabaseDataProvider,
    createSupabaseAuthProvider,
    createSupabaseLiveProvider,
  } from '@svadmin/supabase';
  import { createClient } from '@supabase/supabase-js';
  import { resources } from './resources';
  import Login from './pages/Login.svelte';

  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
</script>

<AdminApp
  dataProvider={createSupabaseDataProvider(supabase)}
  authProvider={createSupabaseAuthProvider(supabase)}
  liveProvider={createSupabaseLiveProvider(supabase)}
  {resources}
  title="My App"
>
  {#snippet loginPage()}<Login />{/snippet}
</AdminApp>
```

### With SupaCloud Tasks / 使用 SupaCloud 任务增强

`@supacloud/js` does not replace `@supabase/supabase-js`. It wraps a normal Supabase client and adds task-oriented platform APIs. `@svadmin/supabase` keeps the official Supabase adapters unchanged and exposes the optional `@svadmin/supabase/supacloud` subpath for these task features.

`@supacloud/js` 不是 `@supabase/supabase-js` 的替代品，而是建立在官方 Supabase 客户端之上的平台增强层。`@svadmin/supabase` 会继续保持官方 Supabase 适配器不变，并通过可选子路径 `@svadmin/supabase/supacloud` 提供任务能力接入。

```bash
bun add @svadmin/supabase @supabase/supabase-js @supacloud/js
```

```ts
import { createClient } from '@supabase/supabase-js';
import { createSupaCloudClient } from '@supacloud/js';
import {
  createSupaCloudTaskProvider,
  createSupaCloudTaskLiveProvider,
} from '@svadmin/supabase/supacloud';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const supacloud = createSupaCloudClient({
  supabase,
  managementApiUrl: import.meta.env.VITE_SUPACLOUD_API_URL,
  projectRef: import.meta.env.VITE_SUPACLOUD_PROJECT_REF,
});

const taskProvider = createSupaCloudTaskProvider({ supacloud });
const taskLiveProvider = createSupaCloudTaskLiveProvider({ supacloud });
```

```ts
const task = await taskProvider.submit('aorist-ai/generate/crop', {
  body: { image_id: 'img_123' },
  idempotencyKey: 'crop-img_123-v1',
});

const finalState = await task.wait();
console.log(finalState.status);
```

```ts
const stop = taskLiveProvider.subscribe({
  resource: 'tasks',
  liveParams: { taskId: 'task_123' },
  callback: (event) => {
    console.log(event.payload);
  },
});

stop();
```

### With Elysia (Type-Safe) / 使用 Elysia（端到端类型安全）

```typescript
// Server: export your Elysia app type
import { Elysia } from "elysia";
const app = new Elysia().get("/posts", () => db.posts.findMany());
export type App = typeof app;

// Client: auto-infer resource types
import { createElysiaDataProvider } from "@svadmin/elysia";
import type { InferResourceMap } from "@svadmin/elysia";
import type { App } from "./server";

// ResourceTypeMap auto-derived from Elysia routes
declare module "@svadmin/core" {
  interface ResourceTypeMap extends InferResourceMap<App> {}
}

const dataProvider = createElysiaDataProvider<App>("http://localhost:3000");
```

### Tailwind CSS v4 Integration / Tailwind CSS v4 集成

> **Important / 重要**: Tailwind CSS v4 does not scan `node_modules` by default. `@svadmin/ui` registers its published `dist/components` directory from its own CSS entry, so consumers no longer need a separate `@source` directive for the UI package.
>
> Tailwind CSS v4 默认不扫描 `node_modules`。`@svadmin/ui` 会在自己的 CSS 入口中注册已发布的 `dist/components` 目录，因此消费者不再需要为 UI 包单独添加 `@source` 指令。

**1. Import the UI stylesheet / 引入 UI 样式:**

```css
/* app.css */
@import "tailwindcss";
@import "@svadmin/ui/app.theme.css";
```

If an existing app still contains `@source "../node_modules/@svadmin/ui/src";`, remove that line or point it at `dist`; the published package contains `dist`, not the workspace-only `src` directory.

如果已有项目仍包含 `@source "../node_modules/@svadmin/ui/src";`，请删除该行或改为指向 `dist`；npm 发布包只包含 `dist`，不包含工作区中的 `src` 目录。

**2. Configure Vite `optimizeDeps` / 配置 Vite `optimizeDeps`:**

`@svadmin/ui` ships a pre-built `dist` package containing its distributable `.svelte` components and CSS. Most Vite apps do not need an `optimizeDeps` override. If your monorepo or optional-peer setup does require exclusions, use the current package names below. When using `@svadmin/supabase`, keep it in `optimizeDeps.exclude` to avoid optional-peer/export pre-bundling issues:

`@svadmin/ui` 发布的是预构建 `dist`，其中包含可分发的 `.svelte` 组件与 CSS。大多数 Vite 项目无需配置 `optimizeDeps`；如果 monorepo 或可选 peer 场景确实需要排除，请使用下面的当前包名。使用 `@svadmin/supabase` 时可继续将其放入 `optimizeDeps.exclude`，避免可选 peer/export 的预打包问题：

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ["@svadmin/core", "@svadmin/ui", "@svadmin/supabase"],
    include: [
      "@svadmin/core > @tanstack/svelte-query",
      "@svadmin/ui > svelte-sonner",
      "@svadmin/ui > bits-ui",
      "@svadmin/ui > @tanstack/svelte-table",
      "@svadmin/ui > @lucide/svelte",
      "highlight.js",
      "marked",
      "marked-highlight",
      "isomorphic-dompurify",
    ],
  },
});
```

## 🏗️ `<AdminApp>` Props

| Prop             | Type                            | Required | Default    | Description                                   |
| ---------------- | ------------------------------- | -------- | ---------- | --------------------------------------------- |
| `dataProvider`   | `DataProvider`                  | ✅       | —          | Data source adapter / 数据源适配器            |
| `authProvider`   | `AuthProvider`                  | —        | —          | Auth adapter / 认证适配器                     |
| `routerProvider` | `RouterProvider`                | —        | hash       | Custom router / 自定义路由提供者              |
| `resources`      | `ResourceDefinition[]`          | ✅       | —          | Resource definitions / 资源定义               |
| `title`          | `string`                        | —        | `'Admin'`  | App title / 应用标题                          |
| `defaultTheme`   | `'light' \| 'dark' \| 'system'` | —        | `'system'` | Initial theme / 初始主题                      |
| `themeConfig`    | `ThemeConfig`                   | —        | —          | Theme config (strategy, overrides) / 主题配置 |
| `locale`         | `string`                        | —        | provider locale, otherwise browser auto-detect (`en` during SSR) | Bindable tree-local locale / 可绑定的树级语言 |
| `i18nProvider`   | `I18nProvider`                  | —        | —          | Tree-local translation provider; explicit `locale` takes priority / 树级翻译提供者；显式 `locale` 优先 |
| `dashboard`      | `Snippet`                       | —        | —          | Custom dashboard / 自定义仪表盘               |
| `loginPage`      | `Snippet`                       | —        | —          | Custom login page / 自定义登录页              |
| `loginDefaults`  | `{ identifier?: string; password?: string; hint?: string }` | — | — | Prefill default login credentials / 预填默认登录凭据 |
| `components`     | `Partial<ComponentRegistry>`    | —        | —          | Override default UI components / 覆盖默认组件 |

## 🌓 Dark Mode / 暗色模式

Dark mode works out of the box. Use `defaultTheme` prop or the Sidebar toggle:

暗色模式开箱即用。使用 `defaultTheme` prop 或侧边栏切换按钮：

```svelte
<!-- Follow system / 跟随系统 -->
<AdminApp {dataProvider} {resources} defaultTheme="system" />

<!-- Always dark / 始终暗色 -->
<AdminApp {dataProvider} {resources} defaultTheme="dark" />

<!-- Dark-first strategy for dark-themed apps / 默认暗色的应用 -->
<AdminApp {dataProvider} {resources} themeConfig={{ strategy: 'dark-first' }} />
```

Programmatic control / 编程式控制:

```typescript
import {
  setTheme,
  toggleTheme,
  getTheme,
  getResolvedTheme,
} from "@svadmin/core";

setTheme("dark"); // 'light' | 'dark' | 'system'
toggleTheme(); // toggle between light/dark
getTheme(); // current setting
getResolvedTheme(); // resolved to 'light' or 'dark'
```

## 🎨 Color Themes / 多色主题

Switch between 6 color palettes via sidebar picker or programmatically:

通过侧边栏选色器或编程式切换 6 种配色：

```typescript
import { getColorTheme, setColorTheme, colorThemes } from "@svadmin/core";
import type { ColorTheme } from "@svadmin/core";

setColorTheme("rose"); // 'blue' | 'green' | 'rose' | 'orange' | 'violet' | 'zinc'
getColorTheme(); // current color theme
console.log(colorThemes); // [{ id: 'blue', label: 'Blue', color: '#3b82f6' }, ...]
```

Available themes / 可用主题: `blue` (default), `green`, `rose`, `orange`, `violet`, `zinc`

## 🏷️ Resource Type Registry / 资源类型注册表

For end-to-end type safety, register your resource types:

注册资源类型以获得端到端类型安全：

```typescript
// Extend the ResourceTypeMap interface (declaration merging)
declare module "@svadmin/core" {
  interface ResourceTypeMap {
    posts: { id: number; title: string; body: string };
    users: { id: number; name: string; email: string };
  }
}

// Now all hooks get compile-time checking:
useList({ resource: "posts" }); // ✅ OK
useList({ resource: "postz" }); // ❌ Compile error — typo caught!
```

## 🔌 Custom DataProvider / 自定义数据源

Implement the `DataProvider` interface to connect any backend:

实现 `DataProvider` 接口即可接入任意后端：

```typescript
import type { DataProvider, BaseRecord } from "@svadmin/core";

const myProvider: DataProvider = {
  getApiUrl: () => "https://api.example.com",
  getList: async ({ resource, pagination, sorters, filters }) => {
    /* ... */
  },
  getOne: async ({ resource, id }) => {
    /* ... */
  },
  create: async ({ resource, variables }) => {
    /* ... */
  },
  update: async ({ resource, id, variables }) => {
    /* ... */
  },
  deleteOne: async ({ resource, id }) => {
    /* ... */
  },
};
```

## 🏗️ Architecture / 架构

```
┌──────────────────────────────────────────┐
│             Your App / 你的应用            │
│   (resources, pages, providers)           │
├──────────────────────────────────────────┤
│           @svadmin/ui                     │
│  AdminApp · AutoTable · AutoForm          │
│  ShowPage · 16 Fields · shadcn-svelte     │
├──────────────────────────────────────────┤
│           @svadmin/core                   │
│  30+ Hooks · Context · Router · i18n      │
│  Permissions · Audit · Theme              │
│  Resource Type Registry · Helpers         │
├──────────┬───────────┬───────────────────┤
│ /supabase│ /drizzle  │ /simple-rest      │
│ /appwrite│ /graphql  │ /elysia           │
│ /firebase│ /hasura   │ /pocketbase  ...  │
├──────────┴───────────┴───────────────────┤
│       @svadmin/refine-adapter             │
│  Bridge any @refinedev/* provider         │
└──────────────────────────────────────────┘
```

## 📖 Documentation / 文档

Full documentation is available at / 完整文档请访问：

**[svadmin.nestjs.cn](https://svadmin.nestjs.cn)**

## 🤝 Contributing / 贡献

Contributions are welcome! 欢迎贡献！

1. Fork the repo
2. Create your branch (`git checkout -b feat/amazing-feature`)
3. Commit (`git commit -m 'feat: add amazing feature'`)
4. Push (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT
