# SVAdmin 逃生舱（Escape Hatches）渐进定制架构

> 本文档规范 SVAdmin 从“零代码声明式 CRUD”到“极致复杂非标业务”的四层渐进式定制天梯（Progressive Customization Ladder），防止开发者与 AI Agent 在面对定制需求时越级重写导致代码膨胀与架构漂移。

---

## 🎯 核心原则

1. **守门原则**：能用低梯级（Level 1/2）解决的需求，严禁越级跃迁到高梯级（Level 3/4）；
2. **状态继承**：尽可能保留框架自动提供的分页、排序、服务端过滤、URL 同步、权限检查（RBAC）与审计日志能力；
3. **接口对齐**：`AutoTable` 与 `AutoForm` 采用统一的局部 Snippet 映射契约（`columns` 对齐 `fields`）。

---

## 🪜 四层渐进定制天梯

| 梯级 | 形式 | 适用场景 | 状态控制权 |
| :--- | :--- | :--- | :--- |
| **Level 1** | **声明式 Schema** | 标准 CRUD、简单枚举字段、基础只读/必填、常规字段展示 | 框架全自动托管 |
| **Level 2** | **组件局部 Snippet 映射** | 特殊列 Badge/配色、单个字段联动、自定义操作按钮、弹窗触发 | 框架托管数据流，用户接管局部渲染 |
| **Level 3** | **半 Headless 复合组件拼装** | 特殊多步交互、嵌入式抽屉、主子表内联编辑、分栏定制容器 | 组合框架 UI Primitives，局部控制状态 |
| **Level 4** | **纯 Headless Hooks 自由实现** | 流程画布、甘特图、复杂富媒体大屏、颠覆性非标准管理流 | 开发者/AI 完全自主接管 UI，仅复用数据与认证 Provider |

---

## 📝 详细规范与代码范例

### Level 1: 声明式 Schema 配置（零 UI 代码）

仅需在 `ResourceDefinition` 中定义字段、类型及内置属性：

```ts
export const ordersResource: ResourceDefinition = {
  name: 'orders',
  label: '订单列表',
  fields: [
    { key: 'id', label: 'ID', type: 'number', showInForm: false },
    { key: 'orderNo', label: '订单号', type: 'text', required: true, searchable: true },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '待支付', value: 'pending' },
        { label: '已完成', value: 'completed' },
      ],
    },
    { key: 'amount', label: '金额', type: 'number', required: true },
  ],
};
```

使用方式：
```svelte
<AutoTable resourceName="orders" />
<AutoForm resourceName="orders" />
```

---

### Level 2: 组件局部 Snippet 映射（推荐定制方式）

当需要对特定列或字段做个性化渲染时，**严禁重写整个表格或表单**，使用局部 Snippet 映射：

#### AutoTable 局部列定制 (`columns` / `rowActions`)

```svelte
<script lang="ts">
  import { AutoTable, Badge, Button } from '@svadmin/ui';
</script>

<AutoTable resourceName="orders">
  {#snippet columns()}
    <!-- 针对 status 列做高亮徽标定制 -->
    {#snippet status({ value, record })}
      <Badge variant={value === 'completed' ? 'default' : 'secondary'}>
        {value === 'completed' ? '已完成' : '待处理'}
      </Badge>
    {/snippet}
  {/snippet}

  {#snippet rowActions({ record, id })}
    <Button size="sm" variant="ghost" onclick={() => handleAudit(id)}>
      审核订单
    </Button>
  {/snippet}
</AutoTable>
```

#### AutoForm 局部字段定制 (`fields`)

```svelte
<script lang="ts">
  import { AutoForm } from '@svadmin/ui';
  import CustomUserPicker from './CustomUserPicker.svelte';
</script>

<AutoForm
  resourceName="orders"
  fields={{
    assignedTo: customUserSnippet,
  }}
/>

{#snippet customUserSnippet({ field, value, onchange, disabled, invalid })}
  <div class="space-y-1">
    <label class="text-sm font-medium">{field.label}</label>
    <CustomUserPicker
      {value}
      {disabled}
      onselect={(userId) => onchange(userId)}
    />
    {#if invalid}
      <span class="text-xs text-destructive">请选择经办人</span>
    {/if}
  </div>
{/snippet}
```

---

### Level 3: 半 Headless 复合组件拼装

当页面容器需要深度重新布局，但依然需要标准表头、分页栏与数据时：

```svelte
<script lang="ts">
  import { Table, Button, Pagination } from '@svadmin/ui';
  import { useTable } from '@svadmin/core';

  const { tableData, pagination, sorters } = useTable({ resource: 'orders' });
</script>

<div class="grid grid-cols-3 gap-6">
  <div class="col-span-2">
    <!-- 使用 @svadmin/ui 的原生 Table Primitives -->
    <Table.Root>
      <Table.Header>...</Table.Header>
      <Table.Body>...</Table.Body>
    </Table.Root>
  </div>
  <div class="col-span-1">
    <!-- 侧边附加统计面板 -->
  </div>
</div>
```

---

### Level 4: 纯 Headless Hooks 自由实现

对于完全异构的管理视图（如流程图审批画布、白板、甘特图）：

```svelte
<script lang="ts">
  import { useList, useUpdate } from '@svadmin/core';

  const orders = useList({ resource: 'orders' });
  const updateOrder = useUpdate();
</script>

<!-- 完全自定义的 DOM 与样式结构 -->
```

---

## 🤖 AI Agent 遵守指令 (Vibe Prompting Rule)

在为 svadmin 生成定制代码时，AI Agent 必须遵循：
> **“禁止在只需要修改局部字段展示或单列表格样式时，将 `<AutoTable>` / `<AutoForm>` 退化展开为多行底层 HTML / TanStack 代码。优先使用 Level 2 `columns` 与 `fields` Snippet 映射！”**
