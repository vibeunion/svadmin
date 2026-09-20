import { fromDate, parseAbsolute, parseDateTime, toCalendarDateTime, toZoned } from '@internationalized/date';

export type DateTimeValueMode = 'civil' | 'instant';
export type DateTimeDisambiguation = 'reject' | 'earlier' | 'later';

const civilPattern = /^(?!0000)\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?$/;
const absolutePattern = /^(?!0000)\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function validTimeZone(timeZone: string): boolean {
  if (typeof timeZone !== 'string' || !timeZone.trim() || timeZone.length > 200) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** 默认拒绝夏令时重复或不存在的本地时间；消歧必须由调用方明确选择。 */
export function civilDateTimeToInstant(
  value: string, timeZone: string, disambiguation: DateTimeDisambiguation = 'reject',
): number | undefined {
  if (!civilPattern.test(value) || !validTimeZone(timeZone)
    || !['reject', 'earlier', 'later'].includes(disambiguation)) return;
  try {
    const civil = parseDateTime(value);
    const zoned = toZoned(civil, timeZone, disambiguation);
    // 不允许消歧策略把不存在的时间自动挪到夏令时跳跃前后。
    if (toCalendarDateTime(zoned).compare(civil) !== 0) return;
    return zoned.toDate().getTime();
  } catch {
    return;
  }
}

export function parseDateTimeInstant(value: string): number | undefined {
  if (!absolutePattern.test(value)) return;
  try {
    return parseAbsolute(value, 'UTC').toDate().getTime();
  } catch {
    return;
  }
}

export function formatCivilDateTime(instant: number, timeZone: string): string | undefined {
  if (!Number.isSafeInteger(instant) || !validTimeZone(timeZone)) return;
  try {
    const date = fromDate(new Date(instant), timeZone);
    if (date.era !== 'AD' || date.year < 1 || date.year > 9999) return;
    const civil = toCalendarDateTime(date).toString();
    return date.second === 0 && date.millisecond === 0 ? civil.slice(0, 16) : civil;
  } catch {
    return;
  }
}
