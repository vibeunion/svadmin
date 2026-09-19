type NumberKey<T> = { [K in keyof T]-?: T[K] extends number ? K : never }[keyof T];

export function valueText<T extends object>(row: T, key: keyof NoInfer<T>): string {
  return String(row[key] ?? '—');
}
export function valueNumber<T extends object>(row: T, key: NumberKey<NoInfer<T>>): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Invalid numeric rendering field');
  return value;
}
export function countBy<T extends object, K extends keyof T>(rows: readonly T[], key: K, value: NoInfer<T>[K]): number {
  return rows.filter(row => row[key] === value).length;
}
export function sumBy<T extends object>(rows: readonly T[], key: NumberKey<NoInfer<T>>): number {
  return rows.reduce((sum, row) => sum + valueNumber(row, key), 0);
}
export function averageBy<T extends object>(rows: readonly T[], key: NumberKey<NoInfer<T>>): number {
  return rows.length ? Math.round(sumBy(rows, key) / rows.length) : 0;
}
export function absoluteSumBy<T extends object>(rows: readonly T[], key: NumberKey<NoInfer<T>>): number {
  return rows.reduce((sum, row) => sum + Math.abs(valueNumber(row, key)), 0);
}

/** 关系显示允许缺失关联记录，但不把错误的数值转换成 0。 */
export function findLabel<T extends { id: number }>(
  records: readonly T[], id: unknown, fallback: string, key?: keyof NoInfer<T>,
): string {
  const record = records.find(record => record.id === id);
  if (!record) return fallback;
  if (key !== undefined) return String(record[key] ?? fallback);
  return 'name' in record && typeof record.name === 'string' ? record.name : fallback;
}
