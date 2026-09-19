import type { Component } from 'svelte';
import { Value } from '@sinclair/typebox/value';
import BarChartWidget from './components/BarChartWidget.svelte';
import LineChartWidget from './components/LineChartWidget.svelte';
import MetricWidget from './components/MetricWidget.svelte';
import ResourceTableWidget from './components/ResourceTableWidget.svelte';
import { defaultSurfaceDefinitions, styledSurfaceDefinitions } from './builtin-definitions.js';
import type { JsonObject, SurfaceCatalog, SurfaceWidgetDataState, SurfaceWidgetDefinition } from './types.js';
import type { SurfaceMessages } from './localization.js';

export { DEFAULT_SURFACE_CATALOG_VERSION, STYLED_SURFACE_CATALOG_VERSION } from './builtin-definitions.js';
export interface SurfaceWidgetRendererProps {
  readonly widgetId: string;
  readonly props: JsonObject;
  readonly data: SurfaceWidgetDataState;
  readonly locale?: string;
  readonly messages?: SurfaceMessages;
}
export interface SurfaceWidgetRegistration extends SurfaceWidgetDefinition {
  readonly presentation?: 'surface-appearance/v1';
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
    if ((widget.examples?.length ?? 0) > 3) throw new Error('Catalog examples are limited to three per widget');
    for (const example of widget.examples ?? []) {
      if (!Value.Check(widget.propsSchema, example)) throw new Error('Invalid catalog example for ' + widget.type);
    }
  }
  return catalog;
}
const components: Readonly<Record<string, Component<SurfaceWidgetRendererProps>>> = {
  metric: MetricWidget, 'resource-table': ResourceTableWidget, 'bar-chart': BarChartWidget, 'line-chart': LineChartWidget,
};
function rendered(definitions: SurfaceCatalog): SurfaceRenderCatalog {
  return defineSurfaceCatalog({ ...definitions, widgets: definitions.widgets.map((widget) => {
    const component = components[widget.type];
    if (!component) throw new Error(`Missing built-in component: ${widget.type}`);
    return { ...widget, component };
  }) });
}
export const defaultSurfaceCatalog = rendered(defaultSurfaceDefinitions);
export const styledSurfaceCatalog = rendered(styledSurfaceDefinitions);
