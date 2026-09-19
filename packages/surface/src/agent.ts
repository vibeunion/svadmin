import { Type, type Static } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import {
  SURFACE_AGENT_LIMITS,
  SURFACE_AGENT_RESPONSE_SCHEMA_VERSION,
  SURFACE_AGENT_SCHEMA_VERSION,
  createSurfaceAgentResponseSchema,
  createSurfaceCatalogManifest,
  createSurfaceGenerationSpecSchema,
  surfaceCannotFulfillSchema,
  surfaceSchemaToJson,
} from './agent-contract.js';
import { validateSurfaceSpec } from './validation.js';
import { parseSurfaceJson, surfaceWireError } from './wire.js';
import type {
  SurfaceCatalog, SurfacePolicy, SurfaceSpec, SurfaceValidationIssue,
} from './types.js';

export { SURFACE_AGENT_SCHEMA_VERSION } from './agent-contract.js';

const proposalFields = {
  schemaVersion: Type.Literal(SURFACE_AGENT_SCHEMA_VERSION),
  action: Type.Literal('propose'),
  summary: Type.Optional(Type.String({ minLength: 1, maxLength: 240 })),
  spec: Type.Unknown(),
};
const proposalSchema = Type.Object(proposalFields, { additionalProperties: false });
const responseProposalSchema = Type.Object({
  ...proposalFields,
  schemaVersion: Type.Literal(SURFACE_AGENT_RESPONSE_SCHEMA_VERSION),
}, { additionalProperties: false });
const compiledProposalSchema = TypeCompiler.Compile(proposalSchema);
const compiledResponseSchema = TypeCompiler.Compile(Type.Union([
  proposalSchema, responseProposalSchema, surfaceCannotFulfillSchema,
]));

export interface SurfaceAgentProposal {
  readonly schemaVersion: typeof SURFACE_AGENT_SCHEMA_VERSION;
  readonly action: 'propose';
  readonly summary?: string;
  readonly spec: SurfaceSpec;
}
export interface SurfaceAgentProposalV2 extends Omit<SurfaceAgentProposal, 'schemaVersion'> {
  readonly schemaVersion: typeof SURFACE_AGENT_RESPONSE_SCHEMA_VERSION;
}
export type SurfaceAgentCannotFulfill = Static<typeof surfaceCannotFulfillSchema>;
export type SurfaceAgentResponse = SurfaceAgentProposal | SurfaceAgentProposalV2 | SurfaceAgentCannotFulfill;
export type SurfaceAgentValidationResult =
  | { readonly ok: true; readonly value: SurfaceAgentProposal }
  | { readonly ok: false; readonly issues: readonly SurfaceValidationIssue[] };
export type SurfaceAgentResponseResult =
  | { readonly ok: true; readonly value: SurfaceAgentResponse }
  | { readonly ok: false; readonly issues: readonly SurfaceValidationIssue[] };
export interface SurfaceAgentMessage {
  readonly role: 'system' | 'user';
  readonly content: string;
}

function schemaIssues(errors: Iterable<{ path: string; message: string }>): readonly SurfaceValidationIssue[] {
  return [...errors].map((issue) => ({ code: 'invalid_json', path: issue.path || '', message: issue.message }));
}

/** 保留 v1 的函数签名、返回类型以及带说明文字的 fenced JSON 兼容行为。 */
export function parseSurfaceAgentProposal(input: unknown, catalog: SurfaceCatalog, policy: SurfacePolicy): SurfaceAgentValidationResult {
  const parsed = parseSurfaceJson(input, true);
  if (!parsed.ok) return parsed;
  if (!compiledProposalSchema.Check(parsed.value)) {
    return { ok: false, issues: schemaIssues(compiledProposalSchema.Errors(parsed.value)) };
  }
  const surface = validateSurfaceSpec(parsed.value.spec, catalog, policy);
  if (!surface.ok) return surface;
  return { ok: true, value: { ...parsed.value, spec: surface.value } };
}

/** 结构化“无法完成”也是有效响应，但永远不是可渲染/可执行的提案。 */
export function parseSurfaceAgentResponse(input: unknown, catalog: SurfaceCatalog, policy: SurfacePolicy): SurfaceAgentResponseResult {
  const parsed = parseSurfaceJson(input);
  if (!parsed.ok) return parsed;
  if (!compiledResponseSchema.Check(parsed.value)) {
    return { ok: false, issues: schemaIssues(compiledResponseSchema.Errors(parsed.value)) };
  }
  const candidate = parsed.value;
  if (candidate.action === 'cannot-fulfill') return { ok: true, value: candidate };
  const surface = validateSurfaceSpec(candidate.spec, catalog, policy);
  if (!surface.ok) return surface;
  return { ok: true, value: { ...candidate, spec: surface.value } };
}

const safetyInstructions = 'Never generate or execute Svelte, HTML, CSS, JavaScript, SQL, URLs, event handlers, or mutations. Use only catalog widgets and policy-authorized resources and fields. Widget IDs and source IDs must be unique across the document. Bind item widgets to /items, and scalar widgets to /total or an explicitly readable getOne field. JSON Schema does not replace runtime policy validation or server authorization.';

function validateRequest(request: string): void {
  if (typeof request !== 'string' || request.trim().length === 0 || request.length > SURFACE_AGENT_LIMITS.maxRequestCharacters) {
    throw new Error('Surface request must be non-empty and within the request character limit');
  }
}

function contractContext(catalog: SurfaceCatalog, policy: SurfacePolicy): string {
  const manifest = createSurfaceCatalogManifest(catalog);
  const resources = Object.entries(policy.resources).map(([resource, rule]) => (
    `${resource}(read=${rule.readFields.join(',') || '(none)'};filter=${rule.filterFields?.join(',') || '(none)'};sort=${rule.sortFields?.join(',') || '(none)'};getOne=${rule.allowGetOne === true};maxPageSize=${rule.maxPageSize ?? 'default'})`
  )).join(' | ') || '(none)';
  return `Catalog: ${JSON.stringify(manifest)}\nResource policy: ${resources}\nPolicy JSON: ${JSON.stringify(policy)}`;
}

function boundedPrompt(prompt: string): string {
  if (prompt.length > SURFACE_AGENT_LIMITS.maxContractCharacters) throw new Error('Surface prompt exceeds the contract character limit; select a smaller catalog');
  return prompt;
}

/** 兼容旧 v1 输出，同时补齐从组件契约派生的完整参数/结构 schema。 */
export function buildSurfaceAgentPrompt(request: string, catalog: SurfaceCatalog, policy: SurfacePolicy): string {
  validateRequest(request);
  const schema = surfaceSchemaToJson(Type.Object({
    ...proposalFields,
    spec: createSurfaceGenerationSpecSchema(catalog, policy),
  }, { additionalProperties: false }));
  return boundedPrompt(`${request}\n\n[svadmin surface agent protocol]\nReturn only a human-reviewable fenced JSON proposal. ${safetyInstructions}\n${contractContext(catalog, policy)}\nOutput JSON Schema: ${JSON.stringify(schema)}\nIf the request cannot be represented safely, explain the limitation without inventing fields or capabilities. For machine-readable cannot-fulfill responses use the surface-agent/v2 message API.`);
}

/** 系统契约与用户需求分开传递；不绑定某个模型厂商或 CSS 编译器。 */
export function buildSurfaceAgentMessages(request: string, catalog: SurfaceCatalog, policy: SurfacePolicy): readonly SurfaceAgentMessage[] {
  validateRequest(request);
  const content = boundedPrompt(`[svadmin surface agent protocol]\nReturn exactly one JSON object matching the output schema, without markdown or prose. ${safetyInstructions}\n${contractContext(catalog, policy)}\nOutput JSON Schema: ${JSON.stringify(createSurfaceAgentResponseSchema(catalog, policy))}\nIf the request cannot be represented, return action "cannot-fulfill" with a reason and a short message. Never invent capabilities or return an incomplete spec.`);
  return [{ role: 'system', content }, { role: 'user', content: request }];
}

export interface SurfaceAgentStream {
  /** 接收文本，不解析、不渲染、不查询数据。 */
  push(chunk: string): { readonly ok: true; readonly characters: number } | Extract<SurfaceAgentResponseResult, { ok: false }>;
  /** 仅结束后返回整体校验结果。重复调用返回同一终态。 */
  finish(): SurfaceAgentResponseResult;
}

/** 有界传输缓冲，不冒充 OpenUI 增量渲染；半成品不进入运行时。 */
export function createSurfaceAgentStream(catalog: SurfaceCatalog, policy: SurfacePolicy): SurfaceAgentStream {
  let chunks: string[] = [];
  let characters = 0;
  let result: SurfaceAgentResponseResult | undefined;
  return {
    push(chunk) {
      if (result !== undefined) return surfaceWireError('Surface stream is already closed');
      if (typeof chunk !== 'string') {
        result = surfaceWireError('Surface stream chunks must be text');
      } else if (characters + chunk.length > SURFACE_AGENT_LIMITS.maxInputCharacters) {
        result = surfaceWireError('Surface stream is too large', 'limit_exceeded');
      } else {
        characters += chunk.length;
        if (chunk.length > 0) chunks.push(chunk);
        return { ok: true, characters };
      }
      chunks = [];
      return result;
    },
    finish() {
      if (result === undefined) {
        result = parseSurfaceAgentResponse(chunks.join(''), catalog, policy);
        chunks = [];
      }
      return result;
    },
  };
}
