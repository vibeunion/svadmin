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
  /** 显式声明是否为只读操作（只读操作可并发执行，无持久化副作用） */
  readOnly?: boolean;
  /** 显式声明是否支持并发调用 */
  concurrent?: boolean;
  /** 显式声明是否具有高风险/破坏性 */
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

  return tools;
}

// ─── Request Handler ─────────────────────────────────────────

async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  options: MCPServerOptions,
): Promise<unknown> {
  const resource = args.resource as string;
  if (resource && !options.resources.includes(resource)) {
    throw new Error(`Unauthorized resource access: ${resource} is not exposed.`);
  }
  const dp = options.dataProvider;

  switch (toolName) {
    case 'svadmin_getList': {
      const resource = args.resource as string;
      const page = (args.page as number) ?? 1;
      const pageSize = (args.pageSize as number) ?? 10;
      const sorters = args.sortField
        ? [{ field: args.sortField as string, order: (args.sortOrder as 'asc' | 'desc') ?? 'asc' }]
        : undefined;
      const filters = args.filters
        ? JSON.parse(args.filters as string)
        : undefined;

      return dp.getList({
        resource,
        pagination: { current: page, pageSize },
        sorters,
        filters,
      });
    }

    case 'svadmin_getOne': {
      return dp.getOne({
        resource: args.resource as string,
        id: args.id as string,
      });
    }

    case 'svadmin_getMany': {
      const ids = (args.ids as string).split(',').map(id => id.trim());
      if (dp.getMany) {
        return dp.getMany({ resource: args.resource as string, ids });
      }
      // Fallback: fetch one by one
      const results = await Promise.all(
        ids.map(id => dp.getOne({ resource: args.resource as string, id }))
      );
      return { data: results.map(r => r.data) };
    }

    case 'svadmin_create': {
      const data = JSON.parse(args.data as string);
      return dp.create({
        resource: args.resource as string,
        variables: data,
      });
    }

    case 'svadmin_update': {
      const data = JSON.parse(args.data as string);
      return dp.update({
        resource: args.resource as string,
        id: args.id as string,
        variables: data,
      });
    }

    case 'svadmin_delete': {
      return dp.deleteOne({
        resource: args.resource as string,
        id: args.id as string,
      });
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
 * 投影 MCP 工具为标准白名单 Schema，确保元数据与安全标记正确保留。
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
          const toolName = (params as Record<string, unknown>)?.name as string;
          const toolArgs = ((params as Record<string, unknown>)?.arguments ?? {}) as Record<string, unknown>;

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
