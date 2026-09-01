import type { StaticDecode, TObject } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

/** Result returned by a tool execution. */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * A tool that the Agent can invoke within the admin panel.
 *
 * @example
 * ```ts
 * const deletePostTool = defineAdminTool({
 *   name: 'deletePosts',
 *   description: 'Delete posts matching a filter',
 *   parameters: Type.Object({
 *     status: Type.Union([Type.Literal('draft'), Type.Literal('archived')]),
 *   }),
 *   needsApproval: true,
 *   execute: async ({ status }) => {
 *     const result = await dataProvider.getList({
 *       resource: 'posts',
 *       filters: [{ field: 'status', operator: 'eq', value: status }],
 *     });
 *     return { success: true, data: result };
 *   },
 * });
 * ```
 */
export interface AdminTool<Schema extends TObject = TObject> {
  /** Unique tool name (e.g. 'getList', 'deleteRecords', 'generateReport') */
  name: string;
  /** Human-readable description for LLM tool-use prompting */
  description: string;
  /** TypeBox schema used for static inference, runtime validation, and LLM projection. */
  parameters: Schema;
  /** Pause execution until the user explicitly approves the invocation. */
  needsApproval?: boolean;
  /** 显式声明是否为只读操作（只读操作可并发执行，无副作用）。 */
  readOnly?: boolean;
  /** 显式声明是否为破坏性或高风险操作。 */
  destructive?: boolean;
  /** 显式声明是否支持并发调用。 */
  concurrent?: boolean;
  /** Execute the tool with decoded arguments. */
  execute(args: StaticDecode<Schema>): Promise<ToolResult>;
}

/** 保留具体 TypeBox Schema，让 execute 参数获得精确的静态类型。 */
export function defineAdminTool<const Schema extends TObject>(
  tool: AdminTool<Schema>,
): AdminTool<Schema> {
  return { ...tool, parameters: strictAdminToolSchema(tool.parameters) };
}

/** 在进入工具实现前统一执行 TypeBox 校验与转换。 */
export function decodeAdminToolArgs<const Schema extends TObject>(
  tool: AdminTool<Schema>,
  input: unknown,
): StaticDecode<Schema> {
  return Value.Decode(strictAdminToolSchema(tool.parameters), input);
}

/** 解码并执行工具，避免调用方绕过运行时参数边界。 */
export async function executeAdminTool<const Schema extends TObject>(
  tool: AdminTool<Schema>,
  input: unknown,
): Promise<ToolResult> {
  return tool.execute(decodeAdminToolArgs(tool, input));
}

/** 将工具投影为发给 LLM 或 MCP 客户端的公开 Schema。 */
export function projectAdminToolSchema<Schema extends TObject>(tool: AdminTool<Schema>): {
  name: string;
  description: string;
  parameters: Schema;
  readOnly?: boolean;
  destructive?: boolean;
  concurrent?: boolean;
  needsApproval?: boolean;
} {
  return {
    name: tool.name,
    description: tool.description,
    parameters: strictAdminToolSchema(tool.parameters),
    ...(tool.readOnly !== undefined ? { readOnly: tool.readOnly } : {}),
    ...(tool.destructive !== undefined ? { destructive: tool.destructive } : {}),
    ...(tool.concurrent !== undefined ? { concurrent: tool.concurrent } : {}),
    ...(tool.needsApproval !== undefined ? { needsApproval: tool.needsApproval } : {}),
  };
}

function strictAdminToolSchema<Schema extends TObject>(schema: Schema): Schema {
  if (schema.additionalProperties === false) return schema;
  return { ...schema, additionalProperties: false };
}
