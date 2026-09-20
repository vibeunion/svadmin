export interface DisplayDate {
  date: Date;
  civil: boolean;
  title: string;
}

export function parseDisplayDate(value: string | number | Date | null | undefined): DisplayDate | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') {
    const calendar = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?))?$/.exec(value);
    const time = /^\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value);
    if (calendar || time) {
      const day = calendar?.[1] ?? '2000-01-01';
      const clock = calendar ? calendar[2] ?? '00:00' : value;
      const [hours, minutes, seconds = '00'] = clock.split(':');
      const [wholeSeconds, fraction = ''] = seconds.split('.');
      const canonical = `${day}T${hours}:${minutes}:${wholeSeconds}.${fraction.padEnd(3, '0')}Z`;
      // UTC 仅作为无时区日历值的格式化载体，绝不作为真实时间点输出。
      const date = new Date(canonical);
      if (!Number.isFinite(date.getTime()) || date.toISOString() !== canonical) return undefined;
      return { date, civil: true, title: value };
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return { date, civil: false, title: date.toISOString() };
}
