import { readFileSync } from 'node:fs';

export const DATA_PROVIDER_CHOICES = ['simple-rest', 'supabase', 'graphql', 'none'] as const;
export const AUTH_PROVIDER_CHOICES = ['mock', 'jwt', 'supabase', 'none'] as const;

export type DataProviderChoice = typeof DATA_PROVIDER_CHOICES[number];
export type AuthProviderChoice = typeof AUTH_PROVIDER_CHOICES[number];

export interface ProjectPackageJson {
  name: string;
  version: string;
  private: boolean;
  type: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface ScaffoldManifest extends ProjectPackageJson {
  svadmin: {
    dependencyPacks: Record<string, Record<string, string>>;
    dataProviders: Record<DataProviderChoice, string[]>;
    authProviders: Record<AuthProviderChoice, string[]>;
  };
}

export interface ProjectManifestOptions {
  projectName: string;
  dataProvider: DataProviderChoice;
  authProvider: AuthProviderChoice;
}

export function assertJsonObject(candidate: unknown, path: string): asserts candidate is Record<string, unknown> {
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error(`${path} must be an object`);
  }
}

export function assertNonEmptyString(candidate: unknown, path: string): asserts candidate is string {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
}

export function assertStringRecord(
  candidate: unknown,
  path: string,
): asserts candidate is Record<string, string> {
  assertJsonObject(candidate, path);
  for (const [key, entry] of Object.entries(candidate)) {
    assertNonEmptyString(entry, `${path}.${key}`);
  }
}

function assertSelectionMap<T extends string>(
  candidate: unknown,
  choices: readonly T[],
  path: string,
): asserts candidate is Record<T, string[]> {
  assertJsonObject(candidate, path);
  for (const choice of choices) {
    const packs = candidate[choice];
    if (!Array.isArray(packs) || packs.some((pack) => typeof pack !== 'string')) {
      throw new Error(`${path}.${choice} must be an array of dependency-pack names`);
    }
  }
}

function assertDependencyPacks(
  candidate: unknown,
): asserts candidate is Record<string, Record<string, string>> {
  assertJsonObject(candidate, 'scaffold manifest.svadmin.dependencyPacks');
  for (const [packName, pack] of Object.entries(candidate)) {
    assertStringRecord(pack, `scaffold manifest.svadmin.dependencyPacks.${packName}`);
  }
}

function assertReferencedPacksExist(
  dependencyPacks: Record<string, Record<string, string>>,
  selectedPacks: string[],
): void {
  for (const packName of selectedPacks) {
    if (!(packName in dependencyPacks)) {
      throw new Error(`scaffold manifest references unknown dependency pack: ${packName}`);
    }
  }
}

function assertScaffoldManifest(candidate: unknown): asserts candidate is ScaffoldManifest {
  assertJsonObject(candidate, 'scaffold manifest');
  assertNonEmptyString(candidate.name, 'scaffold manifest.name');
  assertNonEmptyString(candidate.version, 'scaffold manifest.version');
  if (candidate.private !== true) {
    throw new Error('scaffold manifest.private must be true');
  }
  assertNonEmptyString(candidate.type, 'scaffold manifest.type');
  assertStringRecord(candidate.scripts, 'scaffold manifest.scripts');
  assertStringRecord(candidate.dependencies, 'scaffold manifest.dependencies');
  assertStringRecord(candidate.devDependencies, 'scaffold manifest.devDependencies');
  assertJsonObject(candidate.svadmin, 'scaffold manifest.svadmin');
  assertDependencyPacks(candidate.svadmin.dependencyPacks);
  assertSelectionMap(
    candidate.svadmin.dataProviders,
    DATA_PROVIDER_CHOICES,
    'scaffold manifest.svadmin.dataProviders',
  );
  assertSelectionMap(
    candidate.svadmin.authProviders,
    AUTH_PROVIDER_CHOICES,
    'scaffold manifest.svadmin.authProviders',
  );
  assertReferencedPacksExist(candidate.svadmin.dependencyPacks, [
    ...Object.values(candidate.svadmin.dataProviders).flat(),
    ...Object.values(candidate.svadmin.authProviders).flat(),
  ]);
}

export function loadScaffoldManifest(manifestPath: string): ScaffoldManifest {
  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assertScaffoldManifest(parsed);
  return parsed;
}

function mergeDependencyPack(
  dependencies: Record<string, string>,
  pack: Record<string, string>,
  packName: string,
): void {
  for (const [packageName, version] of Object.entries(pack)) {
    const existingVersion = dependencies[packageName];
    if (existingVersion !== undefined && existingVersion !== version) {
      throw new Error(
        `Dependency ${packageName} has conflicting versions ${existingVersion} and ${version} in pack ${packName}`,
      );
    }
    dependencies[packageName] = version;
  }
}

export function createProjectPackageJson(
  scaffold: ScaffoldManifest,
  options: ProjectManifestOptions,
): ProjectPackageJson {
  const dependencies = { ...scaffold.dependencies };
  const selectedPacks = new Set([
    ...scaffold.svadmin.dataProviders[options.dataProvider],
    ...scaffold.svadmin.authProviders[options.authProvider],
  ]);

  for (const packName of selectedPacks) {
    mergeDependencyPack(dependencies, scaffold.svadmin.dependencyPacks[packName], packName);
  }

  return {
    name: options.projectName.trim(),
    version: scaffold.version,
    private: scaffold.private,
    type: scaffold.type,
    scripts: { ...scaffold.scripts },
    dependencies,
    devDependencies: { ...scaffold.devDependencies },
  };
}
