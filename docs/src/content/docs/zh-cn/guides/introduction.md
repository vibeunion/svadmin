---
title: 简介
description: svadmin — Svelte 5 无头 Admin 框架
---

**svadmin** 是一个基于 Svelte 5 的无头 Admin 框架，提供构建全功能管理后台所需的所有模块。支持任意后端 — svadmin 可以连接任何 REST、GraphQL 或自定义 API。

## 什么是 svadmin？

svadmin 原生基于 **Svelte 5 runes** 构建，采用基于 Provider 的架构，实现关注点的清晰分离：

- **DataProvider** — 对任意后端的 CRUD 操作
- **AuthProvider** — 认证、身份管理、权限控制
- **RouterProvider** — Hash 或 History 路由，也可使用自定义路由
- **LiveProvider** — 通过 WebSocket 或 SSE 实现实时订阅

## 核心特性

- 🎯 **Provider 架构** — 切换后端无需修改 UI 代码
- ⚡ **TanStack Query** — 自动缓存、请求去重、后台刷新
- 🧩 **预构建组件** — AutoTable、AutoForm、CRUD 页面、认证页面、CommandPalette、Sheet、Drawer、StepsForm
- 🔠 **16 个字段组件** — 完整的字段显示和输入组件集（Text、Image、JSON、RichText、Combobox、MultiSelect 等）
- 🔑 **认证系统** — 9 个 Hook + 4 个毛玻璃风格认证页面
- 📡 **实时数据** — WebSocket 和 SSE 实时 Provider，支持自动重连
- 🎨 **可主题化** — 7 套配色主题、亮/暗色模式、毛玻璃效果
- 🛡️ **访问控制** — 基于角色和属性的权限管理
- 🔍 **推断器** — 从示例数据或 OpenAPI 3.x 规范自动生成管理界面
- 🧱 **声明式 Surface** — 使用可信 Svelte 组件渲染经过校验和策略约束的仪表盘协议
- 🏷️ **资源类型注册表** — 编译时资源名称检查 + 自动类型推断
- 🔄 **变更模式** — 悲观、乐观和可撤销三种变更模式
- 📤 **数据导入导出** — CSV 导出/导入，支持批量操作
- 🧰 **工具函数** — `unionFilters`、`unionSorters`、`file2Base64`、`getDefaultFilter`、`getDefaultSortOrder`
- 📦 **16 个数据 Provider** — REST、Supabase、PocketBase、Appwrite、GraphQL、Elysia、Drizzle ORM、Strapi、Directus、Firebase、Hasura、Sanity、Airtable、Medusa、NestJS 等

## 包列表

| 包名 | 说明 |
|------|------|
| `@svadmin/core` | Hooks、Providers、类型、资源类型注册表、工具函数 |
| `@svadmin/ui` | 预构建 Svelte 5 组件（表单、表格、16 个字段、shadcn） |
| [`@svadmin/surface`](/zh-cn/guides/declarative-surface) | 带只读资源绑定和严格校验的声明式仪表盘 |
| [`@svadmin/flow`](/zh-cn/guides/flow) | 面向客户端图编辑器的可选拖拽节点画布 |
| `@svadmin/simple-rest` | REST API 数据 Provider |
| `@svadmin/supabase` | Supabase 数据 + 认证 + 实时 Provider |
| `@svadmin/pocketbase` | PocketBase 数据 + 认证 + 实时 Provider |
| `@svadmin/appwrite` | Appwrite 数据 + 认证 + 实时 Provider |
| `@svadmin/graphql` | GraphQL 数据 Provider |
| `@svadmin/elysia` | Elysia 数据 Provider（自动类型推断） |
| `@svadmin/drizzle` | Drizzle ORM 数据 Provider — SQLite、PostgreSQL、MySQL、D1 |
| `@svadmin/sso` | OIDC/OAuth2 SSO 认证 Provider — Okta、Azure AD、Cognito、Keycloak、Google |
| `@svadmin/auth-utils` | 认证工具包 — 密码哈希、会话管理、TOTP |
| `@svadmin/sveltekit` | SvelteKit 集成 |
| `@svadmin/strapi` | Strapi CMS 数据 Provider |
| `@svadmin/directus` | Directus 数据 Provider |
| `@svadmin/firebase` | Firebase / Firestore 数据 Provider |
| `@svadmin/hasura` | Hasura GraphQL 数据 Provider |
| `@svadmin/sanity` | Sanity.io 数据 Provider |
| `@svadmin/airtable` | Airtable 数据 Provider |
| `@svadmin/medusa` | Medusa Commerce 数据 Provider |
| `@svadmin/nestjs-query` | NestJS GraphQL 数据 Provider |
| `@svadmin/nestjsx-crud` | NestJS CRUD 数据 Provider |
| `@svadmin/create` | CLI 脚手架工具 |
