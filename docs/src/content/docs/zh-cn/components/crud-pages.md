---
title: CRUD 页面
description: 列表、创建、编辑、详情页面的预构建包装器
---

CRUD 页面包装器组合了 PageHeader、面包屑、AutoTable/AutoForm 和操作按钮，实现零样板代码的管理页面。资源型业务
列表优先使用 `ListPage`，不要在页面外重复包一层标题、状态标签、筛选栏和表格壳层。

## ListPage

```svelte
<script>
  import { ListPage } from '@svadmin/ui';
</script>

<ListPage resourceName="posts" />
```

包含：PageHeader + 面包屑 + AutoTable + 创建按钮。

### 企业级列表组合

命名区域按以下顺序组织：

```svelte
<ListPage resourceName="users" selectable allowSelectAllMatching>
  {#snippet statusTabs()}
    <StatusTabs items={statusItems} value={status} onchange={setStatus} />
  {/snippet}

  {#snippet filterToolbar()}
    <FilterToolbar bind:query activeFilterCount={activeFilterCount} />
  {/snippet}

  {#snippet batchActions({ selectedIds, selection })}
    <Button onclick={() => archive(selectedIds, selection)}>批量归档</Button>
  {/snippet}
</ListPage>
```

`ListPage` 负责页面组合；宿主负责查询、状态值、权限操作、持久化和变更
结果。批量操作必须使用传入的 `selection` 范围，不能假设选中的 ID 永远
代表“所有匹配记录”。

有保存视图时，将 `savedViewProvider` 传给 `ListPage`。保存视图选择器由
`AutoTable` 承载，搜索和筛选控件仍由 `filterToolbar` 承载。

### 属性

| 属性 | 类型 | 默认值 |
|------|------|--------|
| `resourceName` | `string` | 必填 |
| `title` | `string?` | 资源标签 |
| `canCreate` | `boolean?` | 来自资源定义 |
| `headerActions` | `Snippet?` | 额外按钮 |
| `statusTabs` | `Snippet?` | 状态或队列标签 |
| `filterToolbar` | `Snippet?` | 搜索、筛选和保存视图 |
| `selectable` | `boolean?` | 行选择 |
| `allowSelectAllMatching` | `boolean?` | 跨页全选 |
| `savedViewProvider` | `SavedListViewProvider?` | 团队或个人保存视图 |
| `batchActions` | `Snippet?` | 作用域明确的批量操作 |
| `rowActions` | `Snippet?` | 高频行操作 |
| `emptyState` | `Snippet?` | 初始空或筛选无结果的自定义内容 |

## CreatePage

```svelte
<CreatePage resourceName="posts" />
```

包含：PageHeader + 面包屑 + AutoForm（创建模式） + 返回按钮。

`formActions` 只用于当前表单事务内的操作。回调接收提交状态和与默认
保存按钮相同的提交函数：

```svelte
<CreatePage resourceName="posts">
  {#snippet formActions({ isLoading, onSubmit })}
    <Button disabled={isLoading} onclick={onSubmit}>保存并继续</Button>
  {/snippet}
</CreatePage>
```

页面保留返回操作的未保存变更保护；校验、脏状态、写入和成功后的跳转仍由
`AutoForm` 与宿主写入契约负责。

## EditPage

```svelte
<EditPage resourceName="posts" id={42} />
```

包含：PageHeader + 面包屑 + AutoForm（编辑模式） + 返回按钮 + 删除按钮。

`EditPage` 使用与 `CreatePage` 相同的 `formActions` 契约。删除是页面头部的
独立破坏性操作，不能复制成普通表单提交。

### 属性

| 属性 | 类型 | 默认值 |
|------|------|--------|
| `resourceName` | `string` | 必填 |
| `id` | `string \| number` | 必填 |
| `canDelete` | `boolean?` | 来自资源定义 |
| `formActions` | `Snippet?` | 自定义表单事务操作 |

## ShowPage

```svelte
<ShowPage resourceName="posts" id={42} />
```

带格式化字段、编辑按钮和返回导航的详情视图。

`ShowPage` 提供稳定的内容契约：

- `data-svadmin-crud-page="show"` 标识详情页。
- `data-svadmin-detail-state` 为 `loading`、`forbidden`、`error`、`ready`
  或 `empty`。
- `children` 用于关联数据、审计历史或明确边界的扩展内容。

关联内容不能替代主记录状态。记录加载、无权限或失败时，扩展内容保持隐藏，
避免旧的关联数据被误认为当前数据。

## 面包屑

根据当前路由和资源定义自动生成：

```
首页 / 文章 / 编辑 #42
```

支持：列表、创建、编辑和详情路由。

## 面板侧边栏 (Sidebar)

`Sidebar` 组件提供基于资源自动生成的导航。它支持一个 `routeMode` 路由模式属性以适应不同的路由环境：

```svelte
<Sidebar 
  {collapsed} {identity} {title} {onToggle} {onLogout} {menu}
  routeMode="auto" 
/>
```

### 路由模式

| 模式 | 描述 |
|------|------|
| `auto` | (默认) 动态检测当前环境。如果检测到 `window.location.hash.startsWith('#/')` 则降级为 `hash` 模式，否则默认使用 `path` 模式。完美适配 SvelteKit 和 SPA。 |
| `path` | 使用标准的 `/path` 路由 (SvelteKit 默认)。 |
| `hash` | 使用 `#` 哈希路由 (SPA 默认)。 |
