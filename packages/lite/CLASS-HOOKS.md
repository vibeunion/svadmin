# Lite styling hook coverage (`class`)

> 自动生成时间: 2026-10-31T01:34:20.359Z
> 重新生成: `bun scripts/check-parity.ts --write`

## 这是什么指标

参考组件若声明了 `class` 属性，调用方就多一个样式入口。Lite 是否也接受
`class`，属于**样式钩子覆盖**，与 `exact` / `fallback` 的能力判定相互独立：

- Lite 自带 `lite.css` 基线，宿主也可以用外层容器收口样式；
- 因此缺少 `class` 不计为能力缺口，也不改变任何条目的 status；
- 但把它显式统计出来，避免"补一个 class 就把数字抬高"或者"债务悄无声息消失"。

## 现状

- 参与统计的 `exact` 条目: **111**
- 参考组件暴露 `class` 的条目: **84**
- Lite 同时接受 `class` 的条目: **49**（**58.3%**）
- 仍缺样式钩子的条目: **35**

## 待补齐清单

| 组件 | 分类 | Lite 实现 |
| --- | --- | --- |
| `ActivityFeed` | advanced | `LiteActivityFeed.svelte` |
| `ApprovalActionCard` | advanced | `LiteApprovalActionCard.svelte` |
| `ColumnHeaderFilter` | advanced | `LiteColumnHeaderFilter.svelte` |
| `ColumnSettings` | advanced | `LiteColumnSettings.svelte` |
| `DetailDrawer` | advanced | `LiteDetailDrawer.svelte` |
| `DraggableRowTable` | advanced | `LiteDraggableRowTable.svelte` |
| `DrawerForm` | advanced | `LiteDrawerForm.svelte` |
| `EditableTable` | advanced | `LiteEditableTable.svelte` |
| `FilterBuilder` | advanced | `LiteFilterBuilder.svelte` |
| `MediaLibraryModal` | advanced | `LiteMediaLibraryModal.svelte` |
| `ModalForm` | advanced | `LiteModalForm.svelte` |
| `SensitiveDataMask` | advanced | `LiteSensitiveDataMask.svelte` |
| `StepForm` | advanced | `LiteStepForm.svelte` |
| `TableSummary` | advanced | `LiteTableSummary.svelte` |
| `VersionDiffViewer` | advanced | `LiteVersionDiffViewer.svelte` |
| `Cascader` | fields | `LiteCascader.svelte` |
| `ImageCropper` | fields | `LiteImageCropper.svelte` |
| `ImageField` | fields | `LiteImageField.svelte` |
| `JsonSchemaForm` | fields | `LiteJsonSchemaForm.svelte` |
| `MarkdownField` | fields | `LiteMarkdownField.svelte` |
| `Transfer` | fields | `LiteTransfer.svelte` |
| `TreeSelect` | fields | `LiteTreeSelect.svelte` |
| `Layout` | layout | `LiteLayout.svelte` |
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
| `AnomalyBadge` | widgets | `LiteAnomalyBadge.svelte` |
| `PresenceAvatarGroup` | widgets | `LitePresenceAvatarGroup.svelte` |
