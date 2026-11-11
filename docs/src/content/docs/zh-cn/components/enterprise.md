---
title: 企业级组件
description: 面向 RBAC、审计查看、多租户、任务、身份治理、会话与凭据管理的企业后台构建块。
---

import { Tabs, TabItem } from '@astrojs/starlight/components';

svadmin 提供面向真实管理后台的**企业能力构建块**。组件和 Provider 契约本身不等于合规认证，也不是完整的身份平台。大多数组件遵循 **Headless + Wrapper** 双层架构：

- **Layer A（无头层）**：纯 UI 组件，通过 Props + Callbacks 驱动 — 不耦合任何后端
- **Layer B（封装层）**：可选的 `AuthProvider` 集成，实现开箱即用

## 生产边界

`AdminApp` 支持通过有类型的 `ProviderBundle` 向当前组件树注入后端能力：

```svelte
<script lang="ts">
  import { createProviderBundle } from '@svadmin/core';
  import { AdminApp } from '@svadmin/ui';

  const providerBundle = createProviderBundle({
    dataProvider,
    authProvider,
    accessControlProvider,
    auditLogProvider,
    organizationProvider,
    identityGovernanceProvider,
    sessionProvider,
    credentialProvider,
  });
</script>

<AdminApp {providerBundle} {resources} />
```

内置企业设置页在对应 Provider 缺失时会关闭操作，不会在浏览器生成伪 API Key、虚假会话或伪造保存结果。`CredentialProvider` 的 secret 仅能由 `createApiCredential` 创建时返回一次，列表接口只暴露元数据。

所有组织、身份治理、会话和凭据 Provider 方法都会收到 `EnterpriseRequestContext`，其中包含当前组件树的 `tenantId`，以及可选的 `requestId`、`traceId` 和租户元数据。Provider 必须使用该上下文约束每一次后端请求；只有 adapter 强制执行这个参数时，同一个 Provider 实例才能为多个 `AdminApp` 租户上下文服务。

可信后端仍必须负责认证、授权、租户隔离、密钥哈希与轮换、Webhook 投递、幂等、限流、保留策略执行和持久审计存储。凭据、会话、身份策略和角色权限变更，应由后端在同一事务或等价的原子流程中同时写入业务结果与审计记录。UI 回调和 `writeAuditEntry()` 无法让两个独立的远程写入自动获得事务性。

## 产品成熟度边界

组件是否已导出不等于产品能力已经完成。以下分层是当前企业级产品的交付边界：

分层表示目标和验收门槛，不是已完成声明。当前聚焦测试仅证明对应场景；公共 API 冻结、完整类型检查、浏览器验收、发布和线上验收仍须分别提供证据。

机器可读的当前边界见 `@svadmin/core` 的 `ENTERPRISE_MATURITY`：
P0 标记为 `stable`，P1 标记为 `verified`，P2 保持 `experimental` 或
`planned`。这份清单用于防止导出组件数量被误读为完整产品交付。

| 层级 | 产品承诺 | 当前判定标准 |
|---|---|---|
| P0 稳定交付 | 应用壳、资源 CRUD、表格与表单、权限租户、导入导出、审计与 Provider/SSR/Lite 基础能力 | 公共 API 已冻结；有直接行为、类型和 SSR/Lite 测试；失败时不伪造成功状态 |
| P1 已验证竞争力 | 高级表格、保存视图、导入向导、任务队列、审批、版本差异、Dashboard、多标签 | 有跨 UI/Core/Lite 的聚焦测试；租户、Provider、异步回执和错误边界已验证 |
| P2 扩展模块 | Kanban、Gantt、Pivot、Spreadsheet、决策表、PDF、打印、签名、批注、媒体库、协作、离线同步 | 作为可选能力按场景接入；不阻塞 P0/P1，不默认承诺完整业务后端、合规或同等 Lite 行为 |

P2 组件可以被使用，但其状态应按 `experimental` 或 `planned` 管理，直到完成对应场景的 API、SSR/Lite、集成和线上验收。任何层级都不代表认证、授权、租户隔离或审计持久化已经由浏览器组件自动完成。

## 企业交互组件目录

当前 UI 与 Lite 版本包含以下企业后台构建块。表中 Lite 组件均可安全用于 SSR，并且要么是直接的服务端对应实现，要么是已明确记录的语义降级方案。完整状态矩阵由 `packages/lite/PARITY.md` 自动生成。

| 领域 | SPA 组件 | Lite 对应组件 | 适用场景 |
|---|---|---|---|
| 数据录入 | `StepForm`、`ModalForm`、`DrawerForm` | 对应的 `Lite*` 组件 | 分步、模态框和抽屉式业务流程 |
| 数据表格 | `VirtualTable`、`EditableTable`、`DraggableRowTable`、`TableSummary`、`TreeTable` | 对应的 `Lite*` 组件 | 大数据量、行内编辑、排序、汇总和层级数据 |
| 查询与导入 | `ColumnSettings`、`ColumnHeaderFilter`、`ImportWizard`、`JsonSchemaForm` | 对应的 `Lite*` 组件 | 列选择、服务端过滤、批量导入和 Schema 表单 |
| 治理与留痕 | `ApprovalActionCard`、`SensitiveDataMask`、`VersionDiffViewer`、`Watermark` | 对应的 `Lite*` 组件 | 审批、敏感数据脱敏、版本复核和文档标记 |
| 工作管理 | `ActivityFeed`、`KanbanBoard`、`GanttChart`、`MultiTabKeepAlive` | 对应的 `Lite*` 组件 | 动态流、看板、排期和多工作区导航 |
| 媒体与文档 | `MediaLibraryModal`、`ImageCropper`、`PdfDocumentViewer`、`PrintableBill` | 对应的 `Lite*` 组件 | 素材选择、图片处理、PDF 审阅和可打印单据 |
| 协作状态 | `MentionsInput`、`PresenceAvatarGroup`、`OfflineSyncBanner` | 对应的 `Lite*` 组件 | 提及、在线状态和离线待同步变更 |
| 分析与规则 | `PivotTable`、`DecisionTable`、`CanvasAnnotation`、`SpreadsheetView`、`SignaturePad` | 对应的 `Lite*` 组件 | 多维分析、规则执行、标注、表格计算和签名 |
| 布局 | `SplitPaneLayout` | `LiteSplitPaneLayout` | 详情检查器和高密度双栏后台页面 |

`DevTools` 明确为仅 SPA 组件，因为它依赖浏览器端开发者工具。AI 交互组件现已归入
`@svadmin/ai-elements`，不计入 `@svadmin/ui` ↔ `@svadmin/lite` 对齐矩阵。

上述组件只是无头构建块。组件回调必须接入经过认证、按租户隔离的后端操作；渲染按钮或表单本身不会完成授权，也不会自动持久化业务变更。

---

## PermissionMatrix 权限矩阵

完全解耦的 RBAC 权限矩阵，用于管理 `(角色 × 资源 × 操作)` 的三维关联。

### Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `roles` | `RoleInfo[]` | 角色列表（`{ code, name }`） |
| `resources` | `ResourceInfo[]` | 资源列表，支持 `section` 分组 |
| `actions` | `ActionInfo[]` | 操作定义（增删改查等） |
| `isGranted` | `(role, resource, action) => boolean` | 外部注入的判权函数 |
| `selectedRole` | `$bindable<string>` | 当前选中角色（双向绑定） |
| `onToggle` | `(role, resource, action, grant) => void` | 权限变更回调 |
| `sidebarExtra` | `Snippet` | 左侧边栏扩展插槽（如租户/密级选择器） |
| `headerExtra` | `Snippet` | 顶部工具栏扩展插槽 |
| `loading` | `boolean` | 加载状态，禁用所有交互 |

### 使用示例

```svelte
<script>
  import { PermissionMatrix } from '@svadmin/ui';

  let policies = $state([]);

  function checkGrant(role, resource, action) {
    return policies.some(p => p.role === role && p.res === resource && p.act === action);
  }

  async function handleToggle(role, res, act, grant) {
    await fetch('/api/permissions', {
      method: 'POST',
      body: JSON.stringify({ role, res, act, grant })
    });
  }
</script>

<PermissionMatrix
  roles={[{ code: 'admin', name: '系统管理员' }, { code: 'editor', name: '编辑' }]}
  resources={[{ code: 'posts', name: '文章', section: '内容管理' }]}
  actions={[{ code: 'read', name: '读取' }, { code: 'write', name: '写入' }]}
  isGranted={checkGrant}
  onToggle={handleToggle}
>
  {#snippet sidebarExtra()}
    <p>租户：某某科技有限公司</p>
  {/snippet}
</PermissionMatrix>
```

### 内置设置集成

`<RolesSettings />` 组件内置了 `AuthProvider` 封装。当你使用 `<SettingsPage />` 时，它会自动出现在 `/settings/roles` 路由。

只需在 `AuthProvider` 上实现以下可选方法：

```ts
const authProvider: AuthProvider = {
  // ... login, logout, check, getIdentity ...
  getRoles: async () => [{ id: '1', name: 'Admin' }],
  getRolePermissions: async (roleId) => ({ posts: ['create', 'read'] }),
  updateRolePermissions: async (roleId, permissions) => ({ success: true }),
};
```

---

## AuditLogViewer 审计日志

审计日志查看器，内置搜索过滤、操作徽章以及 JSON 变更快照抽屉。是否达到合规要求，取决于后端的追加写存储、访问控制、保留策略、完整性保护和运维证据。

### AuthProvider 集成

```ts
const authProvider: AuthProvider = {
  getAuditLogs: async ({ page, pageSize }) => ({
    data: [
      { id: '1', userName: 'admin', action: 'update', resource: 'users',
        createdAt: new Date(), ipAddress: '192.168.1.1',
        details: { before: { name: '旧值' }, after: { name: '新值' } } }
    ],
    total: 100,
  }),
};
```

在 `<SettingsPage />` 中自动注册于 `/settings/audit` 路由。

---

## TenantSwitcher 多租户切换器

无刷新多租户工作区切换器，适合放置在 Sidebar 顶部。

```svelte
<script>
  import { TenantSwitcher } from '@svadmin/ui';

  const tenants = [
    { id: '1', name: '某某科技', logo: '/logo.png' },
    { id: '2', name: '另一公司' },
  ];

  let currentTenantId = $state('1');

  function handleSwitch(id: string) {
    location.href = `?tenant=${id}`;
  }
</script>

<TenantSwitcher {tenants} bind:currentTenantId onSwitch={handleSwitch} />
```

---

## TaskQueueDrawer 后台任务中心

显示实时进度条、状态指示器和下载/重试按钮的后台任务抽屉。

```svelte
<script>
  import { TaskQueueDrawer } from '@svadmin/ui';
  import { createClient } from '@supabase/supabase-js';
  import { createSupaCloudClient } from '@supacloud/js';
  import { createSupaCloudTaskProvider } from '@svadmin/supabase/supacloud';

  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
  const supacloud = createSupaCloudClient({
    supabase,
    managementApiUrl: import.meta.env.VITE_SUPACLOUD_API_URL,
    projectRef: import.meta.env.VITE_SUPACLOUD_PROJECT_REF,
  });
  const taskProvider = createSupaCloudTaskProvider({ supacloud });
</script>

<TaskQueueDrawer
  {taskProvider}
/>
```

`TaskQueueDrawer` 现在直接以 `TaskProvider` 作为一等输入，内置任务 / 死信 Tab、筛选、自动刷新、内联任务提交表单，以及与详情面板联动的正式任务中心体验。

---

## DraggableGrid 可拖拽网格

零依赖的拖拽式仪表盘网格，使用原生 HTML5 Drag & Drop API。

```svelte
<script>
  import { DraggableGrid } from '@svadmin/ui';

  let modules = $state([
    { id: 'revenue', title: '营收' },
    { id: 'users', title: '活跃用户' },
  ]);
</script>

<DraggableGrid bind:modules onOrderSave={(ids) => localStorage.setItem('order', JSON.stringify(ids))}>
  {#snippet renderItem({ module })}
    <div class="p-4 border rounded-lg bg-card">
      <h3>{module.title}</h3>
    </div>
  {/snippet}
</DraggableGrid>
```

---

## CanAccess / Can 权限门禁

声明式权限守卫组件，仅在用户有权限时渲染子元素。

```svelte
<CanAccess resource="posts" action="delete">
  <button>删除文章</button>
  {#snippet fallback()}
    <button disabled>无权限</button>
  {/snippet}
</CanAccess>
```

> `Can` 是 `CanAccess` 的简写别名。

---

## ArrayField 动态数组表单

用于一对多关系的动态嵌套表单字段（如订单明细、联系人列表）。

### Schema 定义

```ts
const fields: FieldDefinition[] = [
  {
    key: 'items',
    label: '订单明细',
    type: 'array',
    subFields: [
      { key: 'name', label: '商品名称', type: 'text', required: true },
      { key: 'quantity', label: '数量', type: 'number', required: true },
      { key: 'price', label: '单价', type: 'number' },
    ],
  },
];
```

在 `FieldDefinition` 中指定 `type: 'array'` 时，`AutoForm` 会自动渲染 `ArrayField`。

---

## 生产级防误删审查与滑动验证码套件

### `<SafeDeleteConfirm>` / `<DoubleCheckModal>`

高危破坏性操作强防护弹窗（如删生产集群、删租户、删库）：
- 目标全名强一致性匹配输入方可解锁确认按钮。
- 安全防误触：默认启用禁止粘贴（`preventPaste=true`），强制管理员手动键入。
- 关联影响评估清单（`impactList`）：直观呈现被删除子资源与级联数据量。
- 强制安全阅读倒计时（`countdown=3`），消除肌肉记忆误触风险。

```svelte
<script lang="ts">
  import { SafeDeleteConfirm } from '@svadmin/ui';

  let open = $state(false);

  async function handleDelete() {
    await fetch('/api/clusters/prod-east-01', { method: 'DELETE' });
  }
</script>

<SafeDeleteConfirm
  bind:open
  targetName="prod-east-01"
  title="删除生产集群"
  countdown={3}
  preventPaste={true}
  impactList={[
    { label: '挂载存储卷', count: 12 },
    { label: '生效副本集', count: 4 },
  ]}
  onconfirm={handleDelete}
/>
```

### `<SliderCaptcha>`

纯前端 Canvas / CSS 驱动的拼图凹槽比对验证码：
- 零外部图片依赖：程序化多色线性/径向渐变背景防伪渲染。
- 精准拼图凹凸形状裁剪与实时阴影凹槽比对。
- 滑动轨迹平滑度与耗时检测（`minTimeMs`），严防自动化机器人瞬时批量刷取。

```svelte
<script lang="ts">
  import { SliderCaptcha } from '@svadmin/ui';

  function handleSuccess({ token, elapsedMs }: { token: string; elapsedMs: number }) {
    console.log('验证成功 token:', token, '耗时:', elapsedMs);
  }
</script>

<SliderCaptcha
  width={320}
  height={160}
  minTimeMs={200}
  onsuccess={handleSuccess}
/>
```

## 企业级操作审计轨迹与字段变更差异套件

### `<AuditLogDrawer>` & `<AuditTimeline>`

高分辨率行级操作审计抽屉与字段 Diff 差异视图：
- 侧边抽屉一键呼出，无缝对接全局 `auditLogProvider` 或自定义 loader。
- 内置操作动作过滤（全部 / 新建 / 更新 / 删除 / 审批 / 回滚）与操作人/内容快速搜索。
- 自动计算并呈现字段级变更对比：红色删除线旧值、绿色高亮新值。
- 展示操作人头像/姓名、操作动作徽标、客户端 IP 地址与精准时间戳。

```svelte
<script lang="ts">
  import { AuditLogDrawer, Button } from '@svadmin/ui';

  let open = $state(false);
</script>

<Button onclick={() => open = true}>查看操作审计轨迹</Button>

<AuditLogDrawer
  bind:open
  resource="orders"
  recordId="101"
/>
```

## 实时在线协同感知与并发编辑冲突守卫

### `<PresenceAvatars>` / `<PresenceAvatarGroup>`

多管理员并发协同状态感知与活跃编辑者头像指示器：
- 层叠式头像聚簇展示，带平滑上浮微交互；
- 右下角在线状态呼吸灯（`editing` 脉冲呼吸、`viewing` 在线绿色、`idle` 离线灰色）；
- 支持配置最大可见头像数与 `+N` 溢出折叠气泡。

```svelte
<script lang="ts">
  import { PresenceAvatars } from '@svadmin/ui';

  const users = [
    { id: 'u1', name: '郭工', role: '架构师', status: 'editing' },
    { id: 'u2', name: '李工', role: '研发', status: 'viewing' },
  ];
</script>

<PresenceAvatars {users} maxCount={4} size="md" />
```

### `<ConcurrentConflictModal>`

乐观锁并发编辑冲突解决弹窗：
- 当多位管理员同时编辑同一条记录发生版本冲突时自动弹出；
- 左右分栏对照“我的本地修改” vs “服务器最新修改”；
- 灵活的处理策略：支持强制覆盖、放弃并刷新，或逐字段点选合并保存。

```svelte
<script lang="ts">
  import { ConcurrentConflictModal } from '@svadmin/ui';

  let open = $state(false);

  const conflictFields = [
    { field: 'title', label: '商品标题', localValue: '我的修改', remoteValue: '同事修改' },
    { field: 'price', label: '价格', localValue: 2499, remoteValue: 2699 },
  ];

  function handleMerge(mergedData: Record<string, unknown>) {
    console.log('合并数据：', mergedData);
  }
</script>

<ConcurrentConflictModal
  bind:open
  {conflictFields}
  modifiedBy="李工"
  onresolve={handleMerge}
/>
```

## 企业级指引漫游、指标走势与签名套件

### `<TourGuide>` / `<Tour>`

复杂后台系统分步业务功能漫游与指引套件：
- 纯 SVG 视口裁剪遮罩与动态聚光灯（Spotlight）镂空高亮目标元素，屏蔽背景点击穿透。
- 自适应防溢出浮动卡片定位与步骤导航切换。
- 本地状态记忆持久化（`storageKey`），用户跳过或完成后无需重复弹出。
- 完整键盘无障碍导航（`Tab`、`Escape`、方向键）与焦点锁定闭环。

```svelte
<script lang="ts">
  import { TourGuide } from '@svadmin/ui';

  let showTour = $state(true);

  const steps = [
    { target: '#search-box', title: '全局检索', description: '一键检索多租户与跨模块业务资源。' },
    { target: '#export-btn', title: '数据导出', description: '支持按当前过滤视图导出审计凭据与报表。' },
  ];
</script>

<TourGuide
  bind:open={showTour}
  {steps}
  storageKey="onboarding_v1_done"
  onfinish={() => console.log('漫游已完成')}
/>
```

### `<TrendIndicator>` / `<Trend>`

报表指标、大屏看板与财务结算同环比涨跌走势胶囊：
- 支持根据 `value` 与 `prevValue` 自动计算百分比涨跌幅。
- 支持纯数值、字符串增量格式化，可自定义精度、前缀（如 `YoY` / `环比`）与后缀（默认 `%`），支持 `showSign` 显式带符号增减量输出。
- 支持反向色彩语义（`reverseColor=true`），适配错误率、延迟、排队积压等跌为优的监控场景。
- 遵循设计系统规范语义 Token，提供 `text`、`badge`、`solid`、`icon`（紧凑纯图标）多种视觉形态。

```svelte
<script lang="ts">
  import { TrendIndicator } from '@svadmin/ui';
</script>

<!-- 自动计算百分比涨跌 -->
<TrendIndicator value={1250} prevValue={1000} prefix="YoY" variant="badge" />

<!-- 异常指标反向色彩语义 -->
<TrendIndicator value={-12.4} reverseColor={true} variant="solid" />

<!-- 紧凑纯图标形态 -->
<TrendIndicator value={8.5} variant="icon" prefix="MoM" />
```

### `<SignaturePad>`

移动审批与桌面结算场景的高保真电子签名手写板：
- 二次贝塞尔平滑压感笔触插值算法，告别直线锯齿。
- 完整的笔画历史栈：支持撤销（`Undo`）、重做（`Redo`）与一键清空重置。
- 安全合规导出规范：支持导出透明背景 PNG 与纯 SVG 矢量图格式（`toSVG()`）。
- 内置可选操作时间戳防篡改签名选项（`withTimestamp`）。
- 适配高分屏 DPI 与移动端触控交互防滚屏。

```svelte
<script lang="ts">
  import { SignaturePad } from '@svadmin/ui';

  let signatureData = $state('');

  function handleSave(dataUrl: string) {
    console.log('保存签名数据 URL:', dataUrl.length);
  }
</script>

<SignaturePad
  bind:value={signatureData}
  width={480}
  height={180}
  withTimestamp={true}
  onsave={handleSave}
/>
```

## 企业级树选择、调度器与架构图套件

### `<VirtualTreeSelect>`

支持万级大数据量虚拟滚动的树形层级选择器：
- 采用深度优先遍历拍平与动态展开状态管理，万级节点零卡顿。
- 动态计算可视视口窗口，仅渲染视口内切片，维持极低内存占用与流畅 60fps 滚动。
- 关键字搜索过滤自动回溯展开命中节点的全链路父级祖先分支。
- 支持单选与多选模式，多选支持级联全选/半选（Indeterminate）、已选项 Tag 标签回显与单独移除。

```svelte
<script lang="ts">
  import { VirtualTreeSelect } from '@svadmin/ui';

  let selected = $state<string[]>([]);

  const treeData = [
    {
      value: 'hq',
      label: '总部机构',
      children: [
        { value: 'eng', label: '研发中心', children: [
          { value: 'fe', label: '前端团队' },
          { value: 'be', label: '后端团队' },
        ]},
        { value: 'ops', label: '运维团队' },
      ],
    },
  ];
</script>

<VirtualTreeSelect
  bind:value={selected}
  options={treeData}
  multiple={true}
  searchable={true}
  placeholder="请选择所属组织架构..."
/>
```

### `<CronExpressionBuilder>`

企业级定时调度规则与任务周期可视化构建器：
- 支持标准 5 段 Cron 格式（分、时、日、月、周）。
- 内置常用高频预设方案（每分钟、每小时整点、每日零点、工作日上午 9 点、每月 1 号等）。
- 多 Tab 分步切换可视化配置，直观设定循环间隔与指定时间点。
- 实时语义解析（人类可读描述）与未来 5 次触发模拟时间预估，防范配置失误。

```svelte
<script lang="ts">
  import { CronExpressionBuilder } from '@svadmin/ui';

  let cronValue = $state('0 9 * * 1-5');
</script>

<CronExpressionBuilder
  bind:value={cronValue}
  showPreview={true}
  onchange={(val) => console.log('更新调度规则:', val)}
/>
```

### `<OrgChart>`

企业级组织架构与汇报树状交互图：
- 纯 CSS 驱动的上下级层级连线，结构清晰，响应式排版。
- 支持父节点折叠/展开，带下属汇报人数气泡徽标（`+N`）。
- 优雅的人员卡片布局（头像、姓名、职能职位、部门徽标），支持 Svelte 5 Snippet 自定义扩展。
- 支持节点点击交互事件（`onnodeclick`），用于查看人员详情或组织穿透。

```svelte
<script lang="ts">
  import { OrgChart } from '@svadmin/ui';

  const orgData = {
    id: 'ceo',
    name: '张三',
    title: '首席执行官',
    department: '总经办',
    children: [
      {
        id: 'cto',
        name: '李四',
        title: '技术副总裁',
        department: '技术中心',
        children: [
          { id: 'lead', name: '王五', title: '资深首席架构师', department: '基础平台部' },
        ],
      },
    ],
  };
</script>

<OrgChart
  data={orgData}
  onnodeclick={(node) => console.log('点击节点:', node.name)}
/>
```

### `<GaugeChart>` 与 `<MetricGrid>`

企业级大屏与仪表盘半环刻度仪与响应式度量指标网格套件：
- **`<GaugeChart>` (SpeedometerGauge)**：
  - 纯前端 SVG 矢量平滑渲染，支持 180° 半环、240° 速度计圆弧以及 270° 宽弧形刻度（`type="half" | "arc" | "circle"`）。
  - 多段阈值告警色带（如 0~60 正常绿、60~85 预警黄、85~100 危险红），深度接入 SVAdmin 语义设计系统 Tokens（`var(--success)`、`var(--warning)`、`var(--destructive)`）。
  - 双重呈现模式：平滑圆弧进度条、机械指示指针带旋转转轴、或两者兼具（`mode="progress" | "needle" | "both"`）。
  - 自定义刻度线与基准目标参考线（`target={80}`、`targetLabel="SLA 基线"`）。
  - 完整可访问性契约支持（`role="meter"`、`aria-valuenow`、`aria-valuemin`、`aria-valuemax`）。
- **`<MetricGrid>` (DashboardMetricGrid)**：
  - 自适应断点响应式网格布局，支持 1~6 列及自适应排版（`cols="auto"`）。
  - 内置骨架屏加载态支持（`loading={true}`、`skeletonCount={4}`）。
  - 内置空数据态占位支持（`empty={true}`、`emptyMessage="暂无指标监控数据"`）。
  - 无缝承载 `<GaugeChart>`、`<StatisticCard>`、`<MetricStrip>` 等各类度量卡片与图表。

```svelte
<script lang="ts">
  import { GaugeChart, MetricGrid, StatisticCard } from '@svadmin/ui';

  let cpuLoad = 78.5;
  let slaScore = 99.4;
</script>

<MetricGrid title="基础设施监控看板" description="生产集群实时期望指标与水位监控" cols={3}>
  <GaugeChart
    value={cpuLoad}
    label="CPU 负载率"
    unit="%"
    type="arc"
    mode="both"
    target={80}
    targetLabel="SLA 告警阈值"
    subtext="峰值：业务高峰期达 92.4%"
  />

  <GaugeChart
    value={slaScore}
    min={95}
    max={100}
    label="SLA 服务可用率"
    unit="%"
    type="half"
    mode="progress"
    thresholds={[
      { value: 98, tone: 'destructive', label: '违约告警' },
      { value: 99, tone: 'warning', label: '轻度风险' },
      { value: 100, tone: 'success', label: '健康达标' }
    ]}
  />

  <StatisticCard
    title="今日并发请求总数"
    value="1,428,950"
    trend={{ value: 12.8, label: '较昨日同时段' }}
  />
</MetricGrid>
```

---

## 微前端与嵌入式沙箱容器（MicroAppFrame / EmbeddedSandbox）

企业级微前端子应用接入与独立外部控制台集成容器：
- 安全的双向 `postMessage` 握手通信协议，支持来源域名白名单过滤（`allowedOrigins`）；
- 主子应用状态同步：自动将主系统当前的明暗主题（`light`/`dark`）、国际化语言及认证凭证传递给嵌入页面；
- 动态自适应高度：根据子页面上报的 `svadmin:resize` 消息自动撑开父容器，告别内外双滚动条；
- 支持一键沉浸式全屏放大浏览、顶栏重载刷新、新标签页直达及超时错误重试兜底。

```svelte
<script lang="ts">
  import { MicroAppFrame } from '@svadmin/ui';
</script>

<MicroAppFrame
  src="https://grafana.internal.net/d/telemetry-overview"
  title="集群实时遥测大屏"
  allowedOrigins={['https://grafana.internal.net']}
  theme="dark"
  autoResize
  onready={() => console.log('微应用握手完成')}
  onmessage={(msg) => console.log('收到微应用消息:', msg)}
/>
```

## 异步后台任务中心（TaskCenter / BackgroundTaskDrawer）

企业级大数据量异步导出、清洗与长时间运行作业跟踪中心：
- 顶栏/悬浮入口集成脉冲动态呼吸指示与运行中任务数角标；
- 侧拉抽屉支持多状态分栏过滤：全部、执行中（Running）、排队中（Pending）、已完成（Completed）、失败（Failed）；
- 实时百分比进度条、已处理条数统计（如 `6,800 / 10,000`）与剩余耗时智能预估；
- 具备成品文件一键下载、失败任务重试、作业取消中断及一键清理已完成记录等快捷操作。

```svelte
<script lang="ts">
  import { TaskCenter, type BackgroundTask } from '@svadmin/ui';

  let tasks: BackgroundTask[] = [
    {
      id: 'task-1',
      name: '2026年Q1销售流水总表异步导出',
      status: 'running',
      progress: 68,
      processedCount: 6800,
      totalCount: 10000,
      estimatedSecondsRemaining: 24,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      name: '客户主数据批量清洗转换',
      status: 'completed',
      downloadUrl: 'https://cdn.example.com/exports/customers.xlsx',
      downloadFileName: 'customers.xlsx',
      createdAt: new Date().toISOString(),
    },
  ];
</script>

<TaskCenter
  showTrigger
  tasks={tasks}
  ondownload={(task) => console.log('下载成果文件:', task.downloadUrl)}
  oncancel={(task) => console.log('终止作业:', task.id)}
  onretry={(task) => console.log('重试任务:', task.id)}
/>
```

---

## 离线断网自愈守卫套件（OfflineBanner 与 OfflineGuard）

移动与现场作业弱网/断网防丢保护套件：
- `useNetworkStatus()` 响应式网速与在线状态钩子，监听离线/上线事件及 `rtt` 延迟；
- `<OfflineBanner>`：全局顶部断网感应横条，断网时醒目提示已启用草稿备份，联网后平滑过渡显示恢复提示；
- `<OfflineGuard>`：表单提交保护守卫，离线状态下自动拦截表单提交或覆盖半透明防护层，防止数据丢失。

```svelte
<script lang="ts">
  import { OfflineBanner, OfflineGuard, useNetworkStatus } from '@svadmin/ui';

  const network = useNetworkStatus();
</script>

<!-- 全局断网横幅 -->
<OfflineBanner
  onretry={() => console.log('正在检测网络连接...')}
/>

<!-- 表单提交防丢保护层 -->
<OfflineGuard mode="overlay">
  <form onsubmit={(e) => { e.preventDefault(); /* 提交逻辑 */ }}>
    <input placeholder="请输入标题" />
    <button type="submit">提交表单</button>
  </form>
</OfflineGuard>
```

---

## 企业级条形码、动态数字翻牌与万级虚拟列表套件

专为企业资产与物流仓储追踪、财务数据大屏看板、海量高频日志或消息流设计的性能交互套件：

- **`<Barcode>`**：纯 SVG 矢量条形码生成器，支持标准 CODE128、CODE39 以及 EAN-13 格式，零重量级外部 Canvas 依赖，纯原生矢量渲染，内置一键复制与原生打印操作。
- **`<NumberRoll>`**：基于 Ease-Out 四次缓动的平滑数字翻牌器，适用于财务报表、交易额汇总与实时指标大屏。支持千分位格式化、浮点数精度、货币单位前后缀与涨跌趋势色/图标自适应联动。
- **`<VirtualList>`**：万级大数据量通用虚拟滚动容器，支持动态或固定行高、视口上下缓冲切片计算。仅挂载视口可见 DOM 元素，轻松实现万级日志流或长列表 60fps 丝滑交互，并提供触底自动加载更多和滚动到指定项索引功能。

### Barcode 条形码示例

```svelte
<script lang="ts">
  import { Barcode } from '@svadmin/ui';
</script>

<!-- 物流资产标签条码与操作栏 -->
<Barcode
  value="SVADMIN-LOGISTICS-2026"
  format="CODE128"
  height={70}
  width={2}
  showActions
/>
```

### NumberRoll 动态数字翻牌器示例

```svelte
<script lang="ts">
  import { NumberRoll } from '@svadmin/ui';
</script>

<div class="flex items-center gap-6">
  <!-- 财务营业额千分位与货币前缀展示 -->
  <NumberRoll
    value={128450.5}
    from={0}
    duration={1500}
    decimals={2}
    prefix="¥"
    separator=","
  />

  <!-- 同比增长率与趋势自适应色彩及图标 -->
  <NumberRoll
    value={24.8}
    decimals={1}
    suffix="%"
    trendColor
    showTrendIcon
  />
</div>
```

### VirtualList 万级虚拟滚动长列表示例

```svelte
<script lang="ts">
  import { VirtualList } from '@svadmin/ui';

  interface LogEntry {
    id: string;
    level: string;
    message: string;
    timestamp: string;
  }

  // 10,000 条长日志极速虚拟滚动
  const logs: LogEntry[] = Array.from({ length: 10000 }, (_, i) => ({
    id: `log-${i}`,
    level: i % 10 === 0 ? 'ERROR' : 'INFO',
    message: `系统业务审计事务日志 #${i + 1}`,
    timestamp: new Date().toISOString(),
  }));
</script>

<VirtualList
  items={logs}
  itemHeight={52}
  height={400}
  overscan={5}
  keyField="id"
  onendreached={() => console.log('已触达日志流底部')}
>
  {#snippet children(log, index)}
    <div class="flex items-center justify-between px-4 py-2 w-full border-b border-border/40 text-xs">
      <span class="font-mono text-muted-foreground">#{index + 1}</span>
      <span class="font-medium {log.level === 'ERROR' ? 'text-destructive' : 'text-foreground'}">
        [{log.level}] {log.message}
      </span>
      <span class="font-mono text-muted-foreground">{log.timestamp}</span>
    </div>
  {/snippet}
</VirtualList>
```

### `<UnsavedChangesGuard>` 与 `useUnsavedChanges`

企业级未保存修改防误关与离开页面拦截守卫套件：
- **`useUnsavedChanges`**：
  - 自动响应式监听表单是否处于脏修改状态（`isDirty`）。
  - 拦截浏览器关闭标签页或刷新窗口事件（`beforeunload`），触发系统级提示。
  - 拦截内部 SPA 路由跳转、导航链接点击与浏览器后退历史（`popstate`）。
  - 提供编程式的 `proceed()`、`cancel()` 与 `setDirty()`，支持 `onLeave` 与 `onStay` 回调。
- **`<UnsavedChangesGuard>` (UnsavedChangesModal)**：
  - 声明式表单保护容器，无缝对接 `<AutoForm>`、`<DrawerForm>` 与复杂配置页面。
  - 内置无障碍二次确认模态窗（`role="alertdialog"`），支持自定义提示文案、继续编辑与放弃离开按钮。
  - 100% 契合 SVAdmin 语义设计系统 Tokens。

```svelte
<script lang="ts">
  import { UnsavedChangesGuard } from '@svadmin/ui';

  let isFormDirty = $state(false);
</script>

<UnsavedChangesGuard
  isDirty={isFormDirty}
  title="检测到未保存的表单修改"
  message="当前表单已有编辑内容，若现在离开页面，所有未保存的数据将永久丢失。"
  stayText="继续留在本页编辑"
  leaveText="确认丢弃并离开"
  onleave={() => console.log('用户确认丢弃修改')}
  onstay={() => console.log('用户选择继续编辑')}
>
  <form oninput={() => (isFormDirty = true)}>
    <!-- 业务表单字段 -->
  </form>
</UnsavedChangesGuard>
```

## 企业级数据看板与业务洞察套件

### `<KpiCard>`

面向运营大屏、财务与高管看板的多维 KPI 计分卡：
- 集成主指标数值格式化、千分位及自定义货币前后缀。
- 内置同环比走势胶囊（`<TrendIndicator>`），自动对比上一期指标并高亮涨跌幅。
- 内置纯 SVG 平滑 Sparkline 走势微图与目标达成率进度条（Target Progress Bar）。
- 支持骨架屏加载过渡态（`loading`）与 SLA 阈值异常预警横幅（`alertStatus` / `alertMessage`）。

```svelte
<script lang="ts">
  import { KpiCard } from '@svadmin/ui';

  const revenueSparkline = [12, 18, 15, 24, 38, 35, 52];
</script>

<KpiCard
  title="季度总营收"
  value={1284500}
  prefix="¥"
  prevValue={1050000}
  trendPrefix="YoY"
  sparklineData={revenueSparkline}
  sparklineTone="success"
  targetProgress={{ current: 1284500, target: 1500000, label: 'Q3 目标达成' }}
  badge="核心 KPI"
/>
```

### `<JsonViewer>`

专为 API 调试、Webhook 投递 Payload、审计日志变更前/后对比及配置中心设计的高保真树形 JSON 查看器：
- 严格色彩语法高亮（键名、字符串、数值、布尔值及 Null）。
- 支持基于 `initialDepth` 的层级折叠展开与交互式展开控制。
- 关键词即时检索过滤，高亮命中属性与内容。
- 支持一键复制完整格式化 JSON 字符串，并支持浮动单属性路径复制。

```svelte
<script lang="ts">
  import { JsonViewer } from '@svadmin/ui';

  const webhookPayload = {
    event: 'order.created',
    timestamp: '2026-11-11T14:00:00Z',
    data: { orderId: 'ORD-98213', amount: 450.8, isPaid: true },
  };
</script>

<JsonViewer data={webhookPayload} initialDepth={2} searchable={true} copyable={true} />
```

### `<ResultPage>`

标准化企业级业务流程结果与状态异常反馈页：
- 标准化覆盖 `success`、`processing`、`warning`、`error`、`403`、`404` 与 `500` 七大核心状态。
- 大号语义矢量图标辅以柔和微光光晕，版面层次分明。
- 内置主次按钮组响应与自定义操作栏插槽。
- 支持 `card`（容器内嵌）与 `page`（全屏居中）双重布局模式，并提供下属关联业务详情摘要插槽。

```svelte
<script lang="ts">
  import { ResultPage } from '@svadmin/ui';
</script>

<ResultPage
  status="success"
  title="项目创建成功"
  description="您的多租户企业项目已初始化完成，预计 2 分钟内同步完成权限映射。"
  primaryActionText="前往工作台"
  onPrimaryAction={() => console.log('前往工作台')}
  secondaryActionText="继续创建"
  onSecondaryAction={() => console.log('继续创建')}
/>
```

### `<WatermarkContainer>`

防篡改企业级动态水印防护套件：
- 专为涉密财务看板、人力薪酬数据与高管大屏设计。
- 支持员工工号、租户信息、访问 IP 与动态时间戳等多行水印平铺。
- **防篡改安全机制**：内置 `MutationObserver` 严密监听 DOM 树变动与内联样式操纵，当发生恶意删除水印节点或注入 `display: none` / `opacity: 0` 时，毫秒级自愈还原，杜绝截图泄密。

```svelte
<script lang="ts">
  import { WatermarkContainer } from '@svadmin/ui';
</script>

<WatermarkContainer
  content={['SVAdmin 企业级办公', '机密数据 严禁外传 - 2026-11-11', '操作人工号: 9527']}
  gapX={48}
  gapY={48}
  antiTamper={true}
>
  <div class="p-8 bg-card border rounded-lg shadow-sm">
    <h3 class="text-lg font-semibold">2026 第四季度核心财务报表</h3>
    <p class="text-sm text-muted-foreground mt-2">敏感数据区域，已受防篡改动态水印全程保护...</p>
  </div>
</WatermarkContainer>
```

### `<ContextMenu>`

企业级右键上下文操作菜单套件：
- 无缝挂载于数据表格行（Table Row）、组织架构树节点（TreeNode）、看板卡片与文件列表。
- 内置视口智能碰撞算法，根据屏幕边缘自适应镜像翻转对齐，防止菜单超出可视窗口被截断。
- 完整支持快捷键提示徽标（Shortcut hints）、多级子菜单、分割线、禁用态与危险操作警示色。

```svelte
<script lang="ts">
  import { ContextMenu, type ContextMenuItem } from '@svadmin/ui';

  const menuItems: ContextMenuItem[] = [
    { key: 'copy', label: '复制 ID', shortcut: '⌘C' },
    { key: 'export', label: '导出明细' },
    { key: 'sep1', label: '', divider: true },
    { key: 'delete', label: '删除记录', danger: true, shortcut: 'Del' },
  ];
</script>

<ContextMenu items={menuItems} onselect={(item) => console.log('选中操作:', item.key)}>
  <div class="p-6 border rounded-md bg-muted/20 text-center select-none cursor-context-menu">
    在此区域内点击鼠标右键即可呼出企业级快捷上下文菜单
  </div>
</ContextMenu>
```

### `<OtpInput>`

企业双因子认证（2FA）与安全敏感操作验证码方格：
- 专为二次身份核验、大额资金划转审批、不可逆危险操作验证等场景打造。
- 连续键入自动聚焦下一格、Backspace 自动回退、全键盘左右光标移动。
- 剪贴板一键粘贴智能识别，自动过滤非法字符并分发填入对应格点。
- 支持密码点掩码显示（`●`）、错误告警状态与多尺寸预设（`sm`、`md`、`lg`）。

```svelte
<script lang="ts">
  import { OtpInput } from '@svadmin/ui';

  let verifyCode = $state('');
</script>

<OtpInput
  length={6}
  bind:value={verifyCode}
  type="number"
  autoFocus={true}
  oncomplete={(val) => console.log('2FA 验证码输入完成:', val)}
/>
```

### `<AnnouncementBanner>`

企业全站广播通知横幅与停服倒计时公告条：
- 适用于重大系统维护停服通知、多租户欠费风险预警、版本发布更新公告与紧急安全提示。
- 支持 `info`、`warning`、`error` 与 `success` 四大语义状态，内置矢量图标并采用语义色彩令牌。
- **停机维护倒计时**：传入 `countdownTo` 即可自动计算并高亮显示剩余维护倒计时（如 `01:45:20`），并可在归零时触发 `oncountdownend` 回调。
- **多条轮播与交互**：支持多条公告列表自动轮播（`interval`）与手动上一条/下一条切换，并可在用户关闭后通过 `storageKey` 自动持久化记忆。

```svelte
<script lang="ts">
  import { AnnouncementBanner } from '@svadmin/ui';

  const scheduledTime = new Date(Date.now() + 3600 * 1000 * 4);
</script>

<AnnouncementBanner
  tone="warning"
  message="系统计划于今晚 22:00 进行例行数据归档与硬件扩容升级，届时写入服务将短暂暂停。"
  countdownTo={scheduledTime}
  countdownPrefix="距维护开始还剩: "
  actionText="查看变更计划"
  actionHref="/maintenance/plan"
  closable={true}
  storageKey="announcement-maintenance-202611"
/>
```

### `<TextDiffViewer>`

企业级文本与配置双栏/单栏差异对比器：
- 专为配置中心发布审查、SQL 脚本审批对比、审批流大文本变更轨迹与代码审查打造。
- 纯前端动态规划 LCS 差异算法，零臃肿依赖，毫秒级逐行对比与字符高亮。
- **双栏并排与单栏内联**：支持在 `split`（左右并排对齐）与 `unified`（单栏内联流式）两种视图模式间一键切换。
- **智能折叠与统计**：支持折叠未修改的上下文行（`collapseUnchanged`），仅聚焦变更行；顶部提供新增、删除、未变更行数统计与一键复制对比文本操作。

```svelte
<script lang="ts">
  import { TextDiffViewer } from '@svadmin/ui';

  const baseline = `server_port: 8080\nmax_connections: 500\nlog_level: info\ncache_enabled: false`;
  const current = `server_port: 8080\nmax_connections: 2000\nlog_level: debug\ncache_enabled: true\ncluster_mode: active`;
</script>

<TextDiffViewer
  oldText={baseline}
  newText={current}
  oldTitle="生产运行配置 (v1.2)"
  newTitle="待发布配置 (v1.3)"
  viewMode="split"
  collapseUnchanged={false}
/>
```

### `<AsyncExportModal>`

企业级大数据异步导出中心与列选择弹窗：
- 专为万级/百万级数据异步导出设计，防止前端同步下载引起浏览器卡死或请求网关超时。
- **全生命周期流转**：参数配置（文件名、导出格式、数据范围、字段列全选/反选）-> 异步导出生成进度条 -> 成功下载与链接复制 -> 失败重试。
- 支持 `.xlsx`（Excel 规范表格）、`.csv`（纯文本逗号分隔）与 `.json`（结构化数组）多种企业常用格式。

```svelte
<script lang="ts">
  import { AsyncExportModal } from '@svadmin/ui';

  let isExportOpen = $state(false);

  const columns = [
    { key: 'orderNo', label: '订单流水号', defaultSelected: true },
    { key: 'customer', label: '所属客户', defaultSelected: true },
    { key: 'amount', label: '交易金额', defaultSelected: true },
    { key: 'createdAt', label: '创建时间', defaultSelected: true },
    { key: 'remark', label: '审批备注', defaultSelected: false },
  ];
</script>

<button onclick={() => (isExportOpen = true)}>打开异步导出中心</button>

<AsyncExportModal
  bind:open={isExportOpen}
  resourceName="财务订单"
  defaultFileName="2026Q4财务核销汇总表"
  totalCount={154200}
  filteredCount={3200}
  selectedCount={4}
  {columns}
  onclose={() => (isExportOpen = false)}
/>
```

### `<RecordCompareModal>` 与 `<EntityComparisonDrawer>`

企业级多实体记录参数并排对比与差异透视套件：
- **多列并排矩阵**：横向并排对比 2~5 条实体记录，首列固定属性标签名，跨字段纵览更直观。
- **差异高亮聚焦**：支持一键切换“仅显示差异项”（兼容 `defaultHideIdentical` 别名），采用扁平主色高亮与克制设计。
- **基准实体切换**：可任意指定基准记录列（Baseline 👑），其他记录自动与其对比。
- **一键差异同步**：支持将基准记录上的特定字段一键同步/覆写至目标记录（`onsync`）。
- **双模交互呈现**：支持大屏居中弹窗（`layout="modal"`）与右侧滑出抽屉（`layout="drawer"`）。

```svelte
<script lang="ts">
  import { RecordCompareModal } from '@svadmin/ui';

  let showCompare = $state(true);
  const serverNodes = [
    { id: 'node-01', name: '主节点-A', cpu: '16 核', memory: '64 GB', region: '华东-1' },
    { id: 'node-02', name: '从节点-B', cpu: '32 核', memory: '64 GB', region: '华东-1' },
    { id: 'node-03', name: '金丝雀-C', cpu: '8 核', memory: '32 GB', region: '华西-2' },
  ];
</script>

<RecordCompareModal
  bind:open={showCompare}
  title="集群节点规格横向对比"
  records={serverNodes}
  benchmarkIndex={0}
  onsync={(source, target, field) => console.log(`同步字段 ${field} 到 ${target.name}`)}
/>
```
