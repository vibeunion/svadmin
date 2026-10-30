# UI Components / UI 组件

Complete reference for all `@svadmin/ui` components.

`@svadmin/ui` 全部组件参考文档。

---

## Admin Components / 管理组件

| Component | Description / 描述 | Docs |
|-----------|-------------------|------|
| [AdminApp](./admin-app.md) | One-stop admin entry / 一站式入口组件 | ✅ |
| [AutoTable](./auto-table.md) | Auto-generated CRUD table / 自动 CRUD 表格 | ✅ |
| [AutoForm](./auto-form.md) | Auto-generated create/edit form / 自动表单 | ✅ |
| [ShowPage](./show-page.md) | Record detail page / 记录详情页 | ✅ |
| [Layout](./layout.md) | Sidebar, top, mixed and split navigation layouts / 侧边栏、顶部、混合与分栏布局 | ✅ |
| [Header](./header.md) | Top navigation bar / 顶部导航栏 | ✅ |
| [Sidebar](./sidebar.md) | Navigation sidebar / 导航侧边栏 | ✅ |
| [PageHeader](./page-header.md) | Page title + breadcrumbs + actions / 页面标题 | ✅ |
| [EmptyState](./empty-state.md) | Empty data placeholder / 空数据占位 | ✅ |
| [StatsCard](./stats-card.md) | Dashboard statistics card / 统计卡片 | ✅ |
| [Breadcrumbs](./breadcrumbs.md) | Navigation breadcrumbs / 面包屑导航 | ✅ |
| [Toast](./toast.md) | Notification toasts / 通知提示 | ✅ |
| [ConfirmDialog](./confirm-dialog.md) | Confirmation modal / 确认对话框 | ✅ |
| [ErrorBoundary](./error-boundary.md) | Error catch boundary / 错误边界 | ✅ |
| [FieldRenderer](./field-renderer.md) | Field value renderer / 字段值渲染器 | ✅ |
| [Theming](./theming.md) | Dark mode + color themes / 暗色模式 + 多色主题 | ✅ |
| [Page templates](./templates.md) | Workplace, monitor, analysis, list, form, detail, user center, settings, result and exception compositions / 工作台、监控、分析、列表、表单、详情、结果和异常页组合 | ✅ |
| NotificationCenter | Header notification menu with unread state and category filters / 顶栏通知中心（含分类筛选） | ✅ |
| NotificationHost | Imperative notification stack / 命令式通知栈 | ✅ |
| ThemeSettingsDrawer | Live shell and appearance preferences / 实时外观与外壳设置抽屉 | ✅ |

## Base UI Components / 基础 UI 组件

| Component | Description / 描述 |
|-----------|-------------------|
| Button | Clickable button / 按钮 |
| Input | Text input / 输入框 |
| Textarea | Multi-line input / 多行输入 |
| Select | Dropdown select / 下拉选择 |
| Switch | Toggle switch / 开关 |
| Checkbox | Checkbox / 复选框 |
| Badge | Status badge / 状态标签 |
| Tag | Closable and checkable tag / 可关闭与可选中标签 |
| Avatar | User avatar / 用户头像 |
| Skeleton | Loading placeholder / 加载占位 |
| Alert | Alert message / 提示消息 |
| Card | Content card / 卡片 |
| Dialog | Modal dialog / 对话框 |
| Table | Data table / 数据表格 |
| GroupedTable | Multi-level table headers / 多级表头数据表格 |
| Tabs | Tab navigation with variants, orientation and scroll / 标签页（风格、方向与滚动） |
| EditableTabs | Tabs with add and close actions / 可增删标签页 |
| Tooltip | Hover tooltip / 悬浮提示 |
| DropdownMenu | Dropdown menu / 下拉菜单 |
| Sheet | Side panel / 侧边面板 |
| Separator | Visual divider / 分隔线 |
| Calendar | Month calendar with events / 带事件月历 |
| Carousel | Accessible slide carousel / 可访问轮播 |
| Image | Responsive image with fallback and preview trigger / 响应式图片、失败占位与预览触发 |
| ImagePreview | Image gallery preview / 图片预览与切换 |
| Anchor | Scroll-spy section navigation / 锚点导航 |
| Affix | Sticky container / 固钉容器 |
| Collapse | Controlled disclosure panels / 受控折叠面板 |
| TypographyEllipsis | Multi-line clamp with expand / collapse / 多行截断与展开收起 |
| TypographyText | Semantic text with copy and inline editing / 语义文本、复制与内联编辑 |
| CommentThread | Threaded comments / 评论线程 |
| Space | Flex spacing primitive / 弹性间距 |
| Grid / GridCell | Responsive CSS grid / 响应式网格 |
| Row / Col | 24-column layout / 24 栅格 |
| Timeline | Generic activity timeline / 通用时间线 |
| Statistic | Formatted metric display / 指标展示 |
| Countdown | Countdown display / 倒计时 |
| ResizeBox | Pointer and keyboard resizable container / 可调整容器 |
| Tour | Guided step overlay / 引导式步骤 |
| Menu | Recursive navigation menu / 递归导航菜单 |
| ConfigProvider | Component size, density, direction and locale defaults / 组件尺寸、密度、方向与语言默认值 |
| Progress | Determinate progress bar / 进度条 |
| Popover | Anchored popover primitive / 浮层 |
| Overflow | Visible slice with dropdown remainder / 自适应溢出列表 |

## Optional Packages / 可选包

| Package | Description / 描述 |
|---------|-------------------|
| `@svadmin/charts` | Box plot, sunburst, graph, treemap and sankey charts / 箱线图、旭日图、关系图、矩形树图与桑基图 |
| `@svadmin/dock` | SplitPane, DockLayout and persisted DockWorkspace / 分栏、可停靠与持久化工作区 |
| MediaPlayer HLS | Optional `hls.js` playback for `.m3u8` sources / 可选的 HLS 播放 |
| VideoPlayer | Optional `vidstack` full player with HLS, tracks and controls / 可选的完整播放器 |

## Compatibility aliases / 兼容别名

Reference-style names are exported as aliases without changing the canonical svadmin
component names:

| Reference-style | Canonical |
| --- | --- |
| `Comment` | `CommentThread` |
| `Descriptions` | `DescriptionList` |
| `InputNumber` | `NumberInput` |
| `InputTag` | `TagsInput` |
| `List` | `ItemList` |
| `Mentions` | `MentionsInput` |
| `Message` | `toast` |
| `Modal` | `Dialog` namespace |
| `Drawer` | `Sheet` namespace |
| `Dropdown` | `DropdownMenu` namespace |
| `Notification` | `notification` service |
| `Radio` | `RadioGroup` |
| `Split` | `SplitPaneLayout` |
| `Upload` | `FileUpload` |
| `VerificationCode` | `OtpInput` |

Prefer canonical names in new code; aliases exist for migration and host
compatibility. `Modal`, `Drawer` and `Dropdown` are namespace aliases: their
compound APIs still follow `Dialog`, `Sheet` and `DropdownMenu`, not the reference's
component API one-to-one.

See the [Component / Pro parity audit](./parity.md) for remaining gaps and
priorities.

## Data Visualization / 数据可视化

| Component | Description / 描述 |
|-----------|-------------------|
| BarChart / LineChart / AreaChart | Cartesian series with axes / 坐标轴序列图 |
| PieChart / DonutChart | Pie and donut charts / 饼图与环形图 |
| ScatterChart | Point distribution / 散点图 |
| RadarChart | Multi-indicator series / 多指标雷达图 |
| GaugeChart | Range and progress gauge / 仪表盘 |
| FunnelChart | Stage conversion / 漏斗图 |
| HeatmapChart | Matrix intensity / 热力图 |
| WaterfallChart | Increase, decrease and total steps / 瀑布图 |
| RoseChart | Radial value encoding / 玫瑰图 |
