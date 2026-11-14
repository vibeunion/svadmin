/**
 * 文案格式层，对齐 Arco 文案规范里已经有宿主可用的三条：
 * 24 小时制、千分位、中西文之间留空格。
 * 不是一套新的 i18n 框架。型号、版本号这类不表数量的数字不要走 `spaceCjkLatin`。
 */

export interface AdminTimeOptions {
  /** 默认只输出时分秒。需要日期时传入 `dateStyle`。 */
  dateStyle?: Intl.DateTimeFormatOptions['dateStyle'];
  locale?: string;
}

/** 24 小时制。`hourCycle: 'h23'` 避免 en-US 默认的 12 小时。 */
export function formatAdminTime(value: Date | number | string, options: AdminTimeOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(options.locale, {
    ...(options.dateStyle ? { dateStyle: options.dateStyle } : {}),
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/** 超过四位的整数按千分位分组。小数部分不分组。 */
export function formatAdminNumber(value: number, locale = 'zh-CN'): string {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 20 }).format(value);
}

const CJK_LATIN = /([\u3400-\u9FFF])([A-Za-z0-9])/g;
const LATIN_CJK = /([A-Za-z0-9])([\u3400-\u9FFF])/g;

/**
 * 在汉字与拉丁字母或数字之间插入一个空格。
 * 不处理全角标点，也不判断「7号线」「3D」这类非数量数字。
 */
export function spaceCjkLatin(text: string): string {
  return text.replace(CJK_LATIN, '$1 $2').replace(LATIN_CJK, '$1 $2');
}
