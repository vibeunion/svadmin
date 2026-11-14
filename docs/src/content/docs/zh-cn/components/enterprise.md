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

### `<StepWizard>`

企业级分步引导向导与任务执行流套件：
- 支持水平与垂直两种步骤条布局，具备 `wait`、`process`、`finish`、`error` 状态精准指示。
- **异步校验守卫**：支持 `beforeNext?: (stepIndex, step, draft) => Promise<boolean>`，校验不通过阻断下一步并智能提示错误。
- **动态分支支持**：支持根据前序步骤动态挂载不同分支子步骤（`condition?: (draft) => boolean`）。
- **草稿自动暂存**：支持 `storageKey` 断点续填与步骤回溯，刷新页面无损还原未提交草稿。

```svelte
<script lang="ts">
  import { StepWizard, type StepWizardItem } from '@svadmin/ui';

  const steps: StepWizardItem[] = [
    { id: 'tenant', title: '租户信息', description: '基础空间标识' },
    { id: 'cloud', title: '云资源配置', description: '配置 VPC 与集群' },
    { id: 'confirm', title: '确认开通', description: '检查开通摘要' },
  ];

  let currentStep = $state(0);
  let draft = $state({ name: '', region: 'cn-hangzhou' });

  async function validateStep(index: number) {
    if (index === 0 && !draft.name) return false;
    return true;
  }
</script>

<StepWizard
  {steps}
  bind:currentStep
  bind:draft
  storageKey="tenant-onboarding-wizard"
  beforeNext={validateStep}
  onFinish={(data) => console.log('开通完成:', data)}
/>
```

### `<WorkflowStepper>`

面向长周期后台流水线、云资源开通及多阶段任务执行的可视化执行流套件：
- 覆盖 `wait`、`running`、`completed`、`failed`、`blocked`、`skipped` 全状态机，附带动态加载指示器。
- 原生耗时格式化（如 `450ms`、`12.4s`）与节点启动时间戳呈现。
- 支持单步失败智能重试（`onRetry`）及节点详情插槽（`stepDetail`）。

```svelte
<script lang="ts">
  import { WorkflowStepper, type WorkflowStepItem } from '@svadmin/ui';

  const pipeline: WorkflowStepItem[] = [
    { id: 'vpc', label: '创建虚拟专有网络 VPC', status: 'completed', durationMs: 820 },
    { id: 'k8s', label: '初始化容器集群', status: 'running' },
    { id: 'dns', label: '分配全局 Anycast IP', status: 'wait' },
  ];
</script>

<WorkflowStepper
  steps={pipeline}
  title="基础设施自动化编排"
  onRetry={(step) => console.log('重试步骤:', step.id)}
/>
```

### `<ColumnVisibilityDrawer>`

针对 30~50 字段宽表的高级列管理器与多维持久化抽屉：
- 字段勾选显隐、业务必选列强制锁定（`col.required`）、左右侧列锁定（`fixed: 'left' | 'right'`）。
- 原生平滑拖拽排序（零重量级外部依赖），带抓取视觉反馈与键盘微调支持。
- 用户自定义列视图持久化（`storageKey` 自动同步 `localStorage`，刷新还原）与一键视图预设（“精简视图”、“财务全量视图”）。

```svelte
<script lang="ts">
  import { ColumnVisibilityDrawer, type ColumnItem } from '@svadmin/ui';

  let open = $state(false);
  let columns = $state<ColumnItem[]>([
    { key: 'id', label: '单号', visible: true, required: true },
    { key: 'name', label: '客户姓名', visible: true, fixed: 'left' },
    { key: 'revenue', label: '年度营收', visible: true },
    { key: 'taxNo', label: '税号', visible: false },
  ]);

  const presets = [
    { id: 'compact', label: '精简视图', visibleKeys: ['id', 'name', 'revenue'] },
  ];
</script>

<button onclick={() => (open = true)}>列配置</button>

<ColumnVisibilityDrawer
  bind:open
  bind:columns
  {presets}
  storageKey="customer-table-columns"
/>
```

### `<ColumnFilterBuilder>`

多条件 `AND` / `OR` 嵌套逻辑树组合筛选抽屉：
- 支持多层条件组嵌套与丰富操作符（`eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`, `between`, `null` 等）。
- 触发按钮自带生效筛选数角标，无缝编译为 `@svadmin/core` Filter 契约。

```svelte
<script lang="ts">
  import { ColumnFilterBuilder } from '@svadmin/ui';
  import type { FieldDefinition, Filter } from '@svadmin/core';

  const fields: FieldDefinition[] = [
    { key: 'status', label: '状态', type: 'select' },
    { key: 'amount', label: '金额', type: 'number' },
  ];

  let filters = $state<Filter[]>([]);
</script>

<ColumnFilterBuilder
  showTrigger={true}
  {fields}
  bind:filters
  onApply={(compiled) => console.log('已应用过滤条件:', compiled)}
/>
```

### `useHotkeys` 与 `<KeyboardShortcutsModal>`

企业级全局热键监听与快捷键总览套件：
- **`useHotkeys`** 响应式钩子：支持组合键（`Mod+S`, `Shift+?`, `Alt+T`）及单字符（`J/K`, `Escape`）。智能规避输入冲突：在 input、textarea 输入时自动屏蔽单字符热键，组合键始终生效。
- **`<KeyboardShortcutsModal>`**：仿 Linear / macOS 风格的全量快捷键分类矩阵，支持全局检索与当前活跃注册热键动态汇总。

```svelte
<script lang="ts">
  import { useHotkeys, KeyboardShortcutsModal } from '@svadmin/ui';

  let isShortcutsModalOpen = $state(false);

  // 注册全局表单保存快捷键
  useHotkeys('Mod+S', () => console.log('保存当前表单...'), {
    label: '保存当前表单',
    description: '触发提交与保存',
    category: 'action',
  });

  useHotkeys(['?', 'Shift+?'], () => {
    isShortcutsModalOpen = !isShortcutsModalOpen;
  });
</script>

<KeyboardShortcutsModal bind:open={isShortcutsModalOpen} />
```

### `<SensitiveDataMask>` / `<MaskedText>`

敏感数据动态脱敏与显隐鉴权组件：
- 内置常见预设脱敏规则（`phone` / `mobile`、`id-card` / `idCard`、`bank-card` / `bankCard`、`email`、中文及英文 `name`）。
- 点击“小眼睛”图标触发 `onReveal` 权限核验与操作审计记录回调。
- 安全复制防护（支持配置 `copyMode="masked" | "raw" | "auto"`），严防剪贴板数据泄露。

```svelte
<script lang="ts">
  import { SensitiveDataMask, MaskedText } from '@svadmin/ui';

  async function checkPermissionAndAudit() {
    console.log('用户请求查看明文，核验操作权限');
    return true; // 返回 false 阻止显隐切换
  }
</script>

<!-- 手机号脱敏 -->
<SensitiveDataMask
  value="13812345678"
  type="mobile"
  onReveal={checkPermissionAndAudit}
  copyMode="masked"
/>

<!-- 姓名脱敏别名 -->
<MaskedText
  value="诸葛孔明"
  type="name"
/>
```

### `<SessionTimeoutGuard>` 与 `useSessionTimeout`

企业级会话空闲超时锁屏与保活套件：
- 严格遵循等保 2.0、HIPAA 及 PCI-DSS 安全合规要求，全量监听鼠标、键盘、滚动与触摸事件防抖更新活跃时间戳。
- **跨标签页强同步**：基于 `BroadcastChannel` 与 `localStorage` 存储事件实现多窗口状态强一致性（任一标签页操作即可全局保活，杜绝切屏突然锁屏）。
- **提前倒计时预警**：进入倒计时窗口自动弹出悬浮预警对话框，展示精确剩余秒数并支持一键“延长会话”或“立即锁定”。

```svelte
<script lang="ts">
  import { SessionTimeoutGuard } from '@svadmin/ui';
</script>

<SessionTimeoutGuard
  timeoutMinutes={15}
  warningSeconds={60}
  onTimeout={() => console.log('会话因超时自动锁定')}
  onExtend={() => console.log('已刷新凭证并延长会话')}
>
  <div class="p-6">
    <h3>核心保密业务工作区</h3>
  </div>
</SessionTimeoutGuard>
```

### `<DualApprovalGate>` / `<TwoPersonRuleModal>`

高危特权操作的双人联签展示层（Maker-Checker / Two-Person Rule）：
- 展示现场复核和远程复核两种交互状态。
- 通过 `onReviewRequest` 或 `onRemoteReviewRequest` 向宿主提交复核意图。
- `approvalState` 必须由宿主根据真实审批 RPC/状态机更新；组件不会生成审批记录、审计哈希或模拟批准。

```svelte
<script lang="ts">
  import { DualApprovalGate, type DualApprovalRequest, type DualApprovalState } from '@svadmin/ui';

  let open = $state(false);
  let approvalState = $state<DualApprovalState>('idle');

  async function submitReview(request: DualApprovalRequest) {
    approvalState = 'submitting';
    // 调用业务审批 RPC；RPC 返回后再把真实状态写回 approvalState。
    console.log(request);
  }
</script>

<DualApprovalGate
  bind:open
  actionId="approval-request-42"
  actionTitle="轮换核心生产 API 网关签名私钥"
  requiredRole="首席安全官 / CSO"
  {approvalState}
  onReviewRequest={submitReview}
>
  <button class="bg-destructive text-destructive-foreground px-4 py-2 rounded">
    轮换秘钥
  </button>
</DualApprovalGate>
```

### `<TableClipboardManager>` 与 `useTableClipboard`

企业级表格跨行区域复制与 Excel 双向粘贴解析套件：
- **`useTableClipboard` 智能解析**：自动解析剪贴板内的制表符分隔（TSV）与逗号分隔（CSV）文本，支持 RFC 4180 转义格式。
- **表头字段智能对齐**：自动根据列 `key` 与显示名称匹配表格列。
- **`<TableClipboardManager>` 浮动工具条**：支持一键将选中行导出为 Excel 友好 TSV，并支持 `⌘V` 快捷键粘贴，唤起数据导入预览浮层、校验警告、追加/覆盖模式切换与撤销（Undo）。

```svelte
<script lang="ts">
  import { TableClipboardManager } from '@svadmin/ui';

  const columns = [
    { key: 'sku', label: '商品编码' },
    { key: 'name', label: '商品名称' },
    { key: 'price', label: '单价' },
  ];

  let selectedRows = $state([{ sku: 'A1', name: '标准件', price: 99 }]);
</script>

<TableClipboardManager
  {columns}
  {selectedRows}
  onPasteConfirmed={(rows, mode) => console.log('确认粘贴行:', rows, mode)}
  onUndo={() => console.log('已撤销粘贴')}
/>
```

### `useAudioAlert` 与 `<AudioFeedbackProvider>`

纯原生 Web Audio API 业务声效与操作声学反馈套件：
- **零外部音频文件加载（0KB 网络体积消耗）**：基于原生 `OscillatorNode` 振荡器实时合成工业级提示音，零延迟、零网络依赖。
- **工业级音效预设**：
  - `success`：清脆明朗的上行大三和弦（C5 -> E5 -> G5），用于扫码录入成功与提交完成。
  - `error`：沉闷短促的双音警报（180Hz -> 130Hz 锯齿波），用于输入不合规或操作被拦截。
  - `warning`：中频脉冲双响（440Hz -> 880Hz），用于阈值警告与超时倒计时。
  - `beep`：标准 1000Hz 激光扫码枪提示音，为仓储、POS 及条码扫描场景提供即时物理敲击感反馈。
  - `notify`：温和优雅的双音通知铃声。
- **全方位体验设置**：支持全局静音、音量滑动调节与多音效在线试听。

```svelte
<script lang="ts">
  import { useAudioAlert, AudioFeedbackProvider } from '@svadmin/ui';

  const audio = useAudioAlert({ volume: 0.8 });

  function handleScanBarcode() {
    audio.play('beep');
  }
</script>

<AudioFeedbackProvider showControls={true}>
  <button onclick={handleScanBarcode}>扫码入库</button>
</AudioFeedbackProvider>
```

### `<PrintableReportLayout>` 与 `usePrintExport`

企业级安全打印排版与高保真 PDF 报表套件：
- 标准纸张适配（A4、A5、Letter），支持横版（`landscape`）与竖版（`portrait`）自由切换。
- **智能防断页布局**：内置 `page-break-inside: avoid` 规避打印跨页时表格行被撕裂截断与签名栏分离。
- **跨页重复表头**：标准 `thead { display: table-header-group; }` 确保长表格每页自动打印表头。
- 内置基础单据元数据摘要、防伪水印背景、电子公章区域与动态页码格式化。

```svelte
<script lang="ts">
  import { PrintableReportLayout } from '@svadmin/ui';

  const metadata = [
    { label: '单据编号', value: 'PO-2026-9081' },
    { label: '核算周期', value: '2026年度第四季度' },
  ];

  const signatures = [
    { role: '制单经办', name: '张晓华' },
    { role: '财务复核主管', name: '李合规' },
  ];
</script>

<PrintableReportLayout
  title="企业年度采购与结算汇总表"
  subtitle="正式商业核算报告"
  reportNo="PO-2026-9081"
  {metadata}
  {signatures}
  watermarkText="内部绝密 · 严禁外传"
>
  <div class="py-4">
    <p>财务明细表格与清单数据展示...</p>
  </div>
</PrintableReportLayout>
```

### `<FunnelChart>` 与 `<SankeyChart>`

企业级业务转化漏斗与路径流向图表套件：
- **纯原生 SVG 矢量绘制（0KB 额外巨型图表库依赖）**：零 ECharts / Chart.js 体积负担，秒开渲染。
- **留存与流失率自动推算**：智能计算阶段间转化率与环比流失率（如 `-40% 流失`）。
- **多阶段交互**：各阶段悬浮发光高亮、点击选中回调与端到端综合留存率汇总。
- **`<SankeyChart>`**：用于用户行为流向、营销归因链路与资金来源去向节点图。

```svelte
<script lang="ts">
  import { FunnelChart, type FunnelStageItem } from '@svadmin/ui';

  const stages: FunnelStageItem[] = [
    { id: '1', label: '线索访问', value: 120000 },
    { id: '2', label: '商机沟通', value: 45000 },
    { id: '3', label: '方案报价', value: 18000 },
    { id: '4', label: '成单签署', value: 7200 },
  ];
</script>

<FunnelChart
  {stages}
  title="营销获客转化大盘漏斗"
  showPercentages={true}
  showDropoff={true}
/>
```

### `<SchemaVisualModeler>`

SQL / JSON Schema 可视化逆向建模与资源生成器：
- 字段属性可视化配置（字段 Key、显示名称、字段类型、必填、可筛选、可排序）。
- 支持一键粘贴 JSON 数据样例自动逆向推断表结构与数据类型。
- 实时生成标准 Svelte 5 / `@svadmin/core` `ResourceDefinition` 资源定义代码并支持一键复制。

```svelte
<script lang="ts">
  import { SchemaVisualModeler } from '@svadmin/ui';
</script>

<SchemaVisualModeler
  resourceName="PurchaseOrder"
  onSaveSchema={(name, fields) => console.log('已保存模型定义:', name, fields)}
/>
```

### `<MicroAppBridge>` 与 `useMicroAppEvent`

微前端沙箱跨应用事件总线与状态共享套件：
- 基于原生 `window.postMessage` 实现宿主与 iframe 微应用（`<MicroAppFrame>`）之间类型安全、具备 Origin 白名单校验的通信总线。
- 支持双向事件发布订阅、RPC 状态请求（`PING`/`PONG`）与全站主题（Dark/Light）、语言包及用户信息向子应用自动化广播。

```svelte
<script lang="ts">
  import { MicroAppBridge, useMicroAppEvent } from '@svadmin/ui';

  const bus = useMicroAppEvent({ channel: 'enterprise_portal' });

  bus.on('ORDER_CREATED', (payload) => {
    console.log('子应用新下单回执:', payload);
  });
</script>

<MicroAppBridge appId="subapp-billing" />
```

### `<RuleExpressionBuilder>` / `<LogicalRuleTree>`

风控与业务流动态规则表达式设计器：
- **复合布尔逻辑编排**：支持多层级嵌套条件组（`AND` / `OR` / `NOT` 运算块），广泛适用于风控反欺诈、工单自动化流转、营销准入门槛等复杂判定。
- **动态变量绑定**：支持从字段元数据中动态选取变量标识（如 `order.amount`、`user.level`）、比较运算符（`>`、`<`、`in`、`contains`、`regex`）及比较值。
- **实时 AST 与自然语言编译**：双向输出结构化 JSON AST 规则树与易读的中文自然语言表达式，支持一键复制。

```svelte
<script lang="ts">
  import { RuleExpressionBuilder } from '@svadmin/ui';

  const fields = [
    { key: 'order.amount', label: '订单金额', type: 'number' },
    { key: 'user.riskScore', label: '风险评分', type: 'number' },
    { key: 'user.level', label: '会员等级', type: 'string' },
  ];
</script>

<RuleExpressionBuilder
  {fields}
  onChange={(ast, expr) => console.log('规则更新:', expr, ast)}
/>
```

### `<ClusterTopologyGraph>` / `<ServiceHealthGrid>`

分布式集群服务健康与全景拓扑图套件：
- **0KB 外部体积开销**：纯原生 SVG 矢量绘制，零巨型第三方图表或画布引擎依赖，毫秒级轻量渲染。
- **三层微服务拓扑矩阵**：直观展示入口网关层（Ingress）、应用微服务层（Services）与存储缓存层（Storage）。
- **节点下钻与健康诊断**：实时呈现节点健康度（健康、降级、故障、维护）、QPS 吞吐、延迟与错误率，支持快捷节点重启与流量隔离。

```svelte
<script lang="ts">
  import { ClusterTopologyGraph } from '@svadmin/ui';
</script>

<ClusterTopologyGraph
  title="生产环境微服务调用拓扑"
  onNodeSelect={(node) => console.log('下钻节点:', node.id)}
  onRestartNode={(node) => console.log('重启实例:', node.id)}
/>
```

### `<SnapshotTimelineReplay>` / `<TimeTravelDiff>`

时空快照审计回放与时间旅行对比器：
- **时间旅行滑块（Time Travel Slider）**：在水平时间轴上顺滑拖动，快速定位历史任意时刻快照版本。
- **字段级并排红绿对比（Before ↔ After）**：自动对比选定版本与基准版本的差异，高亮变更属性单元格。
- **一键回滚流程发起**：支持基于防篡改签名哈希直接发起“申请回滚至此版本”操作。

```svelte
<script lang="ts">
  import { SnapshotTimelineReplay, type SnapshotRevision } from '@svadmin/ui';

  const revisions: SnapshotRevision[] = [
    {
      id: 'rev-1',
      version: 1,
      timestamp: '2026-11-01 10:00:00',
      author: '张安全 (合规审计员)',
      auditHash: 'SHA-001',
      snapshot: { status: 'draft', quota: 100 },
    },
    {
      id: 'rev-2',
      version: 2,
      timestamp: '2026-11-02 14:30:00',
      author: '李主管 (技术总监)',
      auditHash: 'SHA-002',
      snapshot: { status: 'published', quota: 500 },
    },
  ];
</script>

<SnapshotTimelineReplay
  {revisions}
  onApplyRollback={(rev) => console.log('申请回滚至版本:', rev.version)}
/>
```

### `<ActionPalette>` / `<QuickActionDrawer>`

全键盘极速动作托盘与指令气泡（Linear / Raycast 生产力人机工效）：
- **快捷键秒级唤起**：针对表格当前选中或高亮的多条记录，按 `⌘.` 即可原地呼出半透明快捷动作托盘。
- **拼音与模糊检索**：输入动作名首字母或关键字即时定位目标操作。
- **行内参数快捷流转**：针对需要参数的动作（如指派给负责人、填写驳回理由），无缝在托盘内直接录入并一键回车批量执行。

```svelte
<script lang="ts">
  import { ActionPalette } from '@svadmin/ui';

  let open = $state(false);
  let selectedRecords = $state([{ id: 101 }, { id: 102 }]);
</script>

<ActionPalette
  bind:open
  {selectedRecords}
  onExecuteAction={(id, param) => console.log('批量执行动作:', id, param)}
/>
```

### `<I18nLanguagePackEditor>` 与 `useDynamicLocale`

动态多语言词条热更新与在线补丁套件：
- **零发版热修上线**：支持跨国业务运营在线修正翻译与错别字，无需重新走 CI/CD 构建发版。
- **按命名空间可视化管理**：一览 `common`、`table`、`form`、`auth` 词条，支持表格内实时就地编辑。
- **运行时增量覆盖**：`useDynamicLocale` 动态合并线上覆盖包，平滑注入现有 `@svadmin/core` 翻译管道。

```svelte
<script lang="ts">
  import { I18nLanguagePackEditor, useDynamicLocale } from '@svadmin/ui';

  const i18n = useDynamicLocale();
</script>

<I18nLanguagePackEditor
  targetLocale="zh-CN"
  onSavePatch={(locale, patch) => console.log('发布动态文案补丁:', locale, patch)}
/>
```

### `<FormulaField>` 与 `useFormulaEngine`

企业级动态公式计算字段与沙箱求值引擎：
- **零 eval() 安全隐患**：基于原生抽象语法树解析，安全支持四则运算（`+`、`-`、`*`、`/`、`^`、`%`、括号）与复杂嵌套属性提取。
- **开箱即用内置函数**：支持 `SUM`（求和）、`AVG`（均值）、`MAX`、`MIN`、`ROUND`（四舍五入）与 `IF`（条件选择）。
- **公式气泡与手动覆盖**：呈现 `f(x) = price * qty * (1 - discount)` 公式提示胶囊，并支持一键切换为人工手动覆盖。

```svelte
<script lang="ts">
  import { FormulaField } from '@svadmin/ui';

  let form = $state({ price: 199, qty: 3, discount: 0.1 });
</script>

<FormulaField
  label="折后实付总额"
  formula="price * qty * (1 - discount)"
  scope={form}
  prefix="¥"
  precision={2}
  allowManualOverride={true}
/>
```

### `<DataScreenContainer>` / `<FullscreenDashboardLayout>`

指挥中心与大屏数据可视化自适应容器：
- **Scale-to-Fit 等比自适应缩放**：基于设计稿基准分辨率（如 1920x1080、21:9 超宽屏）自动计算等比缩放矩阵（`scale`），杜绝各类大屏投屏时的变形与排版错位。
- **科技感边框与头部**：内置实时数字时钟、大屏主副标题与全屏切换按钮（`<FullscreenButton>`）。
- **微光发光角标**：纯 CSS / SVG 发光点缀，赋予指挥大厅硬核科技质感。

```svelte
<script lang="ts">
  import { DataScreenContainer } from '@svadmin/ui';
</script>

<DataScreenContainer
  title="全局仓储调度与实时监控指挥中心"
  subtitle="NOC 遥测大屏与传感器链路大盘"
  width={1920}
  height={1080}
>
  <div class="grid grid-cols-3 gap-6 h-full">
    <!-- 各类大屏卡片与实时 SVG 拓扑/图表 -->
  </div>
</DataScreenContainer>
```

### `<ThreadedCommentDrawer>` / `<RecordAnnotationBox>`

记录级协同讨论流与树形批注抽屉：
- **盖楼式嵌套回复与表情反馈**：支持针对特定评论展开二级回复流，支持点赞（`👍`）、已确认（`✅`）等轻量表情互动。
- **问题解决状态标记**：支持合规/财务将某条争议评论一键标记为“已解决（Resolved）”。
- **成员快速协作**：输入框支持快速发表业务批注与 `@` 成员协作提醒。

```svelte
<script lang="ts">
  import { ThreadedCommentDrawer, type ThreadedComment } from '@svadmin/ui';

  let open = $state(false);
  let comments = $state<ThreadedComment[]>([
    {
      id: '1',
      author: '张合规 (审计专员)',
      content: '请核实该笔采购单附带的专用发票抬头与税号。',
      createdAt: '10 分钟前',
      isResolved: false,
    },
  ]);
</script>

<ThreadedCommentDrawer
  bind:open
  recordTitle="采购核算单 #PO-991"
  {comments}
  onAddComment={(text, parentId) => console.log('新增批注:', text, parentId)}
/>
```

### `useStorageCache` 与通用存储适配器套件

企业级跨端键值对缓存与通用存储驱动套件：
- **存储驱动彻底解耦**：彻底摆脱对特定单点设施的硬绑定。在纯内存测试（`MemoryStorageAdapter`）、本地轻量持久化（`LocalStorageAdapter`）、大容量离线缓存（`IndexedDB`）与通用远程 REST 接口（`RemoteKVAdapter`）之间零成本无缝切换。
- **过期淘汰与命名空间**：自带秒级 TTL 自动淘汰机制与前缀命名空间隔离，防止本地数据脏污染。
- **Svelte 5 响应式体验**：`useStorageCache` 自动双向同步响应式状态与底层存储。

```svelte
<script lang="ts">
  import { useStorageCache, LocalStorageAdapter } from '@svadmin/ui';

  const userPrefs = useStorageCache('user_dashboard_prefs', { density: 'comfortable' }, {
    adapter: new LocalStorageAdapter('svadmin_enterprise'),
    ttlSeconds: 86400, // 24小时自动过期
  });
</script>

<div>当前排版密度: {userPrefs.value.density}</div>
<button onclick={() => userPrefs.set({ density: 'compact' })}>切换为紧凑</button>
```

### `<TreeTransferSelect>` / `<CascadingAssigner>`

深层组织架构树形穿梭框与批量指派组件：
- **多层级目录导航**：支持树形子树全选、半选级联与叶子节点过滤，专为集团、子公司、部门到多角色人员的大批量权限指派打造。
- **灵活已选呈现**：右侧支持平铺或按所属部门分组展示已选节点，支持一键清空或单项移除。
- **即时拼音检索**：内置快速搜索过滤栏，带路径高亮指示。

```svelte
<script lang="ts">
  import { TreeTransferSelect, type TreeTransferSelectNode } from '@svadmin/ui';

  const orgTree: TreeTransferSelectNode[] = [
    {
      id: 'eng',
      label: '研发中心',
      children: [
        { id: 'u1', label: 'Ada (前端架构师)', isLeaf: true },
        { id: 'u2', label: 'Lin (后端核心开发)', isLeaf: true },
      ],
    },
  ];

  let assignedKeys = $state(['u1']);
</script>

<TreeTransferSelect
  treeData={orgTree}
  bind:targetKeys={assignedKeys}
  sourceTitle="企业通讯录组织树"
  targetTitle="已指派审批人"
/>
```

### `<VirtualCardGrid>` / `<MediaCardSelect>`

海量素材与商品多选虚拟化卡片画廊：
- **60fps 视口虚拟化**：仅渲染当前屏幕可见区域内的卡片，轻松承载上万张商品卡片、素材图片或插件模块，滚动零卡顿、无内存泄露。
- **响应式列数适配**：根据屏幕宽度自动适配 2 / 3 / 4 / 6 列。
- **多选交互套件**：支持连选、框选与全选计数徽章，内置右上角勾选状态与悬浮预览操作。

```svelte
<script lang="ts">
  import { VirtualCardGrid } from '@svadmin/ui';

  const mediaItems = Array.from({ length: 500 }, (_, i) => ({
    id: `item-${i + 1}`,
    title: `素材编号 #${i + 1}`,
    subtitle: '1080p WebP 高清图',
  }));

  let selectedIds = $state<string[]>([]);
</script>

<VirtualCardGrid
  items={mediaItems}
  bind:selectedIds
  columns={4}
  cardHeight={180}
/>
```

### `<ApprovalChainBuilder>` / `<ApproverNodeConfig>`

可视化轻量多级审批链编排器与节点策略设计器：
- **轻量纵向审批流编排**：仿飞书/钉钉风格设计树，在节点间随时点击 `+` 快速插入审批人节点或抄送节点。
- **多人审批决策方式**：支持会签（`all` 全员必须同意）、或签（`one` 一人同意即生效）与顺序逐级审批。
- **侧边属性抽屉**：可视化配置节点角色、审批方式及超时自动流转策略。

```svelte
<script lang="ts">
  import { ApprovalChainBuilder, type ApprovalChainNode } from '@svadmin/ui';

  let chain = $state<ApprovalChainNode[]>([
    { id: 'start', type: 'start', title: '发起人', roleName: '全体员工' },
    { id: 'mgr', type: 'approver', title: '直属部门主管', roleName: '部门主管', mode: 'one' },
    { id: 'fin', type: 'approver', title: '财务总监复核', roleName: '财务审批组', mode: 'all' },
  ]);
</script>

<ApprovalChainBuilder
  bind:nodes={chain}
  onChange={(nodes) => console.log('更新审批链:', nodes)}
/>
```

### `<PeriodComparisonCard>` / `<MetricsDeltaPill>`

高管大盘跨周期同比与环比分析卡片：
- **双周期指标对比**：并排呈现基准周期与对比周期的实际数值。
- **差异波动胶囊**：自动推导增减绝对值（`+¥250,000`）与百分比幅度（`+25%`），绿涨红跌清晰醒目，支持 `reverseColor`（如针对故障数、延迟）。
- **原生微对比条**：纯原生 SVG 双进度对比条，0KB 图表体积开销。

```svelte
<script lang="ts">
  import { PeriodComparisonCard } from '@svadmin/ui';
</script>

<PeriodComparisonCard
  title="季度净营收额"
  currentValue={1250000}
  previousValue={1000000}
  prefix="¥"
  periodName="较上季度环比"
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

### `<PlanUsageQuotaBar>`

企业级 SaaS 多租户用量配额与超限预警进度条群：
- 专为租户中心用量概览、订阅详情页与资源配额超限警示设计。
- **多维度配额聚合**：直观展示 API 调用次数、云存储空间、团队席位等多维度指标用量，根据阈值自动渐变变色（正常、警告橙、超额危险红并带告警角标）。
- **额度周期与升级引导**：展示下次配额重置日期（如“2026-12-01 自动重置”），并支持一键唤起“升级套餐 / 扩容”操作。

```svelte
<script lang="ts">
  import { PlanUsageQuotaBar, type QuotaItem } from '@svadmin/ui';

  const quotas: QuotaItem[] = [
    { id: 'api', label: 'API 调用额度', current: 78500, limit: 100000, unit: '次', periodText: '本月度周期' },
    { id: 'storage', label: '对象存储空间', current: 18.5, limit: 20, unit: 'GB', dangerThreshold: 90 },
  ];
</script>

<PlanUsageQuotaBar
  planName="企业旗舰版 (Enterprise Scale)"
  planBadge="SLA 99.99% 保证"
  resetDateText="2026-12-01 自动重置"
  {quotas}
  onupgrade={() => console.log('触发升级套餐')}
/>
```

### `<TierFeatureComparison>`

多版本套餐功能与权益对比矩阵表：
- 专为 B2B SaaS 套餐选型、计费定价页面与多版本权益边界打造。
- **卡片化表头**：支持基础版、专业版、旗舰版多卡片矩阵并排，支持“强烈推荐”角标高亮与“当前生效套餐”状态禁用。
- **分组化功能行**：按模块组织特性清单，单元格原生支持布尔对勾（`✓`）、未包含横杠（`—`）与具体数值上限（如 `50 席位`、`100 GB`）。

```svelte
<script lang="ts">
  import { TierFeatureComparison, type PricingTier, type FeatureGroup } from '@svadmin/ui';

  const tiers: PricingTier[] = [
    { key: 'starter', name: '团队基础版', price: '¥299', period: '月', isCurrent: true },
    { key: 'pro', name: '企业专业版', price: '¥999', period: '月', isPopular: true },
  ];

  const groups: FeatureGroup[] = [
    {
      groupName: '协同与存储',
      features: [
        { name: '多租户组织隔离', values: { starter: true, pro: true } },
        { name: '存储空间上限', values: { starter: '20 GB', pro: '500 GB' } },
        { name: '专属技术专家支持', values: { starter: false, pro: true } },
      ],
    },
  ];
</script>

<TierFeatureComparison {tiers} {groups} onselecttier={(k) => console.log('选定套餐:', k)} />
```

### `<BillingInvoiceDrawer>`

企业月度结算账单明细与发票开具抽屉：
- 专为财务对账、月度流水核销与增值税发票申请打造。
- **全生命周期核销**：清晰呈现账单出账日期、结算周期、结算总额、税额与状态徽标（已结清/待付款/已退款）。
- **消费明细与发票开具**：清单式呈现各项资源月度消耗明细；支持直接下载已开具的电子发票 PDF，或提交开具申请。

```svelte
<script lang="ts">
  import { BillingInvoiceDrawer, type InvoiceData } from '@svadmin/ui';

  let isDrawerOpen = $state(false);

  const invoice: InvoiceData = {
    invoiceNo: 'INV-202611-00812',
    period: '2026年10月度',
    issueDate: '2026-11-01',
    status: 'paid',
    totalAmount: 18450,
    taxAmount: 1044.34,
    items: [
      { id: '1', description: '企业旗舰版席位月租', category: '基础包月', amount: 15000, quantity: 1 },
      { id: '2', description: '超量存储流量结算', category: '弹性资源', amount: 3450 },
    ],
    invoiceTitle: '未来智能科技有限公司',
    taxId: '91310115MA1K3XXXXX',
    downloadUrl: 'https://example.test/inv-00812.pdf',
  };
</script>

<button onclick={() => (isDrawerOpen = true)}>查看月度账单明细</button>

<BillingInvoiceDrawer
  bind:open={isDrawerOpen}
  {invoice}
  ondownload={(url) => console.log('下载发票:', url)}
### `<WebhookSimulator>`

企业级 Webhook 事件模拟投递与回放测试器：
- 专为开放平台、第三方服务回调联调与自动化集成沙箱打造。
- **预设事件与自动装填**：内置订单支付成功（`order.payment_succeeded`）、高危安全预警（`user.security_alert`）、发票开具完成（`invoice.issued`）等事件，选择后自动将对应的标准 JSON Schema 载荷填入编辑器。
- **真实 HTTP 投递与结果面板**：支持输入目标接收 Endpoint，自动生成并携带 `X-Svadmin-Timestamp` 与时间戳请求头，模拟发送后直观展示 HTTP 状态码（200 OK 绿标、4xx/5xx 错误红标）、往返网络耗时与服务端响应报文。

```svelte
<script lang="ts">
  import { WebhookSimulator } from '@svadmin/ui';
</script>

<WebhookSimulator
  defaultEndpoint="https://api.merchant.com/webhooks/svadmin"
  ondeliver={async ({ eventType, endpoint, payload }) => {
    console.log('发起投递:', eventType, endpoint, payload);
    return {
      statusCode: 200,
      durationMs: 82,
      responseBody: '{"acknowledged": true}',
    };
  }}
/>
```

### `<HmacSignatureCalculator>`

HMAC 签名计算与现场验签沙箱：
- 专为排查第三方回调签名不匹配（Signature Mismatch）缺陷与安全合规打造。
- **Web Crypto 原生算法加速**：纯前端实现，支持 `HMAC-SHA256`、`HMAC-SHA384` 与 `HMAC-SHA512` 工业级哈希摘要。
- **即时计算与验签比对**：输入 Secret Key 与 Raw Payload 毫秒级生成 Hex 摘要字符串并支持一键复制；提供预期签名比对框，实时给出“验签成功 (Valid)”或“不匹配 (Mismatch)”安全反馈。

```svelte
<script lang="ts">
  import { HmacSignatureCalculator } from '@svadmin/ui';
</script>

<HmacSignatureCalculator
  defaultSecret="whsec_prod_secret_8848"
  defaultBody={'{"event":"payment.succeeded","amount":99.0}'}
  algorithm="SHA-256"
/>
```

### `<ApiPlayground>`

内嵌式 API 快捷交互式调试工作台：
- 专为开发者中心、API 文档内嵌交互式探针与内部微服务联调设计。
- **全方法覆盖与终端 cURL 一键生成**：支持 `GET`、`POST`、`PUT`、`PATCH`、`DELETE`，根据输入实时生成标准终端 `curl` 命令（支持一键复制到剪贴板在本地执行）。
- **结构化请求与响应反馈**：支持 Headers 与 JSON Request Body 动态输入，展示响应 HTTP 状态码、数据量大小、网络耗时与美化 JSON 响应。

```svelte
<script lang="ts">
  import { ApiPlayground } from '@svadmin/ui';
</script>

<ApiPlayground
  defaultMethod="POST"
  defaultUrl="/api/v1/orders/create"
  defaultBody={'{\n  "sku": "SVADMIN-PRO-LICENSE",\n  "seats": 10\n}'}
  onrequest={async (req) => {
    console.log('执行接口调用:', req);
    return {
      status: 200,
      durationMs: 42,
      sizeBytes: 128,
      data: { orderId: 'ORD-9821', created: true },
    };
  }}
### `<WidgetContainer>`

企业级监控看板小部件容器外壳：
- 专为统一管理监控图表、指标卡片与运营看板设计。
- **全生命周期交互**：内置右上角工具栏，支持一键手动刷新动画、全屏放大/ESC 还原、时间戳显示与自定义操作区。
- **状态容灾自愈**：天然支持 `loading` 骨架屏加载过渡与 `error` 状态友好承接卡片，支持用户一键重试重新拉取数据。

```svelte
<script lang="ts">
  import { WidgetContainer } from '@svadmin/ui';

  let isUpdating = $state(false);
  const now = new Date();
</script>

<WidgetContainer
  title="实时请求吞吐量 (QPS)"
  description="监控过去 24 小时每秒请求数与波动曲线"
  lastUpdated={now}
  allowFullscreen={true}
  allowRefresh={true}
  refreshing={isUpdating}
  onrefresh={async () => {
    isUpdating = true;
    await new Promise((r) => setTimeout(r, 800));
    isUpdating = false;
  }}
>
  <div class="h-44 flex items-center justify-center border border-dashed rounded text-xs text-muted-foreground">
    此处嵌入任意 LineChart、AreaChart 或 MetricStrip
  </div>
</WidgetContainer>
```

### `<DataFreshnessIndicator>`

数据新鲜度指示灯与自动轮询状态胶囊：
- 专为大屏与实时运维监控面板打造，直观感知数据时效性。
- **动态呼吸灯**：实时同步中（绿色水波纹脉冲）、刚刚更新、X秒前、过期告警（黄色高亮）。
- **轮询周期自切换**：支持用户在胶囊中切换轮询周期（5秒 / 15秒 / 30秒 / 1分钟 / 手动刷新），点击胶囊即可触发立即重新拉取数据。

```svelte
<script lang="ts">
  import { DataFreshnessIndicator } from '@svadmin/ui';

  let lastSyncTime = $state(Date.now());
</script>

<DataFreshnessIndicator
  lastUpdated={lastSyncTime}
  pollInterval={15}
  staleThresholdMs={60000}
  onsyncnow={() => (lastSyncTime = Date.now())}
  onintervalchange={(sec) => console.log('轮询周期变更为:', sec)}
/>
```

### `<ServerStatusGrid>`

服务节点集群健康度点阵与指标网格：
- 专为微服务网关、边缘计算节点、数据库只读副本集群监控打造。
- **集群全局统计**：自动汇聚计算健康在线节点数、告警节点数、紧急故障节点数与平均网络延迟。
- **细粒度卡片**：直观展示节点名称、所属地域（如 `cn-shanghai`）、实时心跳延时、CPU 占用、内存消耗与磁盘使用率微型进度条，支持状态动态变色。

```svelte
<script lang="ts">
  import { ServerStatusGrid, type ServerNode } from '@svadmin/ui';

  const nodes: ServerNode[] = [
    { id: '1', name: 'api-gateway-01', region: 'cn-shanghai', status: 'healthy', latencyMs: 18, cpuPercent: 32, memoryPercent: 54, diskPercent: 62 },
    { id: '2', name: 'api-gateway-02', region: 'cn-beijing', status: 'healthy', latencyMs: 24, cpuPercent: 41, memoryPercent: 60, diskPercent: 65 },
    { id: '3', name: 'db-replica-ro', region: 'us-west-1', status: 'warning', latencyMs: 185, cpuPercent: 78, memoryPercent: 86, diskPercent: 91 },
  ];
</script>

<ServerStatusGrid {nodes} onselectnode={(n) => console.log('选中节点:', n.name)} />
### `<QueryBuilder>`

企业级多层嵌套查询与规则引擎构建器：
- 专为复杂报表圈选、风控规则、BI 钻取与多维数据检索设计。
- **AND / OR 逻辑分组嵌套**：支持无限层级的嵌套组递归构建，直观可视化的分组外框与连接引导线。
- **字段类型自适应操作符**：文本字段（包含、开头为、结尾为）、数值字段（大于、小于、介于、等于）、枚举/布尔（单选/多选属于）、日期字段（早于、晚于）与空值判断（为空/非空）。
- **SQL / JSON 即时导出**：内置 `serializeToSql` 与标准 JSON 规则树，顶部配备即时“预览 SQL WHERE”与一键重置操作。

```svelte
<script lang="ts">
  import { QueryBuilder, type QueryField, type QueryGroup } from '@svadmin/ui';

  const fields: QueryField[] = [
    { key: 'status', label: '审批状态', type: 'select', options: [{ label: '已通过', value: 'approved' }, { label: '待初审', value: 'pending' }] },
    { key: 'amount', label: '成交金额', type: 'number' },
    { key: 'customer', label: '客户姓名', type: 'text' },
    { key: 'createdAt', label: '创建时间', type: 'date' },
  ];

  let currentQuery = $state<QueryGroup | null>(null);
</script>

<QueryBuilder {fields} onchange={(q) => (currentQuery = q)} />
```

### `<FilterTagBar>`

已生效筛选标签栏与常用视图预设管理器：
- 置于数据表格上方，直观呈现当前生效的所有检索与筛选条件气泡胶囊。
- 支持单个条件一键点击 `×` 移除，并支持“清空全部筛选”。
- **常用视图持久化**：用户可一键将当前复合筛选保存为个人预设视图（保存在 `localStorage`），下拉列表可秒级切换历史预设视图或删除旧预设。

```svelte
<script lang="ts">
  import { FilterTagBar, type FilterTagItem } from '@svadmin/ui';

  let activeFilters: FilterTagItem[] = $state([
    { id: '1', field: 'status', label: '订单状态', operatorLabel: '=', valueLabel: '已支付' },
    { id: '2', field: 'amount', label: '交易金额', operatorLabel: '>=', valueLabel: '¥10,000' },
  ]);
</script>

<FilterTagBar
  filters={activeFilters}
  onremove={(id) => (activeFilters = activeFilters.filter((f) => f.id !== id))}
  onclear={() => (activeFilters = [])}
/>
```

### `<BatchEditModal>`

企业级数据表格批量修改与安全预检弹窗：
- 勾选多条记录后，一键对所选记录发起多字段批量调整。
- **三种批量模式**：支持“替换为（Replace）”、“追加（Append）”与“置空清空（Clear）”。
- **安全防误点保护**：顶部醒目展示高影响范围预警（如“将同时覆盖 48 条数据”），提交前具备二次确认机制。

```svelte
<script lang="ts">
  import { BatchEditModal, type BatchFieldOption } from '@svadmin/ui';

  let isBatchOpen = $state(false);

  const fields: BatchFieldOption[] = [
    { key: 'assignee', label: '负责人', type: 'text' },
    { key: 'status', label: '审批状态', type: 'select', options: [{ label: '已初审', value: 'reviewed' }, { label: '已归档', value: 'archived' }] },
    { key: 'priority', label: '业务优先级', type: 'number' },
  ];
</script>

<button onclick={() => (isBatchOpen = true)}>批量修改已选项</button>

<BatchEditModal
  bind:open={isBatchOpen}
  selectedCount={36}
  resourceName="订单记录"
  {fields}
  onconfirm={(changes) => console.log('批量变更提交:', changes)}
  onclose={() => (isBatchOpen = false)}
/>
```

### `<SqlConsole>` / `<DatabaseQueryRunner>`

企业级安全只读 SQL 控制台与数据探查器：
- **破坏性写操作严格拦截**：内置安全语法守卫，严格拦截任何写操作与结构变更语句（`DROP`, `TRUNCATE`, `ALTER`, `DELETE`, `UPDATE`, `INSERT`），确保 100% 只读安全。
- **查询模板与性能指标**：内置常用聚合与跨表模板，实时统计执行耗时（毫秒）、行数，并支持一键导出 CSV 与 JSON。

```svelte
<script lang="ts">
  import { SqlConsole } from '@svadmin/ui';
</script>

<SqlConsole
  title="生产只读数据探查控制台"
  initialSql="SELECT id, order_no, amount, status FROM orders WHERE amount > 1000 LIMIT 20;"
  onExecuteQuery={async (sql) => {
    return { columns: ['id', 'amount'], rows: [{ id: 1, amount: 2000 }], rowCount: 1, durationMs: 12 };
  }}
/>
```

### `<EnvVariableEditor>` / `<SecretVaultManager>`

多环境配置中心与密钥敏感变量管理器：
- **多套环境无缝隔离**：并排管理 `development`、`staging` 与 `production` 环境配置。
- **敏感变量掩码保护**：核心秘钥全量以 `●●●●●●●●` 加密掩码展示，支持点击眼睛按需查看。
- **批量 .env 导入导出**：一键粘贴整段 `.env` 文本自动批量解析导入，或一键导出标准文件。

```svelte
<script lang="ts">
  import { EnvVariableEditor } from '@svadmin/ui';
</script>

<EnvVariableEditor
  environment="production"
  onSaveEnv={(vars, env) => console.log('已保存环境变量:', env, vars)}
/>
```

### `<FeatureAnnouncementModal>` / `<WhatIsNewModal>`

版本发版公告与新特性图文漫游引导弹窗（Linear / Apple 质感设计）：
- **特性清单图文卡片**：展示新版本号（如 `v0.5.15`）、发布日期与核心特性分类胶囊。
- **智能免打扰记忆**：勾选“此版本不再提示”后自动持久化至 `localStorage`。
- **“立即体验”行动流**：支持一键跳转新功能演示或稍后查看。

```svelte
<script lang="ts">
  import { FeatureAnnouncementModal } from '@svadmin/ui';

  let open = $state(true);
</script>

<FeatureAnnouncementModal
  bind:open
  version="v0.5.15"
  releaseDate="2026-11-11"
  onExplore={() => console.log('用户点击体验新特性')}
/>
```

### `<MasterSubTableDrawer>` / `<NestedRecordExplorer>`

1:N 主从嵌套子表与主子记录联动抽屉：
- **主记录核心摘要卡片**：展示单号、金额、负责人等主对象核心属性。
- **子表高密度明细网格**：支持子表独立模糊搜索、行内删除与点击添加新行。
- **双向联动同步**：子记录增删自动联动主表合计反写。

```svelte
<script lang="ts">
  import { MasterSubTableDrawer } from '@svadmin/ui';

  let open = $state(false);
  let order = { orderNo: 'ORD-2026-901', customer: '华为技术有限公司', totalAmount: '¥ 11,000' };
  let subItems = $state([
    { sku: 'HW-01', name: '万兆光模块', quantity: 20, subtotal: '¥ 7,600' },
    { sku: 'HW-02', name: '光纤熔接盒', quantity: 4, subtotal: '¥ 3,400' },
  ]);
</script>

<MasterSubTableDrawer
  bind:open
  masterRecord={order}
  bind:subItems
  subColumns={[
    { key: 'sku', label: '商品SKU' },
    { key: 'name', label: '商品名称' },
    { key: 'quantity', label: '采购数量', align: 'right' },
    { key: 'subtotal', label: '小计', align: 'right' },
  ]}
/>
```

### `<ScheduledJobManager>` / `<CronSchedulerMatrix>`

异步定时任务调度执行大盘：
- **Cron 规则矩阵**：一览计划任务列表、Cron 表达式、下次触发实时倒计时与上次执行状态。
- **即时手动执行**：提供一键“立即执行一次（Trigger Now）”功能，带动态触发中反馈。
- **生命周期调度控制**：支持一键暂停或恢复计划任务调度。

```svelte
<script lang="ts">
  import { ScheduledJobManager } from '@svadmin/ui';
</script>

<ScheduledJobManager
  onTriggerJob={async (job) => console.log('手动触发任务:', job.id)}
  onToggleJobStatus={(job, status) => console.log('切换任务状态:', job.id, status)}
/>
```

### `<SecureDataExporter>` / `<ExportSecurityWatermark>`

企业级数据导出安全溯源指纹与防泄密套件：
- **防篡改数字溯源指纹**：导出 CSV/TSV 时，自动在表头首行与元数据中注入操作员工号、时间戳与签名散列（`FP-xxxx`），彻底杜绝数据私自倒卖无从溯源的隐患。
- **强制合规二次确认**：弹出安全审查弹窗，醒目提示本次导出包含的隐私敏感字段（如手机号/身份证），强制输入“合规导出事由”后方可放行。
- **自动化审计上报**：导出瞬间触发 `onExportAuditRecord` 回调，向后端安全审计中心持久化本次导出快照。

```svelte
<script lang="ts">
  import { SecureDataExporter } from '@svadmin/ui';

  const data = [{ id: 1, name: '张三', phone: '13800000000' }];
  const columns = [
    { key: 'id', label: '序号' },
    { key: 'phone', label: '手机号', isSensitive: true },
  ];
</script>

<SecureDataExporter
  {data}
  {columns}
  fileName="2026Q4_客户审计报表"
  onExportAuditRecord={(audit) => console.log('审计凭据:', audit)}
/>
```

### `<RolePermissionComparator>` / `<PermissionAuditDiffModal>`

角色权限变更高危审计与矩阵差异比对器：
- **Before ↔ After 并排红绿差异矩阵**：清晰对比调整前 vs 拟调整后的权限矩阵，涵盖 CRUD 各动作（`read`, `create`, `update`, `delete`, `export`）。
- **特权提权高危标红预警**：针对新增的高危敏感权限（如财务删除、客户名单全量导出）以醒目警告色突出提示。
- **强制输入审批工单号**：必须输入有效关联的提权审批工单编号方可确认提交。

```svelte
<script lang="ts">
  import { RolePermissionComparator } from '@svadmin/ui';
</script>

<RolePermissionComparator
  roleId="finance_lead"
  roleName="财务复核主管"
  onConfirmChanges={(payload) => console.log('权限变更审计记录:', payload)}
/>
```

### `<TenantQuotasMatrix>` / `<QuotaEnforcementGuard>`

多租户配额熔断与超额升级拦截门禁：
- **全量资源仪表板**：API 频次、存储容量、团队席位、算力点数实时进度仪，包含正常、告警、100% 熔断状态。
- **友好拦截与提额通道**：资源耗尽时提供一键申请临时提额工单与升级套餐入口。

```svelte
<script lang="ts">
  import { TenantQuotasMatrix } from '@svadmin/ui';
</script>

<TenantQuotasMatrix
  tenantName="华为技术有限公司"
  planName="企业旗舰版"
  onUpgradePlan={() => console.log('申请升级租户套餐')}
/>
```

### `<TableAggregationFooter>` / `<TableColumnSumSummary>`

表格多维动态聚合统计粘性底部栏：
- **选中行实时联动合计**：用户在表格中勾选复选框选中某些行时，实时动态计算并刷新“已选 X 行合计值”。
- **当前页小计与全量总计**：并排呈现当前页小计与服务端返回的全量数据集总计。
- **格式化对齐**：精确对齐表格列宽与排版（文本居左、金额居右），支持货币符号与小数位精度。

```svelte
<script lang="ts">
  import { TableAggregationFooter } from '@svadmin/ui';

  const columns = [
    { key: 'orderNo', label: '订单号' },
    { key: 'amount', label: '金额', op: 'sum', prefix: '¥' },
  ];
</script>

<TableAggregationFooter
  {columns}
  pageRows={[{ orderNo: '1', amount: 100 }, { orderNo: '2', amount: 200 }]}
  selectedRows={[{ orderNo: '1', amount: 100 }]}
/>
```

### `<IncidentWarRoomDrawer>` / `<AlertIncidentTimeline>`

突发严重故障战情室与应急响应协同流：
- **故障等级与影响面看板**：P0/P1/P2/P3 故障严重度徽章、影响用户数计数与持续分钟倒计时。
- **一键紧急止血托盘**：网关只读限流降级、清空分布式缓存、隔离故障节点。
- **应急响应处置时间轴**：实时同步值班人员处置备忘，支持一键宣布故障恢复。

```svelte
<script lang="ts">
  import { IncidentWarRoomDrawer } from '@svadmin/ui';
</script>

<IncidentWarRoomDrawer
  incidentId="INC-2026-902"
  title="生产 PostgreSQL 主库连接池耗尽告警"
  severity="P0"
  onTriggerMitigation={(action) => console.log('触发应急动作:', action)}
/>
```

### `<DataImportDropzone>`

企业级批量数据导入拖拽区：
- 专为数十万条 Excel/CSV 复杂数据导入打造。
- **文件白名单与大小预检**：支持自定义格式白名单（默认 `.xlsx` / `.xls` / `.csv`）与文件体积校验（默认最大 30MB）。
- **标准模板与解析进度**：右上角直接提供规范导入模板下载入口；文件导入后呈现动态进度条并解析文件大小与就绪状态。

```svelte
<script lang="ts">
  import { DataImportDropzone } from '@svadmin/ui';
</script>

<DataImportDropzone
  resourceName="客户名单"
  templateUrl="/templates/customer-import-template.xlsx"
  templateName="客户导入标准模板.xlsx"
  onfileselect={(file) => console.log('选择导入文件:', file.name)}
/>
```

### `<ColumnMappingTable>`

源文件表头与系统目标字段智能列映射配置表：
- 专为三方导出的不同表头列映射至系统规范字段打造。
- **智能模糊自动匹配**：根据系统字段名（`key` 或 `label`）自动分析推断源文件对应的表头列，极大降低操作员重复配置成本。
- **样本数据核验与必填警告**：下拉选取源列后实时展示前 3 条样本数据辅助核对；若存在未映射的必填字段，底部醒目黄标警告并指出具体字段名。

```svelte
<script lang="ts">
  import { ColumnMappingTable, type TargetFieldConfig } from '@svadmin/ui';

  const targetFields: TargetFieldConfig[] = [
    { key: 'name', label: '客户姓名', required: true },
    { key: 'phone', label: '联系手机', required: true },
    { key: 'company', label: '所属公司', required: false },
  ];

  const sourceColumns = ['客户名称', '移动电话', '公司全称', '创建时间'];
</script>

<ColumnMappingTable
  {targetFields}
  {sourceColumns}
  sampleData={{ '客户名称': ['张三', '李四'], '移动电话': ['13800000000', '13900000000'] }}
  onmappingchange={(map) => console.log('最新映射:', map)}
/>
```

### `<ImportPreviewValidator>`

导入前数据逐行校验与行内订正预检器：
- 专为批量导入前的质量把关设计，杜绝脏数据入库。
- **全局概览与仅看异常**：顶部统计总待导入、合法与异常行数，支持一键切换“仅看异常行”。
- **行内就地修改订正**：标红异常单元格并悬停展示错误原因，操作员可直接双击单元格行内订正，修正后错误即时解除；支持单行快速忽略。

```svelte
<script lang="ts">
  import { ImportPreviewValidator } from '@svadmin/ui';

  const columns = [
    { key: 'name', label: '姓名' },
    { key: 'email', label: '电子邮箱' },
  ];

  let rows = $state([
    { name: '王五', email: 'wangwu@example.com' },
    { name: '赵六', email: 'invalid-email-address' },
  ]);

  const errors = [{ rowIndex: 1, field: 'email', message: '邮箱缺少 @ 字符或域名不合法' }];
</script>

<ImportPreviewValidator
  {columns}
  {rows}
  {errors}
  onrowchange={(idx, field, val) => console.log('订正单元格:', idx, field, val)}
  onsubmit={(valid) => console.log('提交合法数据:', valid)}
/>
```

### `<PivotMatrix>` / `<CrossTableSummary>`

多维交叉透视分析矩阵与动态聚合报表：
- 专为财务核算、营收对账、供应链多仓交叉分析设计，突破普通平铺表格限制。
- **动态交叉行列分组**：自由指定行维度与列维度，多字段交叉编排。
- **多度量聚合计算**：原生支持求和（Sum）、平均值（Avg）、计数（Count）、最大/最小值聚合与自定义数字格式化。
- **热力阶梯与行列总计**：基于单元格数值自动呈现语义热力色彩梯度，内置行汇总与全表总计底栏。

```svelte
<script lang="ts">
  import { PivotMatrix } from '@svadmin/ui';

  const data = [
    { region: '华东', dept: '企业软件', quarter: 'Q1', revenue: 1200 },
    { region: '华东', dept: '硬件设备', quarter: 'Q1', revenue: 800 },
    { region: '华南', dept: '企业软件', quarter: 'Q1', revenue: 950 }
  ];
</script>

<PivotMatrix {data} title="营收多维透视矩阵" />
```

### `<GeoScatterMap>` / `<RegionDistributionMap>`

轻量矢量地域空间分布与散点热力大屏组件：
- 零外部数十兆第三方地图 SDK 依赖，采用极简 SVG 矢量区划拓扑渲染。
- **散点气泡自适应缩放**：根据指标数值大小计算气泡外扩半径与涟漪光环。
- **区域排行榜联动**：右侧内置各区域综合负载进度排行与运行状态指示（正常、预警、超限）。

```svelte
<script lang="ts">
  import { GeoScatterMap } from '@svadmin/ui';

  const regions = [
    { id: 'east', name: '华东大区', value: 4820, x: 78, y: 58, status: 'highlight' },
    { id: 'south', name: '华南大区', value: 3650, x: 68, y: 82, status: 'normal' }
  ];
</script>

<GeoScatterMap {regions} title="业务地域空间分布拓扑图" metricLabel="并发连接数" />
```

### `<DataMaskPolicyEngine>` / `<DataMaskCenter>`

基于角色与密级的动态数据脱敏策略中心：
- 集中统一管控企业敏感数据安全治理基线，划分 L1~L4 密级。
- **预设算法与豁免角色**：内置手机号、居民身份证、银行卡号、邮箱、姓名与薪酬脱敏算法，与系统角色矩阵绑定。
- **客户端即时沙箱**：内置测试输入与算法推演沙箱，零网络往返即时验证脱敏效果。

```svelte
<script lang="ts">
  import { DataMaskPolicyEngine } from '@svadmin/ui';
</script>

<DataMaskPolicyEngine onSavePolicies={(policies) => console.log('保存脱敏策略:', policies)} />
```

### `<MockDataInterceptor>` / `<OfflineMockStudio>`

前端请求拦截与离线 Mock 沙箱控制台：
- 彻底解耦前后端联调等待，支持弱网与断网环境下的离线 POC 演示。
- **全局拦截总控**：一键启用或停用全局 Fetch / DataProvider 请求拦截。
- **延时与故障模拟**：自定义模拟网络延迟（0~3000ms）与 HTTP 状态码（200、201、403、500 熔断模拟），支持即时请求核验。

```svelte
<script lang="ts">
  import { MockDataInterceptor } from '@svadmin/ui';
</script>

<MockDataInterceptor onToggleActive={(active) => console.log('Mock 状态变更:', active)} />
```

### `<SystemHealthCheckDashboard>` / `<DiagnosticInspector>`

系统链路自检与运维诊断大盘：
- 面向企业私有化部署与日常运维的一键全量链路健康巡检。
- **核心组件覆盖**：主数据库、分布式缓存、对象存储桶、SSO 鉴权、消息队列与通知网关实时健康状态与往返延时。
- **诊断报告导出**：一键导出带时间戳与环境信息的 JSON / Markdown 诊断审计报告。

```svelte
<script lang="ts">
  import { SystemHealthCheckDashboard } from '@svadmin/ui';
</script>

<SystemHealthCheckDashboard onExportReport={(report) => console.log('导出诊断报告:', report)} />
```

### `<PivotMatrix>`

多维交叉透视矩阵分析表格：
- 专为销售多维切片、财务跨期核对与 BI 报表交叉汇总打造。
- **动态切片与聚合**：支持行维度、列维度自由交叉透视，自动计算行小计、列小计与全表总计。
- **条件热力梯度着色**：根据数值大小自动提供热力色块阶梯渲染，辅助一眼定位关键指标峰值。

```svelte
<script lang="ts">
  import { PivotMatrix, type PivotDimension, type PivotMeasure } from '@svadmin/ui';

  const rows: PivotDimension[] = [{ key: 'region', label: '大区' }];
  const cols: PivotDimension[] = [{ key: 'quarter', label: '季度' }];
  const measures: PivotMeasure[] = [{ key: 'revenue', label: '营收 (万元)', aggregation: 'sum' }];
  const data = [
    { region: '华东', quarter: 'Q1', revenue: 1200 },
    { region: '华东', quarter: 'Q2', revenue: 1450 },
    { region: '华北', quarter: 'Q1', revenue: 980 },
    { region: '华北', quarter: 'Q2', revenue: 1100 },
  ];
</script>

<PivotMatrix {rows} {cols} {measures} {data} />
```

### `<GeoScatterMap>`

纯 SVG 矢量多地域气泡散点分布图：
- 专为大屏驾驶舱与多地域业务密度监控打造，零重型第三方 GIS 依赖，极速轻量渲染。
- **多维度气泡散点**：以地域坐标为基准，根据数值自动换算气泡半径大小与色彩深浅，悬停展示详细业务指标。

```svelte
<script lang="ts">
  import { GeoScatterMap, type GeoRegionData } from '@svadmin/ui';

  const regions: GeoRegionData[] = [
    { id: 'sh', name: '上海节点', x: 75, y: 55, value: 8840, label: '华东核心' },
    { id: 'bj', name: '北京节点', x: 68, y: 32, value: 7200, label: '华北核心' },
    { id: 'sz', name: '深圳节点', x: 70, y: 78, value: 6500, label: '华南核心' },
  ];
</script>

<GeoScatterMap title="全国各区域订单密度分布" {regions} />
```

### `<DataMaskPolicyEngine>`

基于角色的企业级动态数据脱敏策略中心：
- 专为等保三级、金融合规与隐私保护设计。
- **多规则多级别脱敏**：针对手机号、身份证、银行卡、薪资等敏感资产，按角色配置“完全隐藏”、“部分掩码”或“明文透出”策略。

```svelte
<script lang="ts">
  import { DataMaskPolicyEngine, type MaskingPolicyItem } from '@svadmin/ui';

  const policies: MaskingPolicyItem[] = [
    { field: 'phone', label: '客户手机号', ruleType: 'mobile', level: 'partial' },
    { field: 'idCard', label: '身份证号', ruleType: 'idCard', level: 'strict' },
  ];
</script>

<DataMaskPolicyEngine {policies} onpolicychange={(p) => console.log('策略更新:', p)} />
```

### `<MockDataInterceptor>`

前端网络请求拦截与离线 Mock 演练室：
- 专为前端独立开发、离线弱网测试与故障演练设计。
- **接口录制与故障注入**：支持拦截指定 API 路径，自定义模拟响应延时，甚至注入 500、403 等异常状态码以验证前端容灾兜底。

```svelte
<script lang="ts">
  import { MockDataInterceptor, type MockRuleItem } from '@svadmin/ui';

  const rules: MockRuleItem[] = [
    { urlPattern: '/api/orders', method: 'GET', enabled: true, delayMs: 200, responseStatus: 200, mockData: '{"items":[]}' },
  ];
</script>

<MockDataInterceptor {rules} />
```

### `<SystemHealthCheckDashboard>`

全系统服务健康度自检与诊断大屏：
- 专为微服务集群监控、依赖可用性诊断与运维巡检打造。
- **全链路心跳监控**：实时检查数据库主备连接池、Redis 缓存集群、对象存储 OSS 及三方支付接口 SLA。

```svelte
<script lang="ts">
  import { SystemHealthCheckDashboard, type HealthServiceCheck } from '@svadmin/ui';

  const services: HealthServiceCheck[] = [
    { name: 'PostgreSQL 主数据库', status: 'healthy', latencyMs: 12, uptime: '99.99%' },
    { name: 'Redis 缓存集群', status: 'healthy', latencyMs: 4, uptime: '100%' },
    { name: 'S3 对象存储', status: 'healthy', latencyMs: 35, uptime: '99.95%' },
  ];
</script>

<SystemHealthCheckDashboard {services} />
```

### `<AdminCopilotWidget>`

管理后台右下角智能业务副驾驶浮动助手：
- 专为现代 AI 增强型企业工作台与表格智能问答设计。
- **常驻悬浮与智能展开**：右下角常驻带脉冲光晕的圆形触发按钮，点击平滑展开交互式对话卡片。
- **自然语言过滤意图提取与回写**：用户输入自然语言（如“筛选华东大区大额订单”），助理在回复中智能提取推荐的结构化筛选条件（如 `region = 华东大区 且 amount >= 50000`），并提供“一键应用此筛选”操作按钮，直接注入页面表格。
- **快捷提问气泡**：预置高频业务问题气泡，支持点击秒级填入并自动发送。

```svelte
<script lang="ts">
  import { AdminCopilotWidget } from '@svadmin/ui';
</script>

<AdminCopilotWidget
  botName="SVAdmin AI 助手"
  title="财务与销售数据智能副驾驶"
  onapplyfilter={(filter) => console.log('应用筛选条件:', filter)}
/>
```

### `<QueryAiExplainer>`

AI 规则语义解释卡片：
- 专为非技术业务人员、财务与审计人员理解复杂技术表达式打造。
- **技术表达式转自然语言**：接收复杂的 SQL WHERE 语句、JSON 规则树或逻辑条件，自动解析拆解为通俗易懂的业务规则清单。
- **双栏直观对比与复制**：代码区高亮原始表达式，业务区清晰罗列核心业务约束与交并集逻辑，支持一键复制说明文本。

```svelte
<script lang="ts">
  import { QueryAiExplainer } from '@svadmin/ui';
</script>

<QueryAiExplainer
  contextName="核心订单流水表"
  queryText="WHERE (region = '华东大区' AND amount >= 50000) OR priority = 'URGENT'"
  onexplain={(sql) => console.log('重新解析 SQL:', sql)}
/>
```

### `<WorkflowGraphDesigner>`

复杂审批流 BPMN 流程编排与条件分支设计器：
- 专为大型政企、OA、ERP 与复杂财务审批流编排打造。
- **全流程节点图元**：开始节点、条件判断网关（Gateway）、审批节点（直属主管/角色组/多级会签）、抄送节点与流程结束节点。
- **可视化连线与分支增删**：支持在线动态在各环节之间插入审批节点或条件网关，实时输出标准流程结构拓扑。

```svelte
<script lang="ts">
  import { WorkflowGraphDesigner, type WorkflowGraphNode } from '@svadmin/ui';

  const nodes: WorkflowGraphNode[] = [
    { id: '1', type: 'start', title: '发起请假申请' },
    { id: '2', type: 'condition', title: '天数判定', conditionText: '请假天数 >= 3 天' },
    { id: '3', type: 'approval', title: '部门经理审批', assigneeText: '直属总监 (会签)' },
    { id: '4', type: 'end', title: '审批结束' },
  ];
</script>

<WorkflowGraphDesigner initialNodes={nodes} onnodeschange={(n) => console.log('流程更新:', n)} />
```

### `<WorkflowExecutionTracker>`

审批流执行追踪全景看板：
- 专为长流转周期工单全景追溯打造。
- **步进流向与处理耗时**：直观展示已通过节点（处理人、审批时间、附言意见）、当前流转节点（带脉冲水波纹动效与待办人）、未到达节点与驳回节点。

```svelte
<script lang="ts">
  import { WorkflowExecutionTracker, type ExecutionStep } from '@svadmin/ui';

  const steps: ExecutionStep[] = [
    { id: 's1', nodeTitle: '提交采购单', status: 'completed', handlerName: '张三', actionTime: '2026-11-12 09:30' },
    { id: 's2', nodeTitle: '财务合规审核', status: 'current', handlerName: '李主管', comment: '正在核验预算发票' },
    { id: 's3', nodeTitle: '总经理终审', status: 'waiting' },
  ];
</script>

<WorkflowExecutionTracker instanceId="FLOW-202611-9921" flowName="大额设备采购审批单" {steps} />
```

### `<DataScopeRuleEditor>`

数据行级权限与范围规则中心（Row-Level Security）：
- 专为集团型多部门数据隔离与数据安全设计。
- **多维度数据边界**：按资源配置角色能够查看的行级范围（全部数据、本部门及下属部门、仅本部门、仅本人负责、或自定义 SQL 过滤表达式）。

```svelte
<script lang="ts">
  import { DataScopeRuleEditor } from '@svadmin/ui';

  const resources = [
    { key: 'orders', label: '财务与交易订单' },
    { key: 'customers', label: '核心客户档案' },
  ];
</script>

<DataScopeRuleEditor roleName="区域销售经理" {resources} onchange={(rules) => console.log('行权限规则更新:', rules)} />
```

### `<ScreenAntiLeakGuard>` / `<WatermarkPolicyStudio>`

屏幕动态防拍照防泄密防御套件与自愈水印：
- 专为金融、证券、等保 2.0 及商业机密防内部员工拍照泄密打造。
- **DOM 防篡改自愈机制**：基于 `MutationObserver` 深度监听 DOM 变动，一旦水印节点被审查元素删除或隐藏，1毫秒内自动强制自愈注水。
- **动态平铺阵列**：平铺当前登录人工号、姓名、客户端内网 IP 与精确防伪时间戳。

```svelte
<script lang="ts">
  import { ScreenAntiLeakGuard } from '@svadmin/ui';
</script>

<ScreenAntiLeakGuard text="张伟 (EMP-01) · 机密数据" subtext="严禁拍照 · 违者必究" />
```

### `<DataLineageGraph>` / `<FieldLineageTracker>`

数据资产全链路血缘图谱与字段级影响面分析：
- 贯穿源数据表、ETL 清洗中间层、数仓主题宽表到下游大屏报表与数据接口。
- **全链路依赖高亮**：点击任意节点自动高亮上下游血缘路径，弱化无关节点分支。
- **资产元数据详情**：实时查看数据表记录行数、责任部门、更新频次与核心字段清单。

```svelte
<script lang="ts">
  import { DataLineageGraph } from '@svadmin/ui';
</script>

<DataLineageGraph title="核心财务数仓血缘关系图" />
```

### `<LiveStreamLogViewer>` / `<TailLogConsole>`

高性能实时流式日志终端与正则高亮监视器：
- 类似 `tail -f` 极速流式日志排错控制台，专为运维排障与后台定时任务监视设计。
- **智能吸底跟随**：在日志最底端时自动跟随流式滚动，向上回溯时智能暂停吸底。
- **日志级别与搜索**：支持按 `INFO`、`WARN`、`ERROR`、`DEBUG` 级别过滤与正则关键字高亮匹配。

```svelte
<script lang="ts">
  import { LiveStreamLogViewer } from '@svadmin/ui';
</script>

<LiveStreamLogViewer title="网关服务实时访问日志" />
```

### `<ElectronicSealStamp>` / `<ContractSigningPad>`

企业级矢量防伪电子印章与合同签章套件：
- 纯 SVG 矢量电子印章，失真无损且打印清晰。
- **经典几何规范**：外层同心双圆环、沿弧形排列的企业全称、中心五角星或“已通过/已驳回”印模。
- **防伪与做旧质感**：底部防伪 13 位编码与仿真印泥倾角。

```svelte
<script lang="ts">
  import { ElectronicSealStamp } from '@svadmin/ui';
</script>

<ElectronicSealStamp companyName="上海创智多租户网络科技有限公司" sealTitle="电子审批专用章" />
```

### `<SystemCapacityForecastCard>` / `<ResourceCapacityPredictor>`

系统容量趋势预测与自动扩缩容建议卡片：
- 针对数据库磁盘、对象存储与 API 额度，前置预测配额耗尽倒计时。
- **耗尽倒计时预警**：直观展示“预计 N 天后达到硬配额上限”警示徽标。
- **趋势预测折线图**：历史实际用量实线平滑连接未来拟合虚线，支持一键发起扩容。

```svelte
<script lang="ts">
  import { SystemCapacityForecastCard } from '@svadmin/ui';
</script>

<SystemCapacityForecastCard resourceName="云数据库存储容量" estimatedDaysRemaining={14} />
```

### `<TenantContextSwitcher>` / `<WorkspaceContextSwitcher>`

企业级多租户、多工作区与分级组织架构切换器：
- 顶栏或侧边栏级组织切换面板，支持多子公司、事业部、网点与独立工作区。
- **租户树形检索**：按租户名称、代号快速模糊检索过滤，带旗舰版/专业版配额徽标。
- **最近访问与切换确认**：置顶最近使用的工作区，支持切换拦截、异步加载态与组织管理入口。

```svelte
<script lang="ts">
  import { TenantContextSwitcher } from '@svadmin/ui';
</script>

<TenantContextSwitcher currentTenantId="tenant-corp-01" />
```

### `<OmnibarCommandPalette>` / `<GlobalCommandOmnibar>`

全局 `⌘+K` / `Ctrl+K` 极速命令面板与全系统资源检索浮窗：
- 对标 Raycast、Linear 与 Stripe Command Menu 的全局命令中枢。
- **多维分类搜索**：无缝聚合快捷操作、页面导航直达、业务实体数据检索与 AI 智语解读。
- **全键盘流畅交互**：支持全局热键监听、上下方向键高亮、回车执行、ESC 退出与分类 Chips 切换。

```svelte
<script lang="ts">
  import { OmnibarCommandPalette } from '@svadmin/ui';

  let open = $state(false);
</script>

<OmnibarCommandPalette bind:open />
```

### `<AuditTrailInspector>` / `<SecurityAuditTimeline>`

全局操作审计追踪中心与敏感变更链路回溯：
- 记录跨租户切换、高危指令、权限提权、批量删除与大批量数据导出的审计日志流。
- **多维安全指标统计**：实时统计总事件数、高危提权告警、安全门禁拦截数与租户切换频次。
- **字段变更差异对比**：展开查看操作人真实 IP、Trace 链路追踪 ID、执行上下文以及实体字段变更前/后对比（Field Diffs）。

```svelte
<script lang="ts">
  import { AuditTrailInspector } from '@svadmin/ui';
</script>

<AuditTrailInspector />
```

### `<DashboardGridLayout>` / `<DynamicWidgetGrid>`

企业级自由流式 12 栅格自适应大屏排版引擎：
- 类似 Grafana 与 Retool 的自由大屏小部件排版画布，支持 KPI 计分卡、时序图表与数据表格混排。
- **自由尺寸缩放与锁定**：支持按栅格调节小部件宽度与高度，支持单卡片静态防拖拽锁定。
- **编辑态与预览态切换**：一键进入排版编辑模式，支持动态追加卡片、移除卡片与重置默认布局。

```svelte
<script lang="ts">
  import { DashboardGridLayout } from '@svadmin/ui';
</script>

<DashboardGridLayout />
```

### `<DashboardLayoutStorage>` / `<DashboardPresetManager>`

多租户与角色维度大屏排版预设方案管理器：
- 支持保存、切换和管理“高管经营全景”、“财务月结对账”与“SRE 故障监控”大屏方案。
- **一键另存与覆盖更新**：当前排版直接另存为新方案，支持标注适用角色与说明。
- **JSON 配置导入导出**：支持大屏配置一键导出与跨环境恢复部署。

```svelte
<script lang="ts">
  import { DashboardLayoutStorage } from '@svadmin/ui';
</script>

<DashboardLayoutStorage />
```

### `<ChartAnnotationOverlay>` / `<MetricEventAnnotation>`

业务重大事件、异常故障与阈值标记层覆盖套件：
- 在时序走势图、指标折线图上叠加版本全量发布线、促销节点线、水位阈值线与突发故障气泡。
- **垂直事件线与图钉交互**：按时间百分比精准吸附定位，点击图钉联动展开事件根因与业务说明卡片。
- **多维告警色彩语义**：内置发布（primary）、故障告警（destructive）、大促活动（warning）、目标达成（success）四种标准语义色。

```svelte
<script lang="ts">
  import { ChartAnnotationOverlay } from '@svadmin/ui';
</script>

<ChartAnnotationOverlay />
```

### `<AbacPolicyMatrix>` / `<AttributeBasedAccessControlMatrix>`

企业级基于属性的动态访问控制（ABAC）策略矩阵：
- 综合主体属性（部门/职级/安全等级）、客体属性（数据密级/业务金额上限）与环境（IP/时段）动态判定。
- **多维安全裁决效应**：支持 `allow`（正常放行）、`mask`（动态脱敏）、`require_mfa`（需阶梯提权二次认证）与 `deny`（绝对安全阻断）。
- **细粒度属性条件组**：支持操作符扩展（`eq`、`in`、`gte`、`lte`），并提供策略启停开关与优先级调度。

```svelte
<script lang="ts">
  import { AbacPolicyMatrix } from '@svadmin/ui';
</script>

<AbacPolicyMatrix />
```

### `<PermissionSimulator>` / `<RolePermissionSandbox>`

角色身份与多维属性权限推演沙箱（上帝视角模拟器）：
- 管理员可在无需借用员工密码换号登录的前提下，直接以指定员工身份推演权限。
- **三栏多维推演结果**：清晰对比展示系统导航菜单可见性、高危业务动作裁决结论与行级数据范围（RLS）注入表达式。
- **密级与网络环境仿真**：联动展示该员工的安全密级（L1-L4）与模拟访问 IP 网段。

```svelte
<script lang="ts">
  import { PermissionSimulator } from '@svadmin/ui';
</script>

<PermissionSimulator />
```

### `<WorkflowNodeInspector>` / `<ApprovalNodeDrawer>`

审批流节点属性配置抽屉与决议规则检查器：
- 面向工作流编排设计器（`<WorkflowGraphDesigner>`）的节点属性配置抽屉。
- **灵活审批人指定**：支持直属主管、岗位角色、指定具体人员与发起人自选四种模式。
- **多审批人决议方式**：内置会签（全员同意）、或签（一名同意即可）与投票通过比例配置，并支持超时自动流转策略。

```svelte
<script lang="ts">
  import { WorkflowNodeInspector } from '@svadmin/ui';

  let open = $state(false);
</script>

<WorkflowNodeInspector bind:open />
```

### `<MediaGallery>` / `<MultiModalMediaGallery>`

企业多模态媒体画廊与全屏沉浸灯箱套件：
- 适用于商品库素材、审批票据证照、视频巡检回放及合同附件的多形态统一展示。
- **全屏沉浸式灯箱体验**：支持滚轮无级缩放（0.2x~5.0x）、双击复位、拖拽平移、90° 步进旋转与左右快捷键盘切图。
- **+N 折叠与安全防护**：超过最大展示数自动折叠为 `+N` 胶囊，全屏浏览内置元数据抽屉（分辨率/大小/上传者）与防截图动态水印。

```svelte
<script lang="ts">
  import { MediaGallery } from '@svadmin/ui';

  const items = [
    { id: 1, src: '/blueprint.png', title: '系统拓扑设计', size: '3.2 MB', dimensions: '2560x1440' },
    { id: 2, src: '/demo.mp4', title: '操作演示视频', type: 'video' },
  ];
</script>

<MediaGallery {items} watermarkText="CONFIDENTIAL" />
```

### `<HotkeysHelpModal>` / `<HotkeysGuideModal>`

企业全系统键盘快捷键指引面板：
- 专为桌面级高频操作业务打造，按全局 `?` 键或 `Shift + /` 即可即时唤醒。
- **平台智能感知自适应**：自动识别 macOS 与 Windows/Linux 平台，动态呈现 `⌘ / ⌥ / ⇧` 或 `Ctrl / Alt / Shift` 实体键帽。
- **业务分组与即时模糊检索**：按全局导航、表格操作、表单编辑等分组呈现，支持按功能名称或键位即时过滤。

```svelte
<script lang="ts">
  import { HotkeysHelpModal } from '@svadmin/ui';

  let open = $state(false);
</script>

<HotkeysHelpModal bind:open enableGlobalTrigger={true} />
```

### `<ResizableSplitter>` / `<DynamicSplitter>`

企业级多面板拖拽分栏与折叠套件：
- 适用于工作台主次分栏、代码与预览双屏、日志实时监控与详情抽屉等复杂布局。
- **双向平滑拖拽**：支持水平（横向）与垂直（纵向）双向拖拽，内置最小与最大尺寸边界保护。
- **一键极速折叠与本地记忆**：分割条内置微型折叠指示按钮与双击居中平分，可选基于 `storageKey` 记忆用户自定义排版比例。

```svelte
<script lang="ts">
  import { ResizableSplitter } from '@svadmin/ui';
</script>

<div class="h-96 w-full border border-border rounded-xl overflow-hidden">
  <ResizableSplitter direction="horizontal" initialSizes={[30, 70]} storageKey="dashboard_layout">
    {#snippet firstPane()}
      <div class="p-4 text-sm font-medium">左侧目录导航树</div>
    {/snippet}
    {#snippet secondPane()}
      <div class="p-4 text-sm font-medium">右侧主工作区详情</div>
    {/snippet}
  </ResizableSplitter>
</div>
```

<!-- PR #793 交互约定 -->

媒体预览和快捷键指引复用共享 Dialog 的焦点与 Esc 关闭行为。播放控件保留自身方向键操作；活动资源从列表移除时关闭预览。`enableDownload={false}` 隐藏所有内置下载入口。默认下载支持 HTTP、HTTPS 和 blob URL，宿主可通过 `onDownload` 自定义下载。

分栏同时约束两侧尺寸，总和始终为 100%。折叠恢复保留原比例；双击在允许范围内居中，Home/End 调整至最小/最大比例。无效持久化数据回退到初始比例，卸载时移除拖拽监听。

### `<MicroAppSandbox>` / `<SubAppRuntimeSandbox>`

企业级微前端子应用隔离运行时沙箱套件：
- 基于 Shadow DOM 或隔离 iframe 的全生命周期子应用载体，支持鉴权 Token 自动注入与主题风格透传。
- **全生命周期自愈保护**：内置骨架加载中（loading）、正常挂载（mounted）与异常崩溃降级拦截（crash boundary），支持一键自愈重启。
- **全屏聚焦与独立开窗**：支持将子应用一键放大为全屏独占工作台，或在新标签页中独立调试。

```svelte
<script lang="ts">
  import { MicroAppSandbox } from '@svadmin/ui';
</script>

<MicroAppSandbox appName="财务营收分析子应用" src="https://bi.example.com/embed" />
```

### `<MicroAppStateBusIndicator>` / `<CrossAppStateBus>`

父子微应用跨端轻量响应式状态总线中枢：
- 基于 BroadcastChannel 与 PostMessage 的跨技术栈双向状态广播机制。
- **多频道状态流转**：支持租户上下文变更、用户 Token 刷新、全局暗色主题切换等核心事件毫秒级广播与订阅响应。
- **可视化消息流监控**：实时呈现各子应用连接状态与最近广播报文 Payload，支持一键清空与模拟广播。

```svelte
<script lang="ts">
  import { MicroAppStateBusIndicator } from '@svadmin/ui';
</script>

<MicroAppStateBusIndicator />
```

### `<FeatureFlagStudio>` / `<GrayReleaseManager>`

功能开关配置编辑器与渐进发布模拟器。组件在当前注册表中评估配置，通过 `onChange` 通知编辑结果；持久化由宿主应用对接自己的服务完成。

- 全局关闭与紧急熔断优先于其他规则。
- 命中 `notIn` 排除名单时始终关闭，不受 `in` / `equals` 白名单顺序影响。
- 白名单可提前向指定用户、租户或角色开放。未命中者遵循发布比例；未设置比例时，有白名单的开关仅向白名单开放。
- 按开关和用户／租户稳定分桶；渐进发布缺少稳定实体身份时返回关闭。
- 熔断弹窗支持键盘焦点、Escape 取消与显式确认。

在每个应用根组件中创建独立注册表，SSR 每个请求各自创建，并向编辑器和消费方传入同一个实例：

```svelte
<script lang="ts">
  import { FeatureFlagStudio, createFeatureFlagRegistry, useFeatureFlag, type FeatureFlag } from '@svadmin/ui';

  const flags: FeatureFlag[] = [
    { key: 'billing_v2', name: 'Billing Engine V2', enabled: true, percentage: 25, tags: ['billing', 'beta'] },
  ];
  const registry = createFeatureFlagRegistry(flags);
  const billingFeature = useFeatureFlag('billing_v2', () => ({ userId: 'user_123' }), false, registry);
</script>

<FeatureFlagStudio {flags} {registry} showSimulator={true} />
<p>当前用户：{billingFeature.enabled ? '已开放' : '未开放'}</p>
```

`useFeatureFlag` 随注册表写入和响应式上下文变化更新。读写均隔离配置快照。`registerFeatureFlags`、`setFeatureFlag`、`getFeatureFlag`、`clearFeatureFlags` 的最后一个参数可传入注册表；默认注册表仅供浏览器使用，SSR 必须显式传入请求实例。没有传入注册表的 Studio 拥有独立状态，不会写入浏览器默认注册表。

替换 `flags` 属性会同步编辑器快照，并从关联注册表移除过期条目。`onChange(flag)` 提供用于持久化的独立快照，修改它不会影响编辑器或最初的输入对象。设置 0% 比例并配置白名单，可实现仅向试用用户开放。

### `<MicroAppRouteSync>` / `<SubAppUrlSynchronizer>`

微前端父子单页应用路由双向无感同步协调器：
- 解决微前端经典架构痛点：子应用内部切页后刷新丢失、404 以及浏览器前进后退断裂。
- **双向无感映射**：将子应用单页路由编码映射为宿主查询参数（如 `?subAppRoute=/reports/details`），并在宿主 popstate 时反向通知子应用。
- **路由栈历史回放**：直观展示快捷路由栈与一键复制带深层路径的完整分享链接。

```svelte
<script lang="ts">
  import { MicroAppRouteSync } from '@svadmin/ui';
</script>

<MicroAppRouteSync initialRoute="/reports/quarterly-gmv/details" />
```


### `<FieldMappingBuilder>` / `<ColumnMappingBuilder>`

企业级跨系统字段可视化连线与映射构建器：
- **跨系统字段映射**：支持将导入文件（CSV/Excel/JSON）或外部三方接口字段对齐映射至系统业务模型。
- **智能模糊匹配**：内置智能匹配启发算法，自动关联下划线、驼峰及中英文标签相似字段。
- **数据清洗转换**：支持直接映射、去空格、全大写、全小写、数值转换及默认回退值填充。
- **实时样本推演**：支持接入样本数据，实时预览前置清洗转换后的实际目标值。

```svelte
<script lang="ts">
  import { FieldMappingBuilder } from '@svadmin/ui';

  const sourceFields = [
    { name: 'user_name', label: '用户姓名', sample: '张三' },
    { name: 'contact_email', label: '联系邮箱', sample: 'zhang@example.com' },
  ];

  const targetFields = [
    { name: 'username', label: '账户姓名', required: true },
    { name: 'email', label: '电子邮箱', required: true },
  ];
</script>

<FieldMappingBuilder {sourceFields} {targetFields} />
```

### `<DataImportPipeline>` / `<BatchImportPipeline>`

企业批量数据智能导入与行内就地纠错流水线：
- **全流程四阶管道**：涵盖数据录入解析、字段映射转换、质检就地纠错、批量并发导入四阶段。
- **行内就地纠错**：高亮错误单元格并提示校验失败原因，支持双击就地编辑与即时重新校验。
- **质检分类筛选**：支持“全部”、“仅看异常”、“仅看合规”视图快速切换，一键剔除不可修复脏数据。
- **入库进度推演**：实时呈现导入进度条、成功/失败明细统计与重试触发。

```svelte
<script lang="ts">
  import { DataImportPipeline } from '@svadmin/ui';

  const targetFields = [
    { name: 'name', label: '姓名', required: true },
    { name: 'email', label: '邮箱', required: true },
  ];
</script>

<DataImportPipeline {targetFields} />

### `<NotificationCenter>` / `<NotificationDrawer>` (`<GlobalNoticeDrawer>`)

紧凑铃铛弹层保持现有 `items`、`onread`、`onreadall` API 兼容。通过 `showDrawerButton` 和 `onopendrawer` 打开完整通知抽屉。

抽屉支持全部、未读、任务、公告和安全筛选，不原地修改调用方数据；提供全局全部已读、清理已读，以及 Escape 关闭、焦点约束和焦点恢复。异步操作等待成功后更新状态，阻止重复提交并展示失败。单个操作的 `onClick` 优先于抽屉级 `onAction`，避免重复执行。

`dndEnabled` 是可绑定的免打扰偏好；宿主可通过 `onToggleDnd` 接入自己的提醒投递策略。抽屉不会丢弃消息；免打扰仅弱化普通徽标，安全消息及其徽标始终可见。

```svelte
<script lang="ts">
  import { NotificationCenter, NotificationDrawer, type NotificationDrawerItem } from '@svadmin/ui';

  let drawerOpen = $state(false);
  let notifications = $state<NotificationDrawerItem[]>([
    {
      id: 'task-1', title: 'Expense reimbursement pending', category: 'TASKS',
      read: false, createdAt: '5m ago',
      actions: [{ id: 'approve', label: 'Approve', variant: 'primary' }],
    },
    {
      id: 'security-1', title: 'New device login alert', category: 'SECURITY_ALERTS',
      read: false, createdAt: '1h ago',
    },
  ]);
</script>

<NotificationCenter
  items={notifications.map(item => ({ ...item, time: item.createdAt }))}
  showDrawerButton
  onopendrawer={() => { drawerOpen = true; }}
/>
<NotificationDrawer bind:open={drawerOpen} bind:items={notifications} />
```

### `<I18nStudio>` (`<TranslationManager>`)

`<I18nStudio>` 提供企业级多语言翻译字典管理工作台，支持词条翻译完整度核验与运行时热更新（Hot Reloading）。

核心特性：
- **命名空间层级化管理**：基于点分路径（如 `auth.*`, `dashboard.*`, `common.*`）自动生成命名空间树与过滤；
- **翻译完整度度量**：实时统计翻译完成率百分比（`% Translated`）及缺失词条数；
- **双语对照编辑**：左侧展示源语言参考文案，右侧支持目标语言即时编辑，带有草稿（Draft）与缺失（Missing）状态徽章；
- **免刷新热重载（`allowLiveApply`）**：修改后可一键热更新注入当前 `@svadmin/core` 运行时词典，即时预览文案生效效果；
- **导入与导出**：支持一键导出标准 JSON 词典文件，并支持快速粘贴合并 JSON 词典。

```svelte
<script lang="ts">
  import { I18nStudio } from '@svadmin/ui';

  let dictionaries = $state({
    'zh-CN': {
      'auth.login.title': '欢迎登录',
      'common.ok': '确定',
    },
    'en-US': {
      'auth.login.title': 'Welcome Back',
      'common.ok': 'OK',
    },
  });
</script>

<I18nStudio
  {dictionaries}
  sourceLocale="zh-CN"
  targetLocale="en-US"
  onSave={(updated) => console.log('保存翻译词典:', updated)}
/>
```
