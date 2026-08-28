// Core barrel exports

export {
  setDataProvider, getDataProvider, getDataProviderForResource, getDataProviderNames,
  setAuthProvider, getAuthProvider,
  setResources, getResources, getResource,
  setRouterProvider, getRouterProvider,
  setLiveProvider, getLiveProvider,
  setTaskProvider, getTaskProvider,
  createAdminContext, provideAdminContext, getAdminContext, captureAdminContext,
  provideTenantContext, getTenantContext, getProviderBundle,
  resetContext,
} from './context.svelte';
export type { DataProviderInput, AdminContextSource, AdminContextValue, AdminContextAccessor } from './context.svelte';
export {
  createProviderBundle,
  createTenantCacheKey,
  defaultTenantAdapter,
  appendTenantCacheKey,
  isTenantCacheKey,
  queryKeyMatchesTenant,
  resolveTenantProviderMeta,
  withProviderMeta,
  withTenantDataProvider,
} from './provider-bundle';
export {
  dataQueryMatches,
  isQueryKey,
  keys,
  parseQueryKey,
  queryKeyMatches,
  queryKeys,
} from './query-keys';
export type {
  DataQueryMatcher,
  QueryDescriptor,
  QueryKey,
  QueryKeysBuilder,
  QueryKeysContext,
  QueryMatcher,
} from './query-keys';
export type {
  ProviderBundle,
  ProviderMetaInput,
  ProviderMetaResolver,
  TenantAdapter,
  TenantCacheIdentity,
  TenantCacheKey,
  TenantContext,
  TenantId,
} from './provider-bundle';
export {
  useList, useInfiniteList,
  useOne, useShow,
  useSelect, useMany,
  useCustom, useApiUrl,
  useCustomMutation, useInvalidate,
  useCreate, useCreateMany,
  useUpdate, useUpdateMany,
  useDelete, useDeleteMany,
  useForm, useTable,
  useNavigation, useGo, useBack,
  useGetToPath, useLink,
  useResource,
  useModalForm, useDrawerForm, useModal, useCheckboxGroup, useRadioGroup, useAutocomplete,
  useOvertime, useRelation,
  useNotification, useDataProvider,
  useMenu, useBreadcrumb, useThemedLayoutContext,
  publishLiveEvent, resetSidebarCollapsed,
} from './hooks.svelte';
export { matchRoute, navigate, currentPath, setActiveRouterProvider, beforeEach, afterEach, resetRouter } from './router';
export type { RouteGuard } from './router';
export {
  appendListQuery,
  appendListQueryFromPath,
  readURLState,
  sanitizeListQueryParams,
  writeURLState,
} from './url-sync';
export { setAccessControlProvider, getAccessControlProvider, getAccessControlOptions, canAccessAsync, createFeatureGate } from './permissions.svelte';
export { useLive, useSubscription, usePublish } from './live.svelte';
export { toast, getToastQueue, consumeToastQueue, getPromiseQueue, consumePromiseQueue, getToasts, removeToast, resetToast } from './toast.svelte';
export {
  notify,
  notifyWithProvider,
  closeNotification,
  setNotificationProvider,
  getNotificationProvider,
} from './notification.svelte';
export type { NotificationParams } from './notification.svelte';
export { t, setLocale, getLocale, getAvailableLocales, addTranslations, useTranslation, setI18nProvider, getI18nProvider, createI18nScope, provideI18nScope, getI18nScope, resetI18n } from './i18n.svelte';
export type { I18nProvider, I18nScope, I18nScopeOptions } from './i18n.svelte';
export { audit, auditWithProvider, writeAuditEntry, setAuditHandler, setAuditLogProvider, getAuditLogProvider } from './audit';
export type { AuditLogProvider } from './audit';
export type {
  ApiCredentialSummary,
  CreatedApiCredential,
  CredentialProvider,
  EnterpriseActionError,
  EnterpriseActionResult,
  EnterpriseRequestContext,
  EnterpriseRequestContextInput,
  EnterpriseProviderRequestContext,
  StrictEnterpriseRequestContext,
  EnterpriseSecurityEvent,
  EnterpriseSecurityPolicy,
  IdentityGovernanceProvider,
  IdentityProviderProtocol,
  IdentityProviderStatus,
  IdentityProviderSummary,
  MfaState,
  Organization,
  OrganizationProvider,
  SessionInfo,
  SessionProvider,
  WebhookSummary,
} from './enterprise';
export { assertEnterpriseRequestContext, createEnterpriseRequestContext } from './enterprise';
export { setChatProvider, getChatProvider, setChatContext, getChatContext, setAgentProvider, getAgentProvider, registerApproval, resolveApproval, hasPendingApprovals, resetChatProvider } from './chatProvider.svelte';
export type { ChatProvider, ChatMessage, ChatContext, ChatAction, AgentProvider, AgentEvent, AgentOptions, AdminTool, AdminToolParameter, ToolResult } from './chatProvider.svelte';
export { getTheme, setTheme, toggleTheme, getResolvedTheme, getColorTheme, setColorTheme, getColorThemes, configureTheme, getThemeConfig, clearCssOverrides, builtinPresets, registerColorPreset, getColorPresets, registerThemeOwner, updateThemeOwner, unregisterThemeOwner, resetTheme } from './theme.svelte';
export type { ThemeMode, ColorTheme, ThemeStrategy, ThemeConfig, ColorPreset, ThemeOwnerOptions, ThemeOwnerToken } from './theme.svelte';
export { setUnsavedChanges, getUnsavedChanges, initUnsavedChangesNotifier, resetUnsavedChanges } from './unsaved-changes.svelte';
export { setAdminOptions, getAdminOptions, getTextTransformers } from './options.svelte';
export type { AdminOptions, TextTransformers, OvertimeConfig } from './options.svelte';
export { checkError } from './hook-utils.svelte';
export type { NotificationConfig, OvertimeOptions, OvertimeResult, LiveSubscriptionParams } from './hook-utils.svelte';

export { DeleteManyPartialError, HttpError, UndoError } from './types';
export type {
  DataProvider, AuthProvider, NotificationProvider, MutationMode,
  ValidationErrors, HttpErrorOptions, CrudOperator, LogicalFilter, FieldFilter,
  CustomParams, CustomResult,
  GetListParams, GetListResult,
  GetOneParams, GetOneResult,
  GetManyParams, GetManyResult,
  CreateParams, CreateResult,
  CreateManyParams, CreateManyResult,
  UpdateParams, UpdateResult,
  UpdateManyParams, UpdateManyResult,
  DeleteParams, DeleteResult,
  DeleteManyParams, DeleteManyResult,
  Pagination, Sort, Filter, Identity,
  ResourceDefinition, ResourceProviderConfig, ResourceTransportConfig, ResourceAdapterConfig,
  FieldDefinition, MenuItem,
  AuthActionResult, CheckResult,
  ResourceTypeMap, KnownResources, InferData,
  BaseRecord, Role, AuditLog
} from './types';
export type { InvalidateScope } from './options.svelte';
export type { LiveProvider, LiveEvent, LiveMode } from './live.svelte';
export type { Action, CanParams, CanResult, AccessControlProvider, FeatureGateConfig, FeatureGateUser } from './permissions.svelte';
export type { AuditEntry, AuditHandler } from './audit';
export { useCan } from './useCan';
export type { UseCanOptions, UseCanResult } from './useCan';
export { createCaslAccessControl } from './adapters/casl';
export { createCasbinAccessControl } from './adapters/casbin';
export type { CasbinAdapterOptions } from './adapters/casbin';
export { useExport, useImport, downloadData } from './data-transfer.svelte';
export type { UseExportOptions, UseImportOptions, ExportFormat } from './data-transfer.svelte';
export {
  useLogin, useLogout,
  useRegister, useForgotPassword, useUpdatePassword,
  useUpdateIdentity, useUpdateProfile,
  useGetIdentity, useIsAuthenticated,
  useOnError, usePermissions,
  getLogoutVersion, resetLogoutVersion,
} from './auth-hooks.svelte';
export type { AuthNotificationOptions } from './auth-hooks.svelte';
export {
  useSubmitTask,
  useTask,
  useTaskList,
  useTaskSubscription,
} from './task-hooks.svelte';
export { useParsed, resetGlobalPath, syncGlobalPath } from './useParsed.svelte';
export * from './useStepsForm.svelte';
export { createHashRouterProvider, createHistoryRouterProvider } from './router-provider';
export type { RouterNavigationResult, RouterProvider } from './router-provider';
export {
  inferFieldType,
  inferResource,
  generateListPageCode,
  generateCreatePageCode,
  generateEditPageCode,
  generateShowPageCode,
  generateResourceCode,
  generateComponentCode,
} from './inferencer';
export type { InferResult } from './inferencer';
export { createWebSocketLiveProvider } from './live-websocket';
export type { WebSocketLiveProviderOptions } from './live-websocket';
export { createSSELiveProvider } from './live-sse';
export type { SSELiveProviderOptions } from './live-sse';
export { inferFromOpenAPI } from './inferencer-openapi';
export type { InferFromOpenAPIOptions } from './inferencer-openapi';
export {
  getDefaultFilter, getDefaultSortOrder,
  unionFilters, unionSorters,
  file2Base64, generateDefaultDocumentTitle,
  deriveValidator,
  createSchemaValidator,
} from './helpers';
export type { SchemaValidatorLike } from './helpers';
export { TableState } from './table-state.svelte';
export type { TableStateOptions } from './table-state.svelte';
export type { UseInfiniteListOptions } from './hooks.svelte';
export type { UseSelectOptions } from './hooks.svelte';
export type { UseDeleteManyOptions, UseDeleteManyMutateParams } from './hooks.svelte';
export type { UseFormReturn } from './form-hooks.svelte';
export type {
  TaskProvider,
  TaskDateValue,
  TaskMessageValue,
  TaskRecord,
  SubmitTaskOptions,
  TaskHandle,
  TaskListResult,
  TaskSubscription,
} from './types';

// HTTP fetch utilities
export { createFetchWithInterceptor, fetchWithInterceptor } from './http';
export type { FetchWithInterceptor, FetchWithInterceptorOptions } from './http';
