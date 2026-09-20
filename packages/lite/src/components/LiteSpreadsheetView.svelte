<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  const i18n = useTranslation();

  export interface SheetData {
    id: string;
    name: string;
    rows: number;
    cols: number;
    cells: Record<string, string>;
  }

  interface Props {
    sheets?: SheetData[];
    activeSheetId?: string;
    formAction?: string;
    readonly?: boolean;
    limits?: Partial<{ maxRows: number; maxCols: number; maxCells: number; maxSheets: number; maxCellLength: number }>;
    class?: string;
  }

  let {
    sheets = [
      {
        id: 'sheet1',
        name: 'Summary',
        rows: 5,
        cols: 4,
        cells: { A1: 'Item', B1: 'Amount', A2: 'Sales', B2: '1000' },
      },
    ],
    activeSheetId = 'sheet1',
    formAction = '',
    readonly = false,
    limits: limitOverrides = {},
    class: className = '',
  }: Props = $props();

  const limits = $derived.by(() => {
    const bounded = (value: number | undefined, ceiling: number) =>
      typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? Math.min(value, ceiling) : ceiling;
    return {
      maxRows: bounded(limitOverrides.maxRows, 1000),
      maxCols: bounded(limitOverrides.maxCols, 100),
      maxCells: bounded(limitOverrides.maxCells, 10_000),
      maxSheets: bounded(limitOverrides.maxSheets, 32),
      maxCellLength: bounded(limitOverrides.maxCellLength, 10_000),
    };
  });
  const validWorkbook = $derived(sheets.length <= limits.maxSheets && new Set(sheets.map(sheet => sheet.id)).size === sheets.length);
  const currentSheet = $derived(validWorkbook ? (sheets.find(s => s.id === activeSheetId) ?? sheets[0]) : undefined);
  const canRender = $derived.by(() => {
    if (!currentSheet || !currentSheet.cells || typeof currentSheet.cells !== 'object'
      || !Number.isSafeInteger(currentSheet.rows) || currentSheet.rows < 1 || currentSheet.rows > limits.maxRows
      || !Number.isSafeInteger(currentSheet.cols) || currentSheet.cols < 1 || currentSheet.cols > limits.maxCols
      || currentSheet.rows * currentSheet.cols > limits.maxCells) return false;
    let textLength = 0;
    for (let row = 1; row <= currentSheet.rows; row++) {
      for (let col = 0; col < currentSheet.cols; col++) {
        const key = `${getColName(col)}${row}`;
        const raw = Object.hasOwn(currentSheet.cells, key) ? currentSheet.cells[key] : '';
        if (typeof raw !== 'string' || raw.length > limits.maxCellLength) return false;
        textLength += raw.length;
        if (textLength > 1_000_000) return false;
      }
    }
    return true;
  });

  function getColName(index: number): string {
    let result = '';
    for (let i = index; i >= 0; i = Math.floor(i / 26) - 1) {
      result = String.fromCharCode(i % 26 + 65) + result;
    }
    return result;
  }
</script>

<div class="sv-lite-sheet-container {className}">
  <div class="sv-lite-sheet-header">
    <strong>{i18n.t('spreadsheet.title')}: {currentSheet?.name ?? ''}</strong>
  </div>

  {#if !validWorkbook || (currentSheet && !canRender)}
    <p role="alert">{i18n.t('spreadsheet.invalid')}</p>
  {:else if !currentSheet}
    <p role="status">{i18n.t('spreadsheet.empty')}</p>
  {:else}
    <form method="POST" action={formAction}>
      <input type="hidden" name="sheetId" value={currentSheet.id} />
      <table class="sv-lite-sheet-table">
        <thead>
          <tr>
            <th class="sv-lite-sheet-th-num">#</th>
            {#each Array.from({ length: currentSheet.cols }) as _, c (c)}
              <th class="sv-lite-sheet-th">{getColName(c)}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each Array.from({ length: currentSheet.rows }) as _, r (r)}
            {@const rowNum = r + 1}
            <tr>
              <td class="sv-lite-sheet-td-num">{rowNum}</td>
              {#each Array.from({ length: currentSheet.cols }) as _, c (c)}
                {@const key = `${getColName(c)}${rowNum}`}
                <td class="sv-lite-sheet-td">
                  <input
                    type="text"
                    {readonly}
                    aria-label={key}
                    maxlength={limits.maxCellLength}
                    name={`cell_${key}`}
                    value={Object.hasOwn(currentSheet.cells, key) ? currentSheet.cells[key] ?? '' : ''}
                    class="sv-lite-cell-input"
                  />
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>

      {#if formAction && !readonly}
        <div class="sv-lite-sheet-footer">
          <button type="submit" class="sv-lite-sheet-save">{i18n.t('common.save')}</button>
        </div>
      {/if}
    </form>
  {/if}
</div>

<style>
  .sv-lite-sheet-container {
    display: block;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px;
    background-color: #ffffff;
    font-size: 12px;
    overflow-x: auto;
  }
  .sv-lite-sheet-header {
    margin-bottom: 10px;
    font-size: 13px;
    color: #0f172a;
  }
  .sv-lite-sheet-table {
    width: 100%;
    border-collapse: collapse;
    font-family: monospace;
  }
  .sv-lite-sheet-table th, .sv-lite-sheet-table td {
    border: 1px solid #cbd5e1;
    padding: 2px;
  }
  .sv-lite-sheet-th-num, .sv-lite-sheet-td-num {
    background-color: #f1f5f9;
    text-align: center;
    width: 32px;
    color: #64748b;
    font-weight: bold;
    font-size: 10px;
  }
  .sv-lite-sheet-th {
    background-color: #f8fafc;
    text-align: center;
    font-weight: 600;
    color: #1e293b;
    min-width: 80px;
  }
  .sv-lite-cell-input {
    width: 100%;
    border: none;
    padding: 4px;
    font-size: 11px;
    box-sizing: border-box;
    font-family: inherit;
    background: transparent;
  }
  .sv-lite-sheet-footer {
    margin-top: 10px;
    text-align: right;
  }
  .sv-lite-sheet-save {
    padding: 5px 12px;
    background-color: #4f46e5;
    color: #ffffff;
    border: none;
    border-radius: 3px;
    font-size: 11px;
    cursor: pointer;
  }
</style>
