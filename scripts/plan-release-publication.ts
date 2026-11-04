import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { isReleasePackagePath } from './verify-release-manifest';
import { npmPackageVersionStatus } from './npm-package-version';

interface PackageManifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface WorkspacePackage {
  path: string;
  manifest: PackageManifest;
}

interface WorkspaceIndex {
  packagesByPath: Map<string, WorkspacePackage>;
  packagesByName: Map<string, WorkspacePackage>;
}

interface PlanReleasePublicationOptions {
  repositoryRoot: string;
  releaseManifest: string;
  isPackageVersionPublished?: (name: string, version: string) => boolean;
  /**
   * 把「npm 上还没有的版本」并入发布计划。release-please 打完 tag 之后若发布任务失败，
   * 下一次发布可以自动补齐历史缺口，而不是永久缺失一个版本。
   */
  includeMissingVersions?: boolean;
}

interface DependencyClosureContext {
  releasePathSet: Set<string>;
  packagesByName: Map<string, WorkspacePackage>;
  isPackageVersionPublished: (name: string, version: string) => boolean;
  publicationLookups: Map<string, boolean>;
}

const dependencySections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

function readPackageManifest(path: string): PackageManifest {
  const parsedManifest: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!parsedManifest || typeof parsedManifest !== 'object' || Array.isArray(parsedManifest)) {
    throw new Error(`Expected a package manifest object in ${path}`);
  }

  const manifest = parsedManifest as Partial<PackageManifest>;
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
    throw new Error(`Package manifest has no valid name: ${path}`);
  }
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error(`Package manifest has no valid version: ${path}`);
  }
  return manifest as PackageManifest;
}

function discoverWorkspacePackages(repositoryRoot: string): WorkspacePackage[] {
  const packagesDirectory = resolve(repositoryRoot, 'packages');
  if (!existsSync(packagesDirectory)) {
    throw new Error(`Workspace packages directory does not exist: ${packagesDirectory}`);
  }

  return readdirSync(packagesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const packagePath = `packages/${entry.name}`;
      const manifestPath = join(packagesDirectory, entry.name, 'package.json');
      return existsSync(manifestPath)
        ? [{ path: packagePath, manifest: readPackageManifest(manifestPath) }]
        : [];
    });
}

function releasePathFromManifestEntry(manifestEntry: unknown): string {
  const packagePath =
    manifestEntry && typeof manifestEntry === 'object' && !Array.isArray(manifestEntry)
      ? (manifestEntry as Record<string, unknown>).path
      : undefined;
  if (!isReleasePackagePath(packagePath)) {
    throw new Error(`Invalid release package path: ${String(packagePath)}`);
  }
  return packagePath;
}

function parseReleasePaths(releaseManifest: string, allowEmpty = false): string[] {
  const parsedManifest: unknown = JSON.parse(releaseManifest || '[]');
  if (!Array.isArray(parsedManifest)) {
    throw new Error('release-please returned an invalid release manifest');
  }
  if (parsedManifest.length === 0) {
    if (allowEmpty) return [];
    throw new Error('release-please returned no release manifest');
  }

  const releasePaths: string[] = [];
  const seenPaths = new Set<string>();
  for (const manifestEntry of parsedManifest) {
    const packagePath = releasePathFromManifestEntry(manifestEntry);
    if (seenPaths.has(packagePath)) {
      throw new Error(`Duplicate release package path: ${packagePath}`);
    }
    seenPaths.add(packagePath);
    releasePaths.push(packagePath);
  }
  return releasePaths;
}

function defaultIsPackageVersionPublished(name: string, version: string): boolean {
  return npmPackageVersionStatus({ name, version }) === 'published';
}

function dependencyEntries(
  manifest: PackageManifest,
  section: (typeof dependencySections)[number],
): Array<[string, string]> {
  const dependencies: unknown = manifest[section];
  if (dependencies === undefined) return [];
  if (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)) {
    throw new Error(`${manifest.name} has an invalid ${section} section`);
  }
  return Object.entries(dependencies).map(([name, version]) => {
    if (typeof version !== 'string') {
      throw new Error(`${manifest.name} has an invalid ${section} version for ${name}`);
    }
    return [name, version];
  });
}

function workspaceDependencyNames(manifest: PackageManifest): string[] {
  const names = new Set<string>();
  for (const section of dependencySections) {
    for (const [name, version] of dependencyEntries(manifest, section)) {
      if (version.startsWith('workspace:')) {
        names.add(name);
      }
    }
  }
  return [...names];
}

function indexWorkspacePackages(workspacePackages: WorkspacePackage[]): WorkspaceIndex {
  const packagesByPath = new Map<string, WorkspacePackage>();
  const packagesByName = new Map<string, WorkspacePackage>();
  for (const workspacePackage of workspacePackages) {
    const existingPackage = packagesByName.get(workspacePackage.manifest.name);
    if (existingPackage) {
      throw new Error(
        `Duplicate workspace package name ${workspacePackage.manifest.name}: ${existingPackage.path}, ${workspacePackage.path}`,
      );
    }
    packagesByPath.set(workspacePackage.path, workspacePackage);
    packagesByName.set(workspacePackage.manifest.name, workspacePackage);
  }
  return { packagesByPath, packagesByName };
}

function assertDependencyPublished(
  releasePackage: WorkspacePackage,
  dependencyPackage: WorkspacePackage,
  context: DependencyClosureContext,
): void {
  const lookupKey = `${dependencyPackage.manifest.name}@${dependencyPackage.manifest.version}`;
  let isPublished = context.publicationLookups.get(lookupKey);
  if (isPublished === undefined) {
    isPublished = context.isPackageVersionPublished(
      dependencyPackage.manifest.name,
      dependencyPackage.manifest.version,
    );
    context.publicationLookups.set(lookupKey, isPublished);
  }
  if (!isPublished) {
    throw new Error(
      `${releasePackage.manifest.name}@${releasePackage.manifest.version} depends on unpublished workspace package ${lookupKey}; include ${dependencyPackage.path} in the release manifest or publish that version first`,
    );
  }
}

function releasedDependencyPath(
  releasePackage: WorkspacePackage,
  dependencyName: string,
  context: DependencyClosureContext,
): string | undefined {
  const dependencyPackage = context.packagesByName.get(dependencyName);
  if (!dependencyPackage) {
    throw new Error(
      `${releasePackage.manifest.name}@${releasePackage.manifest.version} references missing workspace package ${dependencyName}`,
    );
  }
  if (context.releasePathSet.has(dependencyPackage.path)) return dependencyPackage.path;
  assertDependencyPublished(releasePackage, dependencyPackage, context);
  return undefined;
}

function releaseDependencies(
  releasePackage: WorkspacePackage,
  context: DependencyClosureContext,
): Set<string> {
  const dependencyPaths = workspaceDependencyNames(releasePackage.manifest).flatMap((dependencyName) => {
    const dependencyPath = releasedDependencyPath(releasePackage, dependencyName, context);
    return dependencyPath ? [dependencyPath] : [];
  });
  return new Set(dependencyPaths);
}

function releaseDependencyGraph(
  releasePaths: string[],
  packagesByPath: Map<string, WorkspacePackage>,
  context: DependencyClosureContext,
): Map<string, Set<string>> {
  return new Map(releasePaths.map((releasePath) => {
    const releasePackage = packagesByPath.get(releasePath);
    if (!releasePackage) {
      throw new Error(`Release package manifest not found: ${releasePath}/package.json`);
    }
    return [releasePath, releaseDependencies(releasePackage, context)];
  }));
}

function nextPublishablePath(
  releasePaths: string[],
  publishedPaths: Set<string>,
  dependenciesByReleasePath: Map<string, Set<string>>,
): string | undefined {
  return releasePaths.find(
    (releasePath) =>
      !publishedPaths.has(releasePath) &&
      [...(dependenciesByReleasePath.get(releasePath) ?? [])].every((dependencyPath) =>
        publishedPaths.has(dependencyPath),
      ),
  );
}

function orderReleasePaths(
  releasePaths: string[],
  dependenciesByReleasePath: Map<string, Set<string>>,
): string[] {
  const orderedPaths: string[] = [];
  const publishedPaths = new Set<string>();
  while (orderedPaths.length < releasePaths.length) {
    const nextPath = nextPublishablePath(releasePaths, publishedPaths, dependenciesByReleasePath);
    if (!nextPath) {
      const remainingPaths = releasePaths.filter((releasePath) => !publishedPaths.has(releasePath));
      throw new Error(`Circular workspace dependencies in release manifest: ${remainingPaths.join(', ')}`);
    }
    orderedPaths.push(nextPath);
    publishedPaths.add(nextPath);
  }
  return orderedPaths;
}

function configuredReleasePaths(repositoryRoot: string): string[] {
  const configPath = resolve(repositoryRoot, 'release-please-config.json');
  if (!existsSync(configPath)) return [];
  const config: unknown = JSON.parse(readFileSync(configPath, 'utf8'));
  const packages =
    config && typeof config === 'object' && !Array.isArray(config)
      ? (config as { packages?: unknown }).packages
      : undefined;
  if (!packages || typeof packages !== 'object' || Array.isArray(packages)) return [];
  return Object.keys(packages).filter((packagePath) => isReleasePackagePath(packagePath));
}

/** 当前仓库版本尚未出现在 npm 上的发布包路径。 */
export function discoverMissingReleasePaths({
  repositoryRoot,
  releasePaths = configuredReleasePaths(repositoryRoot),
  isPackageVersionPublished = defaultIsPackageVersionPublished,
}: {
  repositoryRoot: string;
  releasePaths?: string[];
  isPackageVersionPublished?: (name: string, version: string) => boolean;
}): string[] {
  const { packagesByPath } = indexWorkspacePackages(discoverWorkspacePackages(repositoryRoot));
  return releasePaths.filter((releasePath) => {
    const workspacePackage = packagesByPath.get(releasePath);
    if (!workspacePackage) return false;
    return !isPackageVersionPublished(workspacePackage.manifest.name, workspacePackage.manifest.version);
  });
}

export function planReleasePublication({
  repositoryRoot,
  releaseManifest,
  isPackageVersionPublished = defaultIsPackageVersionPublished,
  includeMissingVersions = false,
}: PlanReleasePublicationOptions): string[] {
  const plannedReleasePaths = parseReleasePaths(releaseManifest, includeMissingVersions);
  const releasePaths = includeMissingVersions
    ? [...new Set([
        ...plannedReleasePaths,
        ...discoverMissingReleasePaths({
          repositoryRoot,
          isPackageVersionPublished,
        }),
      ])]
    : plannedReleasePaths;
  if (releasePaths.length === 0) {
    throw new Error('release publication plan is empty');
  }
  const { packagesByPath, packagesByName } = indexWorkspacePackages(
    discoverWorkspacePackages(repositoryRoot),
  );
  const closureContext: DependencyClosureContext = {
    releasePathSet: new Set(releasePaths),
    packagesByName,
    isPackageVersionPublished,
    publicationLookups: new Map(),
  };
  const dependencyGraph = releaseDependencyGraph(releasePaths, packagesByPath, closureContext);
  return orderReleasePaths(releasePaths, dependencyGraph);
}

if (import.meta.main) {
  try {
    const includeMissingVersions =
      process.argv.includes('--include-missing') || process.env.RELEASE_INCLUDE_MISSING === 'true';
    const releasePaths = planReleasePublication({
      repositoryRoot: resolve(import.meta.dir, '..'),
      releaseManifest: process.env.RELEASE_MANIFEST ?? '[]',
      includeMissingVersions,
    });
    for (const releasePath of releasePaths) {
      console.info(releasePath);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
