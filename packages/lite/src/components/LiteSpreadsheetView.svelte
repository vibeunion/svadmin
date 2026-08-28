<script lang="ts">
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
    class: className = '',
  }: Props = $props();

  const currentSheet = $derived(
    sheets.find((s) => s.id === activeSheetId) ?? sheets[0]
  );

  function getColName(index: number): string {
    return String.fromCharCode(index + 65);
  }
</script>

<div class="sv-lite-sheet-container {className}">
  <div class="sv-lite-sheet-header">
    <strong>Spreadsheet: {currentSheet?.name ?? 'Sheet'}</strong>
  </div>

  {#if currentSheet}
    <form method="POST" action={formAction}>
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
                    name={`cell_${key}`}
                    value={currentSheet.cells[key] ?? ''}
                    class="sv-lite-cell-input"
                  />
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>

      {#if formAction}
        <div class="sv-lite-sheet-footer">
          <button type="submit" class="sv-lite-sheet-save">Save Spreadsheet</button>
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
