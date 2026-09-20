import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineSurfaceAction, createSurfaceWorkflowService } from '../../packages/surface/src/server.js';
import { SqliteSurfaceWorkflowStore } from '../../packages/surface/src/server-sqlite.js';
import { createInteractiveSurfaceDefinitions, defaultSurfaceDefinitions } from '../../packages/surface/src/workflows.js';
import { actionDescriptor, policy } from './fixture.js';

if (!process.env.SVADMIN_OPENUI_ENTRY) throw new Error('Install the real optional OpenUI parser and set SVADMIN_OPENUI_ENTRY');
const root = fileURLToPath(new URL('.', import.meta.url));
const store = new SqliteSurfaceWorkflowStore(join(mkdtempSync(join(tmpdir(), 'surface-e2e-')), 'workflow.sqlite'));
let writes = 0, queries = 0;
const records = [{ id: 'seed', name: 'Synthetic customer' }];
const action = defineSurfaceAction({ ...actionDescriptor,
  authorize: ({ context, requesterId }) => context.tenantId === 'tenant-a' && context.actorId === 'alice' && requesterId === 'alice',
  execute: async ({ args }) => { writes++; records.push({ id: `created-${writes}`, name: String((args.profile as { name: string }).name) }); return { id: `created-${writes}` }; },
});
const catalog = createInteractiveSurfaceDefinitions([action], defaultSurfaceDefinitions);
const service = createSurfaceWorkflowService({ store, actions: [action],
  authorizeSurface: ({ context }) => context.tenantId === 'tenant-a' && context.actorId === 'alice' ? { catalog, policy } : null,
});

export default defineConfig({
  root,
  resolve: { alias: { '@surface-openui-fixture': process.env.SVADMIN_OPENUI_ENTRY } },
  server: { host: '127.0.0.1', port: 4178, strictPort: true, fs: { allow: [fileURLToPath(new URL('../..', import.meta.url)), dirname(dirname(dirname(dirname(dirname(process.env.SVADMIN_OPENUI_ENTRY)))))] } },
  plugins: [svelte(), {
    name: 'synthetic-surface-workflow-fixture',
    configureServer(server) {
      // Synthetic local test identities, NOT production authentication middleware.
      server.middlewares.use('/__workflow', async (req, res) => {
        res.setHeader('content-type', 'application/json');
        try {
          if (req.method !== 'POST' || req.headers.origin !== 'http://127.0.0.1:4178') throw new Error('Fixture origin/method rejected');
          let text = ''; for await (const chunk of req) { text += String(chunk); if (text.length > 131_072) throw new Error('Body too large'); }
          const { operation, input } = JSON.parse(text);
          const context = { tenantId: String(req.headers['x-fixture-tenant'] ?? 'tenant-a'), actorId: String(req.headers['x-fixture-actor'] ?? 'alice') };
          let result: unknown;
          if (operation === 'save') result = await service.saveSurface(context, input);
          else if (operation === 'propose') result = await service.propose(context, input);
          else if (operation === 'approve') result = await service.approve(context, input.id, input.digest);
          else if (operation === 'execute') result = await service.execute(context, input.id, input.digest);
          else if (operation === 'inspect') result = await service.inspect(context, input.id);
          else if (operation === 'reject') result = await service.reject(context, input.id, input.digest);
          else if (operation === 'audit') result = await service.audit(context, 'contacts');
          else if (operation === 'state') result = { writes, queries, revision: store.getRevision('tenant-a', 'contacts')?.revision ?? 0 };
          else if (operation === 'list') { if (context.tenantId !== 'tenant-a') throw new Error('Denied'); queries++; result = { data: records, total: records.length }; }
          else throw new Error('Unknown fixture operation');
          res.end(JSON.stringify(result));
        } catch (error) { res.statusCode = 400; res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Request failed' })); }
      });
    },
  }],
});
