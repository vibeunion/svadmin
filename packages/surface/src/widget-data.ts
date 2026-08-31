import type { JsonObject, JsonValue } from './types.js';
import type { SurfaceMessages } from './localization.js';

export interface SurfaceChartPoint {
  readonly label: string;
  readonly value: number;
}

export type WidgetValueResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

export function compactChartLabel(label: string, maxLength: number, locale = 'en-US'): string {
  const isoDate = /^(?:\d{4})-(\d{2})-(\d{2})$/u.exec(label);
  if (isoDate) {
    const date = new Date(`${label}T00:00:00Z`);
    return new Intl.DateTimeFormat(locale, {
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  const characters = [...label];
  return characters.length <= maxLength
    ? label
    : `${characters.slice(0, Math.max(1, maxLength - 1)).join('')}…`;
}

export function asRecordArray(value: JsonValue): WidgetValueResult<readonly JsonObject[]> {
  if (!Array.isArray(value)) return { ok: false, message: 'Expected a record collection' };
  const records = value.filter((entry): entry is JsonObject => (
    entry !== null && typeof entry === 'object' && !Array.isArray(entry)
  ));
  return records.length === value.length
    ? { ok: true, value: records }
    : { ok: false, message: 'Every collection item must be a record' };
}

export function asChartPoints(
  value: JsonValue,
  labelField: string,
  valueField: string,
): WidgetValueResult<readonly SurfaceChartPoint[]> {
  const records = asRecordArray(value);
  if (!records.ok) return records;

  const points: SurfaceChartPoint[] = [];
  for (const record of records.value) {
    const label = record[labelField];
    const numericValue = record[valueField];
    if ((typeof label !== 'string' && typeof label !== 'number') || typeof numericValue !== 'number') {
      return { ok: false, message: `Chart fields "${labelField}" and "${valueField}" have incompatible values` };
    }
    points.push({ label: String(label), value: numericValue });
  }
  return { ok: true, value: points };
}

export interface TableValueFormatOptions {
  readonly format: string | undefined;
  readonly locale: string;
  readonly messages: SurfaceMessages;
}

function formatTableDate(value: string | number, locale: string): string | null {
  const date = new Date(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value)
    ? `${value}T00:00:00Z`
    : value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

export function displayTableValue(value: JsonValue | undefined, options: TableValueFormatOptions): string {
  const { format, locale, messages } = options;
  if (value === undefined || value === null) return '—';
  if (format === 'boolean') return value === true ? messages.booleanTrue : value === false ? messages.booleanFalse : '—';
  if (format === 'number' && typeof value === 'number') {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  }
  if (format === 'date' && (typeof value === 'string' || typeof value === 'number')) {
    return formatTableDate(value, locale) ?? String(value);
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}
