import { defineSurfaceCatalog, styledSurfaceCatalog, type SurfaceRenderCatalog } from './catalog.js';
import { createBusinessSurfaceDefinitions } from './business-definitions.js';
import ResourceDetailWidget from './components/ResourceDetailWidget.svelte';
import ActivityFeedWidget from './components/ActivityFeedWidget.svelte';

/** 同一份 DOM-free 定义用于模型提示、服务端校验及真实组件。 */
export function createBusinessSurfaceCatalog(base: SurfaceRenderCatalog = styledSurfaceCatalog): SurfaceRenderCatalog {
  const definitions = createBusinessSurfaceDefinitions(base);
  const components = new Map(base.widgets.map((widget) => [widget.type, widget.component]));
  components.set('resource-detail', ResourceDetailWidget);
  components.set('activity-feed', ActivityFeedWidget);
  return defineSurfaceCatalog({ ...definitions, widgets: definitions.widgets.map((widget) => {
    const component = components.get(widget.type);
    if (!component) throw new Error(`Missing renderer for ${widget.type}`);
    return { ...widget, component };
  }) });
}
