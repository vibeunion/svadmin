import { Type, type Static } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import type { EnterpriseProviderRequestContext } from './enterprise';

const id = Type.String({ minLength: 1, maxLength: 200, pattern: '^\\S(?:[\\s\\S]*\\S)?$' });
const scalar = Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]);
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
}, { additionalProperties: false });

export type DashboardMetric = Static<typeof metric>;
export type DashboardWidget = Static<typeof widget>;
export type DashboardSnapshot = Static<typeof snapshot>;
export type DashboardQuery = Static<typeof query>;

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
    if (checkExact(query, result)) return result;
  } catch { /* Query payloads fail closed. */ }
  throw new DashboardContractError();
}
