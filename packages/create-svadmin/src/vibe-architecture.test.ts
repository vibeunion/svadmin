import { afterEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { loadScaffoldManifest } from './project-manifest';
import { planVibeProject, writeVibeProject } from './vibe-command';

const root = resolve(import.meta.dir, '..');
const script = resolve(root, 'blueprints/customer-workspace/scripts/check-architecture.mjs');
const temporary: string[] = [];
function fixture(files: Record<string, string>) {
  const directory = mkdtempSync(join(tmpdir(), 'svadmin-vibe-architecture-'));
  temporary.push(directory);
  symlinkSync(resolve(root, '../../node_modules'), join(directory, 'node_modules'), 'dir');
  for (const [file, source] of Object.entries({
    'scripts/check-architecture.mjs': readFileSync(script, 'utf8'),
    'tsconfig.json': '{"compilerOptions":{"baseUrl":".","paths":{"@features/*":["src/features/*"]}}}',
    'src/features/customers/index.ts': 'export {};',
    'src/features/orders/index.ts': 'export {};',
    'src/features/orders/data.ts': 'export const orders = [];',
    'src/features/orders/private.ts': 'export const secret = 1;',
    ...files,
  })) {
    mkdirSync(dirname(join(directory, file)), { recursive: true });
    writeFileSync(join(directory, file), source);
  }
  return directory;
}
function check(directory: string) {
  return Bun.spawnSync(['node', join(directory, 'scripts/check-architecture.mjs')], { cwd: directory, stdout: 'pipe', stderr: 'pipe' });
}
afterEach(() => { for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe('generated application architecture', () => {
  it('allows own internals, public entries, headless data, and ignores import-like comments', () => {
    const directory = fixture({
      'src/features/orders/Local.ts': "import { secret } from './private';",
      'src/features/customers/Page.svelte': `<script lang="ts">
        import { orders } from '../orders/data';
        // import value from '../orders/private';
        const load = () => import('../orders');
      </script><p>{orders.length}</p>`,
    });
    const result = check(directory);
    expect(result.stderr.toString()).toBe('');
    expect(result.exitCode).toBe(0);
  });

  it('rejects private imports, exports, aliases, import types and dynamic paths', () => {
    for (const [source, diagnostic] of [
      ["import { secret } from '../orders/private';", 'public index.ts/data.ts'],
      ["const a = <number>1; import { secret } from '../orders/private';", 'public index.ts/data.ts'],
      ["import other = require('../orders/private');", 'public index.ts/data.ts'],
      ["const = ;", 'parse error'],
      ["export { secret } from '../orders/private';", 'public index.ts/data.ts'],
      ["const load = () => import('../orders/private');", 'public index.ts/data.ts'],
      ["type Value = import('../orders/private').Value;", 'public index.ts/data.ts'],
      ["import { secret } from '@features/orders/private';", 'public index.ts/data.ts'],
      ["import { secret } from '@features/orders/missing.svelte';", 'unresolved path alias'],
      ["const load = (name: string) => import(name);", 'computed module imports'],
      ["import { secret } from '@svadmin/core/src/internal';", 'public package exports'],
    ] as const) {
      const result = check(fixture({ 'src/features/customers/page.ts': source }));
      expect(result.exitCode, source).toBe(1);
      expect(result.stderr.toString()).toContain(diagnostic);
    }
  }, 30_000);

  it('checks both Svelte script blocks and imports from the application composition', () => {
    for (const file of [
      { 'src/App.svelte': '<script module lang="ts">export { secret } from "./features/orders/private";</script>' },
      { 'src/App.svelte': '<script lang="ts">import { secret } from "./features/orders/private";</script>' },
      { 'src/main.ts': 'import { secret } from "./features/orders/private";' },
    ]) {
      const result = check(fixture(file));
      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain('public index.ts/data.ts');
    }
  });

  it('requires an index for each feature and rejects malformed Svelte', () => {
    expect(check(fixture({ 'src/features/new/private.ts': 'export {};' })).stderr.toString()).toContain('missing public index.ts');
    expect(check(fixture({ 'src/App.svelte': '<script>const = ;</script>' })).exitCode).not.toBe(0);
  });

  it('checks template imports and all TypeScript module extensions', () => {
    for (const extension of ['mts', 'cts', 'cjs', 'tsx']) {
      expect(check(fixture({
        [`src/features/customers/page.${extension}`]: "import { secret } from '../orders/private';",
      })).stderr.toString()).toContain('public index.ts/data.ts');
    }
    expect(check(fixture({
      'src/features/customers/Page.svelte': "{#await import('../orders/private') then module}<p>{module.secret}</p>{/await}",
    })).stderr.toString()).toContain('public index.ts/data.ts');
    expect(check(fixture({
      'src/features/customers/Page.svelte': '<script>let target = "";</script>{#await import(target)}<p>Loading</p>{/await}',
    })).stderr.toString()).toContain('computed module imports');
  });

  it('resolves existing Svelte aliases before checking feature ownership', () => {
    const own = check(fixture({
      'src/features/customers/Detail.svelte': '<p>Detail</p>',
      'src/features/customers/Page.svelte': '<script>import Detail from "@features/customers/Detail.svelte";</script><Detail />',
    }));
    expect(own.stderr.toString()).toBe('');
    expect(own.exitCode).toBe(0);
    expect(check(fixture({
      'src/features/orders/Detail.svelte': '<p>Detail</p>',
      'src/features/customers/Page.svelte': '<script>import Detail from "@features/orders/Detail.svelte";</script><Detail />',
    })).stderr.toString()).toContain('public index.ts/data.ts');
  });

  it('ships the gate and passes the real generated source tree', () => {
    const parent = fixture({});
    const directory = join(parent, 'generated');
    const manifest = loadScaffoldManifest(join(root, 'scaffold-manifest.json'));
    const files = planVibeProject(root, manifest, 'enterprise');
    const pkg = JSON.parse(String(files['package.json']));
    expect(pkg.scripts.check).toStartWith('bun run check:architecture && ');
    expect(pkg.scripts['check:architecture']).toBe('node scripts/check-architecture.mjs');
    expect(JSON.parse(String(files['svadmin.ai.json'])).guidance).toContain('ARCHITECTURE.md');
    writeVibeProject(directory, files);
    const result = check(directory);
    expect(result.stderr.toString()).toBe('');
    expect(result.exitCode).toBe(0);
  });
});
