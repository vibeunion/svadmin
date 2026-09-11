import { Type } from '@sinclair/typebox';
import { checkExact, decodeBaseRecord, snapshotPlainData, rejectProviderResponse } from '@svadmin/core/schema';
import type { BaseRecord } from '@svadmin/core';

export type TableRecord = BaseRecord & { id: string | number };
const recordShape = Type.Intersect([
  Type.Record(Type.String(), Type.Unknown()),
  Type.Object({ id: Type.Union([Type.String(), Type.Number()]) }),
]);

/** The list hook validates business fields; this adapter proves table identity and detaches UI reads. */
export function copyTableRecord(value: unknown): TableRecord {
  const record = decodeBaseRecord(snapshotPlainData(value));
  if (!checkExact(recordShape, record)) return rejectProviderResponse();
  return record;
}
export function tableRowKey(id: string | number): string {
  return JSON.stringify([typeof id, id]);
}
export function checkedTableRows(rows: readonly unknown[]): TableRecord[] {
  const records = rows.map(copyTableRecord);
  const keys = new Set(records.map(record => tableRowKey(record.id)));
  if (keys.size !== records.length) return rejectProviderResponse();
  return records;
}

/** Keep distinct display columns and neutralize spreadsheet expressions at this export boundary. */
export function tableExportRows(rows: readonly TableRecord[], fields: readonly { key: string; label: string }[]): Record<string, unknown>[] {
  const protect = (value: unknown): unknown => typeof value === 'string' && (/^[\t\r\n]/.test(value) || /^\s*[=+@-]/.test(value))
    ? `'${value}` : value;
  const used = new Set<string>();
  const columns = fields.map(field => {
    const base = String(protect(field.label));
    let label = base;
    let suffix = 1;
    while (used.has(label)) label = `${base} (${suffix++})`;
    used.add(label);
    return { key: field.key, label };
  });
  return rows.map(row => {
    const record = copyTableRecord(row);
    return Object.fromEntries(columns.map(column => [column.label, protect(record[column.key] ?? null)]));
  });
}
