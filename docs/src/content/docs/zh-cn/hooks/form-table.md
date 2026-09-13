---
title: 表单与表格 Hook
description: useForm、useTable、useStepsForm、useModalForm、useDrawerForm
---

## `useForm`

功能完备的表单 Hook，支持自动保存、验证和路由自动推导。

### 基本用法

```typescript
const form = useForm({ resource: 'posts', action: 'create' });
```

### 路由自动推导

在页面 `/#/posts/edit/5` 上，只需调用：

```typescript
const form = useForm();
// 自动推导：resource='posts', action='edit', id='5'
```

### 选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `resource` | `string?` | 自动 | 资源名称（从路由自动推导） |
| `action` | `'create' \| 'edit' \| 'clone'` | 自动 | 表单动作 |
| `id` | `string \| number` | 自动 | 编辑/克隆的记录 ID |
| `redirect` | `'list' \| 'edit' \| 'show' \| false` | `'list'` | 提交后跳转位置 |
| `validate` | `(values) => errors \| null` | — | 客户端验证 |
| `autoSave` | `{ enabled, debounce? }` | — | 自动保存 |
| `mutationMode` | `MutationMode` | `'pessimistic'` | 变更策略 |
| `undoableTimeout` | `number` | `5000` | 撤销超时（毫秒） |
| `successNotification` | `string \| false` | 自动消息 | 页面自行展示完成状态时设为 `false` |
| `errorNotification` | `string \| false` | Provider 错误 | 覆盖或关闭全局错误通知 |

### 返回值

```typescript
const {
  // 表单值（唯一数据源）
  values,         // TVariables（响应式）
  setFieldValue,  // (field, value, opts?) => void
  setValues,      // (newValues, opts?) => void

  // 脏状态（Tainted）
  tainted,        // Record<string, boolean>（响应式）
  isTainted,      // (field?) => boolean

  // 错误
  errors,         // Record<string, string>（响应式）
  setFieldError,  // (field, message) => void
  clearFieldError, // (field) => void
  clearErrors,    // () => void
  validateField,  // (field) => string | null

  // 提交
  submit,         // (overrides?) => Promise<void> — 验证 + 提交
  reset,          // () => void — 重置为初始值

  // 状态
  loading,        // boolean — 查询加载中（编辑/克隆）
  submitting,     // boolean — 变更进行中
  resource,       // string
  action,         // 'create' | 'edit' | 'clone'
  id,             // string | number | undefined
  setId,          // (newId) => void

  // 自动保存
  triggerAutoSave, // () => void
  autoSave,       // { status, data, error }

  // 原始查询/变更（逃生舱）
  query,          // TanStack 查询（编辑/克隆模式）
  mutation,       // TanStack 变更
} = useForm();
```

### HttpError 集成

当 DataProvider 抛出 `HttpError` 时，验证错误会自动映射到表单字段：

```typescript
// 在 DataProvider 中：
throw new HttpError('验证失败', 422, {
  email: ['邮箱为必填项'],
  name: '名称太短',
});
// → form.errors = { email: '邮箱为必填项', name: '名称太短' }
```

## `useStepsForm`

多步骤向导表单，支持步骤导航和逐步验证。

### 基本用法

```svelte
<script lang="ts">
  import { defineResource, useStepsForm } from '@svadmin/core';
  import { Type } from '@sinclair/typebox';

  const products = defineResource('products', {
    record: Type.Object({ id: Type.Number(), name: Type.String(), price: Type.Number() }),
    create: Type.Object({ name: Type.String({ minLength: 1 }), price: Type.Number({ minimum: 0 }) }),
  });
  const form = useStepsForm({
    resource: products,
    action: 'create',
    steps: [{ fields: ['name'] }, { fields: ['price'] }, { fields: [] }],
  });
  async function save() {
    try { await form.submit(); }
    catch { /* Render the checked form errors below. */ }
  }
</script>

{#if form.steps.currentStep === 0}
  <input aria-label="名称" value={typeof form.values.name === 'string' ? form.values.name : ''}
    oninput={(event) => form.setFieldValue('name', event.currentTarget.value)} />
{:else if form.steps.currentStep === 1}
  <input aria-label="价格" type="number" value={typeof form.values.price === 'number' ? form.values.price : ''}
    oninput={(event) => {
      const value = event.currentTarget.valueAsNumber;
      form.setFieldValue('price', Number.isFinite(value) ? value : undefined);
    }} />
{:else}
  <p>确认并提交</p>
  <button onclick={save} disabled={!form.ready || form.submitting}>保存</button>
{/if}

{#each Object.values(form.errors) as message}
  <p role="alert">{message}</p>
{/each}
{#if form.error}<p role="alert">{form.error.message}</p>{/if}
<button onclick={() => form.steps.prevStep()} disabled={!form.steps.canGoPrev}>上一步</button>
<button onclick={() => form.steps.nextStep()} disabled={!form.steps.canGoNext}>下一步</button>
```

在 admin 和 query-client 上下文中使用此 hook。编辑模式必须显式提供符合契约的 `id`。
`steps` 替代 `stepsCount`，字段名由当前操作的 schema 推导。向前跳转会校验全部前置步骤，
设置 `isBackValidate: true` 后，回退也会校验当前步骤。`defaultStep` 必须是范围内整数。
修改步骤配置会重置流程并取消旧请求的完成回调。草稿读取保持 unknown；
`submit()` 校验完整输入与回执，失败时明确拒绝。

### 返回值

在 `useForm` 返回值基础上增加 `steps` 对象：

| 属性 | 类型 | 说明 |
|------|------|------|
| `currentStep` | `number` | 当前步骤索引（从 0 开始） |
| `totalSteps` | `number` | 总步骤数 |
| `gotoStep` | `(step: number) => boolean` | 校验后跳转；非法索引会抛错 |
| `nextStep` | `() => boolean` | 校验全部前置步骤后前进 |
| `prevStep` | `() => boolean` | 返回上一步，可配置当前步骤校验 |
| `canGoNext` | `boolean` | 是否可以前进 |
| `canGoPrev` | `boolean` | 是否可以后退 |

## `useModalForm`

弹窗表单 — 同时管理打开/关闭状态和表单生命周期。

```typescript
const { modal, ...formProps } = useModalForm({ resource: 'posts' });

// modal.show(id?)  — 打开弹窗（传入 id 表示编辑）
// modal.close()    — 关闭弹窗
// modal.visible    — boolean
```

```svelte
<button onclick={() => modal.show()}>创建文章</button>
<button onclick={() => modal.show(post.id)}>编辑</button>

{#if modal.visible}
<dialog open>
  <form onsubmit|preventDefault={() => formProps.submit()}>
    <!-- 表单字段 -->
    <button type="submit">保存</button>
    <button type="button" onclick={modal.close}>取消</button>
  </form>
</dialog>
{/if}
```

## `useDrawerForm`

与 `useModalForm` 完全相同的 API，用于抽屉/侧滑面板：

```typescript
const { drawer, ...formProps } = useDrawerForm({ resource: 'posts' });

// drawer.show(id?) / drawer.close() / drawer.visible
```

## `useTable`

表格 Hook，支持分页、排序、过滤和 URL 同步。

### 基本用法

```typescript
const table = useTable({ resource: 'posts' });
```

### 路由自动推导

```typescript
const table = useTable(); // 从路由自动推导资源名
```

### 选项

| 选项 | 类型 | 默认值 |
|------|------|--------|
| `resource` | `string?` | 自动 |
| `pagination` | `Pagination` | `{ current: 1, pageSize: 10 }` |
| `sorters` | `Sort[]` | `[]` |
| `filters` | `Filter[]` | `[]` |
| `syncWithLocation` | `boolean` | `false` |

### 返回值

```typescript
const {
  query,         // TanStack 查询结果
  pagination,    // { current, pageSize } — 响应式 $state
  sorters,       // Sort[] — 响应式 $state
  filters,       // Filter[] — 响应式 $state
  setCurrent,    // (page) => void
  setPageSize,   // (size) => void
  setSorters,    // (sorters) => void
  setFilters,    // (filters) => void
} = useTable();
```
