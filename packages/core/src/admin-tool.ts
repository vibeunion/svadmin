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
  /** Declares whether the operation is read-only and safe to execute concurrently. */
  readOnly?: boolean;
  /** Declares whether the operation is destructive or high risk. */
  destructive?: boolean;
  /** Declares whether concurrent calls are supported. */
  concurrent?: boolean;
  /** Execute the tool with decoded arguments. */
  execute(args: StaticDecode<Schema>): Promise<ToolResult>;
}

/** Preserves the concrete TypeBox schema so execute receives precise static types. */
export function defineAdminTool<const Schema extends TObject>(
  tool: AdminTool<Schema>,
): AdminTool<Schema> {
  return { ...tool, parameters: strictAdminToolSchema(tool.parameters) };
}

/** Applies TypeBox validation and conversion before invoking the tool implementation. */
export function decodeAdminToolArgs<const Schema extends TObject>(
  tool: AdminTool<Schema>,
  input: unknown,
): StaticDecode<Schema> {
  return Value.Decode(strictAdminToolSchema(tool.parameters), input);
}

/** Decodes and executes a tool without allowing callers to bypass runtime input validation. */
export async function executeAdminTool<const Schema extends TObject>(
  tool: AdminTool<Schema>,
  input: unknown,
): Promise<ToolResult> {
  return tool.execute(decodeAdminToolArgs(tool, input));
}

/** Projects a tool into the public schema sent to LLM or MCP clients. */
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
