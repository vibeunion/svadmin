import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

interface PackageManifest {
  name?: string;
  version?: string;
  peerDependencies?: Record<string, string>;
}

interface ReleasePleaseConfig {
  packages?: Record<string, unknown>;
}

interface SyncReleasePrOptions {
  repositoryRoot: string;
  baseRef: string;
  releaseDate?: string;
  readBaseFile?: (path: string) => string;
}

export interface SyncReleasePrResult {
  changedFiles: string[];
  bumpedPackages: string[];
  widenedPeers: string[];
}

interface PeerRangeRewrite {
  dependencyName: string;
  fromRange: string;
  generatedRange: string;
  synchronizedRange: string;
}

function parseVersion(version: string): [number, number, number] {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Unsupported package version: ${version}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function bumpPatch(version: string): string {
  const [major, minor, patch] = parseVersion(version);
  return `${major}.${minor}.${patch + 1}`;
}

function nextMinorUpperBound(version: string): string {
  const [major, minor] = parseVersion(version);
  return `${major}.${minor + 1}.0`;
}

export function widenPeerRange(range: string, targetVersion: string): string {
  if (Bun.semver.satisfies(targetVersion, range)) return range;

  const upperBound = /(^|\s)<\s*(\d+\.\d+\.\d+)(?=\s|$)/;
  if (!upperBound.test(range)) {
    throw new Error(`Cannot safely widen unbounded peer range ${range} for ${targetVersion}`);
  }

  const widened = range.replace(
    upperBound,
    (_match, prefix: string) => `${prefix}<${nextMinorUpperBound(targetVersion)}`,
  );
  if (!Bun.semver.satisfies(targetVersion, widened)) {
    throw new Error(`Widened peer range ${widened} still rejects ${targetVersion}`);
  }
  return widened;
}

function releaseChangelogEntry(
  packagePath: string,
  previousVersion: string,
  nextVersion: string,
  releaseDate: string,
  dependencies: string[],
): string {
  const component = basename(packagePath);
  const compareUrl =
    `https://github.com/vibeunion/svadmin/compare/` +
    `${component}-v${previousVersion}...${component}-v${nextVersion}`;
  const dependencyList = dependencies.map((name) => `\`${name}\``).join(', ');

  return [
    `## [${nextVersion}](${compareUrl}) (${releaseDate})`,
    '',
    '',
    '### Dependencies',
    '',
    `* Expand the verified peer compatibility range for ${dependencyList}.`,
    '',
  ].join('\n');
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function syncReleasePr(options: SyncReleasePrOptions): SyncReleasePrResult {
  const repositoryRoot = resolve(options.repositoryRoot);
  const config = readJson<ReleasePleaseConfig>(join(repositoryRoot, 'release-please-config.json'));
  const packagePaths = Object.keys(config.packages ?? {});
  const readBaseFile = options.readBaseFile ?? ((path) => {
    const result = Bun.spawnSync(['git', 'show', `${options.baseRef}:${path}`], {
      cwd: repositoryRoot,
      stderr: 'pipe',
      stdout: 'pipe',
    });
    if (result.exitCode !== 0) {
      throw new Error(
        `Cannot read ${path} from ${options.baseRef}: ${result.stderr.toString().trim()}`,
      );
    }
    return result.stdout.toString();
  });
  const releaseDate = options.releaseDate ?? new Date().toISOString().slice(0, 10);

  const currentPackages = new Map<string, { path: string; manifest: PackageManifest }>();
  const basePackages = new Map<string, PackageManifest>();
  for (const packagePath of packagePaths) {
    const manifest = readJson<PackageManifest>(join(repositoryRoot, packagePath, 'package.json'));
    if (!manifest.name || !manifest.version) {
      throw new Error(`${packagePath}/package.json must define name and version`);
    }
    currentPackages.set(manifest.name, { path: packagePath, manifest });
    basePackages.set(
      manifest.name,
      JSON.parse(readBaseFile(`${packagePath}/package.json`)) as PackageManifest,
    );
  }

  const releasedVersions = new Map<string, string>();
  for (const [name, current] of currentPackages) {
    const baseVersion = basePackages.get(name)?.version;
    const currentVersion = current.manifest.version;
    if (!currentVersion) throw new Error(`Missing current version for ${name}`);
    if (currentVersion !== baseVersion) {
      releasedVersions.set(name, currentVersion);
    }
  }

  const releaseManifestPath = '.release-please-manifest.json';
  const releaseManifest = readJson<Record<string, string>>(
    join(repositoryRoot, releaseManifestPath),
  );
  const changedFiles = new Set<string>();
  const changedPeers = new Map<string, Set<string>>();
  const peerRangeRewrites = new Map<string, Map<string, PeerRangeRewrite>>();
  const bumpedVersions = new Map<string, string>();

  let foundChanges = true;
  while (foundChanges) {
    foundChanges = false;
    for (const [name, current] of currentPackages) {
      const peers = current.manifest.peerDependencies;
      if (!peers) continue;

      for (const [dependencyName, range] of Object.entries(peers)) {
        const targetVersion = releasedVersions.get(dependencyName);
        const baseRange = basePackages.get(name)?.peerDependencies?.[dependencyName];
        if (!targetVersion || !baseRange || baseRange.startsWith('workspace:')) continue;

        const widened = widenPeerRange(baseRange, targetVersion);
        if (widened === range) continue;
        peers[dependencyName] = widened;
        const dependencyChanges = changedPeers.get(name) ?? new Set<string>();
        dependencyChanges.add(dependencyName);
        changedPeers.set(name, dependencyChanges);
        const packageRewrites = peerRangeRewrites.get(name) ?? new Map<string, PeerRangeRewrite>();
        packageRewrites.set(dependencyName, {
          dependencyName,
          fromRange: baseRange,
          generatedRange: range,
          synchronizedRange: widened,
        });
        peerRangeRewrites.set(name, packageRewrites);
        foundChanges = true;
      }

      const baseVersion = basePackages.get(name)?.version;
      if (changedPeers.has(name) && baseVersion && current.manifest.version === baseVersion) {
        const nextVersion = bumpPatch(baseVersion);
        current.manifest.version = nextVersion;
        releasedVersions.set(name, nextVersion);
        bumpedVersions.set(name, nextVersion);
        foundChanges = true;
      }
    }
  }

  for (const [name] of changedPeers) {
    const current = currentPackages.get(name);
    if (!current) throw new Error(`Missing current package for ${name}`);
    const packageJsonPath = `${current.path}/package.json`;
    writeJson(join(repositoryRoot, packageJsonPath), current.manifest);
    changedFiles.add(packageJsonPath);
  }

  const bumpedPackages: string[] = [];
  for (const [name, dependencies] of changedPeers) {
    const current = currentPackages.get(name);
    if (!current) throw new Error(`Missing current package for ${name}`);
    const baseVersion = basePackages.get(name)?.version;
    if (!baseVersion) throw new Error(`Missing base version for ${name}`);

    const nextVersion = bumpedVersions.get(name);
    if (nextVersion) {
      releaseManifest[current.path] = nextVersion;

      const changelogPath = join(repositoryRoot, current.path, 'CHANGELOG.md');
      const changelog = readFileSync(changelogPath, 'utf8');
      const entry = releaseChangelogEntry(
        current.path,
        baseVersion,
        nextVersion,
        releaseDate,
        [...dependencies],
      );
      writeFileSync(changelogPath, changelog.replace('# Changelog\n', `# Changelog\n\n${entry}`));

      changedFiles.add(`${current.path}/package.json`);
      changedFiles.add(`${current.path}/CHANGELOG.md`);
      bumpedPackages.push(`${name}@${nextVersion}`);
      continue;
    }

    const rewrites = peerRangeRewrites.get(name);
    if (rewrites) {
      const changelogPath = join(repositoryRoot, current.path, 'CHANGELOG.md');
      let changelog = readFileSync(changelogPath, 'utf8');
      for (const rewrite of rewrites.values()) {
        const generatedNote =
          `* ${rewrite.dependencyName} bumped from ${rewrite.fromRange} ` +
          `to ${rewrite.generatedRange}`;
        const synchronizedNote = rewrite.synchronizedRange === rewrite.fromRange
          ? `* ${rewrite.dependencyName} remains compatible with ${rewrite.synchronizedRange}`
          :
            `* ${rewrite.dependencyName} bumped from ${rewrite.fromRange} ` +
            `to ${rewrite.synchronizedRange}`;
        if (!changelog.includes(generatedNote)) {
          throw new Error(`Missing generated changelog note for ${name}: ${generatedNote}`);
        }
        changelog = changelog.replace(generatedNote, synchronizedNote);
      }
      writeFileSync(changelogPath, changelog);
      changedFiles.add(`${current.path}/CHANGELOG.md`);
    }
  }

  if (bumpedPackages.length > 0) {
    writeJson(join(repositoryRoot, releaseManifestPath), releaseManifest);
    changedFiles.add(releaseManifestPath);
  }

  return {
    changedFiles: [...changedFiles].sort(),
    bumpedPackages,
    widenedPeers: [...changedPeers].flatMap(([name, dependencies]) =>
      [...dependencies].map((dependency) => `${name} -> ${dependency}`),
    ),
  };
}

if (import.meta.main) {
  const baseRefIndex = process.argv.indexOf('--base-ref');
  const baseRef = baseRefIndex >= 0 ? process.argv[baseRefIndex + 1] : undefined;
  if (!baseRef) throw new Error('Usage: bun scripts/sync-release-pr.ts --base-ref <git-ref>');

  const result = syncReleasePr({ repositoryRoot: resolve(import.meta.dir, '..'), baseRef });
  console.info(JSON.stringify(result, null, 2));
}
