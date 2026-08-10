import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ReleaseManifestEntry {
  path: string;
  tag: string;
}

interface VerifyReleaseManifestOptions {
  repositoryRoot: string;
  releaseSha: string;
  releaseManifest: string;
  resolveTagSha?: (tag: string) => string;
}

type JsonRecord = Record<string, unknown>;

export function isReleasePackagePath(packagePath: unknown): packagePath is string {
  return typeof packagePath === 'string' && /^packages\/[a-z0-9][a-z0-9._-]*$/.test(packagePath);
}

function readJsonRecord(path: string): JsonRecord {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected a JSON object in ${path}`);
  }
  return value as JsonRecord;
}

function defaultTagResolver(repositoryRoot: string, tag: string): string {
  return execFileSync(
    'git',
    ['rev-parse', '--verify', '--quiet', '--end-of-options', `refs/tags/${tag}^{commit}`],
    { cwd: repositoryRoot, encoding: 'utf8' },
  ).trim();
}

export function verifyReleaseManifest({
  repositoryRoot,
  releaseSha,
  releaseManifest,
  resolveTagSha = (tag) => defaultTagResolver(repositoryRoot, tag),
}: VerifyReleaseManifestOptions): ReleaseManifestEntry[] {
  if (!/^[0-9a-f]{40,64}$/.test(releaseSha)) {
    throw new Error(`Invalid immutable release SHA: ${releaseSha}`);
  }

  const parsedManifest: unknown = JSON.parse(releaseManifest || '[]');
  if (!Array.isArray(parsedManifest) || parsedManifest.length === 0) {
    throw new Error('release-please returned no release manifest');
  }

  const releaseConfig = readJsonRecord(resolve(repositoryRoot, 'release-please-config.json'));
  const configuredPackages = releaseConfig.packages;
  if (!configuredPackages || typeof configuredPackages !== 'object' || Array.isArray(configuredPackages)) {
    throw new Error('release-please-config.json has no package configuration');
  }

  const releases: ReleaseManifestEntry[] = [];
  const seenPaths = new Set<string>();
  const seenTags = new Set<string>();

  for (const rawRelease of parsedManifest) {
    if (!rawRelease || typeof rawRelease !== 'object' || Array.isArray(rawRelease)) {
      throw new Error(`Invalid release manifest entry: ${String(rawRelease)}`);
    }

    const release = rawRelease as JsonRecord;
    const packagePath = release.path;
    const tag = release.tag;
    if (!isReleasePackagePath(packagePath)) {
      throw new Error(`Invalid release package path: ${String(packagePath)}`);
    }
    if (typeof tag !== 'string' || !/^[A-Za-z0-9._-]+$/.test(tag)) {
      throw new Error(`Invalid release tag: ${String(tag)}`);
    }
    if (seenPaths.has(packagePath)) {
      throw new Error(`Duplicate release package path: ${packagePath}`);
    }
    if (seenTags.has(tag)) {
      throw new Error(`Duplicate release tag: ${tag}`);
    }
    seenPaths.add(packagePath);
    seenTags.add(tag);

    const packageReleaseConfig = (configuredPackages as JsonRecord)[packagePath];
    if (!packageReleaseConfig || typeof packageReleaseConfig !== 'object' || Array.isArray(packageReleaseConfig)) {
      throw new Error(`Package is not configured for release-please: ${packagePath}`);
    }
    const component = (packageReleaseConfig as JsonRecord).component;
    if (typeof component !== 'string' || !/^[A-Za-z0-9._-]+$/.test(component)) {
      throw new Error(`Invalid release-please component for ${packagePath}: ${String(component)}`);
    }

    const packageManifest = readJsonRecord(resolve(repositoryRoot, packagePath, 'package.json'));
    const version = packageManifest.version;
    if (typeof version !== 'string' || version.length === 0) {
      throw new Error(`Invalid package version for ${packagePath}: ${String(version)}`);
    }
    const expectedTag = `${component}-v${version}`;
    if (tag !== expectedTag) {
      throw new Error(`Release tag ${tag} does not match ${packagePath}; expected ${expectedTag}`);
    }

    let tagSha: string;
    try {
      tagSha = resolveTagSha(tag);
    } catch {
      throw new Error(`Release tag does not exist: ${tag}`);
    }
    if (tagSha !== releaseSha) {
      throw new Error(`Release tag ${tag} points to ${tagSha}, expected ${releaseSha}`);
    }

    releases.push({ path: packagePath, tag });
  }

  return releases;
}

if (import.meta.main) {
  const repositoryRoot = resolve(import.meta.dir, '..');
  const releases = verifyReleaseManifest({
    repositoryRoot,
    releaseSha: process.env.RELEASE_SHA ?? '',
    releaseManifest: process.env.RELEASE_MANIFEST ?? '[]',
  });
  console.info(`Verified ${releases.length} release tag(s) at ${process.env.RELEASE_SHA}`);
}
