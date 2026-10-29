import type { useTranslation } from '@svadmin/core/i18n';

const english = {
  'common.total': 'Total: {total}',
  'listPagination.navigation': '{label} pagination',
  'listPagination.range': '{start}–{end} of {total} records',
  'listPagination.pageSizeLabel': 'Rows per page',
  'listPagination.pageSizeAria': '{label} rows per page',
  'listPagination.pageSizeOption': '{size} rows',
  'listPagination.firstPage': 'Already on the first page.',
  'listPagination.lastPage': 'Already on the last page.',
  'listPagination.previous': 'Previous page',
  'listPagination.next': 'Next page',
  'listPagination.previousAria': '{label} previous page',
  'listPagination.nextAria': '{label} next page',
  'listPagination.pageList': '{label} page numbers',
  'listPagination.pageAria': '{label} page {page}',
  'listPagination.currentPage': 'Current page {page}',
  'listPagination.goToPage': 'Go to page {page}',
  'listPagination.jumpTo': 'Go to',
  'listPagination.jumpToAria': '{label} page number',
  'listPagination.simplePage': 'Page {page} / {total}',
  'listFooter.truncated': 'Only the first {maxRecords} records are loaded. Narrow the results using filters.',
  'scrollableTable.horizontalScroll': 'Scroll table horizontally',
  'scrollableTable.topHorizontalScroll': 'Scroll table horizontally above the table',
} as const;

type ListMessageKey = keyof typeof english;
const chinese: Record<ListMessageKey, string> = {
  'common.total': '共 {total} 条',
  'listPagination.navigation': '{label}分页导航',
  'listPagination.range': '第 {start}–{end} 条 / 共 {total} 条',
  'listPagination.pageSizeLabel': '每页条数',
  'listPagination.pageSizeAria': '{label}每页条数',
  'listPagination.pageSizeOption': '{size} 条',
  'listPagination.firstPage': '已经是第一页。',
  'listPagination.lastPage': '已经是最后一页。',
  'listPagination.previous': '上一页',
  'listPagination.next': '下一页',
  'listPagination.previousAria': '{label}上一页',
  'listPagination.nextAria': '{label}下一页',
  'listPagination.pageList': '{label}页码列表',
  'listPagination.pageAria': '{label}第 {page} 页',
  'listPagination.currentPage': '当前第 {page} 页',
  'listPagination.goToPage': '前往第 {page} 页',
  'listPagination.jumpTo': '跳至',
  'listPagination.jumpToAria': '{label}页码',
  'listPagination.simplePage': '第 {page} / {total} 页',
  'listFooter.truncated': '结果较多，仅加载前 {maxRecords} 条，请用筛选收窄范围。',
  'scrollableTable.horizontalScroll': '列表横向滚动',
  'scrollableTable.topHorizontalScroll': '列表上方横向滚动',
};

type TranslationContext = Pick<ReturnType<typeof useTranslation>, 'locale' | 't'>;

/** 优先使用宿主翻译；UI 自带回退词条兼容仍在支持范围内的旧版 Core。 */
export function listText(
  i18n: TranslationContext,
  key: ListMessageKey,
  params: Record<string, string | number> = {},
): string {
  const translated = i18n.t(key, params);
  if (translated !== key) return translated;
  let text: string = (i18n.locale.startsWith('zh') ? chinese : english)[key];
  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}
