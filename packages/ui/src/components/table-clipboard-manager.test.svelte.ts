import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import {
  parseDelimitedText,
  parseClipboardText,
  matchColumnsToDefinitions,
  copyRowsToClipboard,
} from './useTableClipboard.svelte.js';
import TableClipboardManager from './TableClipboardManager.svelte';

describe('TableClipboardManager suite', () => {
  it('parses tab-delimited text into grid lines', () => {
    const raw = 'ID\tName\tPrice\n1\tLaptop\t999\n2\tMouse\t49';
    const grid = parseDelimitedText(raw);
    expect(grid.length).toBe(3);
    expect(grid[0]).toEqual(['ID', 'Name', 'Price']);
    expect(grid[1]).toEqual(['1', 'Laptop', '999']);
  });

  it('parses clipboard text into structured rows', () => {
    const raw = 'SKU\tTitle\tStock\nPRD-01\tWidget A\t100';
    const result = parseClipboardText(raw, [
      { key: 'sku', label: 'SKU' },
      { key: 'title', label: 'Title' },
    ]);

    expect(result.rowCount).toBe(1);
    expect(result.headers).toEqual(['SKU', 'Title', 'Stock']);
    expect(result.rows[0]?.['SKU']).toBe('PRD-01');
  });

  it('matches clipboard headers to table columns', () => {
    const headers = ['Order No', 'Amount', 'UnknownCol'];
    const columns = [
      { key: 'order_no', label: 'Order No' },
      { key: 'amount', label: 'Amount' },
    ];

    const mappings = matchColumnsToDefinitions(headers, columns);
    expect(mappings[0]?.matchedColumnKey).toBe('order_no');
    expect(mappings[1]?.matchedColumnKey).toBe('amount');
    expect(mappings[2]?.matchedColumnKey).toBeUndefined();
  });

  it('copies rows as TSV to clipboard', async () => {
    let copiedResult = '';
    const writeTextMock = vi.fn().mockImplementation((tsv: string) => {
      copiedResult = tsv;
      return Promise.resolve();
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    const rows = [{ id: '101', name: 'Alpha' }];
    const cols = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }];

    const success = await copyRowsToClipboard(rows, cols);
    expect(success).toBe(true);
    expect(copiedResult).toContain('ID\tName');
    expect(copiedResult).toContain('101\tAlpha');
  });

  it('renders TableClipboardManager and triggers copy selection', async () => {
    const cols = [{ key: 'id', label: 'ID' }];
    const rows = [{ id: '1' }, { id: '2' }];

    const view = render(TableClipboardManager, {
      columns: cols,
      selectedRows: rows,
    });

    expect(view.container.textContent).toContain('2');
    const copyBtn = view.container.querySelector('button');
    expect(copyBtn).toBeTruthy();
    if (copyBtn) {
      await fireEvent.click(copyBtn);
    }
  });
});
