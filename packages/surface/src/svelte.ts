export { default as SurfaceRenderer } from './components/SurfaceRenderer.svelte';
export type { SurfaceRendererError, SurfaceRendererProps } from './components/SurfaceRenderer.svelte';
export { default as SurfaceEditPreview } from './components/SurfaceEditPreview.svelte';
export type { SurfaceEditPreviewProps } from './components/SurfaceEditPreview.svelte';
export type { SurfaceMessages } from './localization.js';
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
