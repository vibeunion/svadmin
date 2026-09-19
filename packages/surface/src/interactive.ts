import { defineSurfaceCatalog, styledSurfaceCatalog, type SurfaceRenderCatalog } from './catalog.js';
import { createInteractiveSurfaceDefinitions } from './workflows/catalog.js';
import type { SurfaceActionDescriptor } from './workflows/types.js';
import ResourceFormWidget from './components/ResourceFormWidget.svelte';
export { default as SurfaceWorkflowProvider } from './components/SurfaceWorkflowProvider.svelte';
export { withSurfaceAppearance } from './workflows/catalog.js';
export type { SurfaceWorkflowTransport } from './workflows/client.js';

export function createInteractiveSurfaceCatalog(actions: readonly SurfaceActionDescriptor[], base: SurfaceRenderCatalog = styledSurfaceCatalog): SurfaceRenderCatalog {
  const definitions = createInteractiveSurfaceDefinitions(actions, base);
  const components = new Map(base.widgets.map((widget) => [widget.type, widget.component]));
  return defineSurfaceCatalog({ ...definitions, widgets: definitions.widgets.map((widget) => {
    const component = widget.type === 'resource-form' ? ResourceFormWidget : components.get(widget.type);
    if (!component) throw new Error(`Missing renderer for ${widget.type}`);
    return { ...widget, component };
  }) });
}
