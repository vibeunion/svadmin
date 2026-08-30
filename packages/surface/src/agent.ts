import { Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { jsonPointer } from './json.js';
import { validateSurfaceSpec } from './validation.js';
import type {
  SurfaceCatalog,
  SurfacePolicy,
  SurfaceSpec,
  SurfaceValidationIssue,
  SurfaceValidationResult,
} from './types.js';

/** Wire version for model-produced, human-reviewable Surface proposals. */
export const SURFACE_AGENT_SCHEMA_VERSION = 'surface-agent/v1' as const;

const proposalSchema = Type.Object({
  schemaVersion: Type.Literal(SURFACE_AGENT_SCHEMA_VERSION),
  action: Type.Literal('propose'),
  summary: Type.Optional(Type.String({ minLength: 1, maxLength: 240 })),
  spec: Type.Unknown(),
}, { additionalProperties: false });
const compiledProposalSchema = TypeCompiler.Compile(proposalSchema);

export interface SurfaceAgentProposal {
  readonly schemaVersion: typeof SURFACE_AGENT_SCHEMA_VERSION;
  readonly action: 'propose';
  readonly summary?: string;
  readonly spec: SurfaceSpec;
}

export type SurfaceAgentValidationResult =
  | { readonly ok: true; readonly value: SurfaceAgentProposal }
  | { readonly ok: false; readonly issues: readonly SurfaceValidationIssue[] };

function parseCandidate(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(value);
  const source = fenced?.[1] ?? value.trim();
  return JSON.parse(source);
}

function proposalIssue(message: string): SurfaceValidationIssue {
  return {
    code: 'invalid_json',
    path: '/',
    message,
  };
}

function proposalSchemaIssues(errors: Iterable<{ path: string; message: string }>): SurfaceValidationIssue[] {
  return [...errors].map((issue) => ({
    code: 'invalid_json',
    path: issue.path || jsonPointer([]),
    message: issue.message,
  }));
}

/**
 * Parse and fully validate an AI-generated proposal before a host previews it.
 * This function has no side effects and never queries a provider.
 */
export function parseSurfaceAgentProposal(
  input: unknown,
  catalog: SurfaceCatalog,
  policy: SurfacePolicy,
): SurfaceAgentValidationResult {
  let candidate: unknown;
  try {
    candidate = parseCandidate(input);
  } catch {
    return { ok: false, issues: [proposalIssue('Agent proposal must be valid JSON')] };
  }

  if (!compiledProposalSchema.Check(candidate)) {
    return { ok: false, issues: proposalSchemaIssues(compiledProposalSchema.Errors(candidate)) };
  }
  const parsed = candidate as {
    schemaVersion: typeof SURFACE_AGENT_SCHEMA_VERSION;
    action: 'propose';
    summary?: string;
    spec: unknown;
  };

  const surface: SurfaceValidationResult = validateSurfaceSpec(parsed.spec, catalog, policy);
  if (!surface.ok) return surface;

  return {
    ok: true,
    value: {
      schemaVersion: SURFACE_AGENT_SCHEMA_VERSION,
      action: 'propose',
      ...(parsed.summary === undefined ? {} : { summary: parsed.summary }),
      spec: surface.value,
    },
  };
}

/** Build a model instruction that keeps generation inside the Surface contract. */
export function buildSurfaceAgentPrompt(
  request: string,
  catalog: SurfaceCatalog,
  policy: SurfacePolicy,
): string {
  const widgetTypes = catalog.widgets.map((widget) => widget.type).join(', ') || '(none)';
  const resources = Object.entries(policy.resources).map(([resource, resourcePolicy]) => {
    const permissions = [
      `read=${resourcePolicy.readFields.join(',') || '(none)'}`,
      `filter=${resourcePolicy.filterFields?.join(',') || '(none)'}`,
      `sort=${resourcePolicy.sortFields?.join(',') || '(none)'}`,
      `getOne=${resourcePolicy.allowGetOne === true}`,
      `maxPageSize=${resourcePolicy.maxPageSize ?? 'default'}`,
    ];
    return `${resource}(${permissions.join(';')})`;
  }).join(' | ') || '(none)';

  return `${request}\n\n[svadmin surface agent protocol]\nReturn only a human-reviewable fenced JSON proposal. Never generate or execute Svelte, HTML, CSS, JavaScript, SQL, URLs, event handlers, or mutations. The envelope must be {"schemaVersion":"${SURFACE_AGENT_SCHEMA_VERSION}","action":"propose","summary":"...","spec":{...}}. The spec must use schemaVersion "surface/v1" and catalogVersion "${catalog.version}". Allowed widget types: ${widgetTypes}. Resource policy: ${resources}. Use only catalog widgets and policy-authorized resources and fields. If the request cannot be represented safely, explain the limitation without inventing fields or capabilities.`;
}
