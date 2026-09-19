import { defaultSurfaceCatalog, defineSurfaceCatalog, type SurfaceRenderCatalog } from './catalog.js';
import SvarGridWidget from './components/SvarGridWidget.svelte';
import { svarGridDefinition } from './svar-schema.js';

/** 扩展独立目录版本，不改变默认目录，也不允许覆盖其他可信组件注册。 */
export function createSvarSurfaceCatalog(base: SurfaceRenderCatalog = defaultSurfaceCatalog): SurfaceRenderCatalog {
  return defineSurfaceCatalog({ version: `${base.version}+svar/v1`, widgets: [...base.widgets, { ...svarGridDefinition, component: SvarGridWidget }] });
}
