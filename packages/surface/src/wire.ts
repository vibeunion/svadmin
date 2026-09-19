import { jsonPointer, jsonValueIssue } from './json.js';
import { SURFACE_AGENT_LIMITS } from './agent-contract.js';
import type { SurfaceValidationIssue } from './types.js';

export type SurfaceWireResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly issues: readonly SurfaceValidationIssue[] };

export function surfaceWireError(message: string, code: 'invalid_json' | 'limit_exceeded' = 'invalid_json'): Extract<SurfaceWireResult, { ok: false }> {
  return { ok: false, issues: [{ code, path: '', message }] };
}

/** 先检查大小和 JSON 安全性，再进入 TypeBox；返回独立副本，避免校验后被调用方改写。 */
export function parseSurfaceJson(input: unknown, legacyFences = false): SurfaceWireResult {
  try {
    let candidate = input;
    if (typeof input === 'string') {
      if (input.length > SURFACE_AGENT_LIMITS.maxInputCharacters) return surfaceWireError('Surface input is too large', 'limit_exceeded');
      const source = input.trim();
      const fenced = legacyFences
        ? /```(?:json)?\s*([\s\S]*?)```/iu.exec(source)
        : /^```(?:json)?\s*([\s\S]*?)```$/iu.exec(source);
      candidate = JSON.parse(fenced?.[1] ?? source);
    }
    const issue = jsonValueIssue(candidate);
    if (issue) return { ok: false, issues: [{ code: 'invalid_json', path: jsonPointer(issue.path), message: issue.message }] };
    const serialized = JSON.stringify(candidate);
    if (serialized.length > SURFACE_AGENT_LIMITS.maxInputCharacters) return surfaceWireError('Surface input is too large', 'limit_exceeded');
    return { ok: true, value: JSON.parse(serialized) as unknown };
  } catch {
    return surfaceWireError('Surface input must be valid, safely inspectable JSON');
  }
}
