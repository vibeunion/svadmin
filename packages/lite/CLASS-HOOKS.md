# Lite styling hook coverage (`class`)

> 自动生成时间: 2026-10-31T01:51:07.740Z
> 重新生成: `bun scripts/check-parity.ts --write`

## 这是什么指标

参考组件若声明了 `class` 属性，调用方就多一个样式入口。Lite 是否也接受
`class`，属于**样式钩子覆盖**，与 `exact` / `fallback` 的能力判定相互独立：

- Lite 自带 `lite.css` 基线，宿主也可以用外层容器收口样式；
- 因此缺少 `class` 不计为能力缺口，也不改变任何条目的 status；
- 但把它显式统计出来，避免"补一个 class 就把数字抬高"或者"债务悄无声息消失"。

## 现状

- 参与统计的 `exact` 条目: **126**
- 无法唯一定位（需人工确认）: **0**
- 参考组件暴露 `class` 的条目: **99**
- Lite 同时接受 `class` 的条目: **76**（**76.8%**）
- 仍缺样式钩子的条目: **23**

## 待补齐清单

| 组件 | 分类 | Lite 实现 |
| --- | --- | --- |
| `Table` | advanced | `LiteTable.svelte` |
| `Cascader` | fields | `LiteCascader.svelte` |
| `ImageCropper` | fields | `LiteImageCropper.svelte` |
| `ImageField` | fields | `LiteImageField.svelte` |
| `JsonSchemaForm` | fields | `LiteJsonSchemaForm.svelte` |
| `MarkdownField` | fields | `LiteMarkdownField.svelte` |
| `Transfer` | fields | `LiteTransfer.svelte` |
| `TreeSelect` | fields | `LiteTreeSelect.svelte` |
| `Layout` | layout | `LiteLayout.svelte` |
| `Pagination` | layout | `LitePagination.svelte` |
| `Sidebar` | layout | `LiteSidebar.svelte` |
| `SplitPaneLayout` | layout | `LiteSplitPaneLayout.svelte` |
| `CreatePage` | pages | `LiteCreatePage.svelte` |
| `EditPage` | pages | `LiteEditPage.svelte` |
| `ListPage` | pages | `LiteListPage.svelte` |
| `ListPagination` | pages | `LitePagination.svelte` |
| `LoginPage` | pages | `LiteLogin.svelte` |
| `MasterDetailView` | pages | `LiteMasterDetailView.svelte` |
| `PrintableBill` | pages | `LitePrintableBill.svelte` |
| `ShowPage` | pages | `LiteShowPage.svelte` |
| `PresenceAvatarGroup` | widgets | `LitePresenceAvatarGroup.svelte` |
| `Progress` | widgets | `LiteProgress.svelte` |
| `Skeleton` | widgets | `LiteSkeleton.svelte` |

## 未能唯一定位

同名文件同时存在于根目录与分类目录（例如 `LiteModalForm`），审计不会猜一个文件，
而是列在这里等待人工确认映射路径：

| 组件 | 映射路径 | 原因 |
| --- | --- | --- |
| — | — | 全部可唯一定位 |
