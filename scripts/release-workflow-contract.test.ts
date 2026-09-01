import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { verifyReleaseManifest } from './verify-release-manifest';

const repositoryRoot = resolve(import.meta.dir, '..');

function readWorkflow(name: string): string {
  return readFileSync(resolve(repositoryRoot, '.github', 'workflows', name), 'utf8');
}

interface ReleasePullRequest {
  number: number;
  base: { ref: string };
  head: { ref: string; repo?: { full_name: string } | null };
}

interface ReleasePrResolverResult {
  failures: string[];
  infos: string[];
  outputs: Record<string, string>;
  query?: Record<string, unknown>;
}

function readReleasePrResolverScript(): string {
  const workflow = Bun.YAML.parse(readWorkflow('release.yml')) as {
    jobs?: {
      'release-please'?: {
        steps?: Array<{ id?: string; with?: { script?: string } }>;
      };
    };
  };
  const script = workflow.jobs?.['release-please']?.steps?.find(
    (step) => step.id === 'release-pr',
  )?.with?.script;

  if (!script) throw new Error('release.yml must define the release-pr github-script step');
  return script;
}

async function runReleasePrResolver(
  pulls: ReleasePullRequest[],
): Promise<ReleasePrResolverResult> {
  const result: ReleasePrResolverResult = { failures: [], infos: [], outputs: {} };
  const list = () => undefined;
  const github = {
    rest: { pulls: { list } },
    paginate: async (endpoint: unknown, query: Record<string, unknown>) => {
      expect(endpoint).toBe(list);
      result.query = query;
      return pulls;
    },
  };
  const context = { repo: { owner: 'vibeunion', repo: 'svadmin' } };
  const core = {
    setFailed: (message: string) => result.failures.push(message),
    setOutput: (name: string, value: string) => {
      result.outputs[name] = value;
    },
    info: (message: string) => result.infos.push(message),
  };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
    ...args: string[]
  ) => (...values: unknown[]) => Promise<void>;

  await new AsyncFunction('github', 'context', 'core', readReleasePrResolverScript())(
    github,
    context,
    core,
  );
  return result;
}

function canonicalReleasePull(number: number): ReleasePullRequest {
  return {
    number,
    base: { ref: 'main' },
    head: {
      ref: 'release-please--branches--main',
      repo: { full_name: 'vibeunion/svadmin' },
    },
  };
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
  'changelog-sections': Array<{ type: string; hidden?: boolean }>;
  packages: Record<string, { component?: string; 'extra-files'?: unknown[] }>;
  plugins?: Array<{ type?: string; updatePeerDependencies?: boolean }>;
  'group-pull-request-title-pattern'?: string;
  'pull-request-title-pattern'?: string;
} {
  return JSON.parse(readFileSync(resolve(repositoryRoot, 'release-please-config.json'), 'utf8'));
}

function readReleasePleaseManifest(): Record<string, string> {
  return JSON.parse(readFileSync(resolve(repositoryRoot, '.release-please-manifest.json'), 'utf8'));
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

  test('keeps the published surface compatibility line aligned with its package version', () => {
    const surfacePackage = readPackageJson('packages/surface/package.json');
    const uiPackage = readPackageJson('packages/ui/package.json');
    const compatibility = JSON.parse(
      readFileSync(resolve(repositoryRoot, 'packages/surface/compatibility.json'), 'utf8'),
    ) as { surface?: string; minimumSupported?: { '@svadmin/ui'?: string } };
    const releaseLine = surfacePackage.version?.match(/^(\d+\.\d+)\./)?.[1];
    const uiVersion = uiPackage.version;
    const uiPeerRange = surfacePackage.peerDependencies?.['@svadmin/ui'];
    const minimumUiVersion = compatibility.minimumSupported?.['@svadmin/ui'];

    if (!uiVersion || !uiPeerRange || !minimumUiVersion) {
      throw new Error('Surface compatibility requires current, minimum, and peer UI versions');
    }
    const [uiMajor, uiMinor] = uiVersion.split('.').map(Number);
    const nextUiMinor = `${uiMajor}.${uiMinor + 1}.0`;

    expect(releaseLine).toBeDefined();
    expect(compatibility.surface).toBe(`${releaseLine}.x`);
    expect(Bun.semver.satisfies(minimumUiVersion, uiPeerRange)).toBe(true);
    expect(Bun.semver.satisfies(uiVersion, uiPeerRange)).toBe(true);
    expect(Bun.semver.satisfies(nextUiMinor, uiPeerRange)).toBe(false);
  });

  test('keeps the optional flow package in the release and publication chain', () => {
    const flowPackage = readPackageJson('packages/flow/package.json');
    const releaseConfig = readReleasePleaseConfig();
    const releaseManifest = readReleasePleaseManifest();

    expect(releaseConfig.packages['packages/flow']?.component).toBe('flow');
    expect(releaseManifest['packages/flow']).toBe(flowPackage.version);
  });

  test('keeps the AI Elements package in the release and scaffold chain', () => {
    const aiElementsPackage = readPackageJson('packages/ai-elements/package.json');
    const releaseConfig = readReleasePleaseConfig();
    const releaseManifest = readReleasePleaseManifest();

    expect(releaseConfig.packages['packages/ai-elements']?.component).toBe('ai-elements');
    expect(releaseManifest['packages/ai-elements']).toBe(aiElementsPackage.version);
  });

  test('continues publishing after a package failure and reports the aggregate result', () => {
    const ciWorkflow = readWorkflow('ci.yml');
    const publishStep = ciWorkflow.slice(ciWorkflow.indexOf('      - name: Publish released packages'));

    expect(publishStep).toContain('set -u');
    expect(publishStep).toContain('failed=0');
    expect(publishStep).toContain('failed=1');
    expect(publishStep).toContain('continue');
    expect(publishStep).toContain('One or more release packages failed to publish');
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

  test('reconciles version deltas before dispatching the immutable release manifest', () => {
    const releaseWorkflow = readWorkflow('release.yml');

    expect(releaseWorkflow).toContain('id: release-manifest');
    expect(releaseWorkflow).toContain('ref: ${{ steps.release-ref.outputs.sha }}');
    expect(releaseWorkflow).toContain('fetch-tags: true');
    expect(releaseWorkflow).toContain('bun scripts/reconcile-release-manifest.ts');
    expect(releaseWorkflow).toContain('steps.release-manifest.outputs.release_manifest');
    expect(releaseWorkflow).toContain('steps.release-manifest.outputs.missing_releases');
    expect(releaseWorkflow).toContain('github.rest.git.createRef');
    expect(releaseWorkflow).toContain("existingRef.data.object.type !== 'commit'");
    expect(releaseWorkflow).toContain('existingRef.data.object.sha !== releaseSha');
    expect(releaseWorkflow).toContain('github.rest.repos.createRelease');
    expect(releaseWorkflow).toContain('target_commitish: releaseSha');
  });

  test('synchronizes generated release pull request metadata without exposing the PAT to branch code', () => {
    const releaseWorkflow = readWorkflow('release.yml');

    expect(releaseWorkflow).toContain('group: release-please-${{ github.repository }}');
    expect(releaseWorkflow).toContain('cancel-in-progress: false');
    expect(releaseWorkflow).toContain('id: release-pr');
    expect(releaseWorkflow).toContain('uses: actions/github-script@v9');
    expect(releaseWorkflow).toContain("const branch = 'release-please--branches--main';");
    expect(releaseWorkflow).toContain('github.rest.pulls.list');
    expect(releaseWorkflow).toContain("if: steps.release-pr.outputs.branch != ''");
    expect(releaseWorkflow).not.toContain('steps.release.outputs.prs_created');
    expect(releaseWorkflow).not.toContain('steps.release.outputs.pr');
    expect(releaseWorkflow).toContain('bun-version: "1.4.0"');
    expect(releaseWorkflow).toContain('persist-credentials: false');
    expect(releaseWorkflow).toContain(
      'git checkout origin/main -- scripts/sync-release-pr.ts',
    );
    expect(releaseWorkflow).toContain('git checkout origin/main -- bun.lock');
    expect(releaseWorkflow).toContain(
      'bun scripts/sync-release-pr.ts --base-ref origin/main',
    );
    expect(releaseWorkflow).toContain('bun install --ignore-scripts');
    expect(releaseWorkflow).toContain('git add .release-please-manifest.json bun.lock');
    expect(releaseWorkflow).toContain('git commit --no-verify');
    expect(releaseWorkflow).toContain("steps.release-sync.outputs.changed == 'true'");
    expect(releaseWorkflow).toContain('RELEASE_PAT: ${{ secrets.RELEASE_PAT }}');
    expect(releaseWorkflow).toContain('core.hooksPath=/dev/null');
    expect(releaseWorkflow).toContain('push --no-verify');
    expect(releaseWorkflow).toContain('HEAD:${RELEASE_BRANCH}');
  });

  test('queries and resolves the only canonical open release pull request', async () => {
    const result = await runReleasePrResolver([canonicalReleasePull(316)]);

    expect(result.query).toEqual({
      owner: 'vibeunion',
      repo: 'svadmin',
      state: 'open',
      base: 'main',
      head: 'vibeunion:release-please--branches--main',
      per_page: 100,
    });
    expect(result.failures).toEqual([]);
    expect(result.outputs).toEqual({
      branch: 'release-please--branches--main',
      number: '316',
    });
  });

  test('leaves synchronization disabled when there is no open release pull request', async () => {
    const result = await runReleasePrResolver([]);

    expect(result.failures).toEqual([]);
    expect(result.outputs).toEqual({});
    expect(result.infos).toContain('No open release PR found');
  });

  test('fails closed when the release pull request query is ambiguous', async () => {
    const result = await runReleasePrResolver([
      canonicalReleasePull(316),
      canonicalReleasePull(319),
    ]);

    expect(result.failures).toEqual(['Expected at most one open release PR, found 2']);
    expect(result.outputs).toEqual({});
  });

  test('fails closed when the release pull request query returns a non-canonical result', async () => {
    const invalidPulls: ReleasePullRequest[] = [
      { ...canonicalReleasePull(316), base: { ref: 'next' } },
      {
        ...canonicalReleasePull(317),
        head: { ...canonicalReleasePull(317).head, ref: 'release-please--branches--next' },
      },
      {
        ...canonicalReleasePull(318),
        head: {
          ...canonicalReleasePull(318).head,
          repo: { full_name: 'someone/svadmin' },
        },
      },
    ];

    for (const pull of invalidPulls) {
      const result = await runReleasePrResolver([pull]);
      expect(result.failures).toEqual([
        'Release PR query returned 1 non-canonical result(s)',
      ]);
      expect(result.outputs).toEqual({});
    }
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

  test('uses a non-releasable commit type for merged release pull requests', () => {
    const config = readReleasePleaseConfig();

    expect(config['group-pull-request-title-pattern']).toBe('release: release ${branch}');
    expect(config['pull-request-title-pattern']).toStartWith('release${scope}:');
    expect(config['changelog-sections'].some((section) => section.type === 'release' && !section.hidden)).toBe(false);
  });

  test('updates root-level create-svadmin ranges with each dependent package release', () => {
    const config = readReleasePleaseConfig();
    const expectedExtraFiles = [
      ['packages/core', '$.dependencies["@svadmin/core"]'],
      ['packages/ai-elements', '$.dependencies["@svadmin/ai-elements"]'],
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

  test('propagates workspace dependency releases through the node package graph', () => {
    const config = readReleasePleaseConfig();

    expect(config.plugins).toContainEqual({
      type: 'node-workspace',
      updatePeerDependencies: true,
    });
  });
});
