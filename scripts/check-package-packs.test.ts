import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { packedConsumerDependencies, publishedWorkspaceManifest, stagePublishedPack } from './check-package-packs';

type Manifest = Parameters<typeof packedConsumerDependencies>[2] extends ReadonlyMap<string, infer M>
  ? M
  : never;

test('Surface declared minimum and peer floors agree with the published UI requirements', async () => {
  const surface = await Bun.file(new URL('../packages/surface/package.json', import.meta.url)).json();
  const compatibility = await Bun.file(new URL('../packages/surface/compatibility.json', import.meta.url)).json();
  expect(surface.peerDependencies).toEqual({
    '@svadmin/core': '>=0.53.0 <0.54.0',
    '@svadmin/ui': '>=0.73.0 <0.74.0',
    svelte: '^5.56.10',
  });
  expect(compatibility.minimumSupported).toEqual({
    '@svadmin/core': '0.53.0',
    '@svadmin/ui': '0.73.0',
    svelte: '5.56.10',
  });
  expect(compatibility.testedCombinations).toContainEqual({
    name: 'minimum-supported', core: '0.53.0', ui: '0.73.0', svelte: '5.56.10',
  });
});

function fixture() {
  const manifests = new Map<string, Manifest>([
    ['@svadmin/ui', {
      name: '@svadmin/ui',
      dependencies: { '@svadmin/devtools-contract': 'workspace:*', external: '^2.0.0' },
      peerDependencies: { '@svadmin/core': 'workspace:*', svelte: '^5.56.10' },
      devDependencies: { '@svadmin/ai-elements': 'workspace:*' },
    }],
    ['@svadmin/devtools-contract', {
      name: '@svadmin/devtools-contract',
      dependencies: { '@svadmin/shared': '^1.0.0' },
    }],
    ['@svadmin/shared', {
      name: '@svadmin/shared',
      dependencies: { '@svadmin/devtools-contract': 'workspace:*' },
    }],
    ['@svadmin/core', { name: '@svadmin/core' }],
    ['@svadmin/surface', {
      name: '@svadmin/surface',
      peerDependencies: { '@svadmin/ui': '>=0.73.0 <0.74.0', '@svadmin/core': '^0.53.0' },
    }],
    ['@svadmin/ai-elements', {
      name: '@svadmin/ai-elements',
      peerDependencies: { '@svadmin/core': 'workspace:*' },
    }],
  ]);
  const results = new Map([...manifests.keys()].map((name) => [
    name, { filename: `${name.slice('@svadmin/'.length)}.tgz`, files: [] },
  ]));
  return { manifests, results };
}

test('local runtime closure includes transitive dependencies and required peers, handles cycles', () => {
  const { manifests, results } = fixture();
  const before = JSON.stringify([...manifests]);
  expect(packedConsumerDependencies('/packs', results, manifests, ['@svadmin/ui'])).toEqual({
    '@svadmin/ui': 'file:/packs/ui.tgz',
    '@svadmin/core': 'file:/packs/core.tgz',
    '@svadmin/devtools-contract': 'file:/packs/devtools-contract.tgz',
    '@svadmin/shared': 'file:/packs/shared.tgz',
  });
  expect(JSON.stringify([...manifests])).toBe(before);
});

test('AI Elements and Surface fixtures use complete local tarball closures', () => {
  const { manifests, results } = fixture();
  expect(packedConsumerDependencies('/packs', results, manifests, ['@svadmin/ai-elements'])).toEqual({
    '@svadmin/ai-elements': 'file:/packs/ai-elements.tgz',
    '@svadmin/core': 'file:/packs/core.tgz',
  });
  expect(packedConsumerDependencies('/packs', results, manifests, ['@svadmin/surface']))
    .toHaveProperty('@svadmin/devtools-contract', 'file:/packs/devtools-contract.tgz');
});

test('minimum-supported fixture keeps published versions without traversing newer local packages', () => {
  const { manifests, results } = fixture();
  expect(packedConsumerDependencies('/packs', results, manifests, ['@svadmin/surface'], {
    '@svadmin/ui': '0.73.0',
    '@svadmin/core': '0.53.0',
    svelte: '5.56.10',
  })).toEqual({
    '@svadmin/surface': 'file:/packs/surface.tgz',
    '@svadmin/ui': '0.73.0',
    '@svadmin/core': '0.53.0',
    svelte: '5.56.10',
  });
});

test('optional runtime dependencies remain local without enabling unused optional peers', () => {
  const { manifests, results } = fixture();
  manifests.set('@svadmin/core', {
    name: '@svadmin/core',
    optionalDependencies: { '@svadmin/shared': 'workspace:*' },
    peerDependencies: { '@svadmin/ai-elements': 'workspace:*' },
    peerDependenciesMeta: { '@svadmin/ai-elements': { optional: true } },
  });
  const dependencies = packedConsumerDependencies('/packs', results, manifests, ['@svadmin/core']);
  expect(dependencies).toHaveProperty('@svadmin/shared', 'file:/packs/shared.tgz');
  expect(dependencies).not.toHaveProperty('@svadmin/ai-elements');
});

test('missing local artifacts or manifests fail instead of dropping dependencies', () => {
  const { manifests, results } = fixture();
  results.delete('@svadmin/devtools-contract');
  expect(() => packedConsumerDependencies('/packs', results, manifests, ['@svadmin/ui']))
    .toThrow('@svadmin/devtools-contract: missing tarball');
  manifests.delete('@svadmin/core');
  expect(() => packedConsumerDependencies('/packs', results, manifests, ['@svadmin/ui']))
    .toThrow('@svadmin/core: missing manifest');
});

test('explicit consumer selections cannot leak workspace protocols', () => {
  const { manifests, results } = fixture();
  expect(() => packedConsumerDependencies('/packs', results, manifests, ['@svadmin/ui'], {
    '@svadmin/core': 'workspace:*',
  })).toThrow('cannot use workspace protocol');
});

test('publication replaces workspace shorthand but preserves versions, explicit ranges and peer metadata', () => {
  const manifest = {
    name: 'consumer',
    version: '4.5.6',
    dependencies: { a: 'workspace:*', external: '^9.0.0' },
    optionalDependencies: { a: 'workspace:~' },
    devDependencies: { a: 'workspace:^' },
    peerDependencies: { a: 'workspace:>=1.0.0 <2.0.0' },
    peerDependenciesMeta: { a: { optional: true } },
  };
  const original = structuredClone(manifest);
  expect(publishedWorkspaceManifest(manifest, new Map([['a', '1.2.3']]))).toEqual({
    ...manifest,
    dependencies: { a: '1.2.3', external: '^9.0.0' },
    optionalDependencies: { a: '~1.2.3' },
    devDependencies: { a: '^1.2.3' },
    peerDependencies: { a: '>=1.0.0 <2.0.0' },
  });
  expect(manifest).toEqual(original);
  expect(() => publishedWorkspaceManifest(manifest, new Map())).toThrow('unknown workspace dependency');
});

test('npm strict consumer installs actual local transitive tarballs and preserves peer constraints', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pack-closure-test-'));
  const { manifests, results } = fixture();
  // 使用无外网依赖的真实 tarball，验证消费清单能交给 npm，而不修改包内依赖。
  manifests.set('@svadmin/ui', {
    name: '@svadmin/ui',
    dependencies: { '@svadmin/devtools-contract': 'workspace:*' },
    peerDependencies: { '@svadmin/core': 'workspace:^' },
  });
  manifests.set('@svadmin/devtools-contract', {
    name: '@svadmin/devtools-contract',
    dependencies: { '@svadmin/shared': '1.0.0' },
  });
  manifests.set('@svadmin/shared', { name: '@svadmin/shared' });
  try {
    for (const [name, manifest] of manifests) {
      const artifact = results.get(name);
      expect(artifact).toBeDefined();
      if (!artifact) throw new Error(`missing test artifact: ${name}`);
      const source = join(directory, name.slice('@svadmin/'.length), 'package');
      await mkdir(source, { recursive: true });
      await writeFile(join(source, 'package.json'), JSON.stringify({ ...manifest, version: '1.0.0' }));
      const pack = spawnSync('tar', ['-czf', join(directory, artifact.filename), '-C', join(source, '..'), 'package']);
      expect(pack.status).toBe(0);
      const before = await readFile(join(source, 'package.json'), 'utf8');
      const staged = await stagePublishedPack(directory, {
        filename: artifact.filename, files: [{ path: 'package.json' }],
      }, new Map([...manifests.keys()].map((key) => [key, '1.0.0'])));
      results.set(name, staged);
      expect(await readFile(join(source, 'package.json'), 'utf8')).toBe(before);
    }
    const consumer = join(directory, 'consumer');
    await mkdir(consumer);
    await writeFile(join(consumer, 'package.json'), JSON.stringify({
      private: true,
      dependencies: packedConsumerDependencies(directory, results, manifests, ['@svadmin/ui']),
    }));
    const install = spawnSync('npm', [
      'install', '--offline', '--ignore-scripts', '--strict-peer-deps', '--no-audit', '--no-fund',
    ], { cwd: consumer, encoding: 'utf8', timeout: 20_000 });
    expect(install.status, install.stderr).toBe(0);
    const lock = JSON.parse(await readFile(join(consumer, 'package-lock.json'), 'utf8')) as {
      packages: Record<string, { resolved?: string; peerDependencies?: Record<string, string> }>;
    };
    for (const name of ['ui', 'core', 'devtools-contract', 'shared']) {
      expect(lock.packages[`node_modules/@svadmin/${name}`]?.resolved).toContain(`${name}-1.0.0.tgz`);
    }
    expect(lock.packages['node_modules/@svadmin/ui']?.peerDependencies).toEqual({
      '@svadmin/core': '^1.0.0',
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);
