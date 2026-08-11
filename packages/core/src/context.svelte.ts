// Svelte 5 Context — application trees use scoped context while the module-level
// setters remain as a compatibility facade for non-component consumers.

import { createContext } from 'svelte';
import type { DataProvider, AuthProvider, ResourceDefinition, TaskProvider } from './types';
import type { RouterProvider } from './router-provider';
import type { LiveProvider } from './live.svelte';
import type { AccessControlProvider } from './permissions.svelte';
import type { AuditLogProvider } from './audit';
import type { AgentProvider, ChatProvider } from './chatProvider.svelte';
import {
  appendTenantCacheKey,
  createTenantCacheKey,
  queryKeyMatchesTenant,
  resolveTenantProviderMeta,
  withProviderMeta,
} from './provider-bundle';
import type {
  DataProviderInput,
  ProviderBundle,
  TenantAdapter,
  TenantCacheKey,
  TenantContext,
} from './provider-bundle';
import { getNotificationProvider as getLegacyNotificationProvider, resetNotificationProvider } from './notification.svelte';
import { getAuditLogProvider as getLegacyAuditLogProvider, resetAuditLogProvider } from './audit';
import { getAccessControlProvider as getLegacyAccessControlProvider, resetAccessControlProvider } from './permissions.svelte';
import { resetAdminOptions } from './options.svelte';
import { resetI18n } from './i18n.svelte';
import {
  getAgentProvider as getLegacyAgentProvider,
  getChatProvider as getLegacyChatProvider,
  resetChatProvider,
} from './chatProvider.svelte';
import { resetToast } from './toast.svelte';
import { resetTheme } from './theme.svelte';
import {
  currentPath as currentLegacyPath,
  currentPathWithProvider,
  formatLink as formatLegacyLink,
  formatLinkWithProvider,
  navigate as navigateLegacy,
  navigateWithProvider,
  resetRouter,
} from './router';
import { resetUnsavedChanges } from './unsaved-changes.svelte';
import { resetGlobalPath } from './useParsed.svelte';
import { resetLogoutVersion } from './auth-hooks.svelte';
import { resetSidebarCollapsed } from './hooks.svelte';

// ─── DataProvider (supports single or multiple) ─────────────────

export type { DataProviderInput } from './provider-bundle';

interface AdminContextSourceBase extends Omit<Partial<ProviderBundle>, 'dataProvider'> {
  readonly resources: ResourceDefinition[];
  /** 请求树内租户；未传入时继承最近的 provideTenantContext。 */
  readonly tenant?: TenantContext;
}

/** 必须提供旧式 dataProvider 或一等 ProviderBundle；同名顶层字段优先。 */
export type AdminContextSource = AdminContextSourceBase & (
  | { readonly dataProvider: DataProviderInput; readonly providerBundle?: ProviderBundle }
  | { readonly dataProvider?: DataProviderInput; readonly providerBundle: ProviderBundle }
);

export interface AdminContextValue {
  readonly providerBundle: ProviderBundle;
  readonly providers: Record<string, DataProvider>;
  readonly authProvider: AuthProvider | null;
  readonly resources: ResourceDefinition[];
  readonly routerProvider: RouterProvider | undefined;
  readonly liveProvider: LiveProvider | undefined;
  readonly taskProvider: TaskProvider | undefined;
  readonly accessControlProvider: AccessControlProvider | null;
  readonly auditLogProvider: AuditLogProvider | null;
  readonly notificationProvider: ProviderBundle['notificationProvider'];
  readonly chatProvider: ChatProvider | null;
  readonly agentProvider: AgentProvider | null;
  readonly tenant: TenantContext | undefined;
  readonly tenantAdapter: TenantAdapter | undefined;
}

/**
 * Initialization-time snapshot of the owning AdminContext tree.
 *
 * The accessor keeps the scoped context object (whose fields are reactive
 * getters) instead of calling Svelte's getContext from later DOM/query
 * callbacks. When no scoped context exists, getters intentionally continue to
 * read the module-level compatibility setters dynamically.
 */
export interface AdminContextAccessor {
  readonly providerBundle: ProviderBundle;
  readonly providers: Record<string, DataProvider> | null;
  readonly authProvider: AuthProvider | null;
  readonly resources: ResourceDefinition[];
  readonly routerProvider: RouterProvider | undefined;
  readonly liveProvider: LiveProvider | undefined;
  readonly taskProvider: TaskProvider | undefined;
  readonly accessControlProvider: AccessControlProvider | null;
  readonly auditLogProvider: AuditLogProvider | null;
  readonly notificationProvider: ProviderBundle['notificationProvider'];
  readonly chatProvider: ChatProvider | null;
  readonly agentProvider: AgentProvider | null;
  readonly tenant: TenantContext | undefined;
  readonly tenantAdapter: TenantAdapter | undefined;
  readonly tenantCacheKey: TenantCacheKey | undefined;
  getDataProvider(name?: string): DataProvider;
  getDataProviderNames(): string[];
  getDataProviderForResource(resourceName: string, overrideName?: string): DataProvider;
  getProviderMeta(resourceName: string | undefined, meta?: Record<string, unknown>): Record<string, unknown> | undefined;
  withTenantCacheKey(queryKey: readonly unknown[]): readonly unknown[];
  matchesTenantQuery(queryKey: readonly unknown[]): boolean;
  getResource(nameOrIdentifier: string): ResourceDefinition;
  currentPath(): string;
  formatLink(path: string): string;
  navigate(path: string, options?: { replaceState?: boolean }): Promise<void>;
  back(): void;
}

const [getRequiredAdminContext, setAdminContext] = createContext<AdminContextValue>();
const [getRequiredTenantContext, setScopedTenantContext] = createContext<TenantContext>();

/** Provide tenant state to a request/component subtree. No module-level fallback is created. */
export function provideTenantContext(tenant: TenantContext): TenantContext {
  setScopedTenantContext(tenant);
  return tenant;
}

/** Return the nearest request/tree-scoped tenant when called during initialization. */
export function getTenantContext(): TenantContext | undefined {
  try {
    return getRequiredTenantContext();
  } catch {
    return undefined;
  }
}

function normalizeDataProviders(provider: DataProviderInput): Record<string, DataProvider> {
  return isDataProvider(provider)
    ? { default: provider }
    : provider;
}

function resolveProviderBundle(source: AdminContextSource): ProviderBundle {
  const bundled = source.providerBundle;
  const dataProvider = source.dataProvider ?? bundled?.dataProvider;
  if (!dataProvider) {
    throw new Error('ProviderBundle requires a dataProvider.');
  }

  return {
    dataProvider,
    authProvider: source.authProvider !== undefined ? source.authProvider : bundled?.authProvider,
    accessControlProvider: source.accessControlProvider !== undefined
      ? source.accessControlProvider
      : bundled?.accessControlProvider,
    liveProvider: source.liveProvider ?? bundled?.liveProvider,
    auditLogProvider: source.auditLogProvider !== undefined ? source.auditLogProvider : bundled?.auditLogProvider,
    notificationProvider: source.notificationProvider !== undefined
      ? source.notificationProvider
      : bundled?.notificationProvider,
    chatProvider: source.chatProvider !== undefined ? source.chatProvider : bundled?.chatProvider,
    agentProvider: source.agentProvider !== undefined ? source.agentProvider : bundled?.agentProvider,
    taskProvider: source.taskProvider ?? bundled?.taskProvider,
    routerProvider: source.routerProvider ?? bundled?.routerProvider,
    tenantAdapter: source.tenantAdapter ?? bundled?.tenantAdapter,
  };
}

export function createAdminContext(source: AdminContextSource): AdminContextValue {
  const inheritedTenant = getTenantContext();
  return {
    get providerBundle() { return resolveProviderBundle(source); },
    get providers() { return normalizeDataProviders(resolveProviderBundle(source).dataProvider); },
    get authProvider() { return resolveProviderBundle(source).authProvider ?? null; },
    get resources() { return source.resources; },
    get routerProvider() { return resolveProviderBundle(source).routerProvider; },
    get liveProvider() { return resolveProviderBundle(source).liveProvider; },
    get taskProvider() { return resolveProviderBundle(source).taskProvider; },
    get accessControlProvider() { return resolveProviderBundle(source).accessControlProvider ?? null; },
    get auditLogProvider() { return resolveProviderBundle(source).auditLogProvider ?? null; },
    get notificationProvider() { return resolveProviderBundle(source).notificationProvider ?? null; },
    get chatProvider() { return resolveProviderBundle(source).chatProvider ?? null; },
    get agentProvider() { return resolveProviderBundle(source).agentProvider ?? null; },
    get tenant() { return source.tenant ?? inheritedTenant; },
    get tenantAdapter() { return resolveProviderBundle(source).tenantAdapter; },
  };
}

/** Provide request/tree-scoped admin state to all descendants. */
export function provideAdminContext(source: AdminContextSource): AdminContextValue {
  const context = createAdminContext(source);
  setAdminContext(context);
  return context;
}

/** Return the current tree context when called during component initialization/render. */
export function getAdminContext(): AdminContextValue | undefined {
  try {
    return getRequiredAdminContext();
  } catch {
    return undefined;
  }
}

let providers = $state<Record<string, DataProvider> | null>(null);

/** Capture the current tree once so delayed callbacks never re-enter getContext. */
export function captureAdminContext(): AdminContextAccessor {
  const scopedContext = getAdminContext();
  const adaptedProviders = new Map<DataProvider, DataProvider>();

  function adaptProvider(provider: DataProvider): DataProvider {
    const hasResourceMetadata = accessor.resources.some((resource) => resource.provider !== undefined);
    if (!accessor.tenant && !hasResourceMetadata) return provider;
    const cached = adaptedProviders.get(provider);
    if (cached) return cached;
    const adapted = withProviderMeta(provider, ({ resource, meta }) => accessor.getProviderMeta(resource, meta));
    adaptedProviders.set(provider, adapted);
    return adapted;
  }

  const accessor: AdminContextAccessor = {
    get providerBundle() {
      if (scopedContext) return scopedContext.providerBundle;
      if (!providers) throw new Error('DataProvider not found. Did you call setDataProvider in App.svelte?');
      return {
        dataProvider: providers,
        authProvider,
        accessControlProvider: getLegacyAccessControlProvider(),
        liveProvider: liveProviderState,
        auditLogProvider: getLegacyAuditLogProvider(),
        notificationProvider: getLegacyNotificationProvider(),
        chatProvider: getLegacyChatProvider(),
        agentProvider: getLegacyAgentProvider(),
        taskProvider: taskProviderState,
        routerProvider,
      };
    },
    get providers() { return scopedContext ? scopedContext.providers : providers; },
    get authProvider() { return scopedContext ? scopedContext.authProvider : authProvider; },
    get resources() { return scopedContext ? scopedContext.resources : resources ?? []; },
    get routerProvider() { return scopedContext ? scopedContext.routerProvider : routerProvider; },
    get liveProvider() { return scopedContext ? scopedContext.liveProvider : liveProviderState; },
    get taskProvider() { return scopedContext ? scopedContext.taskProvider : taskProviderState; },
    get accessControlProvider() {
      return scopedContext ? scopedContext.accessControlProvider : getLegacyAccessControlProvider();
    },
    get auditLogProvider() { return scopedContext ? scopedContext.auditLogProvider : getLegacyAuditLogProvider(); },
    get notificationProvider() {
      return scopedContext ? scopedContext.notificationProvider : getLegacyNotificationProvider();
    },
    get chatProvider() { return scopedContext ? scopedContext.chatProvider : getLegacyChatProvider(); },
    get agentProvider() { return scopedContext ? scopedContext.agentProvider : getLegacyAgentProvider(); },
    get tenant() { return scopedContext?.tenant; },
    get tenantAdapter() { return scopedContext?.tenantAdapter; },
    get tenantCacheKey() {
      return accessor.tenant ? createTenantCacheKey(accessor.tenant, accessor.tenantAdapter) : undefined;
    },
    getDataProvider(name) {
      const activeProviders = accessor.providers;
      if (!activeProviders) throw new Error('DataProvider not found. Did you call setDataProvider in App.svelte?');
      const key = name ?? 'default';
      const provider = activeProviders[key];
      if (!provider) {
        throw new Error(`DataProvider "${key}" not found. Available: ${Object.keys(activeProviders).join(', ')}`);
      }
      return adaptProvider(provider);
    },
    getDataProviderNames() {
      return accessor.providers ? Object.keys(accessor.providers) : [];
    },
    getDataProviderForResource(resourceName, overrideName) {
      if (overrideName) {
        try {
          return accessor.getDataProvider(overrideName);
        } catch {
          // Preserve the historical fallback to the resource/default provider.
        }
      }
      try {
        const resource = accessor.getResource(resourceName);
        const dataProviderName = resource.provider?.dataProviderName ?? resource.meta?.dataProviderName;
        if (dataProviderName) return accessor.getDataProvider(dataProviderName);
      } catch {
        // Preserve the historical fallback when a resource is not registered.
      }
      return accessor.getDataProvider();
    },
    getProviderMeta(resourceName, meta) {
      const resource = resourceName
        ? accessor.resources.find((candidate) => candidate.identifier === resourceName || candidate.name === resourceName)
        : undefined;
      const providerConfig = resource?.provider;
      const tenant = accessor.tenant;
      if (!providerConfig && !tenant) return meta;

      return {
        ...(providerConfig?.meta ?? {}),
        ...(meta ?? {}),
        ...(providerConfig?.transport === undefined ? {} : { transport: providerConfig.transport }),
        ...(providerConfig?.adapter === undefined ? {} : { adapter: providerConfig.adapter }),
        ...(tenant ? resolveTenantProviderMeta(tenant, accessor.tenantAdapter) : {}),
      };
    },
    withTenantCacheKey(queryKey) {
      return appendTenantCacheKey(queryKey, accessor.tenantCacheKey);
    },
    matchesTenantQuery(queryKey) {
      return queryKeyMatchesTenant(queryKey, accessor.tenantCacheKey);
    },
    getResource(nameOrIdentifier) {
      const resource = accessor.resources.find(
        (candidate) => candidate.identifier === nameOrIdentifier || candidate.name === nameOrIdentifier,
      );
      if (!resource) throw new Error(`Resource "${nameOrIdentifier}" not found in resource definitions.`);
      return resource;
    },
    currentPath() {
      if (scopedContext) return currentPathWithProvider(scopedContext.routerProvider);
      return currentLegacyPath();
    },
    formatLink(path) {
      if (scopedContext) return formatLinkWithProvider(scopedContext.routerProvider, path);
      return formatLegacyLink(path);
    },
    async navigate(path, options) {
      if (scopedContext) {
        await navigateWithProvider(scopedContext.routerProvider, path, options);
        return;
      }
      await navigateLegacy(path, options);
    },
    back() {
      const activeRouter = accessor.routerProvider;
      if (activeRouter?.back) {
        activeRouter.back();
      } else if (typeof window !== 'undefined') {
        window.history.back();
      }
    },
  };

  return accessor;
}

export function setDataProvider(provider: DataProviderInput): void {
  providers = normalizeDataProviders(provider);
}

export function getDataProvider(name?: string): DataProvider {
  return captureAdminContext().getDataProvider(name);
}

export function getDataProviderNames(): string[] {
  return captureAdminContext().getDataProviderNames();
}

export function getDataProviderForResource(resourceName: string, overrideName?: string): DataProvider {
  return captureAdminContext().getDataProviderForResource(resourceName, overrideName);
}

export function getProviderBundle(): ProviderBundle {
  return captureAdminContext().providerBundle;
}

function isDataProvider(value: unknown): value is DataProvider {
  return (
    value !== null &&
    typeof value === 'object' &&
    'getList' in value &&
    typeof (value as DataProvider).getList === 'function'
  );
}

// ─── Auth Provider ──────────────────────────────────────────────

let authProvider = $state<AuthProvider | null>(null);

export function setAuthProvider(provider: AuthProvider | null | undefined): void {
  authProvider = provider || null;
}

export function getAuthProvider(): AuthProvider;
export function getAuthProvider(options: { optional: true }): AuthProvider | null;
export function getAuthProvider(options?: { optional?: boolean }): AuthProvider | null {
  const activeAuthProvider = captureAdminContext().authProvider;
  if (!activeAuthProvider && !options?.optional) throw new Error('AuthProvider not found. Did you call setAuthProvider in App.svelte?');
  return activeAuthProvider;
}

// ─── Resources ──────────────────────────────────────────────────

let resources = $state.raw<ResourceDefinition[]>([]);

export function setResources(newResources: ResourceDefinition[]): void {
  resources = newResources;
}

export function getResources(): ResourceDefinition[] {
  return captureAdminContext().resources;
}

export function getResource(nameOrIdentifier: string): ResourceDefinition {
  return captureAdminContext().getResource(nameOrIdentifier);
}

// ─── Router Provider ────────────────────────────────────────────

let routerProvider = $state<RouterProvider | undefined>(undefined);

export function setRouterProvider(provider: RouterProvider | undefined): void {
  routerProvider = provider;
}

export function getRouterProvider(): RouterProvider | undefined {
  return captureAdminContext().routerProvider;
}


// ─── Live Provider ──────────────────────────────────────────────

let liveProviderState = $state<LiveProvider | undefined>(undefined);

export function setLiveProvider(provider: LiveProvider): void {
  liveProviderState = provider;
}

export function getLiveProvider(): LiveProvider | undefined {
  return captureAdminContext().liveProvider;
}

// ─── Task Provider ──────────────────────────────────────────────

let taskProviderState = $state<TaskProvider | undefined>(undefined);

export function setTaskProvider(provider: TaskProvider | undefined): void {
  taskProviderState = provider;
}

export function getTaskProvider(): TaskProvider;
export function getTaskProvider(options: { optional: true }): TaskProvider | undefined;
export function getTaskProvider(options?: { optional?: boolean }): TaskProvider | undefined {
  const activeTaskProvider = captureAdminContext().taskProvider;
  if (!activeTaskProvider && !options?.optional) {
    throw new Error('TaskProvider not found. Did you call setTaskProvider in App.svelte?');
  }
  return activeTaskProvider;
}

// ─── Reset — for testing / HMR ─────────────────────────────────

export function resetContext(): void {
  providers = null;
  authProvider = null;
  resources = [];
  routerProvider = undefined;
  liveProviderState = undefined;
  taskProviderState = undefined;
  resetNotificationProvider();
  resetAuditLogProvider();
  resetAccessControlProvider();
  resetAdminOptions();
  resetI18n();
  resetChatProvider();
  resetToast();
  resetTheme();
  resetRouter();
  resetUnsavedChanges();
  resetGlobalPath();
  resetLogoutVersion();
  resetSidebarCollapsed();
}
