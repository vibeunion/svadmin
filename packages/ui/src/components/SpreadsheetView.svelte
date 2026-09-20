<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Button } from './ui/button/index.js';
  import { Plus, Download, FileSpreadsheet, Redo2, Undo2, Trash2, Upload, Bold, Italic, Copy } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { parseSpreadsheetClipboard, serializeSpreadsheetClipboard, parseSpreadsheetWorkbook, snapshotSpreadsheetWorkbook, serializeSpreadsheetWorkbook, toCsv, type SpreadsheetCellFormat, type SpreadsheetWorkbook } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  const i18n = useTranslation();

  export interface SheetData {
    id: string;
    name: string;
    rows: number;
    cols: number;
    cells: Record<string, string>; // e.g. "A1": "100", "A2": "=SUM(A1:A1)"
    formats?: Record<string, SpreadsheetCellFormat>;
  }

  export interface SpreadsheetLimits {
    maxRows: number;
    maxCols: number;
    maxCells: number;
    maxSheets: number;
    maxCellLength: number;
    maxFormulaLength: number;
    maxFormulaDepth: number;
    maxRangeCells: number;
    maxFormulaSteps: number;
  }

  const defaultLimits: SpreadsheetLimits = {
    maxRows: 1000,
    maxCols: 100,
    maxCells: 10_000,
    maxSheets: 32,
    maxCellLength: 10_000,
    maxFormulaLength: 1000,
    maxFormulaDepth: 32,
    maxRangeCells: 10_000,
    maxFormulaSteps: 50_000,
  };

  interface Props {
    sheets?: SheetData[];
    activeSheetId?: string;
    scopeKey?: string;
    readonly?: boolean;
    onchange?: (sheets: SheetData[]) => void;
    onexport?: (csv: string) => void;
    onworkbookexport?: (json: string) => void;
    onxlsxexport?: (bytes: Uint8Array) => void | Promise<void>;
    xlsxexporter?: (workbook: SpreadsheetWorkbook) => Promise<Uint8Array | undefined>;
    xlsximporter?: (bytes: Uint8Array, limits: SpreadsheetLimits, signal: AbortSignal) => Promise<unknown>;
    limits?: Partial<SpreadsheetLimits>;
    class?: string;
  }

  let {
    sheets = $bindable([
      {
        id: 'sheet1',
        name: 'Financial Summary',
        rows: 8,
        cols: 6,
        cells: {
          A1: 'Category',
          B1: 'Q1',
          C1: 'Q2',
          D1: 'Q3',
          E1: 'Q4',
          F1: 'Total',
          A2: 'Revenue',
          B2: '12000',
          C2: '15000',
          D2: '18000',
          E2: '21000',
          F2: '=SUM(B2:E2)',
          A3: 'Cost',
          B3: '4000',
          C3: '5000',
          D3: '6000',
          E3: '7000',
          F3: '=SUM(B3:E3)',
        },
      },
    ]),
    activeSheetId = $bindable('sheet1'),
    scopeKey,
    readonly = false,
    onchange,
    onexport,
    onworkbookexport,
    onxlsxexport,
    xlsxexporter,
    xlsximporter,
    limits: limitOverrides = {},
    class: className = '',
  }: Props = $props();

  let selectedCell = $state<string>('A1');
  let fileInput: HTMLInputElement;
  let workbookImportError = $state(false);
  let workbookXlsxError = $state(false);
  let workbookXlsxExporting = $state(false);
  let importRequest: object | undefined;
  let importController: AbortController | undefined;
  let importMounted = true;
  let pendingWorkbook = $state.raw<{ workbook: SpreadsheetWorkbook; context: object }>();
  onDestroy(() => { importMounted = false; importRequest = undefined; importController?.abort(); });
  let selectedRangeEnd = $state<string>('A1');
  let selectionError = $state(false);
  let selectionSheetId: string | undefined;
  let formulaInput = $state('');
  const HISTORY_LIMIT = 100;
  const HISTORY_TEXT_LIMIT = 2_000_000;
  interface HistoryEntry { data: string; activeSheetId: string }
  let undoHistory = $state.raw<HistoryEntry[]>([]);
  let redoHistory = $state.raw<HistoryEntry[]>([]);
  let committedFingerprint = '';
  let committedScopeKey: string | undefined;
  let committedSheets: SheetData[] | undefined;
  let committedLimits = '';
  let xlsxExportRequest: object | undefined;

  function snapshotSheets(value: SheetData[]): SheetData[] {
    return value.map((sheet) => ({
      ...sheet,
      cells: { ...sheet.cells },
      ...(sheet.formats ? {
        formats: Object.fromEntries(Object.entries(sheet.formats).map(([key, format]) => [key, { ...format }])),
      } : {}),
    }));
  }

  function fingerprintSheets(value: SheetData[]): string {
    return JSON.stringify(value);
  }

  function pushBounded(history: HistoryEntry[]): HistoryEntry[] {
    const data = fingerprintSheets(sheets);
    if (data.length > HISTORY_TEXT_LIMIT) return [];
    const next = [...history, { data, activeSheetId }].slice(-HISTORY_LIMIT);
    let size = next.reduce((total, entry) => total + entry.data.length, 0);
    while (size > HISTORY_TEXT_LIMIT) size -= next.shift()!.data.length;
    return next;
  }

  function notifyChange(value: SheetData[]) {
    onchange?.(snapshotSheets(value));
  }

  function commitSheets(next: SheetData[], nextActiveSheetId = activeSheetId) {
    synchronizeHistory();
    const nextSnapshot = snapshotSheets(next);
    if (fingerprintSheets(nextSnapshot) === committedFingerprint && nextActiveSheetId === activeSheetId) return;
    undoHistory = pushBounded(undoHistory);
    redoHistory = [];
    sheets = nextSnapshot;
    activeSheetId = nextActiveSheetId;
    committedSheets = sheets;
    committedFingerprint = fingerprintSheets(nextSnapshot);
    committedScopeKey = scopeKey;
    notifyChange(nextSnapshot);
  }

  function synchronizeHistory() {
    const fingerprint = fingerprintSheets(sheets);
    const limitKey = JSON.stringify(limits);
    const scopeChanged = committedScopeKey !== scopeKey;
    const externalDataChanged = committedSheets !== sheets || committedFingerprint !== fingerprint;
    if (scopeChanged || externalDataChanged || committedLimits !== limitKey) {
      undoHistory = [];
      redoHistory = [];
      committedSheets = sheets;
      committedLimits = limitKey;
      committedFingerprint = fingerprint;
      committedScopeKey = scopeKey;
      if (scopeChanged || externalDataChanged) {
        selectedCell = 'A1';
        selectedRangeEnd = 'A1';
        selectionError = false;
      }
    }
  }

  const limits = $derived.by(() => {
    const positive = (value: number | undefined, fallback: number) =>
      typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? Math.min(value, fallback) : fallback;
    return {
      maxRows: positive(limitOverrides.maxRows, defaultLimits.maxRows),
      maxCols: positive(limitOverrides.maxCols, defaultLimits.maxCols),
      maxCells: positive(limitOverrides.maxCells, defaultLimits.maxCells),
      maxSheets: positive(limitOverrides.maxSheets, defaultLimits.maxSheets),
      maxCellLength: positive(limitOverrides.maxCellLength, defaultLimits.maxCellLength),
      maxFormulaLength: positive(limitOverrides.maxFormulaLength, defaultLimits.maxFormulaLength),
      maxFormulaDepth: positive(limitOverrides.maxFormulaDepth, defaultLimits.maxFormulaDepth),
      maxRangeCells: positive(limitOverrides.maxRangeCells, defaultLimits.maxRangeCells),
      maxFormulaSteps: positive(limitOverrides.maxFormulaSteps, defaultLimits.maxFormulaSteps),
    } satisfies SpreadsheetLimits;
  });
  $effect.pre(synchronizeHistory);
  const validWorkbook = $derived(sheets.length <= limits.maxSheets && new Set(sheets.map(sheet => sheet.id)).size === sheets.length);
  const currentSheet = $derived(validWorkbook ? (sheets.find(s => s.id === activeSheetId) ?? sheets[0]) : undefined);
  const validGrid = $derived(Boolean(currentSheet
    && Number.isSafeInteger(currentSheet.rows) && currentSheet.rows > 0 && currentSheet.rows <= limits.maxRows
    && Number.isSafeInteger(currentSheet.cols) && currentSheet.cols > 0 && currentSheet.cols <= limits.maxCols
    && currentSheet.rows * currentSheet.cols <= limits.maxCells));
  const gridRows = $derived(validGrid && currentSheet ? currentSheet.rows : 0);
  const gridCols = $derived(validGrid && currentSheet ? currentSheet.cols : 0);
  const cellSnapshot = $derived.by(() => {
    if (!validGrid || !currentSheet || !currentSheet.cells || typeof currentSheet.cells !== 'object') return null;
    const cells: Record<string, string> = {};
    let textLength = 0;
    for (let row = 1; row <= gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const key = `${getColName(col)}${row}`;
        const raw = Object.hasOwn(currentSheet.cells, key) ? currentSheet.cells[key] : '';
        if (typeof raw !== 'string' || raw.length > limits.maxCellLength) return null;
        textLength += raw.length;
        if (textLength > 1_000_000) return null;
        cells[key] = raw;
      }
    }
    return cells;
  });
  const canRender = $derived(validGrid && cellSnapshot !== null);
  const importContext = $derived({
    scopeKey, readonly, data: fingerprintSheets(sheets), limits: JSON.stringify(limits), activeSheetId, xlsximporter,
  });
  const importReady = $derived(pendingWorkbook?.context === importContext && !readonly);
  const xlsxContext = $derived({ context: importContext, xlsxexporter, onxlsxexport });
  $effect.pre(() => {
    void xlsxContext;
    xlsxExportRequest = undefined;
    workbookXlsxExporting = false;
    workbookXlsxError = false;
  });
  $effect.pre(() => {
    void importContext;
    pendingWorkbook = undefined;
    workbookImportError = false;
    importRequest = undefined;
    importController?.abort();
  });
  const workbookJson = $derived.by(() => {
    if (!validWorkbook || !currentSheet || sheets.some(sheet =>
      sheet.rows > limits.maxRows || sheet.cols > limits.maxCols
      || sheet.rows * sheet.cols > limits.maxCells
      || Object.values(sheet.cells).some(value => typeof value !== 'string' || value.length > limits.maxCellLength))) return;
    return serializeSpreadsheetWorkbook({
      protocolVersion: 1, sheets: snapshotSheets(sheets), activeSheetId: currentSheet.id,
    });
  });
  const canAddRow = $derived(canRender && gridRows < limits.maxRows && (gridRows + 1) * gridCols <= limits.maxCells);
  const canAddCol = $derived(canRender && gridCols < limits.maxCols && gridRows * (gridCols + 1) <= limits.maxCells);

  function getColName(index: number): string {
    let result = '';
    let i = index;
    while (i >= 0) {
      result = String.fromCharCode((i % 26) + 65) + result;
      i = Math.floor(i / 26) - 1;
    }
    return result;
  }

  function colNameToIndex(col: string): number {
    let idx = 0;
    for (let i = 0; i < col.length; i++) {
      idx = idx * 26 + (col.charCodeAt(i) - 64);
      if (!Number.isSafeInteger(idx)) throw new Error('limit');
    }
    return idx - 1;
  }

  function parseCellKey(key: string): { col: string; row: number } | null {
    const match = key.match(/^([A-Z]+)([1-9]\d*)$/);
    if (!match || !match[1] || !match[2]) return null;
    const row = Number(match[2]);
    if (!Number.isSafeInteger(row)) throw new Error('limit');
    return { col: match[1], row };
  }

  interface EvaluationState {
    depth: number;
    steps: number;
    cache: Map<string, number | string>;
  }

  interface SpreadsheetReference {
    sheet?: string;
    cell: string;
  }

  function evaluateFormula(
    formula: string,
    cells: Record<string, string>,
    visiting: Set<string>,
    state: EvaluationState,
    resolveSheet: (name: string | undefined) => Record<string, string> | undefined,
  ): number | string {
    if (!formula.startsWith('=')) return formula;
    if (formula.length > limits.maxFormulaLength) return '#LIMIT!';
    state.depth += 1;
    if (state.depth > limits.maxFormulaDepth) {
      state.depth -= 1;
      return '#LIMIT!';
    }

    // 空白是分隔符，不能把 “1 2” 拼成 “12”。
    const source = formula.slice(1);
    let cursor = 0;
    const consumeStep = (cost = 1) => {
      state.steps += cost;
      if (state.steps > limits.maxFormulaSteps) throw new Error('limit');
    };
    const skipSpace = () => {
      while (cursor < source.length && /\s/.test(source[cursor] ?? '')) cursor++;
    };

    function readNumber(): number {
      const start = cursor;
      while (cursor < source.length && /[\d.]/.test(source[cursor] ?? '')) cursor += 1;
      const result = Number(source.slice(start, cursor));
      if (!Number.isFinite(result) || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(source.slice(start, cursor))) throw new Error('number');
      return result;
    }

    function readCellReference(): SpreadsheetReference {
      const start = cursor;
      if (source[cursor] === "'") {
        cursor += 1;
        const sheetStart = cursor;
        while (cursor < source.length && source[cursor] !== "'") cursor += 1;
        if (source[cursor] !== "'" || source[cursor + 1] !== '!') throw new Error('reference');
        const sheet = source.slice(sheetStart, cursor);
        cursor += 2;
        const cellStart = cursor;
        if (source[cursor] === '$') cursor += 1;
        while (cursor < source.length && /[A-Za-z]/.test(source[cursor] ?? '')) cursor += 1;
        if (source[cursor] === '$') cursor += 1;
        while (cursor < source.length && /\d/.test(source[cursor] ?? '')) cursor += 1;
        return { sheet, cell: source.slice(cellStart, cursor).toUpperCase() };
      }
      const sheetMatch = source.slice(cursor).match(/^([A-Za-z_][A-Za-z0-9_]*)!/);
      if (sheetMatch) {
        const sheet = sheetMatch[1];
        if (!sheet) throw new Error('reference');
        cursor += sheetMatch[0].length;
        const cellStart = cursor;
        if (source[cursor] === '$') cursor += 1;
        while (cursor < source.length && /[A-Za-z]/.test(source[cursor] ?? '')) cursor += 1;
        if (source[cursor] === '$') cursor += 1;
        while (cursor < source.length && /\d/.test(source[cursor] ?? '')) cursor += 1;
        return { sheet, cell: source.slice(cellStart, cursor).toUpperCase() };
      }
      if (source[cursor] === '$') cursor += 1;
      while (cursor < source.length && /[A-Za-z]/.test(source[cursor] ?? '')) cursor += 1;
      if (source[cursor] === '$') cursor += 1;
      while (cursor < source.length && /\d/.test(source[cursor] ?? '')) cursor += 1;
      return { cell: source.slice(start, cursor).toUpperCase() };
    }

    function normalizeCellReference(value: string): string {
      const match = value.match(/^\$?([A-Z]+)\$?([1-9]\d*)$/);
      if (!match || !match[1] || !match[2]) throw new Error('reference');
      return `${match[1]}${match[2]}`;
    }

    function cellValue(reference: SpreadsheetReference): number {
      consumeStep();
      const targetCells = resolveSheet(reference.sheet);
      const key = normalizeCellReference(reference.cell);
      const targetSheetKey = reference.sheet === undefined ? '__current__' : reference.sheet.toLowerCase();
      const visitKey = `${targetSheetKey}!${key}`;
      const targetCell = parseCellKey(key);
      const targetSheet = reference.sheet === undefined
        ? currentSheet
        : sheets.find(sheet => sheet.id.toLowerCase() === reference.sheet?.toLowerCase()
          || sheet.name.toLowerCase() === reference.sheet?.toLowerCase());
      if (!targetCells || !targetCell || !targetSheet
        || targetCell.row > targetSheet.rows || colNameToIndex(targetCell.col) >= targetSheet.cols) throw new Error('reference');
      if (visiting.has(visitKey)) throw new Error('cycle');
      const raw = targetCells[key] ?? '';
      if (raw.startsWith('=')) {
        const next = new Set(visiting);
        next.add(visitKey);
        const cacheKey = `${targetSheetKey}!${key}`;
        const computed = state.cache.get(cacheKey) ?? evaluateFormula(raw, targetCells, next, state, resolveSheet);
        state.cache.set(cacheKey, computed);
      if (typeof computed !== 'number') {
          throw new Error(computed === '#CYCLE!' ? 'cycle' : computed === '#LIMIT!' ? 'limit' : 'value');
        }
        return computed;
      }
      consumeStep(raw.length);
      const result = Number(raw);
      return Number.isFinite(result) ? result : 0;
    }

    function readRange(): number[] {
      skipSpace();
      const start = readCellReference();
      skipSpace();
      if (source[cursor] !== ':') throw new Error('range');
      cursor += 1;
      skipSpace();
      const end = readCellReference();
      if (start.sheet !== end.sheet) throw new Error('range');
      const startCell = parseCellKey(normalizeCellReference(start.cell));
      const endCell = parseCellKey(normalizeCellReference(end.cell));
      if (!startCell || !endCell) throw new Error('range');
      const firstCol = Math.min(colNameToIndex(startCell.col), colNameToIndex(endCell.col));
      const lastCol = Math.max(colNameToIndex(startCell.col), colNameToIndex(endCell.col));
      const firstRow = Math.min(startCell.row, endCell.row);
      const lastRow = Math.max(startCell.row, endCell.row);
      const area = (lastCol - firstCol + 1) * (lastRow - firstRow + 1);
      if (!Number.isSafeInteger(area) || area > limits.maxRangeCells) throw new Error('limit');
      const targetSheet = start.sheet === undefined
        ? currentSheet
        : sheets.find(sheet => sheet.id.toLowerCase() === start.sheet?.toLowerCase()
          || sheet.name.toLowerCase() === start.sheet?.toLowerCase());
      if (!targetSheet || lastRow > targetSheet.rows || lastCol >= targetSheet.cols) throw new Error('reference');
      const values: number[] = [];
      for (let col = firstCol; col <= lastCol; col += 1) {
        for (let row = firstRow; row <= lastRow; row += 1) {
          consumeStep();
          if (values.length >= limits.maxRangeCells) throw new Error('limit');
          values.push(cellValue({
            ...(start.sheet === undefined ? {} : { sheet: start.sheet }),
            cell: `${getColName(col)}${row}`,
          }));
        }
      }
      return values;
    }

    function readPrimary(): number {
      consumeStep();
      skipSpace();
      state.depth += 1;
      try {
        if (state.depth > limits.maxFormulaDepth) throw new Error('limit');
        return readAtom();
      } finally {
        state.depth -= 1;
      }
    }

    function readAtom(): number {
      if (source[cursor] === '(') {
        cursor += 1;
        const result = readExpression();
        skipSpace();
        if (source[cursor] !== ')') throw new Error('parenthesis');
        cursor += 1;
        return result;
      }
      if (source[cursor] === '-' || source[cursor] === '+') {
        const sign = source[cursor++] === '-' ? -1 : 1;
        return sign * readPrimary();
      }
      if (/[0-9.]/.test(source[cursor] ?? '')) return readNumber();

      const identifier = readCellReference();
      skipSpace();
      if (identifier.cell === 'IF' && identifier.sheet === undefined && source[cursor] === '(') {
        cursor += 1;
        const condition = readExpression();
        skipSpace();
        if (source[cursor] !== ',') throw new Error('function');
        cursor += 1;
        const whenTrue = readExpression();
        skipSpace();
        if (source[cursor] !== ',') throw new Error('function');
        cursor += 1;
        const whenFalse = readExpression();
        skipSpace();
        if (source[cursor] !== ')') throw new Error('function');
        cursor += 1;
        return condition !== 0 ? whenTrue : whenFalse;
      }
      if (['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'].includes(identifier.cell)
        && source[cursor] === '(' && identifier.sheet === undefined) {
        cursor += 1;
        const values = readRange();
        skipSpace();
        if (source[cursor] !== ')') throw new Error('function');
        cursor += 1;
        if (identifier.cell === 'SUM') return values.reduce((sum, value) => sum + value, 0);
        if (identifier.cell === 'AVG') return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
        if (identifier.cell === 'COUNT') return values.length;
        if (identifier.cell === 'MIN') return values.length > 0 ? Math.min(...values) : 0;
        return values.length > 0 ? Math.max(...values) : 0;
      }
      return cellValue(identifier);
    }

    function readTerm(): number {
      let result = readPrimary();
      skipSpace();
      while (source[cursor] === '*' || source[cursor] === '/') {
        const operator = source[cursor++];
        const next = readPrimary();
        if (operator === '/' && next === 0) throw new Error('division');
        result = operator === '*' ? result * next : result / next;
        skipSpace();
      }
      return result;
    }

    function readExpression(): number {
      let result = readTerm();
      skipSpace();
      while (source[cursor] === '+' || source[cursor] === '-') {
        const operator = source[cursor++];
        const next = readTerm();
        result = operator === '+' ? result + next : result - next;
        skipSpace();
      }
      return result;
    }

    try {
      state.steps += formula.length;
      if (state.steps > limits.maxFormulaSteps) throw new Error('limit');
      const result = readExpression();
      if (cursor !== source.length || !Number.isFinite(result)) return '#VALUE!';
      return result;
    } catch (error) {
      return error instanceof Error && error.message === 'cycle'
        ? '#CYCLE!'
        : error instanceof Error && error.message === 'limit' ? '#LIMIT!' : '#VALUE!';
    } finally {
      state.depth -= 1;
    }
  }

  const evaluatedCells = $derived.by(() => {
    const cells = cellSnapshot;
    const values = new Map<string, number | string>();
    if (!cells) return values;
    const sheetCells = new Map<string, Record<string, string>>();
    const sheetNames = new Map<string, string>();
    for (const sheet of sheets) {
      sheetCells.set(sheet.id.toLowerCase(), sheet.cells);
      sheetNames.set(sheet.id.toLowerCase(), sheet.id);
      sheetNames.set(sheet.name.toLowerCase(), sheet.id);
    }
    const resolveSheet = (name: string | undefined): Record<string, string> | undefined => {
      if (name === undefined) return cells;
      const sheetId = sheetNames.get(name.toLowerCase());
      return sheetId === undefined ? undefined : sheetCells.get(sheetId.toLowerCase());
    };
    // 同一数据快照共享预算和依赖缓存，禁止为每个单元格重新启动昂贵计算。
    const state: EvaluationState = { depth: 0, steps: 0, cache: values };
    for (const [key, raw] of Object.entries(cells)) {
      if (!values.has(`__current__!${key}`)) {
        const computed = evaluateFormula(raw, cells, new Set([`__current__!${key}`]), state, resolveSheet);
        values.set(`__current__!${key}`, computed);
        values.set(key, computed);
      }
    }
    return values;
  });

  $effect.pre(() => {
    if (selectionSheetId !== currentSheet?.id) {
      selectionSheetId = currentSheet?.id;
      selectedCell = 'A1';
      selectedRangeEnd = 'A1';
      selectionError = false;
    }
    if (cellSnapshot && !Object.hasOwn(cellSnapshot, selectedCell)) selectedCell = 'A1';
    if (cellSnapshot && !Object.hasOwn(cellSnapshot, selectedRangeEnd)) selectedRangeEnd = selectedCell;
    formulaInput = cellSnapshot?.[selectedCell] ?? '';
  });

  function getRenderedValue(key: string): string {
    const computed = evaluatedCells.get(key) ?? '';
    const format = cellFormat(key);
    const value = typeof computed === 'number' ? computed
      : format.numberFormat !== undefined && format.numberFormat !== 'general'
        && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(computed) ? Number(computed) : computed;
    if (typeof value !== 'number' || !Number.isFinite(value)) return String(computed);
    const decimals = format.decimalPlaces;
    const options = decimals === undefined || !Number.isInteger(decimals) || decimals < 0 || decimals > 20
      ? { maximumFractionDigits: 2 } : {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    };
    return value.toLocaleString(i18n.locale, {
      ...options, style: format.numberFormat === 'percent' ? 'percent' : 'decimal',
    });
  }

  function cellFormat(key = selectedCell): SpreadsheetCellFormat {
    return currentSheet?.formats?.[key] ?? {};
  }

  function updateCellFormat(patch: Partial<SpreadsheetCellFormat>) {
    if (readonly || !currentSheet || !canRender) return;
    const keys = selectedKeys();
    const targets = keys.length > 1 ? keys : [selectedCell];
    const nextSheets = sheets.map(sheet => {
      if (sheet.id !== currentSheet.id) return sheet;
      const formats = { ...(sheet.formats ?? {}) };
      for (const key of targets) formats[key] = { ...(formats[key] ?? {}), ...patch };
      return { ...sheet, formats };
    });
    commitSheets(nextSheets);
  }

  function selectCell(key: string) {
    selectionError = false;
    selectedRangeEnd = key;
    selectedCell = key;
    if (currentSheet) {
      formulaInput = currentSheet.cells[key] ?? '';
    }
  }

  function selectRange(key: string, extend: boolean) {
    selectionError = false;
    if (extend) {
      selectedRangeEnd = key;
      return;
    }
    selectCell(key);
  }

  function rangeBounds() {
    const start = parseCellKey(selectedCell);
    const end = parseCellKey(selectedRangeEnd);
    if (!start || !end) return null;
    const startCol = colNameToIndex(start.col);
    const endCol = colNameToIndex(end.col);
    return {
      firstCol: Math.min(startCol, endCol),
      lastCol: Math.max(startCol, endCol),
      firstRow: Math.min(start.row, end.row),
      lastRow: Math.max(start.row, end.row),
    };
  }

  function selectedKeys() {
    const bounds = rangeBounds();
    if (!bounds) return [];
    const keys: string[] = [];
    for (let row = bounds.firstRow; row <= bounds.lastRow; row += 1) {
      for (let col = bounds.firstCol; col <= bounds.lastCol; col += 1) {
        keys.push(`${getColName(col)}${row}`);
      }
    }
    return keys;
  }

  function isCellSelected(key: string) {
    const cell = parseCellKey(key);
    const bounds = rangeBounds();
    if (!cell || !bounds) return false;
    const col = colNameToIndex(cell.col);
    return cell.row >= bounds.firstRow && cell.row <= bounds.lastRow
      && col >= bounds.firstCol && col <= bounds.lastCol;
  }

  function applyCellValues(values: Map<string, string>): boolean {
    if (readonly || !currentSheet || !canRender || !cellSnapshot) return false;
    let textLength = Object.values(cellSnapshot).reduce((total, value) => total + value.length, 0);
    for (const [key, value] of values) {
      if (!Object.hasOwn(cellSnapshot, key) || value.length > limits.maxCellLength) return false;
      textLength += value.length - (cellSnapshot[key]?.length ?? 0);
    }
    if (textLength > 1_000_000) return false;
    const nextSheets = sheets.map((sheet) => sheet.id === currentSheet.id
      ? { ...sheet, cells: { ...sheet.cells, ...Object.fromEntries(values) } }
      : sheet);
    commitSheets(nextSheets);
    return true;
  }

  function clearSelection() {
    synchronizeHistory();
    const values = new Map(selectedKeys().map(key => [key, '']));
    applyCellValues(values);
  }

  function translateFormula(value: string, rowOffset: number, colOffset: number): string {
    if (!value.startsWith('=')) return value;
    return value.replace(/(?<![A-Z0-9_$])(\$?)([A-Z]+)(\$?)([1-9]\d*)\b/gi, (
      _match,
      columnAbsolute: string,
      letters: string,
      rowAbsolute: string,
      digits: string,
    ) => {
      const row = Number(digits);
      const col = colNameToIndex(letters.toUpperCase());
      const nextRow = rowAbsolute ? row : row + rowOffset;
      const nextCol = columnAbsolute ? col : col + colOffset;
      if (nextRow < 1 || nextRow > gridRows || nextCol < 0 || nextCol >= gridCols) throw new Error('reference');
      return `${columnAbsolute ? '$' : ''}${getColName(nextCol)}${rowAbsolute ? '$' : ''}${nextRow}`;
    });
  }

  function parseFillNumber(value: string): { value: number; precision: number } | undefined {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return undefined;
    const number = Number(value);
    if (!Number.isFinite(number)) return undefined;
    return { value: number, precision: value.includes('.') ? value.length - value.indexOf('.') - 1 : 0 };
  }

  function fillNumberSequence(bounds: NonNullable<ReturnType<typeof rangeBounds>>): {
    first: number;
    step: number;
    precision: number;
  } | undefined {
    const vertical = bounds.firstCol === bounds.lastCol && bounds.lastRow - bounds.firstRow >= 1;
    const horizontal = bounds.firstRow === bounds.lastRow && bounds.lastCol - bounds.firstCol >= 1;
    if (!vertical && !horizontal) return undefined;
    const firstKey = `${getColName(bounds.firstCol)}${bounds.firstRow}`;
    const secondKey = vertical
      ? `${getColName(bounds.firstCol)}${bounds.firstRow + 1}`
      : `${getColName(bounds.firstCol + 1)}${bounds.firstRow}`;
    const first = parseFillNumber(currentSheet?.cells[firstKey] ?? '');
    const second = parseFillNumber(currentSheet?.cells[secondKey] ?? '');
    if (!first || !second) return undefined;
    return {
      first: first.value,
      step: second.value - first.value,
      precision: Math.max(first.precision, second.precision),
    };
  }

  function fillSelection() {
    if (readonly || !currentSheet || !canRender) return;
    const bounds = rangeBounds();
    if (!bounds || (bounds.firstRow === bounds.lastRow && bounds.firstCol === bounds.lastCol)) return;
    const originKey = `${getColName(bounds.firstCol)}${bounds.firstRow}`;
    const origin = currentSheet.cells[originKey] ?? '';
    const sequence = fillNumberSequence(bounds);
    const values = new Map<string, string>();
    try {
      for (let row = bounds.firstRow; row <= bounds.lastRow; row += 1) {
        for (let col = bounds.firstCol; col <= bounds.lastCol; col += 1) {
          const key = `${getColName(col)}${row}`;
          const offset = bounds.firstCol === bounds.lastCol
            ? row - bounds.firstRow
            : col - bounds.firstCol;
          const translated = translateFormula(origin, row - bounds.firstRow, col - bounds.firstCol);
          if (sequence && !origin.startsWith('=')) {
            const value = sequence.first + sequence.step * offset;
            if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER
              || sequence.precision > 20) throw new Error('sequence');
            values.set(key, offset < 2 ? currentSheet.cells[key] ?? ''
              : sequence.precision > 0 ? value.toFixed(sequence.precision) : String(value));
          } else {
            values.set(key, translated);
          }
        }
      }
    } catch {
      selectionError = true;
      return;
    }
    selectionError = !applyCellValues(values);
  }

  function handleCellKeydown(event: KeyboardEvent) {
    if (event.isComposing) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      fillSelection();
      return;
    }
    const end = parseCellKey(selectedRangeEnd);
    if (event.shiftKey && end && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const col = Math.max(0, Math.min(gridCols - 1, colNameToIndex(end.col)
        + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0)));
      const row = Math.max(1, Math.min(gridRows, end.row
        + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0)));
      selectedRangeEnd = `${getColName(col)}${row}`;
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedKeys().length > 1) {
      event.preventDefault();
      clearSelection();
    }
  }

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    synchronizeHistory();
    if (readonly || !currentSheet || !canRender || !event.clipboardData) return;
    const csv = event.clipboardData.getData('text/csv');
    const text = csv || event.clipboardData.getData('text/plain');
    const rows = parseSpreadsheetClipboard(text, csv ? 'csv' : 'tsv');
    const bounds = rangeBounds();
    selectionError = true;
    if (!rows || !bounds) return;
    const firstRow = bounds.firstRow;
    const firstCol = bounds.firstCol;
    const values = new Map<string, string>();
    for (const [rowOffset, row] of rows.entries()) {
      for (const [colOffset, value] of row.entries()) {
        const rowIndex = firstRow + rowOffset;
        const colIndex = firstCol + colOffset;
        if (rowIndex > gridRows || colIndex >= gridCols) return;
        values.set(`${getColName(colIndex)}${rowIndex}`, value);
      }
    }
    if (!applyCellValues(values)) return;
    selectionError = false;
    selectedCell = `${getColName(firstCol)}${firstRow}`;
    selectedRangeEnd = `${getColName(firstCol + rows[0]!.length - 1)}${firstRow + rows.length - 1}`;
  }

  function handleCopy(event: ClipboardEvent) {
    if (!canRender || !currentSheet || selectedKeys().length <= 1 || !event.clipboardData) return;
    const bounds = rangeBounds();
    if (!bounds) return;
    const rows: (string | number)[][] = [];
    for (let row = bounds.firstRow; row <= bounds.lastRow; row += 1) {
      const values: (string | number)[] = [];
      for (let col = bounds.firstCol; col <= bounds.lastCol; col += 1) {
        values.push(evaluatedCells.get(`${getColName(col)}${row}`) ?? '');
      }
      rows.push(values);
    }
    event.preventDefault();
    const tsv = serializeSpreadsheetClipboard(rows, 'tsv');
    const csv = serializeSpreadsheetClipboard(rows, 'csv');
    if (tsv === undefined || csv === undefined) return;
    event.clipboardData.setData('text/plain', tsv);
    event.clipboardData.setData('text/csv', csv);
  }

  function updateCellValue(key: string, val: string) {
    if (readonly || !currentSheet || !canRender || !cellSnapshot || !Object.hasOwn(cellSnapshot, key)
      || val.length > limits.maxCellLength) return;
    const textLength = Object.values(cellSnapshot).reduce((total, value) => total + value.length, 0);
    if (textLength - (cellSnapshot[key]?.length ?? 0) + val.length > 1_000_000) return;
    const nextSheets = sheets.map((s) => {
      if (s.id === currentSheet.id) {
        return {
          ...s,
          cells: {
            ...s.cells,
            [key]: val,
          },
        };
      }
      return s;
    });
    commitSheets(nextSheets);
  }

  function addRow() {
    if (readonly || !currentSheet || !canAddRow) return;
    const next = sheets.map((s) => (s.id === currentSheet.id ? { ...s, rows: s.rows + 1 } : s));
    commitSheets(next);
  }

  function addCol() {
    if (readonly || !currentSheet || !canAddCol) return;
    const next = sheets.map((s) => (s.id === currentSheet.id ? { ...s, cols: s.cols + 1 } : s));
    commitSheets(next);
  }

  function undo() {
    synchronizeHistory();
    if (readonly || undoHistory.length === 0) return;
    const previous = undoHistory.at(-1);
    if (!previous) return;
    redoHistory = pushBounded(redoHistory);
    undoHistory = undoHistory.slice(0, -1);
    restoreHistory(previous);
  }

  function redo() {
    synchronizeHistory();
    if (readonly || redoHistory.length === 0) return;
    const next = redoHistory.at(-1);
    if (!next) return;
    undoHistory = pushBounded(undoHistory);
    redoHistory = redoHistory.slice(0, -1);
    restoreHistory(next);
  }

  function restoreHistory(entry: HistoryEntry) {
    // 历史仅来自当前组件序列化的 SheetData，不接收外部历史载荷。
    const restored = JSON.parse(entry.data) as SheetData[];
    sheets = restored;
    activeSheetId = entry.activeSheetId;
    committedSheets = sheets;
    committedFingerprint = fingerprintSheets(restored);
    committedScopeKey = scopeKey;
    notifyChange(restored);
  }

  function exportCsv() {
    if (!currentSheet || !canRender) return;
    const records: Record<string, unknown>[] = [];
    for (let r = 1; r <= currentSheet.rows; r++) {
      const row: Record<string, unknown> = {};
      for (let c = 0; c < currentSheet.cols; c++) {
        const k = `${getColName(c)}${r}`;
        const computed = evaluatedCells.get(k) ?? '';
        // 文本先中和公式前缀，数值保留机器可读精度；CSV 引号由公共编码器负责。
        row[getColName(c)] = typeof computed === 'string' && (/^[\t\r\n]/.test(computed) || /^\s*[=+@-]/.test(computed))
          ? `'${computed}` : computed;
      }
      records.push(row);
    }
    // 公共编码器包含表头；工作表导出只保留原有数据行。
    const csvContent = toCsv(records).split('\n').slice(1).join('\n');
    if (onexport) {
      onexport(csvContent);
    } else {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `${currentSheet.name}_${Date.now()}.csv`;
      try {
        a.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
    }
  }

  function exportWorkbook() {
    const json = workbookJson;
    if (json === undefined) return;
    if (onworkbookexport) {
      onworkbookexport(json);
      return;
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'workbook.json';
    try {
      anchor.click();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
  }

  function workbookFitsLimits(workbook: SpreadsheetWorkbook): boolean {
    return workbook.sheets.length <= limits.maxSheets && workbook.sheets.every(sheet =>
      sheet.rows <= limits.maxRows && sheet.cols <= limits.maxCols
      && sheet.rows * sheet.cols <= limits.maxCells
      && Object.values(sheet.cells).every(value => value.length <= limits.maxCellLength));
  }

  async function exportWorkbookXlsx() {
    const json = workbookJson;
    const exporter = xlsxexporter;
    const deliver = onxlsxexport;
    if (json === undefined || !exporter || workbookXlsxExporting) return;
    const request = {};
    const context = xlsxContext;
    xlsxExportRequest = request;
    const current = () => importMounted && xlsxExportRequest === request && context === xlsxContext;
    workbookXlsxError = false;
    workbookXlsxExporting = true;
    try {
      const workbook = parseSpreadsheetWorkbook(json);
      if (!workbook) throw new Error('invalid workbook');
      const bytes = await exporter(workbook);
      if (!current()) return;
      if (!(bytes instanceof Uint8Array) || bytes.byteLength < 4 || bytes.byteLength > 50 * 1024 * 1024
        || bytes[0] !== 80 || bytes[1] !== 75 || bytes[2] !== 3 || bytes[3] !== 4) throw new Error('invalid export');
      const snapshot = new Uint8Array(bytes);
      if (deliver) {
        await deliver(snapshot);
      } else {
        const url = URL.createObjectURL(new Blob([snapshot], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }));
        try {
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = 'workbook.xlsx';
          anchor.click();
        } finally {
          setTimeout(() => URL.revokeObjectURL(url), 10_000);
        }
      }
    } catch {
      if (current()) workbookXlsxError = true;
    } finally {
      if (current()) workbookXlsxExporting = false;
    }
  }

  async function importWorkbook(event: Event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    input.value = '';
    workbookImportError = false;
    pendingWorkbook = undefined;
    importController?.abort();
    const controller = new AbortController();
    importController = controller;
    const importer = xlsximporter;
    const request = {};
    importRequest = request;
    const context = importContext;
    const current = () => importMounted && importRequest === request && context === importContext && !readonly;
    if (readonly || !file || file.size > 10_000_000) {
      workbookImportError = Boolean(file);
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!current()) return;
      const isXlsx = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        || file.name.toLowerCase().endsWith('.xlsx')
        || bytes[0] === 0x50 && bytes[1] === 0x4b;
      const workbook = isXlsx
        ? importer ? snapshotSpreadsheetWorkbook(await importer(bytes.slice(), { ...limits }, controller.signal)) : undefined
        : parseSpreadsheetWorkbook(new TextDecoder().decode(bytes));
      if (!current()) return;
      if (!workbook || !workbookFitsLimits(workbook)) throw new Error('invalid workbook');
      pendingWorkbook = { workbook, context };
    } catch {
      if (current()) workbookImportError = true;
    }
  }

  function confirmWorkbookImport() {
    if (!importReady || !pendingWorkbook) return;
    const workbook = pendingWorkbook.workbook;
    pendingWorkbook = undefined;
    commitSheets(workbook.sheets, workbook.activeSheetId ?? workbook.sheets[0]!.id);
  }

  function addSheet() {
    if (readonly || !validWorkbook || sheets.length >= limits.maxSheets) return;
    const id = `sheet_${crypto.randomUUID()}`;
    const newSheet: SheetData = {
      id,
      name: i18n.t('spreadsheet.sheetName', { number: String(sheets.length + 1) }),
      rows: Math.min(6, limits.maxRows, limits.maxCells),
      cols: Math.min(5, limits.maxCols, Math.max(1, Math.floor(limits.maxCells / Math.min(6, limits.maxRows, limits.maxCells)))),
      cells: {},
    };
    const nextSheets = [...sheets, newSheet];
    commitSheets(nextSheets, id);
  }
</script>

<div class={cn('svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-359090c2d529 svadmin-u-6f7e013d6499 svadmin-u-eb6e8b881acd svadmin-u-2cd02d11d1af', className)}>
  <!-- Header Toolbar -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      <FileSpreadsheet class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-20aaf08a7ed1 svadmin-u-012fbd121f37" />
      <span class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{currentSheet?.name ?? i18n.t('spreadsheet.title')}</span>
    </div>

    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568" style:flex-wrap="wrap">
      <input bind:this={fileInput} aria-label={i18n.t('spreadsheet.importWorkbook')} hidden type="file"
        accept={xlsximporter ? 'application/json,.json,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/json,.json'}
        onchange={importWorkbook} />
      {#if !readonly}
        <Button variant="outline" size="sm" onclick={() => fileInput?.click()}>
          <Upload class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
          {i18n.t('spreadsheet.importWorkbook')}
        </Button>
        <Button variant="ghost" size="sm" disabled={undoHistory.length === 0} class="svadmin-u-f6fe902450dc svadmin-u-8a539c7fe216" onclick={undo} aria-label={i18n.t('spreadsheet.undo')} title={i18n.t('spreadsheet.undo')}>
          <Undo2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        </Button>
        <Button variant="ghost" size="sm" disabled={redoHistory.length === 0} class="svadmin-u-f6fe902450dc svadmin-u-8a539c7fe216" onclick={redo} aria-label={i18n.t('spreadsheet.redo')} title={i18n.t('spreadsheet.redo')}>
          <Redo2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        </Button>
        <Button variant="ghost" size="sm" disabled={!canRender} onclick={clearSelection} aria-label={i18n.t('spreadsheet.clear')} title={i18n.t('spreadsheet.clear')}>
          <Trash2 class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        </Button>
        <Button variant="ghost" size="sm" disabled={!canRender || selectedKeys().length < 2} onclick={fillSelection} aria-label={i18n.t('spreadsheet.fill')} title={i18n.t('spreadsheet.fill')}>
          <Copy aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="sm" disabled={!canRender} aria-pressed={cellFormat().bold === true} onclick={() => updateCellFormat({ bold: !cellFormat().bold })} aria-label={i18n.t('spreadsheet.bold')} title={i18n.t('spreadsheet.bold')}>
          <Bold aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="sm" disabled={!canRender} aria-pressed={cellFormat().italic === true} onclick={() => updateCellFormat({ italic: !cellFormat().italic })} aria-label={i18n.t('spreadsheet.italic')} title={i18n.t('spreadsheet.italic')}>
          <Italic aria-hidden="true" />
        </Button>
        <select disabled={!canRender} aria-label={i18n.t('spreadsheet.numberFormat')} value={cellFormat().numberFormat ?? 'general'} onchange={(event) => {
          const value = event.currentTarget.value;
          if (value === 'general' || value === 'number' || value === 'percent') updateCellFormat({ numberFormat: value });
        }}>
          <option value="general">{i18n.t('spreadsheet.general')}</option>
          <option value="number">{i18n.t('spreadsheet.number')}</option>
          <option value="percent">{i18n.t('spreadsheet.percent')}</option>
        </select>
        <input type="number" min="0" max="20" step="1" style:width="4rem"
          disabled={!canRender} aria-label={i18n.t('spreadsheet.decimalPlaces')}
          value={cellFormat().decimalPlaces ?? 2} onchange={(event) => {
            const value = event.currentTarget.valueAsNumber;
            if (Number.isInteger(value) && value >= 0 && value <= 20) updateCellFormat({ decimalPlaces: value });
          }} />
        <select disabled={!canRender} aria-label={i18n.t('spreadsheet.align')} value={cellFormat().align ?? 'left'} onchange={(event) => {
          const value = event.currentTarget.value;
          if (value === 'left' || value === 'center' || value === 'right') updateCellFormat({ align: value });
        }}>
          <option value="left">{i18n.t('spreadsheet.left')}</option>
          <option value="center">{i18n.t('spreadsheet.center')}</option>
          <option value="right">{i18n.t('spreadsheet.right')}</option>
        </select>
        <Button variant="outline" size="sm" disabled={!canAddRow} class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={addRow}>
          <Plus class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
          {i18n.t('spreadsheet.row')}
        </Button>
        <Button variant="outline" size="sm" disabled={!canAddCol} class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={addCol}>
          <Plus class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
          {i18n.t('spreadsheet.column')}
        </Button>
      {/if}

      <Button size="sm" disabled={!canRender} class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={exportCsv}>
        <Download class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        {i18n.t('spreadsheet.export')}
      </Button>
      <Button size="sm" disabled={workbookJson === undefined} class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={exportWorkbook}>
        <Download class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        {i18n.t('spreadsheet.exportWorkbook')}
      </Button>
      {#if xlsxexporter}
        <Button size="sm" disabled={workbookJson === undefined || workbookXlsxExporting} aria-busy={workbookXlsxExporting}
          class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={exportWorkbookXlsx}>
          <Download class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
          {i18n.t('spreadsheet.exportXlsx')}
        </Button>
      {/if}
    </div>
  </div>
  {#if workbookImportError}<p role="alert">{i18n.t('spreadsheet.importRejected')}</p>{/if}
  {#if workbookXlsxError}<p role="alert">{i18n.t('common.operationFailed')}</p>{/if}
  {#if importReady && pendingWorkbook}
    <div role="group" aria-label={i18n.t('spreadsheet.confirmImport')}>
      <p>{i18n.t('spreadsheet.replaceWorkbook')}</p>
      <Button onclick={confirmWorkbookImport}>{i18n.t('spreadsheet.confirmImport')}</Button>
      <Button variant="ghost" onclick={() => { pendingWorkbook = undefined; }}>{i18n.t('common.cancel')}</Button>
    </div>
  {/if}

  <!-- Formula Bar -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-5f22e64f2282 svadmin-u-b00f43c30c2b svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-0e65706bcccd">
    <div class="svadmin-u-d5eab218aa34 svadmin-u-465609a240a8 svadmin-u-07389a777c1f svadmin-u-e6f9e383a762 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-d4108abe6359 svadmin-u-e83a7042bc91 svadmin-u-d058ca6de60f svadmin-u-28ae52cc20ae svadmin-u-ca6bf63030aa">
      {selectedCell}
    </div>
    <span class="svadmin-u-bfa603190748 svadmin-u-359090c2d529">fx</span>
    <input
      type="text"
      bind:value={formulaInput}
      {readonly}
      disabled={!canRender}
      maxlength={limits.maxCellLength}
      aria-label={i18n.t('spreadsheet.formula')}
      class="svadmin-u-36e579c0b41c svadmin-u-f6fe902450dc svadmin-u-7f19cdf4c5bb svadmin-u-119b2aa0b8f6 svadmin-u-d8e0e382c67b svadmin-u-359090c2d529 svadmin-u-d4108abe6359 svadmin-u-f10f771f87e9 svadmin-u-35ca6b75d707 svadmin-u-0e65706bcccd"
      oninput={(e) => updateCellValue(selectedCell, e.currentTarget.value)}
      onkeydown={(e) => { if (e.key === 'Enter') updateCellValue(selectedCell, e.currentTarget.value); }}
    />
  </div>

  <!-- Spreadsheet Grid -->
  {#if selectionError}
    <p role="alert">{i18n.t('spreadsheet.pasteRejected')}</p>
  {/if}
  {#if !validWorkbook || (currentSheet && !canRender)}
    <p role="alert">{i18n.t('spreadsheet.invalid')}</p>
  {:else if !currentSheet}
    <p role="status">{i18n.t('spreadsheet.empty')}</p>
  {:else}
    <div class="svadmin-u-73fc3fb18ceb svadmin-u-b63b7d8eef5d svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-5f22e64f2282">
      <table class="svadmin-u-6da6a3c3f741 svadmin-u-4583f90cd9bd svadmin-u-2eba0d65d059 svadmin-u-0e65706bcccd">
        <thead class="svadmin-u-706701550477 svadmin-u-3e0fd166d494 svadmin-u-2167406b24d7 svadmin-u-236812d64c82 svadmin-u-bfa603190748">
          <tr>
            <th class="svadmin-u-d854e5698b57 svadmin-u-cd009d7d208c svadmin-u-ca6bf63030aa svadmin-u-5ceb636bd9f3 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-85d919893645 svadmin-u-1dc571a3609f">#</th>
            {#each Array.from({ length: gridCols }) as _, c (c)}
              <th class="svadmin-u-25effcb585ab svadmin-u-cd009d7d208c svadmin-u-ca6bf63030aa svadmin-u-5ceb636bd9f3 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-359090c2d529">
                {getColName(c)}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258">
          {#each Array.from({ length: gridRows }) as _, r (r)}
            {@const rowNum = r + 1}
            <tr class="svadmin-u-9fc5d875f5ca">
              <td class="svadmin-u-d854e5698b57 svadmin-u-eb6a3cef9686 svadmin-u-ca6bf63030aa svadmin-u-5ceb636bd9f3 svadmin-u-05faf5c801ff svadmin-u-2859c861d7de svadmin-u-1dc571a3609f svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-7f6912283f11">
                {rowNum}
              </td>
              {#each Array.from({ length: gridCols }) as _, c (c)}
                {@const cellKey = `${getColName(c)}${rowNum}`}
                {@const computedCell = evaluatedCells.get(cellKey)}
                {@const errorCell = typeof computedCell === 'string' ? computedCell : ''}
                {@const isSelected = isCellSelected(cellKey)}
                <td
                  data-selected={isSelected || undefined}
                  class={cn(
                    'svadmin-u-8a539c7fe216 svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-d89972fe17d6 svadmin-u-34516836730d',
                    isSelected ? 'svadmin-u-16b1efa5875e svadmin-u-fd1dda07320a svadmin-u-236812d64c82 svadmin-u-989c466fdbe7' : ''
                  )}
                  onmousedown={(event) => {
                    if (event.shiftKey) event.preventDefault();
                  }}
                  onclick={(event) => selectRange(cellKey, event.shiftKey)}
                >
                  <input
                    type="text"
                    {readonly}
                    aria-label={cellKey}
                    maxlength={limits.maxCellLength}
                    value={selectedCell === cellKey && !readonly
                      && !errorCell.startsWith('#')
                      ? (cellSnapshot?.[cellKey] ?? '')
                      : getRenderedValue(cellKey)}
                    class={cn(
                      'svadmin-u-6da6a3c3f741 svadmin-u-d0a52b312f7d svadmin-u-d5eab218aa34 svadmin-u-7f19cdf4c5bb svadmin-u-119b2aa0b8f6 svadmin-u-359090c2d529 svadmin-u-0e65706bcccd svadmin-u-f10f771f87e9',
                      typeof computedCell === 'number' ? 'svadmin-u-308fc069e46e' : 'svadmin-u-2eba0d65d059'
                    )}
                    style:font-weight={cellFormat(cellKey).bold === true ? '700' : '400'}
                    style:font-style={cellFormat(cellKey).italic === true ? 'italic' : 'normal'}
                    style:text-align={['left', 'center', 'right'].includes(cellFormat(cellKey).align ?? '')
                      ? cellFormat(cellKey).align : typeof computedCell === 'number' ? 'right' : 'left'}
                    onfocus={() => selectCell(cellKey)}
                    oninput={(e) => updateCellValue(cellKey, e.currentTarget.value)}
                    onkeydown={handleCellKeydown}
                    oncopy={handleCopy}
                    onpaste={handlePaste}
                  />
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- Sheet Tabs Footer -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-6b7d6e21ccbd svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-1384f66f41d0">
      {#each (validWorkbook ? sheets : []) as sheet (sheet.id)}
        {@const isActive = sheet.id === activeSheetId}
        <button
          type="button"
          class={cn(
            'svadmin-u-0e17f2bd9074 svadmin-u-660d2effb880 svadmin-u-421ac2be5045 svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-ca6bcd4b6f3f',
            isActive
              ? 'svadmin-u-75b1bec3ea0e svadmin-u-30ca335ae9c2 svadmin-u-6cbc84dd9e1a svadmin-u-cef5b893cf23'
              : 'svadmin-u-cd0ad9a56558 svadmin-u-bfa603190748 svadmin-u-05faf5c801ff svadmin-u-ea7b2e9e070e svadmin-u-68646cdcc246'
          )}
          onclick={() => {
            activeSheetId = sheet.id;
            selectedCell = 'A1';
            selectedRangeEnd = 'A1';
            selectionError = false;
            formulaInput = sheet.cells['A1'] ?? '';
          }}
        >
          {sheet.name}
        </button>
      {/each}

      {#if !readonly}
        <Button variant="ghost" size="sm" disabled={!validWorkbook || sheets.length >= limits.maxSheets} class="svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 svadmin-u-8a539c7fe216 svadmin-u-bfa603190748" onclick={addSheet} aria-label={i18n.t('spreadsheet.newSheet')} title={i18n.t('spreadsheet.newSheet')}>
          <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        </Button>
      {/if}
    </div>
  </div>
</div>
