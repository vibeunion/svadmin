import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface WorkspaceLockfileMismatch {
  path: string;
  name: string;
  packageVersion: string;
  lockfileName?: string;
  lockfileVersion?: string;
}

interface WorkspacePackageManifest {
  path: string;
  name: string;
  version: string;
}

const workspaceStartPattern = /^(?:\x20){4}("(?:[^"\\]|\\.)+"): \{\r?$/;

/**
 * bun.lock 不是严格 JSON（允许尾逗号），因此按行解析 workspaces 段的 name/version。
 * 这里只关心发布前的版本一致性，不做完整 lockfile 解析。
 */
export function readLockfileWorkspaceMetadata(
  lockfile: string,
): Map<string, { name?: string; version?: string }> {
  const lines = lockfile.split('\n');
  const workspaces = new Map<string, { name?: string; version?: string }>();
  let current: { name?: string; version?: string } | undefined;

  for (const line of lines) {
    const workspaceMatch = line.match(workspaceStartPattern);
    if (workspaceMatch) {
      const workspacePath = JSON.parse(workspaceMatch[1]) as string;
      current = {};
      workspaces.set(workspacePath, current);
      continue;
    }
    if (!current) continue;
    const nameMatch = line.match(/^(?:\x20){6}"name": ("(?:[^"\\]|\\.)+"),?\r?$/);
    if (nameMatch && current.name === undefined) {
      current.name = JSON.parse(nameMatch[1]) as string;
      continue;
    }
    const versionMatch = line.match(/^(?:\x20){6}"version": ("(?:[^"\\]|\\.)+"),?\r?$/);
    if (versionMatch && current.version === undefined) {
      current.version = JSON.parse(versionMatch[1]) as string;
    }
  }
  return workspaces;
}

function discoverWorkspaceManifests(repositoryRoot: string): WorkspacePackageManifest[] {
  const packagesDirectory = join(repositoryRoot, 'packages');
  if (!existsSync(packagesDirectory)) return [];
  return readdirSync(packagesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const manifestPath = join(packagesDirectory, entry.name, 'package.json');
      if (!existsSync(manifestPath)) return [];
      const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return [];
      const { name, version } = manifest as { name?: unknown; version?: unknown };
      return typeof name === 'string' && typeof version === 'string'
        ? [{ path: `packages/${entry.name}`, name, version }]
        : [];
    });
}

/**
 * 发布提交必须让 bun.lock 中记录的 workspace 版本与 package.json 一致。
 * 否则发布任务里的 `bun install` 会重写锁文件，旧版本又不会出现在 npm 上。
 */
export function verifyWorkspaceLockfile({
  repositoryRoot,
  lockfile,
}: {
  repositoryRoot: string;
  lockfile?: string;
}): WorkspaceLockfileMismatch[] {
  const resolvedRoot = resolve(repositoryRoot);
  const lockfileText = lockfile ?? readFileSync(join(resolvedRoot, 'bun.lock'), 'utf8');
  const workspaces = readLockfileWorkspaceMetadata(lockfileText);
  return discoverWorkspaceManifests(resolvedRoot).flatMap((manifest) => {
    const workspace = workspaces.get(manifest.path);
    if (workspace?.version === manifest.version && workspace.name === manifest.name) return [];
    return [{
      path: manifest.path,
      name: manifest.name,
      packageVersion: manifest.version,
      ...(workspace?.name === undefined ? {} : { lockfileName: workspace.name }),
      ...(workspace?.version === undefined ? {} : { lockfileVersion: workspace.version }),
    }];
  });
}

export function formatWorkspaceLockfileMismatches(
  mismatches: WorkspaceLockfileMismatch[],
): string[] {
  return mismatches.map((mismatch) => {
    const lockfileState = `lock=${mismatch.lockfileVersion ?? '<missing>'}`;
    const lockfileName = mismatch.lockfileName && mismatch.lockfileName !== mismatch.name
      ? ` lock-name=${mismatch.lockfileName}`
      : '';
    return `${mismatch.path} (${mismatch.name}) package.json=${mismatch.packageVersion} ${lockfileState}${lockfileName}`;
  });
}

if (import.meta.main) {
  try {
    const repositoryRoot = process.argv[2] ?? resolve(import.meta.dir, '..');
    const mismatches = verifyWorkspaceLockfile({ repositoryRoot });
    if (mismatches.length > 0) {
      for (const line of formatWorkspaceLockfileMismatches(mismatches)) {
        console.error(`bun.lock workspace version mismatch: ${line}`);
      }
      console.error('Run `bun install` and commit bun.lock before publishing.');
      process.exitCode = 1;
    } else {
      console.info('bun.lock workspace versions match every packages/*/package.json');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}