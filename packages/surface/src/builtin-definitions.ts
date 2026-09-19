import { Value } from '@sinclair/typebox/value';
import {
  styledMetricPropsSchema, styledResourceTablePropsSchema, barChartPropsSchema,
  lineChartPropsSchema, metricPropsSchema, resourceTablePropsSchema,
} from './builtin-schemas.js';
import type { SurfaceCatalog, JsonObject } from './types.js';

export const DEFAULT_SURFACE_CATALOG_VERSION = 'svadmin/v1' as const;
export const STYLED_SURFACE_CATALOG_VERSION = 'svadmin/styled-v1' as const;

/** The same definitions are consumed by Node validation and Svelte rendering. */
export const defaultSurfaceDefinitions: SurfaceCatalog = {
  version: DEFAULT_SURFACE_CATALOG_VERSION,
  widgets: [
    { type: 'metric', dataKind: 'scalar',
      description: 'Display a count or readable scalar. Bind list counts to /total; currency metrics require an ISO currency code.',
      examples: [{ label: 'Total', format: 'number' }], propsSchema: metricPropsSchema },
    { type: 'resource-table', dataKind: 'items',
      description: 'Display up to eight explicitly readable resource fields. Bind to /items and select fields from the active resource policy.',
      propsSchema: resourceTablePropsSchema,
      getReferencedFields: (props: JsonObject) => Value.Decode(resourceTablePropsSchema, props).columns.map((column) => column.field) },
    { type: 'bar-chart', dataKind: 'items',
      description: 'Compare a readable numeric field by a readable label field. Bind to /items; aggregated data must come from an authorized backend resource.',
      propsSchema: barChartPropsSchema,
      getReferencedFields: (props: JsonObject) => { const p = Value.Decode(barChartPropsSchema, props); return [p.labelField, p.valueField]; } },
    { type: 'line-chart', dataKind: 'items',
      description: 'Show a trend using readable label and numeric fields. Bind to /items; request only policy-authorized sorting.',
      propsSchema: lineChartPropsSchema,
      getReferencedFields: (props: JsonObject) => { const p = Value.Decode(lineChartPropsSchema, props); return [p.labelField, p.valueField]; } },
  ],
};
export const styledSurfaceDefinitions: SurfaceCatalog = {
  version: STYLED_SURFACE_CATALOG_VERSION,
  widgets: defaultSurfaceDefinitions.widgets.map((widget) => {
    if (widget.type === 'metric') return { ...widget, propsSchema: styledMetricPropsSchema,
      description: 'Numeric KPI; tone and density select prebuilt semantic styles, never CSS.',
      examples: [{ label: 'Pending orders', format: 'number', tone: 'warning', density: 'compact' }] };
    if (widget.type === 'resource-table') return { ...widget, propsSchema: styledResourceTablePropsSchema,
      getReferencedFields: (props: JsonObject) => Value.Decode(styledResourceTablePropsSchema, props).columns.map((column) => column.field),
      description: 'Read-only table; density is a prebuilt semantic variant.',
      examples: [{ title: 'Inventory', columns: [{ field: 'name', label: 'Name' }], density: 'compact' }] };
    return widget;
  }),
};
