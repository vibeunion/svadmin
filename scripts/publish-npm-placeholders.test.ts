import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  PLACEHOLDER_TAG,
  PLACEHOLDER_VERSION,
  packageNameExists,
  placeholderManifest,
  placeholderReadme,
  publishPlaceholders,
  releaseCandidates,
  type PlaceholderCandidate,
} from './publish-npm-placeholders';

const charts: PlaceholderCandidate = {
  path: 'packages/charts',
  name: '@svadmin/charts',
  version: '0.2.0',
};

const dock: PlaceholderCandidate = {
  path: 'packages/dock',
  name: '@svadmin/dock',
  version: '0.2.0',
};

function createRepositoryFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-placeholders-'));
  writeFileSync(
    join(root, 'release-please-config.json'),
    JSON.stringify({
      packages: {
        'packages/charts': { 'release-type': 'node' },
        'packages/dock': { 'release-type': 'node' },
      },
    }),
  );
  for (const candidate of [charts, dock]) {
    mkdirSync(join(root, candidate.path), { recursive: true });
    writeFileSync(
      join(root, candidate.path, 'package.json'),
      JSON.stringify({ name: candidate.name, version: candidate.version }),
    );
  }
  return root;
}

function fakeRegistry(existing: string[]) {
  const published: Array<{ args: string[]; cwd?: string }> = [];
  return {
    published,
    run: (command: string, args: string[], cwd?: string) => {
      if (args[0] === 'view') {
        return existing.includes(args[1])
          ? { status: 0, stdout: '0.1.0\n', stderr: '' }
          : { status: 1, stdout: '', stderr: 'npm error code E404' };
      }
      published.push({ args, cwd });
      return { status: 0, stdout: 'published\n', stderr: '' };
    },
  };
}

describe('npm placeholder publication', () => {
  test('derives release candidates from the release-please config', () => {
    const root = createRepositoryFixture();
    try {
      expect(releaseCandidates(root)).toEqual([charts, dock]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('treats only E404 as a missing package name', () => {
    const missing = () => ({ status: 1, stdout: '', stderr: 'npm error code E404' });
    expect(packageNameExists('@svadmin/charts', missing)).toBe(false);
    expect(() =>
      packageNameExists('@svadmin/charts', () => ({ status: 1, stdout: '', stderr: 'EAI_AGAIN' })),
    ).toThrow('npm registry lookup failed for @svadmin/charts');
  });

  test('reports missing packages without publishing during a dry run', () => {
    const registry = fakeRegistry(['@svadmin/dock']);
    const result = publishPlaceholders({
      repositoryRoot: '/unused',
      candidates: [charts, dock],
      dryRun: true,
      run: registry.run,
    });

    expect(result.missing.map((candidate) => candidate.name)).toEqual(['@svadmin/charts']);
    expect(result.published).toEqual([]);
    expect(registry.published).toHaveLength(0);
  });

  test('publishes only missing packages under the placeholder dist-tag', () => {
    const registry = fakeRegistry(['@svadmin/dock']);
    const result = publishPlaceholders({
      repositoryRoot: '/unused',
      candidates: [charts, dock],
      dryRun: false,
      run: registry.run,
    });

    expect(result.published).toEqual([`@svadmin/charts@${PLACEHOLDER_VERSION}`]);
    expect(registry.published).toHaveLength(1);
    expect(registry.published[0].args).toContain('--tag');
    expect(registry.published[0].args).toContain(PLACEHOLDER_TAG);
    expect(registry.published[0].args).toContain('--access');
  });

  test('keeps placeholders off the latest dist-tag and below the real version', () => {
    const manifest = placeholderManifest(charts);

    expect(PLACEHOLDER_TAG).not.toBe('latest');
    expect(Bun.semver.order(PLACEHOLDER_VERSION, charts.version)).toBe(-1);
    expect(manifest.name).toBe('@svadmin/charts');
    expect(manifest.version).toBe(PLACEHOLDER_VERSION);
    expect(manifest.publishConfig.access).toBe('public');
    expect(manifest.repository.directory).toBe('packages/charts');
    expect(placeholderReadme(charts)).toContain('placeholder');
  });
});