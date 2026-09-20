import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { parseCSV, parseSpreadsheetWorkbook, parseSpreadsheetClipboard, serializeSpreadsheetClipboard } from '@svadmin/core';
import { setLocale } from '@svadmin/core/i18n';
import SpreadsheetView, { type SheetData, type SpreadsheetLimits } from './SpreadsheetView.svelte';
import LiteSpreadsheetView from '../../../lite/src/components/LiteSpreadsheetView.svelte';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { svelte2tsx } from 'svelte2tsx';
import ts from 'typescript';

const sheet = (cells: Record<string, string> = {}, rows = 2, cols = 3): SheetData =>
  ({ id: 's', name: 'Report', rows, cols, cells });
function input(element: HTMLElement): HTMLInputElement {
  if (!(element instanceof HTMLInputElement)) throw new Error('Expected an input');
  return element;
}

beforeEach(() => setLocale('en'));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('SpreadsheetView safety and calculation boundaries', () => {
  it('only enables XLSX when an adapter is supplied and delivers a detached byte snapshot', async () => {
    const bytes = new Uint8Array([80, 75, 3, 4]);
    const xlsxexporter = vi.fn(async () => bytes);
    const onxlsxexport = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: '001' })] });
    expect(view.queryByRole('button', { name: 'Export XLSX' })).toBeNull();
    await view.rerender({ xlsxexporter, onxlsxexport, readonly: true });
    await fireEvent.click(view.getByRole('button', { name: 'Export XLSX' }));
    await waitFor(() => expect(onxlsxexport).toHaveBeenCalledTimes(1));
    expect(onxlsxexport).toHaveBeenCalledWith(bytes);
    expect(onxlsxexport.mock.calls[0]?.[0]).not.toBe(bytes);
    expect(xlsxexporter).toHaveBeenCalledWith(expect.objectContaining({
      protocolVersion: 1, sheets: [expect.objectContaining({ cells: { A1: '001' } })],
    }));
  });

  it.each(['scope', 'data', 'adapter', 'receiver', 'unmount'] as const)(
    'discards pending XLSX delivery after %s changes', async change => {
      let finish: (bytes: Uint8Array) => void = () => {};
      const xlsxexporter = vi.fn(() => new Promise<Uint8Array>(resolve => { finish = resolve; }));
      const onxlsxexport = vi.fn();
      const view = render(SpreadsheetView, {
        sheets: [sheet({ A1: 'old' })], xlsxexporter, onxlsxexport, scopeKey: 'first',
      });
      await fireEvent.click(view.getByRole('button', { name: 'Export XLSX' }));
      if (change === 'scope') await view.rerender({ scopeKey: 'second' });
      if (change === 'data') await view.rerender({ sheets: [sheet({ A1: 'new' })] });
      if (change === 'adapter') await view.rerender({ xlsxexporter: async () => undefined });
      if (change === 'receiver') await view.rerender({ onxlsxexport: vi.fn() });
      if (change === 'unmount') view.unmount();
      finish(new Uint8Array([80, 75, 3, 4]));
      await Promise.resolve();
      await Promise.resolve();
      expect(onxlsxexport).not.toHaveBeenCalled();
      expect(view.queryByRole('alert')).toBeNull();
    },
  );

  it('blocks duplicate XLSX requests until delivery finishes and allows retry after failure', async () => {
    let fail: (error: Error) => void = () => {};
    const onxlsxexport = vi.fn(() => new Promise<void>((_resolve, reject) => { fail = reject; }));
    const xlsxexporter = vi.fn(async () => new Uint8Array([80, 75, 3, 4]));
    const view = render(SpreadsheetView, { sheets: [sheet()], xlsxexporter, onxlsxexport });
    const button = view.getByRole('button', { name: 'Export XLSX' });
    await fireEvent.click(button);
    await waitFor(() => expect(onxlsxexport).toHaveBeenCalledTimes(1));
    await fireEvent.click(button);
    expect(xlsxexporter).toHaveBeenCalledTimes(1);
    expect(button).toHaveProperty('disabled', true);
    fail(new Error('private delivery failure'));
    await view.findByRole('alert');
    expect(view.queryByText('private delivery failure')).toBeNull();
    expect(button).toHaveProperty('disabled', false);
    onxlsxexport.mockResolvedValue(undefined);
    await fireEvent.click(button);
    await waitFor(() => expect(onxlsxexport).toHaveBeenCalledTimes(2));
    expect(view.queryByRole('alert')).toBeNull();
  });

  it.each([undefined, new Uint8Array(), new Uint8Array([1, 2, 3, 4])])(
    'rejects invalid XLSX adapter results without delivering them', async bytes => {
      const onxlsxexport = vi.fn();
      const view = render(SpreadsheetView, {
        sheets: [sheet()], xlsxexporter: async () => bytes, onxlsxexport,
      });
      await fireEvent.click(view.getByRole('button', { name: 'Export XLSX' }));
      await view.findByRole('alert');
      expect(onxlsxexport).not.toHaveBeenCalled();
    },
  );

  it('downloads XLSX with the correct MIME type and releases its object URL', async () => {
    vi.useFakeTimers();
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:xlsx');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let filename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { filename = this.download; });
    const view = render(SpreadsheetView, {
      sheets: [sheet()], xlsxexporter: async () => new Uint8Array([80, 75, 3, 4]),
    });
    await fireEvent.click(view.getByRole('button', { name: 'Export XLSX' }));
    expect(filename).toBe('workbook.xlsx');
    const blob = create.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    if (!(blob instanceof Blob)) throw new Error('Expected XLSX blob');
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(revoke).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:xlsx');
  });

  it('strictly compiles both sheet surfaces and the behavioral tests', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const components = [resolve(directory, 'SpreadsheetView.svelte'), resolve(directory, '../../../lite/src/components/LiteSpreadsheetView.svelte')];
    const virtual = new Map(components.map(filename =>
      [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code]));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, skipLibCheck: true,
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: ['svelte', 'node'], jsx: ts.JsxEmit.Preserve, allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = file => virtual.get(file) ?? read(file);
    host.fileExists = file => virtual.has(file) || exists(file);
    host.resolveModuleNames = (names, from) => names.map(name => {
      const file = resolve(dirname(from), `${name}.tsx`);
      return virtual.has(file) ? { resolvedFileName: file, extension: ts.Extension.Tsx }
        : ts.resolveModuleName(name, from, options, host).resolvedModule;
    });
    const targets = [...virtual.keys(), fileURLToPath(import.meta.url),
      resolve(directory, '../../../core/src/spreadsheet-clipboard.ts'),
      resolve(directory, '../../../core/src/spreadsheet-workbook.ts')];
    const program = ts.createProgram([...targets,
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts')], options, host);
    const diagnostics = targets.flatMap(file => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(diagnostics.map(diagnostic =>
      `${diagnostic.file?.fileName}:${diagnostic.start}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
    )).toEqual([]);
  }, 30_000);

  it.each([
    ['=SUM(A1:A9999999999999999999999999999999)', '#LIMIT!'],
    ['=SUM(A1:ZZZZZZZZZZZZZZZZZZZZ1)', '#LIMIT!'],
    ['=SUM(A1:A10001)', '#LIMIT!'],
    [`=${'('.repeat(40)}1${')'.repeat(40)}`, '#LIMIT!'],
    [`=${'-'.repeat(40)}1`, '#LIMIT!'],
    [`=${'1+'.repeat(600)}1`, '#LIMIT!'],
    ['=SUM(A0:A1)', '#VALUE!'],
    ['=A3', '#VALUE!'],
    ['=1 2', '#VALUE!'],
    ['=1/0', '#VALUE!'],
    ['=globalThis.alert(1)', '#VALUE!'],
    ['=B1', '#CYCLE!'],
  ])('fails safely for %s', (formula, expected) => {
    const view = render(SpreadsheetView, { sheets: [sheet({ B1: formula })], readonly: true });
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe(expected);
  });

  it('preserves arithmetic, whitespace, ranges and cycles with memoized dependencies', () => {
    const view = render(SpreadsheetView, { readonly: true, sheets: [sheet({
      A1: '3', B1: '4', C1: '= ( A1 + B1 ) * -2',
      A2: '=SUM( A1 : B1 )', B2: '=AVG(B1:A1)', C2: '=COUNT(A1:B1)',
    })] });
    expect(input(view.getByRole('textbox', { name: 'C1' })).value).toBe('-14');
    expect(input(view.getByRole('textbox', { name: 'A2' })).value).toBe('7');
    expect(input(view.getByRole('textbox', { name: 'B2' })).value).toBe('3.5');
    expect(input(view.getByRole('textbox', { name: 'C2' })).value).toBe('2');
  });

  it('evaluates bounded cross-sheet A1 references and ranges by sheet id or name', () => {
    const view = render(SpreadsheetView, {
      readonly: true,
      sheets: [
        { id: 'sheet1', name: 'Sheet 1', rows: 2, cols: 3,
          cells: { A1: `=Other!A1+'Second Sheet'!B1`, A2: '=SUM(Other!A1:Other!B1)' } },
        { id: 'other', name: 'Second Sheet', rows: 2, cols: 3, cells: { A1: '5', B1: '7' } },
      ],
    });
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('12');
    expect(input(view.getByRole('textbox', { name: 'A2' })).value).toBe('12');
  });

  it('supports bounded MIN and MAX range functions', () => {
    const view = render(SpreadsheetView, {
      readonly: true,
      sheets: [sheet({ A1: '4', B1: '9', C1: '=MIN(A1:B1)', D1: '=MAX(A1:B1)' }, 1, 4)],
    });
    expect(input(view.getByRole('textbox', { name: 'C1' })).value).toBe('4');
    expect(input(view.getByRole('textbox', { name: 'D1' })).value).toBe('9');
  });

  it('supports numeric IF branches while keeping formula evaluation bounded', () => {
    const view = render(SpreadsheetView, {
      readonly: true,
      sheets: [sheet({ A1: '2', B1: '=IF(A1-2,10,20)', C1: '=IF(A1-3,10,20)' }, 1, 3)],
    });
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe('20');
    expect(input(view.getByRole('textbox', { name: 'C1' })).value).toBe('10');
  });

  it('bounds long dependency chains and propagates the limit instead of replacing it with a value error', () => {
    const cells: Record<string, string> = {};
    for (let row = 1; row < 40; row++) cells[`A${row}`] = `=A${row + 1}+1`;
    cells['A40'] = '1';
    const view = render(SpreadsheetView, { readonly: true, sheets: [sheet(cells, 40, 1)] });
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('#LIMIT!');
  });

  it('memoizes duplicate dependency paths instead of consuming an exponential budget', () => {
    const cells: Record<string, string> = {};
    for (let row = 1; row < 12; row++) cells[`A${row}`] = `=A${row + 1}+A${row + 1}`;
    cells['A12'] = '1';
    const view = render(SpreadsheetView, {
      readonly: true, sheets: [sheet(cells, 12, 1)], limits: { maxFormulaSteps: 500 },
    });
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('2,048');
  });

  it('shares the work budget across the whole sheet and resets it only when inputs change', async () => {
    const onexport = vi.fn();
    const view = render(SpreadsheetView, {
      readonly: true, sheets: [sheet({ A1: '=1+1', B1: '=2+2', C1: '=3+3' }, 1, 3)],
      limits: { maxFormulaSteps: 10 }, onexport,
    });
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('2');
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe('#LIMIT!');
    await fireEvent.click(view.getByRole('button', { name: 'Export CSV' }));
    expect(onexport).toHaveBeenCalledWith('2,#LIMIT!,#LIMIT!');
    await view.rerender({ limits: { maxFormulaSteps: 100 } });
    expect(input(view.getByRole('textbox', { name: 'C1' })).value).toBe('6');
    await view.rerender({ sheets: [sheet({ A1: '10', B1: '=A1+1' }, 1, 3)] });
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe('11');
  });

  it('neutralizes text formulas, preserves CSV quoting and exports unrounded numeric results', async () => {
    const onexport = vi.fn();
    const values = ['  =HYPERLINK("bad")', '+cmd', '-cmd', '@cmd', '\tcmd', '\rcmd', '\ncmd', 'a,"b"\nc', '=1/3', '=-1000.12345'];
    const cells = Object.fromEntries(values.map((value, i) => [`A${i + 1}`, value]));
    const view = render(SpreadsheetView, { sheets: [sheet(cells, values.length, 1)], onexport });
    await fireEvent.click(view.getByRole('button', { name: 'Export CSV' }));
    const csv: unknown = onexport.mock.calls[0]?.[0];
    expect(typeof csv).toBe('string');
    if (typeof csv !== 'string') throw new Error('Expected exported CSV');
    expect(parseCSV(csv).map(row => row[0])).toEqual([
      ...values.slice(0, 7).map(value => `'${value}`),
      values[7], String(1 / 3), '-1000.12345',
    ]);
  });

  it('exports the complete workbook as JSON without evaluating or dropping sheets', async () => {
    const onworkbookexport = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [
        sheet({ A1: '=1+1' }),
        { ...sheet({ A1: '001' }), id: 'two', name: 'Second' },
      ],
      onworkbookexport,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Export workbook' }));
    expect(onworkbookexport).toHaveBeenCalledTimes(1);
    const encoded = onworkbookexport.mock.calls[0]?.[0];
    expect(parseSpreadsheetWorkbook(encoded)).toEqual(expect.objectContaining({
      activeSheetId: 's',
      sheets: expect.arrayContaining([
        expect.objectContaining({ id: 's', cells: { A1: '=1+1' } }),
        expect.objectContaining({ id: 'two', cells: { A1: '001' } }),
      ]),
    }));
  });

  it('blocks workbook export when an inactive sheet violates the configured limits', async () => {
    const onworkbookexport = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: 'ok' }, 1, 1), { ...sheet({}, 3, 1), id: 'large' }],
      limits: { maxRows: 2 }, onworkbookexport,
    });
    const button = view.getByRole('button', { name: 'Export workbook' });
    expect(button.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(button);
    expect(onworkbookexport).not.toHaveBeenCalled();
    expect(view.getByRole('button', { name: 'Export CSV' }).hasAttribute('disabled')).toBe(false);
    await view.rerender({ sheets: [sheet({ A1: 'fixed' }, 1, 1)] });
    expect(button.hasAttribute('disabled')).toBe(false);
    await fireEvent.click(button);
    expect(onworkbookexport).toHaveBeenCalledTimes(1);
  });

  it('preserves formats in readonly workbook exports without invoking the CSV callback', async () => {
    const onworkbookexport = vi.fn();
    const onexport = vi.fn();
    const formats = { A1: { bold: true, numberFormat: 'percent' as const, decimalPlaces: 3 } };
    const view = render(SpreadsheetView, {
      sheets: [{ ...sheet({ A1: '=1/3' }), formats }], readonly: true, onworkbookexport, onexport,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Export workbook' }));
    const json: unknown = onworkbookexport.mock.calls[0]?.[0];
    if (typeof json !== 'string') throw new Error('Missing workbook');
    expect(parseSpreadsheetWorkbook(json)?.sheets[0]?.formats).toEqual(formats);
    expect(onexport).not.toHaveBeenCalled();
  });

  it('edits selected-cell formats, renders percentages and records the change in history', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: '0.25' }, 1, 2)], onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Bold' }));
    await fireEvent.change(view.getByRole('combobox', { name: 'Number format' }), { target: { value: 'percent' } });
    const cell = view.getByRole('textbox', { name: 'A1' }) as HTMLInputElement;
    expect(cell.value).toBe('0.25');
    expect(cell.style.fontWeight).toBe('700');
    expect(onchange).toHaveBeenCalledWith([expect.objectContaining({
      formats: { A1: expect.objectContaining({ bold: true, numberFormat: 'percent' }) },
    })]);
    await fireEvent.click(view.getByRole('textbox', { name: 'B1' }));
    expect((view.getByRole('textbox', { name: 'A1' }) as HTMLInputElement).value).toBe('25%');
    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    expect((view.getByRole('textbox', { name: 'A1' }) as HTMLInputElement).value).toBe('0.25');
  });

  it('applies formatting to a rectangular selection as one undoable operation', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: '1', B1: '2', A2: '3', B2: '4' }, 2, 2)], onchange,
    });
    await fireEvent.click(view.getByRole('textbox', { name: 'A1' }));
    await fireEvent.keyDown(view.getByRole('textbox', { name: 'A1' }), { key: 'ArrowRight', shiftKey: true });
    await fireEvent.keyDown(view.getByRole('textbox', { name: 'A1' }), { key: 'ArrowDown', shiftKey: true });
    await fireEvent.click(view.getByRole('button', { name: 'Bold' }));
    expect(onchange).toHaveBeenCalledWith([expect.objectContaining({
      formats: {
        A1: { bold: true }, B1: { bold: true },
        A2: { bold: true }, B2: { bold: true },
      },
    })]);
    expect(onchange).toHaveBeenCalledTimes(1);
    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    expect((view.getByRole('textbox', { name: 'A1' }) as HTMLInputElement).style.fontWeight).toBe('400');
    expect((view.getByRole('textbox', { name: 'B2' }) as HTMLInputElement).style.fontWeight).toBe('400');
    await fireEvent.click(view.getByRole('button', { name: 'Redo' }));
    expect(input(view.getByRole('textbox', { name: 'B2' })).style.fontWeight).toBe('700');
  });

  it('preserves per-cell formats and leaves cells outside a formatted range unchanged', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [{
      ...sheet({ A1: '1', B1: '2', C1: '3' }, 1, 3),
      formats: { A1: { italic: true }, B1: { align: 'right', decimalPlaces: 4 }, C1: { bold: false } },
    }], onchange });
    await fireEvent.keyDown(view.getByRole('textbox', { name: 'A1' }), { key: 'ArrowRight', shiftKey: true });
    await fireEvent.click(view.getByRole('button', { name: 'Bold' }));
    expect(onchange).toHaveBeenLastCalledWith([expect.objectContaining({
      formats: {
        A1: { italic: true, bold: true },
        B1: { align: 'right', decimalPlaces: 4, bold: true },
        C1: { bold: false },
      },
    })]);
  });

  it('fills a rectangle with translated relative formulas as one transaction', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: '1', B1: '2', C1: '=A1+B1' }, 3, 3)], onchange,
    });
    await fireEvent.click(view.getByRole('textbox', { name: 'C1' }));
    await fireEvent.keyDown(view.getByRole('textbox', { name: 'C1' }), { key: 'ArrowDown', shiftKey: true });
    await fireEvent.keyDown(view.getByRole('textbox', { name: 'C1' }), { key: 'ArrowDown', shiftKey: true });
    await fireEvent.click(view.getByRole('button', { name: 'Fill selection' }));
    expect(onchange).toHaveBeenCalledWith([expect.objectContaining({
      cells: expect.objectContaining({ C1: '=A1+B1', C2: '=A2+B2', C3: '=A3+B3' }),
    })]);
    expect(view.getByRole('textbox', { name: 'C3' })).toHaveProperty('value', '0');
    expect(onchange).toHaveBeenCalledTimes(1);
    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    expect(input(view.getByRole('textbox', { name: 'C2' })).value).toBe('');
  });

  it('rejects formula fill when translated references leave the selected sheet', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: '=B1', B1: '1' }, 1, 2)], onchange,
    });
    await fireEvent.click(view.getByRole('textbox', { name: 'A1' }));
    await fireEvent.keyDown(view.getByRole('textbox', { name: 'A1' }), { key: 'ArrowRight', shiftKey: true });
    await fireEvent.click(view.getByRole('button', { name: 'Fill selection' }));
    expect(onchange).not.toHaveBeenCalled();
    expect(view.getByRole('textbox', { name: 'B1' })).toHaveProperty('value', '1');
  });

  it('preserves absolute row and column references during formula fill', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: '1', B1: '2', C1: '=$A$1+A$1+$A1' }, 3, 3)], onchange,
    });
    await fireEvent.click(view.getByRole('textbox', { name: 'C1' }));
    await fireEvent.keyDown(view.getByRole('textbox', { name: 'C1' }), { key: 'ArrowDown', shiftKey: true });
    await fireEvent.click(view.getByRole('button', { name: 'Fill selection' }));
    expect(onchange).toHaveBeenCalledWith([expect.objectContaining({
      cells: expect.objectContaining({ C2: '=$A$1+A$1+$A2' }),
    })]);
    expect(view.getByRole('textbox', { name: 'C2' })).toHaveProperty('value', '2');
  });

  it('translates mixed lowercase references horizontally using the fill shortcut', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: '2', B1: '3', A2: '=$a$1+a$1+$a1' }, 2, 2)], onchange,
    });
    const origin = view.getByRole('textbox', { name: 'A2' });
    await fireEvent.click(origin);
    await fireEvent.keyDown(origin, { key: 'ArrowRight', shiftKey: true });
    await fireEvent.keyDown(origin, { key: 'd', ctrlKey: true });
    expect(onchange).toHaveBeenLastCalledWith([expect.objectContaining({
      cells: expect.objectContaining({ B2: '=$A$1+B$1+$A1' }),
    })]);
    expect(view.getByRole('textbox', { name: 'B2' })).toHaveProperty('value', '7');
  });

  it.each([
    ['vertical', { A1: '1', A2: '3' }, 4, 1, ['1', '3', '5', '7']],
    ['horizontal', { A1: '-1', B1: '1' }, 1, 4, ['-1', '1', '3', '5']],
    ['decimal', { A1: '0.1', A2: '0.3' }, 4, 1, ['0.1', '0.3', '0.5', '0.7']],
  ] as const)('%s fill infers a numeric step from the first two cells', async (
    _name, cells, rows, cols, expected,
  ) => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet(cells, rows, cols)], onchange });
    const origin = view.getByRole('textbox', { name: 'A1' });
    await fireEvent.click(origin);
    const direction = rows > 1 ? 'ArrowDown' : 'ArrowRight';
    for (let index = 1; index < expected.length; index += 1) {
      await fireEvent.keyDown(origin, { key: direction, shiftKey: true });
    }
    await fireEvent.click(view.getByRole('button', { name: 'Fill selection' }));
    expected.forEach((value, index) => {
      const key = rows > 1 ? `A${index + 1}` : `${String.fromCharCode(65 + index)}1`;
      expect(view.getByRole('textbox', { name: key })).toHaveProperty('value', value);
    });
    expect(onchange).toHaveBeenCalledTimes(1);
  });

  it('keeps leading-zero values as copied text instead of inferring a number sequence', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: '001', A2: '002' }, 3, 1)], onchange,
    });
    const origin = view.getByRole('textbox', { name: 'A1' });
    await fireEvent.click(origin);
    await fireEvent.keyDown(origin, { key: 'ArrowDown', shiftKey: true });
    await fireEvent.keyDown(origin, { key: 'ArrowDown', shiftKey: true });
    await fireEvent.click(view.getByRole('button', { name: 'Fill selection' }));
    expect(view.getByRole('textbox', { name: 'A3' })).toHaveProperty('value', '001');
  });

  it.each([
    ['9007199254740990', '9007199254740991'],
    ['0.000000000000000000001', '0.000000000000000000002'],
  ])('rejects unsafe numeric fill atomically for %s and %s', async (first, second) => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: first, A2: second, A3: 'unchanged' }, 3, 1)], onchange,
    });
    const origin = view.getByRole('textbox', { name: 'A1' });
    await fireEvent.click(origin);
    await fireEvent.keyDown(origin, { key: 'ArrowDown', shiftKey: true });
    await fireEvent.keyDown(origin, { key: 'ArrowDown', shiftKey: true });
    await fireEvent.click(view.getByRole('button', { name: 'Fill selection' }));
    expect(onchange).not.toHaveBeenCalled();
    expect(view.getByRole('textbox', { name: 'A3' })).toHaveProperty('value', 'unchanged');
  });

  it('evaluates absolute ranges and detects cycles through normalized references', () => {
    const view = render(SpreadsheetView, {
      readonly: true,
      sheets: [sheet({ A1: '2', B1: '3', A2: '=SUM($a$1:b$1)', B2: '=$B$2' }, 2, 2)],
    });
    expect(view.getByRole('textbox', { name: 'A2' })).toHaveProperty('value', '5');
    expect(view.getByRole('textbox', { name: 'B2' })).toHaveProperty('value', '#CYCLE!');
  });

  it.each(['=$$A1', '=A$$1', '=$A$0', '=A1$', '=$SUM(A1:A1)'])(
    'rejects malformed absolute reference %s',
    (formula) => {
      const view = render(SpreadsheetView, {
        readonly: true, sheets: [sheet({ A1: '2', B1: formula }, 1, 2)],
      });
      expect(view.getByRole('textbox', { name: 'B1' })).toHaveProperty('value', '#VALUE!');
    },
  );

  it('renders imported numeric formats and alignment in readonly mode without changing CSV values', async () => {
    const onexport = vi.fn();
    const view = render(SpreadsheetView, {
      readonly: true, onexport, sheets: [{
        ...sheet({ A1: '=1/4', B1: '001', C1: 'text' }, 1, 3),
        formats: {
          A1: { numberFormat: 'percent', decimalPlaces: 2, italic: true, align: 'center' },
          B1: { numberFormat: 'general' },
          C1: { numberFormat: 'number' },
        },
      }],
    });
    const a = input(view.getByRole('textbox', { name: 'A1' }));
    expect(a.value).toBe('25.00%');
    expect(a.style.fontStyle).toBe('italic');
    expect(a.style.textAlign).toBe('center');
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe('001');
    expect(input(view.getByRole('textbox', { name: 'C1' })).value).toBe('text');
    expect(view.queryByRole('button', { name: 'Bold' })).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Export CSV' }));
    expect(onexport).toHaveBeenCalledWith('0.25,001,text');
  });

  it('updates decimal places and rejects an out-of-range value without changing the workbook', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: '=1/3' })], onchange });
    const decimals = view.getByRole('spinbutton', { name: 'Decimal places' });
    await fireEvent.change(decimals, { target: { value: '4' } });
    expect(onchange).toHaveBeenCalledTimes(1);
    await fireEvent.change(decimals, { target: { value: '21' } });
    expect(onchange).toHaveBeenCalledTimes(1);
    await fireEvent.click(view.getByRole('textbox', { name: 'B1' }));
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('0.3333');
  });

  it('downloads workbook JSON and releases its object URL after activation', async () => {
    vi.useFakeTimers();
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:workbook');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let fileName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      fileName = this.download;
    });
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: '001' })] });
    await fireEvent.click(view.getByRole('button', { name: 'Export workbook' }));
    expect(fileName).toBe('workbook.json');
    expect(create).toHaveBeenCalledTimes(1);
    const blob = create.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe('application/json;charset=utf-8;');
    expect(revoke).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:workbook');
  });

  it('imports a workbook atomically only after confirmation', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: 'old' })], onchange,
    });
    const fileInput = view.getByLabelText('Import workbook') as HTMLInputElement;
    const file = new File([JSON.stringify({
      protocolVersion: 1, activeSheetId: 'new',
      sheets: [{ id: 'new', name: 'Imported', rows: 1, cols: 1, cells: { A1: '=1+1' } }],
    })], 'workbook.json', { type: 'application/json' });
    await fireEvent.change(fileInput, { target: { files: [file] } });
    expect(view.getByRole('group', { name: 'Confirm import' })).toBeTruthy();
    expect((view.getByRole('textbox', { name: 'A1' }) as HTMLInputElement).value).toBe('old');
    await fireEvent.click(view.getByRole('button', { name: 'Confirm import' }));
    expect((view.getByRole('textbox', { name: 'A1' }) as HTMLInputElement).value).toBe('=1+1');
    expect(onchange).toHaveBeenCalledWith([{ id: 'new', name: 'Imported', rows: 1, cols: 1, cells: { A1: '=1+1' } }]);
    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('old');
    await fireEvent.click(view.getByRole('button', { name: 'Redo' }));
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('=1+1');
  });

  it('rejects malformed or oversized workbook files without changing data', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: 'old' })], onchange });
    const fileInput = view.getByLabelText('Import workbook') as HTMLInputElement;
    await fireEvent.change(fileInput, { target: { files: [new File(['{"protocolVersion":2}'], 'bad.json')] } });
    expect(view.getByRole('alert').textContent).toContain('invalid');
    expect((view.getByRole('textbox', { name: 'A1' }) as HTMLInputElement).value).toBe('old');
    expect(onchange).not.toHaveBeenCalled();
    const oversized = new File(['{}'], 'large.json');
    Object.defineProperty(oversized, 'size', { value: 10_000_001 });
    const read = vi.spyOn(oversized, 'arrayBuffer');
    await fireEvent.change(fileInput, { target: { files: [oversized] } });
    expect(read).not.toHaveBeenCalled();
    expect(view.queryByRole('group', { name: 'Confirm import' })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it('invalidates an import read when the workbook scope changes', async () => {
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: 'old' })], scopeKey: 'a' });
    const fileInput = view.getByLabelText('Import workbook') as HTMLInputElement;
    const file = new File([JSON.stringify({
      protocolVersion: 1, sheets: [{ id: 'new', name: 'New', rows: 1, cols: 1, cells: { A1: 'new' } }],
    })], 'workbook.json');
    let resolveRead!: (bytes: ArrayBuffer) => void;
    const delayed = new Promise<ArrayBuffer>(resolve => { resolveRead = resolve; });
    vi.spyOn(file, 'arrayBuffer').mockReturnValue(delayed);
    const promise = fireEvent.change(fileInput, { target: { files: [file] } });
    await view.rerender({ scopeKey: 'b' });
    resolveRead(new TextEncoder().encode(JSON.stringify({ protocolVersion: 1, sheets: [sheet({ A1: 'stale' })] })).buffer);
    await promise;
    await delayed;
    expect(view.queryByRole('group', { name: 'Confirm import' })).toBeNull();
    expect((view.getByRole('textbox', { name: 'A1' }) as HTMLInputElement).value).toBe('old');
  });

  it('delegates XLSX bytes to an injected importer and confirms atomically', async () => {
    const onchange = vi.fn();
    const importer = vi.fn(async (
      bytes: Uint8Array,
      limits: { maxRows: number },
      signal: AbortSignal,
    ) => {
      expect(bytes).toEqual(new Uint8Array([80, 75, 3, 4]));
      expect(limits.maxRows).toBe(1000);
      expect(signal.aborted).toBe(false);
      return { protocolVersion: 1 as const, activeSheetId: 'new', sheets: [
        { id: 'new', name: 'Imported XLSX', rows: 1, cols: 1, cells: { A1: 'xlsx' } },
      ] };
    });
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: 'old' })], onchange, xlsximporter: importer });
    const fileInput = view.getByLabelText('Import workbook') as HTMLInputElement;
    const file = new File([new Uint8Array([80, 75, 3, 4])], 'workbook.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(importer).toHaveBeenCalledTimes(1));
    expect((view.getByRole('textbox', { name: 'A1' }) as HTMLInputElement).value).toBe('old');
    await fireEvent.click(view.getByRole('button', { name: 'Confirm import' }));
    expect((view.getByRole('textbox', { name: 'A1' }) as HTMLInputElement).value).toBe('xlsx');
    expect(onchange).toHaveBeenCalledTimes(1);
  });

  it('does not expose XLSX import when no importer is injected', async () => {
    const view = render(SpreadsheetView, { sheets: [sheet()] });
    const fileInput = view.getByLabelText('Import workbook') as HTMLInputElement;
    const file = new File([new Uint8Array([80, 75, 3, 4])], 'workbook.xlsx');
    await fireEvent.change(fileInput, { target: { files: [file] } });
    expect(view.queryByRole('group', { name: 'Confirm import' })).toBeNull();
    expect(view.getByRole('alert')).toBeTruthy();
  });

  it.each(['scope', 'adapter', 'readonly', 'unmount'] as const)(
    'aborts XLSX parsing and discards its result after %s changes', async change => {
      let finish!: (value: unknown) => void;
      let signal: AbortSignal | undefined;
      const importer = vi.fn((_bytes: Uint8Array, _limits: unknown, currentSignal: AbortSignal) => {
        signal = currentSignal;
        return new Promise<unknown>(resolve => { finish = resolve; });
      });
      const onchange = vi.fn();
      const view = render(SpreadsheetView, {
        sheets: [sheet({ A1: 'old' })], scopeKey: 'first', xlsximporter: importer, onchange,
      });
      await fireEvent.change(view.getByLabelText('Import workbook'), {
        target: { files: [new File([new Uint8Array([80, 75, 3, 4])], 'data.xlsx')] },
      });
      await waitFor(() => expect(importer).toHaveBeenCalledTimes(1));
      if (change === 'scope') await view.rerender({ scopeKey: 'second' });
      if (change === 'adapter') await view.rerender({ xlsximporter: async () => undefined });
      if (change === 'readonly') await view.rerender({ readonly: true });
      if (change === 'unmount') view.unmount();
      expect(signal?.aborted).toBe(true);
      finish({ protocolVersion: 1, sheets: [sheet({ A1: 'late' })] });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(view.queryByRole('group', { name: 'Confirm import' })).toBeNull();
      expect(onchange).not.toHaveBeenCalled();
    },
  );

  it('cancels import and invalidates confirmation when made readonly', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: 'old' })], onchange });
    const fileInput = view.getByLabelText('Import workbook');
    const file = new File([JSON.stringify({
      protocolVersion: 1, sheets: [sheet({ A1: 'new' })],
    })], 'book.json');
    await fireEvent.change(fileInput, { target: { files: [file] } });
    await fireEvent.click(view.getByRole('button', { name: 'Cancel' }));
    expect(view.queryByRole('group', { name: 'Confirm import' })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.change(fileInput, { target: { files: [file] } });
    await view.rerender({ readonly: true });
    expect(view.queryByRole('button', { name: 'Confirm import' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Import workbook' })).toBeNull();
    await fireEvent.change(fileInput, { target: { files: [file] } });
    expect(onchange).not.toHaveBeenCalled();
  });

  it('applies custom limits to every imported sheet before confirmation', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: 'old' }, 1, 1)], limits: { maxSheets: 1 }, onchange,
    });
    const file = new File([JSON.stringify({
      protocolVersion: 1, sheets: [sheet(), { ...sheet(), id: 'second' }],
    })], 'book.json');
    await fireEvent.change(view.getByLabelText('Import workbook'), { target: { files: [file] } });
    expect(view.getByRole('alert')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Confirm import' })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it('pastes a rectangular TSV atomically and undoes it as one transaction', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: 'old', B1: 'keep', A2: 'x', B2: 'y' }, 2, 2)],
      onchange,
    });
    const cell = view.getByRole('textbox', { name: 'A1' });
    await fireEvent.paste(cell, {
      clipboardData: {
        getData: (type: string) => type === 'text/plain' ? 'new\tvalue\n"line 1\nline 2"\t3' : '',
      },
    });
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('new');
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe('value');
    expect(input(view.getByRole('textbox', { name: 'A2' })).value).toContain('line 1');
    expect(input(view.getByRole('textbox', { name: 'B2' })).value).toBe('3');
    expect(onchange).toHaveBeenCalledOnce();
    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('old');
    expect(input(view.getByRole('textbox', { name: 'B2' })).value).toBe('y');
  });

  it('rejects an out-of-bounds paste without partial writes', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: 'old', B1: 'keep' }, 1, 2)],
      onchange,
    });
    await fireEvent.focus(view.getByRole('textbox', { name: 'B1' }));
    await fireEvent.paste(view.getByRole('textbox', { name: 'B1' }), {
      clipboardData: { getData: (type: string) => type === 'text/plain' ? 'x\ty' : '' },
    });
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('old');
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe('keep');
    expect(onchange).not.toHaveBeenCalled();
    expect(view.getByRole('alert').textContent).toContain('Cannot paste');
  });

  it('clears a selected rectangle in one transaction', async () => {
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: '1', B1: '2', A2: '3', B2: '4' }, 2, 2)],
    });
    await fireEvent.click(view.getByRole('textbox', { name: 'A1' }));
    await fireEvent.click(view.getByRole('textbox', { name: 'B2' }), { shiftKey: true });
    await fireEvent.click(view.getByRole('button', { name: 'Clear selection' }));
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('');
    expect(input(view.getByRole('textbox', { name: 'B2' })).value).toBe('');
    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('1');
    expect(input(view.getByRole('textbox', { name: 'B2' })).value).toBe('4');
  });

  it('extends a keyboard range and resets it when switching sheets', async () => {
    const view = render(SpreadsheetView, { sheets: [
      sheet({ A1: '1', B1: '2', A2: '3', B2: '4' }, 2, 2),
      { ...sheet({ A1: 'a', B1: 'b' }, 2, 2), id: 'other', name: 'Other' },
    ] });
    const cell = view.getByRole('textbox', { name: 'A1' });
    await fireEvent.keyDown(cell, { key: 'ArrowRight', shiftKey: true });
    await fireEvent.keyDown(cell, { key: 'ArrowDown', shiftKey: true });
    expect(view.container.querySelectorAll('td[data-selected="true"]')).toHaveLength(4);
    await fireEvent.keyDown(cell, { key: 'Delete' });
    expect(input(view.getByRole('textbox', { name: 'B2' })).value).toBe('');
    await fireEvent.click(view.getByRole('button', { name: 'Other' }));
    expect(view.container.querySelectorAll('td[data-selected="true"]')).toHaveLength(1);
    await fireEvent.click(view.getByRole('button', { name: 'Clear selection' }));
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe('b');
  });

  it.each(['"unterminated', 'a\tb\nc', 'x'.repeat(10_001)])('blocks native fallback and partial writes for invalid paste %#', async text => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: 'original' })], onchange });
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (type: string) => type === 'text/plain' ? text : '' },
    });
    await fireEvent(view.getByRole('textbox', { name: 'A1' }), event);
    expect(event.defaultPrevented).toBe(true);
    expect(onchange).not.toHaveBeenCalled();
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('original');
    expect(view.getByRole('alert')).toBeTruthy();
  });

  it('preserves commas in plain text and parses CSV only with its explicit MIME', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet()], onchange });
    await fireEvent.paste(view.getByRole('textbox', { name: 'A1' }), {
      clipboardData: { getData: (type: string) => type === 'text/plain' ? 'a,b' : '' },
    });
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('a,b');
    await fireEvent.paste(view.getByRole('textbox', { name: 'A1' }), {
      clipboardData: { getData: (type: string) => type === 'text/csv' ? ' 001 ,=1+1' : 'ignored' },
    });
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe(' 001 ');
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe('2');
    expect(onchange).toHaveBeenCalledTimes(2);
  });

  it('copies a rectangular selection as calculated values with distinct TSV and CSV delimiters', async () => {
    const view = render(SpreadsheetView, {
      sheets: [sheet({ A1: '=1+1', B1: 'b', A2: 'x', B2: 'y' }, 2, 2)],
    });
    await fireEvent.click(view.getByRole('textbox', { name: 'A1' }));
    await fireEvent.keyDown(view.getByRole('textbox', { name: 'A1' }), { key: 'ArrowRight', shiftKey: true });
    await fireEvent.keyDown(view.getByRole('textbox', { name: 'A1' }), { key: 'ArrowDown', shiftKey: true });
    const copied: Record<string, string> = {};
    const event = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { setData: (type: string, value: string) => { copied[type] = value; } },
    });
    await fireEvent(view.getByRole('textbox', { name: 'A1' }), event);
    expect(event.defaultPrevented).toBe(true);
    expect(copied['text/plain']).toBe('"2"\t"b"\n"x"\t"y"');
    expect(copied['text/csv']).toBe('"2","b"\n"x","y"');
  });

  it('leaves native single-cell copy behavior untouched', async () => {
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: 'one' })] });
    const copied: Record<string, string> = {};
    const event = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { setData: (type: string, value: string) => { copied[type] = value; } },
    });
    await fireEvent(view.getByRole('textbox', { name: 'A1' }), event);
    expect(event.defaultPrevented).toBe(false);
    expect(copied).toEqual({});
  });

  it('escapes clipboard delimiters and neutralizes formula-like text without rounding numbers', () => {
    const values = [['a\tb', 'a\n"b"', ' =HYPERLINK("x")', -1 / 3, '+cmd']];
    for (const format of ['tsv', 'csv'] as const) {
      const encoded = serializeSpreadsheetClipboard(values, format);
      expect(encoded).toBeDefined();
      expect(parseSpreadsheetClipboard(encoded!, format)).toEqual([
        ['a\tb', 'a\n"b"', '\' =HYPERLINK("x")', String(-1 / 3), "'+cmd"],
      ]);
    }
    expect(serializeSpreadsheetClipboard([[Infinity]], 'tsv')).toBeUndefined();
    expect(serializeSpreadsheetClipboard([['a'], ['b', 'c']], 'csv')).toBeUndefined();
  });

  it('does not write or create history from read-only paste', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: 'original' })], readonly: true, onchange });
    await fireEvent.paste(view.getByRole('textbox', { name: 'A1' }), {
      clipboardData: { getData: () => 'replacement' },
    });
    expect(onchange).not.toHaveBeenCalled();
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('original');
    await view.rerender({ readonly: false });
    expect(view.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true);
  });

  it('revokes the download URL after activation instead of leaking it or revoking it too early', async () => {
    vi.useFakeTimers();
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:sheet');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: 'value' })] });
    await fireEvent.click(view.getByRole('button', { name: 'Export CSV' }));
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:sheet');
  });

  it('updates formula dependants after editing through the formula bar', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: '2', B1: '=A1+1' })], onchange });
    await fireEvent.input(view.getByRole('textbox', { name: 'Cell value or formula' }), { target: { value: '7' } });
    expect(onchange.mock.calls.at(-1)?.[0]?.[0]?.cells.A1).toBe('7');
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe('8');
  });

  it('provides bounded undo and redo transactions with isolated callback snapshots', async () => {
    const onchange = vi.fn((value: SheetData[]) => {
      value[0]!.cells['A1'] = 'observer mutation';
    });
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: '2', B1: '=A1+1' })], onchange });
    const formula = view.getByRole('textbox', { name: 'Cell value or formula' });
    await fireEvent.input(formula, { target: { value: '7' } });
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe('8');
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('7');
    expect(view.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(false);

    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('2');
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe('3');
    expect(view.getByRole('button', { name: 'Redo' }).hasAttribute('disabled')).toBe(false);

    await fireEvent.click(view.getByRole('button', { name: 'Redo' }));
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('7');
    expect(input(view.getByRole('textbox', { name: 'B1' })).value).toBe('8');
  });

  it('records row and column changes, then clears history after external or scoped replacement', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet({}, 1, 1)], scopeKey: 'tenant-a', onchange });
    await fireEvent.click(view.getByRole('button', { name: 'Row' }));
    await fireEvent.click(view.getByRole('button', { name: 'Column' }));
    expect(view.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(false);
    await view.rerender({ sheets: [sheet({ A1: 'fresh' }, 1, 1)], scopeKey: 'tenant-a' });
    expect(view.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true);
    await view.rerender({ sheets: [sheet({ A1: 'other' }, 1, 1)], scopeKey: 'tenant-b' });
    expect(view.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true);
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('other');
  });

  it('does not expose or execute history while read-only', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: '2' })], readonly: true, onchange });
    expect(view.queryByRole('button', { name: 'Undo' })).toBeNull();
    await fireEvent.input(view.getByRole('textbox', { name: 'A1' }), { target: { value: '9' } });
    expect(onchange).not.toHaveBeenCalled();
  });

  it('restores structural edits and active sheet identity', async () => {
    const view = render(SpreadsheetView, { sheets: [sheet({}, 1, 1)], activeSheetId: 's' });
    await fireEvent.click(view.getByRole('button', { name: 'Row' }));
    await fireEvent.click(view.getByRole('button', { name: 'Column' }));
    expect(view.getByRole('textbox', { name: 'B2' })).toBeTruthy();
    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    expect(view.queryByRole('textbox', { name: 'B2' })).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    expect(view.queryByRole('textbox', { name: 'A2' })).toBeNull();
    await fireEvent.click(view.getByRole('button', { name: 'New Sheet' }));
    expect(view.getByRole('button', { name: 'Sheet 2' })).toBeTruthy();
    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    expect(view.queryByRole('button', { name: 'Sheet 2' })).toBeNull();
    expect(view.getByRole('textbox', { name: 'A1' })).toBeTruthy();
    await fireEvent.click(view.getByRole('button', { name: 'Redo' }));
    expect(view.getByRole('textbox', { name: 'E6' })).toBeTruthy();
  });

  it('clears redo on new edits, ignores unchanged input, and isolates scope-only changes', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: '1' })], scopeKey: 'a', onchange });
    const field = view.getByRole('textbox', { name: 'A1' });
    await fireEvent.input(field, { target: { value: '1' } });
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.input(field, { target: { value: '2' } });
    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    await fireEvent.input(field, { target: { value: '3' } });
    expect(view.getByRole('button', { name: 'Redo' }).hasAttribute('disabled')).toBe(true);
    await view.rerender({ scopeKey: 'b' });
    expect(view.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true);
  });

  it('evicts the oldest transaction after 100 edits', async () => {
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: '0' }, 1, 1)] });
    for (let i = 1; i <= 101; i++) {
      await fireEvent.input(view.getByRole('textbox', { name: 'A1' }), { target: { value: String(i) } });
    }
    for (let i = 0; i < 100; i++) await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('1');
    expect(view.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true);
  });

  it('evicts large snapshots by serialized capacity before the step ceiling', async () => {
    const cells = Object.fromEntries(Array.from({ length: 70 }, (_, i) => [`A${i + 1}`, 'x'.repeat(10_000)]));
    const view = render(SpreadsheetView, { sheets: [sheet(cells, 70, 1)] });
    for (const value of ['1', '2', '3']) {
      await fireEvent.input(view.getByRole('textbox', { name: 'A1' }), { target: { value } });
    }
    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    await fireEvent.click(view.getByRole('button', { name: 'Undo' }));
    expect(input(view.getByRole('textbox', { name: 'A1' })).value).toBe('1');
    expect(view.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true);
  });

  it('invalidates history on equal-content replacement and effective limit changes', async () => {
    const view = render(SpreadsheetView, { sheets: [sheet({ A1: '1' }, 1, 1)] });
    await fireEvent.input(view.getByRole('textbox', { name: 'A1' }), { target: { value: '2' } });
    await view.rerender({ sheets: [sheet({ A1: '2' }, 1, 1)] });
    expect(view.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true);
    await fireEvent.click(view.getByRole('button', { name: 'Row' }));
    await view.rerender({ limits: { maxRows: 2 } });
    expect(view.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true);
  });

  it('prevents adding rows and columns beyond configured cell limits', async () => {
    const onchange = vi.fn();
    const view = render(SpreadsheetView, { sheets: [sheet({}, 2, 2)], limits: { maxCells: 4 }, onchange });
    expect(view.getByRole('button', { name: 'Row' }).hasAttribute('disabled')).toBe(true);
    expect(view.getByRole('button', { name: 'Column' }).hasAttribute('disabled')).toBe(true);
    await fireEvent.click(view.getByRole('button', { name: 'Row' }));
    expect(onchange).not.toHaveBeenCalled();
  });
});

for (const name of ['SPA', 'Lite'] as const) {
  const mountSheet = (props: { sheets: SheetData[]; limits?: Partial<SpreadsheetLimits>; readonly?: boolean }) =>
    name === 'SPA' ? render(SpreadsheetView, props) : render(LiteSpreadsheetView, props);
  describe(`${name} bounded sheet rendering`, () => {
    it.each([
      [Infinity, 1], [NaN, 1], [-1, 1], [0, 1], [1.5, 1],
      [1, Infinity], [1, 101], [1001, 1], [1000, 100],
    ])('rejects dimensions %s x %s before allocating the grid', (rows, cols) => {
      const view = mountSheet({ sheets: [sheet({}, rows, cols)] });
      expect(view.getByRole('alert').textContent).toContain('safety limits');
      expect(view.queryByRole('table')).toBeNull();
    });

    it('does not allow oversized limit overrides to bypass safety ceilings', () => {
      const limits: Partial<SpreadsheetLimits> = { maxRows: Number.MAX_SAFE_INTEGER, maxCells: Number.MAX_SAFE_INTEGER };
      const view = mountSheet({ sheets: [sheet({}, 1001, 1)], limits });
      expect(view.getByRole('alert')).toBeTruthy();
      expect(view.queryByRole('table')).toBeNull();
    });

    it('rejects excessive cell content, then recovers when a valid sheet replaces it', async () => {
      const view = mountSheet({ sheets: [sheet({ A1: 'x'.repeat(10_001) })] });
      expect(view.getByRole('alert')).toBeTruthy();
      await view.rerender({ sheets: [sheet({ A1: 'Valid' })] });
      expect(view.queryByRole('alert')).toBeNull();
      expect(view.getByRole('table')).toBeTruthy();
    });

    it('rejects duplicate IDs without rendering tabs', () => {
      const view = mountSheet({ sheets: [sheet(), sheet()] });
      expect(view.getByRole('alert')).toBeTruthy();
      expect(view.queryByRole('table')).toBeNull();
    });

    it('rejects oversized workbooks before walking their sheets', () => {
      const view = mountSheet({ sheets: Array.from({ length: 33 }, (_, i) => ({ ...sheet(), id: String(i) })) });
      expect(view.getByRole('alert')).toBeTruthy();
      expect(view.queryByRole('table')).toBeNull();
    });

    it('rejects aggregate text payloads even if each cell is individually within limits', () => {
      const cells = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`A${i + 1}`, 'x'.repeat(10_000)]));
      const view = mountSheet({ sheets: [sheet(cells, 101, 1)] });
      expect(view.getByRole('alert')).toBeTruthy();
      expect(view.queryByRole('table')).toBeNull();
    });

    it('renders AA column names correctly and preserves read-only state', () => {
      const view = mountSheet({ sheets: [sheet({ AA1: 'Last column' }, 1, 27)], readonly: true });
      const cell = input(view.getByRole('textbox', { name: 'AA1' }));
      expect(cell.value).toBe('Last column');
      expect(cell.readOnly).toBe(true);
      expect(view.getByRole('columnheader', { name: 'AA' })).toBeTruthy();
    });
  });
}

it('keeps Lite as a native form with raw formulas and explicit sheet identity', () => {
  const view = render(LiteSpreadsheetView, { sheets: [sheet({ A1: '=1+1' })], formAction: '/save' });
  const form = view.container.querySelector('form');
  if (!form) throw new Error('Expected native form');
  expect(form.getAttribute('method')).toBe('POST');
  expect(form.getAttribute('action')).toBe('/save');
  const data = new FormData(form);
  expect(data.get('sheetId')).toBe('s');
  expect(data.get('cell_A1')).toBe('=1+1');
  expect(view.getByRole('button', { name: 'Save' })).toBeTruthy();
});
