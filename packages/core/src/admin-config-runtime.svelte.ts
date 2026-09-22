/**
 * Runtime binding for `defineAdminConfig`.
 *
 * `provideAdminConfig` resolves the application config once during component
 * initialization and installs the resulting ProviderBundle + ResourceDefinition
 * list into the scoped `AdminContext` tree. It is intentionally thin: all
 * composition and diagnostics live in the pure `admin-config` module.
 */
import { resolveAdminConfig, toAdminContextSource, type AdminConfig } from './admin-config';
import { provideAdminContext, type AdminContextValue } from './context.svelte';

export function provideAdminConfig(config: AdminConfig): AdminContextValue {
  return provideAdminContext(toAdminContextSource(resolveAdminConfig(config)));
}