import type { Cell, Workbook, Worksheet } from 'exceljs';
import { snapshotSpreadsheetWorkbook, type SpreadsheetWorkbook, type SpreadsheetCellFormat } from './spreadsheet-workbook';

export interface SpreadsheetXlsxOptions {
  exceljs?: { Workbook: new () => Workbook };
}

export interface SpreadsheetXlsxImportLimits {
  maxBytes?: number;
  maxSheets?: number;
  maxRows?: number;
  maxCols?: number;
  maxCells?: number;
  maxCellLength?: number;
}

export interface SpreadsheetXlsxImportOptions extends SpreadsheetXlsxImportLimits {
  exceljs?: { Workbook: new () => Workbook };
  signal?: AbortSignal;
}

const DEFAULT_IMPORT_LIMITS: Required<SpreadsheetXlsxImportLimits> = {
  maxBytes: 25 * 1024 * 1024,
  maxSheets: 32,
  maxRows: 1000,
  maxCols: 100,
  maxCells: 10_000,
  maxCellLength: 10_000,
};

function checkImport(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new Error('aborted');
}

function cellText(cell: { value: unknown; formula?: string; result?: unknown }): string {
  if (typeof cell.formula === 'string') return `=${cell.formula}`;
  if (cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'string') return cell.value;
  if (typeof cell.value === 'number' || typeof cell.value === 'boolean') return String(cell.value);
  if (typeof cell.value === 'object' && cell.value !== null && 'text' in cell.value
    && typeof cell.value.text === 'string') return cell.value.text;
  return '';
}

function cellFormat(cell: Cell): SpreadsheetCellFormat | undefined {
  const format: SpreadsheetCellFormat = {};
  if (cell.font?.bold !== undefined) format.bold = cell.font.bold;
  if (cell.font?.italic !== undefined) format.italic = cell.font.italic;
  if (cell.alignment?.horizontal === 'left' || cell.alignment?.horizontal === 'center'
    || cell.alignment?.horizontal === 'right') format.align = cell.alignment.horizontal;
  if (cell.numFmt?.includes('%')) format.numberFormat = 'percent';
  else if (cell.numFmt?.includes('0') || cell.numFmt?.includes('#')) format.numberFormat = 'number';
  return Object.keys(format).length > 0 ? format : undefined;
}

function worksheetData(
  worksheet: Worksheet,
  limits: Required<SpreadsheetXlsxImportLimits>,
  signal: AbortSignal | undefined,
): SpreadsheetWorkbook['sheets'][number] {
  const rows = worksheet.rowCount;
  const cols = worksheet.columnCount;
  if (!Number.isSafeInteger(rows) || rows <= 0 || rows > limits.maxRows
    || !Number.isSafeInteger(cols) || cols <= 0 || cols > limits.maxCols
    || rows * cols > limits.maxCells) throw new Error('limit');
  const cells: Record<string, string> = {};
  const formats: Record<string, SpreadsheetCellFormat> = {};
  for (let row = 1; row <= rows; row += 1) {
    checkImport(signal);
    for (let col = 1; col <= cols; col += 1) {
      const cell = worksheet.getCell(row, col);
      const text = cellText(cell);
      if (text.length > limits.maxCellLength) throw new Error('limit');
      const format = cellFormat(cell);
      if (text !== '') {
        cells[cell.address] = text;
      }
      if (format) formats[cell.address] = format;
    }
  }
  return {
    // XLSX 不保存 SVAdmin 的内部 sheet id；名称是唯一可复现的导入身份。
    id: worksheet.name,
    name: worksheet.name,
    rows,
    cols,
    cells,
    ...(Object.keys(formats).length > 0 ? { formats } : {}),
  };
}

/** 读取有界 XLSX；失败、超限或取消时原子返回 undefined。 */
export async function parseSpreadsheetXlsx(
  bytes: unknown,
  options: SpreadsheetXlsxImportOptions = {},
): Promise<SpreadsheetWorkbook | undefined> {
  const limits = {
    ...DEFAULT_IMPORT_LIMITS,
    ...Object.fromEntries(Object.entries(options).filter(([key]) => key.startsWith('max'))),
  } as Required<SpreadsheetXlsxImportLimits>;
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > limits.maxBytes) return;
  try {
    checkImport(options.signal);
    const ExcelJS = options.exceljs ?? (await import('exceljs')).default;
    checkImport(options.signal);
    const workbook = new ExcelJS.Workbook();
    type XlsxInput = Parameters<typeof workbook.xlsx.load>[0];
    const xlsxBytes = new Uint8Array(bytes).slice().buffer as ArrayBuffer;
    await workbook.xlsx.load(xlsxBytes as XlsxInput);
    checkImport(options.signal);
    if (workbook.worksheets.length === 0 || workbook.worksheets.length > limits.maxSheets) return;
    const sheets = workbook.worksheets.map((worksheet) => worksheetData(worksheet, limits, options.signal));
    const activeIndex = workbook.views[0]?.activeTab ?? 0;
    const activeSheetId = sheets[activeIndex]?.id ?? sheets[0]?.id;
    if (!activeSheetId) return;
    return snapshotSpreadsheetWorkbook({ protocolVersion: 1, activeSheetId, sheets });
  } catch {
    return;
  }
}

function numberFormat(format: string | undefined, decimalPlaces: number | undefined): string | undefined {
  const places = decimalPlaces === undefined ? 2 : decimalPlaces;
  const fraction = places ? `.${'0'.repeat(places)}` : '';
  if (format === 'percent') return `0${fraction}%`;
  if (format === 'number') return `#,##0${fraction}`;
  return undefined;
}

/** 公式按文本保留，避免将不可信内容升级为 Excel 可执行公式。 */
export async function serializeSpreadsheetXlsx(
  value: unknown, options: SpreadsheetXlsxOptions = {},
): Promise<Uint8Array | undefined> {
  const workbook = snapshotSpreadsheetWorkbook(value);
  if (!workbook) return;
  const names = new Set<string>();
  for (const sheet of workbook.sheets) {
    const name = sheet.name.toLowerCase();
    if (sheet.name.length > 31 || /[\\/*?:[\]]/.test(sheet.name)
      || [...sheet.name].some(character => character.charCodeAt(0) < 32)
      || sheet.name.startsWith("'") || sheet.name.endsWith("'")
      || name === 'history' || names.has(name)) return;
    names.add(name);
  }
  try {
    const ExcelJS = options.exceljs ?? (await import('exceljs')).default;
    const output = new ExcelJS.Workbook();
    output.views = [{
      x: 0, y: 0, width: 1200, height: 800, firstSheet: 0, visibility: 'visible',
      activeTab: Math.max(0, workbook.sheets.findIndex(sheet => sheet.id === workbook.activeSheetId)),
    }];
    for (const sheet of workbook.sheets) {
      const target = output.addWorksheet(sheet.name);
      // 空白尾部也属于网格，避免导出后尺寸缩小到最后一个非空单元格。
      target.getCell(sheet.rows, sheet.cols).value = '';
      const addresses = new Set([...Object.keys(sheet.cells), ...Object.keys(sheet.formats ?? {})]);
      for (const address of addresses) {
        const raw = sheet.cells[address] ?? '';
        const cell = target.getCell(address);
        const format = sheet.formats?.[address];
        const numeric = Number(raw);
        const explicitNumber = format?.numberFormat === 'number' || format?.numberFormat === 'percent';
        cell.value = explicitNumber && raw !== '' && Number.isFinite(numeric)
          && String(numeric) === raw && Math.abs(numeric) <= Number.MAX_SAFE_INTEGER ? numeric : raw;
        if (format) {
          cell.font = {
            ...(format.bold === undefined ? {} : { bold: format.bold }),
            ...(format.italic === undefined ? {} : { italic: format.italic }),
          };
          if (format.align !== undefined) cell.alignment = { horizontal: format.align };
          const numFmt = numberFormat(format.numberFormat, format.decimalPlaces);
          if (numFmt !== undefined) cell.numFmt = numFmt;
        }
      }
    }
    const result = await output.xlsx.writeBuffer();
    return new Uint8Array(result);
  } catch {
    return;
  }
}
