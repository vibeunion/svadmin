import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncReleasePr, widenPeerRange } from './sync-release-pr';

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

test('widens only the explicit upper bound to the next minor', () => {
  expect(widenPeerRange('>=0.40.6 <0.52.0', '0.52.0')).toBe('>=0.40.6 <0.53.0');
  expect(widenPeerRange('>=0.40.6 <0.53.0', '0.52.1')).toBe('>=0.40.6 <0.53.0');
  expect(() => widenPeerRange('^0.51.0', '0.52.0')).toThrow('Cannot safely widen unbounded');
});

test('restores a compound peer range rewritten by the workspace plugin', () => {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-release-pr-plugin-'));
  try {
    for (const packagePath of ['packages/ui', 'packages/surface']) {
      mkdirSync(join(root, packagePath), { recursive: true });
      writeFileSync(join(root, packagePath, 'CHANGELOG.md'), '# Changelog\n');
    }
    writeJson(join(root, 'release-please-config.json'), {
      packages: { 'packages/ui': {}, 'packages/surface': {} },
    });
    writeJson(join(root, '.release-please-manifest.json'), {
      'packages/ui': '0.52.0',
      'packages/surface': '0.3.4',
    });
    writeJson(join(root, 'packages/ui/package.json'), {
      name: '@svadmin/ui',
      version: '0.52.0',
    });
    writeJson(join(root, 'packages/surface/package.json'), {
      name: '@svadmin/surface',
      version: '0.3.4',
      peerDependencies: { '@svadmin/ui': '>=0.52.0' },
    });
    writeFileSync(
      join(root, 'packages/surface/CHANGELOG.md'),
      [
        '# Changelog',
        '',
        '* The following workspace dependencies were updated',
        '  * peerDependencies',
        '    * @svadmin/ui bumped from >=0.40.6 <0.52.0 to >=0.52.0',
        '',
      ].join('\n'),
    );

    const baseFiles: Record<string, string> = {
      'packages/ui/package.json': JSON.stringify({ name: '@svadmin/ui', version: '0.51.0' }),
      'packages/surface/package.json': JSON.stringify({
        name: '@svadmin/surface',
        version: '0.3.3',
        peerDependencies: { '@svadmin/ui': '>=0.40.6 <0.52.0' },
      }),
    };
    const result = syncReleasePr({
      repositoryRoot: root,
      baseRef: 'origin/main',
      releaseDate: '2026-08-27',
      readBaseFile: (path: string) => baseFiles[path],
    });

    expect(result.bumpedPackages).toEqual([]);
    expect(result.widenedPeers).toEqual(['@svadmin/surface -> @svadmin/ui']);
    expect(result.changedFiles).toEqual([
      'packages/surface/CHANGELOG.md',
      'packages/surface/package.json',
    ]);
    expect(
      JSON.parse(readFileSync(join(root, 'packages/surface/package.json'), 'utf8'))
        .peerDependencies['@svadmin/ui'],
    ).toBe('>=0.40.6 <0.53.0');
    expect(readFileSync(join(root, 'packages/surface/CHANGELOG.md'), 'utf8')).toContain(
      '@svadmin/ui bumped from >=0.40.6 <0.52.0 to >=0.40.6 <0.53.0',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('bumps peer dependents transitively and records each package exactly once', () => {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-release-pr-'));
  try {
    for (const packagePath of ['packages/ui', 'packages/surface', 'packages/consumer']) {
      mkdirSync(join(root, packagePath), { recursive: true });
      writeFileSync(join(root, packagePath, 'CHANGELOG.md'), '# Changelog\n');
    }
    writeJson(join(root, 'release-please-config.json'), {
      packages: { 'packages/ui': {}, 'packages/surface': {}, 'packages/consumer': {} },
    });
    writeJson(join(root, '.release-please-manifest.json'), {
      'packages/ui': '0.51.0',
      'packages/surface': '0.3.3',
      'packages/consumer': '0.1.0',
    });
    writeJson(join(root, 'packages/ui/package.json'), {
      name: '@svadmin/ui',
      version: '0.52.0',
    });
    writeJson(join(root, 'packages/surface/package.json'), {
      name: '@svadmin/surface',
      version: '0.3.3',
      peerDependencies: { '@svadmin/ui': '>=0.40.6 <0.52.0' },
    });
    writeJson(join(root, 'packages/consumer/package.json'), {
      name: '@svadmin/consumer',
      version: '0.1.0',
      peerDependencies: { '@svadmin/surface': '>=0.3.0 <0.3.4' },
    });

    const baseFiles: Record<string, string> = {
      'packages/ui/package.json': JSON.stringify({ name: '@svadmin/ui', version: '0.51.0' }),
      'packages/surface/package.json': JSON.stringify({
        name: '@svadmin/surface',
        version: '0.3.3',
        peerDependencies: { '@svadmin/ui': '>=0.40.6 <0.52.0' },
      }),
      'packages/consumer/package.json': JSON.stringify({
        name: '@svadmin/consumer',
        version: '0.1.0',
        peerDependencies: { '@svadmin/surface': '>=0.3.0 <0.3.4' },
      }),
    };
    const options = {
      repositoryRoot: root,
      baseRef: 'origin/main',
      releaseDate: '2026-08-27',
      readBaseFile: (path: string) => baseFiles[path],
    };

    expect(syncReleasePr(options)).toEqual({
      changedFiles: [
        '.release-please-manifest.json',
        'packages/consumer/CHANGELOG.md',
        'packages/consumer/package.json',
        'packages/surface/CHANGELOG.md',
        'packages/surface/package.json',
      ],
      bumpedPackages: ['@svadmin/surface@0.3.4', '@svadmin/consumer@0.1.1'],
      widenedPeers: [
        '@svadmin/surface -> @svadmin/ui',
        '@svadmin/consumer -> @svadmin/surface',
      ],
    });
    expect(syncReleasePr(options)).toEqual({
      changedFiles: [],
      bumpedPackages: [],
      widenedPeers: [],
    });

    const surface = JSON.parse(
      readFileSync(join(root, 'packages/surface/package.json'), 'utf8'),
    );
    expect(surface.version).toBe('0.3.4');
    expect(surface.peerDependencies['@svadmin/ui']).toBe('>=0.40.6 <0.53.0');
    expect(readFileSync(join(root, 'packages/surface/CHANGELOG.md'), 'utf8')).toContain(
      'surface-v0.3.3...surface-v0.3.4',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("synchronizes surface compatibility line when surface package version changes", () => {
  const root = mkdtempSync(join(tmpdir(), "svadmin-release-pr-surface-line-"));
  try {
    for (const packagePath of ["packages/surface"]) {
      mkdirSync(join(root, packagePath), { recursive: true });
      writeFileSync(join(root, packagePath, "CHANGELOG.md"), "# Changelog\n");
    }
    writeJson(join(root, "release-please-config.json"), {
      packages: { "packages/surface": {} },
    });
    writeJson(join(root, ".release-please-manifest.json"), {
      "packages/surface": "0.4.0",
    });
    writeJson(join(root, "packages/surface/package.json"), {
      name: "@svadmin/surface",
      version: "0.4.0",
    });
    writeJson(join(root, "packages/surface/compatibility.json"), {
      surface: "0.3.x",
      minimumSupported: { "@svadmin/ui": "0.40.6" },
    });

    const baseFiles: Record<string, string> = {
      "packages/surface/package.json": JSON.stringify({
        name: "@svadmin/surface",
        version: "0.3.7",
      }),
    };
    const result = syncReleasePr({
      repositoryRoot: root,
      baseRef: "origin/main",
      releaseDate: "2026-08-27",
      readBaseFile: (path: string) => baseFiles[path],
    });

    expect(result.changedFiles).toContain("packages/surface/compatibility.json");
    expect(
      JSON.parse(readFileSync(join(root, "packages/surface/compatibility.json"), "utf8")).surface,
    ).toBe("0.4.x");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('synchronizes Bun lockfile workspace versions with release package manifests', () => {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-release-pr-lockfile-'));
  try {
    mkdirSync(join(root, 'packages/ui'), { recursive: true });
    writeFileSync(join(root, 'packages/ui/CHANGELOG.md'), '# Changelog\n');
    writeJson(join(root, 'release-please-config.json'), { packages: { 'packages/ui': {} } });
    writeJson(join(root, '.release-please-manifest.json'), { 'packages/ui': '0.55.0' });
    writeJson(join(root, 'packages/ui/package.json'), {
      name: '@svadmin/ui',
      version: '0.55.0',
    });
    writeFileSync(
      join(root, 'bun.lock'),
      [
        '{',
        '  "workspaces": {',
        '    "packages/ui": {',
        '      "name": "@svadmin/ui",',
        '      "version": "0.49.1",',
        '    },',
        '  },',
        '}',
        '',
      ].join('\n'),
    );

    const result = syncReleasePr({
      repositoryRoot: root,
      baseRef: 'origin/main',
      readBaseFile: () => JSON.stringify({ name: '@svadmin/ui', version: '0.54.0' }),
    });

    expect(result.changedFiles).toContain('bun.lock');
    expect(readFileSync(join(root, 'bun.lock'), 'utf8')).toContain('"version": "0.55.0"');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
