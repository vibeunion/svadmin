// @svadmin/lite — Lightweight SSR Admin UI
// Server-rendered by default, with optional progressive enhancement.

// Server utilities (use in +page.server.ts / hooks.server.ts)
export {
  createListLoader,
  createDetailLoader,
  createCrudActions,
  createAuthGuard,
  createAuthActions,
  createLegacyRedirectHook,
  getLegacyRedirectLocation,
  isLegacyBrowser,
} from './server-adapter';
export type { LegacyRedirectOptions, ListLoaderResult } from './server-adapter';

// Optional browser capabilities. The SSR baseline does not import browser globals.
export {
  LITE_COMPATIBILITY_CATALOG,
  detectLiteCapabilities,
  resolveLiteCompatibility,
} from './compatibility';
export type {
  LiteCapability,
  LiteCapabilitySupport,
  LiteCompatibilityDescriptor,
  LiteCompatibilityResolution,
  LiteFallbackKind,
} from './compatibility';

// Schema generator (TypeBox schemas used by Lite actions and client forms)
export {
  fieldsToTypeBoxSchema,
  resourceToTypeBoxSchema,
  fieldsToZodSchema,
  resourceToZodSchema,
  fieldToInputType,
  fieldToPlaceholder,
} from './schema-generator';

// UI Components (use in +page.svelte with csr = false)
export { getStatusBadgeClass, parseExplicitBoolean, isExplicitBooleanTrue } from './value-normalization';

export { default as LiteLayout } from './components/LiteLayout.svelte';
export { default as LiteTable } from './components/LiteTable.svelte';
export { default as LitePagination } from './components/LitePagination.svelte';
export { default as LiteForm } from './components/LiteForm.svelte';
export { default as LiteLogin } from './components/LiteLogin.svelte';
export { default as LiteShow } from './components/LiteShow.svelte';
export { default as LiteSearch } from './components/LiteSearch.svelte';
export { default as LiteAlert } from './components/LiteAlert.svelte';
export { default as LitePermissionMatrix } from './components/LitePermissionMatrix.svelte';
export { default as LiteAuditLog } from './components/LiteAuditLog.svelte';
export { default as LiteArrayField } from './components/LiteArrayField.svelte';
export { default as LiteDynamicFormList } from './components/LiteDynamicFormList.svelte';
export { default as LiteTransfer } from './components/LiteTransfer.svelte';
export type { TransferItem } from './components/LiteTransfer.svelte';
export { default as LiteFilterBuilder } from './components/LiteFilterBuilder.svelte';
export type { FilterRuleItem } from './components/LiteFilterBuilder.svelte';
export { default as LiteBreadcrumbs } from './components/LiteBreadcrumbs.svelte';
export { default as LiteStatsCard } from './components/LiteStatsCard.svelte';
export { default as LiteConfirmDialog } from './components/LiteConfirmDialog.svelte';
export { default as LiteEmptyState } from './components/LiteEmptyState.svelte';
export { default as LiteTabs } from './components/LiteTabs.svelte';
export { default as LiteShowField } from './components/LiteShowField.svelte';
export { default as LiteMediaThumbnail } from './components/LiteMediaThumbnail.svelte';
export { default as LiteChatDialog } from './components/LiteChatDialog.svelte';
export { default as LiteWatermark } from './components/LiteWatermark.svelte';
export { default as LiteColumnSettings } from './components/LiteColumnSettings.svelte';
export { default as LiteImportWizard } from './components/LiteImportWizard.svelte';
export { default as LiteColumnHeaderFilter } from './components/LiteColumnHeaderFilter.svelte';
export { default as LiteTreeTable } from './components/LiteTreeTable.svelte';
export { default as LiteSensitiveDataMask } from './components/LiteSensitiveDataMask.svelte';
export { default as LiteApprovalActionCard } from './components/LiteApprovalActionCard.svelte';

// Compatibility fallbacks for browser-only and third-party UI capabilities.
export * from './components/compatibility/index';

// Action Buttons
export * from './components/buttons/index';

// Fields
export * from './components/fields/index';

// Pages
export * from './components/pages/index';

// Layout & Navigation
export * from './components/layout/index';

// Advanced UX (gracefully degraded)
export * from './components/advanced/index';

// Widgets & Charts (SSR static alternatives)
export * from './components/widgets/index';
