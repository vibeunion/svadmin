import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reconcileReleaseManifest } from './reconcile-release-manifest';

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

test('adds a version-changed package omitted by release-please', () => {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-reconcile-release-'));
  try {
    mkdirSync(join(root, 'packages/create-svadmin'), { recursive: true });
    writeJson(join(root, 'release-please-config.json'), {
      packages: {
        'packages/create-svadmin': { component: 'create-svadmin' },
      },
    });
    writeJson(join(root, '.release-please-manifest.json'), {
      'packages/create-svadmin': '0.16.11',
    });
    writeJson(join(root, 'packages/create-svadmin/package.json'), {
      name: '@svadmin/create',
      version: '0.16.11',
    });
    writeFileSync(
      join(root, 'packages/create-svadmin/CHANGELOG.md'),
      [
        '# Changelog',
        '',
        '## [0.16.11](https://github.com/vibeunion/svadmin/compare/create-svadmin-v0.16.10...create-svadmin-v0.16.11) (2026-08-27)',
        '',
        '### Dependencies',
        '',
        '* Synchronize generated project dependencies with current workspace releases.',
        '',
      ].join('\n'),
    );

    const result = reconcileReleaseManifest({
      repositoryRoot: root,
      releaseSha: 'a'.repeat(40),
      releaseManifest: '[]',
      readParentPackageManifest: () => ({
        name: '@svadmin/create',
        version: '0.16.10',
      }),
      resolveTagSha: () => undefined,
    });

    expect(result.releaseManifest).toEqual([
      {
        path: 'packages/create-svadmin',
        tag: 'create-svadmin-v0.16.11',
      },
    ]);
    expect(result.missingReleases).toEqual([
      {
        path: 'packages/create-svadmin',
        tag: 'create-svadmin-v0.16.11',
        name: '@svadmin/create',
        version: '0.16.11',
        previousVersion: '0.16.10',
      },
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed when a changed package has no matching changelog entry', () => {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-reconcile-release-'));
  try {
    mkdirSync(join(root, 'packages/lite'), { recursive: true });
    writeJson(join(root, 'release-please-config.json'), {
      packages: { 'packages/lite': { component: 'lite' } },
    });
    writeJson(join(root, '.release-please-manifest.json'), { 'packages/lite': '0.4.0' });
    writeJson(join(root, 'packages/lite/package.json'), { name: '@svadmin/lite', version: '0.4.0' });
    writeFileSync(join(root, 'packages/lite/CHANGELOG.md'), '# Changelog\n\n## [0.3.9](https://example.test)\n');

    expect(() => reconcileReleaseManifest({
      repositoryRoot: root,
      releaseSha: 'b'.repeat(40),
      releaseManifest: '[]',
      readParentPackageManifest: () => ({ name: '@svadmin/lite', version: '0.3.9' }),
      resolveTagSha: () => undefined,
    })).toThrow('missing changelog entry');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a release-please entry when the version did not change in the first-parent delta', () => {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-reconcile-release-'));
  try {
    mkdirSync(join(root, 'packages/lite'), { recursive: true });
    writeJson(join(root, 'release-please-config.json'), {
      packages: { 'packages/lite': { component: 'lite' } },
    });
    writeJson(join(root, '.release-please-manifest.json'), { 'packages/lite': '0.3.9' });
    writeJson(join(root, 'packages/lite/package.json'), { name: '@svadmin/lite', version: '0.3.9' });
    writeFileSync(join(root, 'packages/lite/CHANGELOG.md'), '# Changelog\n');

    expect(() => reconcileReleaseManifest({
      repositoryRoot: root,
      releaseSha: 'c'.repeat(40),
      releaseManifest: JSON.stringify([{ path: 'packages/lite', tag: 'lite-v0.3.9' }]),
      readParentPackageManifest: () => ({ name: '@svadmin/lite', version: '0.3.9' }),
      resolveTagSha: () => 'c'.repeat(40),
    })).toThrow('has no version delta');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a tag that exists at a different release SHA', () => {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-reconcile-release-'));
  try {
    mkdirSync(join(root, 'packages/lite'), { recursive: true });
    writeJson(join(root, 'release-please-config.json'), {
      packages: { 'packages/lite': { component: 'lite' } },
    });
    writeJson(join(root, '.release-please-manifest.json'), { 'packages/lite': '0.4.0' });
    writeJson(join(root, 'packages/lite/package.json'), { name: '@svadmin/lite', version: '0.4.0' });
    writeFileSync(join(root, 'packages/lite/CHANGELOG.md'), [
      '# Changelog', '',
      '## [0.4.0](https://github.com/vibeunion/svadmin/compare/lite-v0.3.9...lite-v0.4.0) (2026-08-28)',
      '', '### Fixes', '', '* Fix release metadata.', '',
    ].join('\n'));

    expect(() => reconcileReleaseManifest({
      repositoryRoot: root,
      releaseSha: 'd'.repeat(40),
      releaseManifest: JSON.stringify([{ path: 'packages/lite', tag: 'lite-v0.4.0' }]),
      readParentPackageManifest: () => ({ name: '@svadmin/lite', version: '0.3.9' }),
      resolveTagSha: () => 'e'.repeat(40),
    })).toThrow('points to');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('ignores unchanged packages omitted by release-please', () => {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-reconcile-release-'));
  try {
    for (const packageName of ['lite', 'ui']) {
      mkdirSync(join(root, `packages/${packageName}`), { recursive: true });
    }
    writeJson(join(root, 'release-please-config.json'), {
      packages: {
        'packages/lite': { component: 'lite' },
        'packages/ui': { component: 'ui' },
      },
    });
    writeJson(join(root, '.release-please-manifest.json'), {
      'packages/lite': '0.4.0',
      'packages/ui': '0.9.0',
    });
    writeJson(join(root, 'packages/lite/package.json'), { name: '@svadmin/lite', version: '0.4.0' });
    writeJson(join(root, 'packages/ui/package.json'), { name: '@svadmin/ui', version: '0.9.0' });
    writeFileSync(join(root, 'packages/lite/CHANGELOG.md'), [
      '# Changelog', '',
      '## [0.4.0](https://github.com/vibeunion/svadmin/compare/lite-v0.3.9...lite-v0.4.0) (2026-08-28)',
      '', '### Fixes', '', '* Fix release metadata.', '',
    ].join('\n'));
    writeFileSync(join(root, 'packages/ui/CHANGELOG.md'), '# Changelog\n\n## [0.9.0](https://example.test)\n');

    const result = reconcileReleaseManifest({
      repositoryRoot: root,
      releaseSha: 'f'.repeat(40),
      releaseManifest: JSON.stringify([{ path: 'packages/lite', tag: 'lite-v0.4.0' }]),
      readParentPackageManifest: (packagePath) => packagePath === 'packages/lite'
        ? { name: '@svadmin/lite', version: '0.3.9' }
        : { name: '@svadmin/ui', version: '0.9.0' },
      resolveTagSha: () => 'f'.repeat(40),
    });

    expect(result.releaseManifest).toEqual([{ path: 'packages/lite', tag: 'lite-v0.4.0' }]);
    expect(result.missingReleases).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed on duplicate release-please paths', () => {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-reconcile-release-'));
  try {
    writeJson(join(root, 'release-please-config.json'), { packages: {} });
    writeJson(join(root, '.release-please-manifest.json'), {});
    const duplicate = { path: 'packages/lite', tag: 'lite-v0.4.0' };

    expect(() => reconcileReleaseManifest({
      repositoryRoot: root,
      releaseSha: 'a'.repeat(40),
      releaseManifest: JSON.stringify([duplicate, duplicate]),
    })).toThrow('Duplicate release package path');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
