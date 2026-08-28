// @svadmin/ui — Pre-built admin UI components

// Entry component
export { default as AdminApp } from './components/AdminApp.svelte';

// Admin components
export { default as AutoTable } from './components/AutoTable.svelte';
export { default as AutoForm } from './components/AutoForm.svelte';
export { default as ShowPage } from './components/ShowPage.svelte';
export { default as ConfirmDialog } from './components/ConfirmDialog.svelte';
export { default as Sidebar } from './components/Sidebar.svelte';
export { default as Layout } from './components/Layout.svelte';
export { default as Header } from './components/Header.svelte';
export { default as SvadminLogo } from './components/SvadminLogo.svelte';
export { default as ErrorBoundary } from './components/ErrorBoundary.svelte';
export { default as Toast } from './components/Toast.svelte';
export { default as Breadcrumbs } from './components/Breadcrumbs.svelte';
export { default as FieldRenderer } from './components/FieldRenderer.svelte';
export { default as EmptyState } from './components/EmptyState.svelte';
export { default as StatsCard } from './components/StatsCard.svelte';
export { default as PageHeader } from './components/PageHeader.svelte';
export { default as ResourceOperationsPage } from './components/ResourceOperationsPage.svelte';
export { default as RecordDetailDrawer } from './components/RecordDetailDrawer.svelte';
export { default as ResourceAccessGuard } from './components/ResourceAccessGuard.svelte';
export { default as LoginPage } from './components/LoginPage.svelte';
export { default as AuthPageShell } from './components/AuthPageShell.svelte';
export { default as RegisterPage } from './components/RegisterPage.svelte';
export { default as ForgotPasswordPage } from './components/ForgotPasswordPage.svelte';
export { default as CanAccess } from './components/CanAccess.svelte';
export { default as Can } from './components/CanAccess.svelte';
export { default as UndoableNotification } from './components/UndoableNotification.svelte';
export { default as DevTools } from './components/DevTools.svelte';
export { default as Authenticated } from './components/Authenticated.svelte';
export { default as UpdatePasswordPage } from './components/UpdatePasswordPage.svelte';
export { default as ProfilePage } from './components/ProfilePage.svelte';
export { default as ConfigErrorScreen } from './components/ConfigErrorScreen.svelte';
export { default as InferencerPanel } from './components/InferencerPanel.svelte';
export { default as ListInferencer } from './components/ListInferencer.svelte';
export { default as CreateInferencer } from './components/CreateInferencer.svelte';
export { default as EditInferencer } from './components/EditInferencer.svelte';
export { default as ShowInferencer } from './components/ShowInferencer.svelte';
export { default as ResourceInferencer } from './components/ResourceInferencer.svelte';
export { default as LiveIndicator } from './components/LiveIndicator.svelte';
export { default as ListPage } from './components/ListPage.svelte';
export { default as CreatePage } from './components/CreatePage.svelte';
export { default as EditPage } from './components/EditPage.svelte';
export { default as AutoSaveIndicator } from './components/AutoSaveIndicator.svelte';
export { default as ErrorComponent } from './components/ErrorComponent.svelte';
export { default as PageSkeleton } from './components/PageSkeleton.svelte';
export { default as NavigateToResource } from './components/NavigateToResource.svelte';
export { default as CatchAllNavigate } from './components/CatchAllNavigate.svelte';
export { default as ThemedTitle } from './components/ThemedTitle.svelte';
export { default as CommandPalette } from './components/CommandPalette.svelte';
export { default as StepsForm } from './components/StepsForm.svelte';
// Advanced Form & Data Controls (Refine/Antd Parity)
export { default as DynamicFormList } from './components/DynamicFormList.svelte';
export { default as TreeSelect } from './components/TreeSelect.svelte';
export type { TreeSelectOption } from './components/TreeSelect.svelte';
export { default as Cascader } from './components/Cascader.svelte';
export type { CascaderOption } from './components/Cascader.svelte';
export { default as Transfer } from './components/Transfer.svelte';
export type { TransferItem } from './components/Transfer.svelte';
export { default as FilterBuilder } from './components/FilterBuilder.svelte';
export type { FilterRuleItem } from './components/FilterBuilder.svelte';
export { default as Watermark } from './components/Watermark.svelte';
export { default as ColumnSettings } from './components/ColumnSettings.svelte';
export type { ColumnItem } from './components/ColumnSettings.svelte';
export { default as UnsavedChangesPrompt } from './components/UnsavedChangesPrompt.svelte';
export { default as ImportWizard } from './components/ImportWizard.svelte';
export { default as ColumnHeaderFilter } from './components/ColumnHeaderFilter.svelte';
export { default as TreeTable } from './components/TreeTable.svelte';
export type { TreeTableColumn } from './components/TreeTable.svelte';
export { default as SensitiveDataMask } from './components/SensitiveDataMask.svelte';
export type { MaskType } from './components/SensitiveDataMask.svelte';
export { default as ApprovalActionCard } from './components/ApprovalActionCard.svelte';
export type { ApprovalStatus } from './components/ApprovalActionCard.svelte';
export { default as StepForm } from './components/StepForm.svelte';
export type { FormStep } from './components/StepForm.svelte';
export { default as ModalForm } from './components/ModalForm.svelte';
export { default as DrawerForm } from './components/DrawerForm.svelte';
export { default as TableSummary } from './components/TableSummary.svelte';
export type { TableSummaryColumn, AggregationType } from './components/TableSummary.svelte';
export { default as VersionDiffViewer } from './components/VersionDiffViewer.svelte';
export { default as VirtualTable } from './components/VirtualTable.svelte';
export type { VirtualTableColumn } from './components/VirtualTable.svelte';
export { default as EditableTable } from './components/EditableTable.svelte';
export type { EditableTableColumn } from './components/EditableTable.svelte';
export { default as DraggableRowTable } from './components/DraggableRowTable.svelte';
export type { DraggableTableColumn } from './components/DraggableRowTable.svelte';
export { default as SplitPaneLayout } from './components/SplitPaneLayout.svelte';
export { default as MasterDetailView } from './components/MasterDetailView.svelte';
export { default as MediaLibraryModal } from './components/MediaLibraryModal.svelte';
export type { MediaItem } from './components/MediaLibraryModal.svelte';
export { default as ImageCropper } from './components/ImageCropper.svelte';
export { default as ActivityFeed } from './components/ActivityFeed.svelte';
export type { ActivityItem } from './components/ActivityFeed.svelte';
export { default as PresenceAvatarGroup } from './components/PresenceAvatarGroup.svelte';
export type { PresenceUser } from './components/PresenceAvatarGroup.svelte';
export { default as PrintableBill } from './components/PrintableBill.svelte';
export type { BillItem } from './components/PrintableBill.svelte';
export { default as JsonSchemaForm } from './components/JsonSchemaForm.svelte';
export { default as MentionsInput } from './components/MentionsInput.svelte';
export type { MentionOption } from './components/MentionsInput.svelte';
export { default as KanbanBoard } from './components/KanbanBoard.svelte';
export type { KanbanCard, KanbanColumn } from './components/KanbanBoard.svelte';
export { default as PivotTable } from './components/PivotTable.svelte';
export type { AggregationFn } from './components/PivotTable.svelte';
export { default as MultiTabKeepAlive } from './components/MultiTabKeepAlive.svelte';
export type { WorkspaceTab } from './components/MultiTabKeepAlive.svelte';
export { default as GanttChart } from './components/GanttChart.svelte';
export type { GanttTask } from './components/GanttChart.svelte';
export { default as CanvasAnnotation } from './components/CanvasAnnotation.svelte';
export type { AnnotationTool } from './components/CanvasAnnotation.svelte';
export { default as SignaturePad } from './components/SignaturePad.svelte';
export { default as PdfDocumentViewer } from './components/PdfDocumentViewer.svelte';
export type { DocumentStamp } from './components/PdfDocumentViewer.svelte';
export { default as SpreadsheetView } from './components/SpreadsheetView.svelte';
export type { SheetData } from './components/SpreadsheetView.svelte';
export { default as DecisionTable } from './components/DecisionTable.svelte';
export type { DecisionColumn, DecisionRule } from './components/DecisionTable.svelte';
export { default as OfflineSyncBanner } from './components/OfflineSyncBanner.svelte';
export type { PendingMutation } from './components/OfflineSyncBanner.svelte';

export { default as InfiniteList } from './components/InfiniteList.svelte';
export { default as ComboboxField } from './components/ComboboxField.svelte';
export { default as PasswordInput } from './components/PasswordInput.svelte';
export { default as ChatDialog } from "./components/ChatDialog.svelte";
export { default as MarkdownRenderer } from "./components/MarkdownRenderer.svelte";
export { default as SmartSuggest } from "./components/SmartSuggest.svelte";
export { default as AICommandBar } from "./components/AICommandBar.svelte";
export { default as CopilotPanel } from "./components/CopilotPanel.svelte";
export { default as InsightCard } from "./components/InsightCard.svelte";
export { default as AnomalyBadge } from "./components/AnomalyBadge.svelte";
export { default as VoiceInput } from "./components/VoiceInput.svelte";
export { default as AnimatedCounter } from "./components/AnimatedCounter.svelte";
export { default as KeyboardShortcuts } from "./components/KeyboardShortcuts.svelte";
export { default as InlineEdit } from "./components/InlineEdit.svelte";
export { default as DraggableHeader } from "./components/DraggableHeader.svelte";
export { default as SettingsPage } from "./components/SettingsPage.svelte";
export { default as FeedbackNotice } from './components/content/FeedbackNotice.svelte';
export type {
  FeedbackNoticeTone,
  FeedbackNoticePriority,
} from './components/content/FeedbackNotice.svelte';

// Editor Registry
export { setRichTextEditor, getRichTextEditor } from "./editor-config.svelte.js";

// Settings & Preferences
export { default as AppearanceSettings } from "./components/AppearanceSettings.svelte";
export { default as AboutSettings } from "./components/AboutSettings.svelte";
export { default as SecuritySettings } from "./components/SecuritySettings.svelte";
export { default as IntegrationsSettings } from "./components/IntegrationsSettings.svelte";
export { default as NotificationsSettings } from "./components/NotificationsSettings.svelte";
export { default as ApiSettings } from "./components/ApiSettings.svelte";
export { default as ErrorPage } from "./components/ErrorPage.svelte";
export { default as PermissionMatrix } from "./components/PermissionMatrix.svelte";
export type { AdminProviderBundle, RoleInfo, ResourceInfo, ActionInfo } from "./types.js";
export { default as RolesSettings } from "./components/RolesSettings.svelte";
export { default as AuditLogViewer } from "./components/AuditLogViewer.svelte";
export { default as TenantSwitcher } from "./components/TenantSwitcher.svelte";
export type { Tenant } from "./types.js";
export { default as TaskQueueDrawer } from "./components/TaskQueueDrawer.svelte";
export { default as TaskStatusBadge } from "./components/TaskStatusBadge.svelte";
export { default as TaskProgressBar } from "./components/TaskProgressBar.svelte";
export { default as TaskList } from "./components/TaskList.svelte";
export { default as TaskDetails } from "./components/TaskDetails.svelte";
export { default as RetryTaskButton } from "./components/RetryTaskButton.svelte";
export { default as CancelTaskButton } from "./components/CancelTaskButton.svelte";
export { default as DraggableGrid } from "./components/DraggableGrid.svelte";
export type { GridModule } from "./types.js";

// Dashboard Charts (zero-dependency SVG)
export { BarChart, LineChart, PieChart } from './components/charts/index.js';
// Field display components
export { default as NumberField } from './components/fields/NumberField.svelte';
export { default as DateField } from './components/fields/DateField.svelte';
export { default as EmailField } from './components/fields/EmailField.svelte';
export { default as UrlField } from './components/fields/UrlField.svelte';
export { default as BooleanField } from './components/fields/BooleanField.svelte';
export { default as TagField } from './components/fields/TagField.svelte';
export { default as FileField } from './components/fields/FileField.svelte';
export { default as MarkdownField } from './components/fields/MarkdownField.svelte';
export { default as TextField } from './components/fields/TextField.svelte';
export { default as ImageField } from './components/fields/ImageField.svelte';
export { default as SelectField } from './components/fields/SelectField.svelte';
export { default as MultiSelectField } from './components/fields/MultiSelectField.svelte';
export { default as RelationField } from './components/fields/RelationField.svelte';
export { default as DateRangeField } from './components/fields/DateRangeField.svelte';
export { default as JsonField } from './components/fields/JsonField.svelte';
export { default as RichTextField } from './components/fields/RichTextField.svelte';
export { default as CopyField } from './components/fields/CopyField.svelte';
export { default as AvatarField } from './components/fields/AvatarField.svelte';
export { default as CodeField } from './components/fields/CodeField.svelte';
export { default as PercentField } from './components/fields/PercentField.svelte';
export { default as RatingField } from './components/fields/RatingField.svelte';
export { default as CurrencyField } from './components/fields/CurrencyField.svelte';
export { default as PhoneField } from './components/fields/PhoneField.svelte';

// Rich text editor (requires @svadmin/editor) as a direct import in consumer app

// CRUD Buttons
export {
  CreateButton, EditButton, DeleteButton, ShowButton, ListButton,
  RefreshButton, ExportButton, ImportButton, SaveButton, CloneButton,
} from './components/buttons/index.js';

// Base UI components (shadcn-svelte)
export { Button, buttonVariants } from './components/ui/button/index.js';
export { Input } from './components/ui/input/index.js';
export { Textarea } from './components/ui/textarea/index.js';
export { Select } from './components/ui/select/index.js';
export { Switch } from './components/ui/switch/index.js';
export { Checkbox } from './components/ui/checkbox/index.js';
export { Badge } from './components/ui/badge/index.js';
export { Separator } from './components/ui/separator/index.js';
export { Avatar } from './components/ui/avatar/index.js';
export { Skeleton } from './components/ui/skeleton/index.js';
export * as Sheet from './components/ui/sheet/index.js';
export * as Alert from './components/ui/alert/index.js';
export * as Card from './components/ui/card/index.js';
export * as Dialog from './components/ui/dialog/index.js';
export * as Table from './components/ui/table/index.js';
export * as Tabs from './components/ui/tabs/index.js';
export * as Tooltip from './components/ui/tooltip/index.js';
export * as DropdownMenu from './components/ui/dropdown-menu/index.js';

// Additional shadcn components
export * as Breadcrumb from './components/ui/breadcrumb/index.js';
export * as Pagination from './components/ui/pagination/index.js';
export * as ContextMenu from './components/ui/context-menu/index.js';
export * as NavigationMenu from './components/ui/navigation-menu/index.js';

export * as Collapsible from './components/ui/collapsible/index.js';
export { Label } from './components/ui/label/index.js';
export { Command } from './components/ui/command/index.js';

// Utils
export { cn } from './utils';

// Component Registry (DI)
export {
  setComponentRegistry, getComponentRegistry, useComponent,
  type ComponentRegistry,
} from './component-registry.svelte';

// Field component registry
export {
  builtinDisplayComponents, registerDisplayComponent,
  getDisplayComponent, hasDisplayComponent,
} from './components/fieldComponentMap';
export type { FieldComponentMap } from './components/fieldComponentMap';

// Svelte Actions
export { clickOutside, shortcut, intersect, copyOnClick } from './actions';

// Public Profile
export { default as ProfileCard } from './components/profile/ProfileCard.svelte';
export { default as ProjectsGrid } from './components/profile/ProjectsGrid.svelte';
export { default as ActivityTimeline } from './components/profile/ActivityTimeline.svelte';
export { default as TeamsShowcase } from './components/profile/TeamsShowcase.svelte';
export { default as PublicProfilePage } from './components/profile/PublicProfilePage.svelte';
export { default as ProfileVariantSections } from './components/profile/ProfileVariantSections.svelte';

// Account extensions
export { default as GetStartedPage } from './components/account/GetStartedPage.svelte';
export { default as UserProfilePage } from './components/account/UserProfilePage.svelte';
export { default as CompanyProfilePage } from './components/account/CompanyProfilePage.svelte';
export { default as SettingsPlainPage } from './components/account/SettingsPlainPage.svelte';
export { default as SettingsSidebarPage } from './components/account/SettingsSidebarPage.svelte';
export { default as SettingsEnterprisePage } from './components/account/SettingsEnterprisePage.svelte';
export { default as ImportMembersPage } from './components/account/ImportMembersPage.svelte';
export { default as MembersStarterPage } from './components/account/MembersStarterPage.svelte';
export { default as SecurityLogPage } from './components/account/SecurityLogPage.svelte';
export { default as TeamMembersPage } from './components/account/TeamMembersPage.svelte';

// Network
export { default as UserCardsNFTPage } from './components/network/UserCardsNFTPage.svelte';
export { default as TeamCrewTablePage } from './components/network/TeamCrewTablePage.svelte';

// Auth extensions
export { default as TwoFactorAuthPage } from './components/TwoFactorAuthPage.svelte';

// Stripe-first content page and domain primitives
export { default as ContentPageShell } from './components/content/ContentPageShell.svelte';
export { default as ContentPageHeader } from './components/content/ContentPageHeader.svelte';
export { default as SectionHeader } from './components/content/SectionHeader.svelte';
export { default as PageToolbar } from './components/content/PageToolbar.svelte';
export { default as WorkspaceLayout } from './components/content/WorkspaceLayout.svelte';
export { default as WorkspaceStageStepper } from './components/content/WorkspaceStageStepper.svelte';
export type { WorkspaceStage, WorkspaceStageStatus } from './components/content/WorkspaceStageStepper.svelte';
export { default as WorkspaceActionBar } from './components/content/WorkspaceActionBar.svelte';
export type { WorkspaceActionBarTone } from './components/content/WorkspaceActionBar.svelte';
export { default as WorkspaceTabBar } from './components/content/WorkspaceTabBar.svelte';
export type { WorkspaceTabItem } from './components/content/WorkspaceTabBar.svelte';
export { default as WorkspaceInspector } from './components/content/WorkspaceInspector.svelte';
export { default as WorkspaceSplitPane } from './components/content/WorkspaceSplitPane.svelte';
export { default as SettingsGroup } from './components/content/SettingsGroup.svelte';
export { default as SettingsFieldRow } from './components/content/SettingsFieldRow.svelte';
export { default as MetricBlock } from './components/content/MetricBlock.svelte';
export type { MetricTrendTone } from './components/content/MetricBlock.svelte';
export { default as DescriptionList } from './components/content/DescriptionList.svelte';
export type { DescriptionItem } from './components/content/DescriptionList.svelte';
export { default as StatusBadge } from './components/content/StatusBadge.svelte';
export type { Status } from './components/content/StatusBadge.svelte';
export { default as StatusTabs } from './components/content/StatusTabs.svelte';
export type { StatusTabItem } from './components/content/StatusTabs.svelte';
export { default as FilterToolbar } from './components/content/FilterToolbar.svelte';
export { default as DataState } from './components/content/DataState.svelte';
export type { DataStateKind } from './components/content/DataState.svelte';
export { default as ProjectCard } from './components/content/ProjectCard.svelte';
export type { ProjectSummary, ProjectStatus } from './components/content/ProjectCard.svelte';
export { default as TeamCard } from './components/content/TeamCard.svelte';
export type { TeamSummary } from './components/content/TeamCard.svelte';
export { default as FileList } from './components/content/FileList.svelte';
export type { FileItem } from './components/content/FileList.svelte';
export { default as IntegrationCard } from './components/content/IntegrationCard.svelte';
export type { IntegrationSummary } from './components/content/IntegrationCard.svelte';
export { default as ApiKeyList } from './components/content/ApiKeyList.svelte';
export type { ApiKeySummary } from './components/content/ApiKeyList.svelte';
export { default as SecurityEventTable } from './components/content/SecurityEventTable.svelte';
export type { SecurityEvent } from './components/content/SecurityEventTable.svelte';
export { default as MemberList } from './components/content/MemberList.svelte';
export type { MemberSummary } from './components/content/MemberList.svelte';
export { default as ImportDropzone } from './components/content/ImportDropzone.svelte';
export { default as NetworkUserCard } from './components/content/NetworkUserCard.svelte';
export type { NetworkUser, NetworkMetric } from './components/content/NetworkUserCard.svelte';
export { default as NetworkTable } from './components/content/NetworkTable.svelte';
export type { NetworkColumn } from './components/content/NetworkTable.types.js';
export { default as OtpInput } from './components/content/OtpInput.svelte';
export { default as TwoFactorStepper } from './components/content/TwoFactorStepper.svelte';
export { default as SystemErrorState } from './components/content/SystemErrorState.svelte';
export { referenceDemoData } from './reference-data.js';
export type { DemoMember, DemoProject, DemoTeam, DemoIntegration, DemoApiKey, DemoSecurityEvent, DemoNotification } from './reference-data.js';

export { default as RowActions } from './components/RowActions.svelte';
export type { RowActionItem } from './components/RowActions.svelte';
export { default as DetailDrawer } from './components/DetailDrawer.svelte';
export { default as AuditTimeline } from './components/content/AuditTimeline.svelte';
export type { TimelineItem } from './components/content/AuditTimeline.svelte';
export type { TagTone } from './components/fields/TagField.svelte';
export type { BooleanTone } from './components/fields/BooleanField.svelte';
export type { DateFieldFormat } from './components/fields/DateField.svelte';
export type { AvatarStatus, AvatarSize } from './components/fields/AvatarField.svelte';

export { default as FilterDropdown } from './components/FilterDropdown.svelte';
export { default as BatchActionBar } from './components/BatchActionBar.svelte';
export type { DateRangeFormat, DateRangeValue } from './components/fields/DateRangeField.svelte';
export type { PercentTone } from './components/fields/PercentField.svelte';
export type { RatingSize } from './components/fields/RatingField.svelte';
export type { CurrencyTone } from './components/fields/CurrencyField.svelte';
export { default as MediaThumbnail } from './components/content/MediaThumbnail.svelte';
export type { MediaThumbnailSize, MediaThumbnailFit } from './components/content/MediaThumbnail.svelte';
