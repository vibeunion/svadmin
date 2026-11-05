import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * 为「npm 上还不存在」的发布包发布一个占位版本。
 *
 * npm 的 OIDC trusted publishing 只能发布已经存在、且把本仓库配置成 trusted
 * publisher 的包。新包必须由有 scope 权限的账号手工发布一次。占位包用
 * `0.0.1` + `placeholder` dist-tag，不会成为 `latest`，等真正的版本发布后
 * 自动被取代。
 */

export const PLACEHOLDER_VERSION = '0.0.1';
export const PLACEHOLDER_TAG = 'placeholder';
export const NPM_REGISTRY = 'https://registry.npmjs.org/';

export interface PlaceholderCandidate {
  path: string;
  name: string;
  version: string;
}

export interface PlaceholderManifest {
  [key: string]: unknown;
  name: string;
  version: string;
  description: string;
  license: string;
  repository: { type: string; url: string; directory: string };
  homepage: string;
  bugs: { url: string };
  publishConfig: { access: 'public' };
  files: string[];
}

const repositoryUrl = 'git+https://github.com/vibeunion/svadmin.git';

export function placeholderManifest(candidate: PlaceholderCandidate): PlaceholderManifest {
  const directory = candidate.path;
  return {
    name: candidate.name,
    version: PLACEHOLDER_VERSION,
    description: `Placeholder for ${candidate.name}: the package is published from CI with npm trusted publishing. Install a released version instead.`,
    license: 'MIT',
    repository: { type: 'git', url: repositoryUrl, directory },
    homepage: `https://github.com/vibeunion/svadmin/tree/main/${directory}#readme`,
    bugs: { url: 'https://github.com/vibeunion/svadmin/issues' },
    publishConfig: { access: 'public' },
    files: ['package.json', 'README.md'],
  };
}

export function placeholderReadme(candidate: PlaceholderCandidate): string {
  return [
    `# ${candidate.name}`,
    '',
    'This version is a placeholder published only to register the package name and',
    'enable npm trusted publishing from CI. It contains no source code.',
    '',
    `Install a released version (\`>= ${candidate.version}\`) instead.`,
    '',
  ].join('\n');
}

export function releaseCandidates(repositoryRoot: string): PlaceholderCandidate[] {
  const config: unknown = JSON.parse(
    readFileSync(join(repositoryRoot, 'release-please-config.json'), 'utf8'),
  );
  const packages =
    config && typeof config === 'object' && !Array.isArray(config)
      ? (config as { packages?: unknown }).packages
      : undefined;
  if (!packages || typeof packages !== 'object' || Array.isArray(packages)) {
    throw new Error('release-please-config.json has no packages section');
  }
  return Object.keys(packages).flatMap((packagePath) => {
    const manifest: unknown = JSON.parse(
      readFileSync(join(repositoryRoot, packagePath, 'package.json'), 'utf8'),
    );
    const { name, version } = manifest as { name?: unknown; version?: unknown };
    return typeof name === 'string' && typeof version === 'string'
      ? [{ path: packagePath, name, version }]
      : [];
  });
}

interface RunCommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

type RunCommand = (command: string, args: string[], cwd?: string) => RunCommandResult;

const runCommand: RunCommand = (command, args, cwd = process.cwd()) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120_000,
    env: {
      ...process.env,
      ...(process.env.NPM_TOKEN ? { NODE_AUTH_TOKEN: process.env.NPM_TOKEN } : {}),
    },
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
};

export function packageNameExists(name: string, run: RunCommand = runCommand): boolean {
  const result = run('npm', ['view', name, 'version', '--registry', NPM_REGISTRY]);
  if (result.status === 0) return true;
  if (/E404/.test(result.stderr)) return false;
  throw new Error(`npm registry lookup failed for ${name}: ${result.stderr.trim()}`);
}

export interface PublishPlaceholdersOptions {
  repositoryRoot: string;
  dryRun?: boolean;
  candidates?: PlaceholderCandidate[];
  run?: RunCommand;
}

export interface PublishPlaceholdersResult {
  missing: PlaceholderCandidate[];
  published: string[];
}

export function publishPlaceholders({
  repositoryRoot,
  dryRun = true,
  candidates = releaseCandidates(repositoryRoot),
  run = runCommand,
}: PublishPlaceholdersOptions): PublishPlaceholdersResult {
  const missing = candidates.filter((candidate) => !packageNameExists(candidate.name, run));
  if (dryRun) return { missing, published: [] };

  const published: string[] = [];
  for (const candidate of missing) {
    const stagingDirectory = mkdtempSync(join(tmpdir(), 'svadmin-placeholder-'));
    try {
      writeFileSync(
        join(stagingDirectory, 'package.json'),
        `${JSON.stringify(placeholderManifest(candidate), null, 2)}\n`,
      );
      writeFileSync(join(stagingDirectory, 'README.md'), placeholderReadme(candidate));
      const result = run('npm', [
        'publish',
        '--registry',
        NPM_REGISTRY,
        '--access',
        'public',
        '--tag',
        PLACEHOLDER_TAG,
      ], stagingDirectory);
      if (result.status !== 0) {
        throw new Error(
          `npm publish failed for ${candidate.name}@${PLACEHOLDER_VERSION}: ${result.stderr.trim()}`,
        );
      }
      published.push(`${candidate.name}@${PLACEHOLDER_VERSION}`);
      console.info(`Published placeholder ${candidate.name}@${PLACEHOLDER_VERSION} (dist-tag: ${PLACEHOLDER_TAG})`);
    } finally {
      rmSync(stagingDirectory, { recursive: true, force: true });
    }
  }
  return { missing, published };
}

if (import.meta.main) {
  try {
    const dryRun = !process.argv.includes('--write');
    const result = publishPlaceholders({
      repositoryRoot: resolve(import.meta.dir, '..'),
      dryRun,
    });
    if (result.missing.length === 0) {
      console.info('Every release package already exists on npm');
    } else if (dryRun) {
      console.info('Packages that are not on npm yet:');
      for (const candidate of result.missing) {
        console.info(`  ${candidate.name} (real version ${candidate.version})`);
      }
      console.info('');
      console.info('Re-run with --write and valid npm credentials to publish placeholders:');
      console.info('  NPM_TOKEN=<scope-owner token> bun scripts/publish-npm-placeholders.ts --write');
      console.info('  # or: npm login && bun scripts/publish-npm-placeholders.ts --write');
    }
    for (const name of result.published) console.info(`published ${name}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}