import { Type, type Static } from 'typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import type { EnterpriseProviderRequestContext } from './enterprise';

const id = Type.String({ minLength: 1, maxLength: 200, pattern: '^\\S(?:[\\s\\S]*\\S)?$' });
const scalar = Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]);
const instant = Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$' });
const instantPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;
function instantTimestamp(value: string): number | undefined {
  const match = instantPattern.exec(value);
  if (!match) return undefined;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number) as [number, number, number, number, number, number];
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return undefined;
  const milliseconds = Number((match[7] ?? '0').padEnd(3, '0'));
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, milliseconds);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day
    || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second
    || date.getUTCMilliseconds() !== milliseconds) return undefined;
  return date.getTime();
}
const timeRange = Type.Object({
  from: instant,
  to: instant,
}, { additionalProperties: false });
const metric = Type.Object({
  id,
  label: Type.String({ minLength: 1, maxLength: 200 }),
  value: scalar,
  tone: Type.Optional(Type.Union([
    Type.Literal('default'), Type.Literal('primary'), Type.Literal('success'),
    Type.Literal('warning'), Type.Literal('danger'), Type.Literal('info'),
  ])),
  href: Type.Optional(Type.String({ minLength: 1, maxLength: 2000, pattern: '^(?:/|#)' })),
}, { additionalProperties: false });
const widget = Type.Object({
  id,
  title: Type.String({ minLength: 1, maxLength: 300 }),
  kind: Type.Union([Type.Literal('metric'), Type.Literal('text')]),
  metrics: Type.Array(metric, { maxItems: 100 }),
  text: Type.Optional(Type.String({ maxLength: 10000 })),
}, { additionalProperties: false });
const snapshot = Type.Object({
  version: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
  widgets: Type.Array(widget, { maxItems: 100 }),
}, { additionalProperties: false });
const query = Type.Object({
  dashboardId: id,
  filters: Type.Optional(Type.Array(Type.Object({
    field: id,
    value: scalar,
  }, { additionalProperties: false }), { maxItems: 50 })),
  timeRange: Type.Optional(timeRange),
}, { additionalProperties: false });

export type DashboardMetric = Static<typeof metric>;
export type DashboardWidget = Static<typeof widget>;
export type DashboardTimeRange = Static<typeof timeRange>;
export type DashboardSnapshot = Static<typeof snapshot>;
export type DashboardQuery = Static<typeof query>;

export interface DashboardDrilldown {
  dashboardId: string;
  widget: Pick<DashboardWidget, 'id' | 'title' | 'kind'>;
  metric?: DashboardMetric;
  filters: NonNullable<DashboardQuery['filters']>;
  timeRange?: DashboardTimeRange;
}

export interface DashboardProvider {
  get(context: EnterpriseProviderRequestContext, query: DashboardQuery): Promise<unknown>;
}

export class DashboardContractError extends Error {
  constructor() {
    super('Invalid dashboard response.');
    this.name = 'DashboardContractError';
  }
}

export function decodeDashboardSnapshot(value: unknown): DashboardSnapshot {
  try {
    const result = snapshotPlainData(value);
    if (checkExact(snapshot, result)
      && new Set(result.widgets.map(item => item.id)).size === result.widgets.length
      && result.widgets.every(item => new Set(item.metrics.map(metricItem => metricItem.id)).size === item.metrics.length)
      && result.widgets.every(item => item.kind === 'text' ? item.text !== undefined : item.metrics.length > 0)) {
      return result;
    }
  } catch { /* Provider payloads fail closed. */ }
  throw new DashboardContractError();
}

export function decodeDashboardQuery(value: unknown): DashboardQuery {
  try {
    const result = snapshotPlainData(value);
    if (checkExact(query, result)) {
      if (result.timeRange) {
        const from = instantTimestamp(result.timeRange.from);
        const to = instantTimestamp(result.timeRange.to);
        if (from === undefined || to === undefined || from > to) throw new DashboardContractError();
      }
      return result;
    }
  } catch { /* Query payloads fail closed. */ }
  throw new DashboardContractError();
}
