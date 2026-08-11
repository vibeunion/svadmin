import { z } from 'zod';
import { decodedJsonPointerToken, jsonValueIssue } from './json.js';
import {
  SURFACE_PATCH_LIMITS,
  type SurfacePatchError,
  type SurfacePatchOperation,
  type SurfacePatchValidationResult,
} from './patch-types.js';

const valueOperationSchema = z.object({
  op: z.enum(['add', 'replace', 'test']),
  path: z.string().min(1).max(SURFACE_PATCH_LIMITS.maxPointerLength),
  value: z.unknown(),
}).strict();

const removeOperationSchema = z.object({
  op: z.literal('remove'),
  path: z.string().min(1).max(SURFACE_PATCH_LIMITS.maxPointerLength),
}).strict();

const operationsSchema = z.array(z.union([valueOperationSchema, removeOperationSchema]))
  .min(1)
  .max(SURFACE_PATCH_LIMITS.maxOperations);

const mutableRoots = new Set(['title', 'layout', 'dataSources', 'widgets']);
const canonicalArrayIndex = /^(?:0|[1-9][0-9]*)$/u;

function invalidPatch(message: string, path?: string): SurfacePatchValidationResult {
  const error: SurfacePatchError = {
    code: 'invalid_patch',
    message,
    ...(path === undefined ? {} : { path }),
  };
  return { ok: false, error };
}

export function decodedPatchTokens(operation: SurfacePatchOperation): readonly string[] | null {
  if (!operation.path.startsWith('/')) return null;
  const encodedTokens = operation.path.slice(1).split('/');
  if (encodedTokens.length === 0 || encodedTokens.length > 64) return null;

  const tokens: string[] = [];
  for (const [index, encodedToken] of encodedTokens.entries()) {
    const token = decodedJsonPointerToken(encodedToken);
    if (token === null || token.length === 0) return null;
    if (/^[0-9]+$/u.test(token) && !canonicalArrayIndex.test(token)) return null;
    if (token === '-' && (operation.op !== 'add' || index !== encodedTokens.length - 1)) return null;
    tokens.push(token);
  }
  return mutableRoots.has(tokens[0]) ? tokens : null;
}

export function validateSurfacePatch(input: unknown): SurfacePatchValidationResult {
  const jsonIssue = jsonValueIssue(input);
  if (jsonIssue) return invalidPatch('Surface Patch must be JSON-safe');

  const parsed = operationsSchema.safeParse(input);
  if (!parsed.success) return invalidPatch('Surface Patch structure is invalid');
  const operations = parsed.data as readonly SurfacePatchOperation[];
  for (const operation of operations) {
    if (!decodedPatchTokens(operation)) {
      return invalidPatch('Surface Patch contains an unsafe or unsupported path', operation.path);
    }
  }
  return { ok: true, operations };
}
