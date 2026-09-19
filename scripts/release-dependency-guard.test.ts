import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { planReleasePublication } from './plan-release-publication';

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'release-dependency-guard-'));
  const packages = {
    core: { name: '@svadmin/core', version: '0.53.0' },
    ui: { name: '@svadmin/ui', version: '0.73.0', peerDependencies: { '@svadmin/core': 'workspace:*' } },
    surface: {
      name: '@svadmin/surface', version: '0.9.0',
      peerDependencies: { '@svadmin/core': '>=0.53.0 <0.54.0', '@svadmin/ui': '>=0.73.0 <0.74.0' },
      svadmin: { peerMinimums: { '@svadmin/core': '0.53.0', '@svadmin/ui': '0.73.0' } },
    },
  };
  for (const [directory, manifest] of Object.entries(packages)) {
    mkdirSync(join(root, 'packages', directory), { recursive: true });
    writeFileSync(join(root, 'packages', directory, 'package.json'), JSON.stringify(manifest));
  }
  return root;
}

const surfaceOnly = JSON.stringify([{ path: 'packages/surface' }]);

test('orders explicit capability peers before Surface regardless of manifest order', () => {
  const root = fixture();
  try {
    const result = planReleasePublication({
      repositoryRoot: root,
      releaseManifest: JSON.stringify(['surface', 'ui', 'core'].map(name => ({ path: `packages/${name}` }))),
      isPackageVersionPublished: () => { throw new Error('No registry lookup is needed for this closed release'); },
    });
    expect(result).toEqual(['packages/core', 'packages/ui', 'packages/surface']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a per-package preflight rejects an unavailable peer and accepts published peers', () => {
  const root = fixture();
  try {
    expect(() => planReleasePublication({
      repositoryRoot: root, releaseManifest: surfaceOnly,
      isPackageVersionPublished: name => name !== '@svadmin/ui',
    })).toThrow('unpublished workspace package @svadmin/ui@0.73.0');
    expect(planReleasePublication({
      repositoryRoot: root, releaseManifest: surfaceOnly, isPackageVersionPublished: () => true,
    })).toEqual(['packages/surface']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a dependency candidate below the enforced capability range', () => {
  const root = fixture();
  try {
    writeFileSync(join(root, 'packages/ui/package.json'), JSON.stringify({ name: '@svadmin/ui', version: '0.72.0' }));
    expect(() => planReleasePublication({
      repositoryRoot: root, releaseManifest: surfaceOnly, isPackageVersionPublished: () => true,
    })).toThrow('does not satisfy capability peer');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a policy that is not enforced by the package peer range', () => {
  const root = fixture();
  try {
    writeFileSync(join(root, 'packages/surface/package.json'), JSON.stringify({
      name: '@svadmin/surface', version: '0.9.0',
      peerDependencies: { '@svadmin/ui': '>=0.40.6 <0.74.0' },
      svadmin: { peerMinimums: { '@svadmin/ui': '0.73.0' } },
    }));
    expect(() => planReleasePublication({
      repositoryRoot: root, releaseManifest: surfaceOnly, isPackageVersionPublished: () => true,
    })).toThrow('does not enforce its declared capability minimum');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.each([false, true])('actual publish shell honors dependency failure=%s without running real npm', failUi => {
  const root = fixture();
  try {
    const workflow = Bun.YAML.parse(readFileSync(resolve(import.meta.dir, '../.github/workflows/ci.yml'), 'utf8')) as {
      jobs: { publish: { steps: Array<{ name?: string; run?: string }> } };
    };
    const script = workflow.jobs.publish.steps.find(step => step.name === 'Publish released packages')?.run;
    if (script === undefined) throw new Error('Missing production publish shell');
    const bin = join(root, 'bin');
    mkdirSync(bin);
    const calls = join(root, 'calls');
    const receipt = join(root, 'ui-published');
    writeFileSync(calls, '');
    writeFileSync(join(bin, 'bun'), `#!/bin/sh
set -eu
case "$1" in
  scripts/npm-package-version.ts) printf 'missing\\n' ;;
  scripts/plan-release-publication.ts)
    case "$RELEASE_MANIFEST" in
      *packages/surface*) test -f "$UI_RECEIPT" ;;
      *) exit 0 ;;
    esac ;;
  *) echo 'Unexpected mock bun invocation' >&2; exit 91 ;;
esac
`, { mode: 0o755 });
    writeFileSync(join(bin, 'npm'), `#!/bin/sh
set -eu
test "$*" = 'publish --provenance --access public'
name=$(basename "$PWD")
printf '%s\\n' "$name" >> "$PUBLISH_CALLS"
if [ "$name" = 'ui' ]; then
  if [ "$FAIL_UI" = 'true' ]; then exit 1; fi
  : > "$UI_RECEIPT"
fi
`, { mode: 0o755 });
    const result = Bun.spawnSync(['bash', '-c', script], {
      cwd: root, stdout: 'pipe', stderr: 'pipe', timeout: 5000,
      env: {
        ...process.env, PATH: `${bin}:${process.env.PATH ?? ''}`,
        RELEASE_DIRS: 'packages/core\npackages/ui\npackages/surface',
        PUBLISH_CALLS: calls, UI_RECEIPT: receipt, FAIL_UI: String(failUi),
      },
    });
    expect(result.exitCode).toBe(failUi ? 1 : 0);
    expect(readFileSync(calls, 'utf8').trim().split('\n')).toEqual(failUi ? ['core', 'ui'] : ['core', 'ui', 'surface']);
    if (failUi) expect(result.stdout.toString()).toContain('Release dependencies not published for @svadmin/surface@0.9.0');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
