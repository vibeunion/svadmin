import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { applyPeerMinimum, minimumDependencySource } from './surface-release-policy';
import { syncReleasePr } from './sync-release-pr';

test('preserves existing synchronization when no explicit minimum is declared', () => {
  expect(applyPeerMinimum('>=0.40.6 <0.74.0')).toBe('>=0.40.6 <0.74.0');
});

test('raises only the peer floor and never lowers a stricter existing floor', () => {
  expect(applyPeerMinimum('>=0.40.6 <0.74.0', '0.73.0')).toBe('>=0.73.0 <0.74.0');
  expect(applyPeerMinimum('>=0.73.1 <0.74.0', '0.73.0')).toBe('>=0.73.1 <0.74.0');
});

test.each(['>=0.40.6', '^0.73.0', '>=0.40.6 <0.74.0 || >=1.0.0'])(
  'refuses unsupported peer range %s', range => {
    expect(() => applyPeerMinimum(range, '0.73.0')).toThrow('unsupported range');
  },
);

test.each(['0.74.0', '0.75.0'])('rejects unsatisfiable peer floor %s', minimum => {
  expect(() => applyPeerMinimum('>=0.40.6 <0.74.0', minimum)).toThrow('outside upper bound');
});

test.each(['^0.73.0', '0.73', '0.73.0-beta.1', '00.73.0', ''])('rejects inexact minimum %s', minimum => {
  expect(() => applyPeerMinimum('>=0.40.6 <0.74.0', minimum)).toThrow('exact stable version');
});

test('selects the actual candidate tarball only at the exact declared minimum', () => {
  expect(minimumDependencySource('0.73.0', '0.73.0', '/tmp/ui.tgz')).toBe('file:/tmp/ui.tgz');
  expect(minimumDependencySource('0.73.0', '0.73.1', '/tmp/ui.tgz')).toBe('0.73.0');
  expect(minimumDependencySource('0.73.0', '0.74.0', '/tmp/ui.tgz')).toBe('0.73.0');
});

test('fails closed for older, missing and inexact workspace package versions', () => {
  expect(() => minimumDependencySource('0.73.0', '0.72.0', '/tmp/ui.tgz')).toThrow('below compatibility');
  expect(() => minimumDependencySource('0.73.0', undefined, '/tmp/ui.tgz')).toThrow('Missing workspace');
  expect(() => minimumDependencySource('0.73.0', '0.73.0-beta.1', '/tmp/ui.tgz')).toThrow('exact stable');
  expect(() => minimumDependencySource('0.73.0', '0.73.0', '')).toThrow('Missing candidate');
});

test('release synchronization retains an explicit capability floor and is idempotent', () => {
  const root = mkdtempSync(join(tmpdir(), 'surface-release-floor-'));
  const writeJson = (path: string, value: unknown) => {
    writeFileSync(join(root, path), `${JSON.stringify(value, null, 2)}\n`);
  };
  try {
    for (const directory of ['ui', 'surface']) {
      mkdirSync(join(root, 'packages', directory), { recursive: true });
      writeFileSync(join(root, 'packages', directory, 'CHANGELOG.md'), '# Changelog\n');
    }
    writeJson('release-please-config.json', { packages: { 'packages/ui': {}, 'packages/surface': {} } });
    writeJson('.release-please-manifest.json', { 'packages/ui': '0.73.0', 'packages/surface': '0.9.0' });
    writeJson('packages/ui/package.json', { name: '@svadmin/ui', version: '0.73.0' });
    writeJson('packages/surface/package.json', {
      name: '@svadmin/surface', version: '0.9.0',
      peerDependencies: { '@svadmin/ui': '>=0.73.0' },
      svadmin: { peerMinimums: { '@svadmin/ui': '0.73.0' } },
    });
    writeFileSync(join(root, 'packages/surface/CHANGELOG.md'),
      '# Changelog\n\n* @svadmin/ui bumped from >=0.40.6 <0.73.0 to >=0.73.0\n');
    const baseFiles: Record<string, string> = {
      'packages/ui/package.json': JSON.stringify({ name: '@svadmin/ui', version: '0.72.0' }),
      'packages/surface/package.json': JSON.stringify({
        name: '@svadmin/surface', version: '0.8.19',
        peerDependencies: { '@svadmin/ui': '>=0.40.6 <0.73.0' },
      }),
    };
    const options = {
      repositoryRoot: root, baseRef: 'fixture', releaseDate: '2026-09-20',
      readBaseFile: (path: string) => {
        const content = baseFiles[path];
        if (content === undefined) throw new Error(`Missing fixture ${path}`);
        return content;
      },
    };
    const first = syncReleasePr(options);
    expect(first.widenedPeers).toEqual(['@svadmin/surface -> @svadmin/ui']);
    const manifest = JSON.parse(readFileSync(join(root, 'packages/surface/package.json'), 'utf8')) as {
      peerDependencies: Record<string, string>;
    };
    expect(manifest.peerDependencies['@svadmin/ui']).toBe('>=0.73.0 <0.74.0');
    expect(syncReleasePr(options)).toEqual({ changedFiles: [], bumpedPackages: [], widenedPeers: [] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Surface publishes one explicit minimum for the readonly and interactive entrypoints', () => {
  const root = resolve(import.meta.dir, '..');
  const manifest = JSON.parse(readFileSync(join(root, 'packages/surface/package.json'), 'utf8')) as {
    peerDependencies: Record<string, string>;
    svadmin: { peerMinimums: Record<string, string> };
  };
  const compatibility = JSON.parse(readFileSync(join(root, 'packages/surface/compatibility.json'), 'utf8')) as {
    minimumSupported: Record<string, string>;
    minimumSupportedAppliesTo: string[];
    entrypointCompatibility: Record<string, { minimumRequiredUi?: string; status?: string }>;
  };
  for (const [name, minimum, rejected] of [
    ['@svadmin/core', '0.53.0', '0.34.2'],
    ['@svadmin/ui', '0.73.0', '0.40.6'],
    ['svelte', '5.56.10', '5.56.8'],
  ] as const) {
    const range = manifest.peerDependencies[name];
    if (range === undefined) throw new Error(`Missing peer ${name}`);
    expect(compatibility.minimumSupported[name]).toBe(minimum);
    expect(Bun.semver.satisfies(minimum, range)).toBe(true);
    expect(Bun.semver.satisfies(rejected, range)).toBe(false);
    if (name !== 'svelte') expect(manifest.svadmin.peerMinimums[name]).toBe(minimum);
  }
  expect(compatibility.minimumSupportedAppliesTo).toEqual(['.', './svelte', './interactive']);
  expect(compatibility.entrypointCompatibility['./interactive']?.minimumRequiredUi).toBe('0.73.0');
  expect(compatibility.entrypointCompatibility['./interactive']?.status).toBe('experimental');
});
