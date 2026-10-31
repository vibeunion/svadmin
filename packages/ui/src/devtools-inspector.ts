export type DevtoolsInspectorKind = 'query' | 'mutation';

export interface DevtoolsInspectorRow {
  id: string;
  kind: DevtoolsInspectorKind;
  provider: string;
  resource: string;
  operation: string;
  status: string;
  component: string;
  trigger: string;
  source: string;
  requestSummary: string;
  responseSummary: string;
}

export interface DevtoolsTimelineEntry {
  at: number;
  kind: DevtoolsInspectorKind;
  resource: string;
  operation: string;
  status: string;
  trigger: string;
  source: string;
}

export interface DevtoolsInspectorFilter {
  text: string;
  kind: 'all' | DevtoolsInspectorKind;
  resource: string;
  status: string;
  component: string;
}

const SECRET_KEY = /token|secret|password|authorization|cookie|session|api[-_]?key/i;

/** Shape-only summary. String and number values are never copied into the result. */
export function redactValueSummary(value: unknown, depth = 0): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) {
    if (value.length === 0 || depth >= 2) return `array(${value.length})`;
    return `array(${value.length}: ${redactValueSummary(value[0], depth + 1)})`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>)
      .slice(0, 8)
      .map((key) => (SECRET_KEY.test(key) ? `${key}:[redacted]` : key));
    if (depth >= 2) return `object{${keys.join(', ')}}`;
    return `object{${keys.join(', ')}}`;
  }
  return 'unknown';
}

export function filterInspectorRows(
  rows: readonly DevtoolsInspectorRow[],
  filter: DevtoolsInspectorFilter,
): DevtoolsInspectorRow[] {
  const text = filter.text.trim().toLowerCase();
  const component = filter.component.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter.kind !== 'all' && row.kind !== filter.kind) return false;
    if (filter.resource !== 'all' && row.resource !== filter.resource) return false;
    if (filter.status !== 'all' && row.status !== filter.status) return false;
    if (component.length > 0 && !row.component.toLowerCase().includes(component)) return false;
    if (text.length === 0) return true;
    const haystack = `${row.kind} ${row.provider} ${row.resource} ${row.operation} ${row.status} ${row.component} ${row.source} ${row.trigger}`.toLowerCase();
    return haystack.includes(text);
  });
}

export function componentSource(meta: unknown, observerCount: number): { component: string; source: string } {
  const record = typeof meta === 'object' && meta !== null ? meta as Record<string, unknown> : {};
  const named = [record['component'], record['source'], record['devtoolsComponent']]
    .find((value) => typeof value === 'string' && value.length > 0 && value.length < 80);
  if (typeof named === 'string') return { component: named, source: named };
  if (observerCount > 0) return { component: 'observer', source: `observer:${observerCount}` };
  return { component: 'cache', source: 'cache' };
}
