/**
 * Scoped provider/resource overrides.
 *
 * `provideAdminConfig` (or `AdminApp`) establishes the application scope. Calling
 * `provideResourceScope` in any descendant subtree adds a narrower scope without
 * touching global state, giving the four practical levels:
 *
 *   Application (provideAdminConfig)
 *     -> Route (provideResourceScope in the route component)
 *       -> Resource (provideResourceScope with one resource)
 *         -> Component (provideResourceScope in a widget)
 *
 * Providers and the resource list inherit from the nearest parent unless
 * explicitly overridden.
 */
import { getAdminContext, provideAdminContext, type AdminContextValue } from './context.svelte';
import type { ProviderBundle } from './provider-bundle';
import type { ResourceDefinition } from './types';

export interface ResourceScope {
  /** Restrict the visible resource registry for this subtree. */
  readonly resources?: readonly ResourceDefinition[];
  /** Swap the provider bundle for this subtree (for example a different backend). */
  readonly providerBundle?: ProviderBundle;
}

export function provideResourceScope(scope: ResourceScope): AdminContextValue {
  const parent = getAdminContext();
  if (parent === undefined) {
    throw new Error(
      'provideResourceScope requires an existing AdminContext; call provideAdminConfig or render AdminApp first',
    );
  }
  return provideAdminContext({
    providerBundle: scope.providerBundle ?? parent.providerBundle,
    resources: scope.resources !== undefined ? [...scope.resources] : parent.resources,
    ...(parent.tenant === undefined ? {} : { tenant: parent.tenant }),
  });
}