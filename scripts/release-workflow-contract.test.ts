import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { verifyReleaseManifest } from './verify-release-manifest';

const repositoryRoot = resolve(import.meta.dir, '..');

function readWorkflow(name: string): string {
  return readFileSync(resolve(repositoryRoot, '.github', 'workflows', name), 'utf8');
}

describe('npm trusted-publishing workflow contract', () => {
  test('dispatches ci.yml as the top-level publishing workflow', () => {
    const releaseWorkflow = readWorkflow('release.yml');

    expect(releaseWorkflow).toContain('trigger-publish:');
    expect(releaseWorkflow).toContain('uses: actions/github-script@v9');
    expect(releaseWorkflow).toContain('actions: write');
    expect(releaseWorkflow).toContain("workflow_id: 'ci.yml'");
    expect(releaseWorkflow).toContain('const releaseSha = process.env.RELEASE_SHA;');
    expect(releaseWorkflow).toContain('const releaseManifest = process.env.RELEASE_MANIFEST;');
    expect(releaseWorkflow).toContain('release_sha: releaseSha');
    expect(releaseWorkflow).toContain('release_manifest: releaseManifest');
    expect(releaseWorkflow).toContain("publish: 'true'");
    expect(releaseWorkflow).not.toContain('uses: ./.github/workflows/ci.yml');
  });

  test('publishes only from an explicit ci.yml workflow dispatch using OIDC', () => {
    const ciWorkflow = readWorkflow('ci.yml');

    expect(ciWorkflow).toContain('workflow_dispatch:');
    expect(ciWorkflow).not.toContain('workflow_call:');
    expect(ciWorkflow).toContain('e2e_sha:');
    expect(ciWorkflow).toContain('Invalid E2E SHA');
    expect(ciWorkflow).toContain('ref: ${{ inputs.e2e_sha || inputs.release_sha || github.sha }}');
    expect(ciWorkflow).toContain('always() &&');
    expect(ciWorkflow).toContain(
      "github.event_name == 'workflow_dispatch' && inputs.publish && inputs.release_sha != ''",
    );
    expect(ciWorkflow).toContain('run: bun scripts/verify-release-manifest.ts');
    expect(ciWorkflow).toContain('ref: ${{ github.sha }}');
    expect(ciWorkflow).toContain('ref: ${{ inputs.release_sha }}');
    expect(ciWorkflow).toContain('group: npm-publish-${{ inputs.release_sha }}');
    expect(ciWorkflow).toContain('id-token: write');
    expect(ciWorkflow).not.toContain('secrets.NPM_TOKEN');

    const verifier = readFileSync(resolve(repositoryRoot, 'scripts', 'verify-release-manifest.ts'), 'utf8');
    expect(verifier).toContain('refs/tags/${tag}^{commit}');
  });
});

describe('release manifest verification', () => {
  const releaseSha = '45efb89dbae552c8d618982a8766085a40947f3f';

  function createRepositoryFixture(): string {
    const root = mkdtempSync(join(tmpdir(), 'svadmin-release-manifest-'));
    mkdirSync(join(root, 'packages', 'lite'), { recursive: true });
    writeFileSync(
      join(root, 'release-please-config.json'),
      JSON.stringify({ packages: { 'packages/lite': { component: 'lite' } } }),
    );
    writeFileSync(
      join(root, 'packages', 'lite', 'package.json'),
      JSON.stringify({ name: '@svadmin/lite', version: '0.3.9' }),
    );
    return root;
  }

  test('accepts the release-please tag matching the package path and version', () => {
    const root = createRepositoryFixture();
    try {
      expect(
        verifyReleaseManifest({
          repositoryRoot: root,
          releaseSha,
          releaseManifest: JSON.stringify([{ path: 'packages/lite', tag: 'lite-v0.3.9' }]),
          resolveTagSha: () => releaseSha,
        }),
      ).toEqual([{ path: 'packages/lite', tag: 'lite-v0.3.9' }]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects a valid tag belonging to a different package path', () => {
    const root = createRepositoryFixture();
    try {
      expect(() =>
        verifyReleaseManifest({
          repositoryRoot: root,
          releaseSha,
          releaseManifest: JSON.stringify([{ path: 'packages/lite', tag: 'ui-v0.38.2' }]),
          resolveTagSha: () => releaseSha,
        }),
      ).toThrow('Release tag ui-v0.38.2 does not match packages/lite; expected lite-v0.3.9');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
