import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageRoot = resolve(import.meta.dir, '..');
const repositoryRoot = resolve(packageRoot, '../..');
const rootDesignPath = resolve(repositoryRoot, 'DESIGN.md');
const guidanceDesignPath = resolve(packageRoot, 'guidance/DESIGN.md');
const guidanceAgentsPath = resolve(packageRoot, 'guidance/AGENTS.md');

describe('create-svadmin AI guidance contract', () => {
  it('ships the project design and agent guidance files', () => {
    expect(existsSync(guidanceDesignPath)).toBe(true);
    expect(existsSync(guidanceAgentsPath)).toBe(true);
  });

  it('keeps the shipped DESIGN.md synchronized with the repository source', () => {
    expect(readFileSync(guidanceDesignPath, 'utf8')).toBe(readFileSync(rootDesignPath, 'utf8'));
  });

  it('generates pages from the public default-first composition API', () => {
    const agents = readFileSync(guidanceAgentsPath, 'utf8');
    const app = readFileSync(resolve(packageRoot, 'template/src/App.svelte'), 'utf8');
    const dashboard = readFileSync(resolve(packageRoot, 'template/src/pages/Dashboard.svelte'), 'utf8');
    expect(agents).toContain('Default-first page composition');
    expect(agents).toContain('Never import example files');
    expect(app).not.toContain('themeConfig=');
    expect(dashboard).toContain('<DashboardPage');
    expect(dashboard).toContain('<PageSection');
    expect(dashboard).toContain('<AutoTable');
    expect(dashboard).toContain('syncWithLocation={false}');
    expect(dashboard).not.toContain('class=');
  });

  it('ships the validated dependency declarations without weakening strict checks', () => {
    const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'scaffold-manifest.json'), 'utf8'));
    const tsconfig = JSON.parse(readFileSync(resolve(packageRoot, 'template/tsconfig.json'), 'utf8'));
    expect(tsconfig.compilerOptions.skipLibCheck).toBe(false);
    expect(manifest.devDependencies['@types/node']).toBeDefined();
    expect(manifest.devDependencies['esbuild']).toBeDefined();
    for (const patch of Object.values(manifest.patchedDependencies) as string[]) {
      expect(readFileSync(resolve(packageRoot, 'template', patch), 'utf8'))
        .toBe(readFileSync(resolve(repositoryRoot, patch), 'utf8'));
    }
  });

  it('does not fall back to an installer that ignores the shipped Bun patches', () => {
    const source = readFileSync(resolve(packageRoot, 'src/index.ts'), 'utf8');
    expect(source).not.toContain("spawnSync('npm', ['install']");
    expect(source).toContain('this template requires Bun to apply dependency patches');
    expect(source).toContain('if (!dependenciesInstalled)');
  });

  it('makes feedback ownership and information budget executable for AI', () => {
    const agents = readFileSync(guidanceAgentsPath, 'utf8');
    expect(agents).toContain('Read `DESIGN.md` before');
    expect(agents).toContain('one event -> one primary feedback surface');
    expect(agents).toContain('at most one full-width high-emphasis notice');
    expect(agents).toContain('successNotification: false');
  });

  it('requires schema-derived models, boundary validation, and compiler checks', () => {
    const agents = readFileSync(guidanceAgentsPath, 'utf8');
    expect(agents).toContain('Static<typeof Schema>');
    expect(agents).toContain('defineResource(name, schemas)');
    expect(agents).toContain('String resources, implicit routes, and data generics');
    expect(agents).toContain('`useList`, `useOne`, `useShow`, and `useMany`');
    expect(agents).toContain('`useTable` also infers');
    expect(agents).toContain('`defineCommand`');
    expect(agents).toContain('missing schemas disable writes');
    expect(agents).toContain('`@svadmin/core/unsafe`');
    expect(agents).toContain('`useInfiniteList` and `useSelect`');
    expect(agents).toContain('`setFieldValue`');
    expect(agents).toContain('`writeMayHaveSucceeded`');
    expect(agents).toContain('but they do not authorize a mutation');
    expect(agents).toContain('`bun run check`');
    expect(agents).toContain('Passing runtime tests alone does not prove compile-time type safety');
  });
});
