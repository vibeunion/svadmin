function stableVersion(version: string, label: string): string {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) ||
      version.split('.').some(part => !Number.isSafeInteger(Number(part)))) {
    throw new Error(`${label} must be an exact stable version: ${version}`);
  }
  return version;
}

/** 显式兼容性下限优先于机器人恢复的旧范围，但绝不放宽上界。 */
export function applyPeerMinimum(range: string, minimum?: string): string {
  if (minimum === undefined) return range;
  stableVersion(minimum, 'Peer minimum');
  const match = /^>=(\d+\.\d+\.\d+)\s+<(\d+\.\d+\.\d+)$/.exec(range);
  const lower = match?.[1];
  const upper = match?.[2];
  if (lower === undefined || upper === undefined) {
    throw new Error(`Cannot enforce a peer minimum on unbounded or unsupported range: ${range}`);
  }
  stableVersion(lower, 'Peer lower bound');
  stableVersion(upper, 'Peer upper bound');
  const effective = Bun.semver.satisfies(lower, `>=${minimum}`) ? lower : minimum;
  if (!Bun.semver.satisfies(effective, `<${upper}`)) {
    throw new Error(`Peer minimum ${effective} is outside upper bound ${upper}`);
  }
  return `>=${effective} <${upper}`;
}

/** 只在版本完全一致时验证候选包；后续版本仍须安装真正的最低版本。 */
export function minimumDependencySource(
  minimum: string,
  workspaceVersion: string | undefined,
  tarballPath: string,
): string {
  stableVersion(minimum, 'Compatibility minimum');
  if (workspaceVersion === undefined) throw new Error('Missing workspace package version');
  stableVersion(workspaceVersion, 'Workspace package version');
  if (!Bun.semver.satisfies(workspaceVersion, `>=${minimum}`)) {
    throw new Error(`Workspace version ${workspaceVersion} is below compatibility minimum ${minimum}`);
  }
  if (workspaceVersion !== minimum) return minimum;
  if (tarballPath.length === 0) throw new Error('Missing candidate tarball path');
  return `file:${tarballPath}`;
}
