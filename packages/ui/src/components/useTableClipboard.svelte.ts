export interface ColumnDef {
  key: string;
  label: string;
  required?: boolean | undefined;
  type?: string | undefined;
}

export interface ColumnMapping {
  clipboardHeader: string;
  clipboardIndex: number;
  matchedColumnKey?: string | undefined;
  matchedColumnLabel?: string | undefined;
}

export interface ParsedClipboardTable {
  headers: string[];
  rows: Record<string, string>[];
  rawGrid: string[][];
  rowCount: number;
  colCount: number;
}

export function parseDelimitedText(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Detect delimiter: TSV vs CSV
  const firstLine = lines[0] ?? '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount >= commaCount && tabCount > 0 ? '\t' : ',';

  return lines.map((line) => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  });
}

export function parseClipboardText(text: string, knownColumns: ColumnDef[] = []): ParsedClipboardTable {
  const grid = parseDelimitedText(text);
  if (grid.length === 0) {
    return { headers: [], rows: [], rawGrid: [], rowCount: 0, colCount: 0 };
  }

  const firstRow = grid[0] ?? [];
  const knownKeys = new Set(knownColumns.map((c) => c.key.toLowerCase()));
  const knownLabels = new Set(knownColumns.map((c) => c.label.toLowerCase()));

  // Heuristic: Check if first row is header row
  const hasHeaders = firstRow.some(
    (cell) => knownKeys.has(cell.toLowerCase()) || knownLabels.has(cell.toLowerCase()),
  );

  let headers: string[];
  let dataGrid: string[][];

  if (hasHeaders && grid.length > 1) {
    headers = firstRow;
    dataGrid = grid.slice(1);
  } else {
    // Treat first row as data, assign generic or matched headers
    headers = firstRow.map((_, idx) => knownColumns[idx]?.label ?? `Column ${idx + 1}`);
    dataGrid = grid;
  }

  const rows: Record<string, string>[] = dataGrid.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = row[idx] ?? '';
    });
    return record;
  });

  return {
    headers,
    rows,
    rawGrid: dataGrid,
    rowCount: dataGrid.length,
    colCount: headers.length,
  };
}

export function matchColumnsToDefinitions(
  headers: string[],
  columns: ColumnDef[],
): ColumnMapping[] {
  return headers.map((header, idx) => {
    const clean = header.trim().toLowerCase();
    const matched = columns.find(
      (c) => c.key.toLowerCase() === clean || c.label.toLowerCase() === clean,
    );
    return {
      clipboardHeader: header,
      clipboardIndex: idx,
      matchedColumnKey: matched?.key,
      matchedColumnLabel: matched?.label,
    };
  });
}

export async function copyRowsToClipboard(
  rows: Record<string, unknown>[],
  columns: ColumnDef[],
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return false;
  }

  const headerLine = columns.map((c) => c.label).join('\t');
  const dataLines = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key];
        const str = val === null || val === undefined ? '' : String(val);
        if (str.includes('\t') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join('\t'),
  );

  const tsv = [headerLine, ...dataLines].join('\n');
  try {
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch {
    return false;
  }
}

export function useTableClipboard() {
  return {
    parse: parseClipboardText,
    matchColumns: matchColumnsToDefinitions,
    copyRows: copyRowsToClipboard,
  };
}
