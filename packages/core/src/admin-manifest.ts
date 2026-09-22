/**
 * AI manifest builder.
 *
 * Serializes a resolved application config into the stable, JSON-safe entrypoint
 * that AI tooling and `svadmin doctor` read instead of scanning the repository.
 * The output is intentionally small and deterministic: providers, resources,
 * plugin capabilities, project commands, and generated-file guardrails.
 */
import { getContractFormFields, type ResourceContract } from './resource-contract';
import type { AdminPluginCapability, ResolvedAdminConfig } from './admin-config';
import type { DataProvider } from './types';

/** Project-level facts that are not part of the runtime config. */
export interface AdminManifestProject {
  readonly name?: string;
  readonly commands?: Readonly<Record<string, string>>;
  /** Internal import paths AI-generated code must never reach into. */
  readonly forbiddenImports?: readonly string[];
  readonly testCommand?: string;
}

export interface AdminManifestField {
  readonly key: string;
  readonly label: string;
  readonly type: string;
  readonly required: boolean;
}

export interface AdminManifestResource {
  readonly name: string;
  readonly label: string;
  readonly fields: readonly AdminManifestField[];
  /** Field names that must be present per operation, derived from the contract. */
  readonly contract: {
    readonly record: readonly string[];
    readonly create: readonly string[];
    readonly update: readonly string[];
  };
}

export interface AdminManifestPlugin {
  readonly name: string;
  readonly version: string;
  readonly capabilities: readonly AdminPluginCapability[];
}

export interface AdminManifest {
  readonly version: 1;
  readonly project: {
    readonly name: string | undefined;
    readonly commands: Readonly<Record<string, string>>;
    readonly testCommand: string | undefined;
    readonly forbiddenImports: readonly string[];
  };
  readonly providers: {
    readonly dataProviders: readonly string[];
    readonly scalarProviders: readonly string[];
  };
  readonly resources: readonly AdminManifestResource[];
  readonly plugins: readonly AdminManifestPlugin[];
}

function isSingleDataProvider(value: unknown): value is DataProvider {
  return typeof Reflect.get(value as object, 'getList') === 'function';
}

function dataProviderNames(config: ResolvedAdminConfig): string[] {
  const dataProvider = config.providers.dataProvider;
  if (isSingleDataProvider(dataProvider)) return ['default'];
  return Object.keys(dataProvider);
}

function scalarProviderNames(config: ResolvedAdminConfig): string[] {
  const names: string[] = [];
  for (const key of Object.keys(config.providers)) {
    if (key === 'dataProvider') continue;
    if (Reflect.get(config.providers, key) !== undefined) names.push(key);
  }
  return names.sort();
}

function contractFields(contract: ResourceContract, action: 'show' | 'create' | 'edit'): string[] {
  try {
    return getContractFormFields(contract, action);
  } catch {
    return [];
  }
}

/** Builds the stable AI entrypoint from a resolved config. */
export function buildAdminManifest(
  config: ResolvedAdminConfig,
  project: AdminManifestProject = {},
): AdminManifest {
  return {
    version: 1,
    project: {
      name: project.name ?? config.name,
      commands: { ...(project.commands ?? {}) },
      testCommand: project.testCommand,
      forbiddenImports: [...(project.forbiddenImports ?? [])],
    },
    providers: {
      dataProviders: dataProviderNames(config),
      scalarProviders: scalarProviderNames(config),
    },
    resources: config.resources.map((resource) => ({
      name: resource.name,
      label: resource.label,
      fields: resource.fields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required ?? false,
      })),
      contract: resource.contract === undefined
        ? { record: [], create: [], update: [] }
        : {
            record: contractFields(resource.contract, 'show'),
            create: contractFields(resource.contract, 'create'),
            update: contractFields(resource.contract, 'edit'),
          },
    })),
    plugins: config.plugins.map((plugin) => ({
      name: plugin.name,
      version: plugin.version,
      capabilities: plugin.capabilities,
    })),
  };
}