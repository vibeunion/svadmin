import {
  constants,
  copyFileSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import {
  assertJsonObject,
  assertStringRecord,
  type ScaffoldManifest,
} from './project-manifest';

export type DependencySection = 'dependencies' | 'devDependencies';
export type DoctorIssueKind = 'missing' | 'drift' | 'incompatible' | 'section';
export type UpgradeAction = 'add' | 'update' | 'move';

export interface MaintainedPackageJson {
  [key: string]: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface DoctorIssue {
  kind: DoctorIssueKind;
  packageName: string;
  expectedVersion: string;
  actualVersion?: string;
  expectedSection: DependencySection;
  actualSection?: DependencySection;
  action: string;
}

export interface DoctorReport {
  status: 'clean' | 'issues';
  exitCode: 0 | 1;
  issues: DoctorIssue[];
}

export interface UpgradeChange {
  action: UpgradeAction;
  packageName: string;
  from?: string;
  to: string;
  section: DependencySection;
  previousSection?: DependencySection;
}

export interface UpgradePlan {
  changes: UpgradeChange[];
  updatedPackageJson: MaintainedPackageJson;
}

export type UpgradeResult =
  | { wrote: false; backupPath: null; plan: UpgradePlan }
  | { wrote: true; backupPath: string; plan: UpgradePlan };

interface DesiredDependency {
  packageName: string;
  version: string;
  section: DependencySection;
}

interface DependencyState {
  canonicalVersion?: string;
  alternateVersion?: string;
  alternateSection: DependencySection;
}

interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

interface VersionInterval {
  minimum: SemanticVersion;
  maximumExclusive: SemanticVersion;
}

function parseDependencyMap(candidate: unknown, path: string): Record<string, string> | undefined {
  if (candidate === undefined) return undefined;
  assertStringRecord(candidate, path);
  return { ...candidate };
}

export function parseMaintainedPackageJson(packageJsonCandidate: unknown): MaintainedPackageJson {
  assertJsonObject(packageJsonCandidate, 'package.json');

  const packageJson: MaintainedPackageJson = structuredClone(packageJsonCandidate);
  const dependencies = parseDependencyMap(packageJsonCandidate.dependencies, 'package.json.dependencies');
  const devDependencies = parseDependencyMap(
    packageJsonCandidate.devDependencies,
    'package.json.devDependencies',
  );
  if (dependencies !== undefined) packageJson.dependencies = dependencies;
  if (devDependencies !== undefined) packageJson.devDependencies = devDependencies;
  return packageJson;
}

export function readMaintainedPackageJson(packagePath: string): MaintainedPackageJson {
  const parsed: unknown = JSON.parse(readFileSync(packagePath, 'utf8'));
  return parseMaintainedPackageJson(parsed);
}

function allProjectDependencies(project: MaintainedPackageJson): Record<string, string> {
  return { ...(project.dependencies ?? {}), ...(project.devDependencies ?? {}) };
}

function selectedDependencyPacks(
  project: MaintainedPackageJson,
  scaffold: ScaffoldManifest,
): Set<string> {
  const currentDependencies = allProjectDependencies(project);
  const directlySelectedPacks = new Set<string>();

  for (const [packName, pack] of Object.entries(scaffold.svadmin.dependencyPacks)) {
    const providerPackage = Object.keys(pack).find((packageName) => packageName.startsWith('@svadmin/'));
    if (providerPackage !== undefined && currentDependencies[providerPackage] !== undefined) {
      directlySelectedPacks.add(packName);
    }
  }

  const selectedPacks = new Set(directlySelectedPacks);
  const selections = [
    ...Object.values(scaffold.svadmin.dataProviders),
    ...Object.values(scaffold.svadmin.authProviders),
  ];
  for (const packs of selections) {
    if (packs.some((packName) => directlySelectedPacks.has(packName))) {
      for (const packName of packs) selectedPacks.add(packName);
    }
  }
  return selectedPacks;
}

function desiredDependencies(
  project: MaintainedPackageJson,
  scaffold: ScaffoldManifest,
): DesiredDependency[] {
  const desired = new Map<string, DesiredDependency>();
  for (const [packageName, version] of Object.entries(scaffold.dependencies)) {
    desired.set(packageName, { packageName, version, section: 'dependencies' });
  }
  for (const [packageName, version] of Object.entries(scaffold.devDependencies)) {
    desired.set(packageName, { packageName, version, section: 'devDependencies' });
  }
  for (const packName of selectedDependencyPacks(project, scaffold)) {
    const pack = scaffold.svadmin.dependencyPacks[packName];
    for (const [packageName, version] of Object.entries(pack)) {
      const existing = desired.get(packageName);
      if (existing !== undefined && (existing.version !== version || existing.section !== 'dependencies')) {
        throw new Error(`scaffold dependency ${packageName} has conflicting canonical locations or versions`);
      }
      desired.set(packageName, { packageName, version, section: 'dependencies' });
    }
  }
  return [...desired.values()];
}

function compareVersions(left: SemanticVersion, right: SemanticVersion): number {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

function parseSimpleInterval(branch: string): VersionInterval | null {
  const match = /^([~^]?)(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(branch.trim());
  if (!match) return null;

  const operator = match[1];
  const minimum: SemanticVersion = {
    major: Number(match[2]),
    minor: Number(match[3]),
    patch: Number(match[4]),
  };
  let maximumExclusive: SemanticVersion;
  if (operator === '^') {
    maximumExclusive = minimum.major > 0
      ? { major: minimum.major + 1, minor: 0, patch: 0 }
      : minimum.minor > 0
        ? { major: 0, minor: minimum.minor + 1, patch: 0 }
        : { major: 0, minor: 0, patch: minimum.patch + 1 };
  } else if (operator === '~') {
    maximumExclusive = { major: minimum.major, minor: minimum.minor + 1, patch: 0 };
  } else {
    maximumExclusive = { major: minimum.major, minor: minimum.minor, patch: minimum.patch + 1 };
  }
  return { minimum, maximumExclusive };
}

function parseSimpleRange(range: string): VersionInterval[] | null {
  const intervals = range.split('||').map(parseSimpleInterval);
  return intervals.some((interval) => interval === null)
    ? null
    : intervals.filter((interval): interval is VersionInterval => interval !== null);
}

function intervalsOverlap(left: VersionInterval, right: VersionInterval): boolean {
  return compareVersions(left.minimum, right.maximumExclusive) < 0 &&
    compareVersions(right.minimum, left.maximumExclusive) < 0;
}

export function rangesClearlyIncompatible(actual: string, expected: string): boolean {
  const actualIntervals = parseSimpleRange(actual);
  const expectedIntervals = parseSimpleRange(expected);
  if (actualIntervals === null || expectedIntervals === null) return false;
  return !actualIntervals.some((actualInterval) =>
    expectedIntervals.some((expectedInterval) => intervalsOverlap(actualInterval, expectedInterval)));
}

function alternateSection(section: DependencySection): DependencySection {
  return section === 'dependencies' ? 'devDependencies' : 'dependencies';
}

function dependencyState(
  project: MaintainedPackageJson,
  desired: DesiredDependency,
): DependencyState {
  const alternate = alternateSection(desired.section);
  return {
    canonicalVersion: project[desired.section]?.[desired.packageName],
    alternateVersion: project[alternate]?.[desired.packageName],
    alternateSection: alternate,
  };
}

function upgradeAction(instruction: string): string {
  return `${instruction} by running upgrade --write for this project`;
}

function missingDependencyIssue(desired: DesiredDependency): DoctorIssue {
  return {
    kind: 'missing',
    packageName: desired.packageName,
    expectedVersion: desired.version,
    expectedSection: desired.section,
    action: upgradeAction(`Add ${desired.packageName}@${desired.version} to ${desired.section}`),
  };
}

function misplacedDependencyIssue(
  desired: DesiredDependency,
  state: DependencyState,
): DoctorIssue {
  return {
    kind: 'section',
    packageName: desired.packageName,
    expectedVersion: desired.version,
    actualVersion: state.alternateVersion,
    expectedSection: desired.section,
    actualSection: state.alternateSection,
    action: upgradeAction(`Move ${desired.packageName} to ${desired.section}`),
  };
}

function versionDependencyIssue(
  desired: DesiredDependency,
  actualVersion: string,
): DoctorIssue {
  const kind: DoctorIssueKind = rangesClearlyIncompatible(actualVersion, desired.version)
    ? 'incompatible'
    : 'drift';
  return {
    kind,
    packageName: desired.packageName,
    expectedVersion: desired.version,
    actualVersion,
    expectedSection: desired.section,
    action: upgradeAction(`Update ${desired.packageName} from ${actualVersion} to ${desired.version}`),
  };
}

function duplicateDependencyIssue(
  desired: DesiredDependency,
  state: DependencyState,
): DoctorIssue {
  return {
    kind: 'section',
    packageName: desired.packageName,
    expectedVersion: desired.version,
    actualVersion: state.alternateVersion,
    expectedSection: desired.section,
    actualSection: state.alternateSection,
    action: upgradeAction(
      `Remove the duplicate ${desired.packageName} entry from ${state.alternateSection}`,
    ),
  };
}

function doctorIssueForDependency(
  project: MaintainedPackageJson,
  desired: DesiredDependency,
): DoctorIssue | null {
  const state = dependencyState(project, desired);
  if (state.canonicalVersion === undefined) {
    return state.alternateVersion === undefined
      ? missingDependencyIssue(desired)
      : misplacedDependencyIssue(desired, state);
  }
  if (state.canonicalVersion !== desired.version) {
    return versionDependencyIssue(desired, state.canonicalVersion);
  }
  return state.alternateVersion === undefined ? null : duplicateDependencyIssue(desired, state);
}

export function doctorProjectPackageJson(
  packageJsonCandidate: unknown,
  scaffold: ScaffoldManifest,
): DoctorReport {
  const project = parseMaintainedPackageJson(packageJsonCandidate);
  const issues = desiredDependencies(project, scaffold)
    .map((desired) => doctorIssueForDependency(project, desired))
    .filter((issue): issue is DoctorIssue => issue !== null);

  return issues.length === 0
    ? { status: 'clean', exitCode: 0, issues: [] }
    : { status: 'issues', exitCode: 1, issues };
}

function upgradeChangeForDependency(
  desired: DesiredDependency,
  state: DependencyState,
): UpgradeChange | null {
  if (state.canonicalVersion === undefined && state.alternateVersion === undefined) {
    return { action: 'add', packageName: desired.packageName, to: desired.version, section: desired.section };
  }
  if (state.canonicalVersion === undefined) {
    return {
      action: 'move',
      packageName: desired.packageName,
      from: state.alternateVersion,
      to: desired.version,
      section: desired.section,
      previousSection: state.alternateSection,
    };
  }
  if (state.canonicalVersion === desired.version && state.alternateVersion === undefined) return null;
  return {
    action: state.alternateVersion === undefined ? 'update' : 'move',
    packageName: desired.packageName,
    from: state.canonicalVersion,
    to: desired.version,
    section: desired.section,
    previousSection: state.alternateVersion === undefined ? undefined : state.alternateSection,
  };
}

function applyDesiredDependency(
  updatedPackageJson: MaintainedPackageJson,
  desired: DesiredDependency,
): void {
  const canonicalDependencies = updatedPackageJson[desired.section] ?? {};
  const otherSection = alternateSection(desired.section);
  const alternateDependencies = updatedPackageJson[otherSection] ?? {};
  canonicalDependencies[desired.packageName] = desired.version;
  updatedPackageJson[desired.section] = canonicalDependencies;
  updatedPackageJson[otherSection] = Object.fromEntries(
    Object.entries(alternateDependencies).filter(([packageName]) => packageName !== desired.packageName),
  );
}

export function planProjectUpgrade(
  packageJsonCandidate: unknown,
  scaffold: ScaffoldManifest,
): UpgradePlan {
  const project = parseMaintainedPackageJson(packageJsonCandidate);
  const updatedPackageJson = structuredClone(project);
  updatedPackageJson.dependencies = { ...(project.dependencies ?? {}) };
  updatedPackageJson.devDependencies = { ...(project.devDependencies ?? {}) };
  const changes: UpgradeChange[] = [];

  for (const desired of desiredDependencies(project, scaffold)) {
    const change = upgradeChangeForDependency(desired, dependencyState(updatedPackageJson, desired));
    if (change !== null) changes.push(change);
    applyDesiredDependency(updatedPackageJson, desired);
  }

  changes.sort((left, right) =>
    left.section.localeCompare(right.section) || left.packageName.localeCompare(right.packageName));
  return { changes, updatedPackageJson };
}

function timestampForBackup(date: Date): string {
  return date.toISOString().replace(/[-:.]/g, '');
}

function createBackup(packagePath: string, timestamp: string): string {
  for (let suffix = 0; suffix < 1000; suffix++) {
    const suffixText = suffix === 0 ? '' : `-${suffix}`;
    const backupPath = `${packagePath}.svadmin-backup-${timestamp}${suffixText}`;
    try {
      copyFileSync(packagePath, backupPath, constants.COPYFILE_EXCL);
      return backupPath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  throw new Error(`Unable to allocate a unique backup path for ${packagePath}`);
}

function writePackageJsonAtomically(
  packagePath: string,
  updatedPackageJson: MaintainedPackageJson,
  timestamp: string,
): void {
  const temporaryPath = `${packagePath}.svadmin-tmp-${process.pid}-${timestamp}`;
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(updatedPackageJson, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    renameSync(temporaryPath, packagePath);
  } catch (error) {
    try {
      unlinkSync(temporaryPath);
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') throw cleanupError;
    }
    throw error;
  }
}

export function planProjectPackageFileUpgrade(
  packagePath: string,
  scaffold: ScaffoldManifest,
): UpgradeResult {
  const project = readMaintainedPackageJson(packagePath);
  const plan = planProjectUpgrade(project, scaffold);
  return { wrote: false, backupPath: null, plan };
}

export function writeProjectPackageJsonUpgrade(
  packagePath: string,
  scaffold: ScaffoldManifest,
  backupDate: Date,
): UpgradeResult {
  const plannedUpgrade = planProjectPackageFileUpgrade(packagePath, scaffold);
  if (plannedUpgrade.plan.changes.length === 0) return plannedUpgrade;

  const timestamp = timestampForBackup(backupDate);
  const backupPath = createBackup(packagePath, timestamp);
  writePackageJsonAtomically(packagePath, plannedUpgrade.plan.updatedPackageJson, timestamp);
  return { wrote: true, backupPath, plan: plannedUpgrade.plan };
}
