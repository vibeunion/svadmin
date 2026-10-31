# @svadmin/ui ↔ @svadmin/lite 组件对齐矩阵

> 自动生成时间：`2026-10-31T02:50:46.174Z`
> 清单映射覆盖率：**100%**（179/179 组件）
> 1:1 对齐率 (Exact)：**70.4%**（126）· 语义降级率 (Fallback)：**28.5%**（51）
> 行为验证覆盖：**83.8%**（150/179 映射组件具备断言预算）· 仅被引用：0
>
> 映射覆盖率包含语义降级与免适配，不能单独作为发布口径。推进目标看后两项：1:1 对齐率与行为断言覆盖。
> 行为断言覆盖按"测试文件断言数 ÷ 该文件引入的 Lite 组件数 ≥ 2"估算，是文件级预算，不等价于逐组件深度验收。

## 进度总览

| 模块分类 | 组件总数 | 1:1 对齐 (Exact) | 语义降级 (Fallback) | 免适配 (SPA Only) | 待补齐 (Missing) | 1:1 对齐率 | 行为断言 | 仅引用 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **pages** | 18 | 13 | 5 | 0 | 0 | **72.2%** | 14/18 | 0 |
| **advanced** | 43 | 26 | 16 | 1 | 0 | **60.5%** | 38/43 | 0 |
| **widgets** | 37 | 15 | 22 | 0 | 0 | **40.5%** | 34/37 | 0 |
| **fields** | 46 | 42 | 4 | 0 | 0 | **91.3%** | 40/46 | 0 |
| **layout** | 25 | 20 | 4 | 1 | 0 | **80%** | 20/25 | 0 |
| **buttons** | 10 | 10 | 0 | 0 | 0 | **100%** | 4/10 | 0 |

> 样式钩子（`class`）覆盖是独立指标，见 [CLASS-HOOKS.md](./CLASS-HOOKS.md)，不影响本表状态。

---

## 判定标准

- exact = 服务端 HTML 与原生表单可完整保留能力，仅缺少客户端增强（复制、动画、拖拽手柄、滚动监听、弹层定位、乐观预览），数据契约不变。
- fallback = 能力依赖客户端状态（虚拟滚动、递归筛选编辑、拖拽回滚、透视重算、树半选、画布/表格引擎、图表交互）或无原生等价交互，需在策略中写明服务端边界。
- spa_only = 脱离客户端运行时无意义，不属于 SSR 契约。
- 存在争议时保持 fallback，直到边界被证明并记录；不得因"看起来接近"而升级。

---

## 详细对齐清单

### PAGES

| UI 组件 (SPA) | Lite 对应组件 (SSR) | 对齐状态 | 降级策略 / 承接方案 |
|---|---|:---:|---|
| `AutoTable` | `pages/LiteListPage.svelte` | ⚡ 语义降级 | Lite 使用服务端分页原生表格；筛选、批量命令和导出由宿主页面承接 |
| `AutoForm` | `LiteForm.svelte` | ⚡ 语义降级 | Lite 使用原生 POST 表单；字段契约和服务端错误回显由宿主承接 |
| `ResourceOperationsPage` | `pages/LiteListPage.svelte` | ⚡ 语义降级 | Lite 组合原生列表、操作链接和服务端表单，不提供 SPA 抽屉状态 |
| `RecordDetailDrawer` | `pages/LiteShowPage.svelte` | ⚡ 语义降级 | Lite 使用独立详情页；宿主通过链接保留资源和记录上下文 |
| `ListPage` | `pages/LiteListPage.svelte` | ✅ 1:1 对齐 | 服务端分页、排序、搜索与原生表格 |
| `CreatePage` | `pages/LiteCreatePage.svelte` | ✅ 1:1 对齐 | 服务端校验与 POST 表单 |
| `EditPage` | `pages/LiteEditPage.svelte` | ✅ 1:1 对齐 | 服务端加载与 POST 表单 |
| `ShowPage` | `pages/LiteShowPage.svelte` | ✅ 1:1 对齐 | 键值明细卡片与操作栏 |
| `LoginPage` | `LiteLogin.svelte` | ✅ 1:1 对齐 | 原生认证 POST 表单 |
| `RegisterPage` | `pages/LiteRegisterPage.svelte` | ✅ 1:1 对齐 | 原生注册 POST 表单 |
| `ForgotPasswordPage` | `pages/LiteForgotPasswordPage.svelte` | ✅ 1:1 对齐 | 找回密码原生表单 |
| `UpdatePasswordPage` | `pages/LiteUpdatePasswordPage.svelte` | ✅ 1:1 对齐 | 修改密码原生表单 |
| `ProfilePage` | `pages/LiteProfilePage.svelte` | ✅ 1:1 对齐 | 个人资料与安全选项卡 |
| `MasterDetailView` | `LiteMasterDetailView.svelte` | ✅ 1:1 对齐 | 主从数据联动视图与 URL 同步 |
| `PrintableBill` | `LitePrintableBill.svelte` | ✅ 1:1 对齐 | 受控单据凭证 A4 打印排版 |
| `PdfDocumentViewer` | `LitePdfDocumentViewer.svelte` | ✅ 1:1 对齐 | 嵌入式 PDF 文档与电子盖章批注 |
| `PageSkeleton` | `LiteSkeleton.svelte` | ⚡ 语义降级 | 页面级静态骨架 |
| `ListPagination` | `LitePagination.svelte` | ✅ 1:1 对齐 | URL 驱动分页；页码窗口由服务端输出 |

### ADVANCED

| UI 组件 (SPA) | Lite 对应组件 (SSR) | 对齐状态 | 降级策略 / 承接方案 |
|---|---|:---:|---|
| `ErrorSummary` | `LiteErrorSummary.svelte` | ✅ 1:1 对齐 | 错误汇总区域、字段锚点跳转与可访问标题，错误映射由服务端返回 |
| `ApprovalCenter` | `LiteApprovalActionCard.svelte` | ⚡ 语义降级 | Lite 使用审批列表页与原生 POST 动作；审批规则、事务和审计由宿主承接 |
| `PivotExportButton` | `LitePivotTable.svelte` | ⚡ 语义降级 | Lite 使用服务端导出链接；任务回执和下载授权由宿主承接 |
| `FilterCollectionInput` | `LiteFilterBuilder.svelte` | ⚡ 语义降级 | Lite 使用原生筛选表单；完整递归交互由服务端回显承接 |
| `ConfirmDialog` | `LiteConfirmDialog.svelte` | ✅ 1:1 对齐 | CSS :target 锚点模态框 |
| `FilterBuilder` | `LiteFilterBuilder.svelte` | ✅ 1:1 对齐 | 可视化多条件原生筛选表单与 CRUD 运算符解析 |
| `DrawerForm` | `LiteDrawerForm.svelte` | ✅ 1:1 对齐 | 原生独立编辑抽屉卡片表单 |
| `ModalForm` | `LiteModalForm.svelte` | ✅ 1:1 对齐 | 原生独立模态弹窗表单 |
| `VirtualTable` | `LiteVirtualTable.svelte` | ⚡ 语义降级 | SPA 固定高度虚拟窗口；Lite 使用完整原生表格，需由服务端分页或限制数据量 |
| `Table` | `LiteTable.svelte` | ✅ 1:1 对齐 | 原生表格、横向滚动与可选固定边缘列 |
| `InlineEdit` | `advanced/LiteInlineEdit.svelte` | ⚡ 语义降级 | 降级为行内单独提交按钮或跳转编辑 |
| `AutoSaveIndicator` | `advanced/LiteAutoSaveIndicator.svelte` | ⚡ 语义降级 | 服务端保存时间戳展示 |
| `Toast` | `advanced/LiteToast.svelte` | ⚡ 语义降级 | 降级为页面顶部 Alert 通知条 |
| `UndoableNotification` | `advanced/LiteUndoableNotification.svelte` | ⚡ 语义降级 | 降级为带撤销表单的通知条 |
| `Watermark` | `LiteWatermark.svelte` | ✅ 1:1 对齐 | 纯 CSS / SVG 矢量背景水印 |
| `ColumnSettings` | `LiteColumnSettings.svelte` | ✅ 1:1 对齐 | 原生多选表单与查询参数列过滤 |
| `ImportWizard` | `LiteImportWizard.svelte` | ✅ 1:1 对齐 | 原生 Multipart 文件上传与映射提示 |
| `ColumnHeaderFilter` | `LiteColumnHeaderFilter.svelte` | ✅ 1:1 对齐 | 原生 GET 查询参数列过滤链接 |
| `TreeTable` | `LiteTreeTable.svelte` | ⚡ 语义降级 | 完整原生层级表格；展开、半选及键盘树导航由 SPA 提供，服务端负责裁剪和校验 |
| `SensitiveDataMask` | `LiteSensitiveDataMask.svelte` | ✅ 1:1 对齐 | 服务端掩码字符展示 |
| `ApprovalActionCard` | `LiteApprovalActionCard.svelte` | ✅ 1:1 对齐 | 原生审批 POST 表单与意见输入 |
| `StepForm` | `LiteStepForm.svelte` | ✅ 1:1 对齐 | 分步向导与原生 POST 步骤表单 |
| `TableSummary` | `LiteTableSummary.svelte` | ✅ 1:1 对齐 | 表格底部统计聚合行 |
| `VersionDiffViewer` | `LiteVersionDiffViewer.svelte` | ✅ 1:1 对齐 | 版本字段变更对比表格 |
| `EditableTable` | `LiteEditableTable.svelte` | ✅ 1:1 对齐 | 行内与单元格批量编辑表格表单 |
| `DraggableRowTable` | `LiteDraggableRowTable.svelte` | ✅ 1:1 对齐 | 行顺序数值表单与上下移动 |
| `MediaLibraryModal` | `LiteMediaLibraryModal.svelte` | ✅ 1:1 对齐 | 媒体库文件选择与上传表单 |
| `ActivityFeed` | `LiteActivityFeed.svelte` | ✅ 1:1 对齐 | 时间线动态与评论流 |
| `KanbanBoard` | `LiteKanbanBoard.svelte` | ⚡ 语义降级 | SPA 受控权限、乐观预览与回执回滚；Lite 仅提供原生新增表单，不提供客户端移动与回滚 |
| `PivotTable` | `LitePivotTable.svelte` | ⚡ 语义降级 | 共享有界聚合与类型化维度；Lite 原生链接重试、导出和安全钻取链接，SPA 支持回调钻取；不含服务端全量分析引擎 |
| `CanvasAnnotation` | `LiteCanvasAnnotation.svelte` | ✅ 1:1 对齐 | 底图展示与交互式标注画板 |
| `SpreadsheetView` | `LiteSpreadsheetView.svelte` | ⚡ 语义降级 | 有界原生单表 POST，提交 sheetId 与原始公式；计算、切表及导出由服务端承接，无客户端公式引擎 |
| `DecisionTable` | `LiteDecisionTable.svelte` | ✅ 1:1 对齐 | 业务决策表与规则执行矩阵 |
| `CommentThread` | `LiteCommentThread.svelte` | ⚡ 语义降级 | 服务端评论列表、回复与 POST 评论表单；即时提交由宿主承接 |
| `Tour` | `LiteTour.svelte` | ⚡ 语义降级 | 静态引导步骤与关闭链接；目标高亮和定位由 SPA 承接 |
| `NotificationCenter` | `LiteNotificationCenter.svelte` | ⚡ 语义降级 | 服务端通知列表、已读态与全部已读链接；筛选和实时更新由宿主承接 |
| `TwoFactorStepper` | `LiteTwoFactorStepper.svelte` | ✅ 1:1 对齐 | 服务端有序步骤，保留自定义步骤、当前索引与列表 class；附原生验证码提交表单 |
| `Popconfirm` | `LitePopconfirm.svelte` | ✅ 1:1 对齐 | 锚点确认面板（dialog 语义）与原生 POST 表单/链接的确认与取消 |
| `DetailDrawer` | `LiteDetailDrawer.svelte` | ✅ 1:1 对齐 | 锚点驱动的详情侧栏与关闭链接，缺省闭合不影响页面其余内容 |
| `RowActions` | `LiteRowActions.svelte` | ✅ 1:1 对齐 | 行内链接或原生 POST 动作 |
| `Result` | `LiteResult.svelte` | ✅ 1:1 对齐 | 成功、失败、警告与异常状态页 |
| `Tree` | `LiteTree.svelte` | ⚡ 语义降级 | details 层级树与链接/选中态；展开、复选和键盘树导航由 SPA 承接 |
| `DevTools` | — | 🚫 免适配 | 免适配 (SPA 调试器) |

### WIDGETS

| UI 组件 (SPA) | Lite 对应组件 (SSR) | 对齐状态 | 降级策略 / 承接方案 |
|---|---|:---:|---|
| `DashboardView` | `LiteMetricStrip.svelte` | ⚡ 语义降级 | Lite 使用服务端指标条和原生链接；查询、聚合和权限由宿主承接 |
| `StatsCard` | `LiteStatsCard.svelte` | ✅ 1:1 对齐 | 指标卡片与趋势徽章 |
| `MetricStrip` | `LiteMetricStrip.svelte` | ✅ 1:1 对齐 | 服务端指标条、趋势与原生链接 |
| `AnomalyBadge` | `widgets/LiteAnomalyBadge.svelte` | ✅ 1:1 对齐 | 异常状态高亮徽章 |
| `Badge` | `LiteBadge.svelte` | ✅ 1:1 对齐 | 语义状态徽章与原生链接承接 |
| `Tag` | `LiteTag.svelte` | ⚡ 语义降级 | Lite 使用服务端渲染标签与可选删除链接；可选中交互由宿主表单承接 |
| `BarChart` | `widgets/LiteBarChart.svelte` | ⚡ 语义降级 | 降级为 CSS 柱状图或数据明细表格 |
| `LineChart` | `widgets/LiteLineChart.svelte` | ⚡ 语义降级 | SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接 |
| `PieChart` | `widgets/LitePieChart.svelte` | ⚡ 语义降级 | SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接 |
| `PresenceAvatarGroup` | `LitePresenceAvatarGroup.svelte` | ✅ 1:1 对齐 | 多人在线协同感知状态 |
| `GanttChart` | `LiteGanttChart.svelte` | ⚡ 语义降级 | 共享有界时间线校验；Lite 原生表格与链接恢复，SPA 交互选择与回调，不含依赖/工作日历/自动排程引擎 |
| `OfflineSyncBanner` | `LiteOfflineSyncBanner.svelte` | ✅ 1:1 对齐 | 离线状态感知与变更队列同步栏 |
| `Image` | `LiteImage.svelte` | ⚡ 语义降级 | 原生 img、链接与无图占位；图片加载失败回退由服务端或浏览器承接 |
| `ImagePreview` | `LiteImagePreview.svelte` | ⚡ 语义降级 | 静态缩略图与下载链接；缩放、旋转和弹窗由 SPA 提供 |
| `VideoPlayer` | `LiteVideoPlayer.svelte` | ⚡ 语义降级 | 原生 video/audio controls、字幕轨与下载链接；不加载 Vidstack 客户端播放器 |
| `QRCode` | `LiteQRCode.svelte` | ✅ 1:1 对齐 | 服务端 SVG 二维码，与 UI 共用 qrcode 编码器 |
| `Calendar` | `LiteCalendar.svelte` | ⚡ 语义降级 | 服务端月份快照、日期链接与事件列表；无客户端月切换 |
| `Carousel` | `LiteCarousel.svelte` | ⚡ 语义降级 | 横向滚动与锚点分段；自动播放和手势由 SPA 承接 |
| `Timeline` | `LiteTimeline.svelte` | ✅ 1:1 对齐 | 服务端时间线列表与语义色标记 |
| `Statistic` | `LiteStatistic.svelte` | ✅ 1:1 对齐 | 服务端数字格式化、前后缀与趋势 |
| `Countdown` | `LiteCountdown.svelte` | ⚡ 语义降级 | 服务端剩余时间快照与截止时间；实时倒计时由 SPA 承接 |
| `StatusBadge` | `LiteStatusBadge.svelte` | ✅ 1:1 对齐 | 状态到语义徽章的映射 |
| `ItemList` | `LiteItemList.svelte` | ✅ 1:1 对齐 | 语义列表、说明与右侧元信息 |
| `Skeleton` | `LiteSkeleton.svelte` | ✅ 1:1 对齐 | 静态占位骨架与加载语义 |
| `Spin` | `LiteSpin.svelte` | ✅ 1:1 对齐 | CSS 加载指示器与 aria-busy |
| `Progress` | `LiteProgress.svelte` | ✅ 1:1 对齐 | 原生 progress 与语义色 |
| `MediaThumbnail` | `LiteMediaThumbnail.svelte` | ✅ 1:1 对齐 | 媒体缩略图与访问性标签 |
| `LiveIndicator` | `LiteRealtimeStatus.svelte` | ⚡ 语义降级 | 服务端快照时间与刷新回退 |
| `AreaChart` | `LiteAreaChart.svelte` | ⚡ 语义降级 | SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接 |
| `ScatterChart` | `LiteScatterChart.svelte` | ⚡ 语义降级 | SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接 |
| `RadarChart` | `LiteRadarChart.svelte` | ⚡ 语义降级 | SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接 |
| `GaugeChart` | `LiteGaugeChart.svelte` | ⚡ 语义降级 | SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接 |
| `FunnelChart` | `LiteFunnelChart.svelte` | ⚡ 语义降级 | SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接 |
| `HeatmapChart` | `LiteHeatmapChart.svelte` | ⚡ 语义降级 | SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接 |
| `WaterfallChart` | `LiteWaterfallChart.svelte` | ⚡ 语义降级 | SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接 |
| `RoseChart` | `LiteRoseChart.svelte` | ⚡ 语义降级 | SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接 |
| `DonutChart` | `LiteDonutChart.svelte` | ⚡ 语义降级 | SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接 |

### FIELDS

| UI 组件 (SPA) | Lite 对应组件 (SSR) | 对齐状态 | 降级策略 / 承接方案 |
|---|---|:---:|---|
| `RelationPicker` | `fields/LiteRelationField.svelte` | ⚡ 语义降级 | Lite 使用原生关联选择或详情链接；服务端负责查询和授权 |
| `FileUpload` | `LiteFileUpload.svelte` | ✅ 1:1 对齐 | 原生 <input type="file">（accept/multiple/required 透传）+ multipart POST，服务端校验；进度、取消与重试属客户端增强 |
| `TextField` | `LiteTextField.svelte` | ✅ 1:1 对齐 | 按值域选择原生 input（text/time/datetime-local/color/email/url/tel）；非 hex 颜色回退 text |
| `NumberField` | `LiteNumberField.svelte` | ✅ 1:1 对齐 | 原生 <input type="number"> |
| `BooleanField` | `LiteBooleanField.svelte` | ✅ 1:1 对齐 | 原生 <input type="checkbox"> |
| `DateField` | `LiteDateField.svelte` | ✅ 1:1 对齐 | 原生 <input type="date">（datetime 字段用 datetime-local），透传 dateInput 的 min/max/step 且不做 UTC 平移 |
| `DateRangeField` | `LiteDateRangeField.svelte` | ✅ 1:1 对齐 | 区间展示与双 date 输入 |
| `SelectField` | `LiteSelectField.svelte` | ✅ 1:1 对齐 | 原生 <select> |
| `MultiSelectField` | `LiteMultiSelectField.svelte` | ✅ 1:1 对齐 | 原生 <select multiple> |
| `RelationField` | `LiteRelationField.svelte` | ✅ 1:1 对齐 | 原生 <select> 或外键关联跳转 |
| `TagField` | `LiteTagField.svelte` | ✅ 1:1 对齐 | 每个标签一个同名原生输入（服务端 getAll 解析为数组，兼容历史逗号值）与徽章展示 |
| `EmailField` | `LiteEmailField.svelte` | ✅ 1:1 对齐 | 原生 mailto 链接与 text 输入 |
| `UrlField` | `LiteUrlField.svelte` | ✅ 1:1 对齐 | 原生 <a> 链接与 text 输入 |
| `PhoneField` | `LitePhoneField.svelte` | ✅ 1:1 对齐 | 原生 tel 链接与 tel 输入 |
| `CurrencyField` | `LiteCurrencyField.svelte` | ✅ 1:1 对齐 | Intl 格式化与数值输入 |
| `PercentField` | `LitePercentField.svelte` | ✅ 1:1 对齐 | 百分比格式化与纯 CSS 进度条 |
| `RatingField` | `LiteRatingField.svelte` | ✅ 1:1 对齐 | Unicode 星级字符与数值输入 |
| `AvatarField` | `LiteAvatarField.svelte` | ✅ 1:1 对齐 | 纯 CSS 头像、首字母占位与在线状态点 |
| `FileField` | `LiteFileField.svelte` | ✅ 1:1 对齐 | 原生 <input type="file"> |
| `ImageField` | `LiteImageField.svelte` | ✅ 1:1 对齐 | 媒体缩略图与 URL 输入 |
| `ArrayField` | `LiteArrayField.svelte` | ✅ 1:1 对齐 | 嵌套表格/Fieldset 与服务端索引解析 |
| `JsonField` | `LiteJsonField.svelte` | ✅ 1:1 对齐 | JSON 格式化与原生 Textarea |
| `CopyField` | `LiteCopyField.svelte` | ✅ 1:1 对齐 | 可选中等宽文本展示 |
| `CodeField` | `LiteCodeField.svelte` | ✅ 1:1 对齐 | 服务端 <pre><code> 展示（含语言徽标与 maxHeight）与原生 Textarea 编辑；剪贴板复制为客户端增强，数据契约一致 |
| `MarkdownField` | `LiteMarkdownField.svelte` | ✅ 1:1 对齐 | 原生 Textarea 编辑 + 服务端渲染 Markdown 预览（标题/列表/引用/代码/强调/安全链接）；工具栏与分屏属客户端增强 |
| `RichTextField` | `LiteRichTextField.svelte` | ⚡ 语义降级 | 服务端白名单渲染只读富文本 + Textarea 编辑源码；WYSIWYG 工具栏与所见即所得编辑由 SPA 承接 |
| `TreeSelect` | `fields/LiteTreeSelect.svelte` | ✅ 1:1 对齐 | 原生层级缩进 <select> 与单选/多选 |
| `Cascader` | `fields/LiteCascader.svelte` | ✅ 1:1 对齐 | 路径展开原生 <select> 与格式化展示 |
| `Transfer` | `LiteTransfer.svelte` | ✅ 1:1 对齐 | 双列复选框/列表与左右转移 POST 表单 |
| `DynamicFormList` | `LiteDynamicFormList.svelte` | ✅ 1:1 对齐 | 子表单卡片/表格与服务端索引数组解析 |
| `DatePicker` | `fields/LiteDateField.svelte` | ✅ 1:1 对齐 | 原生 <input type="date"> 保留日期值域与 min/max/step；弹层日历与快捷预设属客户端增强 |
| `DateRangePicker` | `fields/LiteDateRangeField.svelte` | ✅ 1:1 对齐 | 双原生 <input type="date"> 保留区间数据契约；区间顺序与时区由宿主校验，弹层日历属客户端增强 |
| `TimePicker` | `fields/LiteTextField.svelte` | ✅ 1:1 对齐 | 原生 <input type="time"> 保留时间值域；时区解释与业务步进由宿主承接 |
| `DateTimePicker` | `fields/LiteTextField.svelte` | ✅ 1:1 对齐 | 原生 <input type="datetime-local"> 保留本地时刻值域；时区与消歧规则由宿主承接 |
| `RadioGroup` | `LiteSelectField.svelte` | ✅ 1:1 对齐 | 原生 <select> 承载同一枚举互斥值，服务端按资源契约校验枚举；单选按钮呈现属客户端增强 |
| `TagsInput` | `fields/LiteTagField.svelte` | ✅ 1:1 对齐 | 每个标签一个同名原生输入、留空即删除，服务端解析为数组；数量与取值校验由宿主承接 |
| `Slider` | `fields/LiteNumberField.svelte` | ✅ 1:1 对齐 | 原生 <input type="number"> 保留 min/max/step 数值契约；拖动滑杆属客户端增强 |
| `RangeSlider` | `fields/LiteNumberField.svelte` | ✅ 1:1 对齐 | 两个原生 number 输入保留上下界与 step 契约；区间完整性由宿主校验，拖动属客户端增强 |
| `ColorPicker` | `fields/LiteTextField.svelte` | ✅ 1:1 对齐 | 原生 <input type="color">（非 hex 存量值回退 text）；品牌白名单与透明度由宿主承接 |
| `Rate` | `fields/LiteRatingField.svelte` | ✅ 1:1 对齐 | 原生 number 输入（min/max/step）+ 星级展示，保留评分契约；星标点选属客户端增强 |
| `ImageCropper` | `LiteImageCropper.svelte` | ✅ 1:1 对齐 | 图片缩放与裁剪参数表单 |
| `JsonSchemaForm` | `LiteJsonSchemaForm.svelte` | ✅ 1:1 对齐 | JSON Schema 动态表单生成 |
| `MentionsInput` | `LiteMentionsInput.svelte` | ✅ 1:1 对齐 | @与#智能提及输入框 |
| `SignaturePad` | `LiteSignaturePad.svelte` | ⚡ 语义降级 | SSR 承接已签署图片的上传与预览；canvas 手写板由 SPA 承接 |
| `OtpInput` | `LiteOtpInput.svelte` | ✅ 1:1 对齐 | 原生一次性验证码输入与长度约束 |
| `AutoComplete` | `LiteAutoComplete.svelte` | ⚡ 语义降级 | 原生 input + datalist 建议；异步查询和键盘弹层由 SPA 承接 |

### LAYOUT

| UI 组件 (SPA) | Lite 对应组件 (SSR) | 对齐状态 | 降级策略 / 承接方案 |
|---|---|:---:|---|
| `SegmentedControl` | `LiteTabs.svelte` | ⚡ 语义降级 | Lite 使用原生链接或 tabs 导航；不承诺 SPA 内联状态切换 |
| `Layout` | `LiteLayout.svelte` | ✅ 1:1 对齐 | 侧边栏与主工作区 Flex 布局 |
| `Sidebar` | `layout/LiteSidebar.svelte` | ✅ 1:1 对齐 | 多级常开导航与权限裁剪 |
| `Header` | `layout/LiteHeader.svelte` | ✅ 1:1 对齐 | 顶栏面包屑与用户菜单 |
| `Breadcrumbs` | `LiteBreadcrumbs.svelte` | ✅ 1:1 对齐 | 语义化面包屑路径链接 |
| `CanAccess` | `layout/LiteCanAccess.svelte` | ✅ 1:1 对齐 | 服务端同步权限判定容器 |
| `ErrorBoundary` | `layout/LiteErrorBoundary.svelte` | ✅ 1:1 对齐 | 受限环境错误提示面板 |
| `SplitPaneLayout` | `LiteSplitPaneLayout.svelte` | ✅ 1:1 对齐 | 双栏弹性比例分屏布局 |
| `MultiTabKeepAlive` | `LiteMultiTabKeepAlive.svelte` | ✅ 1:1 对齐 | 工作台多标签页导航 |
| `Anchor` | `LiteAnchor.svelte` | ✅ 1:1 对齐 | 语义化页内锚点导航 |
| `Affix` | `LiteAffix.svelte` | ⚡ 语义降级 | CSS position: sticky 固定；滚动监听状态样式由 SPA 承接 |
| `Collapse` | `LiteCollapse.svelte` | ⚡ 语义降级 | 原生 details/summary 展开面板；手风琴状态由宿主承接 |
| `FloatButton` | `LiteFloatButton.svelte` | ✅ 1:1 对齐 | 固定位置链接或状态按钮 |
| `Steps` | `LiteSteps.svelte` | ✅ 1:1 对齐 | 有序步骤与完成/处理中/错误状态 |
| `Menu` | `LiteMenu.svelte` | ✅ 1:1 对齐 | 递归菜单、选中态与徽章，无客户端展开状态 |
| `Space` | `LiteSpace.svelte` | ✅ 1:1 对齐 | Flex 间距容器 |
| `Grid` | `LiteGrid.svelte` | ✅ 1:1 对齐 | CSS Grid 列布局，窄屏降为单列 |
| `Link` | `LiteLink.svelte` | ✅ 1:1 对齐 | 原生链接与禁用态 |
| `PageHeader` | `LitePageHeader.svelte` | ✅ 1:1 对齐 | 标题、说明、eyebrow 与操作区 |
| `ContentPageHeader` | `LitePageHeader.svelte` | ✅ 1:1 对齐 | 复用 LitePageHeader 的标题与操作插槽 |
| `StatusTabs` | `LiteStatusTabs.svelte` | ✅ 1:1 对齐 | 状态筛选链接与计数徽章 |
| `BackTop` | `LiteBackTop.svelte` | ✅ 1:1 对齐 | 固定回顶锚点 |
| `ResizeBox` | `LiteResizeBox.svelte` | ⚡ 语义降级 | CSS resize 容器；尺寸持久化由宿主承接 |
| `Pagination` | `LitePagination.svelte` | ✅ 1:1 对齐 | 原生分页链接与当前页 |
| `ThemeToggle` | — | 🚫 免适配 | 免适配 (Lite 为固定 Slate/Indigo 配色) |

### BUTTONS

| UI 组件 (SPA) | Lite 对应组件 (SSR) | 对齐状态 | 降级策略 / 承接方案 |
|---|---|:---:|---|
| `ListButton` | `buttons/LiteListButton.svelte` | ✅ 1:1 对齐 | 原生 <a> 链接 |
| `CreateButton` | `buttons/LiteCreateButton.svelte` | ✅ 1:1 对齐 | 原生 <a> 链接 |
| `EditButton` | `buttons/LiteEditButton.svelte` | ✅ 1:1 对齐 | 原生 <a> 链接 |
| `ShowButton` | `buttons/LiteShowButton.svelte` | ✅ 1:1 对齐 | 原生 <a> 链接 |
| `DeleteButton` | `buttons/LiteDeleteButton.svelte` | ✅ 1:1 对齐 | 锚点确认弹窗与 POST Form |
| `CloneButton` | `buttons/LiteCloneButton.svelte` | ✅ 1:1 对齐 | 原生 <a> 链接 |
| `RefreshButton` | `buttons/LiteRefreshButton.svelte` | ✅ 1:1 对齐 | 原生 <a> 重载链接 |
| `SaveButton` | `buttons/LiteSaveButton.svelte` | ✅ 1:1 对齐 | 原生 <button type="submit"> |
| `ExportButton` | `buttons/LiteExportButton.svelte` | ✅ 1:1 对齐 | 服务端 CSV/Excel 导出链接 |
| `ImportButton` | `buttons/LiteImportButton.svelte` | ✅ 1:1 对齐 | 原生文件上传表单 |
