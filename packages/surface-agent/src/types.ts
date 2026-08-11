import type {
  JsonValue,
  SurfaceDocumentDependencies,
  SurfaceDocumentError,
  SurfacePatchError,
  SurfacePatchOperation,
  SurfaceSpec,
} from '@svadmin/surface';

export const SURFACE_PROPOSAL_VERSION = 'surface-proposal/v1' as const;
export const SURFACE_AGENT_COMPONENT = 'svadmin.surface.patch-proposal/v1' as const;

export const SURFACE_PROPOSAL_LIMITS = {
  maxSummaryLength: 500,
  defaultTtlMs: 15 * 60 * 1_000,
  maxTtlMs: 24 * 60 * 60 * 1_000,
} as const;

export interface SurfaceProposalInput {
  readonly proposalVersion: typeof SURFACE_PROPOSAL_VERSION;
  readonly surfaceId: string;
  readonly baseRevision: number;
  readonly summary: string;
  readonly operations: readonly SurfacePatchOperation[];
}

export type SurfaceProposalStatus =
  | 'pending'
  | 'deciding'
  | 'applied'
  | 'rejected'
  | 'expired'
  | 'failed';

export interface SurfaceProposalDecision {
  readonly decision: 'approved' | 'rejected';
  readonly actorId: string;
  readonly decidedAt: string;
  readonly reason?: string;
}

export interface SurfaceProposalReview {
  readonly proposalVersion: typeof SURFACE_PROPOSAL_VERSION;
  readonly proposalId: string;
  readonly scopeId: string;
  readonly surfaceId: string;
  readonly baseRevision: number;
  readonly catalogVersion: string;
  readonly summary: string;
  readonly operations: readonly SurfacePatchOperation[];
  readonly digest: string;
  readonly status: SurfaceProposalStatus;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly changedPaths: readonly string[];
  readonly before: SurfaceSpec;
  readonly after: SurfaceSpec;
  readonly decision?: SurfaceProposalDecision;
  readonly appliedRevision?: number;
  readonly failureCode?: string;
}

export type SurfaceProposalErrorCode =
  | 'agent_stream_failed'
  | 'agent_stream_invalid'
  | 'agent_tool_event_denied'
  | 'duplicate_proposal_id'
  | 'invalid_decision'
  | 'invalid_proposal'
  | 'proposal_expired'
  | 'proposal_not_found'
  | 'proposal_not_pending'
  | 'runtime_unavailable'
  | 'surface_mismatch';

export interface SurfaceProposalError {
  readonly code: SurfaceProposalErrorCode;
  readonly message: string;
}

export type SurfaceProposalWorkflowError = SurfaceProposalError | SurfacePatchError | SurfaceDocumentError;

export type SurfaceProposalWorkflowResult =
  | { readonly ok: true; readonly review: SurfaceProposalReview }
  | { readonly ok: false; readonly error: SurfaceProposalWorkflowError };

export type SurfaceProposalValidationResult =
  | { readonly ok: true; readonly proposal: SurfaceProposalInput }
  | { readonly ok: false; readonly error: SurfaceProposalError | SurfacePatchError };

export interface SurfaceProposalApprovalRequest {
  readonly proposalId: string;
  readonly actorId: string;
  readonly operationId: string;
}

export interface SurfaceProposalRejectionRequest {
  readonly proposalId: string;
  readonly actorId: string;
  readonly reason?: string;
}

export interface SurfaceAgentWorkflow {
  request(input: unknown): Promise<SurfaceProposalWorkflowResult>;
  approve(request: SurfaceProposalApprovalRequest): Promise<SurfaceProposalWorkflowResult>;
  reject(request: SurfaceProposalRejectionRequest): Promise<SurfaceProposalWorkflowResult>;
  get(proposalId: string): SurfaceProposalReview | null;
}

export interface SurfaceAgentWorkflowOptions {
  readonly dependencies: SurfaceDocumentDependencies;
  readonly scopeId: string;
  readonly surfaceId: string;
  readonly proposalId?: () => string;
  readonly digest?: (binding: JsonValue) => Promise<string>;
  readonly now?: () => number;
  readonly proposalTtlMs?: number;
}
