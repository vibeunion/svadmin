# @svadmin/ui ↔ @svadmin/lite 组件对齐矩阵

> 自动生成时间：`2026-09-20T06:36:18.597Z`
> 总体适配覆盖率：**100%**（125/125 组件）
>
> 覆盖率仅统计本清单中的映射分类（含降级与免适配），不代表所有公开组件已收录或完整行为已通过验收。

## 进度总览

| 模块分类 | 组件总数 | 1:1 对齐 (Exact) | 语义降级 (Fallback) | 免适配 (SPA Only) | 待补齐 (Missing) | 覆盖率 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **pages** | 16 | 12 | 4 | 0 | 0 | **100%** |
| **advanced** | 34 | 20 | 13 | 1 | 0 | **100%** |
| **widgets** | 11 | 6 | 5 | 0 | 0 | **100%** |
| **fields** | 44 | 29 | 15 | 0 | 0 | **100%** |
| **layout** | 10 | 8 | 1 | 1 | 0 | **100%** |
| **buttons** | 10 | 10 | 0 | 0 | 0 | **100%** |

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

### ADVANCED

| UI 组件 (SPA) | Lite 对应组件 (SSR) | 对齐状态 | 降级策略 / 承接方案 |
|---|---|:---:|---|
| `ErrorSummary` | `LiteErrorSummary.svelte` | ⚡ 语义降级 | Lite 使用静态错误区域与原生锚点；校验和服务端错误映射由宿主承接 |
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
| `DevTools` | — | 🚫 免适配 | 免适配 (SPA 调试器) |

### WIDGETS

| UI 组件 (SPA) | Lite 对应组件 (SSR) | 对齐状态 | 降级策略 / 承接方案 |
|---|---|:---:|---|
| `DashboardView` | `LiteMetricStrip.svelte` | ⚡ 语义降级 | Lite 使用服务端指标条和原生链接；查询、聚合和权限由宿主承接 |
| `StatsCard` | `LiteStatsCard.svelte` | ✅ 1:1 对齐 | 指标卡片与趋势徽章 |
| `MetricStrip` | `LiteMetricStrip.svelte` | ✅ 1:1 对齐 | 服务端指标条、趋势与原生链接 |
| `AnomalyBadge` | `widgets/LiteAnomalyBadge.svelte` | ✅ 1:1 对齐 | 异常状态高亮徽章 |
| `Badge` | `LiteBadge.svelte` | ✅ 1:1 对齐 | 语义状态徽章与原生链接承接 |
| `BarChart` | `widgets/LiteBarChart.svelte` | ⚡ 语义降级 | 降级为 CSS 柱状图或数据明细表格 |
| `LineChart` | `widgets/LiteLineChart.svelte` | ⚡ 语义降级 | 降级为折线数据点表格与趋势指示 |
| `PieChart` | `widgets/LitePieChart.svelte` | ⚡ 语义降级 | 降级为占比条与结构化表格 |
| `PresenceAvatarGroup` | `LitePresenceAvatarGroup.svelte` | ✅ 1:1 对齐 | 多人在线协同感知状态 |
| `GanttChart` | `LiteGanttChart.svelte` | ⚡ 语义降级 | 共享有界时间线校验；Lite 原生表格与链接恢复，SPA 交互选择与回调，不含依赖/工作日历/自动排程引擎 |
| `OfflineSyncBanner` | `LiteOfflineSyncBanner.svelte` | ✅ 1:1 对齐 | 离线状态感知与变更队列同步栏 |

### FIELDS

| UI 组件 (SPA) | Lite 对应组件 (SSR) | 对齐状态 | 降级策略 / 承接方案 |
|---|---|:---:|---|
| `RelationPicker` | `fields/LiteRelationField.svelte` | ⚡ 语义降级 | Lite 使用原生关联选择或详情链接；服务端负责查询和授权 |
| `FileUpload` | `LiteFileUpload.svelte` | ⚡ 语义降级 | 可见原生文件输入与 multipart POST；服务端校验，不提供客户端进度、取消或重试 |
| `TextField` | `LiteTextField.svelte` | ✅ 1:1 对齐 | 原生 <input type="text"> |
| `NumberField` | `LiteNumberField.svelte` | ✅ 1:1 对齐 | 原生 <input type="number"> |
| `BooleanField` | `LiteBooleanField.svelte` | ✅ 1:1 对齐 | 原生 <input type="checkbox"> |
| `DateField` | `LiteDateField.svelte` | ✅ 1:1 对齐 | 原生 <input type="date"> |
| `DateRangeField` | `LiteDateRangeField.svelte` | ✅ 1:1 对齐 | 区间展示与双 date 输入 |
| `SelectField` | `LiteSelectField.svelte` | ✅ 1:1 对齐 | 原生 <select> |
| `MultiSelectField` | `LiteMultiSelectField.svelte` | ✅ 1:1 对齐 | 原生 <select multiple> |
| `RelationField` | `LiteRelationField.svelte` | ✅ 1:1 对齐 | 原生 <select> 或外键关联跳转 |
| `TagField` | `LiteTagField.svelte` | ✅ 1:1 对齐 | 逗号分隔原生输入与徽章展示 |
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
| `CodeField` | `LiteCodeField.svelte` | ⚡ 语义降级 | 降级为 <pre><code> 语法容器与 Textarea 编辑 |
| `MarkdownField` | `LiteMarkdownField.svelte` | ⚡ 语义降级 | 降级为原生 Textarea 与纯 HTML 预览 |
| `RichTextField` | `LiteRichTextField.svelte` | ⚡ 语义降级 | 降级为原生 Textarea 与只读展示 |
| `TreeSelect` | `fields/LiteTreeSelect.svelte` | ✅ 1:1 对齐 | 原生层级缩进 <select> 与单选/多选 |
| `Cascader` | `fields/LiteCascader.svelte` | ✅ 1:1 对齐 | 路径展开原生 <select> 与格式化展示 |
| `Transfer` | `LiteTransfer.svelte` | ✅ 1:1 对齐 | 双列复选框/列表与左右转移 POST 表单 |
| `DynamicFormList` | `LiteDynamicFormList.svelte` | ✅ 1:1 对齐 | 子表单卡片/表格与服务端索引数组解析 |
| `DatePicker` | `fields/LiteDateField.svelte` | ⚡ 语义降级 | Lite 复用原生 date 字段；宿主通过 FieldDefinition 承接日期格式和服务端校验 |
| `DateRangePicker` | `fields/LiteDateRangeField.svelte` | ⚡ 语义降级 | Lite 复用双原生 date 输入；区间顺序和业务时区由宿主校验 |
| `TimePicker` | `fields/LiteTextField.svelte` | ⚡ 语义降级 | Lite 使用受限文本输入；宿主负责时间格式、步进和时区解释 |
| `DateTimePicker` | `fields/LiteTextField.svelte` | ⚡ 语义降级 | Lite 使用受限文本输入；宿主负责本地时间、时区和消歧规则 |
| `RadioGroup` | `LiteSelectField.svelte` | ⚡ 语义降级 | Lite 使用原生 select 提交互斥值；服务端仍按资源契约校验枚举 |
| `TagsInput` | `fields/LiteTagField.svelte` | ⚡ 语义降级 | Lite 使用逗号分隔标签字段；宿主负责数量、长度和允许值校验 |
| `Slider` | `fields/LiteNumberField.svelte` | ⚡ 语义降级 | Lite 使用带 min/max/step 的原生 number 输入 |
| `RangeSlider` | `fields/LiteNumberField.svelte` | ⚡ 语义降级 | Lite 使用两个受限数值字段；宿主负责范围完整性和精度校验 |
| `ColorPicker` | `fields/LiteTextField.svelte` | ⚡ 语义降级 | Lite 使用受限文本输入；宿主负责颜色格式和品牌白名单校验 |
| `Rate` | `fields/LiteRatingField.svelte` | ⚡ 语义降级 | Lite 使用原生数值输入与星级展示；宿主负责评分范围校验 |
| `ImageCropper` | `LiteImageCropper.svelte` | ✅ 1:1 对齐 | 图片缩放与裁剪参数表单 |
| `JsonSchemaForm` | `LiteJsonSchemaForm.svelte` | ✅ 1:1 对齐 | JSON Schema 动态表单生成 |
| `MentionsInput` | `LiteMentionsInput.svelte` | ✅ 1:1 对齐 | @与#智能提及输入框 |
| `SignaturePad` | `LiteSignaturePad.svelte` | ✅ 1:1 对齐 | 电子签名画板与文件上传降级 |

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
