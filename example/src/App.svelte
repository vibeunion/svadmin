<script lang="ts">
  import { onMount, type ComponentProps } from 'svelte';
  import type { MenuItem, ResourceDefinition } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';
  import AdminApp from '@svadmin/ui/components/AdminApp.svelte';
  import { setRichTextEditor } from '@svadmin/ui/editor-config';
  import '@svadmin/ai-elements/ai.css';
  import { inMemoryDataProvider } from './providers/inMemoryDb';
  import { createInventoryChatProvider } from './providers/inventoryAssistant';
  import { createResources } from './resources';
  import { createExampleMenu, registerExampleMenuTranslations } from './exampleMenuCatalog';
  import { mockAuthProvider } from './providers/mockAuth';
  import LazyDashboard from './components/LazyDashboard.svelte';
  import LazyResourcePage from './components/LazyResourcePage.svelte';
  import BusinessAutoForm from './components/BusinessAutoForm.svelte';
  import BusinessShowPage from './components/BusinessShowPage.svelte';
  import LazyRichTextEditor from './components/LazyRichTextEditor.svelte';
  import LazyChatDialog from './components/LazyChatDialog.svelte';
  import LazyOfficeWorkspace from './components/LazyOfficeWorkspace.svelte';

  import { createOfficeAuthProvider, createOfficeI18nProvider, createOfficeRouterProvider } from './office/shell';
  import { chineseMenuLabel, isOfficeLocation, isOfficeAuthRoute } from './office/zh-CN';

  // DesignPrinciplesPage and other showcase resources are lazy-loaded via LazyResourcePage
  registerExampleMenuTranslations();
  setRichTextEditor(LazyRichTextEditor);

  const i18n = useTranslation();
  // Keep the example's derived resources in sync with AdminApp's browser-detected locale.
  let currentLocale = $state(i18n.locale);
  let officeMode = $state(typeof window !== 'undefined' && isOfficeLocation(window.location.hash, window.location.search));
  const officeI18n = createOfficeI18nProvider();
  const officeRouter = createOfficeRouterProvider();
  const officeAuth = createOfficeAuthProvider(mockAuthProvider);
  const displayLocale = $derived(officeMode ? 'zh-CN' : currentLocale);
  const localeOptions = $derived(officeMode ? { i18nProvider: officeI18n, routerProvider: officeRouter } : {});
  function readLocale(): string { return displayLocale; }
  function writeLocale(locale: string | undefined): void {
    if (!officeMode && locale !== undefined) currentLocale = locale;
  }
  onMount(() => {
    const synchronize = () => {
      const { hash, search } = window.location;
      if (isOfficeLocation(hash, search)) officeMode = true;
      else if (!isOfficeAuthRoute(hash)) officeMode = false;
    };
    window.addEventListener('hashchange', synchronize);
    window.addEventListener('popstate', synchronize);
    return () => {
      window.removeEventListener('hashchange', synchronize);
      window.removeEventListener('popstate', synchronize);
    };
  });
  $effect(() => {
    const locale = displayLocale;
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => { document.documentElement.lang = previous; };
  });
  const baseResources = $derived.by(() => createResources(displayLocale));
  const officeLabel = '智能辅助办公';
  function localizeMenu(items: MenuItem[]): MenuItem[] {
    return items.map((item) => ({ ...item,
      ...(item.label ? { label: chineseMenuLabel(item.label) } : {}),
      ...(item.children ? { children: localizeMenu(item.children) } : {}),
    }));
  }
  const resources = $derived.by<ResourceDefinition[]>(() => [
    ...baseResources,
    { name: 'health_office', label: officeLabel, icon: 'file', fields: [], showInMenu: false },
  ]);
  const menu = $derived.by<MenuItem[]>(() => [
    { name: 'health_office', label: officeLabel, icon: 'file', href: '/health_office' },
    ...(officeMode ? localizeMenu(createExampleMenu(displayLocale)) : createExampleMenu(displayLocale)),
  ]);
  const appTitle = $derived(officeMode ? '智能辅助办公系统' : 'svadmin example');
  const loginHint = $derived(displayLocale === 'zh-CN' ? '已预填演示账号，方便快速测试。' : 'Demo credentials are prefilled for quick testing.');

  // 办公工作区不注册到库存 AI，避免业务数据意外进入无关助手的资源上下文。
  const chatProvider = $derived.by(() => createInventoryChatProvider(inMemoryDataProvider, baseResources));

  const resourcePages = $derived.by(() => {
    const pages: NonNullable<ComponentProps<typeof AdminApp>['resourcePages']> = {};
    for (const resource of baseResources) {
      pages[resource.name] = {
        list: LazyResourcePage, create: BusinessAutoForm, edit: BusinessAutoForm,
        clone: BusinessAutoForm, show: BusinessShowPage,
      };
    }
    pages['design_principles'] = { list: LazyResourcePage };
    // 仅暴露独立工作区，不为合成报告自动生成通用 CRUD 路由。
    pages['health_office'] = { list: LazyOfficeWorkspace };
    return pages;
  });
</script>

<svelte:head><title>{appTitle}</title></svelte:head>

<AdminApp
  dataProvider={inMemoryDataProvider}
  {resources}
  authProvider={officeMode ? officeAuth : mockAuthProvider}
  {chatProvider}
  {resourcePages}
  {menu}
  title={appTitle}
  bind:locale={readLocale, writeLocale}
  {...localeOptions}
  themeConfig={{ layoutPreset: 'clean-flat', colorPreset: 'indigo' }}
  loginDefaults={{
    identifier: 'demo@example.com',
    password: 'demo',
    hint: loginHint,
  }}
  >
  {#snippet aiAssistant({ docked, scope, ownerScope })}
    <LazyChatDialog {docked} {scope} {ownerScope} />
  {/snippet}
  {#snippet dashboard()}
    <LazyDashboard />
  {/snippet}
</AdminApp>
