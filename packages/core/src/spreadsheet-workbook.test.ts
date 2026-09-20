import { describe, expect, it } from 'bun:test';
import { parseSpreadsheetWorkbook, serializeSpreadsheetWorkbook, snapshotSpreadsheetWorkbook } from './spreadsheet-workbook';
import { parseSpreadsheetXlsx, serializeSpreadsheetXlsx } from './spreadsheet-xlsx';
import ExcelJS from 'exceljs';

const sheet = () => ({ id: 'one', name: 'One', rows: 2, cols: 2, cells: { A1: '=1+1' } });
const workbook = () => ({ protocolVersion: 1 as const, sheets: [sheet()], activeSheetId: 'one' });
const xlsxBuffer = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer as ArrayBuffer;
describe('spreadsheet workbook protocol', () => {
  it('exports a validated workbook as a real XLSX binary through an injected engine', async () => {
    const result = await serializeSpreadsheetXlsx({
      protocolVersion: 1, sheets: [{ id: 'one', name: 'One', rows: 2, cols: 2,
        cells: { A1: '12', B1: '=A1*2', A2: '001' },
        formats: { A1: { numberFormat: 'number', decimalPlaces: 2, bold: true }, B2: { italic: true } } }],
    }, { exceljs: ExcelJS });
    if (!result) throw new Error('Expected XLSX');
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(xlsxBuffer(result));
    const output = reopened.getWorksheet('One');
    if (!output) throw new Error('Expected sheet');
    expect(output.getCell('A1').value).toBe(12);
    expect(output.getCell('A1').numFmt).toBe('#,##0.00');
    expect(output.getCell('A1').font.bold).toBe(true);
    expect(output.getCell('B1').value).toBe('=A1*2');
    expect(output.getCell('A2').value).toBe('001');
    expect(output.getCell('B2').font.italic).toBe(true);
  });

  it.each(['a/b', 'x'.repeat(32), "'quoted", 'History'])('rejects invalid XLSX sheet name %s', async name => {
    expect(await serializeSpreadsheetXlsx({ ...workbook(), sheets: [{ ...sheet(), name }] })).toBeUndefined();
  });

  it('rejects case-insensitive duplicate XLSX sheet names', async () => {
    expect(await serializeSpreadsheetXlsx({ protocolVersion: 1, sheets: [
      sheet(), { ...sheet(), id: 'two', name: 'ONE' },
    ] })).toBeUndefined();
  });

  it('loads the optional engine lazily and exports multiple worksheets with zero decimal formats', async () => {
    const result = await serializeSpreadsheetXlsx({ protocolVersion: 1, sheets: [
      { ...sheet(), cells: { A1: '0.5' }, formats: { A1: { numberFormat: 'percent', decimalPlaces: 0 } } },
      { ...sheet(), id: 'two', name: 'Two', cells: { A1: '1' } },
    ] });
    if (!result) throw new Error('Expected XLSX');
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(xlsxBuffer(result));
    expect(reopened.worksheets.map(sheet => sheet.name)).toEqual(['One', 'Two']);
    expect(reopened.getWorksheet('One')?.getCell('A1').numFmt).toBe('0%');
    expect(reopened.getWorksheet('Two')?.getCell('A1').value).toBe('1');
  });

  it('round-trips all sheets, raw formulas and formatting without evaluating', () => {
    const input = { ...workbook(), protocolVersion: 1 as const, sheets: [
      { ...sheet(), formats: { A1: { bold: true, numberFormat: 'percent' as const, decimalPlaces: 3 }, B2: { italic: true } } },
      { ...sheet(), id: 'two', cells: { A1: '001', B2: '' } },
    ] };
    const json = serializeSpreadsheetWorkbook(input);
    expect(json).toBeDefined();
    expect(parseSpreadsheetWorkbook(json!)).toEqual(input);
  });

  it('preserves the active worksheet and declared blank grid extents in XLSX', async () => {
    const result = await serializeSpreadsheetXlsx({
      protocolVersion: 1 as const, activeSheetId: 'second',
      sheets: [
        { id: 'first', name: 'First', rows: 8, cols: 5, cells: { A1: 'start', E8: 'edge' } },
        { id: 'second', name: 'Second', rows: 12, cols: 7, cells: {} },
      ],
    });
    if (!result) throw new Error('Expected XLSX');
    const output = new ExcelJS.Workbook();
    await output.xlsx.load(xlsxBuffer(result));
    expect(output.views[0]?.activeTab).toBe(1);
    expect(output.getWorksheet('First')?.rowCount).toBe(8);
    expect(output.getWorksheet('First')?.columnCount).toBe(5);
    expect(output.getWorksheet('First')?.getCell('E8').value).toBe('edge');
    expect(output.getWorksheet('Second')?.rowCount).toBe(12);
    expect(output.getWorksheet('Second')?.columnCount).toBe(7);
  });

  it('parses a bounded XLSX back into the safe workbook protocol without evaluating formulas', async () => {
    const bytes = await serializeSpreadsheetXlsx({
      protocolVersion: 1,
      activeSheetId: 'one',
      sheets: [{
        id: 'one', name: 'One', rows: 2, cols: 2,
        cells: { A1: '12', B1: '=A1*2', A2: '001' },
        formats: { A1: { numberFormat: 'number', decimalPlaces: 2, bold: true } },
      }],
    }, { exceljs: ExcelJS });
    if (!bytes) throw new Error('Expected XLSX');
    await expect(parseSpreadsheetXlsx(bytes, { exceljs: ExcelJS })).resolves.toMatchObject({
      activeSheetId: 'One',
      sheets: [{
        id: 'One',
        name: 'One',
        rows: 2,
        cols: 2,
        cells: { A1: '12', B1: '=A1*2', A2: '001' },
      }],
    });
  });

  it('rejects oversized or aborted XLSX input before accepting a partial workbook', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(parseSpreadsheetXlsx(new Uint8Array([80, 75]), {
      exceljs: ExcelJS, signal: controller.signal,
    })).resolves.toBeUndefined();
    await expect(parseSpreadsheetXlsx(new Uint8Array([80, 75]), {
      exceljs: ExcelJS, maxBytes: 1,
    })).resolves.toBeUndefined();
  });
  it('isolates the snapshot from caller mutations', () => {
    const input = workbook();
    const output = snapshotSpreadsheetWorkbook(input);
    input.sheets[0]!.cells.A1 = 'changed';
    expect(output?.sheets[0]?.cells['A1']).toBe('=1+1');
  });
  it.each([
    { ...workbook(), protocolVersion: 2 },
    { ...workbook(), extra: true },
    { ...workbook(), activeSheetId: 'missing' },
    { ...workbook(), sheets: [] },
    { ...workbook(), sheets: [sheet(), sheet()] },
    { ...workbook(), sheets: [{ ...sheet(), rows: 1001 }] },
    { ...workbook(), sheets: [{ ...sheet(), rows: 1000, cols: 100 }] },
    { ...workbook(), sheets: [{ ...sheet(), cells: { C1: 'out' } }] },
    { ...workbook(), sheets: [{ ...sheet(), cells: { A01: 'invalid' } }] },
    { ...workbook(), sheets: [{ ...sheet(), cells: { A1: 'x'.repeat(10_001) } }] },
    { ...workbook(), sheets: [{ ...sheet(), formats: { C1: { bold: true } } }] },
    { ...workbook(), sheets: [{ ...sheet(), formats: { A1: { numberFormat: 'script' } } }] },
    { ...workbook(), sheets: [{ ...sheet(), formats: { A1: { bold: 'true' } } }] },
    { ...workbook(), sheets: [{ ...sheet(), formats: { A1: { unknown: true } } }] },
  ])('rejects an invalid workbook atomically', value => {
    expect(snapshotSpreadsheetWorkbook(value)).toBeUndefined();
    expect(serializeSpreadsheetWorkbook(value)).toBeUndefined();
  });
  it('rejects invalid JSON, oversized text and accessors', () => {
    expect(parseSpreadsheetWorkbook('{')).toBeUndefined();
    expect(parseSpreadsheetWorkbook(' '.repeat(10_000_001))).toBeUndefined();
    let called = false;
    expect(snapshotSpreadsheetWorkbook({ get sheets() { called = true; return []; } })).toBeUndefined();
    expect(called).toBe(false);
  });
});
