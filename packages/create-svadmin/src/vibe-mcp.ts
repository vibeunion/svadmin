import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { inspectVibePage, readVibePreview, searchVibePages } from './vibe-catalog';

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function referenceResult(read: () => CallToolResult): CallToolResult {
  try {
    return read();
  } catch {
    // MCP 客户端只收到材料读取失败，不暴露安装路径或原始文件系统错误。
    return {
      isError: true,
      content: [{ type: 'text', text: 'Unable to read shipped svadmin reference materials. Check the installed package.' }],
    };
  }
}

export async function createVibeMcpServer(packageRoot: string, version: string) {
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  const { ListToolsRequestSchema, CallToolRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');
  const { Type } = await import('@sinclair/typebox');
  const { Value } = await import('@sinclair/typebox/value');
  const server = new Server({ name: 'svadmin-vibe', version }, {
    capabilities: { tools: {} },
    instructions: 'Read-only shipped design references, not the customer project or production data. Search pages, inspect a matching page, and read desktop/mobile previews before editing. Follow the returned contracts and acceptance requirements. Reference images are not evidence that customer edits passed tests.',
  });
  const page = Type.Union(searchVibePages('').map(item => Type.Literal(item.id)));
  const searchInput = Type.Object({ query: Type.Optional(Type.String({ maxLength: 256 })) }, { additionalProperties: false });
  const inspectInput = Type.Object({ page }, { additionalProperties: false });
  const previewInput = Type.Object({
    page, viewport: Type.Union([Type.Literal('desktop'), Type.Literal('mobile')]),
  }, { additionalProperties: false });
  const invalidArguments = (): CallToolResult => ({
    isError: true,
    content: [{ type: 'text', text: 'Invalid tool arguments. Follow the schema returned by tools/list.' }],
  });
  const definitions = [
    { name: 'svadmin_vibe_search', schema: searchInput,
      description: 'Search shipped admin page families by Chinese/English keywords, IDs or components. All words must match; omit arguments or query to list all pages.' },
    { name: 'svadmin_vibe_inspect', schema: inspectInput,
      description: 'Read a shipped page with source, resource contracts, demo provider, design guidance and acceptance checks. Not a standalone page installer.' },
    { name: 'svadmin_vibe_preview', schema: previewInput,
      description: 'Read a shipped desktop or mobile PNG. A visual reference, not a current screenshot of the customer application.' },
  ];
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: definitions.map(({ name, description, schema }) => ({
      name, description, annotations,
      inputSchema: { ...schema, type: 'object' as const },
    })),
  }));
  // 使用 SDK 的公开底层 API，在严格校验前规范化协议允许省略的 arguments。
  server.setRequestHandler(CallToolRequestSchema, ({ params }): CallToolResult => {
    const args = params.arguments ?? {};
    switch (params.name) {
      case 'svadmin_vibe_search': {
        if (!Value.Check(searchInput, args)) return invalidArguments();
        const { query } = args;
        return { content: [{ type: 'text', text: JSON.stringify({ pages: searchVibePages(query ?? '') }) }] };
      }
      case 'svadmin_vibe_inspect': {
        if (!Value.Check(inspectInput, args)) return invalidArguments();
        const { page } = args;
        return referenceResult(() => ({
          content: [{ type: 'text', text: JSON.stringify(inspectVibePage(packageRoot, page)) }],
        }));
      }
      case 'svadmin_vibe_preview': {
        if (!Value.Check(previewInput, args)) return invalidArguments();
        const { page, viewport } = args;
        return referenceResult(() => ({
          content: [
            { type: 'text', text: `Shipped reference: ${page}/${viewport}. Not current customer acceptance evidence.` },
            { type: 'image', mimeType: 'image/png', data: readVibePreview(packageRoot, page, viewport).toString('base64') },
          ],
        }));
      }
      default:
        return { isError: true, content: [{ type: 'text', text: 'Unknown tool. Use tools/list to discover the read-only catalog tools.' }] };
    }
  });
  return server;
}

export async function serveVibeMcp(packageRoot: string, version: string): Promise<void> {
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const server = await createVibeMcpServer(packageRoot, version);
  const close = () => {
    void server.close().catch(() => {
      console.error('Unable to close svadmin vibe MCP transport.');
      process.exitCode = 1;
    });
  };
  server.onerror = () => { console.error('svadmin vibe MCP transport error.'); };
  server.onclose = () => {
    process.stdin.off('end', close);
    process.off('SIGINT', close);
    process.off('SIGTERM', close);
  };
  process.stdin.once('end', close);
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
  await server.connect(new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 64 * 1024 }));
}
