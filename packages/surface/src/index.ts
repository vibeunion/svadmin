export { SURFACE_LIMITS, SURFACE_SCHEMA_VERSION } from './types.js';
export type {
  JsonObject, JsonPrimitive, JsonValue,
  ResourceListDataSource, ResourceListSource, ResourceOneDataSource, ResourceOneSource,
  SurfaceBinding, SurfaceCatalog, SurfaceCatalogDataKind, SurfaceDataError,
  SurfaceDataProvider, SurfaceDataSource, SurfaceFilter, SurfaceGridLayout, SurfaceGridSpan,
  SurfacePolicy, SurfaceResourcePolicy, SurfaceSort, SurfaceSpec, SurfaceValidationCode,
  SurfaceValidationIssue, SurfaceValidationResult, SurfaceWidget, SurfaceWidgetDataState, SurfaceWidgetDefinition,
} from './types.js';
export { validateSurfaceSpec } from './validation.js';
export type { SurfaceMessages } from './localization.js';
export { SURFACE_AGENT_SCHEMA_VERSION, buildSurfaceAgentPrompt, parseSurfaceAgentProposal } from './agent.js';
export type { SurfaceAgentProposal, SurfaceAgentValidationResult } from './agent.js';
// 只导出 JSON schema，不将可选 SVAR 渲染器加载到协议入口。
export { svarGridPropsSchema, svarGridDefinition } from './svar-schema.js';
export type { SvarGridProps } from './svar-schema.js';
