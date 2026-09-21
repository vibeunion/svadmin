import Papa from 'papaparse';

/** 复制计算值而非可执行公式；文本中和与字段转义分别处理。 */
export function serializeSpreadsheetClipboard(rows: (string | number)[][], format: 'tsv' | 'csv'): string | undefined {
  const width = rows[0]?.length ?? 0;
  if (!rows.length || rows.length > 1000 || !width || width > 100 || rows.length * width > 10_000) return;
  const safe: string[][] = [];
  for (const row of rows) {
    if (row.length !== width) return;
    const values: string[] = [];
    for (const value of row) {
      if (typeof value !== 'string' && typeof value !== 'number') return;
      if (typeof value === 'number' && !Number.isFinite(value)) return;
      const text = typeof value === 'string' && (/^[\t\r\n]/.test(value) || /^\s*[=+@-]/.test(value))
        ? `'${value}` : String(value);
      if (text.length > 10_000) return;
      values.push(text);
    }
    safe.push(values);
  }
  const result = Papa.unparse(safe, { delimiter: format === 'csv' ? ',' : '\t', newline: '\n', quotes: true });
  return result.length <= 1_000_000 ? result : undefined;
}

/** 剪贴板采用显式分隔符，纯文本中的逗号不自动拆列。 */
export function parseSpreadsheetClipboard(text: string, format: 'tsv' | 'csv' = 'tsv'): string[][] | undefined {
  if (typeof text !== 'string' || text.length === 0 || text.length > 1_000_000
    || (format !== 'tsv' && format !== 'csv')) return undefined;
  const parsed = Papa.parse<string[]>(text, {
    delimiter: format === 'csv' ? ',' : '\t',
    dynamicTyping: false,
    skipEmptyLines: false,
    preview: 1002,
  });
  if (parsed.errors.length || parsed.meta.truncated) return undefined;
  const rows = parsed.data;
  // 只去掉行终止符生成的末尾空记录，保留中间空行和空单元格。
  if (/[\r\n]$/.test(text) && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === '') rows.pop();
  const columns = rows[0]?.length ?? 0;
  if (!rows.length || rows.length > 1000 || columns < 1 || columns > 100 || rows.length * columns > 10_000
    || rows.some(row => row.length !== columns || row.some(value => typeof value !== 'string' || value.length > 10_000))) {
    return undefined;
  }
  return rows;
}
