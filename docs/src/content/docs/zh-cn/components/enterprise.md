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
- 聚光灯（Spotlight）视口遮罩与镂空高亮目标元素。
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
- 支持纯数值、字符串增量格式化，可自定义精度、前缀（如 `YoY` / `环比`）与后缀（默认 `%`）。
- 支持反向色彩语义（`reverseColor=true`），适配错误率、延迟、排队积压等跌为优的监控场景。
- 遵循设计系统规范语义 Token，提供 `text`、`badge`、`solid` 多种视觉形态。

```svelte
<script lang="ts">
  import { TrendIndicator } from '@svadmin/ui';
</script>

<!-- 自动计算百分比涨跌 -->
<TrendIndicator value={1250} prevValue={1000} prefix="YoY" variant="badge" />

<!-- 异常指标反向色彩语义 -->
<TrendIndicator value={-12.4} reverseColor={true} variant="solid" />
```

### `<SignaturePad>`

移动审批与桌面结算场景的高保真电子签名手写板：
- 二次贝塞尔平滑压感笔触插值算法。
- 完整的笔画撤销（`Undo`）与一键清空重置。
- 导出透明背景 PNG Data URL（`toDataURL()`）与 SVG 矢量图格式（`toSVG()`）。
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
