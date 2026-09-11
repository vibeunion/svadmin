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
export type { DataProviderInput, AdminContextSource, AdminContextValue, AdminContextAccessor, ResolvedProviderBundle } from './context.svelte';
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
  useApiUrl,
  useNavigation, useGo, useBack,
  useGetToPath, useLink,
  useResource,
  useModal,
  useOvertime,
  useNotification,
  useMenu, useBreadcrumb, useThemedLayoutContext,
  resetSidebarCollapsed,
} from './hooks.svelte';
export {
  useList, useOne, useShow, useMany, useInfiniteList, useSelect, useTable,
  useCreate, useUpdate, useDelete, useCreateMany, useUpdateMany, useDeleteMany, useForm,
  useInvalidate,
} from './strict-hooks.svelte';
export { defineResource, getContractFormFields } from './resource-contract';
export { UpdateManyPartialError } from './update-many-contract';
export { CreateManyPartialError } from './create-many-contract';
export type { ContractCreateOptions as UseCreateOptions } from './create-hooks.svelte';
export type { ContractCreateParams as UseCreateMutateParams } from './create-contract';
export type { ContractUpdateOptions as UseUpdateOptions } from './update-hooks.svelte';
export type { ContractUpdateParams as UseUpdateMutateParams } from './update-contract';
export type { ContractDeleteOptions as UseDeleteOptions } from './delete-hooks.svelte';
export type { ContractDeleteParams as UseDeleteMutateParams } from './delete-contract';
export type { ContractFormAction, ContractFormDraft, ContractFormValues } from './resource-contract';
export type { ResourceContract, ContractSchemas, ContractRecord, ContractId, ContractInput } from './resource-contract';
export type { ContractFilter, ContractSort } from './strict-hooks.svelte';
export { defineCommand } from './command-contract';
export type { CommandContract, CommandInput, CommandOutput } from './command-contract';
export { useCustom, useCustomMutation } from './strict-command-hooks.svelte';
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
export { audit, auditWithProvider, writeAuditEntry, recordMutationRollback, setAuditHandler, setAuditLogProvider, getAuditLogProvider, withValidatedAuditProvider, AuditError } from './audit';
export type { AuditLogProvider, AuditLogTransport, AuditCreateParams, AuditQueryParams, AuditDraft } from './audit';
export { TaskError } from './task-contract';
export { withValidatedTaskProvider } from './task-provider';
export type { TaskTransport } from './task-provider';
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
export { setChatProvider, getChatProvider, setChatContext, getChatContext, setAgentProvider, getAgentProvider, registerApproval, resolveApproval, hasPendingApprovals, resetChatProvider, defineAdminTool, decodeAdminToolArgs, executeAdminTool, projectAdminToolSchema } from './chatProvider.svelte';
export type {
  ChatProvider, ChatMessage, ChatMessagePart, ChatContext, ChatAttachment, ChatSource,
  MessageStatus, ToolState, AgentProvider, AgentEvent, AgentOptions, ApprovalResponseOptions,
  AdminTool, ToolResult,
} from './chatProvider.svelte';
export { getTheme, setTheme, toggleTheme, getResolvedTheme, getColorTheme, setColorTheme, getColorThemes, configureTheme, getThemeConfig, clearCssOverrides, builtinPresets, registerColorPreset, getColorPresets, registerThemeOwner, updateThemeOwner, unregisterThemeOwner, resetTheme } from './theme.svelte';
export type { ThemeMode, ColorTheme, ThemeStrategy, ThemeConfig, ColorPreset, ThemeOwnerOptions, ThemeOwnerToken } from './theme.svelte';
export { setUnsavedChanges, getUnsavedChanges, initUnsavedChangesNotifier, resetUnsavedChanges } from './unsaved-changes.svelte';
export { setAdminOptions, getAdminOptions, getTextTransformers } from './options.svelte';
export type { AdminOptions, TextTransformers, OvertimeConfig } from './options.svelte';
export { checkError } from './hook-utils.svelte';
export type { NotificationConfig, OvertimeOptions, OvertimeResult, LiveSubscriptionParams } from './hook-utils.svelte';

export { DeleteManyPartialError, HttpError, UndoError } from './types';
export { withResourceSchemas } from './resource-schemas';
export type { ResourceSchemas, ResourceSchemaMap, InferSchemaResourceMap, InferSchemaInputMap } from './resource-schemas';
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
  ResourceTypeMap, ResourceInputMap, ResourceInputOperation, InferResourceInput, KnownResources, InferData,
  BaseRecord, Role, AuditLog
} from './types';
export type { InvalidateScope } from './options.svelte';
export type { LiveProvider, LiveEvent, LiveMode } from './live.svelte';
export type { Action, CanParams, CanResult, AccessControlProvider, RegisteredAccessControlProvider, AccessControlOptions, FeatureGateConfig, FeatureGateUser } from './permissions.svelte';
export type { AuditEntry, AuditHandler, AuditAction } from './audit';
export { useCan } from './useCan';
export type { UseCanOptions, UseCanResult } from './useCan';
export { createCaslAccessControl } from './adapters/casl';
export { createCasbinAccessControl } from './adapters/casbin';
export type { CasbinAdapterOptions } from './adapters/casbin';
export { downloadData, toCsv, toJson, toXlsx, parseCSV } from './data-transfer.svelte';
export { useExport } from './export-hooks.svelte';
export type { UseExportOptions } from './export-hooks.svelte';
export { useImport } from './import-hooks.svelte';
export type { UseImportOptions, ImportProgress, ImportResult } from './import-hooks.svelte';
export type { ExportFormat } from './data-transfer.svelte';
export {
  useLogin, useLogout,
  useRegister, useForgotPassword, useUpdatePassword,
  useUpdateIdentity, useUpdateProfile,
  useGetIdentity, useIsAuthenticated,
  useOnError, usePermissions,
  getLogoutVersion, resetLogoutVersion,
  captureAuthLiveScope as captureAuthSession,
} from './auth-hooks.svelte';
export type { AuthNotificationOptions } from './auth-hooks.svelte';
export { AuthQueryError, AuthErrorHandlingError } from './auth-query-contract';
export type { AuthErrorHandlingResult } from './auth-query-contract';
export { AuthMutationError } from './auth-mutation-contract';
export { useResourceContract } from './resource-binding.svelte';
export { PermissionHintsError } from './permission-hints-contract';
export type { PermissionHints } from './permission-hints-contract';
export {
  useSubmitTask,
  useTask,
  useTaskList,
  useTaskSubscription,
} from './task-hooks.svelte';
export type { UseSubmitTaskOptions, UseSubmitTaskMutateParams } from './task-hooks.svelte';
export { useParsed, resetGlobalPath, syncGlobalPath } from './useParsed.svelte';
export type { UseStepsFormOptions, UseStepsFormReturn } from './useStepsForm.svelte';
export { useStepsForm } from './useStepsForm.svelte';
export { createHashRouterProvider, createHistoryRouterProvider } from './router-provider';
export type { RouterNavigationResult, RouterProvider } from './router-provider';
export {
  inferFieldType,
  inferResource,
  generateTypeBoxSchemaCode,
  generateListPageCode,
  generateCreatePageCode,
  generateEditPageCode,
  generateShowPageCode,
  generateResourceCode,
  generateComponentCode,
  generateResourceBundle,
} from './inferencer';
export type { InferResult } from './inferencer';
export { createWebSocketLiveProvider } from './live-websocket';
export type { WebSocketLiveProviderOptions } from './live-websocket';
export { createSSELiveProvider } from './live-sse';
export type { SSELiveProviderOptions } from './live-sse';
export { inferFromOpenAPI } from './inferencer-openapi';
export type { InferFromOpenAPIOptions } from './inferencer-openapi';
export { inferFromGraphQL, GRAPHQL_INTROSPECTION_QUERY } from './inferencer-graphql';
export type { InferFromGraphQLOptions, GraphQLIntrospectionSchema, GraphQLTypeDescriptor } from './inferencer-graphql';
export {
  getDefaultFilter, getDefaultSortOrder,
  unionFilters, unionSorters,
  file2Base64, generateDefaultDocumentTitle,
  deriveValidator,
  createTypeBoxValidator,
} from './helpers';
export type { TypeBoxValidatorLike } from './helpers';
export type {
  StrictUseListOptions as UseListOptions,
  StrictUseOneOptions as UseOneOptions,
  StrictUseManyOptions as UseManyOptions,
  StrictUseInfiniteListOptions as UseInfiniteListOptions,
  StrictUseSelectOptions as UseSelectOptions,
  StrictUseDeleteManyOptions as UseDeleteManyOptions,
  StrictUseDeleteManyMutateParams as UseDeleteManyMutateParams,
  StrictUseCreateManyMutateParams as UseCreateManyMutateParams,
  StrictUseUpdateManyMutateParams as UseUpdateManyMutateParams,
  StrictUseFormOptions as UseFormOptions,
  StrictUseFormReturn as UseFormReturn,
} from './strict-hooks.svelte';
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
export { createSchemaFormValidator } from './schema-form';
export type { SchemaFormIssue, SchemaFormOptions } from './schema-form';
