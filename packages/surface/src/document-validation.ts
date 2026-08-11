import { z } from 'zod';
import { jsonValueIssue } from './json.js';
import {
  SURFACE_DOCUMENT_LIMITS,
  SURFACE_DOCUMENT_VERSION,
  type SurfaceDocument,
  type SurfaceDocumentError,
  type SurfaceDocumentValidationResult,
} from './document-types.js';
import type { SurfaceCatalog, SurfacePolicy } from './types.js';
import { validateSurfaceSpec } from './validation.js';

const identitySchema = z.string()
  .min(1)
  .max(SURFACE_DOCUMENT_LIMITS.maxIdentityLength)
  .regex(/^[^\u0000-\u001f\u007f]+$/u);

const provenanceSchema = z.object({
  actorId: identitySchema,
  operationId: identitySchema,
  operation: z.enum(['draft.save', 'publish', 'rollback', 'patch']),
  origin: z.enum(['host', 'agent']),
  parentRevision: z.number().int().nonnegative().nullable(),
  reason: z.string().min(1).max(SURFACE_DOCUMENT_LIMITS.maxReasonLength).optional(),
  targetRevision: z.number().int().positive().optional(),
  proposalId: identitySchema.optional(),
  proposalDigest: identitySchema.optional(),
}).strict();

const documentSchema = z.object({
  documentVersion: z.literal(SURFACE_DOCUMENT_VERSION),
  scopeId: identitySchema,
  surfaceId: identitySchema,
  revision: z.number().int().positive(),
  stage: z.enum(['draft', 'published']),
  spec: z.unknown(),
  createdAt: z.string().datetime({ offset: true }),
  provenance: provenanceSchema,
}).strict();

function documentError(message: string): SurfaceDocumentValidationResult {
  return { ok: false, error: { code: 'invalid_document', message } };
}

function provenanceMatchesRevision(document: SurfaceDocument): boolean {
  const expectedParent = document.revision === 1 ? null : document.revision - 1;
  if (document.provenance.parentRevision !== expectedParent) return false;
  const targetRevision = document.provenance.targetRevision;
  const hasTarget = targetRevision !== undefined;
  if ((document.provenance.operation === 'rollback') !== hasTarget) return false;
  if (hasTarget
    && (document.provenance.parentRevision === null
      || targetRevision >= document.provenance.parentRevision)) return false;
  const hasProposalId = document.provenance.proposalId !== undefined;
  const hasProposalDigest = document.provenance.proposalDigest !== undefined;
  if (hasProposalId !== hasProposalDigest) return false;
  if (document.provenance.operation === 'publish') return document.stage === 'published';
  return document.stage === 'draft';
}

export function validateSurfaceDocument(
  input: unknown,
  catalog: SurfaceCatalog,
  policy: SurfacePolicy,
): SurfaceDocumentValidationResult {
  if (jsonValueIssue(input)) return documentError('Surface document must be JSON-safe');
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return documentError('Surface document structure is invalid');

  const specValidation = validateSurfaceSpec(parsed.data.spec, catalog, policy);
  if (!specValidation.ok) {
    const error: SurfaceDocumentError = {
      code: 'invalid_document',
      message: 'Surface document contains an invalid SurfaceSpec',
      issues: specValidation.issues,
    };
    return { ok: false, error };
  }

  const document = { ...parsed.data, spec: specValidation.value } as SurfaceDocument;
  if (document.surfaceId !== document.spec.surfaceId) {
    return documentError('Surface document and SurfaceSpec identifiers do not match');
  }
  if (!provenanceMatchesRevision(document)) {
    return documentError('Surface revision provenance is inconsistent');
  }
  return { ok: true, document };
}
