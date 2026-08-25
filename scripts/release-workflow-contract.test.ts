import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { verifyReleaseManifest } from './verify-release-manifest';

const repositoryRoot = resolve(import.meta.dir, '..');

function readWorkflow(name: string): string {
  return readFileSync(resolve(repositoryRoot, '.github', 'workflows', name), 'utf8');
}

function readPackageJson(path = 'package.json'): {
  name?: string;
  version?: string;
  packageManager?: string;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
} {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), 'utf8'));
}

function findIncompatibleWorkspacePeers(dependencyName: string, dependencyVersion: string): string[] {
  return readdirSync(resolve(repositoryRoot, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const packageJson = readPackageJson(`packages/${entry.name}/package.json`);
      const peerRange = packageJson.peerDependencies?.[dependencyName];
      if (!peerRange || peerRange.startsWith('workspace:')) return [];

      return Bun.semver.satisfies(dependencyVersion, peerRange)
        ? []
        : [`${packageJson.name ?? entry.name}: ${peerRange}`];
    });
}

function readReleasePleaseConfig(): {
  packages: Record<string, { 'extra-files'?: unknown[] }>;
} {
  return JSON.parse(readFileSync(resolve(repositoryRoot, 'release-please-config.json'), 'utf8'));
}

describe('npm trusted-publishing workflow contract', () => {
  test('pins one Bun toolchain version across local development and CI', () => {
    const rootPackage = readPackageJson();
    const bunVersion = rootPackage.packageManager?.match(/^bun@(.+)$/)?.[1];
    expect(bunVersion).toBeDefined();

    const ciWorkflow = readWorkflow('ci.yml');
    const ciVersions = [...ciWorkflow.matchAll(/bun-version: "([^"]+)"/g)].map(
      ([, version]) => version,
    );
    expect(ciVersions).toEqual([bunVersion, bunVersion, bunVersion]);

    for (const packagePath of ['packages/core/package.json', 'packages/lite/package.json']) {
      expect(readPackageJson(packagePath).devDependencies?.['@types/bun']).toBe(`^${bunVersion}`);
    }
  });

  test('keeps current svadmin releases inside explicit workspace peer ranges', () => {
    for (const packagePath of ['packages/core/package.json', 'packages/ui/package.json']) {
      const dependencyPackage = readPackageJson(packagePath);
      if (!dependencyPackage.name || !dependencyPackage.version) {
        throw new Error(`${packagePath} must define a package name and version`);
      }

      expect(
        findIncompatibleWorkspacePeers(dependencyPackage.name, dependencyPackage.version),
      ).toEqual([]);
    }
  });

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
    expect(ciWorkflow).not.toContain('bootstrap_publish');
    expect(ciWorkflow).not.toContain('secrets.NPM_TOKEN');
    expect(ciWorkflow).toContain('npm publish --provenance --access public');
    expect(ciWorkflow).toContain('bun scripts/plan-release-publication.ts');
    expect(ciWorkflow).toContain('id: release_plan');
    expect(ciWorkflow).toContain('RELEASE_DIRS: ${{ steps.release_plan.outputs.paths }}');
    expect(ciWorkflow).toContain(
      "['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']",
    );
    expect(ciWorkflow).not.toContain('PUBLISH_FAILED=0');
    expect(ciWorkflow).not.toContain('|| echo ""');
    expect(ciWorkflow).toContain(
      'if ! NPM_STATUS=$(bun scripts/npm-package-version.ts "$NAME" "$LOCAL_VER"); then',
    );
    expect(ciWorkflow).toContain('if [ "$NPM_STATUS" = "missing" ]; then');
    expect(ciWorkflow).toContain('elif [ "$NPM_STATUS" = "published" ]; then');
    expect(ciWorkflow).toContain('require(process.argv[1])');
    expect(ciWorkflow).not.toContain("require('./$PKG_JSON')");

    const verifier = readFileSync(resolve(repositoryRoot, 'scripts', 'verify-release-manifest.ts'), 'utf8');
    expect(verifier).toContain('refs/tags/${tag}^{commit}');
  });

  test('rejects dependency resolution that changes the committed lockfile', () => {
    const ciWorkflow = readWorkflow('ci.yml');
    const allInstalls = ciWorkflow.match(/\bbun install\b/g) ?? [];
    const guardedInstalls =
      ciWorkflow.match(/bun install\n\s+git diff --exit-code -- bun\.lock/g) ?? [];

    expect(ciWorkflow).not.toContain('bun install --frozen-lockfile');
    expect(guardedInstalls).toHaveLength(3);
    expect(allInstalls).toHaveLength(guardedInstalls.length);
  });
});

describe('release-please scaffold synchronization', () => {
  const scaffoldManifestPath = '/packages/create-svadmin/scaffold-manifest.json';

  test('updates root-level create-svadmin ranges with each dependent package release', () => {
    const config = readReleasePleaseConfig();
    const expectedExtraFiles = [
      ['packages/core', '$.dependencies["@svadmin/core"]'],
      ['packages/ui', '$.dependencies["@svadmin/ui"]'],
      ['packages/simple-rest', '$.svadmin.dependencyPacks["simple-rest"]["@svadmin/simple-rest"]'],
      ['packages/supabase', '$.svadmin.dependencyPacks["supabase"]["@svadmin/supabase"]'],
      ['packages/graphql', '$.svadmin.dependencyPacks["graphql"]["@svadmin/graphql"]'],
    ] as const;

    for (const [packagePath, jsonpath] of expectedExtraFiles) {
      expect(config.packages[packagePath]['extra-files']).toContainEqual({
        type: 'json',
        path: scaffoldManifestPath,
        jsonpath,
      });
    }
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
