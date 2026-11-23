---
title: 框架对比
description: svadmin 与 Refine、React Admin、AdminJS 以及后端一体化平台的对比
---

svadmin 是面向 Svelte 5 的 Headless 管理后台框架。Refine 是最接近的架构同类：
两者都把数据、认证、权限、路由和 UI 解耦。React Admin 和 AdminJS 是 React
管理后台框架，UI 层更偏一体化。Directus、Payload、Filament 把后端和管理界面
打包在一起，解决的是另一类问题。

版本背景：本页按 Refine 5、React Admin 5、AdminJS 7 和 svadmin 的 Svelte 5
产品线描述。各项目版本迭代较快，做决策前请以官方文档为准。

## 框架总览

| | **svadmin** | **Refine** | **React Admin** | **AdminJS** |
|---|---|---|---|---|
| **框架** | Svelte 5 | React 18+ | React 18+ | React |
| **渲染模型** | Svelte 编译组件，runes 直接更新 DOM | React 虚拟 DOM | React 虚拟 DOM | React 虚拟 DOM |
| **Headless** | ✅ Core 的 Provider 和 Hook 与 UI 无关 | ✅ | 部分 | ❌ |
| **查询层** | TanStack Query for Svelte | TanStack Query for React | `ra-core` | 自定义 |
| **类型模型** | 严格泛型 + `ResourceTypeMap` | 严格泛型 | TypeScript 支持 | 较少 |
| **SSR** | SvelteKit；`@svadmin/lite` 支持服务端驱动/低 JS 页面 | Next.js / Remix SSR（需要 hydration） | Next.js SSR（需要 hydration） | Express |
| **官方 UI** | shadcn-svelte 组件（`@svadmin/ui`） | Ant Design / MUI / Mantine 集成，UI 仍由你选择 | Material UI | AdminJS UI |
| **自带 UI 套件** | ✅ Core Hook 可完全 headless 使用 | ✅ | 部分 | ❌ |
| **当前主版本** | 1.0 之前的 0.x 包 | 5.x | 5.x | 7.x |

## 数据提供器生态

| 后端 | **svadmin** | **Refine** | **React Admin** |
|------|-----------|-----------|----------------|
| REST API | ✅ `@svadmin/simple-rest`、`@svadmin/rest` | ✅ `@refinedev/simple-rest`、`@refinedev/rest` | ✅ `ra-data-simple-rest` |
| Supabase | ✅ `@svadmin/supabase` | ✅ `@refinedev/supabase` | 社区 |
| GraphQL | ✅ `@svadmin/graphql` | ✅ `@refinedev/graphql` | ✅ `ra-data-graphql` |
| Drizzle ORM | ✅ `@svadmin/drizzle` | 社区 | 社区 |
| Firebase | ✅ `@svadmin/firebase` | 社区 | ✅ `ra-data-firebase` |
| PocketBase | ✅ `@svadmin/pocketbase` | 社区 | 社区 |
| Appwrite | ✅ `@svadmin/appwrite` | ✅ `@refinedev/appwrite` | 社区 |
| Strapi | ✅ `@svadmin/strapi`、`@svadmin/strapi-graphql` | ✅ `@refinedev/strapi-v4`、`@refinedev/strapi-graphql` | ✅ `ra-strapi-rest` |
| Directus | ✅ `@svadmin/directus` | 社区 | 社区 |
| Hasura | ✅ `@svadmin/hasura` | ✅ `@refinedev/hasura` | ✅ `ra-data-hasura` |
| NestJS | ✅ `@svadmin/nestjs-query`、`@svadmin/nestjsx-crud` | ✅ `@refinedev/nestjs-query`、`@refinedev/nestjsx-crud` | 社区 |
| Elysia (Bun) | ✅ `@svadmin/elysia` | 社区 | 社区 |
| Airtable | ✅ `@svadmin/airtable` | 社区 | ✅ `ra-data-airtable` |
| Medusa | ✅ `@svadmin/medusa` | ✅ `@refinedev/medusa` | 社区 |
| Sanity | ✅ `@svadmin/sanity` | 社区 | 社区 |
| 全文检索 | ✅ `@svadmin/elasticsearch`、`@svadmin/meilisearch`、`@svadmin/typesense` | 社区 | 社区 |
| 分析/向量数据 | ✅ `@svadmin/clickhouse`、`@svadmin/qdrant` | 社区 | 社区 |
| 云存储 | ✅ `@svadmin/storage`、`@svadmin/s3` | 社区 | 社区 |
| 实时事件 | ✅ `@svadmin/pusher`、`@svadmin/ably`、`@svadmin/sse` | ✅ Live Provider 生态 | ❌ 仅轮询 |
| 外部身份认证 | ✅ `@svadmin/clerk`、`@svadmin/auth0`、`@svadmin/kinde`、`@svadmin/keycloak` | ✅ Auth Provider 生态 | 社区 |

svadmin 目前提供 24 个第一方数据提供器，另有
[`@svadmin/rest`](/zh-cn/providers/data-provider#通用-rest-桥接) 桥接和只读的
[`@svadmin/s3`](/zh-cn/providers/data-provider#s3-兼容对象列表)
对象列表。剩余 Refine 数据源可以通过
[`@svadmin/refine-adapter`](/zh-cn/providers/refine-adapter) 桥接。

## 功能对比

### 架构

| 功能 | **svadmin** | **Refine** | **React Admin** |
|------|-----------|-----------|----------------|
| Provider 模式 | ✅ | ✅ | ✅ |
| 复用 Refine Provider | ✅ Data / Auth / AccessControl / Notification / Live 适配器 | — | — |
| 多数据源 | ✅ | ✅ | ✅ |
| 认证提供器 | ✅ | ✅ | ✅ |
| 实时订阅 | ✅ WebSocket / SSE / Supabase / Ably / Firebase / GraphQL subscriptions | ✅ WebSocket / SSE / Supabase / Ably / Firebase / GraphQL subscriptions | ❌ 仅轮询 |
| 权限控制 | ✅ RBAC + ABAC + CASL + Casbin + Cerbos + Permit.io | ✅ RBAC + ABAC + Casbin / Cerbos / Permit.io | ✅ RBAC |
| SSO（OIDC/OAuth2） | ✅ `@svadmin/sso` 插件 | ✅ Auth0 / Keycloak 等 Provider 集成 | ❌ 无第一方 SSO |
| 路由无关 | ✅ Hash / SvelteKit | ✅ React Router / Next | ✅ React Router |
| 国际化 | ✅ | ✅ | ✅ |
| SSR | ✅ SvelteKit SSR；`@svadmin/lite` 提供服务端驱动、可选渐进增强页面 | ✅ Next.js / Remix SSR（需要 hydration） | ✅ Next.js SSR（需要 hydration） |

### 数据与变更

| 功能 | **svadmin** | **Refine** | **React Admin** |
|------|-----------|-----------|----------------|
| 乐观更新 | ✅ | ✅ | ✅ |
| 可撤销变更 | ✅ | ✅ | ✅ |
| CSV 导入导出 | ✅ 内置 | ✅ `useImport` / `useExport` | 社区 |
| 自动保存 | ✅ `useForm` / `AutoForm` + `AutoSaveIndicator` | ✅ `useForm` autoSave + AutoSaveIndicator | ❌ 需自行实现 |
| 字段推断器 | ✅ 样本数据 + OpenAPI | ✅ 样本数据 | ❌ |
| 过滤运算符 | 28 种字段运算符 + 带 key 的 `and` / `or` | 28 种字段运算符 + 带 key 的 `and` / `or` | 取决于后端 |

### UI 组件

| 功能 | **svadmin** | **Refine** | **React Admin** |
|------|-----------|-----------|----------------|
| AutoTable | ✅ 零配置 | ❌ 需要自行组合 UI 套件 | ✅ `<DataGrid>` |
| AutoForm | ✅ 零配置 | ❌ 需要自行组合 UI 套件 | ✅ `<SimpleForm>` |
| 字段组件 | 27 个导出字段组件，另有嵌套 `ArrayField` | 依赖 UI 套件 | 20+ 种 |
| 深色模式 | ✅ 浅色 / 深色 / 跟随系统 | 依赖 UI 套件 | ✅ |
| 配色预设 | ✅ 9 套内置预设 | 依赖 UI 套件 | ✅ |
| 认证页面外壳 | ✅ `AuthPageShell` | 依赖 UI 套件 | ✅ |
| 命令面板 | ✅ 内置 | ✅ `@refinedev/kbar` | ❌ |
| 权限矩阵 | ✅ 内置组件 | 官方未提供组件 | 需自行实现 |
| 审计 JSON 快照 | ✅ 内置组件 | ✅ Core `auditLogProvider` | 需自行实现 |
| 租户切换器 | ✅ `TenantSwitcher` 组件；租户状态由宿主接入 | 需自行实现 | 需自行实现 |
| UI 套件灵活性 | 🔶 第一方 shadcn-svelte；headless 用户可自带 UI | ✅ Ant Design / MUI / Mantine 集成 | 🔶 Material UI |

### 开发体验

| 功能 | **svadmin** | **Refine** | **React Admin** |
|------|-----------|-----------|----------------|
| 资源类型注册表 | ✅ 编译时检查 | ❌ | ❌ |
| 端到端类型推导 | ✅ Elysia / Drizzle | ❌ | ❌ |
| CLI 脚手架 | ✅ `@svadmin/create`，含 add / infer / swizzle / doctor / upgrade / migrate | ✅ `create-refine-app` + Refine CLI | ✅ `create-react-admin` |
| 超时跟踪 | ✅ `useLoadingOvertime` | ✅ `useLoadingOvertime` | ❌ |
| 步骤表单 | ✅ `useStepsForm` | ✅ | ❌ |
| 组件定制 | ✅ `svadmin swizzle` | 社区 | ❌ |
| 代码与 Schema 推断 | ✅ `svadmin infer` | 社区 | ❌ |
| DevTools | ✅ Headless 诊断 + `DevTools` 组件 | ✅ Refine DevTools | ❌ |

### AI 与智能化

| 功能 | **svadmin** | **Refine** | **React Admin** |
|------|-----------|-----------|----------------|
| AI 聊天集成 | ✅ ChatProvider（流式 + 非流式） | 非 Core 包 | ❌ |
| 管理上下文注入 | ✅ ChatContext 自动注入当前资源/视图 | 需自行实现 | 需自行实现 |
| 工具调用 + 审批门控 | ✅ AgentProvider + AdminTool + `needsApproval` | 需自行实现 | 需自行实现 |
| 命令面板 AI 模式 | ✅ ⌘K 自然语言模式 | ❌ | ❌ |
| 字段推断 | ✅ 样本数据 + OpenAPI | ✅ 样本数据 | ❌ |
| Agent 友好脚手架 | ✅ CLI 生成 `AGENTS.md` | Core 未内置 | ❌ |
| MCP 数据网关 | ✅ `@svadmin/mcp` | Core 未内置 | ❌ |
| 厂商 AI 代码生成 | 非第一方产品 | 以厂商当前 AI 产品说明为准 | ❌ |

> **定位差异**：Refine 更适合需要多 UI 套件集成和最大第三方生态的 React
> 团队；svadmin 适合使用 Svelte 5、需要 headless 管理后台原语、第一方
> AutoTable/AutoForm、服务端低 JS 方案以及运行时 AI 的团队。AI 产品变化很快，
> 决策前请核实厂商当前能力。

## 后端一体化平台

Directus、Payload、Filament 不是 Headless 管理后台框架的替代品。它们把后端、
Schema、API 和管理界面打包在一起。需要整套栈时选它们；后端已经存在或必须
保持独立时选 svadmin。

| | **svadmin** | **Directus** | **Payload** | **Filament** |
|---|---|---|---|---|
| **类别** | Headless 管理后台框架 | 数据平台 + 管理后台 | 后端 / CMS + 管理后台 | PHP 管理面板 |
| **内置后端** | ❌ 自带后端 | ✅ | ✅ | ✅ Laravel |
| **前端技术栈** | Svelte 5 | 基于 Vue 的管理端 | React / Next.js | PHP / Livewire |
| **接入现有 API** | ✅ DataProvider 适配器 | 有限 | 有限 | 以 Eloquent 为主 |
| **适合场景** | 在现有后端上构建定制管理端 | 内容/数据平台团队 | Next.js 产品团队 | Laravel 团队 |

## 什么时候选 svadmin

- **你在使用 Svelte 5** — svadmin 提供面向 runes 的 headless 管理 API 和
  第一方 shadcn-svelte 组件。
- **你想要第一方表格和表单体验** — 内置 `AutoTable`、`AutoForm`、CRUD 页面、
  设置页和认证页。
- **你需要接入现有后端** — 24 个第一方数据提供器加 Refine 适配器，覆盖
  REST、GraphQL、数据库、搜索和存储。
- **你需要直连数据库** — `@svadmin/drizzle` 可跳过 API 层，支持 SQLite、
  PostgreSQL、MySQL 和 Cloudflare D1。
- **你需要服务端驱动或低 JS 方案** — `@svadmin/lite` 提供 SSR 优先页面和可选
  渐进增强。
- **你需要完整类型安全** — `ResourceTypeMap` + Elysia/Drizzle 推导。
- **你想在管理面板内集成 AI** — ChatProvider、AgentProvider、工具审批门控和
  MCP 网关都是独立包。

## 什么时候选 Refine

- **你在用 React** — Refine 的生态更成熟，专注 React。
- **你需要多套官方 UI 套件集成** — 支持 Ant Design、MUI、Mantine。
- **你需要最大的社区** — 更多第三方集成、教程和模板。

## 什么时候选 React Admin

- **你想要开箱即用的 Material UI 管理端** — 本对比中现成 UI 最完整。
- **你需要商业支持** — React Admin 有商业授权和支持选项。
- **你有复杂列表视图** — DataGrid 行内编辑、高级过滤。

## 什么时候不适合选 svadmin

- **团队只使用 React，并且需要官方多 UI 套件** — Refine 或 React Admin 上手
  更快。
- **今天就需要内置后端 + 管理界面** — Directus、Payload、Filament 覆盖该范围。
- **今天就需要稳定的 1.0 API 和长期支持合同** — svadmin 包仍处于 1.0 之前，
  请按团队风险偏好评估升级策略。
- **你需要大型插件市场** — Refine 的生态更大。

性能取决于路由、数据量和所选包。请用相同的功能集测量生产构建，不要只依赖
框架级结论。