import type {
  SurfaceCatalog,
  SurfacePolicy,
  SurfaceSpec,
  SurfaceValidationIssue,
} from './types.js';

export const SURFACE_DOCUMENT_VERSION = 'surface-document/v1' as const;

export const SURFACE_DOCUMENT_LIMITS = {
  maxIdentityLength: 128,
  maxReasonLength: 240,
} as const;

export type SurfaceDocumentStage = 'draft' | 'published';
export type SurfaceRevisionOperation = 'draft.save' | 'publish' | 'rollback' | 'patch';
export type SurfaceRevisionOrigin = 'host' | 'agent';

export interface SurfaceRevisionProvenance {
  readonly actorId: string;
  readonly operationId: string;
  readonly operation: SurfaceRevisionOperation;
  readonly origin: SurfaceRevisionOrigin;
  readonly parentRevision: number | null;
  readonly reason?: string;
  readonly targetRevision?: number;
  readonly proposalId?: string;
  readonly proposalDigest?: string;
}

export interface SurfaceDocument {
  readonly documentVersion: typeof SURFACE_DOCUMENT_VERSION;
  readonly scopeId: string;
  readonly surfaceId: string;
  readonly revision: number;
  readonly stage: SurfaceDocumentStage;
  readonly spec: SurfaceSpec;
  readonly createdAt: string;
  readonly provenance: SurfaceRevisionProvenance;
}

export interface SurfaceStoreReadRequest {
  readonly scopeId: string;
  readonly surfaceId: string;
  readonly revision?: number;
  readonly stage?: SurfaceDocumentStage;
}

export interface SurfaceStoreHistoryRequest {
  readonly scopeId: string;
  readonly surfaceId: string;
}

export interface SurfaceStoreAppendRequest {
  readonly scopeId: string;
  readonly surfaceId: string;
  readonly expectedRevision: number;
  readonly stage: SurfaceDocumentStage;
  readonly spec: SurfaceSpec;
  readonly createdAt: string;
  readonly provenance: Omit<SurfaceRevisionProvenance, 'parentRevision'>;
}

export type SurfaceStoreAppendResult =
  | { readonly ok: true; readonly document: SurfaceDocument }
  | { readonly ok: false; readonly code: 'revision_conflict'; readonly actualRevision: number };

/**
 * Persistence boundary for immutable Surface revisions.
 * Production implementations must perform append's revision comparison atomically.
 */
export interface SurfaceStore {
  read(request: SurfaceStoreReadRequest): Promise<SurfaceDocument | null>;
  history(request: SurfaceStoreHistoryRequest): Promise<readonly SurfaceDocument[]>;
  append(request: SurfaceStoreAppendRequest): Promise<SurfaceStoreAppendResult>;
}

export type SurfaceWriteAction = 'write' | 'publish' | 'rollback' | 'approve';

export interface SurfaceWriteAuthorizationRequest {
  readonly scopeId: string;
  readonly surfaceId: string;
  readonly actorId: string;
  readonly action: SurfaceWriteAction;
}

export interface SurfaceWriteAccessDecision {
  readonly can: boolean;
  readonly reason?: string;
}

export type SurfaceWriteAuthorizer = (
  request: SurfaceWriteAuthorizationRequest,
) => Promise<SurfaceWriteAccessDecision>;

export interface SurfaceDocumentDependencies {
  readonly store: SurfaceStore;
  readonly catalog: SurfaceCatalog;
  readonly policy: SurfacePolicy;
  readonly authorize: SurfaceWriteAuthorizer;
  readonly now?: () => Date;
}

export type SurfaceDocumentErrorCode =
  | 'access_denied'
  | 'authorization_failed'
  | 'invalid_document'
  | 'invalid_request'
  | 'not_found'
  | 'revision_conflict'
  | 'store_failed'
  | 'store_result_invalid';

export interface SurfaceDocumentError {
  readonly code: SurfaceDocumentErrorCode;
  readonly message: string;
  readonly actualRevision?: number;
  readonly issues?: readonly SurfaceValidationIssue[];
}

export type SurfaceDocumentResult =
  | { readonly ok: true; readonly document: SurfaceDocument }
  | { readonly ok: false; readonly error: SurfaceDocumentError };

export type SurfaceDocumentHistoryResult =
  | { readonly ok: true; readonly documents: readonly SurfaceDocument[] }
  | { readonly ok: false; readonly error: SurfaceDocumentError };

export interface SurfaceRevisionMetadata {
  readonly scopeId: string;
  readonly surfaceId: string;
  readonly expectedRevision: number;
  readonly actorId: string;
  readonly operationId: string;
  readonly reason?: string;
  readonly origin?: SurfaceRevisionOrigin;
  readonly proposalId?: string;
  readonly proposalDigest?: string;
}

export type SurfaceDocumentValidationResult =
  | { readonly ok: true; readonly document: SurfaceDocument }
  | { readonly ok: false; readonly error: SurfaceDocumentError };
