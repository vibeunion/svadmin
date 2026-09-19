# AutoTable

> Auto-generated CRUD table / 自动 CRUD 表格

## Import

```typescript
import { AutoTable } from '@svadmin/ui';
```

## Usage / 用法

```svelte
<!-- As part of AdminApp (automatic) -->
<!-- AdminApp routes to AutoTable at #/:resource -->

<!-- Standalone / 独立使用 -->
<AutoTable resourceName="posts" />
```

## Props

| Prop | Type | Required | Description / 描述 |
|------|------|----------|-------------------|
| `resourceName` | `string` | ✅ | Resource name from definitions / 资源名称 |

## Features / 功能

- ✅ Server-side pagination / 服务端分页
- ✅ Column sorting / 列排序
- ✅ Search filtering / 搜索过滤
- ✅ Batch selection / 批量选择
- ✅ Create / Edit / Show / Delete actions / CRUD 操作
- ✅ URL state sync / URL 状态同步
- ✅ Permission-based action visibility / 权限控制
- ✅ CSV export / CSV 导出

## Typed snippets / 类型化扩展

Use `createResourceRenderers` from `@svadmin/ui/rendering` to validate and type existing cell, row-action, expanded-row and summary snippets against a resource contract. The existing dynamic component props remain compatible. See [Typed native Svelte rendering](../typed-rendering.md) for runtime boundaries and examples without TSX.

---

# AutoForm

> Auto-generated create/edit form / 自动创建/编辑表单

## Import

```typescript
import { AutoForm } from '@svadmin/ui';
```

## Usage / 用法

```svelte
<!-- Create mode / 创建模式 -->
<AutoForm resourceName="posts" mode="create" />

<!-- Edit mode / 编辑模式 -->
<AutoForm resourceName="posts" mode="edit" id="1" />
```

## Props

| Prop | Type | Required | Description / 描述 |
|------|------|----------|-------------------|
| `resourceName` | `string` | ✅ | Resource name / 资源名称 |
| `mode` | `'create' \| 'edit' \| 'clone' \| 'show'` | default: create | Form mode / 表单模式 |
| `id` | `string \| number` | edit / clone / show | Record ID / 记录 ID |

For typed `fieldRenderer` extensions, use `createResourceRenderers(contract).field(mode, key, input)`. Validated values and incomplete drafts are deliberately separate; see [the field-rendering guide](../typed-rendering.md#3-字段类型必须区分-createeditclone-和-show).

## Supported Field Types / 支持字段类型

| Type | Renders / 渲染 |
|------|---------------|
| `text` | Input |
| `number` | Number input |
| `email` | Email input |
| `url` | URL input |
| `phone` | Phone input |
| `textarea` | Textarea |
| `select` | Select dropdown |
| `boolean` | Checkbox |
| `date` | Date input |
| `datetime` | Datetime input |
| `rich-text` | Textarea (fallback) |

---

# ShowPage

> Record detail page / 记录详情页

## Import

```typescript
import { ShowPage } from '@svadmin/ui';
```

## Usage / 用法

```svelte
<ShowPage resourceName="posts" id="1" />
```

## Props

| Prop | Type | Required | Description / 描述 |
|------|------|----------|-------------------|
| `resourceName` | `string` | ✅ | Resource name / 资源名称 |
| `id` | `string` | ✅ | Record ID / 记录 ID |
