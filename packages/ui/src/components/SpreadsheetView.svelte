<script lang="ts">
  import { Button } from './ui/button/index.js';
  import { Plus, Download, FileSpreadsheet } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface SheetData {
    id: string;
    name: string;
    rows: number;
    cols: number;
    cells: Record<string, string>; // e.g. "A1": "100", "A2": "=SUM(A1:A1)"
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
    readonly = false,
    onchange,
    onexport,
    class: className = '',
  }: Props = $props();

  let selectedCell = $state<string>('A1');
  let formulaInput = $state('');

  const currentSheet = $derived(
    sheets.find((s) => s.id === activeSheetId) ?? sheets[0]
  );

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
    }
    return idx - 1;
  }

  function parseCellKey(key: string): { col: string; row: number } | null {
    const match = key.match(/^([A-Z]+)(\d+)$/);
    if (!match || !match[1] || !match[2]) return null;
    return { col: match[1], row: parseInt(match[2], 10) };
  }

  function evaluateFormula(formula: string, cells: Record<string, string>): number | string {
    const sumMatch = formula.match(/^=SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);
    const avgMatch = formula.match(/^=AVG\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);
    const countMatch = formula.match(/^=COUNT\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);

    const match = sumMatch || avgMatch || countMatch;
    if (match && match[1] && match[2]) {
      const start = parseCellKey(match[1].toUpperCase());
      const end = parseCellKey(match[2].toUpperCase());
      if (!start || !end) return '#ERROR!';

      const startCol = colNameToIndex(start.col);
      const endCol = colNameToIndex(end.col);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);

      const numbers: number[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        for (let r = minRow; r <= maxRow; r++) {
          const k = `${getColName(c)}${r}`;
          const raw = cells[k] ?? '';
          const val = raw.startsWith('=') ? evaluateFormula(raw, cells) : Number(raw);
          if (typeof val === 'number' && !isNaN(val)) {
            numbers.push(val);
          }
        }
      }

      if (sumMatch) return numbers.reduce((a, b) => a + b, 0);
      if (avgMatch) return numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
      if (countMatch) return numbers.length;
    }

    // Direct arithmetic
    if (formula.startsWith('=')) {
      try {
        const expr = formula.slice(1).replace(/([A-Z]+\d+)/g, (k) => {
          const val = cells[k.toUpperCase()] ?? '0';
          return String(Number(val) || 0);
        });
        const sanitized = expr.replace(/[^0-9+\-*/(). ]/g, '');
        const fn = new Function(`return (${sanitized || 0})`);
        return Number(fn());
      } catch {
        return '#VALUE!';
      }
    }

    return formula;
  }

  function getRenderedValue(key: string): string {
    if (!currentSheet) return '';
    const raw = currentSheet.cells[key] ?? '';
    if (raw.startsWith('=')) {
      const computed = evaluateFormula(raw, currentSheet.cells);
      return typeof computed === 'number'
        ? computed.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : String(computed);
    }
    return raw;
  }

  function selectCell(key: string) {
    selectedCell = key;
    if (currentSheet) {
      formulaInput = currentSheet.cells[key] ?? '';
    }
  }

  function updateCellValue(key: string, val: string) {
    if (readonly || !currentSheet) return;
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
    sheets = nextSheets;
    onchange?.(sheets);
  }

  function handleFormulaCommit() {
    if (!selectedCell) return;
    updateCellValue(selectedCell, formulaInput);
  }

  function addRow() {
    if (!currentSheet) return;
    const next = sheets.map((s) => (s.id === currentSheet.id ? { ...s, rows: s.rows + 1 } : s));
    sheets = next;
    onchange?.(sheets);
  }

  function addCol() {
    if (!currentSheet) return;
    const next = sheets.map((s) => (s.id === currentSheet.id ? { ...s, cols: s.cols + 1 } : s));
    sheets = next;
    onchange?.(sheets);
  }

  function exportCsv() {
    if (!currentSheet) return;
    const lines: string[] = [];
    for (let r = 1; r <= currentSheet.rows; r++) {
      const rowVals: string[] = [];
      for (let c = 0; c < currentSheet.cols; c++) {
        const k = `${getColName(c)}${r}`;
        const val = getRenderedValue(k).replace(/"/g, '""');
        rowVals.push(`"${val}"`);
      }
      lines.push(rowVals.join(','));
    }
    const csvContent = lines.join('\n');
    if (onexport) {
      onexport(csvContent);
    } else {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${currentSheet.name}_${Date.now()}.csv`;
      a.click();
    }
  }

  function addSheet() {
    const id = `sheet_${Date.now()}`;
    const newSheet: SheetData = {
      id,
      name: `Sheet ${sheets.length + 1}`,
      rows: 6,
      cols: 5,
      cells: {},
    };
    sheets = [...sheets, newSheet];
    activeSheetId = id;
    onchange?.(sheets);
  }
</script>

<div class={cn('svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-cef5b893cf23 svadmin-u-359090c2d529 svadmin-u-6f7e013d6499 svadmin-u-eb6e8b881acd svadmin-u-2cd02d11d1af', className)}>
  <!-- Header Toolbar -->
  <div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-77a2a20e90d4">
      <FileSpreadsheet class="svadmin-u-11e59c6d5f6b svadmin-u-dc7972ebf3f3 svadmin-u-20aaf08a7ed1 svadmin-u-012fbd121f37" />
      <span class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{currentSheet?.name ?? 'Spreadsheet'}</span>
    </div>

    <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-58284b4ea568">
      {#if !readonly}
        <Button variant="outline" size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={addRow}>
          <Plus class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
          Row
        </Button>
        <Button variant="outline" size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={addCol}>
          <Plus class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
          Column
        </Button>
      {/if}

      <Button size="sm" class="svadmin-u-d0a52b312f7d svadmin-u-359090c2d529 svadmin-u-44ee8ba0a421" onclick={exportCsv}>
        <Download class="svadmin-u-6a60c09e6aaa svadmin-u-9cea05671a29" />
        Export CSV
      </Button>
    </div>
  </div>

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
      placeholder="Value or formula, e.g. =SUM(B2:E2)"
      class="svadmin-u-36e579c0b41c svadmin-u-f6fe902450dc svadmin-u-7f19cdf4c5bb svadmin-u-119b2aa0b8f6 svadmin-u-d8e0e382c67b svadmin-u-359090c2d529 svadmin-u-d4108abe6359 svadmin-u-f10f771f87e9 svadmin-u-35ca6b75d707 svadmin-u-0e65706bcccd"
      oninput={handleFormulaCommit}
      onkeydown={(e) => { if (e.key === 'Enter') handleFormulaCommit(); }}
    />
  </div>

  <!-- Spreadsheet Grid -->
  {#if currentSheet}
    <div class="svadmin-u-73fc3fb18ceb svadmin-u-b63b7d8eef5d svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff svadmin-u-5f22e64f2282">
      <table class="svadmin-u-6da6a3c3f741 svadmin-u-4583f90cd9bd svadmin-u-2eba0d65d059 svadmin-u-0e65706bcccd">
        <thead class="svadmin-u-706701550477 svadmin-u-3e0fd166d494 svadmin-u-2167406b24d7 svadmin-u-236812d64c82 svadmin-u-bfa603190748">
          <tr>
            <th class="svadmin-u-d854e5698b57 svadmin-u-cd009d7d208c svadmin-u-ca6bf63030aa svadmin-u-5ceb636bd9f3 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-85d919893645 svadmin-u-1dc571a3609f">#</th>
            {#each Array.from({ length: currentSheet.cols }) as _, c (c)}
              <th class="svadmin-u-25effcb585ab svadmin-u-cd009d7d208c svadmin-u-ca6bf63030aa svadmin-u-5ceb636bd9f3 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359 svadmin-u-359090c2d529">
                {getColName(c)}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258">
          {#each Array.from({ length: currentSheet.rows }) as _, r (r)}
            {@const rowNum = r + 1}
            <tr class="svadmin-u-9fc5d875f5ca">
              <td class="svadmin-u-d854e5698b57 svadmin-u-eb6a3cef9686 svadmin-u-ca6bf63030aa svadmin-u-5ceb636bd9f3 svadmin-u-05faf5c801ff svadmin-u-2859c861d7de svadmin-u-1dc571a3609f svadmin-u-e83a7042bc91 svadmin-u-bfa603190748 svadmin-u-7f6912283f11">
                {rowNum}
              </td>
              {#each Array.from({ length: currentSheet.cols }) as _, c (c)}
                {@const cellKey = `${getColName(c)}${rowNum}`}
                {@const isSelected = selectedCell === cellKey}
                <td
                  class={cn(
                    'svadmin-u-8a539c7fe216 svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-d89972fe17d6 svadmin-u-34516836730d',
                    isSelected ? 'svadmin-u-16b1efa5875e svadmin-u-fd1dda07320a svadmin-u-236812d64c82 svadmin-u-989c466fdbe7' : ''
                  )}
                  onclick={() => selectCell(cellKey)}
                >
                  <input
                    type="text"
                    {readonly}
                    value={isSelected ? (currentSheet.cells[cellKey] ?? '') : getRenderedValue(cellKey)}
                    class={cn(
                      'svadmin-u-6da6a3c3f741 svadmin-u-d0a52b312f7d svadmin-u-d5eab218aa34 svadmin-u-7f19cdf4c5bb svadmin-u-119b2aa0b8f6 svadmin-u-359090c2d529 svadmin-u-0e65706bcccd svadmin-u-f10f771f87e9',
                      typeof evaluateFormula(currentSheet.cells[cellKey] ?? '', currentSheet.cells) === 'number' ? 'svadmin-u-308fc069e46e' : 'svadmin-u-2eba0d65d059'
                    )}
                    onfocus={() => selectCell(cellKey)}
                    oninput={(e) => updateCellValue(cellKey, e.currentTarget.value)}
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
      {#each sheets as sheet (sheet.id)}
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
            formulaInput = sheet.cells['A1'] ?? '';
          }}
        >
          {sheet.name}
        </button>
      {/each}

      {#if !readonly}
        <Button variant="ghost" size="sm" class="svadmin-u-f6fe902450dc svadmin-u-7ec10f86d9b1 svadmin-u-8a539c7fe216 svadmin-u-bfa603190748" onclick={addSheet} title="New Sheet">
          <Plus class="svadmin-u-7fc7f732bf7e svadmin-u-bf600f8e029c" />
        </Button>
      {/if}
    </div>
  </div>
</div>
