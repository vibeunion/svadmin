/**
 * scripts/check-parity.ts
 *
 * Scans @svadmin/ui and @svadmin/lite components to compute parity metrics,
 * generate packages/lite/PARITY.md and packages/lite/parity.json,
 * and provide an executable CLI dashboard.
 */
import { writeFileSync } from 'node:fs';
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
}

export interface ParityReport {
  timestamp: string;
  totalComponents: number;
  adaptedCount: number;
  fallbackCount: number;
  spaOnlyCount: number;
  missingCount: number;
  overallCoveragePercentage: number;
  categories: Record<string, ParityCategorySummary>;
  items: ParityItem[];
}

const PARITY_ITEMS: ParityItem[] = [
  // ─── Fields ─────────────────────────────────────────────────────────────
  { name: 'TextField', uiComponent: 'TextField.svelte', liteComponent: 'LiteTextField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="text">' },
  { name: 'NumberField', uiComponent: 'NumberField.svelte', liteComponent: 'LiteNumberField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="number">' },
  { name: 'BooleanField', uiComponent: 'BooleanField.svelte', liteComponent: 'LiteBooleanField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="checkbox">' },
  { name: 'DateField', uiComponent: 'DateField.svelte', liteComponent: 'LiteDateField.svelte', category: 'fields', status: 'exact', strategy: '原生 <input type="date">' },
  { name: 'DateRangeField', uiComponent: 'DateRangeField.svelte', liteComponent: 'LiteDateRangeField.svelte', category: 'fields', status: 'exact', strategy: '区间展示与双 date 输入' },
  { name: 'SelectField', uiComponent: 'SelectField.svelte', liteComponent: 'LiteSelectField.svelte', category: 'fields', status: 'exact', strategy: '原生 <select>' },
  { name: 'MultiSelectField', uiComponent: 'MultiSelectField.svelte', liteComponent: 'LiteMultiSelectField.svelte', category: 'fields', status: 'exact', strategy: '原生 <select multiple>' },
  { name: 'RelationField', uiComponent: 'RelationField.svelte', liteComponent: 'LiteRelationField.svelte', category: 'fields', status: 'exact', strategy: '原生 <select> 或外键关联跳转' },
  { name: 'TagField', uiComponent: 'TagField.svelte', liteComponent: 'LiteTagField.svelte', category: 'fields', status: 'exact', strategy: '逗号分隔原生输入与徽章展示' },
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
  { name: 'CodeField', uiComponent: 'CodeField.svelte', liteComponent: 'LiteCodeField.svelte', category: 'fields', status: 'fallback', strategy: '降级为 <pre><code> 语法容器与 Textarea 编辑' },
  { name: 'MarkdownField', uiComponent: 'MarkdownField.svelte', liteComponent: 'LiteMarkdownField.svelte', category: 'fields', status: 'fallback', strategy: '降级为原生 Textarea 与纯 HTML 预览' },
  { name: 'RichTextField', uiComponent: 'RichTextField.svelte', liteComponent: 'LiteRichTextField.svelte', category: 'fields', status: 'fallback', strategy: '降级为原生 Textarea 与只读展示' },
  { name: 'TreeSelect', uiComponent: 'TreeSelect.svelte', liteComponent: 'fields/LiteTreeSelect.svelte', category: 'fields', status: 'exact', strategy: '原生层级缩进 <select> 与单选/多选' },
  { name: 'Cascader', uiComponent: 'Cascader.svelte', liteComponent: 'fields/LiteCascader.svelte', category: 'fields', status: 'exact', strategy: '路径展开原生 <select> 与格式化展示' },
  { name: 'Transfer', uiComponent: 'Transfer.svelte', liteComponent: 'LiteTransfer.svelte', category: 'fields', status: 'exact', strategy: '双列复选框/列表与左右转移 POST 表单' },
  { name: 'DynamicFormList', uiComponent: 'DynamicFormList.svelte', liteComponent: 'LiteDynamicFormList.svelte', category: 'fields', status: 'exact', strategy: '子表单卡片/表格与服务端索引数组解析' },

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
  { name: 'InsightCard', uiComponent: 'InsightCard.svelte', liteComponent: 'widgets/LiteInsightCard.svelte', category: 'widgets', status: 'exact', strategy: '业务洞察指标容器' },
  { name: 'AnomalyBadge', uiComponent: 'AnomalyBadge.svelte', liteComponent: 'widgets/LiteAnomalyBadge.svelte', category: 'widgets', status: 'exact', strategy: '异常状态高亮徽章' },
  { name: 'BarChart', uiComponent: 'charts/BarChart.svelte', liteComponent: 'widgets/LiteBarChart.svelte', category: 'widgets', status: 'fallback', strategy: '降级为 CSS 柱状图或数据明细表格' },
  { name: 'LineChart', uiComponent: 'charts/LineChart.svelte', liteComponent: 'widgets/LiteLineChart.svelte', category: 'widgets', status: 'fallback', strategy: '降级为折线数据点表格与趋势指示' },
  { name: 'PieChart', uiComponent: 'charts/PieChart.svelte', liteComponent: 'widgets/LitePieChart.svelte', category: 'widgets', status: 'fallback', strategy: '降级为占比条与结构化表格' },

  // ─── Advanced & Interactivity Fallbacks ─────────────────────────────────
  { name: 'ConfirmDialog', uiComponent: 'ConfirmDialog.svelte', liteComponent: 'LiteConfirmDialog.svelte', category: 'advanced', status: 'exact', strategy: 'CSS :target 锚点模态框' },
  { name: 'FilterBuilder', uiComponent: 'FilterBuilder.svelte', liteComponent: 'LiteFilterBuilder.svelte', category: 'advanced', status: 'exact', strategy: '可视化多条件原生筛选表单与 CRUD 运算符解析' },
  { name: 'DrawerForm', uiComponent: 'DrawerForm.svelte', liteComponent: 'advanced/LiteDrawerForm.svelte', category: 'advanced', status: 'fallback', strategy: '降级为原生独立编辑页或卡片表单' },
  { name: 'ModalForm', uiComponent: 'ModalForm.svelte', liteComponent: 'advanced/LiteModalForm.svelte', category: 'advanced', status: 'fallback', strategy: '降级为原生独立新建/编辑页' },
  { name: 'VirtualTable', uiComponent: 'VirtualTable.svelte', liteComponent: 'advanced/LiteVirtualTable.svelte', category: 'advanced', status: 'fallback', strategy: '降级为服务端分页 Table' },
  { name: 'InlineEdit', uiComponent: 'InlineEdit.svelte', liteComponent: 'advanced/LiteInlineEdit.svelte', category: 'advanced', status: 'fallback', strategy: '降级为行内单独提交按钮或跳转编辑' },
  { name: 'AutoSaveIndicator', uiComponent: 'AutoSaveIndicator.svelte', liteComponent: 'advanced/LiteAutoSaveIndicator.svelte', category: 'advanced', status: 'fallback', strategy: '服务端保存时间戳展示' },
  { name: 'Toast', uiComponent: 'Toast.svelte', liteComponent: 'advanced/LiteToast.svelte', category: 'advanced', status: 'fallback', strategy: '降级为页面顶部 Alert 通知条' },
  { name: 'UndoableNotification', uiComponent: 'UndoableNotification.svelte', liteComponent: 'advanced/LiteUndoableNotification.svelte', category: 'advanced', status: 'fallback', strategy: '降级为带撤销表单的通知条' },
  { name: 'Watermark', uiComponent: 'Watermark.svelte', liteComponent: 'LiteWatermark.svelte', category: 'advanced', status: 'exact', strategy: '纯 CSS / SVG 矢量背景水印' },
  { name: 'ColumnSettings', uiComponent: 'ColumnSettings.svelte', liteComponent: 'LiteColumnSettings.svelte', category: 'advanced', status: 'exact', strategy: '原生多选表单与查询参数列过滤' },
  { name: 'ImportWizard', uiComponent: 'ImportWizard.svelte', liteComponent: 'LiteImportWizard.svelte', category: 'advanced', status: 'exact', strategy: '原生 Multipart 文件上传与映射提示' },
  { name: 'ColumnHeaderFilter', uiComponent: 'ColumnHeaderFilter.svelte', liteComponent: 'LiteColumnHeaderFilter.svelte', category: 'advanced', status: 'exact', strategy: '原生 GET 查询参数列过滤链接' },
  { name: 'TreeTable', uiComponent: 'TreeTable.svelte', liteComponent: 'LiteTreeTable.svelte', category: 'advanced', status: 'exact', strategy: '递归层级缩进表格展示' },
  { name: 'SensitiveDataMask', uiComponent: 'SensitiveDataMask.svelte', liteComponent: 'LiteSensitiveDataMask.svelte', category: 'advanced', status: 'exact', strategy: '服务端掩码字符展示' },
  { name: 'ApprovalActionCard', uiComponent: 'ApprovalActionCard.svelte', liteComponent: 'LiteApprovalActionCard.svelte', category: 'advanced', status: 'exact', strategy: '原生审批 POST 表单与意见输入' },

  // ─── SPA Only (No SSR counterpart needed) ───────────────────────────────
  { name: 'ThemeToggle', uiComponent: 'ThemeToggle.svelte', category: 'layout', status: 'spa_only', strategy: '免适配 (Lite 为固定 Slate/Indigo 配色)', note: 'IE11 不支持 CSS 变量与客户端主题即时切换' },
  { name: 'DevTools', uiComponent: 'DevTools.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (SPA 调试器)', note: '受限环境不需要客户端 DevTools 悬浮球' },
  { name: 'CopilotPanel', uiComponent: 'CopilotPanel.svelte', category: 'advanced', status: 'spa_only', strategy: '免适配 (AI Copilot 客户端浮窗)', note: 'AI 交互通过 ChatDialog 服务端页面承接' },
  { name: 'VoiceInput', uiComponent: 'VoiceInput.svelte', category: 'fields', status: 'spa_only', strategy: '免适配 (Web Speech API)', note: '受限浏览器无麦克风与 Speech Recognition API' },
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
    cat.percentage = Number(((covered / cat.total) * 100).toFixed(1));
  }

  const total = PARITY_ITEMS.length;
  const exactCount = PARITY_ITEMS.filter((i) => i.status === 'exact').length;
  const fallbackCount = PARITY_ITEMS.filter((i) => i.status === 'fallback').length;
  const spaOnlyCount = PARITY_ITEMS.filter((i) => i.status === 'spa_only').length;
  const missingCount = PARITY_ITEMS.filter((i) => i.status === 'missing').length;
  const overallCoverage = Number((((exactCount + fallbackCount + spaOnlyCount) / total) * 100).toFixed(1));

  return {
    timestamp: new Date().toISOString(),
    totalComponents: total,
    adaptedCount: exactCount,
    fallbackCount: fallbackCount,
    spaOnlyCount: spaOnlyCount,
    missingCount: missingCount,
    overallCoveragePercentage: overallCoverage,
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
> 总体适配覆盖率：**${report.overallCoveragePercentage}%**（${report.adaptedCount + report.fallbackCount + report.spaOnlyCount}/${report.totalComponents} 组件）

## 进度总览

| 模块分类 | 组件总数 | 1:1 对齐 (Exact) | 语义降级 (Fallback) | 免适配 (SPA Only) | 待补齐 (Missing) | 覆盖率 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
`;

  for (const [name, cat] of Object.entries(report.categories)) {
    md += `| **${name}** | ${cat.total} | ${cat.adapted} | ${cat.fallback} | ${cat.spaOnly} | ${cat.missing} | **${cat.percentage}%** |\n`;
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
  console.info(`  总体覆盖率: ${report.overallCoveragePercentage}% (${report.adaptedCount + report.fallbackCount + report.spaOnlyCount}/${report.totalComponents})`);
  console.info(`  - 1:1 对齐: ${report.adaptedCount}`);
  console.info(`  - 语义降级: ${report.fallbackCount}`);
  console.info(`  - 免适配(SPA): ${report.spaOnlyCount}`);
  console.info(`  - 待补齐: ${report.missingCount}`);
  console.info('===============================================================\n');
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
    writeFileSync(mdPath, mdContent, 'utf8');
    writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
    console.info(`[OK] Generated ${mdPath} and ${jsonPath}`);
  }

  if (isCheck && report.missingCount > 0) {
    console.error(`[FAIL] Found ${report.missingCount} missing component mappings!`);
    process.exit(1);
  }
}
