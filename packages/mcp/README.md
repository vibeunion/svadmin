# @svadmin/mcp

MCP (Model Context Protocol) server — expose svadmin DataProvider as tools for AI agents

## Install

```bash
bun add @svadmin/mcp
```

## Usage

```ts
import { createMCPServer } from '@svadmin/mcp';

const server = createMCPServer({
  dataProvider,
  resources: ['posts', 'users', 'orders'],
});

const tools = server.getTools();
const response = await server.handleRequest({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
});
```

`createMCPServer` returns MCP tool definitions plus a JSON-RPC `handleRequest` method. The host owns the transport (stdio, HTTP, or an existing MCP server) and must pass incoming JSON-RPC requests to it. Exposes DataProvider CRUD operations as MCP tools for Claude Desktop, Cursor, and custom agents. Apply the same permission and redaction rules as your admin UI.

Documentation: https://svadmin.nestjs.cn

License: MIT
