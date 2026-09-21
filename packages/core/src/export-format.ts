// Pure export formatting helpers with no Svelte rune or browser API dependencies except downloadData.
// These helpers can be tested directly with bun:test.

import { Type, type Static } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';

/** Supported export and import formats. */
export type ExportFormat = 'csv' | 'json' | 'xlsx';
const exportTaskResultSchema = Type.Object({
  downloadUrl: Type.String({ minLength: 1, maxLength: 4096 }),
  format: Type.Union([Type.Literal('csv'), Type.Literal('json'), Type.Literal('xlsx')]),
  fileName: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
}, { additionalProperties: false });
export type ExportTaskResult = Static<typeof exportTaskResultSchema>;

export function snapshotExportTaskResult(value: unknown): ExportTaskResult | undefined {
  try {
    const snapshot = snapshotPlainData(value);
    if (!checkExact(exportTaskResultSchema, snapshot)) return undefined;
    if (snapshot.fileName && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(snapshot.fileName)) return undefined;
    return snapshot;
  } catch {
    return undefined;
  }
}

export function safeArtifactUrl(value: string): string | undefined {
  try {
    const url = new URL(value, document.baseURI);
    if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol) ||
        url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function downloadExportArtifact(result: ExportTaskResult, resource: string): void {
  if (typeof document === 'undefined' || typeof location === 'undefined') throw new Error('Browser required');
  const checked = snapshotExportTaskResult(result);
  const href = checked && safeArtifactUrl(checked.downloadUrl);
  if (!href) throw new Error('Invalid export artifact URL');
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = checked.fileName ?? `${resource.replace(/[^A-Za-z0-9_-]/g, '_')}_export.${checked.format}`;
  anchor.rel = 'noopener';
  anchor.click();
}

/** Escapes a CSV field and prevents formula injection. */
export function escapeCsvField(fieldValue: string): string {
  let escapedValue = fieldValue;
  if (/^[=+@\t\r]/.test(escapedValue)) escapedValue = "'" + escapedValue;
  return escapedValue.includes(',') || escapedValue.includes('"') || escapedValue.includes('\n') || escapedValue.includes('\r')
    ? `"${escapedValue.replace(/"/g, '""')}"`
    : escapedValue;
}

/** Converts records to a CSV string. */
export function toCsv(records: Record<string, unknown>[]): string {
  const [firstRecord] = records;
  if (!firstRecord) return '';
  const fieldNames = Object.keys(firstRecord);
  const header = fieldNames.map(escapeCsvField).join(',');
  const rows = records.map(record =>
    fieldNames.map(fieldName => {
      const rawFieldValue = record[fieldName];
      const serializedFieldValue = rawFieldValue === null || rawFieldValue === undefined
        ? ''
        : typeof rawFieldValue === 'object'
          ? JSON.stringify(rawFieldValue)
          : String(rawFieldValue);
      return escapeCsvField(serializedFieldValue);
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

/** Converts records to a formatted JSON string. */
export function toJson(records: Record<string, unknown>[]): string {
  return JSON.stringify(records, null, 2);
}

/** Escapes XML special characters. */
export function escapeXml(xmlValue: string): string {
  return xmlValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Generates a minimal XLSX document using SpreadsheetML with no dependencies.
 */
export function toXlsx(records: Record<string, unknown>[]): string {
  const [firstRecord] = records;
  if (!firstRecord) return '';
  const fieldNames = Object.keys(firstRecord);

  const headerCells = fieldNames.map(fieldName => `<Cell><Data ss:Type="String">${escapeXml(fieldName)}</Data></Cell>`).join('');
  const dataRows = records.map(record =>
    `<Row>${fieldNames.map(fieldName => {
      const fieldValue = record[fieldName];
      if (fieldValue === null || fieldValue === undefined) return '<Cell><Data ss:Type="String"></Data></Cell>';
      if (typeof fieldValue === 'number') return `<Cell><Data ss:Type="Number">${fieldValue}</Data></Cell>`;
      if (typeof fieldValue === 'boolean') return `<Cell><Data ss:Type="Boolean">${fieldValue ? 1 : 0}</Data></Cell>`;
      const serializedValue = typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : String(fieldValue);
      return `<Cell><Data ss:Type="String">${escapeXml(serializedValue)}</Data></Cell>`;
    }).join('')}</Row>`
  ).join('\n');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Export">
  <Table>
   <Row>${headerCells}</Row>
${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

/**
 * Downloads records in the requested format.
 * Requires the browser document API, which must be mocked in Node or bun:test.
 */
export function downloadData(
  records: Record<string, unknown>[],
  resource: string,
  format: ExportFormat = 'csv',
): void {
  if (records.length === 0) return;
  if (typeof document === 'undefined') return;

  let content: string;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'json':
      content = toJson(records);
      mimeType = 'application/json;charset=utf-8;';
      extension = 'json';
      break;
    case 'xlsx':
      content = toXlsx(records);
      mimeType = 'application/vnd.ms-excel;charset=utf-8;';
      extension = 'xls';
      break;
    case 'csv':
    default:
      content = toCsv(records);
      mimeType = 'text/csv;charset=utf-8;';
      extension = 'csv';
      break;
  }

  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = url;
  downloadAnchor.download = `${resource}_export.${extension}`;
  downloadAnchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
