/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
    const item = (mockData[params.resource] ?? []).find(r => r.id === params.id);
    if (!item) throw new Error(`Not found: ${params.resource}/${params.id}`);
    return { data: item };
  },
  getMany: async (params: { resource: string; ids: (string | number)[] }) => {
    const items = (mockData[params.resource] ?? []).filter(r => params.ids.includes(r.id as string));
    return { data: items };
  },
  create: async (params: { resource: string; variables: unknown }) => {
    const newItem = { id: String(Date.now()), ...(params.variables as Record<string, unknown>) };
    return { data: newItem };
  },
  update: async (params: { resource: string; id: string | number; variables: unknown }) => {
    const existing = (mockData[params.resource] ?? []).find(r => r.id === params.id);
    const updated = { ...existing, ...(params.variables as Record<string, unknown>) };
    return { data: updated };
  },
  deleteOne: async (params: { resource: string; id: string | number }) => {
    const item = (mockData[params.resource] ?? []).find(r => r.id === params.id);
    return { data: item ?? { id: params.id } };
  },
  getApiUrl: () => 'http://localhost:3000/api',
};

// ─── Helper ──────────────────────────────────────────────────

function makeRequest(method: string, params?: Record<string, unknown>): MCPRequest {
  return { jsonrpc: '2.0', id: 1, method, params };
}

// ─── Tests ───────────────────────────────────────────────────

describe('createMCPServer', () => {
  const server = createMCPServer({
    dataProvider: mockDataProvider as Parameters<typeof createMCPServer>[0]['dataProvider'],
    resources: ['posts', 'users'],
  });

  test('generates correct number of tools (read + write)', () => {
    const tools = server.getTools();
    // getList, getOne, getMany, create, update, delete = 6
    expect(tools).toHaveLength(6);
    expect(tools.map(t => t.name)).toEqual([
      'svadmin_getList', 'svadmin_getOne', 'svadmin_getMany',
      'svadmin_create', 'svadmin_update', 'svadmin_delete',
    ]);
  });

  test('readOnly mode excludes write tools', () => {
    const readOnlyServer = createMCPServer({
      dataProvider: mockDataProvider as Parameters<typeof createMCPServer>[0]['dataProvider'],
      resources: ['posts'],
      readOnly: true,
    });
    const tools = readOnlyServer.getTools();
    expect(tools).toHaveLength(3);
    expect(tools.map(t => t.name)).toEqual([
      'svadmin_getList', 'svadmin_getOne', 'svadmin_getMany',
    ]);
  });

  test('tool resource enum matches configured resources', () => {
    const tools = server.getTools();
    const getListTool = tools.find(t => t.name === 'svadmin_getList')!;
    expect(getListTool.inputSchema.properties.resource.enum).toEqual(['posts', 'users']);
  });

  test('getServerInfo returns correct metadata', () => {
    const info = server.getServerInfo();
    expect(info.name).toBe('@svadmin/mcp');
    expect(info.version).toBe('0.1.0');
    expect(info.tools).toHaveLength(6);
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
    expect(result.protocolVersion).toBe('2024-11-05');
    expect((result.serverInfo as Record<string, unknown>).name).toBe('@svadmin/mcp');
  });

  test('tools/list returns all tools', async () => {
    const res = await server.handleRequest(makeRequest('tools/list'));
    expect(res.error).toBeUndefined();
    const result = res.result as { tools: unknown[] };
    expect(result.tools).toHaveLength(6);
  });

  test('tools/call getList returns paginated data', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {
      name: 'svadmin_getList',
      arguments: { resource: 'posts', page: 1, pageSize: 2 },
    }));

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const parsed = JSON.parse(result.content[0].text);
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
    const parsed = JSON.parse(result.content[0].text);
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
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.data.name).toBe('Alice');
  });

  test('tools/call getMany returns multiple records', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {
      name: 'svadmin_getMany',
      arguments: { resource: 'users', ids: '1,2' },
    }));

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const parsed = JSON.parse(result.content[0].text);
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
    const parsed = JSON.parse(result.content[0].text);
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
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.data.title).toBe('Updated Title');
  });

  test('tools/call delete returns deleted record', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {
      name: 'svadmin_delete',
      arguments: { resource: 'posts', id: '2' },
    }));

    expect(res.error).toBeUndefined();
    const result = res.result as { content: { type: string; text: string }[] };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.data.id).toBe('2');
  });

  test('unknown tool returns error', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {
      name: 'svadmin_nope',
      arguments: {},
    }));

    expect(res.error).toBeDefined();
    expect(res.error!.code).toBe(-32602);
  });

  test('unknown method returns error', async () => {
    const res = await server.handleRequest(makeRequest('whatever'));
    expect(res.error).toBeDefined();
    expect(res.error!.code).toBe(-32601);
  });

  test('missing tool name returns error', async () => {
    const res = await server.handleRequest(makeRequest('tools/call', {}));
    expect(res.error).toBeDefined();
    expect(res.error!.code).toBe(-32602);
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
    const createTool = tools.find(t => t.name === 'svadmin_create')!;
    const updateTool = tools.find(t => t.name === 'svadmin_update')!;
    const deleteTool = tools.find(t => t.name === 'svadmin_delete')!;

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
});
