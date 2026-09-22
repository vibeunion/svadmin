# SVAdmin 应用平台模型

本文固定 SVAdmin 的长期方向：**Refine 负责“抽象正确”，Angular 负责“工程完整”，
Svelte 负责“运行时轻量”，AI manifest 负责“让生成结果可控”。**

目标不是复制 Angular 的运行时（NgModule、装饰器、class service），而是借鉴
Angular 的工作台治理：CLI、workspace、官方库体系、稳定 public API、生成器、
可发现的插件清单。这样既能保持 Refine 式的可替换 provider，又能让 AI 与新人
只需理解一条稳定入口。

## 分层

| 层 | 包 | 职责 |
| --- | --- | --- |
| 契约层 | `@svadmin/core` | 类型、`ResourceContract`、Provider 合约、Hooks |
| 应用层 | `@svadmin/app` | `defineAdminConfig`、插件契约、`resolveAdminConfig`、运行时绑定、AI manifest |
| UI 层 | `@svadmin/ui`、`@svadmin/lite` | Admin Shell、表格、表单、字段、页面 Recipe |
| 路由/SSR | `@svadmin/sveltekit` | SvelteKit 路由、SSR 与 server 边界 |
| Provider | `@svadmin/supabase`、`@svadmin/simple-rest`、`@svadmin/graphql` 等 | 数据、认证、实时、存储、迁移能力 |
| 工具链 | `@svadmin/create` | `init` / `add` / `generate` / `doctor` / `upgrade` / `migrate` / `eject` |
| DevTools | `@svadmin/devtools-contract` | 查询追踪、Provider 诊断、权限诊断、资源与路由可视化 |

应用层只做“组合”，不承载页面实现。页面组件留在业务 Feature 内。

## 应用入口：`defineAdminConfig`

```ts
// src/app/svadmin.config.ts
import { defineAdminConfig } from '@svadmin/app';
import { createSupabaseBundle } from '@svadmin/supabase';
import { ordersResource } from '../features/orders';

export default defineAdminConfig({
  name: 'my-app',
  providers: createSupabaseBundle({ url: import.meta.env.VITE_SUPABASE_URL }),
  resources: [ordersResource],
  plugins: [
    // auditPlugin(),
    // aiPlugin(),
  ],
});
```

约束：

- `providers` 接受单个 `ProviderBundle` 或多个 bundle，后声明的标量 provider
  覆盖先声明的；命名 DataProvider 做合并，单个 DataProvider 落到 `default`。
- `resources` 接受裸 `ResourceContract`（自动展开为最小 `ResourceDefinition`）或带
  `contract` 的完整 `ResourceDefinition`，不通过隐式字符串约定连接。
- `resolveAdminConfig()` 是纯函数：把插件贡献折叠成确定性快照，并返回
  `diagnostics`，不抛异常。`assertAdminConfig()` 在启动与 `doctor` 中用于快速失败。
- `toAdminContextSource()` 产出可直接传给 `provideAdminContext` 的形状；
  `provideAdminConfig()` 在组件初始化时一次性安装到 scoped `AdminContext`；
  `provideResourceScope()` 在任意子树叠加 Application→Route→Resource→Component 的覆盖。
- `buildAdminManifest()` 把 resolved config 序列化成 `svadmin.ai.json` 的稳定内容
  （provider、资源字段、contract 字段、插件能力、项目命令与禁止 import）。

### 当前实现状态

| 能力 | 状态 |
| --- | --- |
| `defineAdminConfig` / `defineSvadminPlugin` / `resolveAdminConfig` / `assertAdminConfig` | 已在 `@svadmin/core` 落地 |
| `provideAdminConfig` 运行时绑定 + `toAdminContextSource` | 已落地 |
| `buildAdminManifest` AI manifest 生成 | 已落地 |
| CLI 生成 `src/svadmin.config.ts` / `svadmin.ai.json`，模板 `App.svelte` 消费 config | 已在 `@svadmin/create` 落地 |
| `doctor` 校验 AI manifest 与 provider 依赖一致性 | 已落地 |
| `svadmin add resource\|provider\|auth` 幂等命令 + `src/features/*` 模块模板 | 已落地 |
| `svadmin.schema.json` JSON Schema + `migrate` 别名 | 已落地 |
| `@svadmin/app` 应用层包（含 `createAdminApp`），脚手架已消费 | 已落地 |
| 黄金路径 preset（`init --preset supabase\|rest\|graphql`） | 已落地 |
| `svadmin.ai.json` 路由、组件目录、迁移规则；plugin `configSchema` | 已落地 |
| Provider 包级 capability/compat 元数据（`package.json` 的 `svadmin` 字段）+ `doctor` 校验 | 已落地 |
| 四层作用域覆盖（`provideResourceScope`） | 已落地 |
| 黄金路径 preset（`init --preset supabase\|rest\|graphql`） | 已落地 |
| `svadmin.ai.json` 路由、组件目录、迁移规则；plugin `configSchema` | 已落地 |
| `@svadmin/devtools` 完整诊断应用 | 待办（现有 `@svadmin/devtools-contract` + UI `DevTools`） |

## 插件契约

插件是**机器可读的 manifest**，不是需要被猜测的 npm 包名：

```ts
import { defineSvadminPlugin } from '@svadmin/core';

export const auditPlugin = defineSvadminPlugin({
  name: 'audit',
  version: '1',
  capabilities: ['audit-log', 'admin-route'],
  providers: ['audit'],
  commands: ['audit:export'],
  generators: ['audit-page'],
  docs: { setup: './docs/setup.md', examples: './examples' },
  contributes: {
    resources: [auditLogResource],
  },
});
```

这样 `add` 知道如何安装，`doctor` 知道如何检查，文档知道如何展示，AI 知道插件
能做什么。Provider 也声明能力矩阵（`data` / `auth` / `live` / `storage` /
`server-data` / `migrations`），而不是维护一张无限增长的包列表。

## 业务模块模板

```text
src/
  app/
    svadmin.config.ts
    providers.ts
    plugins.ts
  features/
    orders/
      index.ts            # 公开入口
      orders.resource.ts
      orders.commands.ts
      orders.routes.ts
      pages/
      components/
      tests/
  shared/
```

每个业务模块至少包含：一个 resource contract、完整 schema、明确的 CRUD 能力、
可选 command / 页面 / 权限 / 测试。这与现有 `features/<module>` 边界规则一致，
见 `docs/architecture/business-modules.md`。

## 黄金路径

对外只维护三条官方路径，其余 provider 归入集成目录，避免“包很多但没有默认路径”：

1. Supabase + SvelteKit + `@svadmin/ui`
2. Simple REST + JWT + Vite
3. GraphQL + SvelteKit + `@svadmin/ui`

CLI 提供预设：`svadmin init my-app --preset supabase|rest|graphql`（已落地）。

## CLI 合约

| 命令 | 要求 |
| --- | --- |
| `svadmin init` | 生成 `svadmin.config.ts`、AI manifest 与 ready-to-run 工程 |
| `svadmin add resource\|provider\|auth` | 幂等，dry-run 默认，`--write` 只补缺失文件；不覆盖已有文件 |
| `svadmin generate crud\|page` | 输出稳定、可读、可修改的源码 |
| `svadmin doctor` | 检查配置、包版本、导出路径、Provider 能力、AI manifest 漂移 |
| `svadmin upgrade` | 提供迁移说明与备份 |
| `svadmin eject` | 产出仍遵守 public API，而不是复制内部实现 |

## AI 协议

除 `AGENTS.md` 外，脚手架生成稳定入口：

- `src/svadmin.config.ts`：应用组合。数据/认证 provider 在模块顶层解析
  （异步 provider 用 top-level await），导出完整静态配置。
- `svadmin.ai.json`：可用 Provider 能力矩阵、资源字段与操作、路由、组件目录、
  迁移规则、项目与测试命令、禁止的内部 import。由 `buildScaffoldPlatformFiles()` 生成。
- `svadmin.schema.json`：`svadmin.ai.json` 的 JSON Schema（draft 2020-12）。

Provider 包在 `package.json` 声明 `svadmin` 元数据（`capabilities`、`core`、`stability`、
`migration`）；`doctor` 在包已安装时校验其 core 范围与项目一致。

AI 只需读取这些入口，不需要扫描整个仓库。`generate` 与 `doctor` 必须真正执行
现有 guidance 规则（schema-first、禁止猜字段、禁止 `any`、显式绑定资源）。
`doctor` 在项目含 `src/svadmin.config.ts` 时会校验 `svadmin.ai.json` 存在、可解析，
且声明的 provider 包已在 `package.json` 中；旧项目不受影响。

## 反模式

- 不做一个包含所有能力的 `@svadmin/all` 运行时大包。
- 不把所有功能都塞进 `AdminApp`。
- 不让资源、路由、权限通过隐式字符串约定连接。
- 不让 AI 直接生成内部组件实现。
- 不让每个 provider 自己定义一套错误、分页、权限、mutation 语义。
- 不复制 Angular 的 NgModule、装饰器和 class service 体系。
- 不让“生态全包”变成“包很多但没有默认路径”。

## 落地顺序

1. 定义 `svadmin.config.ts` 与 `defineAdminConfig`（core 契约已完成）。
2. 把 Provider Bundle、Plugin Registry、Resource Registry 统一到应用层
   （`provideAdminConfig` 运行时绑定已完成）。
3. CLI 生成平台入口文件、`doctor` 校验 AI manifest、`add` 幂等命令（已完成）。
4. 建立 `src/features/*` 业务模块模板（`add resource` 已生成）。
5. 为 provider 与 plugin 增加 capability manifest。
6. 把 `AGENTS.md`、`DESIGN.md`、`svadmin.ai.json` 纳入 scaffold。
7. 最后再扩充更多官方 provider 与企业能力。

## 兼容性矩阵

发布平台化，每个包声明：支持的 `@svadmin/core` 范围、Svelte 版本、peer
dependencies、capability、migration、public exports、stable/experimental 状态。
包版本、发布状态与 registry 实际状态必须由 `doctor` 与发布流程自动校验，
不能只从 PR 或文档推断。