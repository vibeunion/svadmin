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
  fieldToInputType,
  fieldToPlaceholder,
} from './schema-generator';

// UI Components (use in +page.svelte with csr = false)
export { getStatusBadgeClass, parseExplicitBoolean, isExplicitBooleanTrue } from './value-normalization';

export { default as LiteLayout } from './components/LiteLayout.svelte';
export { default as LiteTable } from './components/LiteTable.svelte';
export { default as LitePagination } from './components/LitePagination.svelte';
export { default as LiteForm } from './components/LiteForm.svelte';
export { default as LiteFileInput } from './components/LiteFileInput.svelte';
export { default as LiteFileUpload } from './components/LiteFileUpload.svelte';
export { default as LiteLogin } from './components/LiteLogin.svelte';
export { default as LiteShow } from './components/LiteShow.svelte';
export { default as LiteSearch } from './components/LiteSearch.svelte';
export { default as LiteAlert } from './components/LiteAlert.svelte';
export { default as LiteErrorSummary } from './components/LiteErrorSummary.svelte';
export type { LiteFormErrorEntry } from './components/LiteErrorSummary.svelte';
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
export { default as LiteMetricStrip } from './components/LiteMetricStrip.svelte';
export type {
  LiteMetricStripItem,
  LiteMetricTone,
  LiteMetricBadgeTone,
} from './components/LiteMetricStrip.svelte';
export { default as LiteBadge } from './components/LiteBadge.svelte';
export type { LiteBadgeVariant } from './components/LiteBadge.svelte';
export { default as LiteTag } from './components/LiteTag.svelte';
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
export { default as LiteStepForm } from './components/LiteStepForm.svelte';
export { default as LiteModalForm } from './components/LiteModalForm.svelte';
export { default as LiteDrawerForm } from './components/LiteDrawerForm.svelte';
export { default as LiteTableSummary } from './components/LiteTableSummary.svelte';
export { default as LiteVersionDiffViewer } from './components/LiteVersionDiffViewer.svelte';
export { default as LiteVirtualTable } from './components/LiteVirtualTable.svelte';
export { default as LiteEditableTable } from './components/LiteEditableTable.svelte';
export { default as LiteDraggableRowTable } from './components/LiteDraggableRowTable.svelte';
export { default as LiteSplitPaneLayout } from './components/LiteSplitPaneLayout.svelte';
export { default as LiteMasterDetailView } from './components/LiteMasterDetailView.svelte';
export { default as LiteMediaLibraryModal } from './components/LiteMediaLibraryModal.svelte';
export { default as LiteImageCropper } from './components/LiteImageCropper.svelte';
export { default as LiteActivityFeed } from './components/LiteActivityFeed.svelte';
export { default as LitePresenceAvatarGroup } from './components/LitePresenceAvatarGroup.svelte';
export { default as LitePrintableBill } from './components/LitePrintableBill.svelte';
export { default as LiteJsonSchemaForm } from './components/LiteJsonSchemaForm.svelte';
export {
  decodeSchemaFormArrayAction,
  decodeSchemaFormData,
  decodeSchemaFormSubmission,
  encodeSchemaFormArrayAction,
  schemaFormActionName,
  schemaFormFieldName,
} from './schema-form-data';
export type { SchemaFormArrayAction, SchemaFormSchema } from './schema-form-data';
export { default as LiteMentionsInput } from './components/LiteMentionsInput.svelte';
export { default as LiteKanbanBoard } from './components/LiteKanbanBoard.svelte';
export { default as LitePivotTable } from './components/LitePivotTable.svelte';
export { default as LiteMultiTabKeepAlive } from './components/LiteMultiTabKeepAlive.svelte';
export { default as LiteGanttChart } from './components/LiteGanttChart.svelte';
export { default as LiteCanvasAnnotation } from './components/LiteCanvasAnnotation.svelte';
export type { AnnotationItem } from './components/LiteCanvasAnnotation.svelte';
export { default as LiteSignaturePad } from './components/LiteSignaturePad.svelte';
export { default as LitePdfDocumentViewer } from './components/LitePdfDocumentViewer.svelte';
export { default as LiteSpreadsheetView } from './components/LiteSpreadsheetView.svelte';
export { default as LiteDecisionTable } from './components/LiteDecisionTable.svelte';
export { default as LiteOfflineSyncBanner } from './components/LiteOfflineSyncBanner.svelte';

// Media, navigation and feedback primitives added to keep Lite aligned with
// the modern @svadmin/ui surface. These render static SSR HTML and never
// require hydration.
export { default as LiteImage } from './components/LiteImage.svelte';
export { default as LiteImagePreview } from './components/LiteImagePreview.svelte';
export { default as LiteVideoPlayer } from './components/LiteVideoPlayer.svelte';
// LiteQRCode is an opt-in subpath export because it statically imports the
// optional `qrcode` peer. Keeping it out of the root entry lets a consumer
// import '@svadmin/lite' without installing that peer:
//   import LiteQRCode from '@svadmin/lite/components/LiteQRCode.svelte';
export { default as LiteCalendar } from './components/LiteCalendar.svelte';
export { default as LiteCarousel } from './components/LiteCarousel.svelte';
export { default as LiteAnchor } from './components/LiteAnchor.svelte';
export { default as LiteAffix } from './components/LiteAffix.svelte';
export { default as LiteCollapse } from './components/LiteCollapse.svelte';
export { default as LiteCommentThread } from './components/LiteCommentThread.svelte';
export { default as LiteFloatButton } from './components/LiteFloatButton.svelte';
export { default as LiteSteps } from './components/LiteSteps.svelte';
export { default as LiteTimeline } from './components/LiteTimeline.svelte';
export { default as LiteStatistic } from './components/LiteStatistic.svelte';
export { default as LiteCountdown } from './components/LiteCountdown.svelte';
export { default as LiteTour } from './components/LiteTour.svelte';
export { default as LiteMenu } from './components/LiteMenu.svelte';
export { default as LiteSpace } from './components/LiteSpace.svelte';
export { default as LiteGrid } from './components/LiteGrid.svelte';
export { default as LiteLink } from './components/LiteLink.svelte';
export { default as LitePageHeader } from './components/LitePageHeader.svelte';
export { default as LiteStatusBadge } from './components/LiteStatusBadge.svelte';
export { default as LiteStatusTabs } from './components/LiteStatusTabs.svelte';
export { default as LiteNotificationCenter } from './components/LiteNotificationCenter.svelte';
export { default as LiteOtpInput } from './components/LiteOtpInput.svelte';
export { default as LiteTwoFactorStepper } from './components/LiteTwoFactorStepper.svelte';
export { default as LitePopconfirm } from './components/LitePopconfirm.svelte';
export { default as LiteDetailDrawer } from './components/LiteDetailDrawer.svelte';
export { default as LiteRowActions } from './components/LiteRowActions.svelte';
export { default as LiteItemList } from './components/LiteItemList.svelte';
export { default as LiteBackTop } from './components/LiteBackTop.svelte';
export { default as LiteResizeBox } from './components/LiteResizeBox.svelte';
export { default as LiteAutoComplete } from './components/LiteAutoComplete.svelte';
export { default as LiteResult } from './components/LiteResult.svelte';
export { default as LiteSkeleton } from './components/LiteSkeleton.svelte';
export { default as LiteSpin } from './components/LiteSpin.svelte';
export { default as LiteProgress } from './components/LiteProgress.svelte';
export { default as LiteTree } from './components/LiteTree.svelte';

// Recent enterprise UI parity fallbacks
export { default as LiteTrendIndicator } from './components/LiteTrendIndicator.svelte';
export { default as LiteMetricGrid } from './components/LiteMetricGrid.svelte';
export { default as LiteOrgChart } from './components/LiteOrgChart.svelte';
export { default as LiteCronExpressionBuilder } from './components/LiteCronExpressionBuilder.svelte';
export { default as LiteVirtualTreeSelect } from './components/LiteVirtualTreeSelect.svelte';
export { default as LiteConcurrentConflictModal } from './components/LiteConcurrentConflictModal.svelte';
export { default as LiteTaskCenter } from './components/LiteTaskCenter.svelte';
export { default as LiteMicroAppFrame } from './components/LiteMicroAppFrame.svelte';
export { default as LiteSafeDeleteConfirm } from './components/LiteSafeDeleteConfirm.svelte';
export type { LiteOrgNode } from './components/LiteOrgChart.svelte';
export type { LiteVirtualTreeNode } from './components/LiteVirtualTreeSelect.svelte';
export type { LiteConflictField } from './components/LiteConcurrentConflictModal.svelte';
export type { LiteTaskStatus, LiteBackgroundTask } from './components/LiteTaskCenter.svelte';
export type { LiteDeleteImpact } from './components/LiteSafeDeleteConfirm.svelte';

// Enterprise suites SSR parity fallbacks
export { default as LiteKpiCard } from './components/LiteKpiCard.svelte';
export { default as LiteJsonViewer } from './components/LiteJsonViewer.svelte';
export { default as LiteResultPage } from './components/LiteResultPage.svelte';
export { default as LiteWatermarkContainer } from './components/LiteWatermarkContainer.svelte';
export { default as LiteContextMenu } from './components/LiteContextMenu.svelte';
export { default as LiteUnsavedChangesGuard } from './components/LiteUnsavedChangesGuard.svelte';
export { default as LiteAnnouncementBanner } from './components/LiteAnnouncementBanner.svelte';
export { default as LiteTextDiffViewer } from './components/LiteTextDiffViewer.svelte';
export { default as LiteAsyncExportModal } from './components/LiteAsyncExportModal.svelte';
export type { LiteContextMenuItem } from './components/LiteContextMenu.svelte';
export { default as LiteStepWizard } from './components/LiteStepWizard.svelte';
export { default as LiteWorkflowStepper } from './components/LiteWorkflowStepper.svelte';
export { default as LiteDualApprovalGate } from './components/LiteDualApprovalGate.svelte';
export { default as LiteKeyboardShortcutsModal } from './components/LiteKeyboardShortcutsModal.svelte';
export type { LiteStepItem } from './components/LiteStepWizard.svelte';
export type { LiteWorkflowNode } from './components/LiteWorkflowStepper.svelte';
export type { LiteShortcutItem } from './components/LiteKeyboardShortcutsModal.svelte';
export { default as LiteFormulaField } from './components/LiteFormulaField.svelte';
export { default as LiteDataScreenContainer } from './components/LiteDataScreenContainer.svelte';
export { default as LiteThreadedCommentDrawer } from './components/LiteThreadedCommentDrawer.svelte';
export type { LiteComment } from './components/LiteThreadedCommentDrawer.svelte';

// Enterprise developer sandbox & SaaS billing suite parity fallbacks
export { default as LiteWebhookSimulator } from './components/LiteWebhookSimulator.svelte';
export { default as LiteHmacSignatureCalculator } from './components/LiteHmacSignatureCalculator.svelte';
export { default as LiteApiPlayground } from './components/LiteApiPlayground.svelte';
export { default as LitePlanUsageQuotaBar } from './components/LitePlanUsageQuotaBar.svelte';
export { default as LiteTierFeatureComparison } from './components/LiteTierFeatureComparison.svelte';
export { default as LiteBillingInvoiceDrawer } from './components/LiteBillingInvoiceDrawer.svelte';

// Enterprise wave 6 parity fallbacks
export { default as LiteSqlConsole } from './components/LiteSqlConsole.svelte';
export { default as LiteEnvVariableEditor } from './components/LiteEnvVariableEditor.svelte';
export { default as LiteScheduledJobManager } from './components/LiteScheduledJobManager.svelte';
export { default as LiteTenantQuotasMatrix } from './components/LiteTenantQuotasMatrix.svelte';
export { default as LiteTableAggregationFooter } from './components/LiteTableAggregationFooter.svelte';
export { default as LiteSecureDataExporter } from './components/LiteSecureDataExporter.svelte';
export { default as LiteDataImportDropzone } from './components/LiteDataImportDropzone.svelte';
export { default as LiteColumnMappingTable } from './components/LiteColumnMappingTable.svelte';
export { default as LiteImportPreviewValidator } from './components/LiteImportPreviewValidator.svelte';
export { default as LiteApprovalChainBuilder } from './components/LiteApprovalChainBuilder.svelte';
export { default as LitePeriodComparisonCard } from './components/LitePeriodComparisonCard.svelte';

// Enterprise wave 7 parity fallbacks
export { default as LitePivotMatrix } from './components/LitePivotMatrix.svelte';
export { default as LiteGeoScatterMap } from './components/LiteGeoScatterMap.svelte';
export { default as LiteDataMaskPolicyEngine } from './components/LiteDataMaskPolicyEngine.svelte';
export { default as LiteSystemHealthCheckDashboard } from './components/LiteSystemHealthCheckDashboard.svelte';



// Rich content rendering (SSR-safe Markdown + rich HTML allowlist)
export {
  configureMarkdownRenderer,
  escapeHtml,
  renderInlineMarkdown,
  renderMarkdown,
  renderRichContent,
  sanitizeRichTextHtml,
} from './rich-content';
export type { MarkdownRenderOptions } from './rich-content';

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
