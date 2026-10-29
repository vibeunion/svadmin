/**
 * Minimal read-only DevTools snapshot server.
 *
 * Intended for local development only: it exposes the same redacted snapshot
 * contract used by the in-app DevTools overlay so a separate inspector process
 * can poll it. Never mount this in production.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { DevtoolsSnapshot } from '@svadmin/devtools-contract';

export interface DevtoolsServerOptions {
  snapshot: () => DevtoolsSnapshot | Promise<DevtoolsSnapshot>;
  host?: string;
  port?: number;
  /** Optional bearer token; when omitted the server binds to localhost only. */
  token?: string;
}

export interface DevtoolsServerHandle {
  readonly url: string;
  close: () => Promise<void>;
}

function unauthorized(response: ServerResponse): void {
  response.writeHead(401, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'unauthorized' }));
}

export async function startDevtoolsServer(options: DevtoolsServerOptions): Promise<DevtoolsServerHandle> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 0;
  const token = options.token;

  const handler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`);
    if (request.method !== 'GET' || url.pathname !== '/snapshot') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'not_found' }));
      return;
    }
    if (token !== undefined && request.headers.authorization !== `Bearer ${token}`) {
      unauthorized(response);
      return;
    }
    try {
      const snapshot = await options.snapshot();
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify(snapshot));
    } catch {
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'snapshot_unavailable' }));
    }
  };

  const server: Server = createServer((request, response) => { void handler(request, response); });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => { server.off('error', reject); resolve(); });
  });
  const address = server.address();
  const selectedPort = typeof address === 'object' && address !== null ? address.port : port;
  return {
    url: `http://${host}:${selectedPort}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    }),
  };
}

export type DevtoolsServer = typeof startDevtoolsServer;
