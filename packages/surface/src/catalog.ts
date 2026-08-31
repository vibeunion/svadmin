import type { Component } from 'svelte';
import { Value } from '@sinclair/typebox/value';
import BarChartWidget from './components/BarChartWidget.svelte';
import LineChartWidget from './components/LineChartWidget.svelte';
import MetricWidget from './components/MetricWidget.svelte';
import ResourceTableWidget from './components/ResourceTableWidget.svelte';
import {
  barChartPropsSchema,
  lineChartPropsSchema,
  metricPropsSchema,
  resourceTablePropsSchema,
} from './builtin-schemas.js';
import type {
  JsonObject,
  SurfaceCatalog,
  SurfaceWidgetDataState,
  SurfaceWidgetDefinition,
} from './types.js';
import type { SurfaceMessages } from './localization.js';

export const DEFAULT_SURFACE_CATALOG_VERSION = 'svadmin/v1' as const;

export interface SurfaceWidgetRendererProps {
  readonly widgetId: string;
  readonly props: JsonObject;
  readonly data: SurfaceWidgetDataState;
  readonly locale?: string;
  readonly messages?: SurfaceMessages;
}

export interface SurfaceWidgetRegistration extends SurfaceWidgetDefinition {
  readonly component: Component<SurfaceWidgetRendererProps>;
}

export interface SurfaceRenderCatalog extends SurfaceCatalog {
  readonly widgets: readonly SurfaceWidgetRegistration[];
}

export function defineSurfaceCatalog<const TCatalog extends SurfaceRenderCatalog>(catalog: TCatalog): TCatalog {
  if (catalog.version.length === 0) throw new Error('Surface catalog version must not be empty');
  const widgetTypes = new Set<string>();
  for (const widget of catalog.widgets) {
    if (widgetTypes.has(widget.type)) throw new Error(`Duplicate surface widget type "${widget.type}"`);
    widgetTypes.add(widget.type);
  }
  return catalog;
}

function tableFields(props: JsonObject): readonly string[] {
  return Value.Decode(resourceTablePropsSchema, props).columns.map((column) => column.field);
}

function barChartFields(props: JsonObject): readonly string[] {
  const chartProps = Value.Decode(barChartPropsSchema, props);
  return [chartProps.labelField, chartProps.valueField];
}

function lineChartFields(props: JsonObject): readonly string[] {
  const chartProps = Value.Decode(lineChartPropsSchema, props);
  return [chartProps.labelField, chartProps.valueField];
}

export const defaultSurfaceCatalog = defineSurfaceCatalog({
  version: DEFAULT_SURFACE_CATALOG_VERSION,
  widgets: [
    {
      type: 'metric',
      dataKind: 'scalar',
      propsSchema: metricPropsSchema,
      component: MetricWidget,
    },
    {
      type: 'resource-table',
      dataKind: 'items',
      propsSchema: resourceTablePropsSchema,
      getReferencedFields: tableFields,
      component: ResourceTableWidget,
    },
    {
      type: 'bar-chart',
      dataKind: 'items',
      propsSchema: barChartPropsSchema,
      getReferencedFields: barChartFields,
      component: BarChartWidget,
    },
    {
      type: 'line-chart',
      dataKind: 'items',
      propsSchema: lineChartPropsSchema,
      getReferencedFields: lineChartFields,
      component: LineChartWidget,
    },
  ],
});
