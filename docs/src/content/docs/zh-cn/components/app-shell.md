---
title: 应用外壳
description: 为自带路由和数据层的宿主提供的路由无关应用外壳
---

`AppShellPage` 负责最外层应用框架——侧边导航、顶栏、主区域、可选的次要列和页脚——
但不引入路由器、数据提供器或认证上下文。宿主导航通过 snippet 传入，路由仍由宿主自己掌控。

当 `AdminApp` 不适用时使用它：自研 hash 路由、嵌入式工作区，或已经拥有数据层的应用。
如果 `AdminApp` 适用，继续使用 `AdminApp`；两者消费同一套 token。

## 为什么需要它

过去组合能力止步于原子组件。自带路由的宿主可以取用 `Input`、`Select`、`Badge`，
但侧边导航、顶栏和页面框架只能自己写一套 CSS。这正是宿主项目演化出第二套设计系统的原因。
`AppShellPage` 只做表现层，用来补上这一段：

- 不接收 `routerProvider`、`resources`、`dataProvider`，也不需要认证上下文；
- 导航、搜索、账户菜单、页面内容全部是 snippet；
- 所有尺寸与颜色都来自 token，宿主通过覆盖 token 定制主题。

## 用法

```svelte
<script lang="ts">
  import { AppShellPage, PagePattern } from '@svadmin/ui';
</script>

<AppShellPage width="wide" label="主导航">
  {#snippet sidebar()}
    <nav>
      <a href="#/orders" aria-current="page">订单</a>
      <a href="#/reports">报告</a>
    </nav>
  {/snippet}

  {#snippet topbar()}
    <input type="search" placeholder="搜索" aria-label="搜索" />
  {/snippet}

  {#snippet topbarEnd()}
    <button type="button">账户</button>
  {/snippet}

  <PagePattern kind="list" title="订单" description="审核未完成订单">
    <!-- 页面主体 -->
  </PagePattern>
</AppShellPage>
```

## 属性

| 属性 | 类型 | 默认值 | 用途 |
| --- | --- | --- | --- |
| `children` | `Snippet` | — | 主内容，通常是 `PagePattern` 或 `ContentPageShell`。 |
| `sidebar` | `Snippet` | — | 导航区域。省略时外壳渲染单列布局。 |
| `topbarStart` | `Snippet` | — | 顶栏前段（品牌、面包屑根）。 |
| `topbar` | `Snippet` | — | 顶栏中段（搜索、上下文切换）。 |
| `topbarEnd` | `Snippet` | — | 顶栏后段（通知、账户）。 |
| `aside` | `Snippet` | — | 工作区/详情页的次要列。 |
| `footer` | `Snippet` | — | 内容宽度内的页脚。 |
| `width` | `'narrow' \| 'default' \| 'wide' \| 'full'` | `'default'` | 内容最大宽度。 |
| `collapsed` | `boolean` | `false` | 收起导航栏，内部内容由宿主决定。 |
| `mobileOpen` | `boolean`（可绑定） | `false` | 窄屏抽屉状态；`Escape` 和遮罩点击会关闭。 |
| `label` | `string` | 本地化「主导航」 | 导航地标的可访问名称。 |
| `skipLabel` | `string` | 本地化「跳到主要内容」 | 跳转链接文案。 |
| `contentId` | `string` | 自动生成 | 主区域 `id`，跳转链接指向它。 |
| `class` | `string` | — | 追加到外壳根节点的 class。 |

这里刻意**不提供密度修饰符**。产品基线是统一的；需要更大或更紧的控件时，宿主覆盖一次尺寸 token：

```css
.fa-app-shell {
  --svadmin-control-h: 2.75rem; /* 44px 舒适的企业表单密度 */
  --svadmin-row-h: 2.75rem;
  --svadmin-section-gap: var(--svadmin-space-6);
}
```

## 钩子

| 钩子 | 归属 |
| --- | --- |
| `data-slot="app-shell-topbar"` | 顶栏 |
| `data-slot="app-shell-sidebar"` | 导航地标 |
| `data-slot="app-shell-body"` / `app-shell-content` | 内容宽度 |
| `data-slot="app-shell-aside"` | 次要列 |
| `data-slot="app-shell-footer"` | 页脚 |
| `data-width` | `narrow` / `default` / `wide` / `full` |
| `data-collapsed` / `data-mobile-open` | 收起与抽屉状态 |

## 可访问性

- 跳转链接是第一个可聚焦元素，指向 `main` 地标。
- 导航地标有可访问名称；`Escape` 关闭窄屏抽屉，遮罩不可聚焦。
- `main` 通过 `tabindex="-1"` 可被跳转链接聚焦，自身不显示焦点轮廓。

## 尺寸 token

`AppShellPage` 读取 `@svadmin/ui/app.css` 发布的尺寸节奏：

| Token | 默认值 | 含义 |
| --- | --- | --- |
| `--svadmin-control-h-sm` | `1.75rem` | 紧凑控件 |
| `--svadmin-control-h` | `2.25rem` | 默认控件高度 |
| `--svadmin-control-h-lg` | `2.5rem` | 大号控件 |
| `--svadmin-row-h` | `3rem` | 表格/列表行节奏 |
| `--svadmin-table-head-h` | `2.75rem` | 表头高度 |
| `--svadmin-table-state-min-h` | `8rem` | 表格空态/加载高度 |
| `--svadmin-space-1…6` | `4px … 32px` | 间距刻度 |
| `--svadmin-section-gap` | `--svadmin-space-5` | 页面区块间距 |
| `--svadmin-text-caption/label/body/section/title` | `12/13/14/16/20px` | 字号 |
| `--svadmin-leading-tight/snug/body` | `1.25 / 1.35 / 1.5` | 行高 |
| `--svadmin-measure` | `65ch` | 描述文本阅读宽度 |
| `--svadmin-shell-sidebar-w` | `15rem` | 展开导航宽度 |
| `--svadmin-shell-sidebar-w-collapsed` | `3.5rem` | 收起导航宽度 |
| `--svadmin-shell-topbar-h` | `3.5rem` | 顶栏高度 |
| `--svadmin-shell-gutter` | `--svadmin-space-5` | 页面留白 |
| `--svadmin-shell-max` | `74rem` | 内容最大宽度 |
| `--svadmin-shell-aside-w` | `22rem` | 次要列宽度 |
| `--svadmin-chrome-basis` | `16rem` | 页头换行前的 flex 基准 |

每个 token 在 `app.css` 中只声明一次；出现第二处声明就意味着多了一套密度基线，
CSS 契约测试会直接失败。定制请覆盖外壳或嵌套主题根上的 token。

## 契约测试

- `packages/ui/src/components/app-shell-page.test.svelte.ts` —— 地标、插槽、
  跳转链接、宽度/收起钩子、抽屉行为。
- `packages/ui/src/size-token-css.test.ts` —— 禁止硬编码长度与颜色、所有 `var()`
  必须指向已声明 token、类名限定命名空间、token 只声明一次、核心控件绑定
  `--svadmin-control-h`。