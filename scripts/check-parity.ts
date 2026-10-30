/**
 * scripts/check-parity.ts
 *
 * Scans @svadmin/ui and @svadmin/lite components to compute parity metrics,
 * generate packages/lite/PARITY.md and packages/lite/parity.json,
 * and provide an executable CLI dashboard.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type ParityStatus = 'exact' | 'fallback' | 'spa_only' | 'missing';

export interface ParityItem {
  name: string;
  uiComponent: string;
  liteComponent?: string;
  category: 'fields' | 'buttons' | 'pages' | 'layout' | 'widgets' | 'advanced' | 'compatibility';
  status: ParityStatus;
  strategy: string;
  note?: string;
}

export interface ParityCategorySummary {
  category: string;
  total: number;
  adapted: number;
  fallback: number;
  spaOnly: number;
  missing: number;
  percentage: number;
  /** Share of entries that are 1:1 counterparts, not fallbacks. */
  exactRate: number;
  /** Share of entries that degrade to a server-rendered fallback. */
  fallbackRate: number;
  /** Mapped Lite components referenced from a behavior test file. */
  behaviorVerified: number;
  /** Referenced components whose importing test file carries a real assertion budget. */
  behaviorAsserted: number;
}

export interface ParityReport {
  timestamp: string;
  totalComponents: number;
  adaptedCount: number;
  fallbackCount: number;
  spaOnlyCount: number;
  missingCount: number;
  overallCoveragePercentage: number;
  /** 1:1 counterpart rate; the primary progress metric. */
  exactPercentage: number;
  /** Semantic-fallback rate; the debt metric. */
  fallbackPercentage: number;
  /** Entries whose mapped Lite component appears in a behavior test. */
  behaviorVerifiedCount: number;
  behaviorVerifiedPercentage: number;
  /** Referenced entries whose test file asserts at least twice per imported component. */
  behaviorAssertedCount: number;
  behaviorAssertedPercentage: number;
  categories: Record<string, ParityCategorySummary>;
  items: ParityItem[];
}

/**
 * Classification criteria (applies to every entry below, no per-entry exceptions).
 *
 * `exact` — the reference capability is preserved with server HTML and native
 * form semantics. Only client-side enhancements may be missing (clipboard copy,
 * animation, drag handle, scroll listener, popover positioning, optimistic
 * preview), and the submitted/rendered data contract stays the same.
 *
 * `fallback` — the reference capability depends on client state that changes
 * what is visible or computed (virtualization, recursive filter editing, drag
 * reorder with rollback, pivot recomputation, tree indeterminate selection,
 * canvas/spreadsheet engines, chart interaction) or on an interaction model with
 * no native equivalent. The Lite component must state the server-owned boundary.
 *
 * `spa_only` — the capability is meaningless without the client runtime and is not
 * part of the SSR contract at all.
 *
 * When an entry is ambiguous, keep `fallback` until the boundary is proven and
 * recorded; do not upgrade an entry because it "looks close".
 */
const CLASSIFICATION_CRITERIA_SUMMARY = [
  'exact = 服务端 HTML 与原生表单可完整保留能力，仅缺少客户端增强（复制、动画、拖拽手柄、滚动监听、弹层定位、乐观预览），数据契约不变。',
  'fallback = 能力依赖客户端状态（虚拟滚动、递归筛选编辑、拖拽回滚、透视重算、树半选、画布/表格引擎、图表交互）或无原生等价交互，需在策略中写明服务端边界。',
  'spa_only = 脱离客户端运行时无意义，不属于 SSR 契约。',
  '存在争议时保持 fallback，直到边界被证明并记录；不得因"看起来接近"而升级。',
];

const PARITY_ITEMS: ParityItem[] = [
  { name: 'AutoTable', uiComponent: 'AutoTable.svelte', liteComponent: 'pages/LiteListPage.svelte', category: 'pages', status: 'fallback', strategy: 'Lite 使用服务端分页原生表格；筛选、批量命令和导出由宿主页面承接' },
  { name: 'AutoForm', uiComponent: 'AutoForm.svelte', liteComponent: 'LiteForm.svelte', category: 'pages', status: 'fallback', strategy: 'Lite 使用原生 POST 表单；字段契约和服务端错误回显由宿主承接' },
  { name: 'ErrorSummary', uiComponent: 'ErrorSummary.svelte', liteComponent: 'LiteErrorSummary.svelte', category: 'advanced', status: 'fallback', strategy: 'Lite 使用静态错误区域与原生锚点；校验和服务端错误映射由宿主承接' },
  { name: 'ResourceOperationsPage', uiComponent: 'ResourceOperationsPage.svelte', liteComponent: 'pages/LiteListPage.svelte', category: 'pages', status: 'fallback', strategy: 'Lite 组合原生列表、操作链接和服务端表单，不提供 SPA 抽屉状态' },
  { name: 'RecordDetailDrawer', uiComponent: 'RecordDetailDrawer.svelte', liteComponent: 'pages/LiteShowPage.svelte', category: 'pages', status: 'fallback', strategy: 'Lite 使用独立详情页；宿主通过链接保留资源和记录上下文' },
  { name: 'DashboardView', uiComponent: 'DashboardView.svelte', liteComponent: 'LiteMetricStrip.svelte', category: 'widgets', status: 'fallback', strategy: 'Lite 使用服务端指标条和原生链接；查询、聚合和权限由宿主承接' },
  { name: 'ApprovalCenter', uiComponent: 'ApprovalCenter.svelte', liteComponent: 'LiteApprovalActionCard.svelte', category: 'advanced', status: 'fallback', strategy: 'Lite 使用审批列表页与原生 POST 动作；审批规则、事务和审计由宿主承接' },
  { name: 'PivotExportButton', uiComponent: 'PivotExportButton.svelte', liteComponent: 'LitePivotTable.svelte', category: 'advanced', status: 'fallback', strategy: 'Lite 使用服务端导出链接；任务回执和下载授权由宿主承接' },
  { name: 'RelationPicker', uiComponent: 'RelationPicker.svelte', liteComponent: 'fields/LiteRelationField.svelte', category: 'fields', status: 'fallback', strategy: 'Lite 使用原生关联选择或详情链接；服务端负责查询和授权' },
  { name: 'FilterCollectionInput', uiComponent: 'FilterCollectionInput.svelte', liteComponent: 'LiteFilterBuilder.svelte', category: 'advanced', status: 'fallback', strategy: 'Lite 使用原生筛选表单；完整递归交互由服务端回显承接' },
  { name: 'SegmentedControl', uiComponent: 'SegmentedControl.svelte', liteComponent: 'LiteTabs.svelte', category: 'layout', status: 'fallback', strategy: 'Lite 使用原生链接或 tabs 导航；不承诺 SPA 内联状态切换' },
  { name: 'FileUpload', uiComponent: 'FileUpload.svelte', liteComponent: 'LiteFileUpload.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="file">（accept/multiple/required 透传）+ multipart POST，服务端校验；进度、取消与重试属客户端增强' },
  // ─── Fields ─────────────────────────────────────────────────────────────
  { name: 'TextField', uiComponent: 'TextField.svelte', liteComponent: 'LiteTextField.svelte', category: 'fields', status: 'exact', strategy: '按值域选择原生 input（text/time/datetime-local/color/email/url/tel）；非 hex 颜色回退 text' },
  { name: 'NumberField', uiComponent: 'NumberField.svelte', liteComponent: 'LiteNumberField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="number">' },
  { name: 'BooleanField', uiComponent: 'BooleanField.svelte', liteComponent: 'LiteBooleanField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="checkbox">' },
  { name: 'DateField', uiComponent: 'DateField.svelte', liteComponent: 'LiteDateField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="date">（datetime 字段用 datetime-local），透传 dateInput 的 min/max/step 且不做 UTC 平移' },
  { name: 'DateRangeField', uiComponent: 'DateRangeField.svelte', liteComponent: 'LiteDateRangeField.svelte', category: 'fields', status: 'exact', strategy: '区间展示与双 date 输入' },
  { name: 'SelectField', uiComponent: 'SelectField.svelte', liteComponent: 'LiteSelectField.svelte', category: 'fields', status: 'exact', strategy: '原生 <select>' },
  { name: 'MultiSelectField', uiComponent: 'MultiSelectField.svelte', liteComponent: 'LiteMultiSelectField.svelte', category: 'fields', status: 'exact', strategy: '原生 <select multiple>' },
  { name: 'RelationField', uiComponent: 'RelationField.svelte', liteComponent: 'LiteRelationField.svelte', category: 'fields', status: 'exact', strategy: '原生 <select> 或外键关联跳转' },
  { name: 'TagField', uiComponent: 'TagField.svelte', liteComponent: 'LiteTagField.svelte', category: 'fields', status: 'exact', strategy: '每个标签一个同名原生输入（服务端 getAll 解析为数组，兼容历史逗号值）与徽章展示' },
  { name: 'EmailField', uiComponent: 'EmailField.svelte', liteComponent: 'LiteEmailField.svelte', category: 'fields', status: 'exact', strategy: '原生 mailto 链接与 text 输入' },
  { name: 'UrlField', uiComponent: 'UrlField.svelte', liteComponent: 'LiteUrlField.svelte', category: 'fields', status: 'exact', strategy: '原生 <a> 链接与 text 输入' },
  { name: 'PhoneField', uiComponent: 'PhoneField.svelte', liteComponent: 'LitePhoneField.svelte', category: 'fields', status: 'exact', strategy: '原生 tel 链接与 tel 输入' },
  { name: 'CurrencyField', uiComponent: 'CurrencyField.svelte', liteComponent: 'LiteCurrencyField.svelte', category: 'fields', status: 'exact', strategy: 'Intl 格式化与数值输入' },
  { name: 'PercentField', uiComponent: 'PercentField.svelte', liteComponent: 'LitePercentField.svelte', category: 'fields', status: 'exact', strategy: '百分比格式化与纯 CSS 进度条' },
  { name: 'RatingField', uiComponent: 'RatingField.svelte', liteComponent: 'LiteRatingField.svelte', category: 'fields', status: 'exact', strategy: 'Unicode 星级字符与数值输入' },
  { name: 'AvatarField', uiComponent: 'AvatarField.svelte', liteComponent: 'LiteAvatarField.svelte', category: 'fields', status: 'exact', strategy: '纯 CSS 头像、首字母占位与在线状态点' },
  { name: 'FileField', uiComponent: 'FileField.svelte', liteComponent: 'LiteFileField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="file">' },
  { name: 'ImageField', uiComponent: 'ImageField.svelte', liteComponent: 'LiteImageField.svelte', category: 'fields', status: 'exact', strategy: '媒体缩略图与 URL 输入' },
  { name: 'ArrayField', uiComponent: 'ArrayField.svelte', liteComponent: 'LiteArrayField.svelte', category: 'fields', status: 'exact', strategy: '嵌套表格/Fieldset 与服务端索引解析' },
  { name: 'JsonField', uiComponent: 'JsonField.svelte', liteComponent: 'LiteJsonField.svelte', category: 'fields', status: 'exact', strategy: 'JSON 格式化与原生 Textarea' },
  { name: 'CopyField', uiComponent: 'CopyField.svelte', liteComponent: 'LiteCopyField.svelte', category: 'fields', status: 'exact', strategy: '可选中等宽文本展示' },
  { name: 'CodeField', uiComponent: 'CodeField.svelte', liteComponent: 'LiteCodeField.svelte', category: 'fields', status: 'exact', strategy: '服务端 <pre><code> 展示（含语言徽标与 maxHeight）与原生 Textarea 编辑；剪贴板复制为客户端增强，数据契约一致' },
  { name: 'MarkdownField', uiComponent: 'MarkdownField.svelte', liteComponent: 'LiteMarkdownField.svelte', category: 'fields', status: 'fallback', strategy: 'Textarea 编辑 + 服务端 <pre> 源码展示；Markdown 渲染预览由宿主或 SPA 承接' },
  { name: 'RichTextField', uiComponent: 'RichTextField.svelte', liteComponent: 'LiteRichTextField.svelte', category: 'fields', status: 'fallback', strategy: '降级为原生 Textarea 与只读展示' },
  { name: 'TreeSelect', uiComponent: 'TreeSelect.svelte', liteComponent: 'fields/LiteTreeSelect.svelte', category: 'fields', status: 'exact', strategy: '原生层级缩进 <select> 与单选/多选' },
  { name: 'Cascader', uiComponent: 'Cascader.svelte', liteComponent: 'fields/LiteCascader.svelte', category: 'fields', status: 'exact', strategy: '路径展开原生 <select> 与格式化展示' },
  { name: 'Transfer', uiComponent: 'Transfer.svelte', liteComponent: 'LiteTransfer.svelte', category: 'fields', status: 'exact', strategy: '双列复选框/列表与左右转移 POST 表单' },
  { name: 'DynamicFormList', uiComponent: 'DynamicFormList.svelte', liteComponent: 'LiteDynamicFormList.svelte', category: 'fields', status: 'exact', strategy: '子表单卡片/表格与服务端索引数组解析' },
  { name: 'DatePicker', uiComponent: 'DatePicker.svelte', liteComponent: 'fields/LiteDateField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="date"> 保留日期值域与 min/max/step；弹层日历与快捷预设属客户端增强' },
  { name: 'DateRangePicker', uiComponent: 'DateRangePicker.svelte', liteComponent: 'fields/LiteDateRangeField.svelte', category: 'fields', status: 'exact', strategy: '双原生 <input type="date"> 保留区间数据契约；区间顺序与时区由宿主校验，弹层日历属客户端增强' },
  { name: 'TimePicker', uiComponent: 'TimePicker.svelte', liteComponent: 'fields/LiteTextField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="time"> 保留时间值域；时区解释与业务步进由宿主承接' },
  { name: 'DateTimePicker', uiComponent: 'DateTimePicker.svelte', liteComponent: 'fields/LiteTextField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="datetime-local"> 保留本地时刻值域；时区与消歧规则由宿主承接' },
  { name: 'RadioGroup', uiComponent: 'RadioGroup.svelte', liteComponent: 'LiteSelectField.svelte', category: 'fields', status: 'exact', strategy: '原生 <select> 承载同一枚举互斥值，服务端按资源契约校验枚举；单选按钮呈现属客户端增强' },
  { name: 'TagsInput', uiComponent: 'TagsInput.svelte', liteComponent: 'fields/LiteTagField.svelte', category: 'fields', status: 'exact', strategy: '每个标签一个同名原生输入、留空即删除，服务端解析为数组；数量与取值校验由宿主承接' },
  { name: 'Slider', uiComponent: 'Slider.svelte', liteComponent: 'fields/LiteNumberField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="number"> 保留 min/max/step 数值契约；拖动滑杆属客户端增强' },
  { name: 'RangeSlider', uiComponent: 'RangeSlider.svelte', liteComponent: 'fields/LiteNumberField.svelte', category: 'fields', status: 'exact', strategy: '两个原生 number 输入保留上下界与 step 契约；区间完整性由宿主校验，拖动属客户端增强' },
  { name: 'ColorPicker', uiComponent: 'ColorPicker.svelte', liteComponent: 'fields/LiteTextField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="color">（非 hex 存量值回退 text）；品牌白名单与透明度由宿主承接' },
  { name: 'Rate', uiComponent: 'Rate.svelte', liteComponent: 'fields/LiteRatingField.svelte', category: 'fields', status: 'exact', strategy: '原生 number 输入（min/max/step）+ 星级展示，保留评分契约；星标点选属客户端增强' },

  // ─── Buttons ────────────────────────────────────────────────────────────
  { name: 'ListButton', uiComponent: 'buttons/ListButton.svelte', liteComponent: 'buttons/LiteListButton.svelte', category: 'buttons', status: 'exact', strategy: '原生 <a> 链接' },
  { name: 'CreateButton', uiComponent: 'buttons/CreateButton.svelte', liteComponent: 'buttons/LiteCreateButton.svelte', category: 'buttons', status: 'exact', strategy: '原生 <a> 链接' },
  { name: 'EditButton', uiComponent: 'buttons/EditButton.svelte', liteComponent: 'buttons/LiteEditButton.svelte', category: 'buttons', status: 'exact', strategy: '原生 <a> 链接' },
  { name: 'ShowButton', uiComponent: 'buttons/ShowButton.svelte', liteComponent: 'buttons/LiteShowButton.svelte', category: 'buttons', status: 'exact', strategy: '原生 <a> 链接' },
  { name: 'DeleteButton', uiComponent: 'buttons/DeleteButton.svelte', liteComponent: 'buttons/LiteDeleteButton.svelte', category: 'buttons', status: 'exact', strategy: '锚点确认弹窗与 POST Form' },
  { name: 'CloneButton', uiComponent: 'buttons/CloneButton.svelte', liteComponent: 'buttons/LiteCloneButton.svelte', category: 'buttons', status: 'exact', strategy: '原生 <a> 链接' },
  { name: 'RefreshButton', uiComponent: 'buttons/RefreshButton.svelte', liteComponent: 'buttons/LiteRefreshButton.svelte', category: 'buttons', status: 'exact', strategy: '原生 <a> 重载链接' },
  { name: 'SaveButton', uiComponent: 'buttons/SaveButton.svelte', liteComponent: 'buttons/LiteSaveButton.svelte', category: 'buttons', status: 'exact', strategy: '原生 <button type="submit">' },
  { name: 'ExportButton', uiComponent: 'buttons/ExportButton.svelte', liteComponent: 'buttons/LiteExportButton.svelte', category: 'buttons', status: 'exact', strategy: '服务端 CSV/Excel 导出链接' },
  { name: 'ImportButton', uiComponent: 'buttons/ImportButton.svelte', liteComponent: 'buttons/LiteImportButton.svelte', category: 'buttons', status: 'exact', strategy: '原生文件上传表单' },

  // ─── Pages ──────────────────────────────────────────────────────────────
  { name: 'ListPage', uiComponent: 'ListPage.svelte', liteComponent: 'pages/LiteListPage.svelte', category: 'pages', status: 'exact', strategy: '服务端分页、排序、搜索与原生表格' },
  { name: 'CreatePage', uiComponent: 'CreatePage.svelte', liteComponent: 'pages/LiteCreatePage.svelte', category: 'pages', status: 'exact', strategy: '服务端校验与 POST 表单' },
  { name: 'EditPage', uiComponent: 'EditPage.svelte', liteComponent: 'pages/LiteEditPage.svelte', category: 'pages', status: 'exact', strategy: '服务端加载与 POST 表单' },
  { name: 'ShowPage', uiComponent: 'ShowPage.svelte', liteComponent: 'pages/LiteShowPage.svelte', category: 'pages', status: 'exact', strategy: '键值明细卡片与操作栏' },
  { name: 'LoginPage', uiComponent: 'LoginPage.svelte', liteComponent: 'LiteLogin.svelte', category: 'pages', status: 'exact', strategy: '原生认证 POST 表单' },
  { name: 'RegisterPage', uiComponent: 'RegisterPage.svelte', liteComponent: 'pages/LiteRegisterPage.svelte', category: 'pages', status: 'exact', strategy: '原生注册 POST 表单' },
  { name: 'ForgotPasswordPage', uiComponent: 'ForgotPasswordPage.svelte', liteComponent: 'pages/LiteForgotPasswordPage.svelte', category: 'pages', status: 'exact', strategy: '找回密码原生表单' },
  { name: 'UpdatePasswordPage', uiComponent: 'UpdatePasswordPage.svelte', liteComponent: 'pages/LiteUpdatePasswordPage.svelte', category: 'pages', status: 'exact', strategy: '修改密码原生表单' },
  { name: 'ProfilePage', uiComponent: 'ProfilePage.svelte', liteComponent: 'pages/LiteProfilePage.svelte', category: 'pages', status: 'exact', strategy: '个人资料与安全选项卡' },

  // ─── Layout & Navigation ────────────────────────────────────────────────
  { name: 'Layout', uiComponent: 'Layout.svelte', liteComponent: 'LiteLayout.svelte', category: 'layout', status: 'exact', strategy: '侧边栏与主工作区 Flex 布局' },
  { name: 'Sidebar', uiComponent: 'Sidebar.svelte', liteComponent: 'layout/LiteSidebar.svelte', category: 'layout', status: 'exact', strategy: '多级常开导航与权限裁剪' },
  { name: 'Header', uiComponent: 'Header.svelte', liteComponent: 'layout/LiteHeader.svelte', category: 'layout', status: 'exact', strategy: '顶栏面包屑与用户菜单' },
  { name: 'Breadcrumbs', uiComponent: 'Breadcrumbs.svelte', liteComponent: 'LiteBreadcrumbs.svelte', category: 'layout', status: 'exact', strategy: '语义化面包屑路径链接' },
  { name: 'CanAccess', uiComponent: 'CanAccess.svelte', liteComponent: 'layout/LiteCanAccess.svelte', category: 'layout', status: 'exact', strategy: '服务端同步权限判定容器' },
  { name: 'ErrorBoundary', uiComponent: 'ErrorBoundary.svelte', liteComponent: 'layout/LiteErrorBoundary.svelte', category: 'layout', status: 'exact', strategy: '受限环境错误提示面板' },

  // ─── Widgets & Charts ───────────────────────────────────────────────────
  { name: 'StatsCard', uiComponent: 'StatsCard.svelte', liteComponent: 'LiteStatsCard.svelte', category: 'widgets', status: 'exact', strategy: '指标卡片与趋势徽章' },
  { name: 'MetricStrip', uiComponent: 'MetricStrip.svelte', liteComponent: 'LiteMetricStrip.svelte', category: 'widgets', status: 'exact', strategy: '服务端指标条、趋势与原生链接' },
  { name: 'AnomalyBadge', uiComponent: 'AnomalyBadge.svelte', liteComponent: 'widgets/LiteAnomalyBadge.svelte', category: 'widgets', status: 'exact', strategy: '异常状态高亮徽章' },
  { name: 'Badge', uiComponent: 'ui/badge/badge.svelte', liteComponent: 'LiteBadge.svelte', category: 'widgets', status: 'exact', strategy: '语义状态徽章与原生链接承接' },
  { name: 'Tag', uiComponent: 'Tag.svelte', liteComponent: 'LiteTag.svelte', category: 'widgets', status: 'fallback', strategy: 'Lite 使用服务端渲染标签与可选删除链接；可选中交互由宿主表单承接' },
  { name: 'BarChart', uiComponent: 'charts/BarChart.svelte', liteComponent: 'widgets/LiteBarChart.svelte', category: 'widgets', status: 'fallback', strategy: '降级为 CSS 柱状图或数据明细表格' },
  { name: 'LineChart', uiComponent: 'charts/LineChart.svelte', liteComponent: 'widgets/LiteLineChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'PieChart', uiComponent: 'charts/PieChart.svelte', liteComponent: 'widgets/LitePieChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },

  // ─── Advanced & Interactivity Fallbacks ─────────────────────────────────
  { name: 'ConfirmDialog', uiComponent: 'ConfirmDialog.svelte', liteComponent: 'LiteConfirmDialog.svelte', category: 'advanced', status: 'exact', strategy: 'CSS :target 锚点模态框' },
  { name: 'FilterBuilder', uiComponent: 'FilterBuilder.svelte', liteComponent: 'LiteFilterBuilder.svelte', category: 'advanced', status: 'exact', strategy: '可视化多条件原生筛选表单与 CRUD 运算符解析' },
  { name: 'DrawerForm', uiComponent: 'DrawerForm.svelte', liteComponent: 'LiteDrawerForm.svelte', category: 'advanced', status: 'exact', strategy: '原生独立编辑抽屉卡片表单' },
  { name: 'ModalForm', uiComponent: 'ModalForm.svelte', liteComponent: 'LiteModalForm.svelte', category: 'advanced', status: 'exact', strategy: '原生独立模态弹窗表单' },
  { name: 'VirtualTable', uiComponent: 'VirtualTable.svelte', liteComponent: 'LiteVirtualTable.svelte', category: 'advanced', status: 'fallback', strategy: 'SPA 固定高度虚拟窗口；Lite 使用完整原生表格，需由服务端分页或限制数据量' },
  { name: 'Table', uiComponent: 'ui/table/table.svelte', liteComponent: 'LiteTable.svelte', category: 'advanced', status: 'exact', strategy: '原生表格、横向滚动与可选固定边缘列' },
  { name: 'InlineEdit', uiComponent: 'InlineEdit.svelte', liteComponent: 'advanced/LiteInlineEdit.svelte', category: 'advanced', status: 'fallback', strategy: '降级为行内单独提交按钮或跳转编辑' },
  { name: 'AutoSaveIndicator', uiComponent: 'AutoSaveIndicator.svelte', liteComponent: 'advanced/LiteAutoSaveIndicator.svelte', category: 'advanced', status: 'fallback', strategy: '服务端保存时间戳展示' },
  { name: 'Toast', uiComponent: 'Toast.svelte', liteComponent: 'advanced/LiteToast.svelte', category: 'advanced', status: 'fallback', strategy: '降级为页面顶部 Alert 通知条' },
  { name: 'UndoableNotification', uiComponent: 'UndoableNotification.svelte', liteComponent: 'advanced/LiteUndoableNotification.svelte', category: 'advanced', status: 'fallback', strategy: '降级为带撤销表单的通知条' },
  { name: 'Watermark', uiComponent: 'Watermark.svelte', liteComponent: 'LiteWatermark.svelte', category: 'advanced', status: 'exact', strategy: '纯 CSS / SVG 矢量背景水印' },
  { name: 'ColumnSettings', uiComponent: 'ColumnSettings.svelte', liteComponent: 'LiteColumnSettings.svelte', category: 'advanced', status: 'exact', strategy: '原生多选表单与查询参数列过滤' },
  { name: 'ImportWizard', uiComponent: 'ImportWizard.svelte', liteComponent: 'LiteImportWizard.svelte', category: 'advanced', status: 'exact', strategy: '原生 Multipart 文件上传与映射提示' },
  { name: 'ColumnHeaderFilter', uiComponent: 'ColumnHeaderFilter.svelte', liteComponent: 'LiteColumnHeaderFilter.svelte', category: 'advanced', status: 'exact', strategy: '原生 GET 查询参数列过滤链接' },
  { name: 'TreeTable', uiComponent: 'TreeTable.svelte', liteComponent: 'LiteTreeTable.svelte', category: 'advanced', status: 'fallback', strategy: '完整原生层级表格；展开、半选及键盘树导航由 SPA 提供，服务端负责裁剪和校验' },
  { name: 'SensitiveDataMask', uiComponent: 'SensitiveDataMask.svelte', liteComponent: 'LiteSensitiveDataMask.svelte', category: 'advanced', status: 'exact', strategy: '服务端掩码字符展示' },
  { name: 'ApprovalActionCard', uiComponent: 'ApprovalActionCard.svelte', liteComponent: 'LiteApprovalActionCard.svelte', category: 'advanced', status: 'exact', strategy: '原生审批 POST 表单与意见输入' },
  { name: 'StepForm', uiComponent: 'StepForm.svelte', liteComponent: 'LiteStepForm.svelte', category: 'advanced', status: 'exact', strategy: '分步向导与原生 POST 步骤表单' },
  { name: 'TableSummary', uiComponent: 'TableSummary.svelte', liteComponent: 'LiteTableSummary.svelte', category: 'advanced', status: 'exact', strategy: '表格底部统计聚合行' },
  { name: 'VersionDiffViewer', uiComponent: 'VersionDiffViewer.svelte', liteComponent: 'LiteVersionDiffViewer.svelte', category: 'advanced', status: 'exact', strategy: '版本字段变更对比表格' },
  { name: 'EditableTable', uiComponent: 'EditableTable.svelte', liteComponent: 'LiteEditableTable.svelte', category: 'advanced', status: 'exact', strategy: '行内与单元格批量编辑表格表单' },
  { name: 'DraggableRowTable', uiComponent: 'DraggableRowTable.svelte', liteComponent: 'LiteDraggableRowTable.svelte', category: 'advanced', status: 'exact', strategy: '行顺序数值表单与上下移动' },
  { name: 'SplitPaneLayout', uiComponent: 'SplitPaneLayout.svelte', liteComponent: 'LiteSplitPaneLayout.svelte', category: 'layout', status: 'exact', strategy: '双栏弹性比例分屏布局' },
  { name: 'MasterDetailView', uiComponent: 'MasterDetailView.svelte', liteComponent: 'LiteMasterDetailView.svelte', category: 'pages', status: 'exact', strategy: '主从数据联动视图与 URL 同步' },
  { name: 'MediaLibraryModal', uiComponent: 'MediaLibraryModal.svelte', liteComponent: 'LiteMediaLibraryModal.svelte', category: 'advanced', status: 'exact', strategy: '媒体库文件选择与上传表单' },
  { name: 'ImageCropper', uiComponent: 'ImageCropper.svelte', liteComponent: 'LiteImageCropper.svelte', category: 'fields', status: 'exact', strategy: '图片缩放与裁剪参数表单' },
  { name: 'ActivityFeed', uiComponent: 'ActivityFeed.svelte', liteComponent: 'LiteActivityFeed.svelte', category: 'advanced', status: 'exact', strategy: '时间线动态与评论流' },
  { name: 'PresenceAvatarGroup', uiComponent: 'PresenceAvatarGroup.svelte', liteComponent: 'LitePresenceAvatarGroup.svelte', category: 'widgets', status: 'exact', strategy: '多人在线协同感知状态' },
  { name: 'PrintableBill', uiComponent: 'PrintableBill.svelte', liteComponent: 'LitePrintableBill.svelte', category: 'pages', status: 'exact', strategy: '受控单据凭证 A4 打印排版' },
  { name: 'JsonSchemaForm', uiComponent: 'JsonSchemaForm.svelte', liteComponent: 'LiteJsonSchemaForm.svelte', category: 'fields', status: 'exact', strategy: 'JSON Schema 动态表单生成' },
  { name: 'MentionsInput', uiComponent: 'MentionsInput.svelte', liteComponent: 'LiteMentionsInput.svelte', category: 'fields', status: 'exact', strategy: '@与#智能提及输入框' },
  { name: 'KanbanBoard', uiComponent: 'KanbanBoard.svelte', liteComponent: 'LiteKanbanBoard.svelte', category: 'advanced', status: 'fallback', strategy: 'SPA 受控权限、乐观预览与回执回滚；Lite 仅提供原生新增表单，不提供客户端移动与回滚' },
  { name: 'PivotTable', uiComponent: 'PivotTable.svelte', liteComponent: 'LitePivotTable.svelte', category: 'advanced', status: 'fallback', strategy: '共享有界聚合与类型化维度；Lite 原生链接重试、导出和安全钻取链接，SPA 支持回调钻取；不含服务端全量分析引擎' },
  { name: 'MultiTabKeepAlive', uiComponent: 'MultiTabKeepAlive.svelte', liteComponent: 'LiteMultiTabKeepAlive.svelte', category: 'layout', status: 'exact', strategy: '工作台多标签页导航' },
  { name: 'GanttChart', uiComponent: 'GanttChart.svelte', liteComponent: 'LiteGanttChart.svelte', category: 'widgets', status: 'fallback', strategy: '共享有界时间线校验；Lite 原生表格与链接恢复，SPA 交互选择与回调，不含依赖/工作日历/自动排程引擎' },
  { name: 'CanvasAnnotation', uiComponent: 'CanvasAnnotation.svelte', liteComponent: 'LiteCanvasAnnotation.svelte', category: 'advanced', status: 'exact', strategy: '底图展示与交互式标注画板' },
  { name: 'SignaturePad', uiComponent: 'SignaturePad.svelte', liteComponent: 'LiteSignaturePad.svelte', category: 'fields', status: 'fallback', strategy: 'SSR 承接已签署图片的上传与预览；canvas 手写板由 SPA 承接' },
  { name: 'PdfDocumentViewer', uiComponent: 'PdfDocumentViewer.svelte', liteComponent: 'LitePdfDocumentViewer.svelte', category: 'pages', status: 'exact', strategy: '嵌入式 PDF 文档与电子盖章批注' },
  { name: 'SpreadsheetView', uiComponent: 'SpreadsheetView.svelte', liteComponent: 'LiteSpreadsheetView.svelte', category: 'advanced', status: 'fallback', strategy: '有界原生单表 POST，提交 sheetId 与原始公式；计算、切表及导出由服务端承接，无客户端公式引擎' },
  { name: 'DecisionTable', uiComponent: 'DecisionTable.svelte', liteComponent: 'LiteDecisionTable.svelte', category: 'advanced', status: 'exact', strategy: '业务决策表与规则执行矩阵' },
  { name: 'OfflineSyncBanner', uiComponent: 'OfflineSyncBanner.svelte', liteComponent: 'LiteOfflineSyncBanner.svelte', category: 'widgets', status: 'exact', strategy: '离线状态感知与变更队列同步栏' },

  // ─── Modern UI surfaces added after the original parity inventory ───────
  { name: 'Image', uiComponent: 'Image.svelte', liteComponent: 'LiteImage.svelte', category: 'widgets', status: 'fallback', strategy: '原生 img、链接与无图占位；图片加载失败回退由服务端或浏览器承接' },
  { name: 'ImagePreview', uiComponent: 'ImagePreview.svelte', liteComponent: 'LiteImagePreview.svelte', category: 'widgets', status: 'fallback', strategy: '静态缩略图与下载链接；缩放、旋转和弹窗由 SPA 提供' },
  { name: 'VideoPlayer', uiComponent: 'VideoPlayer.svelte', liteComponent: 'LiteVideoPlayer.svelte', category: 'widgets', status: 'fallback', strategy: '原生 video/audio controls、字幕轨与下载链接；不加载 Vidstack 客户端播放器' },
  { name: 'QRCode', uiComponent: 'QRCode.svelte', liteComponent: 'LiteQRCode.svelte', category: 'widgets', status: 'exact', strategy: '服务端 SVG 二维码，与 UI 共用 qrcode 编码器' },
  { name: 'Calendar', uiComponent: 'Calendar.svelte', liteComponent: 'LiteCalendar.svelte', category: 'widgets', status: 'fallback', strategy: '服务端月份快照、日期链接与事件列表；无客户端月切换' },
  { name: 'Carousel', uiComponent: 'Carousel.svelte', liteComponent: 'LiteCarousel.svelte', category: 'widgets', status: 'fallback', strategy: '横向滚动与锚点分段；自动播放和手势由 SPA 承接' },
  { name: 'Anchor', uiComponent: 'Anchor.svelte', liteComponent: 'LiteAnchor.svelte', category: 'layout', status: 'exact', strategy: '语义化页内锚点导航' },
  { name: 'Affix', uiComponent: 'Affix.svelte', liteComponent: 'LiteAffix.svelte', category: 'layout', status: 'fallback', strategy: 'CSS position: sticky 固定；滚动监听状态样式由 SPA 承接' },
  { name: 'Collapse', uiComponent: 'Collapse.svelte', liteComponent: 'LiteCollapse.svelte', category: 'layout', status: 'fallback', strategy: '原生 details/summary 展开面板；手风琴状态由宿主承接' },
  { name: 'CommentThread', uiComponent: 'CommentThread.svelte', liteComponent: 'LiteCommentThread.svelte', category: 'advanced', status: 'fallback', strategy: '服务端评论列表、回复与 POST 评论表单；即时提交由宿主承接' },
  { name: 'FloatButton', uiComponent: 'FloatButton.svelte', liteComponent: 'LiteFloatButton.svelte', category: 'layout', status: 'exact', strategy: '固定位置链接或状态按钮' },
  { name: 'Steps', uiComponent: 'Steps.svelte', liteComponent: 'LiteSteps.svelte', category: 'layout', status: 'exact', strategy: '有序步骤与完成/处理中/错误状态' },
  { name: 'Timeline', uiComponent: 'Timeline.svelte', liteComponent: 'LiteTimeline.svelte', category: 'widgets', status: 'exact', strategy: '服务端时间线列表与语义色标记' },
  { name: 'Statistic', uiComponent: 'Statistic.svelte', liteComponent: 'LiteStatistic.svelte', category: 'widgets', status: 'exact', strategy: '服务端数字格式化、前后缀与趋势' },
  { name: 'Countdown', uiComponent: 'Countdown.svelte', liteComponent: 'LiteCountdown.svelte', category: 'widgets', status: 'fallback', strategy: '服务端剩余时间快照与截止时间；实时倒计时由 SPA 承接' },
  { name: 'Tour', uiComponent: 'Tour.svelte', liteComponent: 'LiteTour.svelte', category: 'advanced', status: 'fallback', strategy: '静态引导步骤与关闭链接；目标高亮和定位由 SPA 承接' },
  { name: 'Menu', uiComponent: 'Menu.svelte', liteComponent: 'LiteMenu.svelte', category: 'layout', status: 'exact', strategy: '递归菜单、选中态与徽章，无客户端展开状态' },
  { name: 'Space', uiComponent: 'Space.svelte', liteComponent: 'LiteSpace.svelte', category: 'layout', status: 'exact', strategy: 'Flex 间距容器' },
  { name: 'Grid', uiComponent: 'Grid.svelte', liteComponent: 'LiteGrid.svelte', category: 'layout', status: 'exact', strategy: 'CSS Grid 列布局，窄屏降为单列' },
  { name: 'Link', uiComponent: 'Link.svelte', liteComponent: 'LiteLink.svelte', category: 'layout', status: 'exact', strategy: '原生链接与禁用态' },
  { name: 'PageHeader', uiComponent: 'PageHeader.svelte', liteComponent: 'LitePageHeader.svelte', category: 'layout', status: 'exact', strategy: '标题、说明、eyebrow 与操作区' },
  { name: 'ContentPageHeader', uiComponent: 'ContentPageHeader.svelte', liteComponent: 'LitePageHeader.svelte', category: 'layout', status: 'exact', strategy: '复用 LitePageHeader 的标题与操作插槽' },
  { name: 'StatusBadge', uiComponent: 'StatusBadge.svelte', liteComponent: 'LiteStatusBadge.svelte', category: 'widgets', status: 'exact', strategy: '状态到语义徽章的映射' },
  { name: 'StatusTabs', uiComponent: 'StatusTabs.svelte', liteComponent: 'LiteStatusTabs.svelte', category: 'layout', status: 'exact', strategy: '状态筛选链接与计数徽章' },
  { name: 'NotificationCenter', uiComponent: 'NotificationCenter.svelte', liteComponent: 'LiteNotificationCenter.svelte', category: 'advanced', status: 'fallback', strategy: '服务端通知列表、已读态与全部已读链接；筛选和实时更新由宿主承接' },
  { name: 'OtpInput', uiComponent: 'OtpInput.svelte', liteComponent: 'LiteOtpInput.svelte', category: 'fields', status: 'exact', strategy: '原生一次性验证码输入与长度约束' },
  { name: 'TwoFactorStepper', uiComponent: 'TwoFactorStepper.svelte', liteComponent: 'LiteTwoFactorStepper.svelte', category: 'advanced', status: 'fallback', strategy: '原生两步验证步骤与 POST 表单' },
  { name: 'Popconfirm', uiComponent: 'Popconfirm.svelte', liteComponent: 'LitePopconfirm.svelte', category: 'advanced', status: 'fallback', strategy: 'details 锚点确认面板与原生 POST 表单' },
  { name: 'DetailDrawer', uiComponent: 'DetailDrawer.svelte', liteComponent: 'LiteDetailDrawer.svelte', category: 'advanced', status: 'fallback', strategy: 'details 详情侧栏与关闭链接；焦点圈定由 SPA 承接' },
  { name: 'RowActions', uiComponent: 'RowActions.svelte', liteComponent: 'LiteRowActions.svelte', category: 'advanced', status: 'exact', strategy: '行内链接或原生 POST 动作' },
  { name: 'ItemList', uiComponent: 'ItemList.svelte', liteComponent: 'LiteItemList.svelte', category: 'widgets', status: 'exact', strategy: '语义列表、说明与右侧元信息' },
  { name: 'BackTop', uiComponent: 'BackTop.svelte', liteComponent: 'LiteBackTop.svelte', category: 'layout', status: 'exact', strategy: '固定回顶锚点' },
  { name: 'ResizeBox', uiComponent: 'ResizeBox.svelte', liteComponent: 'LiteResizeBox.svelte', category: 'layout', status: 'fallback', strategy: 'CSS resize 容器；尺寸持久化由宿主承接' },
  { name: 'AutoComplete', uiComponent: 'AutoComplete.svelte', liteComponent: 'LiteAutoComplete.svelte', category: 'fields', status: 'fallback', strategy: '原生 input + datalist 建议；异步查询和键盘弹层由 SPA 承接' },
  { name: 'Result', uiComponent: 'Result.svelte', liteComponent: 'LiteResult.svelte', category: 'advanced', status: 'exact', strategy: '成功、失败、警告与异常状态页' },
  { name: 'Skeleton', uiComponent: 'Skeleton.svelte', liteComponent: 'LiteSkeleton.svelte', category: 'widgets', status: 'exact', strategy: '静态占位骨架与加载语义' },
  { name: 'PageSkeleton', uiComponent: 'PageSkeleton.svelte', liteComponent: 'LiteSkeleton.svelte', category: 'pages', status: 'fallback', strategy: '页面级静态骨架' },
  { name: 'Spin', uiComponent: 'Spin.svelte', liteComponent: 'LiteSpin.svelte', category: 'widgets', status: 'exact', strategy: 'CSS 加载指示器与 aria-busy' },
  { name: 'Progress', uiComponent: 'Progress.svelte', liteComponent: 'LiteProgress.svelte', category: 'widgets', status: 'exact', strategy: '原生 progress 与语义色' },
  { name: 'Tree', uiComponent: 'Tree.svelte', liteComponent: 'LiteTree.svelte', category: 'advanced', status: 'fallback', strategy: 'details 层级树与链接/选中态；展开、复选和键盘树导航由 SPA 承接' },
  { name: 'MediaThumbnail', uiComponent: 'MediaThumbnail.svelte', liteComponent: 'LiteMediaThumbnail.svelte', category: 'widgets', status: 'exact', strategy: '媒体缩略图与访问性标签' },
  { name: 'ListPagination', uiComponent: 'ListPagination.svelte', liteComponent: 'LitePagination.svelte', category: 'pages', status: 'exact', strategy: 'URL 驱动分页；页码窗口由服务端输出' },
  { name: 'Pagination', uiComponent: 'Pagination.svelte', liteComponent: 'LitePagination.svelte', category: 'layout', status: 'exact', strategy: '原生分页链接与当前页' },
  { name: 'LiveIndicator', uiComponent: 'LiveIndicator.svelte', liteComponent: 'LiteRealtimeStatus.svelte', category: 'widgets', status: 'fallback', strategy: '服务端快照时间与刷新回退' },
  { name: 'AreaChart', uiComponent: 'AreaChart.svelte', liteComponent: 'LiteAreaChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'ScatterChart', uiComponent: 'ScatterChart.svelte', liteComponent: 'LiteScatterChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'RadarChart', uiComponent: 'RadarChart.svelte', liteComponent: 'LiteRadarChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'GaugeChart', uiComponent: 'GaugeChart.svelte', liteComponent: 'LiteGaugeChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'FunnelChart', uiComponent: 'FunnelChart.svelte', liteComponent: 'LiteFunnelChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'HeatmapChart', uiComponent: 'HeatmapChart.svelte', liteComponent: 'LiteHeatmapChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'WaterfallChart', uiComponent: 'WaterfallChart.svelte', liteComponent: 'LiteWaterfallChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'RoseChart', uiComponent: 'RoseChart.svelte', liteComponent: 'LiteRoseChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'DonutChart', uiComponent: 'DonutChart.svelte', liteComponent: 'LiteDonutChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },

  // ─── SPA Only (No SSR counterpart needed) ───────────────────────────────
  { name: 'ThemeToggle', uiComponent: 'ThemeToggle.svelte', category: 'layout', status: 'spa_only', strategy: '免适配 (Lite 为固定 Slate/Indigo 配色)', note: 'IE11 不支持 CSS 变量与客户端主题即时切换' },
  { name: 'DevTools', uiComponent: 'DevTools.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (SPA 调试器)', note: '受限环境不需要客户端 DevTools 悬浮球' },
];

export function parityOutputPaths(repositoryRoot = resolve(import.meta.dir, '..')): {
  markdownPath: string;
  jsonPath: string;
} {
  return {
    markdownPath: resolve(repositoryRoot, 'packages/lite/PARITY.md'),
    jsonPath: resolve(repositoryRoot, 'packages/lite/parity.json'),
  };
}

function rate(part: number, total: number): number {
  return total === 0 ? 0 : Number(((part / total) * 100).toFixed(1));
}

/** Map a parity target path (for example `widgets/LiteChartTable.svelte`) to its file name. */
function liteComponentFile(liteComponent: string): string {
  return liteComponent.split('/').at(-1) ?? liteComponent;
}

function listFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

/** Assertions per imported component a test file must reach to count as behavior proof. */
const ASSERTION_BUDGET_PER_COMPONENT = 2;

/**
 * Scan `*.test.svelte.ts` files and attribute an assertion budget to every Lite
 * component they import. Budget = `expect()` calls in the file divided by the
 * number of Lite components the file imports, so a file that imports twenty
 * components but asserts twice cannot claim twenty verified behaviors.
 */
export function collectBehaviorAssertionBudgets(
  repositoryRoot = resolve(import.meta.dir, '..'),
): Map<string, number> {
  const testFiles = listFiles(resolve(repositoryRoot, 'packages/lite/src')).filter((file) =>
    /\.test\.svelte\.ts$/u.test(file),
  );
  const budgets = new Map<string, number>();
  for (const file of testFiles) {
    const source = readFileSync(file, 'utf8');
    const components = new Set<string>();
    for (const match of source.matchAll(/['"]([^'"]*\b(Lite[A-Za-z0-9]+\.svelte))['"]/gu)) {
      const componentFile = match[2];
      if (componentFile) components.add(componentFile);
    }
    if (components.size === 0) continue;
    const assertions = source.match(/\bexpect\(/gu)?.length ?? 0;
    const budget = Math.floor(assertions / components.size);
    for (const componentFile of components) {
      budgets.set(componentFile, Math.max(budgets.get(componentFile) ?? 0, budget));
    }
  }
  return budgets;
}

/** Components that any behavior test imports, regardless of assertion density. */
export function collectBehaviorTestedComponents(
  repositoryRoot = resolve(import.meta.dir, '..'),
): Set<string> {
  return new Set(collectBehaviorAssertionBudgets(repositoryRoot).keys());
}

export function buildParityReport(): ParityReport {
  const categories: Record<string, ParityCategorySummary> = {};

  for (const item of PARITY_ITEMS) {
    if (!categories[item.category]) {
      categories[item.category] = {
        category: item.category,
        total: 0,
        adapted: 0,
        fallback: 0,
        spaOnly: 0,
        missing: 0,
        percentage: 0,
        exactRate: 0,
        fallbackRate: 0,
        behaviorVerified: 0,
        behaviorAsserted: 0,
      };
    }
    const cat = categories[item.category];
    cat.total += 1;
    if (item.status === 'exact') cat.adapted += 1;
    else if (item.status === 'fallback') cat.fallback += 1;
    else if (item.status === 'spa_only') cat.spaOnly += 1;
    else cat.missing += 1;
  }

  for (const cat of Object.values(categories)) {
    const covered = cat.adapted + cat.fallback + cat.spaOnly;
    cat.percentage = rate(covered, cat.total);
    cat.exactRate = rate(cat.adapted, cat.total);
    cat.fallbackRate = rate(cat.fallback, cat.total);
  }

  const total = PARITY_ITEMS.length;
  const exactCount = PARITY_ITEMS.filter((i) => i.status === 'exact').length;
  const fallbackCount = PARITY_ITEMS.filter((i) => i.status === 'fallback').length;
  const spaOnlyCount = PARITY_ITEMS.filter((i) => i.status === 'spa_only').length;
  const missingCount = PARITY_ITEMS.filter((i) => i.status === 'missing').length;
  const overallCoverage = rate(exactCount + fallbackCount + spaOnlyCount, total);

  const assertionBudgets = collectBehaviorAssertionBudgets();
  const budget = (liteComponent?: string): number =>
    liteComponent ? assertionBudgets.get(liteComponentFile(liteComponent)) ?? 0 : 0;
  const behaviorVerifiedCount = PARITY_ITEMS.filter((item) => budget(item.liteComponent) >= 1).length;
  const behaviorAssertedCount = PARITY_ITEMS.filter(
    (item) => budget(item.liteComponent) >= ASSERTION_BUDGET_PER_COMPONENT,
  ).length;
  for (const item of PARITY_ITEMS) {
    const itemBudget = budget(item.liteComponent);
    if (itemBudget >= 1) categories[item.category].behaviorVerified += 1;
    if (itemBudget >= ASSERTION_BUDGET_PER_COMPONENT) categories[item.category].behaviorAsserted += 1;
  }

  return {
    timestamp: new Date().toISOString(),
    totalComponents: total,
    adaptedCount: exactCount,
    fallbackCount: fallbackCount,
    spaOnlyCount: spaOnlyCount,
    missingCount: missingCount,
    overallCoveragePercentage: overallCoverage,
    exactPercentage: rate(exactCount, total),
    fallbackPercentage: rate(fallbackCount, total),
    behaviorVerifiedCount,
    behaviorVerifiedPercentage: rate(behaviorVerifiedCount, total),
    behaviorAssertedCount,
    behaviorAssertedPercentage: rate(behaviorAssertedCount, total),
    categories,
    items: PARITY_ITEMS,
  };
}

export function generateMarkdownReport(report: ParityReport): string {
  const statusEmoji: Record<ParityStatus, string> = {
    exact: '✅ 1:1 对齐',
    fallback: '⚡ 语义降级',
    spa_only: '🚫 免适配',
    missing: '⏳ 待补齐',
  };

  let md = `# @svadmin/ui ↔ @svadmin/lite 组件对齐矩阵

> 自动生成时间：\`${report.timestamp}\`
> 清单映射覆盖率：**${report.overallCoveragePercentage}%**（${report.adaptedCount + report.fallbackCount + report.spaOnlyCount}/${report.totalComponents} 组件）
> 1:1 对齐率 (Exact)：**${report.exactPercentage}%**（${report.adaptedCount}）· 语义降级率 (Fallback)：**${report.fallbackPercentage}%**（${report.fallbackCount}）
> 行为验证覆盖：**${report.behaviorAssertedPercentage}%**（${report.behaviorAssertedCount}/${report.totalComponents} 映射组件具备断言预算）· 仅被引用：${report.behaviorVerifiedCount - report.behaviorAssertedCount}
>
> 映射覆盖率包含语义降级与免适配，不能单独作为发布口径。推进目标看后两项：1:1 对齐率与行为断言覆盖。
> 行为断言覆盖按"测试文件断言数 ÷ 该文件引入的 Lite 组件数 ≥ ${ASSERTION_BUDGET_PER_COMPONENT}"估算，是文件级预算，不等价于逐组件深度验收。

## 进度总览

| 模块分类 | 组件总数 | 1:1 对齐 (Exact) | 语义降级 (Fallback) | 免适配 (SPA Only) | 待补齐 (Missing) | 1:1 对齐率 | 行为断言 | 仅引用 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

  for (const [name, cat] of Object.entries(report.categories)) {
    md += `| **${name}** | ${cat.total} | ${cat.adapted} | ${cat.fallback} | ${cat.spaOnly} | ${cat.missing} | **${cat.exactRate}%** | ${cat.behaviorAsserted}/${cat.total} | ${cat.behaviorVerified - cat.behaviorAsserted} |\n`;
  }

  md += `\n---\n\n## 判定标准\n\n`;
  for (const rule of CLASSIFICATION_CRITERIA_SUMMARY) {
    md += `- ${rule}\n`;
  }
  md += `\n---\n\n## 详细对齐清单\n\n`;

  const categoryNames = Object.keys(report.categories);
  for (const catName of categoryNames) {
    md += `### ${catName.toUpperCase()}\n\n`;
    md += `| UI 组件 (SPA) | Lite 对应组件 (SSR) | 对齐状态 | 降级策略 / 承接方案 |\n`;
    md += `|---|---|:---:|---|\n`;

    const items = report.items.filter((i) => i.category === catName);
    for (const item of items) {
      const liteComp = item.liteComponent ? `\`${item.liteComponent}\`` : '—';
      md += `| \`${item.name}\` | ${liteComp} | ${statusEmoji[item.status]} | ${item.strategy} |\n`;
    }
    md += '\n';
  }

  return md;
}

export function printCliDashboard(report: ParityReport): void {
  console.info('\n===============================================================');
  console.info('       @svadmin/ui ↔ @svadmin/lite 组件对齐进度看板');
  console.info('===============================================================');

  for (const [name, cat] of Object.entries(report.categories)) {
    const barWidth = 14;
    const filled = Math.round((cat.percentage / 100) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, barWidth - filled));
    const padName = `[${name}]`.padEnd(14, ' ');
    const countStr = `${cat.adapted + cat.fallback + cat.spaOnly}/${cat.total}`.padStart(6, ' ');
    console.info(`  ${padName} ${countStr} (${cat.percentage.toFixed(1).padStart(5, ' ')}%)  [${bar}]`);
  }

  console.info('---------------------------------------------------------------');
  console.info(`  清单映射覆盖率: ${report.overallCoveragePercentage}% (${report.adaptedCount + report.fallbackCount + report.spaOnlyCount}/${report.totalComponents})`);
  console.info(`  - 1:1 对齐: ${report.adaptedCount} (${report.exactPercentage}%)`);
  console.info(`  - 语义降级: ${report.fallbackCount} (${report.fallbackPercentage}%)`);
  console.info(`  - 免适配(SPA): ${report.spaOnlyCount}`);
  console.info(`  - 待补齐: ${report.missingCount}`);
  console.info(`  行为断言覆盖: ${report.behaviorAssertedCount}/${report.totalComponents} (${report.behaviorAssertedPercentage}%)`);
  console.info(`  仅被测试引用: ${report.behaviorVerifiedCount - report.behaviorAssertedCount} (无足够断言预算)`);
  console.info('===============================================================\n');
}

/**
 * Detect artifacts that no longer match the generator output. Timestamps are
 * normalized away so a stale matrix is reported for content reasons only.
 */
export function parityArtifactDrift(
  repositoryRoot = resolve(import.meta.dir, '..'),
): string[] {
  const report = buildParityReport();
  const { markdownPath, jsonPath } = parityOutputPaths(repositoryRoot);
  const drift: string[] = [];

  const stripMarkdownTimestamp = (value: string): string =>
    value.replace(/^> .*自动生成时间[^\n]*$/mu, '> <timestamp>').trimEnd();
  const stripJsonTimestamp = (value: string): string => {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    delete parsed['timestamp'];
    return JSON.stringify(parsed);
  };

  const expectedMarkdown = stripMarkdownTimestamp(generateMarkdownReport(report));
  const expectedJson = stripJsonTimestamp(JSON.stringify(report));
  const expected: Array<[string, string, (value: string) => string]> = [
    [markdownPath, expectedMarkdown, stripMarkdownTimestamp],
    [jsonPath, expectedJson, stripJsonTimestamp],
  ];

  for (const [path, expectedValue, normalize] of expected) {
    if (!existsSync(path)) {
      drift.push(`${path} (missing)`);
      continue;
    }
    let current: string;
    try {
      current = normalize(readFileSync(path, 'utf8'));
    } catch {
      drift.push(`${path} (unparsable)`);
      continue;
    }
    if (current !== expectedValue) drift.push(`${path} (out of date)`);
  }
  return drift;
}

// ─── Main Execution ──────────────────────────────────────────────────────────
if (import.meta.main) {
  const report = buildParityReport();
  const isWrite = process.argv.includes('--write');
  const isJson = process.argv.includes('--json');
  const isCheck = process.argv.includes('--check');

  if (isJson) {
    console.info(JSON.stringify(report, null, 2));
  } else {
    printCliDashboard(report);
  }

  if (isWrite) {
    const mdContent = generateMarkdownReport(report);
    const { markdownPath: mdPath, jsonPath } = parityOutputPaths();
    writeFileSync(mdPath, `${mdContent.trimEnd()}\n`, 'utf8');
    writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
    console.info(`[OK] Generated ${mdPath} and ${jsonPath}`);
  }

  if (isCheck && report.missingCount > 0) {
    console.error(`[FAIL] Found ${report.missingCount} missing component mappings!`);
    process.exit(1);
  }

  if (isCheck) {
    const drift = parityArtifactDrift();
    if (drift.length > 0) {
      console.error('[FAIL] Parity artifacts are out of date:');
      for (const entry of drift) console.error(`  - ${entry}`);
      console.error('Run `bun run check:parity` and commit the regenerated artifacts.');
      process.exit(1);
    }
    console.info('[OK] Parity artifacts match the generator output.');
  }
}
