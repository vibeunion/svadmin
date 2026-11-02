import { definedOptions } from '@svadmin/core/options';
import { requireValue } from "../../../scripts/test-assertions";
import { describe, test, expect } from 'bun:test';
import { createMCPServer } from './index';
import type { MCPRequest } from './index';

// ─── Mock DataProvider ───────────────────────────────────────

interface MockFilter { field: string; operator: string; value: unknown }
interface MockPagination { current?: number; pageSize?: number }

const mockData: Record<string, Record<string, unknown>[]> = {
  posts: [
    { id: '1', title: 'Hello World', status: 'published' },
    { id: '2', title: 'Draft Post', status: 'draft' },
    { id: '3', title: 'Another Post', status: 'published' },
  ],
  users: [
    { id: '1', name: 'Alice', email: 'alice@test.com' },
    { id: '2', name: 'Bob', email: 'bob@test.com' },
  ],
};

const mockDataProvider = {
  getList: async (params: { resource: string; pagination?: MockPagination; filters?: MockFilter[] }) => {
    let data = [...(mockData[params.resource] ?? [])];
    if (params.filters && Array.isArray(params.filters)) {
      for (const f of params.filters) {
        data = data.filter(item => item[f.field] === f.value);
      }
    }
    const page = params.pagination?.current ?? 1;
    const size = params.pagination?.pageSize ?? 10;
    const start = (page - 1) * size;
    return { data: data.slice(start, start + size), total: data.length };
  },
  getOne: async (params: { resource: string; id: string | number }) => {
    const item = (mockData[params.resource] ?? []).find(r => r['id'] === params.id);
    if (!item) throw new Error(`Not found: ${params.resource}/${params.id}`);
    return { data: item };
  },
  getMany: async (params: { resource: string; ids: (string | number)[] }) => {
    const items = (mockData[params.resource] ?? []).filter(r => params.ids.includes(r['id'] as string));
    return { data: items };
  },
  create: async (params: { resource: string; variables: unknown }) => {
    const newItem = { id: String(Date.now()), ...(params.variables as Record<string, unknown>) };
    return { data: newItem };
  },
  update: async (params: { resource: string; id: string | number; variables: unknown }) => {
    const existing = (mockData[params.resource] ?? []).find(r => r['id'] === params.id);
    const updated = { ...existing, ...(params.variables as Record<string, unknown>) };
    return { data: updated };
  },
  deleteOne: async (params: { resource: string; id: string | number }) => {
    const item = (mockData[params.resource] ?? []).find(r => r['id'] === params.id);
    return { data: item ?? { id: params.id } };
  },
  getApiUrl: () => 'http://localhost:3000/api',
};

// ─── Helper ──────────────────────────────────────────────────

function makeRequest(method: string, params?: Record<string, unknown>): MCPRequest {
  return definedOptions({ jsonrpc: '2.0', id: 1, method, params });
}

// ─── Tests ───────────────────────────────────────────────────

describe('createMCPServer', () => {
  const server = createMCPServer({
    dataProvider: mockDataProvider as Parameters<typeof createMCPServer>[0]['dataProvider'],
    resources: ['posts', 'users'],
  });

  test('generates correct number of tools (read + write + diagnostics + vibe tools)', () => {
    const tools = server.getTools();
    expect(tools).toHaveLength(12);
    expect(tools.map(t => t.name)).toEqual([
      'svadmin_getList', 'svadmin_getOne', 'svadmin_getMany',
      'svadmin_create', 'svadmin_update', 'svadmin_delete',
      'svadmin_getDiagnostics', 'svadmin_getSelfHealingPrompt', 'svadmin_getManifest',
      'svadmin_generateResource', 'svadmin_applyResourcePatch', 'svadmin_verifyGovernance',
    ]);
  });

  test('readOnly mode excludes write tools', () => {
    const readOnlyServer = createMCPServer({
      dataProvider: mockDataProvider as Parameters<typeof createMCPServer>[0]['dataProvider'],
      resources: ['posts'],
      readOnly: true,
    });
    const tools = readOnlyServer.getTools();
    expect(tools).toHaveLength(9);
    expect(tools.map(t => t.name)).toEqual([
      'svadmin_getList', 'svadmin_getOne', 'svadmin_getMany',
      'svadmin_getDiagnostics', 'svadmin_getSelfHealingPrompt', 'svadmin_getManifest',
      'svadmin_generateResource', 'svadmin_applyResourcePatch', 'svadmin_verifyGovernance',
    ]);
  });

  test('tool resource enum matches configured resources', () => {
    const tools = server.getTools();
    const getListTool = requireValue(tools.find(t => t.name === 'svadmin_getList'));
    expect(requireValue(getListTool.inputSchema.properties['resource']).enum).toEqual(['posts', 'users']);
  });

  test('getServerInfo returns correct metadata', () => {
    const info = server.getServerInfo();
    expect(info.name).toBe('@svadmin/mcp');
    expect(info.version).toBe('0.1.0');
    expect(info.tools).toHaveLength(12);
  });
});

describe('MCP JSON-RPC handling', () => {
  const server = createMCPServer({
    dataProvider: mockDataProvider as Parameters<typeof createMCPServer>[0]['dataProvider'],
    resources: ['posts', 'users'],
  });

  test('initialize handshake', async () => {
    const res = await server.handleRequest(makeRequest('initialize'));
    expect(res.error).toBeUndefined();
    const result = res.result as Record<string, unknown>;
    expect(result['protocolVersion']).toBe('2024-11-05');
    expect((result['serverInfo'] as Record<string, unknown>)['name']).toBe('@svadmin/mcp');
  });

  test('tools/list returns all tools', async () => {
    const res = await server.handleRequest(makeRequest('tools/list'));
    expect(res.error).toBeUndefined();
    const result = res.result as { tools: unknown[] };
    expect(result.tools).toHaveLength(12);
  });

  test('tools/call getList returns paginated data', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {
      name: 'svadmin_getList',
      arguments: { resource: 'posts', page: 1, pageSize: 2 },
    }));

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const parsed = JSON.parse(requireValue(result.content[0]).text);
    expect(parsed.data).toHaveLength(2);
    expect(parsed.total).toBe(3);
  });

  test('tools/call getList with filters', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {
      name: 'svadmin_getList',
      arguments: {
        resource: 'posts',
        filters: JSON.stringify([{ field: 'status', operator: 'eq', value: 'draft' }]),
      },
    }));

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const parsed = JSON.parse(requireValue(result.content[0]).text);
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].title).toBe('Draft Post');
  });

  test('tools/call getOne returns single record', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {
      name: 'svadmin_getOne',
      arguments: { resource: 'users', id: '1' },
    }));

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const parsed = JSON.parse(requireValue(result.content[0]).text);
    expect(parsed.data.name).toBe('Alice');
  });

  test('tools/call getMany returns multiple records', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {
      name: 'svadmin_getMany',
      arguments: { resource: 'users', ids: '1,2' },
    }));

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const parsed = JSON.parse(requireValue(result.content[0]).text);
    expect(parsed.data).toHaveLength(2);
  });

  test('tools/call create returns new record', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {
      name: 'svadmin_create',
      arguments: {
        resource: 'posts',
        data: JSON.stringify({ title: 'New Post', status: 'draft' }),
      },
    }));

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const parsed = JSON.parse(requireValue(result.content[0]).text);
    expect(parsed.data.title).toBe('New Post');
    expect(parsed.data.id).toBeDefined();
  });

  test('tools/call update returns modified record', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {
      name: 'svadmin_update',
      arguments: {
        resource: 'posts',
        id: '1',
        data: JSON.stringify({ title: 'Updated Title' }),
      },
    }));

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const parsed = JSON.parse(requireValue(result.content[0]).text);
    expect(parsed.data.title).toBe('Updated Title');
  });

  test('tools/call delete returns deleted record', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {
      name: 'svadmin_delete',
      arguments: { resource: 'posts', id: '2' },
    }));

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const parsed = JSON.parse(requireValue(result.content[0]).text);
    expect(parsed.data.id).toBe('2');
  });

  test('unknown tool returns error', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {
      name: 'svadmin_nope',
      arguments: {},
    }));

    expect(res.error).toBeDefined();
    expect(requireValue(res.error).code).toBe(-32602);
  });

  test('unknown method returns error', async () => {
    const res = await server.handleRequest(makeRequest('whatever'));
    expect(res.error).toBeDefined();
    expect(requireValue(res.error).code).toBe(-32601);
  });

  test('missing tool name returns error', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {}));
    expect(res.error).toBeDefined();
    expect(requireValue(res.error).code).toBe(-32602);
  });
});

describe('Tool safety and concurrency metadata', () => {
  const server = createMCPServer({
    dataProvider: mockDataProvider as Parameters<typeof createMCPServer>[0]['dataProvider'],
    resources: ['posts', 'users'],
  });

  test('read-only tools are marked concurrent and non-destructive', () => {
    const tools = server.getTools();
    const readTools = tools.filter(t => ['svadmin_getList', 'svadmin_getOne', 'svadmin_getMany'].includes(t.name));
    expect(readTools).toHaveLength(3);
    for (const tool of readTools) {
      expect(tool.readOnly).toBe(true);
      expect(tool.concurrent).toBe(true);
      expect(tool.destructive).toBe(false);
    }
  });

  test('mutation tools are marked non-concurrent, and delete is marked destructive', () => {
    const tools = server.getTools();
    const createTool =requireValue( tools.find(t => t.name === 'svadmin_create'));
    const updateTool =requireValue( tools.find(t => t.name === 'svadmin_update'));
    const deleteTool =requireValue( tools.find(t => t.name === 'svadmin_delete'));

    expect(createTool.readOnly).toBe(false);
    expect(createTool.concurrent).toBe(false);
    expect(createTool.destructive).toBe(false);

    expect(updateTool.readOnly).toBe(false);
    expect(updateTool.concurrent).toBe(false);
    expect(updateTool.destructive).toBe(false);

    expect(deleteTool.readOnly).toBe(false);
    expect(deleteTool.concurrent).toBe(false);
    expect(deleteTool.destructive).toBe(true);
  });

  test('svadmin_getDiagnostics returns status and resources', async () => {
    const res = await server.handleRequest(
      makeRequest('tools/call', {
        name: 'svadmin_getDiagnostics',
        arguments: {},
      }),
    );
    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const parsed = JSON.parse(requireValue(result.content[0]).text) as { status: string; resources: string[] };
    expect(parsed.status).toBe('healthy');
    expect(parsed.resources).toEqual(['posts', 'users']);
  });

  test('svadmin_getManifest returns resource definitions and capabilities', async () => {
    const res = await server.handleRequest(
      makeRequest('tools/call', {
        name: 'svadmin_getManifest',
        arguments: {},
      }),
    );
    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const parsed = JSON.parse(requireValue(result.content[0]).text) as { resources: Array<{ name: string }>; capabilities: { apiUrl: string } };
    expect(parsed.resources).toHaveLength(2);
    expect(parsed.capabilities.apiUrl).toBe('http://localhost:3000/api');
  });

  test('svadmin_getSelfHealingPrompt returns actionable report with collector', async () => {
    const serverWithDiagnostics = createMCPServer({
      dataProvider: mockDataProvider as Parameters<typeof createMCPServer>[0]['dataProvider'],
      resources: ['posts'],
      getDiagnostics: () => [
        {
          code: 'auth.forbidden',
          source: 'frontend',
          severity: 'error',
          message: 'HTTP 403 Forbidden',
          fix: {
            kind: 'PERMISSION_DENIED',
            safe: false,
            input: {
              resource: 'posts',
              operation: 'update',
              suggestedAction: 'Add permission for posts.update in AccessControlProvider',
            },
          },
        },
      ],
    });

    const res = await serverWithDiagnostics.handleRequest(
      makeRequest('tools/call', {
        name: 'svadmin_getSelfHealingPrompt',
        arguments: {},
      }),
    );
    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const report = JSON.parse(requireValue(result.content[0]).text) as { hasErrors: boolean; errorCount: number; agentPrompt: string };
    expect(report.hasErrors).toBe(true);
    expect(report.errorCount).toBe(1);
    expect(report.agentPrompt).toContain('posts');
    expect(report.agentPrompt).toContain('PERMISSION_DENIED');
  });

  test('svadmin_generateResource infers resource code from schema and columns', async () => {
    // 1. JSON Schema mode
    const schemaPayload = {
      type: 'object',
      required: ['title'],
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        category: { type: 'string', enum: ['tech', 'news'] },
      },
    };

    const res = await server.handleRequest(
      makeRequest('tools/call', {
        name: 'svadmin_generateResource',
        arguments: {
          resource: 'articles',
          sourceType: 'jsonSchema',
          payload: JSON.stringify(schemaPayload),
        },
      }),
    );

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const generated = JSON.parse(requireValue(result.content[0]).text) as {
      resource: { name: string; fields: unknown[] };
      code: string;
      componentCode: { list: string };
    };
    expect(generated.resource.name).toBe('articles');
    expect(generated.code).toContain("name: 'articles'");
    expect(generated.componentCode.list).toContain('<AutoTable');

    // 2. Database columns mode
    const columnsPayload = [
      { name: 'id', type: 'bigint', isPrimary: true },
      { name: 'order_number', type: 'varchar(64)', nullable: false },
      { name: 'total_amount', type: 'numeric(10,2)', nullable: false },
      { name: 'user_id', type: 'bigint', isForeignKey: true, referencesResource: 'users' },
    ];

    const resDb = await server.handleRequest(
      makeRequest('tools/call', {
        name: 'svadmin_generateResource',
        arguments: {
          resource: 'orders',
          sourceType: 'databaseColumns',
          payload: JSON.stringify(columnsPayload),
        },
      }),
    );

    expect(resDb.error).toBeUndefined();
    const resultDb = resDb.result as { content: { type: string; text: string }[] };
    const generatedDb = JSON.parse(requireValue(resultDb.content[0]).text) as {
      resource: { name: string; fields: Array<{ key: string; type: string }> };
    };
    expect(generatedDb.resource.name).toBe('orders');
    expect(generatedDb.resource.fields.find(f => f.key === 'user_id')?.type).toBe('relation');
  });

  test('svadmin_applyResourcePatch builds writeback patch and agent prompt', async () => {
    const res = await server.handleRequest(
      makeRequest('tools/call', {
        name: 'svadmin_applyResourcePatch',
        arguments: {
          resource: 'posts',
          action: 'toggleColumnVisibility',
          column: 'views',
          value: 'true',
        },
      }),
    );

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const patch = JSON.parse(requireValue(result.content[0]).text) as {
      success: boolean;
      summary: string;
      agentPrompt: string;
    };
    expect(patch.success).toBe(true);
    expect(patch.summary).toContain("Hide column 'views'");
    expect(patch.agentPrompt).toContain('[SVADMIN_WRITEBACK_PATCH]');
  });

  test('svadmin_verifyGovernance returns architectural invariants report', async () => {
    const res = await server.handleRequest(
      makeRequest('tools/call', {
        name: 'svadmin_verifyGovernance',
        arguments: { strict: true },
      }),
    );

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const gov = JSON.parse(requireValue(result.content[0]).text) as {
      governancePassed: boolean;
      principles: string[];
      status: string;
    };
    expect(gov.governancePassed).toBe(true);
    expect(gov.status).toBe('compliant');
    expect(gov.principles.length).toBeGreaterThanOrEqual(4);
  });
});
