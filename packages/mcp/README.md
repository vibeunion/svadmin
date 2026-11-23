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

server.listen(); // stdio transport, or server.createHandler() for HTTP
```

Exposes DataProvider CRUD operations as MCP tools for Claude Desktop, Cursor, and custom agents. Apply the same permission and redaction rules as your admin UI.

Documentation: https://svadmin.nestjs.cn

License: MIT
