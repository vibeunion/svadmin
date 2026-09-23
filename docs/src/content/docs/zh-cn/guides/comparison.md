---
title: 框架对比
description: svadmin 与 Refine、React Admin 等竞品的详细对比
---

svadmin 是编译时 admin 框架 — 无虚拟 DOM、无运行时 diff，直接操作真实 DOM。以下是与竞品的全面对比。

## 框架总览

| | **svadmin** | **Refine** | **React Admin** | **AdminJS** |
|---|---|---|---|---|
| **框架** | Svelte 5 | React 18+ | React 18+ | React |
| **运行时** | ✅ 编译为直接 DOM 操作 — 无 VDOM | VDOM → diff → patch | VDOM → diff → patch | VDOM → diff → patch |
| **响应式** | ✅ Runes — 变量级信号 | Hooks — 组件级重渲染 | Hooks | Hooks |
| **Core 体积** | ✅ ~15KB | ~80KB | ~200KB+ | ~150KB+ |
| **内存** | ✅ 无 VDOM 树副本 | VDOM 树开销 | VDOM 树开销 | VDOM 树开销 |
| **Headless** | ✅ | ✅ | 部分 | ❌ |
| **查询** | TanStack Query (Svelte) | TanStack Query (React) | ra-core | 自定义 |
| **类型** | ✅ 完整 — ResourceTypeMap | 部分 | 部分 | 最小 |
| **SSR** | SvelteKit 原生 | Next.js / Remix | Next.js | Express |

## 数据提供器生态

| 后端 | **svadmin** | **Refine** | **React Admin** |
|------|-----------|-----------|----------------|
| REST API | ✅ `@svadmin/simple-rest` | ✅ `@refinedev/simple-rest` | ✅ `ra-data-simple-rest` |
| Supabase | ✅ `@svadmin/supabase` | ✅ `@refinedev/supabase` | 社区 |
| GraphQL | ✅ `@svadmin/graphql` | ✅ `@refinedev/graphql` | ✅ `ra-data-graphql` |
| **Drizzle ORM** | ✅ `@svadmin/drizzle` | ❌ | ❌ |
| Firebase | ✅ `@svadmin/firebase` | ✅ 社区 | ✅ `ra-data-firebase` |
| PocketBase | ✅ `@svadmin/pocketbase` | 社区 | 社区 |
| Appwrite | ✅ `@svadmin/appwrite` | ✅ `@refinedev/appwrite` | 社区 |
| Strapi | ✅ `@svadmin/strapi` | ✅ `@refinedev/strapi` | ✅ `ra-strapi-rest` |
| Directus | ✅ `@svadmin/directus` | 社区 | 社区 |
| Hasura | ✅ `@svadmin/hasura` | ✅ `@refinedev/hasura` | ✅ `ra-data-hasura` |
| NestJS | ✅ `@svadmin/nestjs-query` | ✅ `@refinedev/nestjs-query` | 社区 |
| **Elysia (Bun)** | ✅ `@svadmin/elysia` | ❌ | ❌ |
| Airtable | ✅ `@svadmin/airtable` | 社区 | ✅ `ra-data-airtable` |
| Medusa | ✅ `@svadmin/medusa` | ✅ `@refinedev/medusa` | ❌ |
| Sanity | ✅ `@svadmin/sanity` | 社区 | 社区 |

## 功能对比

### 架构

| 功能 | **svadmin** | **Refine** | **React Admin** |
|------|-----------|-----------|----------------|
| Provider 模式 | ✅ | ✅ | ✅ |
| 多数据源 | ✅ | ✅ | ✅ |
| 认证提供器 | ✅ | ✅ | ✅ |
| 实时订阅 | ✅ WebSocket + SSE | ✅ WebSocket + SSE | ❌ 仅轮询 |
| 权限控制 | ✅ RBAC + ABAC + CASL + Casbin | ✅ RBAC + ABAC | ✅ RBAC |
| SSO（OIDC/OAuth2） | ✅ `@svadmin/sso` 插件 | ✅ 企业版（付费） | ❌ 无 |
| 路由无关 | ✅ Hash / SvelteKit | ✅ React Router / Next | ✅ React Router |
| 国际化 | ✅ | ✅ | ✅ |
| SSR 优先/低 JS 回退 | ✅ `@svadmin/lite`（服务端驱动，可选渐进增强） | ❌ 强依赖运行时 Hydration | ❌ 强依赖运行时 Hydration |

### 数据与变更

| 功能 | **svadmin** | **Refine** | **React Admin** |
|------|-----------|-----------|----------------|
| 乐观更新 | ✅ | ✅ | ✅ |
| 可撤销变更 | ✅ | ✅ | ✅ |
| CSV 导入导出 | ✅ 内置 | ❌ 需自行实现 | 社区 |
| 自动保存 | ✅ 组件 | ❌ 需自行实现 | ❌ 需自行实现 |
| 字段推断器 | ✅ 样本数据 + OpenAPI | ✅ 样本数据 | ❌ |
| 过滤运算符 | 16 种 | 16 种 | 取决于后端 |

### UI 组件

| 功能 | **svadmin** | **Refine** | **React Admin** |
|------|-----------|-----------|----------------|
| AutoTable | ✅ 零配置 | ❌ 需自行实现 | ✅ `<DataGrid>` |
| AutoForm | ✅ 零配置 | ❌ 需自行实现 | ✅ `<SimpleForm>` |
| 字段组件 | 16 种 (含嵌套 ArrayField) | 依赖 UI 套件 | 20+ 种 |
| 深色模式 | ✅ 浅色 / 深色 / 跟随系统 | 依赖 UI 套件 | ✅ |
| 配色预设 | ✅ 8 套内置预设 | 依赖 UI 套件 | ✅ |
| Stripe 风格认证外壳 | ✅ 认证页面 | ❌ | ❌ |
| 命令面板 | ✅ 内置 | ❌ | ❌ |
| 3D 权限分配矩阵 | ✅ 免费企业级组件 | ❌ 官方未提供组件 | ❌ 需自行实现 |
| 审计日志对比快照 | ✅ 免费企业级组件 | ✅ 企业版专属特性 | ❌ 需自行实现 |
| 无刷新多租户切换 | ✅ 免费企业级组件 | ❌ 需自行实现 | ❌ 需自行实现 |

### 开发体验

| 功能 | **svadmin** | **Refine** | **React Admin** |
|------|-----------|-----------|----------------|
| 资源类型注册表 | ✅ 编译时检查 | ❌ | ❌ |
| 端到端类型推导 | ✅ Elysia / Drizzle | ❌ | ❌ |
| CLI 脚手架 | ✅ `@svadmin/create` | ✅ `create-refine-app` | ✅ `create-react-admin` |
| 超时跟踪 | ✅ 内置 hooks | ❌ | ❌ |
| 步骤表单 | ✅ `useStepsForm` | ✅ | ❌ |

### AI 与智能化

| 功能 | **svadmin** | **Refine** | **React Admin** |
|------|-----------|-----------|----------------|
| AI 聊天集成 | ✅ ChatProvider（流式 + 非流式） | ❌ | ❌ |
| 管理上下文注入 | ✅ ChatContext 自动传递当前资源/视图 | ❌ | ❌ |
| 工具调用 + 审批门控 | ✅ AgentProvider + AdminTool + needsApproval | ❌ | ❌ |
| 命令面板 AI 模式 | ✅ ⌘K 自然语言查询 | ❌ | ❌ |
| 字段推断 | ✅ 样本数据 + OpenAPI 双引擎 | ✅ 样本数据 | ❌ |
| Agent 友好脚手架 | ✅ `AGENTS.md` 内置 | ❌ | ❌ |
| MCP 数据网关 | ✅ `@svadmin/mcp` | ❌ | ❌ |
| AI 代码生成器 | ❌ | ✅ Refine AI Agent（商业产品） | ❌ |

> **定位差异**：Refine 侧重「AI 帮你写 Admin」（开发时 AI）；svadmin 侧重「Admin 里内置 AI」（运行时 AI）。两者互不冲突，但运行时 AI 对终端用户的价值更直接。

## 什么时候选 svadmin

- **你追求极致性能** — 无虚拟 DOM、无运行时 diff 开销。Svelte 在构建时将组件编译为直接 DOM 操作，首次渲染更快、内存占用更低、运行时零框架开销
- **你在用 Svelte** — svadmin 是唯一生产级的 Svelte 5 headless admin
- **你需要直连数据库** — `@svadmin/drizzle` 让你跳过 API 层直接操作数据库
- **你需要边缘部署** — 通过 Drizzle 支持 SQLite + Cloudflare D1
- **你需要完整类型安全** — ResourceTypeMap + Elysia/Drizzle 推导
- **你在乎包体积** — Svelte 编译产物显著小于 React 的运行时 + 虚拟 DOM
- **你需要细粒度响应式** — Svelte 5 runes 只更新实际变化的 DOM 节点，React 则需要重渲染整个组件子树
- **你想在管理面板内集成 AI** — ChatProvider 开箱即用，自动注入当前资源上下文，支持流式响应与操作按钮

## 什么时候选 Refine

- **你在用 React** — Refine 的生态成熟且专注 React
- **你需要 UI 套件灵活性** — Refine 支持 Ant Design、Material UI、Chakra、Mantine
- **你需要最大的社区** — 更多第三方集成和教程

## 什么时候选 React Admin

- **你需要开箱即用** — 最完整的现成 UI
- **你需要企业支持** — 商业授权和技术支持
- **你有复杂列表视图** — DataGrid 行内编辑、高级过滤
