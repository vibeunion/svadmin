/**
 * scripts/check-parity.ts
 *
 * Scans @svadmin/ui and @svadmin/lite components to compute parity metrics,
 * generate packages/lite/PARITY.md and packages/lite/parity.json,
 * and provide an executable CLI dashboard.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ECOSYSTEM_MATRIX_END,
  ECOSYSTEM_MATRIX_START,
  ecosystemDrift,
  renderEcosystemSection,
} from './ecosystem-parity';

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
  { name: 'ErrorSummary', uiComponent: 'ErrorSummary.svelte', liteComponent: 'LiteErrorSummary.svelte', category: 'advanced', status: 'exact', strategy: '错误汇总区域、字段锚点跳转与可访问标题，错误映射由服务端返回' },
  { name: 'ResourceOperationsPage', uiComponent: 'ResourceOperationsPage.svelte', liteComponent: 'pages/LiteListPage.svelte', category: 'pages', status: 'fallback', strategy: 'Lite 组合原生列表、操作链接和服务端表单，不提供 SPA 抽屉状态' },
  { name: 'RecordDetailDrawer', uiComponent: 'RecordDetailDrawer.svelte', liteComponent: 'pages/LiteShowPage.svelte', category: 'pages', status: 'fallback', strategy: 'Lite 使用独立详情页；宿主通过链接保留资源和记录上下文' },
  { name: 'DashboardView', uiComponent: 'DashboardView.svelte', liteComponent: 'LiteMetricStrip.svelte', category: 'widgets', status: 'fallback', strategy: 'Lite 使用服务端指标条和原生链接；查询、聚合和权限由宿主承接' },
  { name: 'ApprovalCenter', uiComponent: 'ApprovalCenter.svelte', liteComponent: 'LiteApprovalActionCard.svelte', category: 'advanced', status: 'fallback', strategy: '单条审批卡片：状态、意见与 approve/reject 原生 POST；审批列表、历史、动态允许动作与事务由宿主承接' },
  { name: 'PivotExportButton', uiComponent: 'PivotExportButton.svelte', liteComponent: 'LitePivotTable.svelte', category: 'advanced', status: 'fallback', strategy: 'Lite 使用服务端导出链接；任务回执和下载授权由宿主承接' },
  { name: 'RelationPicker', uiComponent: 'RelationPicker.svelte', liteComponent: 'fields/LiteRelationField.svelte', category: 'fields', status: 'fallback', strategy: 'Lite 使用原生关联选择或详情链接；服务端负责查询和授权' },
  { name: 'FilterCollectionInput', uiComponent: 'FilterCollectionInput.svelte', liteComponent: 'LiteFilterBuilder.svelte', category: 'advanced', status: 'fallback', strategy: 'Lite 使用原生筛选表单；完整递归交互由服务端回显承接' },
  { name: 'SegmentedControl', uiComponent: 'SegmentedControl.svelte', liteComponent: 'LiteTabs.svelte', category: 'layout', status: 'exact', strategy: 'URL 驱动的分段选择链接：当前项 aria-current、可访问分组名称与禁用项不可激活' },
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
  { name: 'MarkdownField', uiComponent: 'MarkdownField.svelte', liteComponent: 'LiteMarkdownField.svelte', category: 'fields', status: 'exact', strategy: '原生 Textarea 编辑 + 服务端渲染 Markdown 预览（标题/列表/引用/代码/强调/安全链接）；工具栏与分屏属客户端增强' },
  { name: 'RichTextField', uiComponent: 'RichTextField.svelte', liteComponent: 'LiteRichTextField.svelte', category: 'fields', status: 'fallback', strategy: '服务端白名单渲染只读富文本 + Textarea 编辑源码；WYSIWYG 工具栏与所见即所得编辑由 SPA 承接' },
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
  { name: 'AutoSaveIndicator', uiComponent: 'AutoSaveIndicator.svelte', liteComponent: 'advanced/LiteAutoSaveIndicator.svelte', category: 'advanced', status: 'exact', strategy: '保存状态四态（idle/loading/success/error）、error 详情与 role=status/aria-live 语义' },
  { name: 'Toast', uiComponent: 'Toast.svelte', liteComponent: 'advanced/LiteToast.svelte', category: 'advanced', status: 'fallback', strategy: '降级为页面顶部 Alert 通知条' },
  { name: 'UndoableNotification', uiComponent: 'UndoableNotification.svelte', liteComponent: 'advanced/LiteUndoableNotification.svelte', category: 'advanced', status: 'fallback', strategy: '通知消息与撤销链接；到期结果、托管边界与动画由宿主承接' },
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
  { name: 'PresenceAvatarGroup', uiComponent: 'PresenceAvatarGroup.svelte', liteComponent: 'LitePresenceAvatarGroup.svelte', category: 'widgets', status: 'exact', strategy: '服务端头像栈、在线/编辑/空闲状态、+N 溢出与可选头像；点击回调由 SPA 承接' },
  { name: 'PrintableBill', uiComponent: 'PrintableBill.svelte', liteComponent: 'LitePrintableBill.svelte', category: 'pages', status: 'exact', strategy: '受控单据凭证 A4 打印排版' },
  { name: 'JsonSchemaForm', uiComponent: 'JsonSchemaForm.svelte', liteComponent: 'LiteJsonSchemaForm.svelte', category: 'fields', status: 'exact', strategy: 'JSON Schema 动态表单生成' },
  { name: 'MentionsInput', uiComponent: 'MentionsInput.svelte', liteComponent: 'LiteMentionsInput.svelte', category: 'fields', status: 'exact', strategy: '@与#智能提及输入框' },
  { name: 'KanbanBoard', uiComponent: 'KanbanBoard.svelte', liteComponent: 'LiteKanbanBoard.svelte', category: 'advanced', status: 'fallback', strategy: 'SPA 受控权限、乐观预览与回执回滚；Lite 仅提供原生新增表单，不提供客户端移动与回滚' },
  { name: 'PivotTable', uiComponent: 'PivotTable.svelte', liteComponent: 'LitePivotTable.svelte', category: 'advanced', status: 'fallback', strategy: '共享有界聚合与类型化维度；Lite 原生链接重试、导出和安全钻取链接，SPA 支持回调钻取；不含服务端全量分析引擎' },
  { name: 'MultiTabKeepAlive', uiComponent: 'MultiTabKeepAlive.svelte', liteComponent: 'LiteMultiTabKeepAlive.svelte', category: 'layout', status: 'exact', strategy: '工作台多标签页导航' },
  { name: 'GanttChart', uiComponent: 'GanttChart.svelte', liteComponent: 'LiteGanttChart.svelte', category: 'widgets', status: 'fallback', strategy: '共享有界时间线校验；Lite 原生表格与链接恢复，SPA 交互选择与回调，不含依赖/工作日历/自动排程引擎' },
  { name: 'CanvasAnnotation', uiComponent: 'CanvasAnnotation.svelte', liteComponent: 'LiteCanvasAnnotation.svelte', category: 'advanced', status: 'exact', strategy: '底图展示与交互式标注画板' },
  { name: 'SignaturePad', uiComponent: 'SignaturePad.svelte', liteComponent: 'LiteSignaturePad.svelte', category: 'fields', status: 'fallback', strategy: 'SSR 承接已签署图片的上传、替换与预览；canvas 手写、撤销、清空及 PNG/SVG 导出由 SPA 承接' },
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
  { name: 'Carousel', uiComponent: 'Carousel.svelte', liteComponent: 'LiteCarousel.svelte', category: 'widgets', status: 'exact', strategy: 'CSS scroll-snap 轮播：当前幻灯片由 index 服务端标记（data-current/aria-current），编号链接用于切换；自动播放与手势由宿主承接' },
  { name: 'Anchor', uiComponent: 'Anchor.svelte', liteComponent: 'LiteAnchor.svelte', category: 'layout', status: 'exact', strategy: '语义化页内锚点导航' },
  { name: 'Affix', uiComponent: 'Affix.svelte', liteComponent: 'LiteAffix.svelte', category: 'layout', status: 'exact', strategy: 'CSS position: sticky 容器，保留 top/bottom 偏移与层级；吸顶阴影观察由宿主承接' },
  { name: 'Collapse', uiComponent: 'Collapse.svelte', liteComponent: 'LiteCollapse.svelte', category: 'layout', status: 'fallback', strategy: '锚点展开的分组面板与初始 open 态；互斥手风琴、懒加载与关闭回调由宿主承接' },
  { name: 'CommentThread', uiComponent: 'CommentThread.svelte', liteComponent: 'LiteCommentThread.svelte', category: 'advanced', status: 'fallback', strategy: '服务端评论列表、回复与 POST 评论表单；即时提交由宿主承接' },
  { name: 'FloatButton', uiComponent: 'FloatButton.svelte', liteComponent: 'LiteFloatButton.svelte', category: 'layout', status: 'exact', strategy: '固定位置链接或状态按钮' },
  { name: 'Steps', uiComponent: 'Steps.svelte', liteComponent: 'LiteSteps.svelte', category: 'layout', status: 'exact', strategy: '有序步骤与完成/处理中/错误状态' },
  { name: 'Timeline', uiComponent: 'Timeline.svelte', liteComponent: 'LiteTimeline.svelte', category: 'widgets', status: 'exact', strategy: '服务端时间线列表与语义色标记' },
  { name: 'Statistic', uiComponent: 'Statistic.svelte', liteComponent: 'LiteStatistic.svelte', category: 'widgets', status: 'exact', strategy: '服务端数字格式化、前后缀与趋势' },
  { name: 'Countdown', uiComponent: 'Countdown.svelte', liteComponent: 'LiteCountdown.svelte', category: 'widgets', status: 'fallback', strategy: '服务端剩余时间快照与截止时间；实时倒计时由 SPA 承接' },
  { name: 'Tour', uiComponent: 'Tour.svelte', liteComponent: 'LiteTour.svelte', category: 'advanced', status: 'fallback', strategy: '静态引导步骤、当前步骤与关闭链接；target/placement 定位、聚光灯、完成记忆由 SPA 承接' },
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
  { name: 'TwoFactorStepper', uiComponent: 'TwoFactorStepper.svelte', liteComponent: 'LiteTwoFactorStepper.svelte', category: 'advanced', status: 'exact', strategy: '服务端有序步骤，保留自定义步骤、当前索引与列表 class；附原生验证码提交表单' },
  { name: 'Popconfirm', uiComponent: 'Popconfirm.svelte', liteComponent: 'LitePopconfirm.svelte', category: 'advanced', status: 'exact', strategy: '锚点确认面板（dialog 语义）与原生 POST 表单/链接的确认与取消' },
  { name: 'DetailDrawer', uiComponent: 'DetailDrawer.svelte', liteComponent: 'LiteDetailDrawer.svelte', category: 'advanced', status: 'exact', strategy: '锚点驱动的详情侧栏与关闭链接，缺省闭合不影响页面其余内容' },
  { name: 'RowActions', uiComponent: 'RowActions.svelte', liteComponent: 'LiteRowActions.svelte', category: 'advanced', status: 'exact', strategy: '行内链接或原生 POST 动作' },
  { name: 'ItemList', uiComponent: 'ItemList.svelte', liteComponent: 'LiteItemList.svelte', category: 'widgets', status: 'exact', strategy: '语义列表、说明与右侧元信息' },
  { name: 'BackTop', uiComponent: 'BackTop.svelte', liteComponent: 'LiteBackTop.svelte', category: 'layout', status: 'exact', strategy: '固定回顶锚点' },
  { name: 'ResizeBox', uiComponent: 'ResizeBox.svelte', liteComponent: 'LiteResizeBox.svelte', category: 'layout', status: 'fallback', strategy: 'CSS resize 容器；尺寸持久化由宿主承接' },
  { name: 'AutoComplete', uiComponent: 'AutoComplete.svelte', liteComponent: 'LiteAutoComplete.svelte', category: 'fields', status: 'fallback', strategy: '原生 input + datalist 建议；异步查询和键盘弹层由 SPA 承接' },
  { name: 'Result', uiComponent: 'Result.svelte', liteComponent: 'LiteResult.svelte', category: 'advanced', status: 'exact', strategy: '成功、失败、警告与异常状态页' },
  { name: 'Skeleton', uiComponent: 'ui/skeleton/skeleton.svelte', liteComponent: 'LiteSkeleton.svelte', category: 'widgets', status: 'exact', strategy: '静态占位骨架与加载语义' },
  { name: 'PageSkeleton', uiComponent: 'PageSkeleton.svelte', liteComponent: 'LiteSkeleton.svelte', category: 'pages', status: 'exact', strategy: '由 props 决定的页面骨架结构（list/show/form + rows），服务端直接生成' },
  { name: 'Spin', uiComponent: 'Spin.svelte', liteComponent: 'LiteSpin.svelte', category: 'widgets', status: 'exact', strategy: 'CSS 加载指示器与 aria-busy' },
  { name: 'Progress', uiComponent: 'ui/progress/progress.svelte', liteComponent: 'LiteProgress.svelte', category: 'widgets', status: 'exact', strategy: '原生 progress 与语义色' },
  { name: 'Tree', uiComponent: 'Tree.svelte', liteComponent: 'LiteTree.svelte', category: 'advanced', status: 'fallback', strategy: '静态层级树（缩进 + 节点链接/选中态）；展开、复选半选与键盘树导航由 SPA 承接' },
  { name: 'MediaThumbnail', uiComponent: 'MediaThumbnail.svelte', liteComponent: 'LiteMediaThumbnail.svelte', category: 'widgets', status: 'exact', strategy: '媒体缩略图与访问性标签' },
  { name: 'ListPagination', uiComponent: 'ListPagination.svelte', liteComponent: 'LitePagination.svelte', category: 'pages', status: 'exact', strategy: 'URL 驱动分页；页码窗口由服务端输出' },
  { name: 'Pagination', uiComponent: 'ui/pagination/pagination.svelte', liteComponent: 'LitePagination.svelte', category: 'layout', status: 'exact', strategy: '原生分页链接与当前页' },
  { name: 'LiveIndicator', uiComponent: 'LiveIndicator.svelte', liteComponent: 'LiteRealtimeStatus.svelte', category: 'widgets', status: 'exact', strategy: '连接状态徽章（connected/connecting/disconnected）、资源与最近事件详情、可选刷新链接' },
  { name: 'AreaChart', uiComponent: 'AreaChart.svelte', liteComponent: 'LiteAreaChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'ScatterChart', uiComponent: 'ScatterChart.svelte', liteComponent: 'LiteScatterChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'RadarChart', uiComponent: 'RadarChart.svelte', liteComponent: 'LiteRadarChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'GaugeChart', uiComponent: 'GaugeChart.svelte', liteComponent: 'LiteGaugeChart.svelte', category: 'widgets', status: 'fallback', strategy: '服务端渲染当前值、范围、目标与阈值数据表；半圆/速度表弧线、指针与动画由 SPA 承接' },
  { name: 'FunnelChart', uiComponent: 'FunnelChart.svelte', liteComponent: 'LiteFunnelChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'HeatmapChart', uiComponent: 'HeatmapChart.svelte', liteComponent: 'LiteHeatmapChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'WaterfallChart', uiComponent: 'WaterfallChart.svelte', liteComponent: 'LiteWaterfallChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'RoseChart', uiComponent: 'RoseChart.svelte', liteComponent: 'LiteRoseChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },
  { name: 'DonutChart', uiComponent: 'DonutChart.svelte', liteComponent: 'LiteDonutChart.svelte', category: 'widgets', status: 'fallback', strategy: 'SSR 内联 SVG 图形 + 可访问数据表；tooltip/缩放/图例切换等交互由 SPA 承接' },

  // ─── Enterprise surfaces added in the 2026-11 release train ─────────────
  { name: 'AuditLogDrawer', uiComponent: 'AuditLogDrawer.svelte', liteComponent: 'LiteAuditLog.svelte', category: 'advanced', status: 'fallback', strategy: '服务端审计表、分页、操作人/IP 与字段 diff；抽屉、搜索、筛选和加载器由 SPA 承接' },
  { name: 'AuditTimeline', uiComponent: 'content/AuditTimeline.svelte', liteComponent: 'LiteAuditLog.svelte', category: 'advanced', status: 'fallback', strategy: '服务端时间线/表格与字段 diff；动作筛选、搜索与交互式展开由 SPA 承接' },
  { name: 'SafeDeleteConfirm', uiComponent: 'SafeDeleteConfirm.svelte', liteComponent: 'LiteSafeDeleteConfirm.svelte', category: 'advanced', status: 'exact', strategy: '服务端影响清单、输入确认与原生 POST 删除表单；二次点击动画由 SPA 承接' },
  { name: 'SliderCaptcha', uiComponent: 'SliderCaptcha.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (客户端滑动轨迹验证)', note: '服务端不能完成滑块交互，必须使用服务端 rate limit 或等效挑战' },
  { name: 'TrendIndicator', uiComponent: 'TrendIndicator.svelte', liteComponent: 'LiteTrendIndicator.svelte', category: 'widgets', status: 'exact', strategy: '服务端计算涨跌幅、方向、前缀/后缀与反向语义色；无客户端状态' },
  { name: 'MetricGrid', uiComponent: 'MetricGrid.svelte', liteComponent: 'LiteMetricGrid.svelte', category: 'widgets', status: 'fallback', strategy: '服务端网格、标题、加载骨架、空态与指标卡；自定义操作插槽和任意子组件由宿主服务端渲染' },
  { name: 'OrgChart', uiComponent: 'OrgChart.svelte', liteComponent: 'LiteOrgChart.svelte', category: 'widgets', status: 'fallback', strategy: '服务端层级表格与部门/职位信息；节点点击、缩放和图形连线由 SPA 承接' },
  { name: 'CronExpressionBuilder', uiComponent: 'CronExpressionBuilder.svelte', liteComponent: 'LiteCronExpressionBuilder.svelte', category: 'fields', status: 'fallback', strategy: '服务端 cron 文本、预设与原生 POST；可视化分段编辑和实时回显由 SPA 承接' },
  { name: 'VirtualTreeSelect', uiComponent: 'VirtualTreeSelect.svelte', liteComponent: 'LiteVirtualTreeSelect.svelte', category: 'fields', status: 'fallback', strategy: '原生层级 select 保留选项与单选/多选值；虚拟滚动、搜索和异步展开由 SPA 承接' },
  { name: 'ConcurrentConflictModal', uiComponent: 'ConcurrentConflictModal.svelte', liteComponent: 'LiteConcurrentConflictModal.svelte', category: 'advanced', status: 'fallback', strategy: '服务端冲突字段对比与逐字段本地/服务端选择 POST；并发检测、强制覆盖和合并回调由 SPA 承接' },
  { name: 'TaskCenter', uiComponent: 'TaskCenter.svelte', liteComponent: 'LiteTaskCenter.svelte', category: 'advanced', status: 'fallback', strategy: '服务端任务表、进度、错误、下载/重试/取消/清理 POST；轮询、抽屉和实时角标由 SPA 承接' },
  { name: 'MicroAppFrame', uiComponent: 'MicroAppFrame.svelte', liteComponent: 'LiteMicroAppFrame.svelte', category: 'advanced', status: 'fallback', strategy: '服务端 iframe、sandbox/allow/referrerpolicy 与新窗口链接；postMessage、主题同步、自动高度和全屏由 SPA 承接' },
  { name: 'OfflineGuard', uiComponent: 'OfflineGuard.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (客户端网络守卫)', note: 'Lite 继续使用 LiteOfflineSyncBanner 渲染离线状态；提交拦截必须由宿主服务端校验' },
  { name: 'useNetworkStatus', uiComponent: 'useNetworkStatus.svelte.ts', category: 'advanced', status: 'spa_only', strategy: '免适配 (浏览器 Network Information 钩子)', note: 'SSR 不读取 navigator；离线快照由服务端或宿主注入' },

  // ─── Enterprise suites added in late-2026-11 release trains ─────────────
  { name: 'KpiCard', uiComponent: 'KpiCard.svelte', liteComponent: 'LiteKpiCard.svelte', category: 'widgets', status: 'fallback', strategy: '服务端静态指标数值、同环比胶囊、SVG 迷你走势与目标进度条；骨架过渡与动态动画由 SPA 承接' },
  { name: 'JsonViewer', uiComponent: 'JsonViewer.svelte', liteComponent: 'LiteJsonViewer.svelte', category: 'advanced', status: 'fallback', strategy: '服务端 JSON 结构化折叠树与格式化代码块；关键词实时搜索高亮由 SPA 承接' },
  { name: 'ResultPage', uiComponent: 'ResultPage.svelte', liteComponent: 'LiteResultPage.svelte', category: 'pages', status: 'fallback', strategy: '服务端 7 大结果与异常状态语义图标、标题及操作按钮组；微光粒子与动态插槽由 SPA 承接' },
  { name: 'WatermarkContainer', uiComponent: 'WatermarkContainer.svelte', liteComponent: 'LiteWatermarkContainer.svelte', category: 'advanced', status: 'fallback', strategy: '服务端 CSS 重复平铺 SVG 水印背景与文本遮罩；DOM 监听防篡改自愈由 SPA 承接' },
  { name: 'ContextMenu', uiComponent: 'ContextMenu.svelte', liteComponent: 'LiteContextMenu.svelte', category: 'advanced', status: 'fallback', strategy: '服务端语义化操作列表与快捷键提示；视口边缘碰撞自适应翻转由 SPA 承接' },
  { name: 'UnsavedChangesGuard', uiComponent: 'UnsavedChangesGuard.svelte', liteComponent: 'LiteUnsavedChangesGuard.svelte', category: 'advanced', status: 'fallback', strategy: '服务端未保存变更状态横幅与确认表单；浏览器 beforeunload 阻拦由 SPA 承接' },
  { name: 'AnnouncementBanner', uiComponent: 'AnnouncementBanner.svelte', liteComponent: 'LiteAnnouncementBanner.svelte', category: 'advanced', status: 'fallback', strategy: '服务端全站广播通知横幅、语义状态色调与倒计时展示；跑马灯多条轮播由 SPA 承接' },
  { name: 'TextDiffViewer', uiComponent: 'TextDiffViewer.svelte', liteComponent: 'LiteTextDiffViewer.svelte', category: 'advanced', status: 'fallback', strategy: '服务端预渲染文本行差异对比、新增/删除行高亮与行号；动态折叠与双栏切换由 SPA 承接' },
  { name: 'AsyncExportModal', uiComponent: 'AsyncExportModal.svelte', liteComponent: 'LiteAsyncExportModal.svelte', category: 'advanced', status: 'fallback', strategy: '服务端异步导出表单、范围选择、格式单选与列复选框提交；动态进度轮询由 SPA 承接' },
  // ─── Enterprise suites added in late-2026-11 wave 2 ────────────────────
  { name: 'StepWizard', uiComponent: 'StepWizard.svelte', liteComponent: 'LiteStepWizard.svelte', category: 'advanced', status: 'fallback', strategy: '服务端分步向导容器与原生链接步骤跳转；动态分支校验与草稿断点续填由 SPA 承接' },
  { name: 'WorkflowStepper', uiComponent: 'WorkflowStepper.svelte', liteComponent: 'LiteWorkflowStepper.svelte', category: 'advanced', status: 'fallback', strategy: '服务端任务时间线节点与状态徽章展示；单步交互重试由 SPA 承接' },
  { name: 'ColumnVisibilityDrawer', uiComponent: 'ColumnVisibilityDrawer.svelte', liteComponent: 'LiteColumnSettings.svelte', category: 'advanced', status: 'fallback', strategy: '原生多选表单与查询参数列过滤；拖拽排序与本地持久化由 SPA 承接' },
  { name: 'ColumnFilterBuilder', uiComponent: 'ColumnFilterBuilder.svelte', liteComponent: 'LiteFilterBuilder.svelte', category: 'advanced', status: 'exact', strategy: '可视化多条件原生筛选表单与 CRUD 运算符解析' },
  { name: 'KeyboardShortcutsModal', uiComponent: 'KeyboardShortcutsModal.svelte', liteComponent: 'LiteKeyboardShortcutsModal.svelte', category: 'advanced', status: 'fallback', strategy: '服务端静态快捷键分类矩阵展示；全局事件监听与实时检索由 SPA 承接' },
  { name: 'DualApprovalGate', uiComponent: 'DualApprovalGate.svelte', liteComponent: 'LiteDualApprovalGate.svelte', category: 'advanced', status: 'fallback', strategy: '服务端双人复核表单与二次口令验证；二维码动态轮询由 SPA 承接' },
  { name: 'useHotkeys', uiComponent: 'useHotkeys.svelte.ts', category: 'advanced', status: 'spa_only', strategy: '免适配 (浏览器热键监听钩子)', note: 'SSR 不读取 window/keyboard 事件' },
  { name: 'SessionTimeoutGuard', uiComponent: 'SessionTimeoutGuard.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (浏览器会话空闲守卫)', note: 'SSR 不处理 DOM 空闲监听与倒计时' },
  { name: 'useSessionTimeout', uiComponent: 'useSessionTimeout.svelte.ts', category: 'advanced', status: 'spa_only', strategy: '免适配 (浏览器会话空闲钩子)', note: 'SSR 不支持 BroadcastChannel' },
  { name: 'TableClipboardManager', uiComponent: 'TableClipboardManager.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (客户端剪贴板与矩阵回写)', note: 'SSR 不读取系统剪贴板' },
  { name: 'useTableClipboard', uiComponent: 'useTableClipboard.svelte.ts', category: 'advanced', status: 'spa_only', strategy: '免适配 (客户端剪贴板解析钩子)' },
  { name: 'AudioFeedbackProvider', uiComponent: 'AudioFeedbackProvider.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (Web Audio 业务声效)', note: 'SSR 不支持 AudioContext' },
  { name: 'useAudioAlert', uiComponent: 'useAudioAlert.svelte.ts', category: 'advanced', status: 'spa_only', strategy: '免适配 (Web Audio 声效钩子)' },
  // ─── Enterprise suites wave 4 ──────────────────────────────────────────
  { name: 'FormulaField', uiComponent: 'FormulaField.svelte', liteComponent: 'LiteFormulaField.svelte', category: 'fields', status: 'fallback', strategy: '服务端公式计算结果与标签展示；沙箱动态表达式推算与手动覆盖由 SPA 承接' },
  { name: 'useFormulaEngine', uiComponent: 'useFormulaEngine.svelte.ts', category: 'fields', status: 'spa_only', strategy: '免适配 (客户端公式求值引擎)' },
  { name: 'DataScreenContainer', uiComponent: 'DataScreenContainer.svelte', liteComponent: 'LiteDataScreenContainer.svelte', category: 'layout', status: 'fallback', strategy: '服务端大屏外层容器与暗黑科技布局；全屏 API 与 Scale-to-Fit 自适应缩放由 SPA 承接' },
  { name: 'ThreadedCommentDrawer', uiComponent: 'ThreadedCommentDrawer.svelte', liteComponent: 'LiteThreadedCommentDrawer.svelte', category: 'advanced', status: 'fallback', strategy: '服务端记录批注列表与原生 POST 回复表单；树形盖楼展开、表情反馈与 @联想由 SPA 承接' },
  { name: 'PrintableReportLayout', uiComponent: 'PrintableReportLayout.svelte', category: 'advanced', status: 'fallback', strategy: '服务端 A4 报表排版、单据元数据与签名栏；window.print 打印驱动由 SPA 承接' },
  { name: 'usePrintExport', uiComponent: 'usePrintExport.svelte.ts', category: 'advanced', status: 'spa_only', strategy: '免适配 (浏览器打印与 PDF 导出钩子)' },
  { name: 'ConversionFunnel', uiComponent: 'ConversionFunnel.svelte', category: 'widgets', status: 'fallback', strategy: '服务端业务漏斗转化各阶段数值与留存率统计；动态流向动效由 SPA 承接' },
  { name: 'SankeyChart', uiComponent: 'SankeyChart.svelte', category: 'widgets', status: 'fallback', strategy: '服务端节点来源与去向列表权重展示；SVG 贝塞尔流向图由 SPA 承接' },
  { name: 'SchemaVisualModeler', uiComponent: 'SchemaVisualModeler.svelte', category: 'advanced', status: 'fallback', strategy: '服务端字段结构表格展示；交互式拖拽增删与 JSON 逆向推导由 SPA 承接' },
  { name: 'MicroAppBridge', uiComponent: 'MicroAppBridge.svelte', category: 'advanced', status: 'fallback', strategy: '服务端微应用基础容器；跨域 postMessage 消息总线由 SPA 承接' },
  { name: 'useMicroAppEvent', uiComponent: 'useMicroAppEvent.svelte.ts', category: 'advanced', status: 'spa_only', strategy: '免适配 (跨域 postMessage 事件总线钩子)' },
  { name: 'RuleExpressionBuilder', uiComponent: 'RuleExpressionBuilder.svelte', category: 'advanced', status: 'fallback', strategy: '服务端规则树与自然语言表达式展示；动态嵌套编排与 AST 编译由 SPA 承接' },
  { name: 'ClusterTopologyGraph', uiComponent: 'ClusterTopologyGraph.svelte', category: 'widgets', status: 'fallback', strategy: '服务端三层集群微服务节点矩阵展示；SVG 连线动效与交互下钻由 SPA 承接' },
  { name: 'SnapshotTimelineReplay', uiComponent: 'SnapshotTimelineReplay.svelte', category: 'advanced', status: 'fallback', strategy: '服务端历史版本快照列表与属性变动对比；时间旅行滑块拖动由 SPA 承接' },
  { name: 'ActionPalette', uiComponent: 'ActionPalette.svelte', category: 'advanced', status: 'fallback', strategy: '服务端操作列表与快捷键提示；全键盘拼音检索与参数内联输入由 SPA 承接' },
  { name: 'I18nLanguagePackEditor', uiComponent: 'I18nLanguagePackEditor.svelte', category: 'advanced', status: 'fallback', strategy: '服务端多语言词条表格展示；在线热修编辑与增量发布由 SPA 承接' },
  { name: 'useDynamicLocale', uiComponent: 'useDynamicLocale.svelte.ts', category: 'advanced', status: 'spa_only', strategy: '免适配 (动态语言补丁加载钩子)' },

  // ─── Enterprise suites wave 5 (Developer Sandbox & SaaS Billing) ───────
  { name: 'WebhookSimulator', uiComponent: 'WebhookSimulator.svelte', liteComponent: 'LiteWebhookSimulator.svelte', category: 'advanced', status: 'fallback', strategy: '服务端 Webhook 事件模拟面板、端点与只读载荷展示；真实 HTTP 发送与响应交互由 SPA 承接' },
  { name: 'HmacSignatureCalculator', uiComponent: 'HmacSignatureCalculator.svelte', liteComponent: 'LiteHmacSignatureCalculator.svelte', category: 'advanced', status: 'fallback', strategy: '服务端预计算签名、算法标识与签名头展示；Web Crypto 现场验签比对由 SPA 承接' },
  { name: 'ApiPlayground', uiComponent: 'ApiPlayground.svelte', liteComponent: 'LiteApiPlayground.svelte', category: 'advanced', status: 'fallback', strategy: '服务端 cURL 命令生成、URL 探针与预估状态展示；交互式 HTTP 请求发起由 SPA 承接' },
  { name: 'PlanUsageQuotaBar', uiComponent: 'PlanUsageQuotaBar.svelte', liteComponent: 'LitePlanUsageQuotaBar.svelte', category: 'widgets', status: 'fallback', strategy: '服务端多配额用量进度条、重置周期与超额状态提示；升级套餐引导由 SPA 承接' },
  { name: 'TierFeatureComparison', uiComponent: 'TierFeatureComparison.svelte', liteComponent: 'LiteTierFeatureComparison.svelte', category: 'advanced', status: 'fallback', strategy: '服务端 SaaS 多版本套餐权益对比矩阵静态表格；交互式套餐升级选型由 SPA 承接' },
  { name: 'BillingInvoiceDrawer', uiComponent: 'BillingInvoiceDrawer.svelte', liteComponent: 'LiteBillingInvoiceDrawer.svelte', category: 'advanced', status: 'fallback', strategy: '服务端月度对账结算明细、项目清单与电子发票下载链接；抽屉动效与开票申请由 SPA 承接' },

  // ─── Enterprise suites wave 6 (Data Ingestion, Security Audit, SQL & Governance) ───
  { name: 'TreeTransferSelect', uiComponent: 'TreeTransferSelect.svelte', liteComponent: 'LiteTreeSelect.svelte', category: 'advanced', status: 'fallback', strategy: '服务端树形穿梭分配列表降级为原生 TreeSelect 树形多选；双向穿梭动效由 SPA 承接' },
  { name: 'VirtualCardGrid', uiComponent: 'VirtualCardGrid.svelte', liteComponent: 'LiteGrid.svelte', category: 'layout', status: 'fallback', strategy: '服务端卡片网格静态分页布局；窗口虚拟滚动由 SPA 承接' },
  { name: 'ApprovalChainBuilder', uiComponent: 'ApprovalChainBuilder.svelte', liteComponent: 'LiteApprovalChainBuilder.svelte', category: 'advanced', status: 'fallback', strategy: '服务端多级审批节点状态与或签/会签流向展示；拖拽节点重排由 SPA 承接' },
  { name: 'PeriodComparisonCard', uiComponent: 'PeriodComparisonCard.svelte', liteComponent: 'LitePeriodComparisonCard.svelte', category: 'widgets', status: 'fallback', strategy: '服务端指标数值与环比/同比变动幅度胶囊展示；动态图表下钻由 SPA 承接' },
  { name: 'useStorageCache', uiComponent: 'useStorageCache.svelte.ts', category: 'advanced', status: 'spa_only', strategy: '免适配 (客户端 KV 缓存适配器钩子)' },
  { name: 'RecordCompareModal', uiComponent: 'RecordCompareModal.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (客户端双实体参数差异比对模态弹窗)' },
  { name: 'SqlConsole', uiComponent: 'SqlConsole.svelte', liteComponent: 'LiteSqlConsole.svelte', category: 'advanced', status: 'fallback', strategy: '服务端只读 SQL 语句与执行结果快照表格展示；交互式执行与自动补全由 SPA 承接' },
  { name: 'EnvVariableEditor', uiComponent: 'EnvVariableEditor.svelte', liteComponent: 'LiteEnvVariableEditor.svelte', category: 'advanced', status: 'fallback', strategy: '服务端环境变量键值与机密掩码展示；敏感凭据解密与在线保存由 SPA 承接' },
  { name: 'FeatureAnnouncementModal', uiComponent: 'FeatureAnnouncementModal.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (客户端产品更新发版公告模态框)' },
  { name: 'MasterSubTableDrawer', uiComponent: 'MasterSubTableDrawer.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (客户端嵌套子表抽屉探针)' },
  { name: 'ScheduledJobManager', uiComponent: 'ScheduledJobManager.svelte', liteComponent: 'LiteScheduledJobManager.svelte', category: 'advanced', status: 'fallback', strategy: '服务端 Cron 计划任务列表、执行周期与状态展示；手动触发与即时修改由 SPA 承接' },
  { name: 'SecureDataExporter', uiComponent: 'SecureDataExporter.svelte', liteComponent: 'LiteSecureDataExporter.svelte', category: 'advanced', status: 'fallback', strategy: '服务端数字隐形防伪指纹、审计信息与下载提示；客户端脱敏二次拦截由 SPA 承接' },
  { name: 'RolePermissionComparator', uiComponent: 'RolePermissionComparator.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (客户端角色权限前后差异比对与高危越权警示)' },
  { name: 'TenantQuotasMatrix', uiComponent: 'TenantQuotasMatrix.svelte', liteComponent: 'LiteTenantQuotasMatrix.svelte', category: 'widgets', status: 'fallback', strategy: '服务端多租户各资源配额水位进度条；配额申请与升级由 SPA 承接' },
  { name: 'TableAggregationFooter', uiComponent: 'TableAggregationFooter.svelte', liteComponent: 'LiteTableAggregationFooter.svelte', category: 'layout', status: 'fallback', strategy: '服务端全表合计与选中小计汇总栏静态排版；多选行动态即时计算由 SPA 承接' },
  { name: 'IncidentWarRoomDrawer', uiComponent: 'IncidentWarRoomDrawer.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (客户端突发高危故障应急协同战情室抽屉)' },
  { name: 'DataImportDropzone', uiComponent: 'DataImportDropzone.svelte', liteComponent: 'LiteDataImportDropzone.svelte', category: 'advanced', status: 'fallback', strategy: '服务端批量文件上传框与标准模板下载；客户端拖拽与大文件分片由 SPA 承接' },
  { name: 'ColumnMappingTable', uiComponent: 'ColumnMappingTable.svelte', liteComponent: 'LiteColumnMappingTable.svelte', category: 'advanced', status: 'fallback', strategy: '服务端源列到目标字段映射关系表格展示；智能自动匹配与类型转换由 SPA 承接' },
  { name: 'ImportPreviewValidator', uiComponent: 'ImportPreviewValidator.svelte', liteComponent: 'LiteImportPreviewValidator.svelte', category: 'advanced', status: 'fallback', strategy: '服务端数据校验统计与错误明细表格展示；客户端只看错误行过滤与单元格修补由 SPA 承接' },

  // ─── Enterprise suites wave 7 (BI Pivot, Geo Distribution, Mask Policy & Diagnostics) ───
  { name: 'PivotMatrix', uiComponent: 'PivotMatrix.svelte', liteComponent: 'LitePivotMatrix.svelte', category: 'widgets', status: 'fallback', strategy: '服务端多维交叉聚合矩阵静态表格；动态拖拽切片与热力色阶由 SPA 承接' },
  { name: 'GeoScatterMap', uiComponent: 'GeoScatterMap.svelte', liteComponent: 'LiteGeoScatterMap.svelte', category: 'widgets', status: 'fallback', strategy: '服务端大区分布散点卡片矩阵与排行榜；SVG 交互下钻由 SPA 承接' },
  { name: 'DataMaskPolicyEngine', uiComponent: 'DataMaskPolicyEngine.svelte', liteComponent: 'LiteDataMaskPolicyEngine.svelte', category: 'advanced', status: 'fallback', strategy: '服务端脱敏策略基线表格与豁免角色列表；实时沙箱算法推演由 SPA 承接' },
  { name: 'MockDataInterceptor', uiComponent: 'MockDataInterceptor.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (客户端网络拦截与离线 Mock 控制台)' },
  { name: 'SystemHealthCheckDashboard', uiComponent: 'SystemHealthCheckDashboard.svelte', liteComponent: 'LiteSystemHealthCheckDashboard.svelte', category: 'advanced', status: 'fallback', strategy: '服务端服务组件健康指标与往返延时静态列表；一键全量巡检轮询由 SPA 承接' },

  // ─── Enterprise suites wave 8 (Admin Copilot & AI Query Explainer) ───────
  { name: 'AdminCopilotWidget', uiComponent: 'AdminCopilotWidget.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (客户端 AI 智能悬浮助手与筛选建议卡片)' },
  { name: 'QueryAiExplainer', uiComponent: 'QueryAiExplainer.svelte', liteComponent: 'LiteQueryAiExplainer.svelte', category: 'advanced', status: 'fallback', strategy: '服务端复杂查询表达式与只读语义口径解释卡片；重新触发解析由 SPA 承接' },

  // ─── Enterprise suites wave 9 (Workflow BPMN, Execution Tracker & Data Scope ABAC) ───
  { name: 'WorkflowGraphDesigner', uiComponent: 'WorkflowGraphDesigner.svelte', liteComponent: 'LiteApprovalChainBuilder.svelte', category: 'advanced', status: 'fallback', strategy: '服务端工作流节点步骤列表与审批人静态展示；交互式拖拽连线与条件编排由 SPA 承接' },
  { name: 'WorkflowExecutionTracker', uiComponent: 'WorkflowExecutionTracker.svelte', liteComponent: 'LiteApprovalChainBuilder.svelte', category: 'advanced', status: 'fallback', strategy: '服务端工作流实例流转历史时间线与耗时展示；动态实时轮询由 SPA 承接' },
  { name: 'DataScopeRuleEditor', uiComponent: 'DataScopeRuleEditor.svelte', liteComponent: 'LiteDataMaskPolicyEngine.svelte', category: 'advanced', status: 'fallback', strategy: '服务端行级数据权限范围与角色策略表格展示；动态条件组嵌套配置由 SPA 承接' },

  // ─── Enterprise suites wave 10 (AntiLeak Watermark, Lineage DAG, Live Logs, Electronic Seal & Capacity Predictor) ───
  { name: 'ScreenAntiLeakGuard', uiComponent: 'ScreenAntiLeakGuard.svelte', liteComponent: 'LiteScreenAntiLeakGuard.svelte', category: 'advanced', status: 'fallback', strategy: '服务端静态平铺防泄密水印背景；客户端 DOM 防篡改自愈由 SPA 承接' },
  { name: 'DataLineageGraph', uiComponent: 'DataLineageGraph.svelte', liteComponent: 'LiteDataLineageGraph.svelte', category: 'advanced', status: 'fallback', strategy: '服务端数据血缘上下游节点列表与转换关系展示；SVG 动态高亮连线由 SPA 承接' },
  { name: 'LiveStreamLogViewer', uiComponent: 'LiveStreamLogViewer.svelte', liteComponent: 'LiteLiveStreamLogViewer.svelte', category: 'advanced', status: 'fallback', strategy: '服务端静态日志行快照与等级色彩展示；客户端长连接实时流式推送与自动吸底由 SPA 承接' },
  { name: 'ElectronicSealStamp', uiComponent: 'ElectronicSealStamp.svelte', liteComponent: 'LiteElectronicSealStamp.svelte', category: 'widgets', status: 'fallback', strategy: '服务端企业防伪电子印章矢量展示与审核标记；动态签署由 SPA 承接' },
  { name: 'SystemCapacityForecastCard', uiComponent: 'SystemCapacityForecastCard.svelte', liteComponent: 'LiteSystemCapacityForecastCard.svelte', category: 'widgets', status: 'fallback', strategy: '服务端资源容量耗尽倒计时与用量进度条展示；客户端趋势线性拟合折线图由 SPA 承接' },



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

  md += `\n> 样式钩子（\`class\`）覆盖是独立指标，见 [CLASS-HOOKS.md](./CLASS-HOOKS.md)，不影响本表状态。\n`;
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

// ─── Styling hook audit (separate metric, never a status) ────────────────────

/**
 * A component exposes a caller styling hook when it declares `class?: string` or
 * destructures `class: className`. Both shapes are used across `@svadmin/ui` and
 * `@svadmin/lite`, so the audit must not prefer one.
 */
const CLASS_PROP = /class\??\s*:\s*string|class\s*:\s*[A-Za-z_$][\w$]*/u;

export interface ClassHookMiss {
  name: string;
  category: ParityCategory;
  liteComponent: string;
}

export interface ClassHookAudit {
  /** `exact` entries whose reference and Lite components both resolve to files. */
  reviewedCount: number;
  /**
   * Entries the audit could not resolve to exactly one component file (missing or
   * duplicate basename). Reported instead of silently picking one, because
   * `LiteModalForm` and friends exist both at the root and under a category dir.
   */
  unresolved: Array<{ name: string; liteComponent: string; reason: string }>;
  /** Reviewed entries whose reference exposes a `class` hook. */
  referenceHookCount: number;
  /** Of those, entries where Lite also accepts `class`. */
  preservedCount: number;
  coveragePercentage: number;
  missing: ClassHookMiss[];
  timestamp: string;
}

/** Index every component file by basename, keeping duplicates visible. */
function componentIndex(directory: string): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const file of listFiles(directory)) {
    const name = file.split('/').at(-1) ?? file;
    const paths = index.get(name) ?? [];
    paths.push(file);
    index.set(name, paths);
  }
  return index;
}

/** Resolve one mapped component path, preferring its exact relative path. */
function resolveComponent(
  directory: string,
  mappedPath: string,
  index: Map<string, string[]>,
): { path?: string; reason?: string } {
  const direct = resolve(directory, mappedPath);
  if (existsSync(direct)) return { path: direct };
  const candidates = index.get(liteComponentFile(mappedPath)) ?? [];
  if (candidates.length === 1) return { path: candidates[0] };
  if (candidates.length === 0) return { reason: 'not found' };
  return { reason: `ambiguous (${candidates.length} files share the basename)` };
}

/**
 * Compare the styling-hook surface of every `exact` entry.
 *
 * A missing `class` hook is styling debt, not a capability regression: Lite ships
 * its own stylesheet and hosts can wrap the component. It is reported on its own
 * artifact so the parity ratio cannot be nudged by adding trivial pass-throughs,
 * and so the debt does not silently disappear either.
 */
export function buildClassHookAudit(
  repositoryRoot = resolve(import.meta.dir, '..'),
): ClassHookAudit {
  const liteDirectory = resolve(repositoryRoot, 'packages/lite/src/components');
  const uiDirectory = resolve(repositoryRoot, 'packages/ui/src/components');
  const liteIndex = componentIndex(liteDirectory);
  const uiIndex = componentIndex(uiDirectory);

  let reviewedCount = 0;
  let referenceHookCount = 0;
  let preservedCount = 0;
  const missing: ClassHookMiss[] = [];
  const unresolved: ClassHookAudit['unresolved'] = [];

  for (const item of PARITY_ITEMS) {
    if (item.status !== 'exact') continue;
    const liteResolution = resolveComponent(liteDirectory, item.liteComponent, liteIndex);
    const uiResolution = resolveComponent(uiDirectory, item.uiComponent, uiIndex);
    if (!liteResolution.path || !uiResolution.path) {
      const reason = liteResolution.reason ?? uiResolution.reason ?? 'not found';
      unresolved.push({ name: item.name, liteComponent: item.liteComponent, reason });
      continue;
    }
    const litePath = liteResolution.path;
    const uiPath = uiResolution.path;
    reviewedCount += 1;
    const referenceExposesHook = CLASS_PROP.test(readFileSync(uiPath, 'utf8'));
    if (!referenceExposesHook) continue;
    referenceHookCount += 1;
    if (CLASS_PROP.test(readFileSync(litePath, 'utf8'))) {
      preservedCount += 1;
      continue;
    }
    missing.push({
      name: item.name,
      category: item.category,
      liteComponent: liteComponentFile(item.liteComponent),
    });
  }

  missing.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  unresolved.sort((a, b) => a.name.localeCompare(b.name));

  return {
    reviewedCount,
    unresolved,
    referenceHookCount,
    preservedCount,
    coveragePercentage: rate(preservedCount, referenceHookCount),
    missing,
    timestamp: new Date().toISOString(),
  };
}

export function classHookOutputPaths(repositoryRoot = resolve(import.meta.dir, '..')): {
  markdownPath: string;
  jsonPath: string;
} {
  return {
    markdownPath: resolve(repositoryRoot, 'packages/lite/CLASS-HOOKS.md'),
    jsonPath: resolve(repositoryRoot, 'packages/lite/class-hooks.json'),
  };
}

export function generateClassHookMarkdown(audit: ClassHookAudit): string {
  const rows = audit.missing.map(
    (item) => `| \`${item.name}\` | ${item.category} | \`${item.liteComponent}\` |`,
  );
  const unresolvedRows = audit.unresolved.length
    ? audit.unresolved.map(
        (item) => `| \`${item.name}\` | \`${item.liteComponent}\` | ${item.reason} |`,
      )
    : ['| — | — | 全部可唯一定位 |'];
  return `# Lite styling hook coverage (\`class\`)

> 自动生成时间: ${audit.timestamp}
> 重新生成: \`bun scripts/check-parity.ts --write\`

## 这是什么指标

参考组件若声明了 \`class\` 属性，调用方就多一个样式入口。Lite 是否也接受
\`class\`，属于**样式钩子覆盖**，与 \`exact\` / \`fallback\` 的能力判定相互独立：

- Lite 自带 \`lite.css\` 基线，宿主也可以用外层容器收口样式；
- 因此缺少 \`class\` 不计为能力缺口，也不改变任何条目的 status；
- 但把它显式统计出来，避免"补一个 class 就把数字抬高"或者"债务悄无声息消失"。

## 现状

- 参与统计的 \`exact\` 条目: **${audit.reviewedCount}**
- 无法唯一定位（需人工确认）: **${audit.unresolved.length}**
- 参考组件暴露 \`class\` 的条目: **${audit.referenceHookCount}**
- Lite 同时接受 \`class\` 的条目: **${audit.preservedCount}**（**${audit.coveragePercentage}%**）
- 仍缺样式钩子的条目: **${audit.missing.length}**

## 待补齐清单

| 组件 | 分类 | Lite 实现 |
| --- | --- | --- |
${rows.join('\n')}

## 未能唯一定位

同名文件同时存在于根目录与分类目录（例如 \`LiteModalForm\`），审计不会猜一个文件，
而是列在这里等待人工确认映射路径：

| 组件 | 映射路径 | 原因 |
| --- | --- | --- |
${unresolvedRows.join('\n')}
`;
}

/** Drift check for the styling hook artifacts, mirroring the parity artifacts. */
export function classHookArtifactDrift(
  repositoryRoot = resolve(import.meta.dir, '..'),
): string[] {
  const { markdownPath, jsonPath } = classHookOutputPaths(repositoryRoot);
  const audit = buildClassHookAudit(repositoryRoot);
  const drift: string[] = [];

  const stripMarkdownTimestamp = (value: string): string =>
    value.replace(/^> .*自动生成时间[^\n]*$/mu, '> <timestamp>').trimEnd();
  const stripJsonTimestamp = (value: string): string => {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    delete parsed['timestamp'];
    return JSON.stringify(parsed);
  };

  const expected: Array<[string, string, (value: string) => string]> = [
    [markdownPath, stripMarkdownTimestamp(generateClassHookMarkdown(audit)), stripMarkdownTimestamp],
    [jsonPath, stripJsonTimestamp(JSON.stringify(audit)), stripJsonTimestamp],
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

export const ECOSYSTEM_DOC_PATH = 'docs/components/parity.md';

/**
 * Rewrite only the delimited ecosystem block. Everything outside the markers is
 * hand-written and must survive `--write` untouched.
 */
export function writeEcosystemSection(
  repositoryRoot = resolve(import.meta.dir, '..'),
): string {
  const documentPath = resolve(repositoryRoot, ECOSYSTEM_DOC_PATH);
  const current = existsSync(documentPath) ? readFileSync(documentPath, 'utf8') : '';
  const section = renderEcosystemSection();
  const start = current.indexOf(ECOSYSTEM_MATRIX_START);
  const end = current.indexOf(ECOSYSTEM_MATRIX_END);
  let next: string;
  if (start !== -1 && end > start) {
    next = `${current.slice(0, start)}${section}${current.slice(end + ECOSYSTEM_MATRIX_END.length)}`;
  } else {
    const anchor = current.indexOf('## Refine alignment');
    next = anchor === -1
      ? `${current.trimEnd()}\n\n${section}\n`
      : `${current.slice(0, anchor)}${section}\n\n${current.slice(anchor)}`;
  }
  writeFileSync(documentPath, next, 'utf8');
  return documentPath;
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
    const audit = buildClassHookAudit();
    const { markdownPath: hooksPath, jsonPath: hooksJsonPath } = classHookOutputPaths();
    writeFileSync(hooksPath, `${generateClassHookMarkdown(audit).trimEnd()}\n`, 'utf8');
    writeFileSync(hooksJsonPath, JSON.stringify(audit, null, 2), 'utf8');
    const ecosystemDoc = writeEcosystemSection();
    console.info(`[OK] Generated ${mdPath}, ${jsonPath}, ${hooksPath}, ${hooksJsonPath} and ${ecosystemDoc}`);
    console.info(
      `[OK] Styling hook coverage: ${audit.preservedCount}/${audit.referenceHookCount} (${audit.coveragePercentage}%), ${audit.missing.length} pending`,
    );
  }

  if (isCheck && report.missingCount > 0) {
    console.error(`[FAIL] Found ${report.missingCount} missing component mappings!`);
    process.exit(1);
  }

  if (isCheck) {
    const drift = [...parityArtifactDrift(), ...classHookArtifactDrift(), ...ecosystemDrift()];
    if (drift.length > 0) {
      console.error('[FAIL] Parity artifacts are out of date:');
      for (const entry of drift) console.error(`  - ${entry}`);
      console.error('Run `bun run check:parity` and commit the regenerated artifacts.');
      process.exit(1);
    }
    console.info('[OK] Parity artifacts match the generator output.');
  }
}
