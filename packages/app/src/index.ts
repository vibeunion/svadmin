/**
 * @svadmin/app — the application composition layer.
 *
 * Curated public surface over `@svadmin/core` for application wiring:
 * `defineAdminConfig`, plugin manifests, runtime binding, AI manifest building,
 * and the `createAdminApp` convenience. Keep app-level additions here so core
 * can stay a lean contracts/runtime package.
 */
export {
  defineAdminConfig,
  defineSvadminPlugin,
  resolveAdminConfig,
  assertAdminConfig,
  toAdminContextSource,
  normalizeAdminResource,
  buildAdminManifest,
  provideAdminConfig,
  provideResourceScope,
  createProviderBundle,
} from '@svadmin/core';
export type {
  AdminConfig,
  AdminConfigDiagnostic,
  AdminConfigDiagnosticCode,
  AdminConfigInput,
  AdminManifest,
  AdminManifestField,
  AdminManifestPlugin,
  AdminManifestProject,
  AdminManifestResource,
  AdminPluginCapability,
  AdminPluginContribution,
  AdminPluginDescriptor,
  AdminPluginDocs,
  AdminResourceDefinition,
  AdminResourceInput,
  ProviderBundle,
  ResolvedAdminConfig,
  ResolvedAdminContextSource,
  ResourceScope,
} from '@svadmin/core';

import {
  resolveAdminConfig,
  type AdminConfig,
  type ProviderBundle,
  type ResourceDefinition,
  type ResolvedAdminConfig,
} from '@svadmin/core';

/** Runtime inputs derived from an application config. */
export interface AdminAppBundle {
  readonly config: ResolvedAdminConfig;
  readonly providers: ProviderBundle;
  readonly resources: readonly ResourceDefinition[];
  readonly diagnostics: ResolvedAdminConfig['diagnostics'];
}

/**
 * Resolves an application config once and exposes the provider bundle plus the
 * normalized resource definitions. Inspect `diagnostics` before rendering; use
 * `assertAdminConfig` when errors should throw at startup.
 */
export function createAdminApp(config: AdminConfig): AdminAppBundle {
  const resolved = resolveAdminConfig(config);
  return {
    config: resolved,
    providers: resolved.providers,
    resources: resolved.resources,
    diagnostics: resolved.diagnostics,
  };
}