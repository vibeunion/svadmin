/** 原生 time 输入没有日期/时区；使用本地锚点格式化，不能按 ISO 时间戳解析。 */
export function dateFieldValue(value: string | number | Date, timeOnly: boolean): Date {
  if (timeOnly && typeof value === 'string') {
    const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/u.exec(value);
    if (match) {
      const hour = Number(match[1]), minute = Number(match[2]), second = Number(match[3] ?? 0);
      if (hour > 23 || minute > 59 || second > 59) return new Date(NaN);
      return new Date(1970, 0, 1, hour, minute, second, Number((match[4] ?? '').padEnd(3, '0')));
    }
  }
  return value instanceof Date ? value : new Date(value);
}
