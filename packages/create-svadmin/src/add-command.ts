/**
 * `svadmin add` — idempotent platform additions.
 *
 * Adds a business feature module (`add resource`) or a provider dependency pack
 * (`add provider` / `add auth`). Every plan is dry-run by default and preserves
 * existing files; `--write` applies only the missing pieces.
 */
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import {
  ADMIN_AI_MANIFEST_FILENAME,
  SCAFFOLD_AUTH_PROVIDERS,
  SCAFFOLD_DATA_PROVIDERS,
  type AdminAiManifest,
} from './scaffold-platform';
import {
  AUTH_PROVIDER_CHOICES,
  DATA_PROVIDER_CHOICES,
  type AuthProviderChoice,
  type DataProviderChoice,
  type ScaffoldManifest,
} from './project-manifest';
import {
  readMaintainedPackageJson,
  type MaintainedPackageJson,
} from './project-maintenance';

export type AddKind = 'resource' | 'provider' | 'auth';

export interface AddCommandArguments {
  kind: AddKind;
  target: string;
  projectDirectory: string;
  write: boolean;
}

export interface AddPlanEntry {
  filePath: string;
  relativePath: string;
  content: string;
  exists: boolean;
}

export interface AddResourcePlan {
  projectDirectory: string;
  resourceName: string;
  entries: AddPlanEntry[];
  registrationHint: string;
}

export interface ProviderDependency {
  packageName: string;
  version: string;
}

export interface AddProviderPlan {
  projectDirectory: string;
  kind: 'provider' | 'auth';
  choice: DataProviderChoice | AuthProviderChoice;
  packageJsonPath: string;
  updatedPackageJson: MaintainedPackageJson | null;
  addedDependencies: ProviderDependency[];
  manifestPath: string;
  updatedManifest: AdminAiManifest | null;
}

export interface AddWriteResult {
  written: string[];
  preserved: string[];
}

const RESOURCE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

export function parseAddArguments(args: string[]): AddCommandArguments {
  const [kind, ...rest] = args;
  if (kind !== 'resource' && kind !== 'provider' && kind !== 'auth') {
    throw new Error('Usage: create-svadmin add <resource|provider|auth> <name> [--project-dir <dir>] [--write]');
  }
  let projectDirectory = process.cwd();
  let write = false;
  const positional: string[] = [];
  for (let index = 0; index < rest.length; index++) {
    const argument = rest[index];
    if (argument === '--write') {
      write = true;
    } else if (argument === '--project-dir') {
      const value = rest[index + 1];
      if (value === undefined) throw new Error('--project-dir requires a value');
      projectDirectory = path.resolve(process.cwd(), value);
      index++;
    } else if (argument === undefined) {
      continue;
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      positional.push(argument);
    }
  }
  if (positional.length !== 1) {
    throw new Error(`Expected exactly one target, received: ${positional.join(', ') || '(none)'}`);
  }
  return { kind, target: positional[0] as string, projectDirectory, write };
}

function humanize(name: string): string {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function assertProject(projectDirectory: string): void {
  if (!fs.existsSync(path.join(projectDirectory, 'package.json'))) {
    throw new Error(`Not a Node project: ${path.join(projectDirectory, 'package.json')} is missing`);
  }
}

function resourceFileContents(name: string): { index: string; resource: string } {
  const label = humanize(name);
  return {
    index: `export { ${name}Resource, ${name}Definition } from './${name}.resource';\n`,
    resource: `import { Type } from '@sinclair/typebox';
import { defineResource, type AdminResourceDefinition } from '@svadmin/core';

/**
 * ${label} runtime contract.
 * Extend the create/update schemas before enabling writes; empty object schemas
 * keep writes disabled until fields are declared.
 */
export const ${name}Resource = defineResource('${name}', {
  record: Type.Object({
    id: Type.String(),
  }),
  create: Type.Object({}),
  update: Type.Object({}),
});

/** Menu and field metadata consumed by the resource registry. */
export const ${name}Definition: AdminResourceDefinition = {
  name: '${name}',
  label: '${label}',
  icon: 'file',
  fields: [
    { key: 'id', label: 'ID', type: 'text', showInForm: false },
  ],
  contract: ${name}Resource,
};
`,
  };
}

export function planAddResource(projectDirectory: string, resourceName: string): AddResourcePlan {
  assertProject(projectDirectory);
  if (!RESOURCE_NAME_PATTERN.test(resourceName)) {
    throw new Error(
      `Invalid resource name "${resourceName}"; use lowercase letters, digits, and underscores (for example "order_items")`,
    );
  }
  const files = resourceFileContents(resourceName);
  const base = path.posix.join('src', 'features', resourceName);
  const contents: Record<string, string> = {
    [`${base}/index.ts`]: files.index,
    [`${base}/${resourceName}.resource.ts`]: files.resource,
  };
  const entries = Object.entries(contents).map(([relativePath, content]) => ({
    relativePath,
    content,
    filePath: path.join(projectDirectory, relativePath),
    exists: fs.existsSync(path.join(projectDirectory, relativePath)),
  }));
  return {
    projectDirectory,
    resourceName,
    entries,
    registrationHint: `Register it in src/resources.ts:\n  import { ${resourceName}Definition } from './features/${resourceName}';\n  // then add ${resourceName}Definition to the resources array`,
  };
}

export function writeAddResource(plan: AddResourcePlan): AddWriteResult {
  const written: string[] = [];
  const preserved: string[] = [];
  for (const entry of plan.entries) {
    if (entry.exists || fs.existsSync(entry.filePath)) {
      preserved.push(entry.relativePath);
      continue;
    }
    fs.mkdirSync(path.dirname(entry.filePath), { recursive: true });
    fs.writeFileSync(entry.filePath, entry.content);
    written.push(entry.relativePath);
  }
  return { written, preserved };
}

function providerPackages(
  scaffold: ScaffoldManifest,
  kind: 'provider' | 'auth',
  choice: DataProviderChoice | AuthProviderChoice,
): ProviderDependency[] {
  const packs = kind === 'provider'
    ? scaffold.svadmin.dataProviders[choice as DataProviderChoice]
    : scaffold.svadmin.authProviders[choice as AuthProviderChoice];
  const packages = new Map<string, string>();
  for (const packName of packs) {
    const pack = scaffold.svadmin.dependencyPacks[packName];
    if (pack === undefined) throw new Error(`Unknown dependency pack: ${packName}`);
    for (const [packageName, version] of Object.entries(pack)) packages.set(packageName, version);
  }
  return [...packages].map(([packageName, version]) => ({ packageName, version }));
}

function readManifest(manifestPath: string): AdminAiManifest | null {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null || Reflect.get(parsed, 'version') !== 1) return null;
    return parsed as AdminAiManifest;
  } catch {
    return null;
  }
}

export function planAddProvider(
  projectDirectory: string,
  scaffold: ScaffoldManifest,
  kind: 'provider' | 'auth',
  choice: DataProviderChoice | AuthProviderChoice,
): AddProviderPlan {
  assertProject(projectDirectory);
  const validChoices: readonly string[] = kind === 'provider' ? DATA_PROVIDER_CHOICES : AUTH_PROVIDER_CHOICES;
  if (!validChoices.includes(choice)) {
    throw new Error(`Unknown ${kind} "${choice}"; expected one of: ${validChoices.join(', ')}`);
  }

  const packageJsonPath = path.join(projectDirectory, 'package.json');
  const project = readMaintainedPackageJson(packageJsonPath);
  const dependencies = { ...(project.dependencies ?? {}) };
  const devDependencies = { ...(project.devDependencies ?? {}) };
  const addedDependencies: ProviderDependency[] = [];
  for (const dependency of providerPackages(scaffold, kind, choice)) {
    if (dependencies[dependency.packageName] === undefined && devDependencies[dependency.packageName] === undefined) {
      dependencies[dependency.packageName] = dependency.version;
      addedDependencies.push(dependency);
    }
  }

  const updatedPackageJson: MaintainedPackageJson = { ...project, dependencies, devDependencies };
  const manifestPath = path.join(projectDirectory, ADMIN_AI_MANIFEST_FILENAME);
  const manifest = readManifest(manifestPath);
  const descriptor = kind === 'provider'
    ? SCAFFOLD_DATA_PROVIDERS[choice as DataProviderChoice]
    : SCAFFOLD_AUTH_PROVIDERS[choice as AuthProviderChoice];
  const updatedManifest: AdminAiManifest | null = manifest === null
    ? null
    : kind === 'provider'
      ? { ...manifest, providers: { ...manifest.providers, data: { choice: choice as DataProviderChoice, ...descriptor } } }
      : { ...manifest, providers: { ...manifest.providers, auth: { choice: choice as AuthProviderChoice, ...descriptor } } };

  return {
    projectDirectory,
    kind,
    choice,
    packageJsonPath,
    updatedPackageJson: addedDependencies.length === 0 ? null : updatedPackageJson,
    addedDependencies,
    manifestPath,
    updatedManifest: manifest === null ? null : updatedManifest,
  };
}

export function writeAddProvider(plan: AddProviderPlan): AddWriteResult {
  const written: string[] = [];
  const preserved: string[] = [];
  if (plan.updatedPackageJson !== null) {
    fs.writeFileSync(plan.packageJsonPath, `${JSON.stringify(plan.updatedPackageJson, null, 2)}\n`);
    written.push('package.json');
  } else {
    preserved.push('package.json');
  }
  if (plan.updatedManifest !== null && fs.existsSync(plan.manifestPath)) {
    fs.writeFileSync(plan.manifestPath, `${JSON.stringify(plan.updatedManifest, null, 2)}\n`);
    written.push(ADMIN_AI_MANIFEST_FILENAME);
  }
  return { written, preserved };
}

function printAddResult(wrote: boolean, result: AddWriteResult, hint?: string): void {
  if (wrote) {
    if (result.written.length > 0) {
      console.log(pc.green(`  ✔ wrote ${result.written.join(', ')}`));
    }
    if (result.preserved.length > 0) {
      console.log(pc.dim(`  • preserved ${result.preserved.join(', ')}`));
    }
  }
  if (hint !== undefined) console.log(`\n${hint}`);
  console.log();
}

export function addCommand(args: string[], scaffold: ScaffoldManifest): void {
  const options = parseAddArguments(args);
  console.log(`\nsvadmin add ${options.kind} ${options.target} — ${options.projectDirectory}`);

  if (options.kind === 'resource') {
    const plan = planAddResource(options.projectDirectory, options.target);
    for (const entry of plan.entries) {
      console.log(`  ${entry.exists ? 'preserve' : 'add'} ${entry.relativePath}`);
    }
    if (!options.write) {
      console.log('\nDry run only; re-run with --write to create missing files.');
      printAddResult(false, { written: [], preserved: [] }, plan.registrationHint);
      return;
    }
    printAddResult(true, writeAddResource(plan), plan.registrationHint);
    return;
  }

  const plan = planAddProvider(
    options.projectDirectory,
    scaffold,
    options.kind,
    options.target as DataProviderChoice | AuthProviderChoice,
  );
  if (plan.addedDependencies.length === 0) {
    console.log(pc.green('  ✔ dependencies already present; nothing to add.'));
  } else {
    for (const dependency of plan.addedDependencies) {
      console.log(`  add ${dependency.packageName}@${dependency.version}`);
    }
  }
  if (plan.updatedManifest !== null) {
    console.log(`  update ${ADMIN_AI_MANIFEST_FILENAME} -> ${options.kind}: ${options.target}`);
  }
  if (!options.write) {
    console.log('\nDry run only; re-run with --write to update package.json and the AI manifest.');
    console.log(pc.dim('  Update src/svadmin.config.ts to wire the new provider.'));
    console.log();
    return;
  }
  printAddResult(true, writeAddProvider(plan), 'Update src/svadmin.config.ts to wire the new provider.');
}