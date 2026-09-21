export type DateInputMode = 'date' | 'time' | 'datetime';

/** 仅接受无时区原生输入值，不让 Date 的宽松解析改写日历含义。 */
export function dateInputNumber(value: string, mode: DateInputMode): number | undefined {
  const day = '\\d{4}-\\d{2}-\\d{2}';
  const time = '\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d{1,3})?)?';
  if (!new RegExp(`^${mode === 'date' ? day : mode === 'time' ? time : `${day}T${time}`}$`).test(value)) return;
  const source = mode === 'date' ? `${value}T00:00` : mode === 'time' ? `2000-01-01T${value}` : value;
  const [date, clock = ''] = source.split('T');
  if (date?.startsWith('0000-')) return;
  const [hours, minutes, seconds = '00'] = clock.split(':');
  const [wholeSeconds, fraction = ''] = seconds.split('.');
  const canonical = `${date}T${hours}:${minutes}:${wholeSeconds}.${fraction.padEnd(3, '0')}Z`;
  const parsed = new Date(canonical);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== canonical) return;
  return parsed.getTime();
}

export function dateInputAllowed(
  value: string, mode: DateInputMode, min?: string, max?: string,
  disabledDate?: (date: string) => boolean,
): boolean {
  const number = dateInputNumber(value, mode);
  if (number === undefined) return false;
  const lower = min === undefined ? undefined : dateInputNumber(min, mode);
  const upper = max === undefined ? undefined : dateInputNumber(max, mode);
  if ((min !== undefined && lower === undefined) || (max !== undefined && upper === undefined)) return false;
  if ((lower !== undefined && number < lower) || (upper !== undefined && number > upper)) return false;
  try {
    return mode === 'time' || !disabledDate?.(value.slice(0, 10));
  } catch {
    return false;
  }
}
