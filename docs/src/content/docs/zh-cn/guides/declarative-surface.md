---
title: 声明式 Surface
description: 对受策略约束的 JSON 仪表盘进行版本化、审查和渲染
---

`@svadmin/surface` 是一个可选的浏览器端包，用于构建比自动 CRUD 页面更灵活的仪表盘和运营视图。它接收版本化 JSON Spec，先校验整份文档，再执行只读资源查询，并且只渲染宿主注册的可信组件。

`surface/v1` wire contract 仍然保持精简。持久化、revision、受限 Patch、可信 Action 和 Live 失效刷新都是宿主控制的独立层；带人工审批的 Agent 提案位于可选包 `@svadmin/surface-agent`。

```bash
bun add @svadmin/surface @svadmin/core @svadmin/ui @tanstack/svelte-query svelte zod
# 只有需要 Agent 提案时才安装：
bun add @svadmin/surface-agent
```

## 分层 API

| 入口 | API | 职责 |
| --- | --- | --- |
| `@svadmin/surface` | Spec 校验、Document、Store、Patch、Action | 不依赖 DOM 的协议与受控状态变更 |
| `@svadmin/surface/svelte` | `SurfaceRenderer`、Catalog、Live 接入 | 可信浏览器渲染 |
| `@svadmin/surface-agent` | 提案校验与工作流 | 待审提案、摘要、批准/拒绝 |
| `@svadmin/surface-agent/svelte` | `SurfaceProposalReview` | 展示 before/after 的人工审查 UI |

Renderer 仍然只使用 `Pick<DataProvider, 'getList' | 'getOne'>`。Spec 不能选择 Provider、访问 URL 或声明 Action handler。

## 渲染 Surface

```svelte
<script lang="ts">
  import type { SurfacePolicy, SurfaceSpec } from '@svadmin/surface';
  import {
    DEFAULT_SURFACE_CATALOG_VERSION,
    SurfaceRenderer,
    type SurfaceLiveProvider,
  } from '@svadmin/surface/svelte';

  const policy = {
    resources: {
      products: {
        readFields: ['id', 'name', 'stock'],
        filterFields: ['stock'],
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

  const liveProvider: SurfaceLiveProvider = appLiveProvider;
  let renderer = $state<{
    refresh(sourceId?: string): Promise<void>;
    executeAction(action: unknown): Promise<unknown>;
  }>();
</script>

<button type="button" onclick={() => renderer?.refresh()}>刷新</button>
<SurfaceRenderer bind:this={renderer} {spec} {policy} {liveProvider} liveMode="auto" />
```

`liveMode` 默认是 `off`。设置为 `auto` 后，只为通过当前读取权限检查的资源建立订阅。Live event 仅作为失效提示，它的 payload 永远不会传给 Widget；突发事件会合并，刷新前重新检查授权，过期 generation 会被丢弃，组件或资源集合变化时会解除订阅。

`refresh(sourceId?)` 与 `executeAction(action)` 是可信宿主方法。它们不会进入 wire contract，刷新也不会重建 Widget DOM。

## Document、草稿、发布与回滚

`SurfaceDocument` 在有效 `SurfaceSpec` 外增加 `scopeId`、不可变 `revision`、`draft`/`published` 阶段、时间与 provenance。`SurfaceStore` 由应用注入：

```ts
interface SurfaceStore {
  read(request: SurfaceStoreReadRequest): Promise<SurfaceDocument | null>;
  history(request: SurfaceStoreHistoryRequest): Promise<readonly SurfaceDocument[]>;
  append(request: SurfaceStoreAppendRequest): Promise<SurfaceStoreAppendResult>;
}
```

生产 `append()` 必须原子执行 `expectedRevision` 比较与追加。推荐数据库模型使用不可变 revision 表、`(scope_id, surface_id, revision)` 唯一约束，以及事务或条件插入。内置 `createMemorySurfaceStore()` 只适合示例和确定性测试，不是生产持久化方案。

```ts
const dependencies: SurfaceDocumentDependencies = {
  store,
  catalog,
  policy,
  authorize: async ({ scopeId, surfaceId, actorId, action }) =>
    permissions.canChangeSurface({ scopeId, surfaceId, actorId, action }),
};

const saved = await saveSurfaceDraft({
  dependencies,
  scopeId: 'tenant:acme',
  spec,
  expectedRevision: 4,
  actorId: currentUser.id,
  operationId: crypto.randomUUID(),
});
```

`saveSurfaceDraft`、`publishSurfaceDocument`、`rollbackSurfaceDocument`、`readSurfaceDocument` 和 `listSurfaceDocumentHistory` 都返回 Result。发布和回滚只追加新 revision；回滚会把目标历史 Spec 复制为一个新草稿，绝不改写或删除历史。后续草稿也不会覆盖“最新已发布”选择器。

## 受限 Patch

Surface Patch 有意小于通用 JSON Patch：

- 只接受 `add`、`remove`、`replace`、`test`；
- 只允许修改 `/title`、`/layout`、`/dataSources`、`/widgets`；
- 禁止修改 schema/catalog 版本与 `surfaceId`；
- 禁止 `move`、`copy`、`from`、原型键、非规范数组下标，以及非最终 `add` 位置的数组 `-`；
- 最多 64 个操作，Pointer 最长 512 字符；
- 应用后重新执行 JSON-safe、Policy、Catalog 与完整 `SurfaceSpec` 校验。

`previewSurfacePatch()` 返回 `before`、`after` 与变化路径，不写入数据。`commitSurfacePatch()` 会重新读取 base revision、执行写权限检查，并通过 compare-and-swap 追加。校验失败、越权、revision 过期或 `test` 失败时写入数为零。

## 可信 Action Registry

Action 是宿主运行时能力，永远不会序列化进 `SurfaceSpec`。默认 Registry 提供：

- `refreshSource`：刷新一个或所有数据源；
- `setFilter`、`clearFilter`：管理经过 Policy 校验的临时过滤器；
- `navigateResource`：只把允许的 resource 与可选 record ID 交给宿主回调。

自定义 Action 通过 `defineSurfaceActionRegistry()` 注册严格 Zod schema。Handler 是可信可执行代码，因此权限应尽量窄，任何副作用仍需后端授权。不要接受原始 URL、JavaScript、Provider 选择、凭据或任意 mutation 参数。

## Agent 提案与人工审批

`@svadmin/surface-agent` 只接受 `AgentProvider` 输出的一个 `svadmin.surface.patch-proposal/v1` 组件；任何 tool call、approval event 或 tool result 都会被拒绝。Agent 只能给出目标 Surface、base revision、摘要和受限操作；scope、proposal ID、当前用户、Authorizer、Store、Policy 与 Catalog 全部由宿主提供。

```ts
const workflow = createSurfaceAgentWorkflow({
  dependencies,
  scopeId: 'tenant:acme',
  surfaceId: 'inventory',
});

const proposed = await workflow.request(agentOutput);
if (!proposed.ok) throw new Error(proposed.error.code);
// 渲染 proposed.review.before 与 proposed.review.after。
const applied = await workflow.approve({
  proposalId: proposed.review.proposalId,
  actorId: currentUser.id,
  operationId: crypto.randomUUID(),
});
```

工作流生成宿主管理的 proposal ID，把 scope/surface/base/catalog/summary/operations 绑定进 SHA-256 digest，并计算完整可见的 Preview 后进入 pending。批准是单次操作：重新检查过期时间和状态，先授权 `approve`，再重读并重校验文档、授权实际 `write`，最后通过 compare-and-swap 提交。拒绝、过期、重放、非法输出或 revision 漂移均为零写入。

首个 Adapter 的 pending proposal 存在内存中。如果生产环境要求跨进程重启保留，应用应在服务端持久化提案和审计状态。绝不能向 Agent 暴露 `SurfaceStore`、`DataProvider`、Action handler、actor/scope 选择或审批凭据。

## Policy 与威胁模型

Spec、存储的 Document、Provider 结果、Live event、Action、Patch 文档和 Agent 输出都必须视为不可信。实现会拒绝继承/accessor/symbol 属性、循环引用、稀疏数组、超深/超量节点、危险 Pointer、未知 Widget/resource/Action、重复 ID、越权字段和非 JSON 值。普通非法输入返回可序列化错误，不依赖异常表达。

浏览器读权限检查与写 Authorizer 都只是展示/工作流门控。后端必须独立认证和授权资源读取及持久化写入，不能信任浏览器提交的 Policy、scope、actor、revision 或审批状态。

收入合计等聚合指标应由后端 summary resource 提供，并通过 `resource-one` 绑定；不要从浏览器拿到的一页分页数据推导业务总计。

## 兼容性与剩余边界

两个包都发布 `compatibility.json`。packed-consumer 门禁覆盖 Node ESM 根入口、Svelte/Vite 子入口，以及 release-prepared 的 `@svadmin/surface-agent` peer range。

仍不包含：SSR/Lite 渲染、Canvas、iframe、任意 HTML/CSS/代码/URL、Spec 声明 Action、通用 CRUD mutation、轮询、客户端聚合、Dataset 快照、凭据、Connector 调度和生产持久化 Adapter。这些边界保证 `surface/v1` 可预测、可审计。
