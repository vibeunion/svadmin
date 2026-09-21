import { Type, type Static } from '@sinclair/typebox';
import { snapshotPlainData } from './plain-data';
import { checkExact } from './schema-validation';

export const SPREADSHEET_WORKBOOK_LIMITS = Object.freeze({
  maxSheets: 32, maxRows: 1000, maxCols: 100, maxCells: 10_000,
  maxCellLength: 10_000, maxTotalText: 1_000_000, maxJsonLength: 10_000_000,
});
const formatSchema = Type.Object({
  numberFormat: Type.Optional(Type.Union([Type.Literal('general'), Type.Literal('number'), Type.Literal('percent')])),
  decimalPlaces: Type.Optional(Type.Integer({ minimum: 0, maximum: 20 })),
  bold: Type.Optional(Type.Boolean()), italic: Type.Optional(Type.Boolean()),
  align: Type.Optional(Type.Union([Type.Literal('left'), Type.Literal('center'), Type.Literal('right')])),
}, { additionalProperties: false });
export type SpreadsheetCellFormat = Static<typeof formatSchema>;
const sheetSchema = Type.Object({
  id: Type.String({ minLength: 1, maxLength: 200 }), name: Type.String({ minLength: 1, maxLength: 200 }),
  rows: Type.Integer({ minimum: 1, maximum: 1000 }), cols: Type.Integer({ minimum: 1, maximum: 100 }),
  cells: Type.Record(Type.String({ pattern: '^[A-Z]{1,2}[1-9][0-9]{0,3}$' }), Type.String({ maxLength: 10_000 })),
  formats: Type.Optional(Type.Record(Type.String({ pattern: '^[A-Z]{1,2}[1-9][0-9]{0,3}$' }), formatSchema)),
}, { additionalProperties: false });
export type SpreadsheetSheet = Static<typeof sheetSchema>;
const workbookSchema = Type.Object({
  protocolVersion: Type.Literal(1), sheets: Type.Array(sheetSchema, { minItems: 1, maxItems: 32 }),
  activeSheetId: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
}, { additionalProperties: false });
export type SpreadsheetWorkbook = Static<typeof workbookSchema>;
function inside(key: string, sheet: SpreadsheetSheet): boolean {
  const match = /^([A-Z]{1,2})([1-9][0-9]{0,3})$/.exec(key);
  if (!match) return false;
  let column = 0;
  for (const char of match[1] ?? '') column = column * 26 + char.charCodeAt(0) - 64;
  return column <= sheet.cols && Number(match[2]) <= sheet.rows;
}
export function snapshotSpreadsheetWorkbook(value: unknown): SpreadsheetWorkbook | undefined {
  try {
    const plain = snapshotPlainData(value);
    if (!checkExact(workbookSchema, plain)) return;
    const ids = new Set<string>();
    let totalText = 0;
    for (const sheet of plain.sheets) {
      if (!sheet.id.trim() || !sheet.name.trim() || ids.has(sheet.id)
        || sheet.rows * sheet.cols > SPREADSHEET_WORKBOOK_LIMITS.maxCells) return;
      ids.add(sheet.id);
      for (const [key, text] of Object.entries(sheet.cells)) {
        if (!inside(key, sheet)) return;
        totalText += text.length;
        if (totalText > SPREADSHEET_WORKBOOK_LIMITS.maxTotalText) return;
      }
      for (const key of Object.keys(sheet.formats ?? {})) if (!inside(key, sheet)) return;
    }
    if (plain.activeSheetId !== undefined && !ids.has(plain.activeSheetId)) return;
    if (JSON.stringify(plain).length > SPREADSHEET_WORKBOOK_LIMITS.maxJsonLength) return;
    return plain;
  } catch { return; }
}
export function serializeSpreadsheetWorkbook(value: unknown): string | undefined {
  const workbook = snapshotSpreadsheetWorkbook(value);
  return workbook ? JSON.stringify(workbook) : undefined;
}
export function parseSpreadsheetWorkbook(value: string): SpreadsheetWorkbook | undefined {
  if (typeof value !== 'string' || value.length > SPREADSHEET_WORKBOOK_LIMITS.maxJsonLength) return;
  try { return snapshotSpreadsheetWorkbook(JSON.parse(value)); } catch { return; }
}
