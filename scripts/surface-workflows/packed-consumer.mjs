import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 安装实际 tarball，不改写 peer 范围，不用源码别名冒充发布包。
const repository = fileURLToPath(new URL('../..', import.meta.url));
const output = join(repository, 'test-results/surface-workflows');
const temporary = mkdtempSync(join(tmpdir(), 'surface-packed-'));
const run = (command, args, cwd = temporary) => execFileSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const manifest = name => JSON.parse(readFileSync(join(repository, 'packages', name, 'package.json'), 'utf8'));
const root = JSON.parse(readFileSync(join(repository, 'package.json'), 'utf8'));
const report = { checkout: run('git', ['rev-parse', 'HEAD'], repository).trim(), status: 'running',
  combination: 'same-checkout tarballs; NOT proof of an older published UI version', packs: {} };
mkdirSync(output, { recursive: true });
try {
  const dependencies = { svelte: root.overrides.svelte, '@tanstack/svelte-query': manifest('ui').peerDependencies['@tanstack/svelte-query'],
    '@sinclair/typebox': manifest('surface').dependencies['@sinclair/typebox'] };
  for (const name of ['devtools-contract', 'core', 'ui', 'surface']) {
    // 发布打包器解析 workspace 协议；独立消费者不依赖仓库工作区。
    const tarball = run('bun', ['pm', 'pack', '--quiet', '--ignore-scripts', '--destination', temporary], join(repository, 'packages', name)).trim();
    const [pack] = JSON.parse(run('npm', ['pack', tarball, '--dry-run', '--json', '--ignore-scripts']));
    assert.ok(pack?.filename && pack.integrity, `Missing ${name} pack`);
    dependencies[`@svadmin/${name}`] = `file:${join(temporary, pack.filename)}`;
    report.packs[name] = { filename: pack.filename, integrity: pack.integrity };
    if (name === 'surface') {
      for (const entry of ['business', 'business-definitions', 'workflows', 'interactive', 'openui', 'server', 'server-sqlite']) {
        assert.ok(pack.files.some(file => file.path === `dist/${entry}.js`), `Missing ${entry} JavaScript`);
        assert.ok(pack.files.some(file => file.path === `dist/${entry}.d.ts`), `Missing ${entry} declarations`);
      }
      assert.ok(!pack.files.some(file => /[.-](?:test|spec)[.-]/u.test(file.path)), 'Tests leaked into Surface package');
    }
  }
  writeFileSync(join(temporary, 'package.json'), JSON.stringify({ name: 'surface-packed-acceptance', private: true, type: 'module',
    packageManager: 'pnpm@11.11.0', dependencies, devDependencies: {
      vite: root.overrides.vite, '@sveltejs/vite-plugin-svelte': manifest('ui').devDependencies['@sveltejs/vite-plugin-svelte'],
    } }, null, 2));
  // 仅替换运行时依赖来源，保留所有 peer 范围；JSON 也是合法的 YAML。
  writeFileSync(join(temporary, 'pnpm-workspace.yaml'), JSON.stringify({
    overrides: { '@svadmin/ui>@svadmin/devtools-contract': dependencies['@svadmin/devtools-contract'] },
  }, null, 2));
  run('npx', ['--yes', 'pnpm@11.11.0', 'install', '--strict-peer-dependencies', '--ignore-scripts', '--reporter', 'append-only']);
  writeFileSync(join(temporary, 'server.mjs'), `
    import assert from 'node:assert/strict';
    import { validateSurfaceSpec } from '@svadmin/surface';
    import { createBusinessSurfaceDefinitions } from '@svadmin/surface/business-contracts';
    import { createInteractiveSurfaceDefinitions } from '@svadmin/surface/workflows';
    import { createSurfaceOpenUIStream } from '@svadmin/surface/openui';
    import { createSurfaceWorkflowService } from '@svadmin/surface/server';
    import { SqliteSurfaceWorkflowStore } from '@svadmin/surface/server/sqlite';
    assert.ok(createBusinessSurfaceDefinitions().widgets.some(widget => widget.dataKind === 'record'));
    for (const api of [validateSurfaceSpec, createInteractiveSurfaceDefinitions, createSurfaceOpenUIStream, createSurfaceWorkflowService]) assert.equal(typeof api, 'function');
    const store = new SqliteSurfaceWorkflowStore(':memory:');
    try {
      store.transaction(tx => tx.audit({ tenantId:'t', surfaceId:'s', actorId:'a', event:'pack.test', at:1, metadata:{} }));
      assert.equal(store.listAudit('t','s',0,10).length,1);
      assert.equal(store.listAudit('other','s',0,10).length,0);
    } finally { store.close(); }
  `);
  run('node', ['server.mjs']);
  writeFileSync(join(temporary, 'entry.ts'), `
    import { Type } from '@sinclair/typebox';
    import { createBusinessSurfaceCatalog } from '@svadmin/surface/business';
    import { createInteractiveSurfaceCatalog, SurfaceWorkflowProvider } from '@svadmin/surface/interactive';
    import { SurfaceRenderer } from '@svadmin/surface/svelte';
    import '@svadmin/ui/app.css';
    import '@svadmin/surface/styles.css';
    export const catalog = createInteractiveSurfaceCatalog([{ id:'contacts.create',version:'1',label:'Create',approval:'confirm',inputSchema:Type.Object({name:Type.String()},{additionalProperties:false}) }], createBusinessSurfaceCatalog());
    export { SurfaceWorkflowProvider, SurfaceRenderer };
  `);
  writeFileSync(join(temporary, 'vite.config.mjs'), `
    import { svelte } from '@sveltejs/vite-plugin-svelte';
    export default { plugins:[svelte()], build:{ lib:{entry:'entry.ts',formats:['es'],fileName:'client'} } };
  `);
  run('node', [join(temporary, 'node_modules/vite/bin/vite.js'), 'build']);
  const client = readdirSync(join(temporary, 'dist')).filter(name => name.endsWith('.js'))
    .map(name => readFileSync(join(temporary, 'dist', name), 'utf8')).join('\n');
  for (const forbidden of ['node:sqlite', 'node:crypto', 'svadmin_surface_proposals', 'svadmin_surface_audit', 'BEGIN IMMEDIATE']) {
    assert.ok(!client.includes(forbidden), `Server implementation leaked into client: ${forbidden}`);
  }
  report.status = 'passed';
  report.checks = ['packed entry exports and declarations', 'strict peer install', 'DOM-free Node imports', 'SQLite tenant isolation', 'interactive browser library build', 'server code excluded from browser'];
  console.info(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'failed';
  report.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  writeFileSync(join(output, 'packed-consumer.json'), JSON.stringify(report, null, 2) + '\n');
  rmSync(temporary, { recursive: true, force: true });
}
