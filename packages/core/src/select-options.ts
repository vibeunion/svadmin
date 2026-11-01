import type { BaseRecord, Filter } from './types';
import { HttpError } from './types';
import type { RecordDecoder } from './record-decoder';
import { snapshotPlainData, type JsonValue } from './plain-data';

export interface SelectOption {
  label: string;
  value: string | number;
}

/** 点分路径读取记录字段，例如 `nested.title`。不走原型链。 */
export function readRecordPath(record: BaseRecord, path: string): unknown {
  if (!path.includes('.')) return record[path];
  let current: unknown = record;
  for (const segment of path.split('.')) {
    if (!segment || current === null || typeof current !== 'object' || Array.isArray(current)) return undefined;
    if (!Object.hasOwn(current, segment)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function selectOptionValue(value: unknown): string | number {
  if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) return value;
  throw new HttpError('Invalid select option', 422, undefined, { code: 'INVALID_SELECT_OPTION' });
}

/** Each user mapper receives an independent record, never a cached query object. */
export function mapSelectOptions<T extends BaseRecord>(
  records: T[],
  label: string | ((item: T) => string),
  value: string | ((item: T) => string | number),
  decode: RecordDecoder<T>,
  isCurrent: () => boolean,
): SelectOption[] {
  try {
    return records.map(record => {
      if (!isCurrent()) throw new Error('Obsolete select mapping');
      const labelRecord = decode(snapshotPlainData(record));
      const mappedLabel = typeof label === 'function' ? label(labelRecord) : readRecordPath(labelRecord, label);
      if (!isCurrent()) throw new Error('Obsolete select mapping');
      if (typeof label === 'function' && typeof mappedLabel !== 'string') {
        throw new TypeError('Select label callbacks must return strings');
      }
      const valueRecord = decode(snapshotPlainData(record));
      const mappedValue = typeof value === 'function' ? value(valueRecord) : readRecordPath(valueRecord, value);
      if (!isCurrent()) throw new Error('Obsolete select mapping');
      return { label: String(selectOptionValue(mappedLabel)), value: selectOptionValue(mappedValue) };
    });
  } catch {
    throw new HttpError('Invalid select option', 422, undefined, { code: 'INVALID_SELECT_OPTION' });
  }
}

function sameSnapshot(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left)) {
    return Array.isArray(right) && left.length === right.length &&
      left.every((value, index) => sameSnapshot(value, right[index]));
  }
  if (left === null || right === null || typeof left !== 'object' ||
    typeof right !== 'object' || Array.isArray(right)) return false;
  const keys = Object.keys(left);
  const otherKeys = Object.keys(right);
  return keys.length === otherKeys.length &&
    keys.every((key, index) => key === otherKeys[index] && sameSnapshot(left[key], right[key]));
}

/** Memoization includes detached contents because external cache edits may not advance its revision. */
export function createSelectProjection<T extends BaseRecord, R extends { data: T[] }>(
  decodeResult: (input: unknown) => R,
  label: string | ((item: T) => string),
  value: string | ((item: T) => string | number),
  decode: RecordDecoder<T>,
  isCurrent: () => boolean,
): (input: unknown, version: number) => R & { options: SelectOption[] } {
  let cached: { input: unknown; version: number; records: JsonValue; options: SelectOption[] | undefined } | undefined;
  return (input, version) => {
    const result = decodeResult(input);
    if (!isCurrent()) throw new HttpError('Obsolete select mapping', 409, undefined, { code: 'QUERY_SESSION_SUPERSEDED' });
    let records: JsonValue;
    try { records = snapshotPlainData(result.data); }
    catch { throw new HttpError('Invalid select option', 422, undefined, { code: 'INVALID_SELECT_OPTION' }); }
    let entry = cached;
    if (!entry || entry.input !== input || entry.version !== version || !sameSnapshot(entry.records, records)) {
      // Publish an incomplete entry first so a same-input recursive mapper cannot recurse indefinitely.
      entry = { input, version, records, options: undefined };
      cached = entry;
      try {
        entry.options = mapSelectOptions(result.data, label, value, decode, isCurrent);
      } catch {
        // Keep this failure memoized until the input, revision or validated contents change.
      }
    }
    if (!entry.options) throw new HttpError('Invalid select option', 422, undefined, { code: 'INVALID_SELECT_OPTION' });
    return { ...result, options: entry.options.map(option => ({ ...option })) };
  };
}

export type SelectedOptionsOrder = 'in-place' | 'selected-first';

export function normalizeSelectDefaultValue(
  value: string | number | readonly (string | number)[] | null | undefined,
): (string | number)[] {
  if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) return [value];
  if (!Array.isArray(value)) return [];
  const ids: (string | number)[] = [];
  for (const item of value) {
    if (typeof item === 'string' || (typeof item === 'number' && Number.isFinite(item))) ids.push(item);
  }
  return ids;
}

/** onSearch 优先；否则按 searchField 生成 contains 过滤。 */
export function selectQueryFilters(input: {
  text: string;
  searchField?: string;
  searched?: Filter[] | undefined;
}): Filter[] {
  if (!input.text) return [];
  if (input.searched) return input.searched;
  if (input.searchField) return [{ field: input.searchField, operator: 'contains', value: input.text }];
  return [];
}

export function orderSelectOptions(
  list: SelectOption[],
  selected: SelectOption[],
  order: SelectedOptionsOrder = 'in-place',
): SelectOption[] {
  return order === 'selected-first' ? mergeSelectOptions(selected, list) : mergeSelectOptions(list, selected);
}

export function mergeSelectOptions(...groups: SelectOption[][]): SelectOption[] {
  const seen = new Set<string | number>();
  return groups.flatMap(group => group.filter(option => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  }));
}
