import type {
  SurfaceDocument,
  SurfaceDocumentDependencies,
  SurfaceDocumentError,
} from './document-types.js';
import type { JsonValue, SurfaceSpec, SurfaceValidationIssue } from './types.js';

export const SURFACE_PATCH_LIMITS = {
  maxOperations: 64,
  maxPointerLength: 512,
} as const;

export type SurfacePatchOperation =
  | { readonly op: 'add'; readonly path: string; readonly value: JsonValue }
  | { readonly op: 'remove'; readonly path: string }
  | { readonly op: 'replace'; readonly path: string; readonly value: JsonValue }
  | { readonly op: 'test'; readonly path: string; readonly value: JsonValue };

export type SurfacePatchErrorCode =
  | 'invalid_patch'
  | 'patch_path_not_found'
  | 'patch_test_failed'
  | 'surface_invalid';

export interface SurfacePatchError {
  readonly code: SurfacePatchErrorCode;
  readonly message: string;
  readonly path?: string;
  readonly issues?: readonly SurfaceValidationIssue[];
}

export type SurfacePatchValidationResult =
  | { readonly ok: true; readonly operations: readonly SurfacePatchOperation[] }
  | { readonly ok: false; readonly error: SurfacePatchError };

export interface SurfacePatchPreview {
  readonly operations: readonly SurfacePatchOperation[];
  readonly changedPaths: readonly string[];
  readonly before: SurfaceSpec;
  readonly after: SurfaceSpec;
}

export type SurfacePatchPreviewResult =
  | { readonly ok: true; readonly preview: SurfacePatchPreview }
  | { readonly ok: false; readonly error: SurfacePatchError };

export type SurfacePatchCommitResult =
  | { readonly ok: true; readonly document: SurfaceDocument }
  | { readonly ok: false; readonly error: SurfacePatchError | SurfaceDocumentError };

export interface CommitSurfacePatchRequest {
  readonly dependencies: SurfaceDocumentDependencies;
  readonly scopeId: string;
  readonly surfaceId: string;
  readonly baseRevision: number;
  readonly actorId: string;
  readonly operationId: string;
  readonly operations: unknown;
  readonly reason?: string;
  readonly origin?: 'host' | 'agent';
  readonly proposalId?: string;
  readonly proposalDigest?: string;
}
