/** 导出当前展示的记录；不声称导出了服务端完整数据集。 */
export function downloadRows(filename: string, rows: readonly object[]): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
