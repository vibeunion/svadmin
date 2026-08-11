export { default as SurfaceRenderer } from './components/SurfaceRenderer.svelte';
export type {
  SurfaceRendererError,
  SurfaceRendererProps,
} from './components/SurfaceRenderer.svelte';
export {
  DEFAULT_SURFACE_CATALOG_VERSION,
  defaultSurfaceCatalog,
  defineSurfaceCatalog,
} from './catalog.js';
export type {
  SurfaceRenderCatalog,
  SurfaceWidgetRegistration,
  SurfaceWidgetRendererProps,
} from './catalog.js';
