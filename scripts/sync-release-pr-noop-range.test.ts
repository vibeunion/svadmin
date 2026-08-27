import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncReleasePr } from './sync-release-pr';

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

test('describes an already-compatible restored peer range without a no-op bump note', () => {
  const root = mkdtempSync(join(tmpdir(), 'svadmin-release-pr-compatible-'));
  try {
    for (const packagePath of ['packages/ui', 'packages/surface']) {
      mkdirSync(join(root, packagePath), { recursive: true });
      writeFileSync(join(root, packagePath, 'CHANGELOG.md'), '# Changelog\n');
    }

    writeJson(join(root, 'release-please-config.json'), {
      packages: { 'packages/ui': {}, 'packages/surface': {} },
    });
    writeJson(join(root, '.release-please-manifest.json'), {
      'packages/ui': '0.53.1',
      'packages/surface': '0.3.6',
    });
    writeJson(join(root, 'packages/ui/package.json'), {
      name: '@svadmin/ui',
      version: '0.53.1',
    });
    writeJson(join(root, 'packages/surface/package.json'), {
      name: '@svadmin/surface',
      version: '0.3.6',
      peerDependencies: { '@svadmin/ui': '>=0.53.1' },
    });
    writeFileSync(
      join(root, 'packages/surface/CHANGELOG.md'),
      [
        '# Changelog',
        '',
        '* The following workspace dependencies were updated',
        '  * peerDependencies',
        '    * @svadmin/ui bumped from >=0.40.6 <0.54.0 to >=0.53.1',
        '',
      ].join('\n'),
    );

    const baseFiles: Record<string, string> = {
      'packages/ui/package.json': JSON.stringify({ name: '@svadmin/ui', version: '0.53.0' }),
      'packages/surface/package.json': JSON.stringify({
        name: '@svadmin/surface',
        version: '0.3.5',
        peerDependencies: { '@svadmin/ui': '>=0.40.6 <0.54.0' },
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
    expect(
      JSON.parse(readFileSync(join(root, 'packages/surface/package.json'), 'utf8'))
        .peerDependencies['@svadmin/ui'],
    ).toBe('>=0.40.6 <0.54.0');

    const changelog = readFileSync(join(root, 'packages/surface/CHANGELOG.md'), 'utf8');
    expect(changelog).toContain(
      '@svadmin/ui remains compatible with >=0.40.6 <0.54.0',
    );
    expect(changelog).not.toContain(
      '@svadmin/ui bumped from >=0.40.6 <0.54.0 to >=0.40.6 <0.54.0',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
