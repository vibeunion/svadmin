import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isReleasePackagePath, type ReleaseManifestEntry } from './verify-release-manifest';

type JsonRecord = Record<string, unknown>;

export interface MissingRelease {
  path: string;
  tag: string;
  name: string;
  version: string;
  previousVersion?: string;
}

export interface ReconcileReleaseManifestResult {
  releaseManifest: ReleaseManifestEntry[];
  missingReleases: MissingRelease[];
}

export interface ReconcileReleaseManifestOptions {
  repositoryRoot: string;
  releaseSha: string;
  releaseManifest: string;
  readParentPackageManifest?: (packagePath: string) => JsonRecord | undefined;
  resolveTagSha?: (tag: string) => string | undefined;
}

interface ReleasePackageConfig {
  component?: unknown;
}

function readJsonRecord(path: string): JsonRecord {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected a JSON object in ${path}`);
  }
  return value as JsonRecord;
}

function defaultParentManifestReader(repositoryRoot: string, releaseSha: string) {
  return (packagePath: string): JsonRecord | undefined => {
    try {
      const json = execFileSync(
        'git',
        ['show', `${releaseSha}^:${packagePath}/package.json`],
        { cwd: repositoryRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      );
      return JSON.parse(json) as JsonRecord;
    } catch {
      return undefined;
    }
  };
}

function defaultTagResolver(repositoryRoot: string, tag: string): string | undefined {
  try {
    return execFileSync(
      'git',
      ['rev-parse', '--verify', '--quiet', '--end-of-options', `refs/tags/${tag}^{commit}`],
      { cwd: repositoryRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim() || undefined;
  } catch {
    return undefined;
  }
}

function packageVersion(manifest: JsonRecord, packagePath: string): string {
  const version = manifest.version;
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Invalid package version for ${packagePath}: ${String(version)}`);
  }
  return version;
}

function packageName(manifest: JsonRecord, packagePath: string): string {
  const name = manifest.name;
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error(`Invalid package name for ${packagePath}: ${String(name)}`);
  }
  return name;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertChangelogEntry(
  repositoryRoot: string,
  packagePath: string,
  component: string,
  version: string,
  previousVersion: string | undefined,
): void {
  const changelogPath = resolve(repositoryRoot, packagePath, 'CHANGELOG.md');
  let changelog: string;
  try {
    changelog = readFileSync(changelogPath, 'utf8');
  } catch {
    throw new Error(`${packagePath} is missing changelog entry for ${version}`);
  }

  const headingPattern = new RegExp(`^## \\[${escapeRegExp(version)}\\]\\(([^)]+)\\)`, 'm');
  const heading = changelog.match(headingPattern);
  const firstHeading = changelog.match(/^## \[[^\n]+\]\([^\n]+\)/m);
  if (!heading || !firstHeading || heading.index !== firstHeading.index) {
    throw new Error(`${packagePath} is missing changelog entry for ${version}`);
  }

  if (previousVersion) {
    const expectedCompare = `/compare/${component}-v${previousVersion}...${component}-v${version}`;
    if (!heading[1].includes(expectedCompare)) {
      throw new Error(`${packagePath} changelog entry for ${version} has an invalid compare link`);
    }
  }

  const contentStart = (heading.index ?? 0) + heading[0].length;
  const nextHeading = changelog.indexOf('\n## [', contentStart);
  const content = changelog.slice(contentStart, nextHeading < 0 ? undefined : nextHeading).trim();
  if (!content) {
    throw new Error(`${packagePath} changelog entry for ${version} has no content`);
  }
}

function parseRawManifest(releaseManifest: string): ReleaseManifestEntry[] {
  const parsed: unknown = JSON.parse(releaseManifest || '[]');
  if (!Array.isArray(parsed)) throw new Error('Invalid release manifest');

  const paths = new Set<string>();
  const tags = new Set<string>();
  return parsed.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Invalid release manifest entry: ${String(entry)}`);
    }
    const value = entry as JsonRecord;
    const path = value.path;
    const tag = value.tag;
    if (!isReleasePackagePath(path)) throw new Error(`Invalid release package path: ${String(path)}`);
    if (typeof tag !== 'string' || !/^[A-Za-z0-9._-]+$/.test(tag)) {
      throw new Error(`Invalid release tag: ${String(tag)}`);
    }
    if (paths.has(path)) throw new Error(`Duplicate release package path: ${path}`);
    if (tags.has(tag)) throw new Error(`Duplicate release tag: ${tag}`);
    paths.add(path);
    tags.add(tag);
    return { path, tag };
  });
}

export function reconcileReleaseManifest({
  repositoryRoot,
  releaseSha,
  releaseManifest,
  readParentPackageManifest = defaultParentManifestReader(repositoryRoot, releaseSha),
  resolveTagSha = (tag) => defaultTagResolver(repositoryRoot, tag),
}: ReconcileReleaseManifestOptions): ReconcileReleaseManifestResult {
  if (!/^[0-9a-f]{40,64}$/.test(releaseSha)) {
    throw new Error(`Invalid immutable release SHA: ${releaseSha}`);
  }

  const config = readJsonRecord(resolve(repositoryRoot, 'release-please-config.json'));
  const configuredPackages = config.packages;
  if (!configuredPackages || typeof configuredPackages !== 'object' || Array.isArray(configuredPackages)) {
    throw new Error('release-please-config.json has no package configuration');
  }
  const manifest = readJsonRecord(resolve(repositoryRoot, '.release-please-manifest.json'));
  const rawReleases = parseRawManifest(releaseManifest);
  const rawByPath = new Map(rawReleases.map((release) => [release.path, release]));
  const releases: ReleaseManifestEntry[] = [];
  const missingReleases: MissingRelease[] = [];
  const reconciledTags = new Set<string>();

  for (const [packagePath, rawConfig] of Object.entries(configuredPackages)) {
    if (!isReleasePackagePath(packagePath)) throw new Error(`Invalid release package path: ${packagePath}`);
    if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
      throw new Error(`Invalid release-please config for ${packagePath}`);
    }
    const component = (rawConfig as ReleasePackageConfig).component;
    if (typeof component !== 'string' || !/^[A-Za-z0-9._-]+$/.test(component)) {
      throw new Error(`Invalid release-please component for ${packagePath}: ${String(component)}`);
    }

    const currentManifest = readJsonRecord(resolve(repositoryRoot, packagePath, 'package.json'));
    const currentVersion = packageVersion(currentManifest, packagePath);
    if (manifest[packagePath] !== currentVersion) {
      throw new Error(
        `Release manifest version mismatch for ${packagePath}: expected ${String(manifest[packagePath])}, found ${currentVersion}`,
      );
    }
    const parentManifest = readParentPackageManifest(packagePath);
    const previousVersion = parentManifest ? packageVersion(parentManifest, packagePath) : undefined;
    const changed = previousVersion !== currentVersion;
    const rawRelease = rawByPath.get(packagePath);
    if (rawRelease && !changed) {
      throw new Error(`${packagePath} has no version delta in the first-parent release ${releaseSha}`);
    }
    if (!changed) continue;

    assertChangelogEntry(repositoryRoot, packagePath, component, currentVersion, previousVersion);
    const expectedTag = `${component}-v${currentVersion}`;
    if (rawRelease && rawRelease.tag !== expectedTag) {
      throw new Error(`Release tag ${rawRelease.tag} does not match ${packagePath}; expected ${expectedTag}`);
    }
    const release = { path: packagePath, tag: expectedTag };
    if (reconciledTags.has(expectedTag)) {
      throw new Error(`Duplicate release tag: ${expectedTag}`);
    }
    reconciledTags.add(expectedTag);
    releases.push(release);

    const tagSha = resolveTagSha(expectedTag);
    if (rawRelease && tagSha === undefined) {
      throw new Error(`Release tag does not exist: ${expectedTag}`);
    }
    if (!rawRelease) {
      missingReleases.push({
        ...release,
        name: packageName(currentManifest, packagePath),
        version: currentVersion,
        ...(previousVersion ? { previousVersion } : {}),
      });
    }
    if (tagSha !== undefined && tagSha !== releaseSha) {
      throw new Error(`Release tag ${expectedTag} points to ${tagSha}, expected ${releaseSha}`);
    }
  }

  for (const rawRelease of rawReleases) {
    if (!releases.some((release) => release.path === rawRelease.path)) {
      throw new Error(`${rawRelease.path} was reported by release-please but has no version delta`);
    }
  }
  if (releases.length === 0) throw new Error('No version-changed packages found for release');
  return { releaseManifest: releases, missingReleases };
}

if (import.meta.main) {
  const result = reconcileReleaseManifest({
    repositoryRoot: resolve(import.meta.dir, '..'),
    releaseSha: process.env.RELEASE_SHA ?? '',
    releaseManifest: process.env.RELEASE_MANIFEST ?? '[]',
  });
  console.info(JSON.stringify(result));
}
