---
title: 声明式 Surface
description: 使用可信 Svelte 组件渲染受策略约束的 JSON 仪表盘
---

`@svadmin/surface` 是一个可选的浏览器端包，用于构建比自动 CRUD 页面更灵活的仪表盘和运营视图。它接收版本化 JSON 文档，先校验整份文档，再执行只读资源查询，并且只渲染宿主注册的可信组件。

它不会修改 `@svadmin/core`，不会生成 Svelte 代码，也不会把 svadmin 变成通用 BI 查询引擎。

## 能力边界

- 根入口 `@svadmin/surface`：JSON-safe 协议类型和 `validateSurfaceSpec`。
- Svelte 入口 `@svadmin/surface/svelte`：`SurfaceRenderer`、默认 Catalog 和 `defineSurfaceCatalog`。
- 数据访问：仅允许 `Pick<DataProvider, 'getList' | 'getOne'>`。
- 默认组件：`metric`、`resource-table`、`bar-chart`、`line-chart`。
- 布局：经过校验的 12 列栅格、语义化间距和列跨度。

MVP 仅支持客户端 Svelte 5 + Vite，不支持 SSR/Lite、Action、持久化、Agent 输入、自动刷新、客户端聚合、Canvas 或 iframe。

```bash
bun add @svadmin/surface @svadmin/core @svadmin/ui @tanstack/svelte-query svelte zod
```

## 公开 API

| 入口 | API | 用途 |
| --- | --- | --- |
| `@svadmin/surface` | `validateSurfaceSpec`、`SURFACE_SCHEMA_VERSION`、协议与策略类型 | 不依赖 DOM 的校验和 wire contract |
| `@svadmin/surface/svelte` | `SurfaceRenderer`、`defaultSurfaceCatalog`、`defineSurfaceCatalog` | 浏览器渲染与可信组件注册 |

`validateSurfaceSpec(input, catalog, policy)` 对普通校验失败返回可序列化 Result，而不是抛出异常。Renderer 接收 `spec: unknown`，并在发送任何查询前重新校验整份文档，因此导入工具和编辑器可以提前检查文档，同时不会形成第二套安全边界。

## 渲染 Surface

```svelte
<script lang="ts">
  import type { SurfacePolicy, SurfaceSpec } from '@svadmin/surface';
  import {
    DEFAULT_SURFACE_CATALOG_VERSION,
    SurfaceRenderer,
  } from '@svadmin/surface/svelte';

  const policy = {
    resources: {
      products: {
        readFields: ['id', 'name', 'stock'],
        maxPageSize: 25,
      },
    },
  } satisfies SurfacePolicy;

  const spec = {
    schemaVersion: 'surface/v1',
    catalogVersion: DEFAULT_SURFACE_CATALOG_VERSION,
    surfaceId: 'inventory',
    title: '库存概览',
    layout: { type: 'grid', columns: 12, gap: 'md' },
    dataSources: [
      { id: 'products', type: 'resource-list', resource: 'products', pageSize: 10 },
    ],
    widgets: [{
      id: 'stock',
      type: 'bar-chart',
      props: { title: '商品库存', labelField: 'name', valueField: 'stock' },
      binding: { sourceId: 'products', pointer: '/items' },
      placement: { columnSpan: 12 },
    }],
  } satisfies SurfaceSpec;

  let renderer = $state<{ refresh(sourceId?: string): Promise<void> }>();
</script>

<button type="button" onclick={() => renderer?.refresh()}>刷新</button>
<SurfaceRenderer bind:this={renderer} {spec} {policy} />
```

当组件位于 `AdminApp` 内部时，每个数据源会使用对应资源配置的 Provider。测试或独立嵌入时，可信宿主也可以显式传入 Provider。

`refresh(sourceId?)` 是可信宿主 API。刷新能力不会进入 `SurfaceSpec`，刷新数据也不会重建 Spec 或 Widget DOM。

## 字段策略与授权

`SurfacePolicy` 是 Renderer 的必填参数。每个资源按需声明 `readFields`、`filterFields`、`sortFields`、`allowGetOne` 和 `maxPageSize`。只要 Spec 引用了策略外的资源或字段，整页就会被拒绝，并且不发送查询。

查询前，当前 `AccessControlProvider` 会收到 `list` 或 `show` 检查。浏览器检查只负责展示门控，后端必须对每次请求独立完成身份认证和授权。

Provider 记录会先投影到 `readFields`，再交给 Widget。被选中的非 JSON 值会直接失败，不会进行隐式转换。

## 扩展 Catalog

自定义 Catalog 是可信的可执行运行时配置，不是 wire data。通过 `defineSurfaceCatalog` 注册严格的 Zod v4 props schema 和可信 Svelte 组件。若列表 Widget 的 props 会选择记录字段，必须通过 `getReferencedFields` 暴露这些字段，以便校验器应用字段策略。

不要注册允许 props 传入原始 HTML、CSS、class、颜色、URL、事件处理器、动态 import 或任意请求参数的组件。

## 威胁模型

所有 Spec 都应视为不可信数据，包括 AI 生成或从数据库读取的 JSON。默认边界会拒绝未知组件、重复 ID、版本不匹配、非法 props、危险 JSON Pointer、禁止的展示属性、超限节点/查询以及策略越权。校验失败时资源查询数为零。

MVP 上限为 8 个数据源、24 个 Widget、每页 100 条、8 个过滤条件、3 个排序字段、64 字符 ID、64 层 JSON 嵌套和 10,000 个 JSON 节点。同一数据源只请求一次；generation 检查会丢弃过期响应。

收入合计等聚合指标应由后端 summary resource 提供，并通过 `resource-one` 绑定；不要从浏览器拿到的一页分页数据推导业务总计。

## 兼容性与后续路线

包内 `compatibility.json` 记录了支持的 Core/UI/Svelte 范围和经过测试的最低版本组合。packed-consumer 门禁同时覆盖不依赖 DOM 的 Node ESM 根入口与 Svelte/Vite 入口。

v1 wire contract 会继续保持精简。候选后续能力包括 revision 历史与 JSON Patch、由应用注入的持久化/审计接口，以及带人工确认的可选 Agent adapter。Dataset 快照、凭据、聚合计算和 Connector 调度仍归业务后端或应用负责；Canvas、iframe、任意代码和 mutation action 不会被默认纳入路线图。
