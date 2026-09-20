import type { Filter } from './types';
import { snapshotPlainData } from './plain-data';
import { snapshotListParams } from './query-snapshot';
import { snapshotExportTaskResult, type ExportFormat, type ExportTaskResult } from './export-format';

export type PivotAggregation = 'sum' | 'count' | 'avg' | 'min' | 'max';
export type PivotDimensionValue = string | number | boolean | null;
export interface PivotDimension {
  key: string;
  value: PivotDimensionValue;
  label: string;
}
export interface PivotOptions {
  rowField: string;
  columnField: string;
  valueField: string;
  aggregator?: PivotAggregation;
}
export interface PivotResult {
  error?: 'invalidData' | 'limit' | 'invalidNumber' | 'overflow';
  rows: PivotDimension[];
  columns: PivotDimension[];
  cells: Map<string, Map<string, number | null>>;
  rowTotals: Map<string, number | null>;
  columnTotals: Map<string, number | null>;
  grandTotal: number | null;
}

export interface PivotQuery extends PivotOptions {
  resource: string;
  filters?: Filter[];
  meta?: Record<string, unknown>;
}

export interface PivotDrilldown {
  resource: string;
  scopeKey: string;
  rowField: string;
  columnField: string;
  valueField: string;
  aggregator: PivotAggregation;
  row: PivotDimension;
  column: PivotDimension;
  filters?: Filter[];
  meta?: Record<string, unknown>;
}

export interface PivotProvider {
  aggregate: (query: PivotQuery) => Promise<unknown>;
}

export interface PivotCache {
  /** 相同缓存中的不同数据源必须使用不同命名空间。 */
  providerKey: string;
  get: (key: string) => Promise<unknown | undefined> | unknown | undefined;
  set: (key: string, value: unknown) => Promise<void> | void;
}

export function buildPivotCacheKey(query: unknown, scopeKey: unknown, providerKey: unknown): string | undefined {
  const snapshot = snapshotPivotQuery(query);
  if (!snapshot || typeof scopeKey !== 'string' || !scopeKey.trim() || scopeKey.length > 4000
    || typeof providerKey !== 'string' || !providerKey.trim() || providerKey.length > 4000) return;
  return JSON.stringify({ protocolVersion: 1, providerKey, scopeKey, query: snapshot });
}

export interface PivotExportRequest {
  protocolVersion: 1;
  kind: 'pivot';
  scopeKey: string;
  format: ExportFormat;
  query: PivotQuery;
  requestFingerprint: string;
}

export interface PivotExportTaskResult extends ExportTaskResult {
  kind: 'pivot';
  taskName: string;
  idempotencyKey: string;
  scopeKey: string;
  requestFingerprint: string;
}

/** 只生成服务端导出请求，不将当前页或预聚合单元格当作原始记录导出。 */
export function buildPivotExportRequest(query: unknown, scopeKey: unknown, format: unknown = 'csv'): PivotExportRequest | undefined {
  const snapshot = snapshotPivotQuery(query);
  if (!snapshot || typeof scopeKey !== 'string' || !scopeKey.trim() || scopeKey.length > 4000
    || (format !== 'csv' && format !== 'json' && format !== 'xlsx')) return;
  const request: Omit<PivotExportRequest, 'requestFingerprint'> = { protocolVersion: 1, kind: 'pivot', scopeKey, format, query: snapshot };
  return { ...request, requestFingerprint: JSON.stringify(request) };
}

export function snapshotPivotExportTaskResult(value: unknown, expected: {
  taskName: string; idempotencyKey: string; request: PivotExportRequest;
}): PivotExportTaskResult | undefined {
  try {
    const plain = snapshotPlainData(value);
    if (!isRecord(plain)) return;
    const { kind, taskName, idempotencyKey, scopeKey, requestFingerprint, ...artifact } = plain;
    const result = snapshotExportTaskResult(artifact);
    if (!result || kind !== 'pivot' || taskName !== expected.taskName
      || idempotencyKey !== expected.idempotencyKey || scopeKey !== expected.request.scopeKey
      || requestFingerprint !== expected.request.requestFingerprint
      || result.format !== expected.request.format) return;
    return { ...result, kind: 'pivot', taskName: expected.taskName,
      idempotencyKey: expected.idempotencyKey, scopeKey: expected.request.scopeKey,
      requestFingerprint: expected.request.requestFingerprint };
  } catch { return; }
}

/** 保留原条件树的顶层 AND 语义，不能把维度约束塞入已有 OR 组。 */
export function buildPivotDrilldown(query: unknown, scopeKey: unknown, row: unknown, column: unknown): PivotDrilldown | undefined {
  try {
    const snapshot = snapshotPivotQuery(query);
    if (!snapshot || typeof scopeKey !== 'string' || !scopeKey.trim() || scopeKey.length > 4000) return;
    const rowSnapshot = wireDimension(snapshotPlainData(row));
    const columnSnapshot = wireDimension(snapshotPlainData(column));
    if (!rowSnapshot || !columnSnapshot) return;
    const constraints: Filter[] = [
      { field: snapshot.rowField, operator: rowSnapshot.value === null ? 'null' : 'eq', value: rowSnapshot.value },
      { field: snapshot.columnField, operator: columnSnapshot.value === null ? 'null' : 'eq', value: columnSnapshot.value },
    ];
    const narrowed = snapshotPivotQuery({ ...snapshot, filters: [...snapshot.filters ?? [], ...constraints] });
    if (!narrowed) return;
    return {
      resource: narrowed.resource,
      rowField: narrowed.rowField,
      columnField: narrowed.columnField,
      valueField: narrowed.valueField,
      aggregator: narrowed.aggregator ?? 'sum',
      scopeKey,
      row: rowSnapshot,
      column: columnSnapshot,
      ...(narrowed.filters ? { filters: narrowed.filters } : {}),
      ...(narrowed.meta ? { meta: narrowed.meta } : {}),
    };
  } catch {
    return;
  }
}

/** 服务端计算所有汇总值；客户端不能对预聚合结果再次求平均或计数。 */
export interface PivotPayload {
  rows: PivotDimension[];
  columns: PivotDimension[];
  cells: Array<{ rowKey: string; columnKey: string; value: number | null }>;
  rowTotals: Array<{ key: string; value: number | null }>;
  columnTotals: Array<{ key: string; value: number | null }>;
  grandTotal: number | null;
}

export function snapshotPivotQuery(value: unknown): PivotQuery | undefined {
  try {
    const plain = snapshotPlainData(value);
    if (!isRecord(plain)) return;
    const { rowField, columnField, valueField, aggregator = 'sum', ...base } = plain;
    if (![rowField, columnField, valueField].every(field => typeof field === 'string'
      && field.trim().length > 0 && field.length <= PIVOT_LIMITS.dimensionLength)
      || typeof aggregator !== 'string' || !['sum', 'count', 'avg', 'min', 'max'].includes(aggregator)) return;
    const query = snapshotListParams(base);
    if (Object.keys(base).some(key => !['resource', 'filters', 'meta'].includes(key))) return;
    return {
      ...query, rowField: rowField as string, columnField: columnField as string,
      valueField: valueField as string, aggregator: aggregator as PivotAggregation,
    };
  } catch {
    return;
  }
}

export const PIVOT_LIMITS = Object.freeze({
  records: 10_000,
  rows: 200,
  columns: 200,
  cells: 40_000,
  dimensionLength: 1000,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface Aggregate {
  count: number;
  value: number;
}

function dimension(value: unknown): PivotDimension | undefined {
  if (value == null) return { key: 'null:', value: null, label: '—' };
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return;
  if (typeof value === 'number' && !Number.isFinite(value)) return;
  if (typeof value === 'string' && value.length > PIVOT_LIMITS.dimensionLength) return;
  return { key: `${typeof value}:${value}`, value, label: String(value) };
}

function sortedDimensions(values: Map<string, PivotDimension>): PivotDimension[] {
  const labels = new Map<string, number>();
  for (const item of values.values()) labels.set(item.label, (labels.get(item.label) ?? 0) + 1);
  // 同一轴存在歧义时统一转义所有文本，避免加引号后与另一个原始标签重名。
  const quoteStrings = [...labels.values()].some(count => count > 1) || values.has('string:');
  return [...values.values()].sort((a, b) => a.label < b.label ? -1 : a.label > b.label ? 1 : a.key < b.key ? -1 : 1)
    .map(item => ({
      ...item,
      label: quoteStrings && typeof item.value === 'string'
        ? JSON.stringify(item.value) : item.label,
    }));
}

function result(error?: PivotResult['error']): PivotResult {
  return {
    ...(error === undefined ? {} : { error }),
    rows: [], columns: [], cells: new Map(), rowTotals: new Map(), columnTotals: new Map(), grandTotal: null,
  };
}

function wireDimension(value: unknown): PivotDimension | undefined {
  if (!isRecord(value) || typeof value['key'] !== 'string' || typeof value['label'] !== 'string') return;
  const dimensionValue = value['value'];
  if (dimensionValue !== null && typeof dimensionValue !== 'string'
    && typeof dimensionValue !== 'number' && typeof dimensionValue !== 'boolean') return;
  if (typeof dimensionValue === 'number' && !Number.isFinite(dimensionValue)) return;
  if (!value['key'].trim() || !value['label'].trim()
    || value['key'].length > PIVOT_LIMITS.dimensionLength || value['label'].length > PIVOT_LIMITS.dimensionLength
    || (typeof dimensionValue === 'string' && dimensionValue.length > PIVOT_LIMITS.dimensionLength)) return;
  return { key: value['key'], value: dimensionValue, label: value['label'] };
}

function wireNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function wireTotals(value: unknown, keys: Set<string>): Map<string, number | null> | undefined {
  if (!Array.isArray(value) || value.length !== keys.size) return;
  const result = new Map<string, number | null>();
  for (const item of value) {
    if (!isRecord(item) || typeof item['key'] !== 'string' || !keys.has(item['key']) || result.has(item['key'])) return;
    const number = wireNumber(item['value']);
    if (number === undefined) return;
    result.set(item['key'], number);
  }
  return result;
}

/** 服务端汇总回执必须是有界纯数据，不能包含访问器或未知维度引用。 */
export function decodePivotResult(value: unknown): PivotResult {
  try {
    const plain = snapshotPlainData(value);
    if (!isRecord(plain) || !Array.isArray(plain['rows']) || !Array.isArray(plain['columns'])
      || !Array.isArray(plain['cells'])) return result('invalidData');
    if (plain['rows'].length > PIVOT_LIMITS.rows || plain['columns'].length > PIVOT_LIMITS.columns
      || plain['cells'].length > PIVOT_LIMITS.cells) return result('limit');
    const rows: PivotDimension[] = [];
    const columns: PivotDimension[] = [];
    const rowKeys = new Set<string>();
    const columnKeys = new Set<string>();
    for (const item of plain['rows']) {
      const dimension = wireDimension(item);
      if (!dimension || rowKeys.has(dimension.key)) return result('invalidData');
      rowKeys.add(dimension.key);
      rows.push(dimension);
    }
    for (const item of plain['columns']) {
      const dimension = wireDimension(item);
      if (!dimension || columnKeys.has(dimension.key)) return result('invalidData');
      columnKeys.add(dimension.key);
      columns.push(dimension);
    }
    if (rows.length * columns.length > PIVOT_LIMITS.cells) return result('limit');
    const cells = new Map<string, Map<string, number | null>>();
    for (const item of plain['cells']) {
      if (!isRecord(item) || typeof item['rowKey'] !== 'string' || typeof item['columnKey'] !== 'string'
        || !rowKeys.has(item['rowKey']) || !columnKeys.has(item['columnKey'])) return result('invalidData');
      if (cells.get(item['rowKey'])?.has(item['columnKey'])) return result('invalidData');
      const number = wireNumber(item['value']);
      if (number === undefined) return result('invalidNumber');
      let row = cells.get(item['rowKey']);
      if (!row) { row = new Map(); cells.set(item['rowKey'], row); }
      row.set(item['columnKey'], number);
    }
    const rowTotals = wireTotals(plain['rowTotals'], rowKeys);
    const columnTotals = wireTotals(plain['columnTotals'], columnKeys);
    const grandTotal = wireNumber(plain['grandTotal']);
    if (!rowTotals || !columnTotals || grandTotal === undefined) return result('invalidData');
    return { rows, columns, cells, rowTotals, columnTotals, grandTotal };
  } catch {
    return result('invalidData');
  }
}

function add(aggregate: Aggregate, value: number, operator: PivotAggregation): boolean {
  aggregate.count++;
  switch (operator) {
    case 'count': aggregate.value = aggregate.count; break;
    case 'sum': aggregate.value += value; break;
    // 分别缩放两项，避免有限输入的均值因中间求和溢出。
    case 'avg': aggregate.value = aggregate.value * ((aggregate.count - 1) / aggregate.count) + value / aggregate.count; break;
    case 'min': aggregate.value = aggregate.count === 1 ? value : Math.min(aggregate.value, value); break;
    case 'max': aggregate.value = aggregate.count === 1 ? value : Math.max(aggregate.value, value); break;
  }
  return Number.isFinite(aggregate.value);
}

function valueOf(aggregate: Aggregate): number | null {
  return aggregate.count ? aggregate.value : null;
}

/** 有界的记录聚合；不把分页数据解释为整个资源的统计结果。 */
export function buildPivot(data: readonly Record<string, unknown>[], options: PivotOptions): PivotResult {
  const operator = options.aggregator ?? 'sum';
  if (!Array.isArray(data) || !['sum', 'count', 'avg', 'min', 'max'].includes(operator)
    || ![options.rowField, options.columnField, options.valueField].every(field => typeof field === 'string' && field.length > 0)) {
    return result('invalidData');
  }
  if (data.length > PIVOT_LIMITS.records) return result('limit');
  const rows = new Map<string, PivotDimension>();
  const columns = new Map<string, PivotDimension>();
  const cells = new Map<string, Map<string, Aggregate>>();
  const rowTotals = new Map<string, Aggregate>();
  const columnTotals = new Map<string, Aggregate>();
  const grand: Aggregate = { count: 0, value: 0 };
  for (const record of data) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return result('invalidData');
    const own = (field: string) => Object.hasOwn(record, field) ? record[field] : undefined;
    const row = dimension(own(options.rowField));
    const column = dimension(own(options.columnField));
    if (!row || !column) return result('invalidData');
    rows.set(row.key, row);
    columns.set(column.key, column);
    if (rows.size > PIVOT_LIMITS.rows || columns.size > PIVOT_LIMITS.columns
      || rows.size * columns.size > PIVOT_LIMITS.cells) return result('limit');
    if (!rowTotals.has(row.key)) rowTotals.set(row.key, { count: 0, value: 0 });
    if (!columnTotals.has(column.key)) columnTotals.set(column.key, { count: 0, value: 0 });
    let rowCells = cells.get(row.key);
    if (!rowCells) { rowCells = new Map(); cells.set(row.key, rowCells); }
    let cell = rowCells.get(column.key);
    if (!cell) { cell = { count: 0, value: 0 }; rowCells.set(column.key, cell); }
    const raw = operator === 'count' ? 1 : own(options.valueField);
    if (raw == null) continue;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return result('invalidNumber');
    const targets = [cell, rowTotals.get(row.key)!, columnTotals.get(column.key)!, grand];
    for (const target of targets) {
      if (!add(target, raw, operator)) return result('overflow');
    }
  }
  return {
    rows: sortedDimensions(rows),
    columns: sortedDimensions(columns),
    cells: new Map([...cells].map(([key, values]) => [key, new Map([...values].map(([col, agg]) => [col, valueOf(agg)]))])),
    rowTotals: new Map([...rowTotals].map(([key, agg]) => [key, valueOf(agg)])),
    columnTotals: new Map([...columnTotals].map(([key, agg]) => [key, valueOf(agg)])),
    grandTotal: valueOf(grand),
  };
}

/** 空格和异常格式化器不能把一个有值的单元格伪装为空值。 */
export function formatPivotValue(value: number | null | undefined, formatter: (value: number) => string): string {
  if (value == null) return '—';
  try {
    const formatted = formatter(value);
    return typeof formatted === 'string' && formatted.trim() ? formatted : String(value);
  } catch {
    return String(value);
  }
}
