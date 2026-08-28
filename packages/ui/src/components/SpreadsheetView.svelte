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

<div class={cn('rounded-xl border border-border bg-card shadow-xs text-xs space-y-2 p-3 overflow-hidden', className)}>
  <!-- Header Toolbar -->
  <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
    <div class="flex items-center gap-2">
      <FileSpreadsheet class="h-4 w-4 text-primary shrink-0" />
      <span class="font-semibold text-foreground">{currentSheet?.name ?? 'Spreadsheet'}</span>
    </div>

    <div class="flex items-center gap-1.5">
      {#if !readonly}
        <Button variant="outline" size="sm" class="h-7 text-xs gap-1" onclick={addRow}>
          <Plus class="h-3 w-3" />
          Row
        </Button>
        <Button variant="outline" size="sm" class="h-7 text-xs gap-1" onclick={addCol}>
          <Plus class="h-3 w-3" />
          Column
        </Button>
      {/if}

      <Button size="sm" class="h-7 text-xs gap-1" onclick={exportCsv}>
        <Download class="h-3 w-3" />
        Export CSV
      </Button>
    </div>
  </div>

  <!-- Formula Bar -->
  <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/40 border border-border/60 font-mono">
    <div class="px-2 py-0.5 rounded bg-background border border-border text-foreground font-semibold text-[11px] min-w-10 text-center">
      {selectedCell}
    </div>
    <span class="text-muted-foreground text-xs">fx</span>
    <input
      type="text"
      bind:value={formulaInput}
      {readonly}
      placeholder="Value or formula, e.g. =SUM(B2:E2)"
      class="flex-1 h-6 bg-transparent border-0 px-1 text-xs text-foreground focus-visible:outline-none placeholder:text-muted-foreground/60 font-mono"
      oninput={handleFormulaCommit}
      onkeydown={(e) => { if (e.key === 'Enter') handleFormulaCommit(); }}
    />
  </div>

  <!-- Spreadsheet Grid -->
  {#if currentSheet}
    <div class="overflow-auto max-h-[500px] border border-border/60 rounded-lg">
      <table class="w-full border-collapse text-left font-mono">
        <thead class="bg-muted/60 sticky top-0 z-10 text-muted-foreground">
          <tr>
            <th class="w-10 p-1.5 text-center border-r border-b border-border/60 bg-muted/80 text-[10px]">#</th>
            {#each Array.from({ length: currentSheet.cols }) as _, c (c)}
              <th class="min-w-24 p-1.5 text-center border-r border-b border-border/60 font-semibold text-foreground text-xs">
                {getColName(c)}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="divide-y divide-border/40">
          {#each Array.from({ length: currentSheet.rows }) as _, r (r)}
            {@const rowNum = r + 1}
            <tr class="hover:bg-muted/10">
              <td class="w-10 p-1 text-center border-r border-border/60 bg-muted/30 text-[10px] font-semibold text-muted-foreground select-none">
                {rowNum}
              </td>
              {#each Array.from({ length: currentSheet.cols }) as _, c (c)}
                {@const cellKey = `${getColName(c)}${rowNum}`}
                {@const isSelected = selectedCell === cellKey}
                <td
                  class={cn(
                    'p-0 border-r border-border/40 relative cursor-pointer',
                    isSelected ? 'ring-2 ring-primary z-10 bg-primary/5' : ''
                  )}
                  onclick={() => selectCell(cellKey)}
                >
                  <input
                    type="text"
                    {readonly}
                    value={isSelected ? (currentSheet.cells[cellKey] ?? '') : getRenderedValue(cellKey)}
                    class={cn(
                      'w-full h-7 px-2 bg-transparent border-0 text-xs font-mono focus-visible:outline-none',
                      typeof evaluateFormula(currentSheet.cells[cellKey] ?? '', currentSheet.cells) === 'number' ? 'text-right' : 'text-left'
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
  <div class="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
    <div class="flex items-center gap-1 overflow-x-auto">
      {#each sheets as sheet (sheet.id)}
        {@const isActive = sheet.id === activeSheetId}
        <button
          type="button"
          class={cn(
            'px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border',
            isActive
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'bg-card text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/60'
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
        <Button variant="ghost" size="sm" class="h-6 w-6 p-0 text-muted-foreground" onclick={addSheet} title="New Sheet">
          <Plus class="h-3.5 w-3.5" />
        </Button>
      {/if}
    </div>
  </div>
</div>
