/**
 * Application composition layer.
 *
 * `defineAdminConfig` is the single, AI-readable application entrypoint: it
 * composes provider bundles, resource contracts, and plugins into one typed
 * object without taking over business routing. `resolveAdminConfig` folds
 * plugin contributions into a deterministic snapshot plus diagnostics, which
 * the CLI (`doctor` / `generate`) and DevTools can inspect.
 */
import type { DataProvider, ResourceDefinition } from './types';
import type { DataProviderInput, ProviderBundle } from './provider-bundle';
import type { ResourceContract } from './resource-contract';

/** Machine-readable capability vocabulary shared by plugins, generators, and `doctor`. */
export type AdminPluginCapability =
  | 'data'
  | 'auth'
  | 'access-control'
  | 'live'
  | 'storage'
  | 'audit-log'
  | 'admin-route'
  | 'notification'
  | 'task'
  | 'i18n'
  | 'ai'
  | 'dashboard'
  | 'import-export'
  | 'feature-flag';

export interface AdminPluginDocs {
  readonly setup?: string;
  readonly examples?: string;
}

/** Runtime contributions a plugin may add to the application. */
export interface AdminPluginContribution {
  readonly resources?: readonly AdminResourceInput[];
  readonly providers?: ProviderBundle;
}

/**
 * Declarative plugin manifest. The descriptor is data, not behavior: it lets
 * `add`, `generate`, `doctor`, docs, and AI tooling discover what a plugin can
 * do without importing its runtime implementation.
 */
export interface AdminPluginDescriptor {
  readonly name: string;
  readonly version: string;
  readonly capabilities: readonly AdminPluginCapability[];
  /** Optional JSON-schema-like config contract (for example a TypeBox schema). */
  readonly configSchema?: unknown;
  readonly providers?: readonly string[];
  readonly commands?: readonly string[];
  readonly generators?: readonly string[];
  readonly docs?: AdminPluginDocs;
  readonly contributes?: AdminPluginContribution;
}

export function defineSvadminPlugin<const TPlugin extends AdminPluginDescriptor>(
  plugin: TPlugin,
): TPlugin {
  if (!plugin.name.trim()) {
    throw new Error('defineSvadminPlugin requires a non-empty name');
  }
  if (!plugin.version.trim()) {
    throw new Error(`Plugin "${plugin.name}" requires a non-empty version`);
  }
  const duplicates = duplicateValues(plugin.capabilities);
  if (duplicates.length > 0) {
    throw new Error(`Plugin "${plugin.name}" declares duplicate capabilities: ${duplicates.join(', ')}`);
  }
  return plugin;
}

export interface AdminConfigInput {
  readonly name?: string;
  /** Either a first-class ProviderBundle or several bundles composed in order. */
  readonly providers: ProviderBundle | readonly ProviderBundle[];
  /**
   * Schema-first resources. A bare `ResourceContract` is expanded into a minimal
   * `ResourceDefinition`; a full definition may embed `contract` for menu/label metadata.
   */
  readonly resources?: readonly AdminResourceInput[];
  readonly plugins?: readonly AdminPluginDescriptor[];
}

/** A full resource definition is required to carry its runtime contract. */
export interface AdminResourceDefinition extends ResourceDefinition {
  readonly contract: ResourceContract;
}

/**
 * Schema-first resources are preferred, but plain definitions remain accepted so
 * existing projects migrate without rewrites. Bare contracts are expanded.
 */
export type AdminResourceInput = ResourceContract | ResourceDefinition;

export interface AdminConfig extends AdminConfigInput {
  readonly __svadminConfig: true;
}

/**
 * Typed, identity-preserving application configuration. Returns the input
 * object with the config brand so downstream resolution can assert the shape.
 */
export function defineAdminConfig<const TConfig extends AdminConfigInput>(
  config: TConfig,
): TConfig & { readonly __svadminConfig: true } {
  if (isProviderBundleList(config.providers) && config.providers.length === 0) {
    throw new Error('defineAdminConfig requires at least one provider bundle');
  }
  return { ...config, __svadminConfig: true };
}

export type AdminConfigDiagnosticCode =
  | 'duplicate-resource'
  | 'duplicate-plugin'
  | 'invalid-resource'
  | 'invalid-plugin-contribution';

export interface AdminConfigDiagnostic {
  readonly code: AdminConfigDiagnosticCode;
  readonly message: string;
  readonly source?: string;
}

export interface ResolvedAdminConfig {
  readonly name: string | undefined;
  /** Composed bundle; later bundles override earlier scalar providers. */
  readonly providers: ProviderBundle;
  /** Normalized definitions ready to pass to `provideAdminContext`. */
  readonly resources: readonly ResourceDefinition[];
  readonly plugins: readonly AdminPluginDescriptor[];
  readonly diagnostics: readonly AdminConfigDiagnostic[];
}

/** The `provideAdminContext` source derived from a resolved config. */
export interface ResolvedAdminContextSource {
  readonly providerBundle: ProviderBundle;
  readonly resources: ResourceDefinition[];
}

function isSingleDataProvider(value: DataProviderInput): value is DataProvider {
  return typeof Reflect.get(value, 'getList') === 'function';
}

function duplicateValues<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const duplicates = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    else seen.add(value);
  }
  return [...duplicates];
}

function isProviderBundleList(
  value: ProviderBundle | readonly ProviderBundle[],
): value is readonly ProviderBundle[] {
  return Array.isArray(value);
}

function providerBundlesOf(config: AdminConfigInput): readonly ProviderBundle[] {
  return isProviderBundleList(config.providers) ? config.providers : [config.providers];
}

function mergeDataProvider(inputs: readonly DataProviderInput[]): DataProviderInput {
  const named: Record<string, DataProvider> = {};
  let fallback: DataProvider | undefined;
  for (const input of inputs) {
    if (isSingleDataProvider(input)) fallback = input;
    else Object.assign(named, input);
  }
  if (Object.keys(named).length === 0) {
    if (fallback === undefined) throw new Error('resolveAdminConfig requires a data provider');
    return fallback;
  }
  if (fallback !== undefined && named['default'] === undefined) {
    return { ...named, default: fallback };
  }
  return named;
}

function mergeProviderBundles(
  bundles: readonly ProviderBundle[],
): ProviderBundle {
  const dataProviderInputs: DataProviderInput[] = [];
  let merged: ProviderBundle | undefined;
  for (const bundle of bundles) {
    dataProviderInputs.push(bundle.dataProvider);
    merged = merged === undefined ? { ...bundle } : mergeOptionalProviders(merged, bundle);
  }
  if (merged === undefined) throw new Error('resolveAdminConfig requires a data provider');
  const dataProvider = mergeDataProvider(dataProviderInputs);
  return { ...merged, dataProvider };
}

function mergeOptionalProviders(base: ProviderBundle, override: ProviderBundle): ProviderBundle {
  return {
    dataProvider: override.dataProvider,
    ...(override.authProvider !== undefined ? { authProvider: override.authProvider } : base.authProvider !== undefined ? { authProvider: base.authProvider } : {}),
    ...(override.accessControlProvider !== undefined ? { accessControlProvider: override.accessControlProvider } : base.accessControlProvider !== undefined ? { accessControlProvider: base.accessControlProvider } : {}),
    ...(override.liveProvider !== undefined ? { liveProvider: override.liveProvider } : base.liveProvider !== undefined ? { liveProvider: base.liveProvider } : {}),
    ...(override.auditLogProvider !== undefined ? { auditLogProvider: override.auditLogProvider } : base.auditLogProvider !== undefined ? { auditLogProvider: base.auditLogProvider } : {}),
    ...(override.notificationProvider !== undefined ? { notificationProvider: override.notificationProvider } : base.notificationProvider !== undefined ? { notificationProvider: base.notificationProvider } : {}),
    ...(override.chatProvider !== undefined ? { chatProvider: override.chatProvider } : base.chatProvider !== undefined ? { chatProvider: base.chatProvider } : {}),
    ...(override.agentProvider !== undefined ? { agentProvider: override.agentProvider } : base.agentProvider !== undefined ? { agentProvider: base.agentProvider } : {}),
    ...(override.taskProvider !== undefined ? { taskProvider: override.taskProvider } : base.taskProvider !== undefined ? { taskProvider: base.taskProvider } : {}),
    ...(override.routerProvider !== undefined ? { routerProvider: override.routerProvider } : base.routerProvider !== undefined ? { routerProvider: base.routerProvider } : {}),
    ...(override.tenantAdapter !== undefined ? { tenantAdapter: override.tenantAdapter } : base.tenantAdapter !== undefined ? { tenantAdapter: base.tenantAdapter } : {}),
    ...(override.organizationProvider !== undefined ? { organizationProvider: override.organizationProvider } : base.organizationProvider !== undefined ? { organizationProvider: base.organizationProvider } : {}),
    ...(override.identityGovernanceProvider !== undefined ? { identityGovernanceProvider: override.identityGovernanceProvider } : base.identityGovernanceProvider !== undefined ? { identityGovernanceProvider: base.identityGovernanceProvider } : {}),
    ...(override.sessionProvider !== undefined ? { sessionProvider: override.sessionProvider } : base.sessionProvider !== undefined ? { sessionProvider: base.sessionProvider } : {}),
    ...(override.credentialProvider !== undefined ? { credentialProvider: override.credentialProvider } : base.credentialProvider !== undefined ? { credentialProvider: base.credentialProvider } : {}),
  };
}

function isResourceContract(value: AdminResourceInput): value is ResourceContract {
  return !Array.isArray(Reflect.get(value, 'fields'));
}

/** Expands bare contracts into minimal definitions; keeps full definitions intact. */
export function normalizeAdminResource(value: AdminResourceInput): ResourceDefinition {
  if (!isResourceContract(value)) return value;
  return { name: value.name, label: value.name, fields: [], contract: value };
}

function collectPluginResources(
  plugins: readonly AdminPluginDescriptor[],
  diagnostics: AdminConfigDiagnostic[],
): AdminResourceInput[] {
  const resources: AdminResourceInput[] = [];
  for (const plugin of plugins) {
    for (const resource of plugin.contributes?.resources ?? []) {
      if (!resource.name.trim()) {
        diagnostics.push({
          code: 'invalid-plugin-contribution',
          message: `Plugin "${plugin.name}" contributes a resource without a name`,
          source: plugin.name,
        });
        continue;
      }
      resources.push(resource);
    }
  }
  return resources;
}

function collectPluginProviders(
  plugins: readonly AdminPluginDescriptor[],
  diagnostics: AdminConfigDiagnostic[],
): ProviderBundle[] {
  const bundles: ProviderBundle[] = [];
  for (const plugin of plugins) {
    const providers = plugin.contributes?.providers;
    if (providers === undefined) continue;
    if (isSingleDataProvider(providers.dataProvider) === false && Object.keys(providers.dataProvider).length === 0) {
      diagnostics.push({
        code: 'invalid-plugin-contribution',
        message: `Plugin "${plugin.name}" contributes an empty provider bundle`,
        source: plugin.name,
      });
      continue;
    }
    bundles.push(providers);
  }
  return bundles;
}

/**
 * Folds plugin contributions into a deterministic application snapshot.
 * Never throws on recoverable conflicts; inspect `diagnostics` instead.
 */
export function resolveAdminConfig(config: AdminConfig): ResolvedAdminConfig {
  const diagnostics: AdminConfigDiagnostic[] = [];
  const plugins = config.plugins ?? [];

  const pluginNames = plugins.map((plugin) => plugin.name);
  for (const duplicate of duplicateValues(pluginNames)) {
    diagnostics.push({
      code: 'duplicate-plugin',
      message: `Plugin "${duplicate}" is registered more than once`,
      source: duplicate,
    });
  }

  const pluginResources = collectPluginResources(plugins, diagnostics);
  const resources = [...(config.resources ?? []), ...pluginResources].map(normalizeAdminResource);
  const resourceNames = new Set<string>();
  for (const resource of resources) {
    if (!resource.name.trim()) {
      diagnostics.push({ code: 'invalid-resource', message: 'A resource is defined without a name' });
      continue;
    }
    if (resourceNames.has(resource.name)) {
      diagnostics.push({
        code: 'duplicate-resource',
        message: `Resource "${resource.name}" is registered more than once`,
        source: resource.name,
      });
    }
    resourceNames.add(resource.name);
  }

  const providers = mergeProviderBundles(
    [...providerBundlesOf(config), ...collectPluginProviders(plugins, diagnostics)],
  );

  return {
    name: config.name,
    providers,
    resources,
    plugins,
    diagnostics,
  };
}

/** Builds the `provideAdminContext` source from a resolved config. */
export function toAdminContextSource(config: ResolvedAdminConfig): ResolvedAdminContextSource {
  return { providerBundle: config.providers, resources: [...config.resources] };
}

/** Throws when resolution produced error diagnostics; useful at app startup and in `doctor`. */
export function assertAdminConfig(config: AdminConfig): ResolvedAdminConfig {
  const resolved = resolveAdminConfig(config);
  if (resolved.diagnostics.length > 0) {
    throw new Error(
      `Invalid admin config:\n${resolved.diagnostics.map((entry) => `- [${entry.code}] ${entry.message}`).join('\n')}`,
    );
  }
  return resolved;
}