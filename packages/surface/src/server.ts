// This entry is server-only. Never re-export it from the DOM-free browser contract entry.
export { defineSurfaceAction } from './workflows/action-contracts.js';
export { createSurfaceWorkflowService } from './workflows/service.js';
export { SurfaceWorkflowError } from './workflows/types.js';
export type {
  SurfaceActionDescriptor, SurfaceRegisteredAction, SurfaceActionProposal, SurfaceActionStatus,
  SurfaceWorkflowContext, SurfaceWorkflowStore, SurfaceWorkflowTransaction,
  SurfaceWorkflowAuditEvent, SurfaceStoredRevision, SurfaceWorkflowOptions,
} from './workflows/types.js';
