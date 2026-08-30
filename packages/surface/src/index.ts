export { SURFACE_LIMITS, SURFACE_SCHEMA_VERSION } from './types.js';
export type {
  JsonObject,
  JsonPrimitive,
  JsonValue,
  ResourceListDataSource,
  ResourceListSource,
  ResourceOneDataSource,
  ResourceOneSource,
  SurfaceBinding,
  SurfaceCatalog,
  SurfaceCatalogDataKind,
  SurfaceDataError,
  SurfaceDataProvider,
  SurfaceDataSource,
  SurfaceFilter,
  SurfaceGridLayout,
  SurfaceGridSpan,
  SurfacePolicy,
  SurfaceResourcePolicy,
  SurfaceSort,
  SurfaceSpec,
  SurfaceValidationCode,
  SurfaceValidationIssue,
  SurfaceValidationResult,
  SurfaceWidget,
  SurfaceWidgetDataState,
  SurfaceWidgetDefinition,
} from './types.js';
export { validateSurfaceSpec } from './validation.js';
export {
  SURFACE_AGENT_SCHEMA_VERSION,
  buildSurfaceAgentPrompt,
  parseSurfaceAgentProposal,
} from './agent.js';
export type {
  SurfaceAgentProposal,
  SurfaceAgentValidationResult,
} from './agent.js';
