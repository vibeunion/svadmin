/**
 * @svadmin/devtools-contract
 *
 * Re-export shim over `@vibeunion/devtools-protocol`, the single source of
 * truth for JSON-safe DevTools contracts shared by svadmin, SupaCloud, and
 * frontend adapters.
 *
 * The package intentionally owns no contract definitions of its own: keeping a
 * second copy here was how the svadmin / SupaCloud / frontend contracts drifted
 * apart. Product-specific diagnostics live in `@svadmin/devtools`.
 */
export * from '@vibeunion/devtools-protocol';