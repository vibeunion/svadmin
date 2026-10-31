/**
 * 基础控件文案扩展点。
 *
 * 解析顺序：组件 `locale` 属性 > ConfigProvider.locale（仅当树中存在 Provider）> i18n.locale > `en`。
 * 词条先走 i18n key；宿主没有该 key 时，回退到本目录的中文 / 英文表。
 * 新的基础控件不要再写死 Previous、Clear 等英文，改为调用 `componentText`，并在下面的目录补一条词条。
 */

export const componentMessageCatalog = {
  'datePicker.previous': { en: 'Previous', zh: '上一个' },
  'datePicker.next': { en: 'Next', zh: '下一个' },
  'datePicker.clear': { en: 'Clear', zh: '清除' },
  'datePicker.selectDate': { en: 'Select date', zh: '选择日期' },
  'datePicker.previousMonth': { en: 'Previous month', zh: '上个月' },
  'datePicker.nextMonth': { en: 'Next month', zh: '下个月' },
  'datePicker.previousYear': { en: 'Previous year', zh: '上一年' },
  'datePicker.nextYear': { en: 'Next year', zh: '下一年' },
  'datePicker.calendarDates': { en: 'Calendar dates', zh: '日历日期' },
} as const;

export type ComponentMessageKey = keyof typeof componentMessageCatalog;

export interface ComponentMessageSource {
  t: (key: string) => string;
}

export function resolveComponentLocale(input: {
  // 省略、null、undefined 都表示这一级没有 locale。
  // Svelte 可选属性读出来是 undefined，不能只接受 null。
  explicit?: string | null | undefined;
  configLocale?: string | null | undefined;
  i18nLocale?: string | null | undefined;
}): string {
  const explicit = input.explicit?.trim();
  if (explicit) return explicit;
  const configLocale = input.configLocale?.trim();
  if (configLocale) return configLocale;
  const i18nLocale = input.i18nLocale?.trim();
  if (i18nLocale) return i18nLocale;
  return 'en';
}

/** 宿主翻译优先；缺失时按已解析 locale 选择内置中文或英文。 */
export function componentText(i18n: ComponentMessageSource, locale: string, key: ComponentMessageKey): string {
  const translated = i18n.t(key);
  if (translated !== key) return translated;
  const entry = componentMessageCatalog[key];
  return locale.toLowerCase().startsWith('zh') ? entry.zh : entry.en;
}

/** 星期一为一周起点的短星期标签，供日期面板使用。 */
export function weekdayLabels(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 2024-01-01 是星期一。取正午，避免时区把日期拨到前一天。
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2024, 0, 1 + index, 12)));
}

export function monthLabel(locale: string, year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, monthIndex, 1, 12));
}
