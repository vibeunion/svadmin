/**
 * 文案格式层，对齐 Arco 文案规范里已经有宿主可用的几条：
 * 24 小时制、超过四位整数才千分位、中西文之间留空格、省略号用「…」。
 * 不是一套新的 i18n 框架。
 */

export interface AdminTimeOptions {
  /** 需要日期时传入。不要和 `month` / `day` 同时用。 */
  dateStyle?: Intl.DateTimeFormatOptions['dateStyle'];
  /** 默认包含秒。只要时分时传 false。 */
  seconds?: boolean;
  locale?: string;
  timeZone?: string;
  year?: Intl.DateTimeFormatOptions['year'];
  month?: Intl.DateTimeFormatOptions['month'];
  day?: Intl.DateTimeFormatOptions['day'];
}

/** 24 小时制。`hourCycle: 'h23'` 避免 en-US 默认的 12 小时。 */
export function formatAdminTime(value: Date | number | string, options: AdminTimeOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  // dateStyle 不能再和 hour/minute 字段同时出现，否则 Intl 会抛错。
  if (options.dateStyle) {
    return new Intl.DateTimeFormat(options.locale, {
      dateStyle: options.dateStyle,
      timeStyle: options.seconds === false ? 'short' : 'medium',
      hourCycle: 'h23',
      ...(options.timeZone ? { timeZone: options.timeZone } : {}),
    }).format(date);
  }
  const fields: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  };
  if (options.seconds !== false) fields.second = '2-digit';
  if (options.year) fields.year = options.year;
  if (options.month) fields.month = options.month;
  if (options.day) fields.day = options.day;
  if (options.timeZone) fields.timeZone = options.timeZone;
  return new Intl.DateTimeFormat(options.locale, fields).format(date);
}

export interface AdminNumberOptions {
  /**
   * 省略时用 zh-CN。
   * 传 `null` 表示沿用运行时默认语言，用来替换原来的 `toLocaleString()`。
   */
  locale?: string | null;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * 超过四位的整数必须千分位。四位及以内沿用当前 locale 的分节，
 * 不把 en-US 的 9,999 或 de-DE 的 1.234,5 改成不分节。小数部分不分节。
 */
export function formatAdminNumber(
  value: number,
  localeOrOptions: string | AdminNumberOptions = 'zh-CN',
): string {
  if (!Number.isFinite(value)) return '';
  const options: AdminNumberOptions = typeof localeOrOptions === 'string'
    ? { locale: localeOrOptions }
    : localeOrOptions;
  const locale = options.locale === null ? undefined : (options.locale ?? 'zh-CN');
  const minimumFractionDigits = options.minimumFractionDigits ?? 0;
  const maximumFractionDigits = options.maximumFractionDigits ?? 20;
  if (minimumFractionDigits > maximumFractionDigits) return '';
  return new Intl.NumberFormat(locale, {
    useGrouping: true,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

const CJK_CHAR = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

/** 「7号线」以及「3D」「HTML5」这类型号不表数量，两侧都不插空格。 */
function isNonQuantityToken(token: string, nextChar: string): boolean {
  if (/^\d+$/.test(token) && nextChar === '号') return true;
  return /[A-Za-z]/.test(token) && /\d/.test(token);
}

/**
 * 在汉字与拉丁字母或数字之间插入一个空格。
 * 不处理全角标点。「7号线」「3D打印」这类不表数量的数字保持紧挨。
 */
export function spaceCjkLatin(text: string): string {
  const parts = text.split(/([A-Za-z0-9]+)/);
  let out = '';
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] ?? '';
    if (index % 2 === 0) {
      out += part;
      continue;
    }
    const prev = parts[index - 1] ?? '';
    const next = parts[index + 1] ?? '';
    const nonQuantity = isNonQuantityToken(part, next.slice(0, 1));
    if (!nonQuantity && CJK_CHAR.test(prev.slice(-1)) && !prev.endsWith(' ')) out += ' ';
    out += part;
    if (!nonQuantity && CJK_CHAR.test(next.slice(0, 1)) && !next.startsWith(' ')) out += ' ';
  }
  return out;
}

/** 连续三个及以上的半角句点换成省略号。小数点和代码里的单点不动。 */
export function formatAdminEllipsis(text: string): string {
  return text.replace(/\.{3,}/g, '…');
}

/** 共享展示字符串先换省略号，再补中西文空格。不改写用词。 */
export function formatAdminCopy(text: string): string {
  return spaceCjkLatin(formatAdminEllipsis(text));
}

export interface AdminCurrencyOptions extends AdminNumberOptions {
  /** 默认 CNY。 */
  currency?: string;
  notation?: 'standard' | 'compact';
}

/**
 * 货币符号后面不加空格。小数分隔仍由 locale 决定。
 * 结尾货币符号（如 `€`）前面的空格保留，那是符号前的间距。
 */
export function formatAdminCurrency(
  value: number,
  localeOrOptions: string | AdminCurrencyOptions = 'zh-CN',
): string {
  if (!Number.isFinite(value)) return '';
  const options: AdminCurrencyOptions = typeof localeOrOptions === 'string'
    ? { locale: localeOrOptions }
    : localeOrOptions;
  const locale = options.locale === null ? undefined : (options.locale ?? 'zh-CN');
  const currency = options.currency ?? 'CNY';
  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      useGrouping: true,
      ...(options.minimumFractionDigits !== undefined ? { minimumFractionDigits: options.minimumFractionDigits } : {}),
      ...(options.maximumFractionDigits !== undefined ? { maximumFractionDigits: options.maximumFractionDigits } : {}),
      ...(options.notation === 'compact' ? { notation: 'compact', compactDisplay: 'short' } : {}),
    }).format(value);
    return formatted.replace(/^(\p{Sc})\s+/u, '$1');
  } catch {
    return '';
  }
}

export interface AdminPercentOptions extends AdminNumberOptions {
  /** `ratio` 把 0.12 格式化成 12%。`points` 把 12 格式化成 12%。 */
  scale?: 'ratio' | 'points';
}

/** 百分号前面不加空格。 */
export function formatAdminPercent(
  value: number,
  localeOrOptions: string | AdminPercentOptions = 'zh-CN',
): string {
  if (!Number.isFinite(value)) return '';
  const options: AdminPercentOptions = typeof localeOrOptions === 'string'
    ? { locale: localeOrOptions }
    : localeOrOptions;
  const locale = options.locale === null ? undefined : (options.locale ?? 'zh-CN');
  const maximumFractionDigits = options.maximumFractionDigits ?? (options.scale === 'points' ? 20 : 0);
  const minimumFractionDigits = options.minimumFractionDigits ?? 0;
  if (options.scale === 'points') {
    const amount = formatAdminNumber(value, {
      locale: options.locale === null ? null : locale,
      minimumFractionDigits,
      maximumFractionDigits,
    });
    return `${amount}%`;
  }
  const formatted = new Intl.NumberFormat(locale, {
    style: 'percent',
    useGrouping: true,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
  return formatted.replace(/\s+(?=%)/g, '');
}

export interface AdminDateOptions {
  locale?: string;
  timeZone?: string;
  dateStyle?: Intl.DateTimeFormatOptions['dateStyle'];
  weekday?: Intl.DateTimeFormatOptions['weekday'];
  year?: Intl.DateTimeFormatOptions['year'];
  month?: Intl.DateTimeFormatOptions['month'];
  day?: Intl.DateTimeFormatOptions['day'];
}

/** 只输出日期，不带时间。和 `formatAdminTime` 的日期加时间分开。 */
export function formatAdminDate(value: Date | number | string, options: AdminDateOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const fields: Intl.DateTimeFormatOptions = {};
  if (options.dateStyle && !options.weekday && !options.year && !options.month && !options.day) {
    fields.dateStyle = options.dateStyle;
  } else if (options.weekday || options.year || options.month || options.day) {
    if (options.weekday) fields.weekday = options.weekday;
    if (options.year) fields.year = options.year;
    if (options.month) fields.month = options.month;
    if (options.day) fields.day = options.day;
  } else {
    fields.dateStyle = options.dateStyle ?? 'medium';
  }
  if (options.timeZone) fields.timeZone = options.timeZone;
  return new Intl.DateTimeFormat(options.locale, fields).format(date);
}
