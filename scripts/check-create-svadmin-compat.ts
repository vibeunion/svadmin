import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  AUTH_PROVIDER_CHOICES,
  DATA_PROVIDER_CHOICES,
  assertJsonObject,
  assertNonEmptyString,
  assertStringRecord,
  createProjectPackageJson,
  loadScaffoldManifest,
  type AuthProviderChoice,
  type DataProviderChoice,
  type ProjectPackageJson,
} from '../packages/create-svadmin/src/project-manifest';

interface PackageManifest {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
}

interface GeneratedProject {
  label: string;
  dataProvider: DataProviderChoice;
  authProvider: AuthProviderChoice;
  manifest: ProjectPackageJson;
}

interface WorkspaceManifests {
  byName: Map<string, PackageManifest>;
  core: PackageManifest;
  aiElements: PackageManifest;
  ui: PackageManifest;
  simpleRest: PackageManifest;
  supabase: PackageManifest;
  graphql: PackageManifest;
}

interface CompatibilityContext {
  repositoryRoot: string;
  rootManifest: PackageManifest;
  exampleManifest: PackageManifest;
  workspace: WorkspaceManifests;
}

interface ExactDependencyExpectation {
  label: string;
  dependencies: Record<string, string>;
  packageName: string;
  expectedVersion: string | undefined;
}

export interface CompatibilityCheckOptions {
  scaffoldManifestPath?: string;
}

const workspaceProviderByChoice = {
  'simple-rest': '@svadmin/simple-rest',
  supabase: '@svadmin/supabase',
  graphql: '@svadmin/graphql',
  none: null,
} as const;

// These are the upstream peer contracts for the Refine provider majors selected
// by scaffold-manifest.json. Keep them explicit so one svadmin provider package
// cannot accidentally become the version source for every other provider.
const refineCorePeerByProvider = {
  '@refinedev/simple-rest': '^5.0.0',
  '@refinedev/supabase': '^5.0.0',
  '@refinedev/graphql': '^5.0.0',
} as const;

const toolchainPackageNames = [
  '@sveltejs/vite-plugin-svelte',
  '@tailwindcss/vite',
  'svelte-check',
  'tailwindcss',
  'tw-animate-css',
  'vite',
] as const;

function optionalStringRecord(candidate: unknown, path: string): Record<string, string> {
  if (candidate === undefined) return {};
  assertStringRecord(candidate, path);
  return { ...candidate };
}

async function readPackageManifest(manifestPath: string): Promise<PackageManifest> {
  const manifestCandidate: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
  assertJsonObject(manifestCandidate, manifestPath);
  assertNonEmptyString(manifestCandidate.name, `${manifestPath}.name`);
  assertNonEmptyString(manifestCandidate.version, `${manifestPath}.version`);

  return {
    name: manifestCandidate.name,
    version: manifestCandidate.version,
    dependencies: optionalStringRecord(
      manifestCandidate.dependencies,
      `${manifestPath}.dependencies`,
    ),
    devDependencies: optionalStringRecord(
      manifestCandidate.devDependencies,
      `${manifestPath}.devDependencies`,
    ),
    peerDependencies: optionalStringRecord(
      manifestCandidate.peerDependencies,
      `${manifestPath}.peerDependencies`,
    ),
  };
}

async function readInstalledManifest(
  repositoryRoot: string,
  packageName: string,
): Promise<PackageManifest | null> {
  const manifestPath = join(repositoryRoot, 'node_modules', ...packageName.split('/'), 'package.json');
  try {
    return await readPackageManifest(manifestPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

function allDependencies(manifest: ProjectPackageJson): Record<string, string> {
  return { ...manifest.dependencies, ...manifest.devDependencies };
}

function semverCandidates(range: string): string[] {
  return [...range.matchAll(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g)].map(([version]) => version);
}

export function rangesOverlap(left: string, right: string): boolean {
  const candidates = new Set([...semverCandidates(left), ...semverCandidates(right)]);
  return [...candidates].some(
    (version) => Bun.semver.satisfies(version, left) && Bun.semver.satisfies(version, right),
  );
}

function exactDependencyIssue(expectation: ExactDependencyExpectation): string | null {
  if (expectation.expectedVersion === undefined) {
    return `${expectation.label}: canonical source is missing ${expectation.packageName}`;
  }
  const actualVersion = expectation.dependencies[expectation.packageName];
  return actualVersion === expectation.expectedVersion
    ? null
    : `${expectation.label}: ${expectation.packageName} must be ${expectation.expectedVersion}, ` +
        `received ${actualVersion ?? 'missing'}`;
}

function compactIssues(candidates: Array<string | null>): string[] {
  return candidates.filter((candidate): candidate is string => candidate !== null);
}

function workspaceVersionIssue(
  project: GeneratedProject,
  workspaceManifest: PackageManifest,
): string | null {
  return exactDependencyIssue({
    label: project.label,
    dependencies: project.manifest.dependencies,
    packageName: workspaceManifest.name,
    expectedVersion: `^${workspaceManifest.version}`,
  });
}

function peerIssues(
  project: GeneratedProject,
  packageManifest: PackageManifest,
): string[] {
  const projectDependencies = allDependencies(project.manifest);
  const issues: string[] = [];
  for (const [peerName, peerRange] of Object.entries(packageManifest.peerDependencies)) {
    const projectRange = projectDependencies[peerName];
    if (projectRange === undefined || peerRange.startsWith('workspace:')) continue;
    if (!rangesOverlap(projectRange, peerRange)) {
      issues.push(
        `${project.label}: ${packageManifest.name} requires ${peerName}@${peerRange}, ` +
          `but the scaffold selects ${projectRange}`,
      );
    }
  }
  return issues;
}

function generateProjects(repositoryRoot: string, scaffoldManifestPath?: string): GeneratedProject[] {
  const resolvedScaffoldManifestPath = scaffoldManifestPath ??
    join(repositoryRoot, 'packages', 'create-svadmin', 'scaffold-manifest.json');
  const scaffold = loadScaffoldManifest(resolvedScaffoldManifestPath);
  const projects: GeneratedProject[] = [];

  for (const dataProvider of DATA_PROVIDER_CHOICES) {
    for (const authProvider of AUTH_PROVIDER_CHOICES) {
      projects.push({
        label: `data=${dataProvider}, auth=${authProvider}`,
        dataProvider,
        authProvider,
        manifest: createProjectPackageJson(scaffold, {
          projectName: 'compatibility-check',
          dataProvider,
          authProvider,
        }),
      });
    }
  }
  return projects;
}

async function loadCompatibilityContext(repositoryRoot: string): Promise<CompatibilityContext> {
  const packagePath = (directory: string) => join(repositoryRoot, 'packages', directory, 'package.json');
  const [core, aiElements, ui, simpleRest, supabase, graphql, rootManifest, exampleManifest] = await Promise.all([
    readPackageManifest(packagePath('core')),
    readPackageManifest(packagePath('ai-elements')),
    readPackageManifest(packagePath('ui')),
    readPackageManifest(packagePath('simple-rest')),
    readPackageManifest(packagePath('supabase')),
    readPackageManifest(packagePath('graphql')),
    readPackageManifest(join(repositoryRoot, 'package.json')),
    readPackageManifest(join(repositoryRoot, 'example', 'package.json')),
  ]);
  const workspacePackages = [core, aiElements, ui, simpleRest, supabase, graphql];
  return {
    repositoryRoot,
    rootManifest,
    exampleManifest,
    workspace: {
      byName: new Map(workspacePackages.map((manifest) => [manifest.name, manifest])),
      core,
      aiElements,
      ui,
      simpleRest,
      supabase,
      graphql,
    },
  };
}

function selectedWorkspaceProviderManifests(
  project: GeneratedProject,
  workspace: WorkspaceManifests,
): PackageManifest[] {
  const packageNames = new Set<string>();
  const dataProviderPackage = workspaceProviderByChoice[project.dataProvider];
  if (dataProviderPackage !== null) packageNames.add(dataProviderPackage);
  if (project.authProvider === 'jwt') packageNames.add('@svadmin/simple-rest');
  if (project.authProvider === 'supabase') packageNames.add('@svadmin/supabase');

  return [...packageNames].map((packageName) => {
    const manifest = workspace.byName.get(packageName);
    if (manifest === undefined) throw new Error(`Missing workspace manifest for ${packageName}`);
    return manifest;
  });
}

function baseRuntimeIssues(
  project: GeneratedProject,
  workspace: WorkspaceManifests,
): string[] {
  return compactIssues([
    workspaceVersionIssue(project, workspace.core),
    workspaceVersionIssue(project, workspace.aiElements),
    workspaceVersionIssue(project, workspace.ui),
    exactDependencyIssue({
      label: project.label,
      dependencies: project.manifest.devDependencies,
      packageName: 'svelte',
      expectedVersion: workspace.core.peerDependencies.svelte,
    }),
    exactDependencyIssue({
      label: project.label,
      dependencies: project.manifest.dependencies,
      packageName: '@tanstack/svelte-query',
      expectedVersion: workspace.aiElements.peerDependencies['@tanstack/svelte-query'],
    }),
    exactDependencyIssue({
      label: project.label,
      dependencies: project.manifest.dependencies,
      packageName: '@lucide/svelte',
      expectedVersion: workspace.ui.dependencies['@lucide/svelte'],
    }),
  ]);
}

function toolchainIssues(project: GeneratedProject, context: CompatibilityContext): string[] {
  const exampleDependencies = {
    ...context.exampleManifest.dependencies,
    ...context.exampleManifest.devDependencies,
  };
  const issues = toolchainPackageNames.map((packageName) => exactDependencyIssue({
    label: project.label,
    dependencies: project.manifest.devDependencies,
    packageName,
    expectedVersion: exampleDependencies[packageName],
  }));
  issues.push(exactDependencyIssue({
    label: project.label,
    dependencies: project.manifest.devDependencies,
    packageName: 'typescript',
    expectedVersion: context.rootManifest.dependencies.typescript,
  }));
  return compactIssues(issues);
}

function simpleRestDependencyIssues(
  project: GeneratedProject,
  workspace: WorkspaceManifests,
): string[] {
  if (project.manifest.dependencies['@svadmin/simple-rest'] === undefined) return [];
  return compactIssues([
    exactDependencyIssue({
      label: project.label,
      dependencies: project.manifest.dependencies,
      packageName: '@refinedev/simple-rest',
      expectedVersion: workspace.simpleRest.peerDependencies['@refinedev/simple-rest'],
    }),
  ]);
}

function supabaseDependencyIssues(
  project: GeneratedProject,
  workspace: WorkspaceManifests,
): string[] {
  if (project.manifest.dependencies['@svadmin/supabase'] === undefined) return [];
  return compactIssues(['@supabase/supabase-js', '@refinedev/supabase'].map((packageName) =>
    exactDependencyIssue({
      label: project.label,
      dependencies: project.manifest.dependencies,
      packageName,
      expectedVersion: workspace.supabase.peerDependencies[packageName],
    })));
}

function graphqlDependencyIssues(
  project: GeneratedProject,
  workspace: WorkspaceManifests,
): string[] {
  if (project.manifest.dependencies['@svadmin/graphql'] === undefined) return [];
  return compactIssues([
    exactDependencyIssue({
      label: project.label,
      dependencies: project.manifest.dependencies,
      packageName: '@refinedev/graphql',
      expectedVersion: workspace.graphql.peerDependencies['@refinedev/graphql'],
    }),
    exactDependencyIssue({
      label: project.label,
      dependencies: project.manifest.dependencies,
      packageName: 'graphql-request',
      expectedVersion: workspace.graphql.dependencies['graphql-request'],
    }),
  ]);
}

function providerDependencyIssues(
  project: GeneratedProject,
  workspace: WorkspaceManifests,
): string[] {
  return [
    ...simpleRestDependencyIssues(project, workspace),
    ...supabaseDependencyIssues(project, workspace),
    ...graphqlDependencyIssues(project, workspace),
  ];
}

function refineCoreContractIssues(project: GeneratedProject): string[] {
  const issues: string[] = [];
  for (const [providerName, corePeerRange] of Object.entries(refineCorePeerByProvider)) {
    if (project.manifest.dependencies[providerName] === undefined) continue;
    const coreRange = project.manifest.dependencies['@refinedev/core'];
    if (coreRange === undefined) {
      issues.push(
        `${project.label}: ${providerName} requires @refinedev/core@${corePeerRange}, received missing`,
      );
    } else if (!rangesOverlap(coreRange, corePeerRange)) {
      issues.push(
        `${project.label}: ${providerName} requires @refinedev/core@${corePeerRange}, ` +
          `but the scaffold selects ${coreRange}`,
      );
    }
  }
  return issues;
}

async function installedDependencyPeerIssues(
  project: GeneratedProject,
  context: CompatibilityContext,
  manifestCache: Map<string, PackageManifest | null>,
): Promise<string[]> {
  const issues: string[] = [];
  for (const packageName of Object.keys(allDependencies(project.manifest))) {
    if (!manifestCache.has(packageName)) {
      manifestCache.set(
        packageName,
        await readInstalledManifest(context.repositoryRoot, packageName),
      );
    }
    const installedManifest = manifestCache.get(packageName);
    if (installedManifest !== undefined && installedManifest !== null) {
      issues.push(...peerIssues(project, installedManifest));
    }
  }
  return issues;
}

async function projectCompatibilityIssues(
  project: GeneratedProject,
  context: CompatibilityContext,
  installedManifestCache: Map<string, PackageManifest | null>,
): Promise<string[]> {
  const selectedProviders = selectedWorkspaceProviderManifests(project, context.workspace);
  const workspacePeerSources = [
    context.workspace.core,
    context.workspace.aiElements,
    context.workspace.ui,
    ...selectedProviders,
  ];
  return [
    ...baseRuntimeIssues(project, context.workspace),
    ...selectedProviders
      .map((manifest) => workspaceVersionIssue(project, manifest))
      .filter((issue): issue is string => issue !== null),
    ...toolchainIssues(project, context),
    ...workspacePeerSources.flatMap((manifest) => peerIssues(project, manifest)),
    ...await installedDependencyPeerIssues(project, context, installedManifestCache),
    ...providerDependencyIssues(project, context.workspace),
    ...refineCoreContractIssues(project),
  ];
}

export async function checkCreateSvadminCompatibility(
  repositoryRoot: string,
  options: CompatibilityCheckOptions = {},
): Promise<string[]> {
  const root = resolve(repositoryRoot);
  const context = await loadCompatibilityContext(root);
  const projects = generateProjects(root, options.scaffoldManifestPath);
  const installedManifestCache = new Map<string, PackageManifest | null>();
  const issues: string[] = [];

  for (const project of projects) {
    issues.push(...await projectCompatibilityIssues(project, context, installedManifestCache));
  }
  return [...new Set(issues)].sort();
}

if (import.meta.main) {
  const repositoryRoot = resolve(import.meta.dir, '..');
  const issues = await checkCreateSvadminCompatibility(repositoryRoot);
  if (issues.length > 0) {
    throw new Error(`create-svadmin dependency compatibility failed:\n- ${issues.join('\n- ')}`);
  }
  console.info('create-svadmin dependency compatibility passed for all 16 provider/auth combinations');
}
