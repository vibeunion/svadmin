export { default as SurfaceRenderer } from './components/SurfaceRenderer.svelte';
export type {
  SurfaceRendererError,
  SurfaceRendererProps,
} from './components/SurfaceRenderer.svelte';
export type { SurfaceMessages } from './localization.js';
export {
  DEFAULT_SURFACE_CATALOG_VERSION,
  STYLED_SURFACE_CATALOG_VERSION,
  styledSurfaceCatalog,
  defaultSurfaceCatalog,
  defineSurfaceCatalog,
} from './catalog.js';
export type {
  SurfaceRenderCatalog,
  SurfaceWidgetRegistration,
  SurfaceWidgetRendererProps,
} from './catalog.js';
