<script module lang="ts">
  const loadPublicProfilePage = () => import('./profile/PublicProfilePage.svelte');
  const loadGetStartedPage = () => import('./account/GetStartedPage.svelte');
  const loadUserProfilePage = () => import('./account/UserProfilePage.svelte');
  const loadCompanyProfilePage = () => import('./account/CompanyProfilePage.svelte');
  const loadSettingsPlainPage = () => import('./account/SettingsPlainPage.svelte');
  const loadSettingsSidebarPage = () => import('./account/SettingsSidebarPage.svelte');
  const loadSettingsEnterprisePage = () => import('./account/SettingsEnterprisePage.svelte');
  const loadImportMembersPage = () => import('./account/ImportMembersPage.svelte');
  const loadMembersStarterPage = () => import('./account/MembersStarterPage.svelte');
  const loadTeamMembersPage = () => import('./account/TeamMembersPage.svelte');
  const loadSecurityLogPage = () => import('./account/SecurityLogPage.svelte');
  const loadUserCardsNFTPage = () => import('./network/UserCardsNFTPage.svelte');
  const loadTeamCrewTablePage = () => import('./network/TeamCrewTablePage.svelte');
  const loadTwoFactorAuthPage = () => import('./TwoFactorAuthPage.svelte');
</script>

<script lang="ts">
  // Auto-inject design tokens so consumers don't need to manually import
  import '../app.css';
  import { onDestroy, onMount, untrack, type Component, type Snippet } from 'svelte';
  import type { DataProvider, AuthProvider, ResourceDefinition, ThemeMode, RouterProvider, ThemeConfig, MenuItem, TaskProvider, I18nProvider } from '@svadmin/core';
  import {
    captureAdminContext,
    createHashRouterProvider,
    createI18nScope,
    provideAdminContext,
    provideI18nScope,
    registerThemeOwner,
    unregisterThemeOwner,
    updateThemeOwner,
  } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import { QueryClient, QueryClientProvider, type DefaultOptions } from '@tanstack/svelte-query';
  import { setComponentRegistry, type ComponentRegistry } from '../component-registry.svelte.js';
  import Layout from './Layout.svelte';
  import AutoTable from './AutoTable.svelte';
  import AutoForm from './AutoForm.svelte';
  import ShowPage from './ShowPage.svelte';
  import Toast from './Toast.svelte';
  import LoginPage from './LoginPage.svelte';
  import RegisterPage from './RegisterPage.svelte';
  import ForgotPasswordPage from './ForgotPasswordPage.svelte';
  import UpdatePasswordPage from './UpdatePasswordPage.svelte';
  import ConfigErrorScreen from './ConfigErrorScreen.svelte';
  import Sidebar from './Sidebar.svelte';
  import Header from './Header.svelte';
  import TaskQueueDrawer from './TaskQueueDrawer.svelte';
  import SettingsPage from './SettingsPage.svelte';
  import ErrorPage from './ErrorPage.svelte';
  import SystemPageShell from './SystemPageShell.svelte';
  import LazyPage from './LazyPage.svelte';
  import { Button } from './ui/button/index.js';
  import { Input } from './ui/input/index.js';
  import { Badge } from './ui/badge/index.js';
  import { Skeleton } from './ui/skeleton/index.js';
  import { provideRouterState } from '../router-state.svelte.js';

  interface Props {
    dataProvider: DataProvider;
    authProvider?: AuthProvider;
    taskProvider?: TaskProvider;
    routerProvider?: RouterProvider;
    resources: ResourceDefinition[];
    /** Bindable tree-local locale; defaults to the provider locale or per-tree browser detection (English during SSR). */
    locale?: string;
    /** Optional tree-local translation provider. */
    i18nProvider?: I18nProvider;
    title?: string;
    defaultTheme?: ThemeMode;
    /** Theme configuration for dark-first mode, CSS overrides, etc. */
    themeConfig?: ThemeConfig;
    dashboard?: Snippet;
    loginPage?: Snippet;
    /** Prefill and display credentials on the default login page, useful for demos/examples. */
    loginDefaults?: {
      identifier?: string;
      password?: string;
      hint?: string;
    };
    /** Override default components via DI */
    components?: Partial<ComponentRegistry>;
    /** Resource-specific page overrides while keeping svadmin defaults as fallback. */
    resourcePages?: Record<string, {
      list?: Component<{ resourceName: string }>;
      create?: Component<{ resourceName: string; mode?: 'create' }>;
      edit?: Component<{ resourceName: string; mode?: 'edit'; id?: string | number }>;
      show?: Component<{ resourceName: string; id?: string | number }>;
      clone?: Component<{ resourceName: string; mode?: 'clone'; id?: string | number }>;
    }>;
    /** Custom multi-level menu configuration */
    menu?: MenuItem[];
    /** External URL to the main application or workspace (renders a shortcut in the header) */
    siteUrl?: string;
    /** Routing strategy for Sidebar links ('hash' | 'path' | 'auto') */
    routeMode?: 'hash' | 'path' | 'auto';
    /** Optional TanStack Query client override. */
    queryClient?: QueryClient;
    /** Optional TanStack Query default options override when QueryClient is not supplied. */
    queryClientDefaultOptions?: DefaultOptions;
  }

  let {
    dataProvider,
    authProvider,
    taskProvider,
    routerProvider,
    resources,
    locale = $bindable(),
    i18nProvider,
    title = 'Admin',
    defaultTheme,
    themeConfig: userThemeConfig,
    dashboard,
    loginPage,
    loginDefaults,
    components: userComponents,
    resourcePages,
    menu,
    siteUrl,
    routeMode,
    queryClient: providedQueryClient,
    queryClientDefaultOptions,
  }: Props = $props();

  // Default component registry
  const defaultComponents: ComponentRegistry = {
    Layout, Sidebar, Header,
    LoginPage, AutoTable, AutoForm, ShowPage,
    TaskQueueDrawer, ErrorPage,
    Button: Button as unknown as ComponentRegistry['Button'],
    Input: Input as unknown as ComponentRegistry['Input'],
    Badge: Badge as unknown as ComponentRegistry['Badge'],
    Skeleton: Skeleton as unknown as ComponentRegistry['Skeleton'],
  };

  // Resolve router provider (default to hash)
  const mergedComponents = $derived.by((): ComponentRegistry => ({ ...defaultComponents, ...userComponents }));
  const resolvedRouter = $derived(routerProvider ?? createHashRouterProvider());
  const resolvedRouteMode = $derived(routeMode ?? (routerProvider ? 'auto' : 'hash'));

  const routerState = provideRouterState(untrack(() => resolvedRouter));
  const scopedRouterProvider: RouterProvider = {
    go(options) {
      resolvedRouter.go(options);
      routerState.sync();
    },
    back() {
      resolvedRouter.back();
      routerState.sync();
    },
    parse() {
      return resolvedRouter.parse();
    },
    formatLink(path) {
      return resolvedRouter.formatLink?.(path) ?? `#${path.replace(/^#/, '')}`;
    },
  };

  $effect.pre(() => routerState.init(resolvedRouter));
  onDestroy(() => routerState.destroy());

  function updateBoundLocale(nextLocale: string) {
    locale = nextLocale;
  }

  const i18nScope = createI18nScope({
    locale: untrack(() => locale),
    provider: untrack(() => i18nProvider),
    onLocaleChange: updateBoundLocale,
  });
  provideI18nScope(i18nScope);
  const translation = useTranslation();

  $effect.pre(() => {
    const ownerProvider = i18nProvider;
    const ownerLocale = locale;
    untrack(() => i18nScope.updateOwner({
      locale: ownerLocale,
      provider: ownerProvider,
      onLocaleChange: updateBoundLocale,
    }));
  });

  let themeOwner = $state.raw<ReturnType<typeof registerThemeOwner>>(undefined);

  onMount(() => {
    themeOwner = registerThemeOwner({
      defaultTheme,
      themeConfig: userThemeConfig,
    });

    return () => {
      unregisterThemeOwner(themeOwner);
      themeOwner = undefined;
    };
  });

  $effect(() => {
    const owner = themeOwner;
    const ownerOptions = {
      defaultTheme,
      themeConfig: userThemeConfig,
    };
    untrack(() => updateThemeOwner(owner, ownerOptions));
  });

  function syncComponentRegistry() {
    setComponentRegistry(mergedComponents);
  }

  provideAdminContext({
    get dataProvider() { return dataProvider; },
    get authProvider() { return authProvider ?? null; },
    get taskProvider() { return taskProvider; },
    get resources() { return resources; },
    get routerProvider() { return scopedRouterProvider; },
  });
  const adminContext = captureAdminContext();

  // Context must be available synchronously to descendants during their first render.
  syncComponentRegistry();

  $effect.pre(syncComponentRegistry);

  const queryClient = $derived(providedQueryClient ?? new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
      ...queryClientDefaultOptions,
    },
  }));

  // Reactive getters for route state
  const route = $derived(routerState.route);
  const params = $derived(routerState.params);
  const resourceNames = $derived(new Set(resources.map((resource) => resource.name)));
  const hasRouteResource = $derived(!params.resource || resourceNames.has(params.resource));
  const currentResourcePages = $derived(params.resource ? resourcePages?.[params.resource] : undefined);
  const isStandaloneTwoFactor = $derived(route === '/2fa' || route === '/authentication/branded/2fa');
  const standaloneErrorStatus = $derived.by((): '404' | '500' | undefined => {
    if (route === '/authentication/error-404' || route === '/404' || (route === '/:resource' && params.resource === '404')) return '404';
    if (route === '/authentication/error-500' || route === '/500' || (route === '/:resource' && params.resource === '500')) return '500';
    return undefined;
  });

  // Auth check
  let isAuthenticated = $state(untrack(() => !authProvider));
  let authChecked = $state(untrack(() => !authProvider));

  async function navigateWithinApp(path: string) {
    await adminContext.navigate(path);
  }

  function isPublicSystemRoute(currentRoute: string): boolean {
    return currentRoute === '/authentication/error-404'
      || currentRoute === '/authentication/error-500'
      || currentRoute === '/404'
      || currentRoute === '/500';
  }

  $effect(() => {
    let cancelled = false;
    // Explicitly track route so auth is re-checked on navigation
    const _route = route;

    if (!authProvider) {
      if (!cancelled) {
        isAuthenticated = true;
        authChecked = true;
      }
      return;
    }
    authChecked = false;
    authProvider.check().then(result => {
      if (cancelled) return;
      isAuthenticated = result.authenticated;
      authChecked = true;
      if (!result.authenticated && _route !== '/login' && _route !== '/register' && _route !== '/forgot-password' && _route !== '/update-password' && !isPublicSystemRoute(_route)) {
        void navigateWithinApp(result.redirectTo ?? '/login');
      }
    }).catch(err => {
      if (cancelled) return;
      console.warn('Auth check failed:', err);
      isAuthenticated = false;
      authChecked = true;
      if (_route !== '/login' && _route !== '/register' && _route !== '/forgot-password' && _route !== '/update-password' && !isPublicSystemRoute(_route)) {
        void navigateWithinApp('/login');
      }
    });

    return () => { cancelled = true; };
  });
</script>

<QueryClientProvider client={queryClient}>
  {#if !authChecked}
    <div class="flex h-screen items-center justify-center">
      <div class="space-y-4 text-center">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto"></div>
        <p class="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  {:else if route === '/login' && loginPage}
    {@render loginPage()}
  {:else if route === '/login' && authProvider}
    <LoginPage
      {title}
      defaultIdentifier={loginDefaults?.identifier}
      defaultPassword={loginDefaults?.password}
      loginHint={loginDefaults?.hint}
      onSuccess={() => { isAuthenticated = true; void navigateWithinApp('/'); }}
    />
  {:else if route === '/register' && authProvider?.register}
    <RegisterPage {title} />
  {:else if route === '/forgot-password' && authProvider?.forgotPassword}
    <ForgotPasswordPage {title} />
  {:else if route === '/update-password' && authProvider?.updatePassword}
    <UpdatePasswordPage {title} />
  {:else if route === '/login' || route === '/register' || route === '/forgot-password' || route === '/update-password'}
    <ConfigErrorScreen title="{title} — {translation.t('common.configRequired')}" />
  {:else if (isAuthenticated || !authProvider) && isStandaloneTwoFactor}
    <SystemPageShell {title}>
      <LazyPage loader={loadTwoFactorAuthPage} props={{}} />
    </SystemPageShell>
  {:else if standaloneErrorStatus}
    <SystemPageShell {title}>
      {@const ErrorComp = mergedComponents.ErrorPage || ErrorPage}
      <ErrorComp status={standaloneErrorStatus} />
    </SystemPageShell>
  {:else if isAuthenticated || !authProvider}
    <Layout {title} {menu} {siteUrl} routeMode={resolvedRouteMode}>
      {#key route + (params.resource ?? '') + (params.id ?? '') + (params.variant ?? '') + (params.columns ?? '')}
      <div class="svadmin-page-enter">
      {#if route === '/public-profile'}
        <LazyPage loader={loadPublicProfilePage} props={{ variant: 'default', initialTab: 'projects' }} />
      {:else if route === '/public-profile/projects/:columns'}
        <LazyPage loader={loadPublicProfilePage} props={{ variant: 'default', initialTab: 'projects', columns: params.columns?.includes('3') ? 3 : 2 }} />
      {:else if route === '/public-profile/activity'}
        <LazyPage loader={loadPublicProfilePage} props={{ variant: 'default', initialTab: 'activity' }} />
      {:else if route === '/public-profile/teams'}
        <LazyPage loader={loadPublicProfilePage} props={{ variant: 'default', initialTab: 'teams' }} />
      {:else if route === '/public-profile/profiles/:variant'}
        <LazyPage loader={loadPublicProfilePage} props={{ variant: (params.variant === 'company' || params.variant === 'gamer' || params.variant === 'default' ? params.variant : 'default') as 'company' | 'gamer' | 'default', showSections: true }} />
      {:else if route === '/account/get-started' || route === '/account/home/get-started'}
        <LazyPage loader={loadGetStartedPage} props={{}} />
      {:else if route === '/account/home/user-profile'}
        <LazyPage loader={loadUserProfilePage} props={{}} />
      {:else if route === '/account/company-profile' || route === '/account/home/company-profile'}
        <LazyPage loader={loadCompanyProfilePage} props={{}} />
      {:else if route === '/account/settings-plain' || route === '/account/home/settings-plain'}
        <LazyPage loader={loadSettingsPlainPage} props={{}} />
      {:else if route === '/account/settings-sidebar' || route === '/account/home/settings-sidebar'}
        <LazyPage loader={loadSettingsSidebarPage} props={{}} />
      {:else if route === '/account/settings-enterprise' || route === '/account/home/settings-enterprise'}
        <LazyPage loader={loadSettingsEnterprisePage} props={{}} />
      {:else if route === '/account/:tab'}
        <SettingsPage />
      {:else if route === '/account/import-members' || route === '/account/members/import-members'}
        <LazyPage loader={loadImportMembersPage} props={{}} />
      {:else if route === '/account/members-starter' || route === '/account/members/members-starter'}
        <LazyPage loader={loadMembersStarterPage} props={{}} />
      {:else if route === '/account/team-members' || route === '/account/members/team-members'}
        <LazyPage loader={loadTeamMembersPage} props={{}} />
      {:else if route === '/account/security-log' || route === '/account/security/security-log'}
        <LazyPage loader={loadSecurityLogPage} props={{}} />
      {:else if route === '/network/user-cards' || route === '/network/user-cards/nft'}
        <LazyPage loader={loadUserCardsNFTPage} props={{}} />
      {:else if route === '/network/team-crew' || route === '/network/user-table/team-crew'}
        <LazyPage loader={loadTeamCrewTablePage} props={{}} />
      {:else if route.startsWith('/settings')}
        <SettingsPage />
      {:else if route === '/' || route === '' || route === '/inventory-dashboard'}
        {#if dashboard}
          {@render dashboard()}
        {:else}
          <div class="space-y-4">
            <h1 class="text-xl font-semibold text-foreground">{translation.t('common.welcome', { title })}</h1>
            <p class="text-muted-foreground">{translation.t('common.dashboardHint')}</p>
          </div>
        {/if}
      {:else if (route === '/:resource' || route === '/:parent/:parentId/:resource') && hasRouteResource}
        {#key params.resource}
          {@const Comp = currentResourcePages?.list ?? mergedComponents.AutoTable}
          <Comp resourceName={params.resource} />
        {/key}
      {:else if (route === '/:resource/create' || route === '/:parent/:parentId/:resource/create') && hasRouteResource}
        {#key params.resource}
          {@const Comp = currentResourcePages?.create ?? mergedComponents.AutoForm}
          <Comp resourceName={params.resource} mode="create" />
        {/key}
      {:else if (route === '/:resource/edit/:id' || route === '/:parent/:parentId/:resource/edit/:id') && hasRouteResource}
        {#key `${params.resource}-${params.id}`}
          {@const Comp = currentResourcePages?.edit ?? mergedComponents.AutoForm}
          <Comp resourceName={params.resource} mode="edit" id={params.id} />
        {/key}
      {:else if (route === '/:resource/show/:id' || route === '/:parent/:parentId/:resource/show/:id') && hasRouteResource}
        {#key `${params.resource}-${params.id}`}
          {@const Comp = currentResourcePages?.show ?? mergedComponents.ShowPage}
          <Comp resourceName={params.resource} id={params.id} />
        {/key}
      {:else if (route === '/:resource/clone/:id' || route === '/:parent/:parentId/:resource/clone/:id') && hasRouteResource}
        {#key `${params.resource}-clone-${params.id}`}
          {@const Comp = currentResourcePages?.clone ?? mergedComponents.AutoForm}
          <Comp resourceName={params.resource} mode="clone" id={params.id} />
        {/key}
      {:else}
        {@const ErrorComp = mergedComponents.ErrorPage || ErrorPage}
        <ErrorComp status="404" />
      {/if}
      </div>
      {/key}
    </Layout>
  {:else}
    <div class="flex h-screen items-center justify-center">
      <p class="text-muted-foreground">{translation.t('common.redirecting')}</p>
    </div>
  {/if}
  <Toast />
</QueryClientProvider>
