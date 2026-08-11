import { z } from 'zod';
import {
  appendSurfaceRevision,
  authorizeSurfaceChange,
  readSurfaceDocument,
} from './document.js';
import { SURFACE_DOCUMENT_LIMITS, type SurfaceRevisionMetadata } from './document-types.js';
import { applySurfacePatchOperations } from './patch-apply.js';
import {
  type CommitSurfacePatchRequest,
  type SurfacePatchCommitResult,
  type SurfacePatchPreviewResult,
} from './patch-types.js';
import { validateSurfacePatch } from './patch-validation.js';
import type { JsonObject, SurfaceCatalog, SurfacePolicy, SurfaceSpec } from './types.js';
import { validateSurfaceSpec } from './validation.js';

export * from './patch-types.js';
export { validateSurfacePatch } from './patch-validation.js';

const commitMetadataSchema = z.object({
  scopeId: z.string().min(1).max(SURFACE_DOCUMENT_LIMITS.maxIdentityLength),
  surfaceId: z.string().min(1).max(SURFACE_DOCUMENT_LIMITS.maxIdentityLength),
  expectedRevision: z.number().int().nonnegative(),
  actorId: z.string().min(1).max(SURFACE_DOCUMENT_LIMITS.maxIdentityLength),
  operationId: z.string().min(1).max(SURFACE_DOCUMENT_LIMITS.maxIdentityLength),
  reason: z.string().min(1).max(SURFACE_DOCUMENT_LIMITS.maxReasonLength).optional(),
  origin: z.enum(['host', 'agent']).optional(),
  proposalId: z.string().min(1).max(SURFACE_DOCUMENT_LIMITS.maxIdentityLength).optional(),
  proposalDigest: z.string().min(1).max(SURFACE_DOCUMENT_LIMITS.maxIdentityLength).optional(),
}).strict();

export function previewSurfacePatch(request: {
  readonly spec: unknown;
  readonly operations: unknown;
  readonly catalog: SurfaceCatalog;
  readonly policy: SurfacePolicy;
}): SurfacePatchPreviewResult {
  const beforeValidation = validateSurfaceSpec(request.spec, request.catalog, request.policy);
  if (!beforeValidation.ok) {
    return {
      ok: false,
      error: { code: 'surface_invalid', message: 'Base SurfaceSpec is invalid', issues: beforeValidation.issues },
    };
  }
  const patchValidation = validateSurfacePatch(request.operations);
  if (!patchValidation.ok) return patchValidation;
  const application = applySurfacePatchOperations(
    beforeValidation.value as unknown as JsonObject,
    patchValidation.operations,
  );
  if (!application.ok) return application;
  const afterValidation = validateSurfaceSpec(application.after, request.catalog, request.policy);
  if (!afterValidation.ok) {
    return {
      ok: false,
      error: { code: 'surface_invalid', message: 'Patched SurfaceSpec is invalid', issues: afterValidation.issues },
    };
  }
  return {
    ok: true,
    preview: {
      operations: patchValidation.operations,
      changedPaths: application.changedPaths,
      before: beforeValidation.value,
      after: afterValidation.value,
    },
  };
}

function revisionMetadata(request: CommitSurfacePatchRequest): SurfaceRevisionMetadata {
  return {
    scopeId: request.scopeId,
    surfaceId: request.surfaceId,
    expectedRevision: request.baseRevision,
    actorId: request.actorId,
    operationId: request.operationId,
    ...(request.reason ? { reason: request.reason } : {}),
    ...(request.origin ? { origin: request.origin } : {}),
    ...(request.proposalId ? { proposalId: request.proposalId } : {}),
    ...(request.proposalDigest ? { proposalDigest: request.proposalDigest } : {}),
  };
}

function revisionTimestamp(request: CommitSurfacePatchRequest): string | null {
  try {
    const timestamp = (request.dependencies.now ?? (() => new Date()))().toISOString();
    return z.string().datetime({ offset: true }).safeParse(timestamp).success ? timestamp : null;
  } catch {
    return null;
  }
}

function conflict(actualRevision: number): SurfacePatchCommitResult {
  return {
    ok: false,
    error: { code: 'revision_conflict', message: 'Surface revision has changed', actualRevision },
  };
}

export async function commitSurfacePatch(
  request: CommitSurfacePatchRequest,
): Promise<SurfacePatchCommitResult> {
  const patchValidation = validateSurfacePatch(request.operations);
  if (!patchValidation.ok) return patchValidation;
  const metadata = revisionMetadata(request);
  if (!commitMetadataSchema.safeParse(metadata).success) {
    return { ok: false, error: { code: 'invalid_request', message: 'Surface Patch request is invalid' } };
  }
  const denial = await authorizeSurfaceChange(request.dependencies, metadata, 'write');
  if (denial) return denial;

  const current = await readSurfaceDocument({
    dependencies: request.dependencies,
    scopeId: request.scopeId,
    surfaceId: request.surfaceId,
  });
  if (!current.ok) return current;
  if (current.document.revision !== request.baseRevision) return conflict(current.document.revision);

  const preview = previewSurfacePatch({
    spec: current.document.spec,
    operations: patchValidation.operations,
    catalog: request.dependencies.catalog,
    policy: request.dependencies.policy,
  });
  if (!preview.ok) return preview;
  const createdAt = revisionTimestamp(request);
  if (!createdAt) {
    return { ok: false, error: { code: 'invalid_request', message: 'Surface revision timestamp is invalid' } };
  }

  return appendSurfaceRevision(request.dependencies, {
    scopeId: request.scopeId,
    surfaceId: request.surfaceId,
    expectedRevision: request.baseRevision,
    stage: 'draft',
    spec: preview.preview.after as SurfaceSpec,
    createdAt,
    provenance: {
      actorId: request.actorId,
      operationId: request.operationId,
      operation: 'patch',
      origin: request.origin ?? 'host',
      ...(request.reason ? { reason: request.reason } : {}),
      ...(request.proposalId ? { proposalId: request.proposalId } : {}),
      ...(request.proposalDigest ? { proposalDigest: request.proposalDigest } : {}),
    },
  });
}
