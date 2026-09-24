import { afterEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { createVibeMcpServer } from './vibe-mcp';
import { inspectVibePage, readVibePreview, searchVibePages } from './vibe-catalog';
import { parseVibeArguments } from './vibe-command';

const root = resolve(import.meta.dir, '..');
const temporary: string[] = [];
const close: (() => Promise<void>)[] = [];

function temp() {
  const directory = mkdtempSync(join(tmpdir(), 'svadmin-vibe-mcp-'));
  temporary.push(directory);
  return directory;
}

async function connect(packageRoot = root) {
  const server = await createVibeMcpServer(packageRoot, 'test-version');
  const client = new Client({ name: 'svadmin-vibe-test', version: '1' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  close.push(() => client.close(), () => server.close());
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

afterEach(async () => {
  for (const cleanup of close.splice(0)) await cleanup();
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('read-only vibe MCP', () => {
  it('accepts only an explicit stdio command with no project or network options', () => {
    expect(parseVibeArguments(['mcp'])).toEqual({ command: 'mcp' });
    for (const args of [['mcp', '--write'], ['mcp', '.'], ['mcp', '--port', '3000']]) {
      expect(() => parseVibeArguments(args)).toThrow();
    }
  });

  it('initializes with the real SDK and exposes only three finite read-only tools', async () => {
    const client = await connect();
    expect(client.getServerVersion()).toEqual({ name: 'svadmin-vibe', version: 'test-version' });
    expect(client.getServerCapabilities()).toEqual({ tools: {} });
    const { tools } = await client.listTools();
    expect(tools.map(tool => tool.name).sort()).toEqual([
      'svadmin_vibe_inspect', 'svadmin_vibe_preview', 'svadmin_vibe_search',
    ]);
    for (const tool of tools) {
      expect(tool.annotations).toEqual({
        readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false,
      });
      expect(tool.inputSchema.additionalProperties).toBe(false);
    }
  });

  it('returns the same search and inspection materials as the CLI', async () => {
    const client = await connect();
    const search = await client.callTool({ name: 'svadmin_vibe_search', arguments: { query: '审批' } }, CallToolResultSchema);
    expect(search.content).toEqual([{ type: 'text', text: JSON.stringify({ pages: searchVibePages('审批') }) }]);
    const all = await client.callTool({ name: 'svadmin_vibe_search' }, CallToolResultSchema);
    expect(all.content).toEqual([{ type: 'text', text: JSON.stringify({ pages: searchVibePages('') }) }]);
    const inspection = await client.callTool({ name: 'svadmin_vibe_inspect', arguments: { page: 'approval' } }, CallToolResultSchema);
    expect(inspection.content).toEqual([{ type: 'text', text: JSON.stringify(inspectVibePage(root, 'approval')) }]);
  });

  it('returns actual desktop and mobile PNGs with a reference-only warning', async () => {
    const client = await connect();
    for (const viewport of ['desktop', 'mobile'] as const) {
      const result = await client.callTool({ name: 'svadmin_vibe_preview', arguments: { page: 'list', viewport } }, CallToolResultSchema);
      expect(result.isError).not.toBe(true);
      const text = result.content.find(block => block.type === 'text');
      expect(text?.text).toContain('Not current customer acceptance evidence');
      const image = result.content.find(block => block.type === 'image');
      expect(image?.mimeType).toBe('image/png');
      expect(Buffer.from(image?.data ?? '', 'base64')).toEqual(
        readFileSync(join(root, `blueprints/customer-workspace/previews/list-${viewport}.png`)),
      );
    }
  });

  it('rejects unknown tools, traversal, extra keys, wrong types and unbounded queries', async () => {
    const client = await connect();
    const calls = [
      { name: 'svadmin_create', arguments: { resource: 'customers' } },
      { name: 'svadmin_vibe_inspect', arguments: { page: '../../.env' } },
      { name: 'svadmin_vibe_inspect', arguments: { page: 1 } },
      { name: 'svadmin_vibe_inspect', arguments: { page: 'list', path: '/etc/passwd' } },
      { name: 'svadmin_vibe_preview', arguments: { page: 'list', viewport: '../../.env' } },
      { name: 'svadmin_vibe_preview', arguments: { page: 'list' } },
      { name: 'svadmin_vibe_search', arguments: { query: false } },
      { name: 'svadmin_vibe_search', arguments: { query: 'x'.repeat(257) } },
      { name: 'svadmin_vibe_search', arguments: { project: '.' } },
    ];
    for (const call of calls) {
      const result = await client.callTool(call, CallToolResultSchema);
      expect(result.isError, call.name).toBe(true);
    }
    expect((await client.callTool({ name: 'svadmin_vibe_search', arguments: {} }, CallToolResultSchema)).isError).not.toBe(true);
  });

  it('reports missing materials without exposing host filesystem paths', async () => {
    const directory = temp();
    const client = await connect(directory);
    const result = await client.callTool({ name: 'svadmin_vibe_inspect', arguments: { page: 'list' } }, CallToolResultSchema);
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toContain(directory);
    expect(JSON.stringify(result)).toContain('Unable to read shipped');
  });

  it('rejects escaped, corrupt and oversized preview files before returning image content', () => {
    const directory = temp();
    const previews = join(directory, 'blueprints/customer-workspace/previews');
    mkdirSync(previews, { recursive: true });
    const image = join(previews, 'list-desktop.png');
    const outside = join(temp(), 'private.png');
    writeFileSync(outside, 'private marker');
    symlinkSync(outside, image);
    expect(() => readVibePreview(directory, 'list', 'desktop')).toThrow('escapes package');
    rmSync(image);
    writeFileSync(image, 'not png');
    expect(() => readVibePreview(directory, 'list', 'desktop')).toThrow('Invalid preview PNG');
    truncateSync(image, 4 * 1024 * 1024 + 1);
    expect(() => readVibePreview(directory, 'list', 'desktop')).toThrow('Invalid preview size');
  });

  it('uses stdio from an unrelated customer directory without reading or writing it', async () => {
    const directory = temp();
    writeFileSync(join(directory, '.env'), 'CUSTOMER_SENTINEL=not-a-credential');
    const client = new Client({ name: 'stdio-test', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath, args: [join(root, 'src/index.ts'), 'vibe', 'mcp'], cwd: directory, stderr: 'pipe',
    });
    let stderr = '';
    transport.stderr?.on('data', chunk => { stderr += String(chunk); });
    const protocolErrors: Error[] = [];
    client.onerror = error => { protocolErrors.push(error); };
    close.push(() => client.close());
    await client.connect(transport);
    const result = await client.callTool({ name: 'svadmin_vibe_inspect', arguments: { page: 'list' } }, CallToolResultSchema);
    expect(result.isError).not.toBe(true);
    expect(JSON.stringify(result)).not.toContain('CUSTOMER_SENTINEL');
    expect(readdirSync(directory)).toEqual(['.env']);
    expect(stderr).toBe('');
    expect(protocolErrors).toEqual([]);
  }, 15_000);

  it('terminates when stdin closes and writes no banner to stdout', async () => {
    const child = Bun.spawn([process.execPath, join(root, 'src/index.ts'), 'vibe', 'mcp'], {
      stdin: 'pipe', stdout: 'pipe', stderr: 'pipe',
    });
    const timer = setTimeout(() => child.kill(), 5000);
    try {
      child.stdin.end();
      expect(await child.exited).toBe(0);
      expect(await new Response(child.stdout).text()).toBe('');
      expect(await new Response(child.stderr).text()).toBe('');
    } finally {
      clearTimeout(timer);
      child.kill();
    }
  }, 10_000);
});
