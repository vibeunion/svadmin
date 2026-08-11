import { z } from 'zod';
import { jsonValueIssue, jsonValuesEqual } from './json.js';
import {
  SURFACE_DOCUMENT_LIMITS,
  type SurfaceDocument,
  type SurfaceDocumentDependencies,
  type SurfaceDocumentError,
  type SurfaceDocumentHistoryResult,
  type SurfaceDocumentResult,
  type SurfaceRevisionMetadata,
  type SurfaceRevisionOperation,
  type SurfaceStoreAppendRequest,
  type SurfaceWriteAction,
} from './document-types.js';
import { validateSurfaceDocument } from './document-validation.js';
import type { JsonValue, SurfaceSpec } from './types.js';
import { validateSurfaceSpec } from './validation.js';

export * from './document-types.js';
export { validateSurfaceDocument } from './document-validation.js';
export { createMemorySurfaceStore } from './memory-store.js';

const identitySchema = z.string()
  .min(1)
  .max(SURFACE_DOCUMENT_LIMITS.maxIdentityLength)
  .regex(/^[^\u0000-\u001f\u007f]+$/u);
const metadataSchema = z.object({
  scopeId: identitySchema,
  surfaceId: identitySchema,
  expectedRevision: z.number().int().nonnegative(),
  actorId: identitySchema,
  operationId: identitySchema,
  reason: z.string().min(1).max(SURFACE_DOCUMENT_LIMITS.maxReasonLength).optional(),
  origin: z.enum(['host', 'agent']).optional(),
  proposalId: identitySchema.optional(),
  proposalDigest: identitySchema.optional(),
}).strict();
const lookupSchema = z.object({
  scopeId: identitySchema,
  surfaceId: identitySchema,
  revision: z.number().int().positive().optional(),
  stage: z.enum(['draft', 'published']).optional(),
}).strict();
const writeActionSchema = z.enum(['write', 'publish', 'rollback', 'approve']);
const appendSuccessSchema = z.object({
  ok: z.literal(true),
  document: z.unknown(),
}).strict();
const appendConflictSchema = z.object({
  ok: z.literal(false),
  code: z.literal('revision_conflict'),
  actualRevision: z.number().int().nonnegative(),
}).strict();

type SurfaceDocumentFailure = Extract<SurfaceDocumentResult, { readonly ok: false }>;

function failure(code: SurfaceDocumentError['code'], message: string): SurfaceDocumentFailure {
  return { ok: false, error: { code, message } };
}

function conflict(actualRevision: number): SurfaceDocumentFailure {
  return {
    ok: false,
    error: { code: 'revision_conflict', message: 'Surface revision has changed', actualRevision },
  };
}

function validMetadata(metadata: SurfaceRevisionMetadata): boolean {
  const parsed = metadataSchema.safeParse(metadata);
  return parsed.success
    && (parsed.data.proposalId === undefined) === (parsed.data.proposalDigest === undefined);
}

function revisionMetadata(request: ExistingSurfaceRevisionRequest): SurfaceRevisionMetadata {
  return {
    scopeId: request.scopeId,
    surfaceId: request.surfaceId,
    expectedRevision: request.expectedRevision,
    actorId: request.actorId,
    operationId: request.operationId,
    ...(request.reason ? { reason: request.reason } : {}),
    ...(request.origin ? { origin: request.origin } : {}),
    ...(request.proposalId ? { proposalId: request.proposalId } : {}),
    ...(request.proposalDigest ? { proposalDigest: request.proposalDigest } : {}),
  };
}

export async function authorizeSurfaceChange(
  dependencies: SurfaceDocumentDependencies,
  metadata: SurfaceRevisionMetadata,
  action: SurfaceWriteAction,
): Promise<SurfaceDocumentFailure | null> {
  if (!validMetadata(metadata) || !writeActionSchema.safeParse(action).success) {
    return failure('invalid_request', 'Surface revision authorization is invalid');
  }
  try {
    const decision = await dependencies.authorize({
      scopeId: metadata.scopeId,
      surfaceId: metadata.surfaceId,
      actorId: metadata.actorId,
      action,
    });
    return decision.can ? null : failure('access_denied', 'Surface write was denied');
  } catch {
    return failure('authorization_failed', 'Surface write authorization failed');
  }
}

function revisionTimestamp(dependencies: SurfaceDocumentDependencies): string | null {
  try {
    const timestamp = (dependencies.now ?? (() => new Date()))().toISOString();
    return z.string().datetime({ offset: true }).safeParse(timestamp).success ? timestamp : null;
  } catch {
    return null;
  }
}

interface AppendRevisionInput {
  readonly metadata: SurfaceRevisionMetadata;
  readonly spec: SurfaceSpec;
  readonly stage: SurfaceDocument['stage'];
  readonly operation: SurfaceRevisionOperation;
  readonly createdAt: string;
  readonly targetRevision?: number;
}

function appendRequest(input: AppendRevisionInput): SurfaceStoreAppendRequest {
  return {
    scopeId: input.metadata.scopeId,
    surfaceId: input.metadata.surfaceId,
    expectedRevision: input.metadata.expectedRevision,
    stage: input.stage,
    spec: input.spec,
    createdAt: input.createdAt,
    provenance: {
      actorId: input.metadata.actorId,
      operationId: input.metadata.operationId,
      operation: input.operation,
      origin: input.metadata.origin ?? 'host',
      ...(input.metadata.reason ? { reason: input.metadata.reason } : {}),
      ...(input.targetRevision ? { targetRevision: input.targetRevision } : {}),
      ...(input.metadata.proposalId ? { proposalId: input.metadata.proposalId } : {}),
      ...(input.metadata.proposalDigest ? { proposalDigest: input.metadata.proposalDigest } : {}),
    },
  };
}

function documentMatchesAppend(document: SurfaceDocument, request: SurfaceStoreAppendRequest): boolean {
  const expectedProvenance = {
    ...request.provenance,
    parentRevision: request.expectedRevision === 0 ? null : request.expectedRevision,
  } as unknown as JsonValue;
  return document.scopeId === request.scopeId
    && document.surfaceId === request.surfaceId
    && document.revision === request.expectedRevision + 1
    && document.stage === request.stage
    && document.createdAt === request.createdAt
    && jsonValuesEqual(document.spec as unknown as JsonValue, request.spec as unknown as JsonValue)
    && jsonValuesEqual(document.provenance as unknown as JsonValue, expectedProvenance);
}

function documentMatchesLookup(
  document: SurfaceDocument,
  lookup: z.infer<typeof lookupSchema>,
): boolean {
  return document.scopeId === lookup.scopeId
    && document.surfaceId === lookup.surfaceId
    && (lookup.revision === undefined || document.revision === lookup.revision)
    && (lookup.stage === undefined || document.stage === lookup.stage);
}

export async function appendSurfaceRevision(
  dependencies: SurfaceDocumentDependencies,
  request: SurfaceStoreAppendRequest,
): Promise<SurfaceDocumentResult> {
  try {
    const appendResponse: unknown = await dependencies.store.append(request);
    if (jsonValueIssue(appendResponse)
      || !appendResponse
      || typeof appendResponse !== 'object'
      || Array.isArray(appendResponse)) {
      return failure('store_result_invalid', 'Surface Store returned an invalid result');
    }
    const conflictResponse = appendConflictSchema.safeParse(appendResponse);
    if (conflictResponse.success) return conflict(conflictResponse.data.actualRevision);
    const successResponse = appendSuccessSchema.safeParse(appendResponse);
    if (!successResponse.success) return failure('store_result_invalid', 'Surface Store returned an invalid result');
    const validation = validateSurfaceDocument(
      successResponse.data.document,
      dependencies.catalog,
      dependencies.policy,
    );
    return validation.ok
      && validation.document
      && documentMatchesAppend(validation.document, request)
      ? { ok: true, document: validation.document }
      : failure('store_result_invalid', 'Surface Store returned an invalid document');
  } catch {
    return failure('store_failed', 'Surface Store append failed');
  }
}

export interface ReadSurfaceDocumentRequest {
  readonly dependencies: SurfaceDocumentDependencies;
  readonly scopeId: string;
  readonly surfaceId: string;
  readonly revision?: number;
  readonly stage?: SurfaceDocument['stage'];
}

export async function readSurfaceDocument(request: ReadSurfaceDocumentRequest): Promise<SurfaceDocumentResult> {
  const lookup = lookupSchema.safeParse({
    scopeId: request.scopeId,
    surfaceId: request.surfaceId,
    ...(request.revision === undefined ? {} : { revision: request.revision }),
    ...(request.stage === undefined ? {} : { stage: request.stage }),
  });
  if (!lookup.success) return failure('invalid_request', 'Surface document lookup is invalid');
  try {
    const stored: unknown = await request.dependencies.store.read(lookup.data);
    if (stored === null) return failure('not_found', 'Surface document was not found');
    const validation = validateSurfaceDocument(stored, request.dependencies.catalog, request.dependencies.policy);
    return validation.ok && validation.document && documentMatchesLookup(validation.document, lookup.data)
      ? { ok: true, document: validation.document }
      : failure('store_result_invalid', 'Surface Store returned an invalid document');
  } catch {
    return failure('store_failed', 'Surface Store read failed');
  }
}

export interface ListSurfaceDocumentHistoryRequest {
  readonly dependencies: SurfaceDocumentDependencies;
  readonly scopeId: string;
  readonly surfaceId: string;
}

export async function listSurfaceDocumentHistory(
  request: ListSurfaceDocumentHistoryRequest,
): Promise<SurfaceDocumentHistoryResult> {
  const lookup = lookupSchema.safeParse({ scopeId: request.scopeId, surfaceId: request.surfaceId });
  if (!lookup.success) {
    return { ok: false, error: { code: 'invalid_request', message: 'Surface history lookup is invalid' } };
  }
  try {
    const stored: unknown = await request.dependencies.store.history(lookup.data);
    if (jsonValueIssue(stored) || !Array.isArray(stored)) {
      return { ok: false, error: { code: 'store_result_invalid', message: 'Surface history is invalid' } };
    }
    const documents: SurfaceDocument[] = [];
    for (const [index, candidate] of stored.entries()) {
      const validation = validateSurfaceDocument(candidate, request.dependencies.catalog, request.dependencies.policy);
      if (!validation.ok
        || !validation.document
        || !documentMatchesLookup(validation.document, lookup.data)
        || validation.document.revision !== index + 1) {
        return { ok: false, error: { code: 'store_result_invalid', message: 'Surface history is invalid' } };
      }
      documents.push(validation.document);
    }
    return { ok: true, documents };
  } catch {
    return { ok: false, error: { code: 'store_failed', message: 'Surface Store history failed' } };
  }
}

export interface SaveSurfaceDraftRequest {
  readonly dependencies: SurfaceDocumentDependencies;
  readonly scopeId: string;
  readonly spec: SurfaceSpec;
  readonly expectedRevision: number;
  readonly actorId: string;
  readonly operationId: string;
  readonly reason?: string;
  readonly origin?: 'host' | 'agent';
  readonly proposalId?: string;
  readonly proposalDigest?: string;
}

export async function saveSurfaceDraft(request: SaveSurfaceDraftRequest): Promise<SurfaceDocumentResult> {
  const validation = validateSurfaceSpec(request.spec, request.dependencies.catalog, request.dependencies.policy);
  if (!validation.ok) {
    return { ok: false, error: { code: 'invalid_document', message: 'SurfaceSpec is invalid', issues: validation.issues } };
  }
  const metadata: SurfaceRevisionMetadata = {
    scopeId: request.scopeId,
    surfaceId: validation.value.surfaceId,
    expectedRevision: request.expectedRevision,
    actorId: request.actorId,
    operationId: request.operationId,
    ...(request.reason ? { reason: request.reason } : {}),
    ...(request.origin ? { origin: request.origin } : {}),
    ...(request.proposalId ? { proposalId: request.proposalId } : {}),
    ...(request.proposalDigest ? { proposalDigest: request.proposalDigest } : {}),
  };
  if (!validMetadata(metadata)) return failure('invalid_request', 'Surface revision metadata is invalid');
  const denial = await authorizeSurfaceChange(request.dependencies, metadata, 'write');
  if (denial) return denial;
  const createdAt = revisionTimestamp(request.dependencies);
  if (!createdAt) return failure('invalid_request', 'Surface revision timestamp is invalid');
  return appendSurfaceRevision(
    request.dependencies,
    appendRequest({
      metadata,
      spec: validation.value,
      stage: 'draft',
      operation: 'draft.save',
      createdAt,
    }),
  );
}

export interface ExistingSurfaceRevisionRequest extends SurfaceRevisionMetadata {
  readonly dependencies: SurfaceDocumentDependencies;
}

async function currentRevision(request: ExistingSurfaceRevisionRequest): Promise<SurfaceDocumentResult> {
  const current = await readSurfaceDocument({
    dependencies: request.dependencies,
    scopeId: request.scopeId,
    surfaceId: request.surfaceId,
  });
  if (!current.ok) return current;
  return current.document.revision === request.expectedRevision
    ? current
    : conflict(current.document.revision);
}

export async function publishSurfaceDocument(request: ExistingSurfaceRevisionRequest): Promise<SurfaceDocumentResult> {
  const metadata = revisionMetadata(request);
  if (!validMetadata(metadata)) return failure('invalid_request', 'Surface revision metadata is invalid');
  const denial = await authorizeSurfaceChange(request.dependencies, metadata, 'publish');
  if (denial) return denial;
  const current = await currentRevision(request);
  if (!current.ok) return current;
  const validation = validateSurfaceSpec(current.document.spec, request.dependencies.catalog, request.dependencies.policy);
  if (!validation.ok) return failure('invalid_document', 'SurfaceSpec is invalid');
  const createdAt = revisionTimestamp(request.dependencies);
  if (!createdAt) return failure('invalid_request', 'Surface revision timestamp is invalid');
  return appendSurfaceRevision(
    request.dependencies,
    appendRequest({
      metadata,
      spec: validation.value,
      stage: 'published',
      operation: 'publish',
      createdAt,
    }),
  );
}

export interface RollbackSurfaceDocumentRequest extends ExistingSurfaceRevisionRequest {
  readonly targetRevision: number;
}

export async function rollbackSurfaceDocument(request: RollbackSurfaceDocumentRequest): Promise<SurfaceDocumentResult> {
  const metadata = revisionMetadata(request);
  if (!validMetadata(metadata)
    || !Number.isInteger(request.targetRevision)
    || request.targetRevision <= 0
    || request.targetRevision >= request.expectedRevision) {
    return failure('invalid_request', 'Surface rollback request is invalid');
  }
  const denial = await authorizeSurfaceChange(request.dependencies, metadata, 'rollback');
  if (denial) return denial;
  const current = await currentRevision(request);
  if (!current.ok) return current;
  const target = await readSurfaceDocument({
    dependencies: request.dependencies,
    scopeId: request.scopeId,
    surfaceId: request.surfaceId,
    revision: request.targetRevision,
  });
  if (!target.ok) return target;
  const validation = validateSurfaceSpec(target.document.spec, request.dependencies.catalog, request.dependencies.policy);
  if (!validation.ok) return failure('invalid_document', 'Rollback SurfaceSpec is invalid');
  const createdAt = revisionTimestamp(request.dependencies);
  if (!createdAt) return failure('invalid_request', 'Surface revision timestamp is invalid');
  return appendSurfaceRevision(
    request.dependencies,
    appendRequest({
      metadata,
      spec: validation.value,
      stage: 'draft',
      operation: 'rollback',
      createdAt,
      targetRevision: request.targetRevision,
    }),
  );
}
