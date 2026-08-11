import { validateSurfacePatch, jsonValueIssue } from '@svadmin/surface';
import { z } from 'zod';
import {
  SURFACE_PROPOSAL_LIMITS,
  SURFACE_PROPOSAL_VERSION,
  type SurfaceProposalError,
  type SurfaceProposalInput,
  type SurfaceProposalValidationResult,
} from './types.js';

const proposalSchema = z.object({
  proposalVersion: z.literal(SURFACE_PROPOSAL_VERSION),
  surfaceId: z.string().min(1).max(64).regex(/^[A-Za-z][A-Za-z0-9_-]*$/u),
  baseRevision: z.number().int().positive(),
  summary: z.string().min(1).max(SURFACE_PROPOSAL_LIMITS.maxSummaryLength),
  operations: z.unknown(),
}).strict();

function invalidProposal(message: string): SurfaceProposalValidationResult {
  const error: SurfaceProposalError = { code: 'invalid_proposal', message };
  return { ok: false, error };
}

export function validateSurfaceProposal(input: unknown): SurfaceProposalValidationResult {
  if (jsonValueIssue(input)) return invalidProposal('Surface proposal must be JSON-safe');
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return invalidProposal('Surface proposal structure is invalid');
  const patchValidation = validateSurfacePatch(parsed.data.operations);
  if (!patchValidation.ok) return { ok: false, error: patchValidation.error };
  const proposal: SurfaceProposalInput = {
    proposalVersion: SURFACE_PROPOSAL_VERSION,
    surfaceId: parsed.data.surfaceId,
    baseRevision: parsed.data.baseRevision,
    summary: parsed.data.summary,
    operations: patchValidation.operations,
  };
  return { ok: true, proposal };
}
