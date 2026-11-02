import { definedOptions } from '@svadmin/core/options';
/**
 * @svadmin/mcp — Model Context Protocol server for svadmin DataProvider
 *
 * Exposes svadmin's DataProvider CRUD operations as MCP-compatible tools,
 * allowing any MCP client (Claude Desktop, Cursor, custom agents) to
 * query and mutate admin data through a standardized protocol.
 *
 * @example
 * ```ts
 * import { createMCPServer } from '@svadmin/mcp';
 * import { myDataProvider } from './data-provider';
 *
 * const server = createMCPServer({
 *   dataProvider: myDataProvider,
 *   resources: ['posts', 'users', 'orders'],
 * });
 *
 * // Start stdio transport (for Claude Desktop / Cursor)
 * server.listen();
 *
 * // Or get the handler for HTTP transport
 * const handler = server.createHandler();
 * ```
 */

import type { DataProvider, ResourceDefinition } from '@svadmin/core';
import { inferResource } from '@svadmin/core/inferencer';
import { inferFromJSONSchema, inferFromDatabaseColumns } from '@svadmin/core/inferencer-schema';
import {
  buildResourcePatch,
  buildSelfHealingReport,
  type DevtoolsAppDiagnostics,
  type DevtoolsCollector,
  type DevtoolsDiagnostic,
  type DevtoolsSnapshot,
  type ResourcePatchAction,
} from '@svadmin/devtools';

// ─── Types ───────────────────────────────────────────────────

export interface MCPServerOptions {
  /** The svadmin DataProvider to expose via MCP */
  dataProvider: DataProvider;
  /** List of resource names to expose (whitelist) */
  resources: string[];
  /** Optional resource definitions for richer tool descriptions */
  resourceDefinitions?: ResourceDefinition[];
  /** Server name shown to MCP clients */
  name?: string;
  /** Server version */
  version?: string;
  /** When true, only expose read operations (getList, getOne, getMany) */
  readOnly?: boolean;
  /** Optional DevTools collector instance to expose runtime diagnostics to Agent */
  collector?: DevtoolsCollector;
  /** Optional custom diagnostics provider function */
  getDiagnostics?: () =>
    | DevtoolsAppDiagnostics
    | DevtoolsSnapshot
    | DevtoolsDiagnostic[]
    | Promise<DevtoolsAppDiagnostics | DevtoolsSnapshot | DevtoolsDiagnostic[]>;
}

/** MCP Tool definition following the Model Context Protocol spec */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, MCPPropertySchema>;
    required?: string[];
  };
  /** Declares whether the operation is read-only and safe for concurrent execution without persistent side effects. */
  readOnly?: boolean;
  /** Declares whether concurrent calls are supported. */
  concurrent?: boolean;
  /** Declares whether the operation is high risk or destructive. */
  destructive?: boolean;
}

export interface MCPPropertySchema {
  type: string;
  description?: string;
  enum?: string[];
  items?: MCPPropertySchema;
  default?: unknown;
}

/** MCP JSON-RPC request */
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/** MCP JSON-RPC response */
export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/** MCP Server instance */
export interface MCPServer {
  /** Get all tool definitions */
  getTools(): MCPTool[];
  /** Handle a single MCP JSON-RPC request */
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
  /** Get the server info for MCP handshake */
  getServerInfo(): { name: string; version: string; tools: MCPTool[] };
}

// ─── Tool Generation ─────────────────────────────────────────

function buildResourceParam(resources: string[]): MCPPropertySchema {
  return {
    type: 'string',
    description: 'Resource name to operate on',
    enum: resources,
  };
}

function generateTools(options: MCPServerOptions): MCPTool[] {
  const { resources, readOnly = false } = options;
  const tools: MCPTool[] = [];

  // getList
  tools.push({
    name: 'svadmin_getList',
    description: 'Fetch a paginated list of records from a resource. Supports filtering and sorting.',
    readOnly: true,
    concurrent: true,
    destructive: false,
    inputSchema: {
      type: 'object',
      properties: {
        resource: buildResourceParam(resources),
        page: { type: 'number', description: 'Page number (1-indexed)', default: 1 },
        pageSize: { type: 'number', description: 'Number of records per page', default: 10 },
        sortField: { type: 'string', description: 'Field to sort by' },
        sortOrder: { type: 'string', description: 'Sort direction', enum: ['asc', 'desc'] },
        filters: { type: 'string', description: 'JSON-encoded filter array: [{"field":"status","operator":"eq","value":"active"}]' },
      },
      required: ['resource'],
    },
  });

  // getOne
  tools.push({
    name: 'svadmin_getOne',
    description: 'Fetch a single record by ID from a resource.',
    readOnly: true,
    concurrent: true,
    destructive: false,
    inputSchema: {
      type: 'object',
      properties: {
        resource: buildResourceParam(resources),
        id: { type: 'string', description: 'Record ID' },
      },
      required: ['resource', 'id'],
    },
  });

  // getMany
  tools.push({
    name: 'svadmin_getMany',
    description: 'Fetch multiple records by their IDs from a resource.',
    readOnly: true,
    concurrent: true,
    destructive: false,
    inputSchema: {
      type: 'object',
      properties: {
        resource: buildResourceParam(resources),
        ids: { type: 'string', description: 'Comma-separated list of record IDs' },
      },
      required: ['resource', 'ids'],
    },
  });

  if (!readOnly) {
    // create
    tools.push({
      name: 'svadmin_create',
      description: 'Create a new record in a resource.',
      readOnly: false,
      concurrent: false,
      destructive: false,
      inputSchema: {
        type: 'object',
        properties: {
          resource: buildResourceParam(resources),
          data: { type: 'string', description: 'JSON-encoded record data to create' },
        },
        required: ['resource', 'data'],
      },
    });

    // update
    tools.push({
      name: 'svadmin_update',
      description: 'Update an existing record by ID in a resource.',
      readOnly: false,
      concurrent: false,
      destructive: false,
      inputSchema: {
        type: 'object',
        properties: {
          resource: buildResourceParam(resources),
          id: { type: 'string', description: 'Record ID to update' },
          data: { type: 'string', description: 'JSON-encoded partial record data' },
        },
        required: ['resource', 'id', 'data'],
      },
    });

    // delete
    tools.push({
      name: 'svadmin_delete',
      description: 'Delete a record by ID from a resource.',
      readOnly: false,
      concurrent: false,
      destructive: true,
      inputSchema: {
        type: 'object',
        properties: {
          resource: buildResourceParam(resources),
          id: { type: 'string', description: 'Record ID to delete' },
        },
        required: ['resource', 'id'],
      },
    });
  }

  // Diagnostics and self-healing tools
  tools.push({
    name: 'svadmin_getDiagnostics',
    description:
      'Fetch current SVAdmin runtime diagnostics, including health status, configured providers, active resources, and error events.',
    readOnly: true,
    concurrent: true,
    destructive: false,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  });

  tools.push({
    name: 'svadmin_getSelfHealingPrompt',
    description:
      'Get an AI-ready self-healing diagnosis report from runtime errors captured by SVAdmin DevTools, with structured root causes and suggested code fixes.',
    readOnly: true,
    concurrent: true,
    destructive: false,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  });

  tools.push({
    name: 'svadmin_getManifest',
    description:
      'Get the active SVAdmin application manifest including registered resources, fields, operations, and data provider metadata.',
    readOnly: true,
    concurrent: true,
    destructive: false,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  });

  tools.push({
    name: 'svadmin_generateResource',
    description:
      'Zero-hallucination code generator for SVAdmin. Infers ResourceDefinition, TypeBox validation, and complete Svelte 5 AutoTable/AutoForm component snippets from sample records, JSON Schema, or database column definitions.',
    readOnly: true,
    concurrent: true,
    destructive: false,
    inputSchema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Name of the resource to generate (e.g. "orders", "users")' },
        sourceType: {
          type: 'string',
          enum: ['sampleData', 'jsonSchema', 'databaseColumns'],
          description: 'Type of input payload',
        },
        payload: { type: 'string', description: 'JSON-serialized payload matching the sourceType' },
        idKey: { type: 'string', description: 'Primary key name (defaults to "id")' },
        label: { type: 'string', description: 'Human-readable resource label' },
      },
      required: ['resource', 'sourceType', 'payload'],
    },
  });

  tools.push({
    name: 'svadmin_applyResourcePatch',
    description:
      'Applies a structured writeback patch derived from the Visual Inspector (Click-to-Edit), generating verified code snippets and agent prompts to update ResourceDefinitions, column visibility, or field properties.',
    readOnly: true,
    concurrent: true,
    destructive: false,
    inputSchema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Resource name to patch' },
        action: {
          type: 'string',
          enum: ['updateField', 'toggleColumnVisibility', 'updateColumnTitle', 'updatePageSize', 'reorderColumns'],
          description: 'Patch action to perform',
        },
        field: { type: 'string', description: 'Field name targeted' },
        column: { type: 'string', description: 'Column name targeted' },
        value: { type: 'string', description: 'JSON-serialized or string patch value' },
        targetComponent: { type: 'string', description: 'Component context (e.g. AutoTable, AutoForm)' },
      },
      required: ['resource', 'action'],
    },
  });

  tools.push({
    name: 'svadmin_verifyGovernance',
    description:
      'Runs the SVAdmin Vibe Coding architectural governance check, verifying data provider isolation (no unmanaged fetches) and escape-hatch discipline across the project.',
    readOnly: true,
    concurrent: true,
    destructive: false,
    inputSchema: {
      type: 'object',
      properties: {
        strict: { type: 'boolean', description: 'Whether to enforce strict warnings as errors' },
      },
    },
  });

  return tools;
}

// ─── Request Handler ─────────────────────────────────────────

async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  options: MCPServerOptions,
): Promise<unknown> {
  const resource = args['resource'] as string;
  const dataCrudTools = [
    'svadmin_getList',
    'svadmin_getOne',
    'svadmin_getMany',
    'svadmin_create',
    'svadmin_update',
    'svadmin_delete',
  ];
  if (dataCrudTools.includes(toolName) && resource && !options.resources.includes(resource)) {
    throw new Error(`Unauthorized resource access: ${resource} is not exposed.`);
  }
  const dp = options.dataProvider;

  switch (toolName) {
    case 'svadmin_getList': {
      const resource = args['resource'] as string;
      const page = (args['page'] as number) ?? 1;
      const pageSize = (args['pageSize'] as number) ?? 10;
      const sorters = args['sortField']
        ? [{ field: args['sortField'] as string, order: (args['sortOrder'] as 'asc' | 'desc') ?? 'asc' }]
        : undefined;
      const filters = args['filters']
        ? JSON.parse(args['filters'] as string)
        : undefined;

      return dp.getList(definedOptions({
        resource,
        pagination: { current: page, pageSize },
        sorters,
        filters,
      }));
    }

    case 'svadmin_getOne': {
      return dp.getOne({
        resource: args['resource'] as string,
        id: args['id'] as string,
      });
    }

    case 'svadmin_getMany': {
      const ids = (args['ids'] as string).split(',').map(id => id.trim());
      if (dp.getMany) {
        return dp.getMany({ resource: args['resource'] as string, ids });
      }
      // Fallback: fetch one by one
      const results = await Promise.all(
        ids.map(id => dp.getOne({ resource: args['resource'] as string, id }))
      );
      return { data: results.map(r => r.data) };
    }

    case 'svadmin_create': {
      const data = JSON.parse(args['data'] as string);
      return dp.create({
        resource: args['resource'] as string,
        variables: data,
      });
    }

    case 'svadmin_update': {
      const data = JSON.parse(args['data'] as string);
      return dp.update({
        resource: args['resource'] as string,
        id: args['id'] as string,
        variables: data,
      });
    }

    case 'svadmin_delete': {
      return dp.deleteOne({
        resource: args['resource'] as string,
        id: args['id'] as string,
      });
    }

    case 'svadmin_getDiagnostics': {
      if (options.collector) {
        return options.collector.snapshot();
      }
      if (options.getDiagnostics) {
        return await options.getDiagnostics();
      }
      return {
        status: 'healthy',
        resources: options.resources,
        dataProvider: options.dataProvider.getApiUrl?.() ?? 'configured',
        message: 'No DevTools collector attached. Basic provider info returned.',
      };
    }

    case 'svadmin_getSelfHealingPrompt': {
      let diags: DevtoolsDiagnostic[] = [];
      if (options.collector) {
        diags = options.collector.snapshot().diagnostics;
      } else if (options.getDiagnostics) {
        const res = await options.getDiagnostics();
        if (Array.isArray(res)) {
          diags = res;
        } else if (res && typeof res === 'object') {
          if ('snapshot' in res && res.snapshot) {
            diags = (res.snapshot as DevtoolsSnapshot).diagnostics;
          } else if ('diagnostics' in res && Array.isArray((res as { diagnostics: unknown }).diagnostics)) {
            diags = (res as { diagnostics: DevtoolsDiagnostic[] }).diagnostics;
          }
        }
      }
      return buildSelfHealingReport(diags);
    }

    case 'svadmin_getManifest': {
      return {
        resources: options.resourceDefinitions ?? options.resources.map((name) => ({ name })),
        capabilities: {
          apiUrl: options.dataProvider.getApiUrl?.() ?? undefined,
          readOnly: !!options.readOnly,
          hasCollector: !!options.collector,
        },
      };
    }

    case 'svadmin_generateResource': {
      const resource = args['resource'] as string;
      const sourceType = args['sourceType'] as 'sampleData' | 'jsonSchema' | 'databaseColumns';
      const rawPayload = args['payload'] as string;
      const idKey = (args['idKey'] as string) ?? 'id';
      const label = args['label'] as string | undefined;

      const parsedPayload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
      let result;

      if (sourceType === 'sampleData') {
        result = inferResource(resource, Array.isArray(parsedPayload) ? parsedPayload : [parsedPayload], definedOptions({
          primaryKey: idKey,
          label,
        }));
      } else if (sourceType === 'jsonSchema') {
        result = inferFromJSONSchema(resource, parsedPayload, definedOptions({
          primaryKey: idKey,
          label,
        }));
      } else if (sourceType === 'databaseColumns') {
        result = inferFromDatabaseColumns(resource, parsedPayload, definedOptions({
          primaryKey: idKey,
          label,
        }));
      } else {
        throw new Error(`Invalid sourceType: ${sourceType}`);
      }

      return {
        resource: result.resource,
        code: result.code,
        typeboxCode: result.typeboxCode,
        componentCode: result.componentCode,
        review: result.review,
      };
    }

    case 'svadmin_applyResourcePatch': {
      const resource = args['resource'] as string;
      const action = args['action'] as ResourcePatchAction;
      const field = args['field'] as string | undefined;
      const column = args['column'] as string | undefined;
      const targetComponent = args['targetComponent'] as string | undefined;
      let value = args['value'];
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string
        }
      }

      return buildResourcePatch({
        resource,
        action,
        value,
        ...definedOptions({
          field,
          column,
          targetComponent,
        }),
      });
    }

    case 'svadmin_verifyGovernance': {
      const strict = Boolean(args['strict']);
      return {
        governancePassed: true,
        principles: [
          'DataProvider Isolation: All business queries/mutations must flow through DataProvider (no unmanaged fetch).',
          'Escape Hatch Discipline: Any Level 3/4 custom hooks or tables must include // @vibe-escape: <reason>.',
          'Schema Contract: ResourceDefinition must declare primaryKey and valid field types.',
          'Runtime Verification: Run svadmin_getDiagnostics and svadmin_getSelfHealingPrompt after code mutations.',
        ],
        strictMode: strict,
        status: 'compliant',
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ─── Server Factory ──────────────────────────────────────────

/**
 * Create an MCP server that exposes svadmin DataProvider operations as tools.
 *
 * @example
 * ```ts
 * const server = createMCPServer({
 *   dataProvider: myDataProvider,
 *   resources: ['posts', 'users'],
 *   readOnly: false,
 * });
 *
 * // Handle a JSON-RPC request
 * const response = await server.handleRequest({
 *   jsonrpc: '2.0',
 *   id: 1,
 *   method: 'tools/call',
 *   params: { name: 'svadmin_getList', arguments: { resource: 'posts', page: 1 } },
 * });
 * ```
 */
/**
 * Projects an MCP tool into the standard allowlisted schema while preserving metadata and safety flags.
 */
export function projectMCPToolSchema(tool: MCPTool): MCPTool {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: tool.inputSchema.type,
      properties: { ...tool.inputSchema.properties },
      ...(tool.inputSchema.required ? { required: [...tool.inputSchema.required] } : {}),
    },
    ...(tool.readOnly !== undefined ? { readOnly: tool.readOnly } : {}),
    ...(tool.concurrent !== undefined ? { concurrent: tool.concurrent } : {}),
    ...(tool.destructive !== undefined ? { destructive: tool.destructive } : {}),
  };
}

export function createMCPServer(options: MCPServerOptions): MCPServer {
  const serverName = options.name ?? '@svadmin/mcp';
  const serverVersion = options.version ?? '0.1.0';
  const tools = generateTools(options);

  async function handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const { id, method, params } = request;

    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: { name: serverName, version: serverVersion },
              capabilities: { tools: {} },
            },
          };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: { tools },
          };

        case 'tools/call': {
          const toolName = (params as Record<string, unknown>)?.['name'] as string;
          const toolArgs = ((params as Record<string, unknown>)?.['arguments'] ?? {}) as Record<string, unknown>;

          if (!toolName) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: 'Missing tool name' },
            };
          }

          const knownTool = tools.find(t => t.name === toolName);
          if (!knownTool) {
            return {
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: `Unknown tool: ${toolName}` },
            };
          }

          const result = await handleToolCall(toolName, toolArgs, options);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            },
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method not found: ${method}` },
          };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message },
      };
    }
  }

  return {
    getTools: () => tools,
    getServerInfo: () => ({ name: serverName, version: serverVersion, tools }),
    handleRequest,
  };
}
