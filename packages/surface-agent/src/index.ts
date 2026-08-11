export {
  defaultSurfaceProposalDigest,
  defaultSurfaceProposalId,
} from './digest.js';
export { requestSurfaceProposalFromAgent } from './agent-bridge.js';
export { createSurfaceAgentWorkflow } from './workflow.js';
export { validateSurfaceProposal } from './validation.js';
export {
  SURFACE_AGENT_COMPONENT,
  SURFACE_PROPOSAL_LIMITS,
  SURFACE_PROPOSAL_VERSION,
} from './types.js';
export type {
  SurfaceAgentWorkflow,
  SurfaceAgentWorkflowOptions,
  SurfaceProposalApprovalRequest,
  SurfaceProposalDecision,
  SurfaceProposalError,
  SurfaceProposalErrorCode,
  SurfaceProposalInput,
  SurfaceProposalRejectionRequest,
  SurfaceProposalReview,
  SurfaceProposalStatus,
  SurfaceProposalValidationResult,
  SurfaceProposalWorkflowError,
  SurfaceProposalWorkflowResult,
} from './types.js';
