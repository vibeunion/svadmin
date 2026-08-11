import {
  authorizeSurfaceChange,
  cloneJsonValue,
  commitSurfacePatch,
  previewSurfacePatch,
  readSurfaceDocument,
  SURFACE_DOCUMENT_LIMITS,
  type JsonValue,
  type SurfaceRevisionMetadata,
} from '@svadmin/surface';
import { z } from 'zod';
import { defaultSurfaceProposalDigest, defaultSurfaceProposalId } from './digest.js';
import {
  SURFACE_PROPOSAL_LIMITS,
  type SurfaceAgentWorkflow,
  type SurfaceAgentWorkflowOptions,
  type SurfaceProposalApprovalRequest,
  type SurfaceProposalErrorCode,
  type SurfaceProposalInput,
  type SurfaceProposalRejectionRequest,
  type SurfaceProposalReview,
  type SurfaceProposalWorkflowResult,
} from './types.js';
import { validateSurfaceProposal } from './validation.js';

function proposalFailure(code: SurfaceProposalErrorCode, message: string): SurfaceProposalWorkflowResult {
  return { ok: false, error: { code, message } };
}

function reviewClone(review: SurfaceProposalReview): SurfaceProposalReview {
  return cloneJsonValue(review as unknown as JsonValue) as unknown as SurfaceProposalReview;
}

function validClock(clock: number): boolean {
  return Number.isFinite(clock) && clock >= 0 && !Number.isNaN(new Date(clock).getTime());
}

function readClock(clock: () => number): number | null {
  try {
    const timestamp = clock();
    return validClock(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

function isoTimestamp(clock: number): string {
  return new Date(clock).toISOString();
}

function digestBinding(
  options: SurfaceAgentWorkflowOptions,
  proposal: SurfaceProposalInput,
): JsonValue {
  return {
    scopeId: options.scopeId,
    surfaceId: options.surfaceId,
    baseRevision: proposal.baseRevision,
    catalogVersion: options.dependencies.catalog.version,
    summary: proposal.summary,
    operations: proposal.operations,
  } as unknown as JsonValue;
}

function approvalMetadata(
  options: SurfaceAgentWorkflowOptions,
  review: SurfaceProposalReview,
  request: SurfaceProposalApprovalRequest,
): SurfaceRevisionMetadata {
  return {
    scopeId: options.scopeId,
    surfaceId: options.surfaceId,
    expectedRevision: review.baseRevision,
    actorId: request.actorId,
    operationId: request.operationId,
    reason: review.summary,
    origin: 'agent',
    proposalId: review.proposalId,
    proposalDigest: review.digest,
  };
}

function isExpired(review: SurfaceProposalReview, clock: number): boolean {
  return clock >= Date.parse(review.expiresAt);
}

function updatedReview(
  review: SurfaceProposalReview,
  changes: Partial<SurfaceProposalReview>,
): SurfaceProposalReview {
  return { ...review, ...changes };
}

const identitySchema = z.string()
  .min(1)
  .max(SURFACE_DOCUMENT_LIMITS.maxIdentityLength)
  .regex(/^[^\u0000-\u001f\u007f]+$/u);
const proposalIdSchema = identitySchema.regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u);
const digestSchema = identitySchema.regex(/^\S+$/u);
const approvalSchema = z.object({
  proposalId: proposalIdSchema,
  actorId: identitySchema,
  operationId: identitySchema,
}).strict();
const rejectionSchema = z.object({
  proposalId: proposalIdSchema,
  actorId: identitySchema,
  reason: z.string().min(1).max(SURFACE_DOCUMENT_LIMITS.maxReasonLength).optional(),
}).strict();

interface PendingReviewSnapshot {
  readonly review: SurfaceProposalReview;
  readonly clock: number;
}

export function createSurfaceAgentWorkflow(options: SurfaceAgentWorkflowOptions): SurfaceAgentWorkflow {
  const reviews = new Map<string, SurfaceProposalReview>();
  const idFactory = options.proposalId ?? defaultSurfaceProposalId;
  const digestFactory = options.digest ?? defaultSurfaceProposalDigest;
  const clock = options.now ?? Date.now;
  const ttl = options.proposalTtlMs ?? SURFACE_PROPOSAL_LIMITS.defaultTtlMs;

  async function request(input: unknown): Promise<SurfaceProposalWorkflowResult> {
    const validation = validateSurfaceProposal(input);
    if (!validation.ok) return validation;
    if (validation.proposal.surfaceId !== options.surfaceId) {
      return proposalFailure('surface_mismatch', 'Surface proposal targets another Surface');
    }
    const current = await readSurfaceDocument({
      dependencies: options.dependencies,
      scopeId: options.scopeId,
      surfaceId: options.surfaceId,
    });
    if (!current.ok) return current;
    if (current.document.revision !== validation.proposal.baseRevision) {
      return {
        ok: false,
        error: {
          code: 'revision_conflict',
          message: 'Surface revision has changed',
          actualRevision: current.document.revision,
        },
      };
    }
    const preview = previewSurfacePatch({
      spec: current.document.spec,
      operations: validation.proposal.operations,
      catalog: options.dependencies.catalog,
      policy: options.dependencies.policy,
    });
    if (!preview.ok) return preview;

    const now = readClock(clock);
    if (now === null || !Number.isFinite(ttl) || ttl <= 0 || ttl > SURFACE_PROPOSAL_LIMITS.maxTtlMs) {
      return proposalFailure('runtime_unavailable', 'Surface proposal clock is unavailable');
    }
    try {
      const digest = await digestFactory(digestBinding(options, validation.proposal));
      if (!digestSchema.safeParse(digest).success) {
        return proposalFailure('runtime_unavailable', 'Surface proposal digest is invalid');
      }
      const proposalId = idFactory();
      if (!proposalIdSchema.safeParse(proposalId).success) {
        return proposalFailure('runtime_unavailable', 'Surface proposal identifier is invalid');
      }
      if (reviews.has(proposalId)) return proposalFailure('duplicate_proposal_id', 'Surface proposal identifier already exists');
      const review: SurfaceProposalReview = {
        ...validation.proposal,
        proposalId,
        scopeId: options.scopeId,
        catalogVersion: options.dependencies.catalog.version,
        digest,
        status: 'pending',
        createdAt: isoTimestamp(now),
        expiresAt: isoTimestamp(now + ttl),
        changedPaths: preview.preview.changedPaths,
        before: preview.preview.before,
        after: preview.preview.after,
      };
      reviews.set(proposalId, reviewClone(review));
      return { ok: true, review: reviewClone(review) };
    } catch {
      return proposalFailure('runtime_unavailable', 'Surface proposal runtime is unavailable');
    }
  }

  function pendingReview(proposalId: string): PendingReviewSnapshot | SurfaceProposalWorkflowResult {
    const review = reviews.get(proposalId);
    if (!review) return proposalFailure('proposal_not_found', 'Surface proposal was not found');
    if (review.status !== 'pending') {
      return proposalFailure('proposal_not_pending', 'Surface proposal is no longer pending');
    }
    const now = readClock(clock);
    if (now === null) return proposalFailure('runtime_unavailable', 'Surface proposal clock is unavailable');
    if (isExpired(review, now)) {
      reviews.set(proposalId, updatedReview(review, { status: 'expired' }));
      return proposalFailure('proposal_expired', 'Surface proposal has expired');
    }
    return { review, clock: now };
  }

  async function approve(request: SurfaceProposalApprovalRequest): Promise<SurfaceProposalWorkflowResult> {
    const decision = approvalSchema.safeParse(request);
    if (!decision.success) return proposalFailure('invalid_decision', 'Surface proposal approval is invalid');
    const pending = pendingReview(decision.data.proposalId);
    if ('ok' in pending) return pending;
    const metadata = approvalMetadata(options, pending.review, decision.data);
    reviews.set(decision.data.proposalId, updatedReview(pending.review, { status: 'deciding' }));
    const denial = await authorizeSurfaceChange(options.dependencies, metadata, 'approve');
    if (denial) {
      reviews.set(decision.data.proposalId, pending.review);
      return denial;
    }
    const committed = await commitSurfacePatch({
      dependencies: options.dependencies,
      scopeId: options.scopeId,
      surfaceId: options.surfaceId,
      baseRevision: pending.review.baseRevision,
      actorId: decision.data.actorId,
      operationId: decision.data.operationId,
      operations: pending.review.operations,
      reason: pending.review.summary,
      origin: 'agent',
      proposalId: pending.review.proposalId,
      proposalDigest: pending.review.digest,
    });
    if (!committed.ok) {
      reviews.set(decision.data.proposalId, updatedReview(pending.review, {
        status: 'failed',
        failureCode: committed.error.code,
      }));
      return committed;
    }
    const applied = updatedReview(pending.review, {
      status: 'applied',
      appliedRevision: committed.document.revision,
      decision: {
        decision: 'approved',
        actorId: decision.data.actorId,
        decidedAt: isoTimestamp(pending.clock),
      },
    });
    reviews.set(decision.data.proposalId, applied);
    return { ok: true, review: reviewClone(applied) };
  }

  async function reject(request: SurfaceProposalRejectionRequest): Promise<SurfaceProposalWorkflowResult> {
    const decision = rejectionSchema.safeParse(request);
    if (!decision.success) return proposalFailure('invalid_decision', 'Surface proposal rejection is invalid');
    const pending = pendingReview(decision.data.proposalId);
    if ('ok' in pending) return pending;
    const metadata: SurfaceRevisionMetadata = {
      scopeId: options.scopeId,
      surfaceId: options.surfaceId,
      expectedRevision: pending.review.baseRevision,
      actorId: decision.data.actorId,
      operationId: pending.review.proposalId,
      origin: 'agent',
      proposalId: pending.review.proposalId,
      proposalDigest: pending.review.digest,
    };
    reviews.set(decision.data.proposalId, updatedReview(pending.review, { status: 'deciding' }));
    const denial = await authorizeSurfaceChange(options.dependencies, metadata, 'approve');
    if (denial) {
      reviews.set(decision.data.proposalId, pending.review);
      return denial;
    }
    const rejected = updatedReview(pending.review, {
      status: 'rejected',
      decision: {
        decision: 'rejected',
        actorId: decision.data.actorId,
        decidedAt: isoTimestamp(pending.clock),
        ...(decision.data.reason ? { reason: decision.data.reason } : {}),
      },
    });
    reviews.set(decision.data.proposalId, rejected);
    return { ok: true, review: reviewClone(rejected) };
  }

  return {
    request,
    approve,
    reject,
    get(proposalId) {
      const review = reviews.get(proposalId);
      return review ? reviewClone(review) : null;
    },
  };
}
