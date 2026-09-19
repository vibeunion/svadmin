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
export type { SurfaceMessages } from './localization.js';
export {
  SURFACE_AGENT_SCHEMA_VERSION,
  buildSurfaceAgentPrompt,
  buildSurfaceAgentMessages,
  parseSurfaceAgentProposal,
  parseSurfaceAgentResponse,
  createSurfaceAgentStream,
} from './agent.js';
export type {
  SurfaceAgentProposal,
  SurfaceAgentProposalV2,
  SurfaceAgentCannotFulfill,
  SurfaceAgentResponse,
  SurfaceAgentResponseResult,
  SurfaceAgentMessage,
  SurfaceAgentStream,
  SurfaceAgentValidationResult,
} from './agent.js';
export {
  SURFACE_AGENT_LIMITS,
  SURFACE_AGENT_RESPONSE_SCHEMA_VERSION,
  SURFACE_CATALOG_SCHEMA_VERSION,
  createSurfaceCatalogManifest,
  createSurfaceAgentResponseSchema,
  selectSurfaceCatalog,
} from './agent-contract.js';
export type { SurfaceCatalogManifest } from './agent-contract.js';
export {
  SURFACE_EDIT_SCHEMA_VERSION,
  SURFACE_EDIT_LIMITS,
  createSurfaceRevision,
  applySurfaceEditProposal,
  createSurfaceEditSchema,
  buildSurfaceEditMessages,
} from './edits.js';
export type {
  SurfaceEditOperation,
  SurfaceEditProposal,
  SurfaceEditIssue,
  SurfaceRevision,
  SurfaceRevisionResult,
} from './edits.js';
// 只导出 JSON schema，不将可选 SVAR 渲染器加载到协议入口。
export { svarGridPropsSchema, svarGridDefinition } from './svar-schema.js';
export type { SvarGridProps } from './svar-schema.js';
