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
