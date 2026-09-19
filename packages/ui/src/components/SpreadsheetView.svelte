<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Plus, Download, FileSpreadsheet } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { evaluateFormula, safeSpreadsheetCsvText } from './enterprise/spreadsheet-formula.js';

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
    readonly?: boolean;
    onchange?: (sheets: SheetData[]) => void;
    onexport?: (csv: string) => void;
    class?: string;
  }
  let {
    sheets = $bindable([{ id: 'sheet1', name: 'Financial Summary', rows: 8, cols: 6, cells: {
      A1: 'Category', B1: 'Q1', C1: 'Q2', D1: 'Q3', E1: 'Q4', F1: 'Total',
      A2: 'Revenue', B2: '12000', C2: '15000', D2: '18000', E2: '21000', F2: '=SUM(B2:E2)',
      A3: 'Cost', B3: '4000', C3: '5000', D3: '6000', E3: '7000', F3: '=SUM(B3:E3)',
    } }]),
    activeSheetId = $bindable('sheet1'), readonly = false, onchange, onexport, class: className = '',
  }: Props = $props();
  let selectedCell = $state('A1');
  let formulaInput = $state('');
  let nextSheetId = 0;
  const currentSheet = $derived(sheets.find((sheet) => sheet.id === activeSheetId) ?? sheets[0]);
  $effect(() => { formulaInput = currentSheet?.cells[selectedCell] ?? ''; });

  function getColName(index: number): string {
    let result = '', current = index;
    while (current >= 0) { result = String.fromCharCode(current % 26 + 65) + result; current = Math.floor(current / 26) - 1; }
    return result;
  }
  function getRenderedValue(key: string): string {
    if (!currentSheet) return '';
    const computed = evaluateFormula(currentSheet.cells[key] ?? '', currentSheet.cells);
    return typeof computed === 'number' ? computed.toLocaleString(undefined, { maximumFractionDigits: 2 }) : computed;
  }
  function selectCell(key: string): void { selectedCell = key; formulaInput = currentSheet?.cells[key] ?? ''; }
  function updateCellValue(key: string, next: string): void {
    if (readonly || !currentSheet) return;
    const id = currentSheet.id;
    sheets = sheets.map((sheet) => sheet.id === id ? { ...sheet, cells: { ...sheet.cells, [key]: next } } : sheet);
    if (key === selectedCell) formulaInput = next;
    onchange?.(sheets);
  }
  function addRow(): void {
    if (readonly || !currentSheet) return;
    const id = currentSheet.id;
    sheets = sheets.map((sheet) => sheet.id === id ? { ...sheet, rows: sheet.rows + 1 } : sheet);
    onchange?.(sheets);
  }
  function addCol(): void {
    if (readonly || !currentSheet) return;
    const id = currentSheet.id;
    sheets = sheets.map((sheet) => sheet.id === id ? { ...sheet, cols: sheet.cols + 1 } : sheet);
    onchange?.(sheets);
  }
  function exportCsv(): void {
    if (!currentSheet) return;
    const sheet = currentSheet;
    const lines: string[] = [];
    for (let row = 1; row <= sheet.rows; row++) {
      const values: string[] = [];
      for (let column = 0; column < sheet.cols; column++) {
        const key = `${getColName(column)}${row}`;
        const computed = evaluateFormula(sheet.cells[key] ?? '', sheet.cells);
        // 数值导出保持机器可读精度；文本危险前缀与 CSV 引号分别处理。
        const numericText = typeof computed === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(computed.trim()) && Number.isFinite(Number(computed));
        const text = typeof computed === 'number' || numericText ? String(computed) : safeSpreadsheetCsvText(computed);
        values.push(`"${text.replaceAll('"', '""')}"`);
      }
      lines.push(values.join(','));
    }
    const csv = lines.join('\n');
    if (onexport) { onexport(csv); return; }
    if (typeof document === 'undefined') return;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${sheet.name}_${Date.now()}.csv`;
      anchor.click();
    } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
  }
  function addSheet(): void {
    if (readonly) return;
    const id = `sheet_${Date.now()}_${++nextSheetId}`;
    sheets = [...sheets, { id, name: `Sheet ${sheets.length + 1}`, rows: 6, cols: 5, cells: {} }];
    activeSheetId = id;
    selectedCell = 'A1';
    onchange?.(sheets);
  }
</script>

<div data-testid="spreadsheet-view" class={cn('svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-359090c2d529 svadmin-u-6f7e013d6499 svadmin-u-eb6e8b881acd svadmin-u-2cd02d11d1af', className)}>
  <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      <FileSpreadsheet class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-20aaf08a7ed1 svadmin-u-012fbd121f37" aria-hidden="true" />
      <span class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{currentSheet?.name ?? 'Spreadsheet'}</span>
    </div>
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
      {#if !readonly}
        <Button type="button" variant="outline" size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={addRow}><Plus size={14} aria-hidden="true" />Row</Button>
        <Button type="button" variant="outline" size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={addCol}><Plus size={14} aria-hidden="true" />Column</Button>
      {/if}
      <Button type="button" size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={exportCsv}><Download size={14} aria-hidden="true" />Export CSV</Button>
    </div>
  </div>
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4 svadmin-u-d5eab218aa34 svadmin-u-ec0091ee009b svadmin-u-5f22e64f2282 svadmin-u-b00f43c30c2b svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-0e65706bcccd">
    <div class="svadmin-u-d5eab218aa34 svadmin-u-465609a240a8 svadmin-u-07389a777c1f svadmin-u-e6f9e383a762 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-d4108abe6359 svadmin-u-e83a7042bc91 svadmin-u-d058ca6de60f svadmin-u-28ae52cc20ae svadmin-u-ca6bf63030aa">{selectedCell}</div>
    <span class="svadmin-u-bfa603190748 svadmin-u-359090c2d529">fx</span>
    <input type="text" value={formulaInput} {readonly} aria-label={`Formula ${selectedCell}`} placeholder="Value or formula, e.g. =SUM(B2:E2)"
      class="svadmin-u-36e579c0b41c svadmin-u-f6fe902450dc svadmin-u-7f19cdf4c5bb svadmin-u-119b2aa0b8f6 svadmin-u-d8e0e382c67b svadmin-u-359090c2d529 svadmin-u-d4108abe6359 svadmin-u-f10f771f87e9 svadmin-u-35ca6b75d707 svadmin-u-0e65706bcccd"
      oninput={(event) => updateCellValue(selectedCell, event.currentTarget.value)}
      onkeydown={(event) => { if (event.key === 'Enter') { event.preventDefault(); updateCellValue(selectedCell, event.currentTarget.value); } }} />
  </div>
  {#if currentSheet}
    <div class="svadmin-u-73fc3fb18ceb svadmin-u-b63b7d8eef5d svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-5f22e64f2282">
      <table aria-label={currentSheet.name} class="svadmin-u-6da6a3c3f741 svadmin-u-4583f90cd9bd svadmin-u-2eba0d65d059 svadmin-u-0e65706bcccd">
        <thead class="svadmin-u-706701550477 svadmin-u-3e0fd166d494 svadmin-u-2167406b24d7 svadmin-u-236812d64c82 svadmin-u-bfa603190748"><tr>
          <th class="svadmin-u-d854e5698b57 svadmin-u-cd009d7d208c svadmin-u-ca6bf63030aa svadmin-u-5ceb636bd9f3 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-85d919893645 svadmin-u-1dc571a3609f">#</th>
          {#each Array.from({ length: currentSheet.cols }) as _, column (column)}<th scope="col" class="svadmin-u-25effcb585ab svadmin-u-cd009d7d208c svadmin-u-ca6bf63030aa svadmin-u-5ceb636bd9f3 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-359090c2d529">{getColName(column)}</th>{/each}
        </tr></thead>
        <tbody class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258">
          {#each Array.from({ length: currentSheet.rows }) as _, row (row)}
            <tr class="svadmin-u-9fc5d875f5ca">
              <td class="svadmin-u-d854e5698b57 svadmin-u-eb6a3cef9686 svadmin-u-ca6bf63030aa svadmin-u-5ceb636bd9f3 svadmin-u-05faf5c801ff svadmin-u-2859c861d7de svadmin-u-1dc571a3609f svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-7f6912283f11">{row + 1}</td>
              {#each Array.from({ length: currentSheet.cols }) as _, column (column)}
                {@const cellKey = `${getColName(column)}${row + 1}`}
                {@const selected = selectedCell === cellKey}
                <td class={cn('svadmin-u-8a539c7fe216 svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-d89972fe17d6 svadmin-u-34516836730d', selected ? 'svadmin-u-16b1efa5875e svadmin-u-fd1dda07320a svadmin-u-236812d64c82 svadmin-u-989c466fdbe7' : '')} onclick={() => selectCell(cellKey)}>
                  <input type="text" {readonly} aria-label={`Cell ${cellKey}`} value={selected ? currentSheet.cells[cellKey] ?? '' : getRenderedValue(cellKey)}
                    class={cn('svadmin-u-6da6a3c3f741 svadmin-u-d0a52b312f7d svadmin-u-d5eab218aa34 svadmin-u-7f19cdf4c5bb svadmin-u-119b2aa0b8f6 svadmin-u-359090c2d529 svadmin-u-0e65706bcccd svadmin-u-f10f771f87e9', typeof evaluateFormula(currentSheet.cells[cellKey] ?? '', currentSheet.cells) === 'number' ? 'svadmin-u-308fc069e46e' : 'svadmin-u-2eba0d65d059')}
                    onfocus={() => selectCell(cellKey)} oninput={(event) => updateCellValue(cellKey, event.currentTarget.value)} />
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-6b7d6e21ccbd svadmin-u-b950dda299d3 svadmin-u-05faf5c801ff">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421 svadmin-u-1384f66f41d0">
      {#each sheets as sheet (sheet.id)}
        <button type="button" class={cn('svadmin-u-0e17f2bd9074 svadmin-u-660d2effb880 svadmin-u-421ac2be5045 svadmin-u-359090c2d529 svadmin-u-2689f3958069 svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d svadmin-u-ca6bcd4b6f3f', sheet.id === activeSheetId ? 'svadmin-u-75b1bec3ea0e svadmin-u-30ca335ae9c2 svadmin-u-6cbc84dd9e1a svadmin-u-cef5b893cf23' : 'svadmin-u-cd0ad9a56558 svadmin-u-bfa603190748 svadmin-u-05faf5c801ff svadmin-u-ea7b2e9e070e svadmin-u-68646cdcc246')}
          onclick={() => { activeSheetId = sheet.id; selectedCell = 'A1'; }}>{sheet.name}</button>
      {/each}
      {#if !readonly}<Button type="button" variant="ghost" size="sm" class="svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 svadmin-u-8a539c7fe216 svadmin-u-bfa603190748" onclick={addSheet} title="New Sheet" aria-label="New Sheet"><Plus size={14} aria-hidden="true" /></Button>{/if}
    </div>
  </div>
</div>
