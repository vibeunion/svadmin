<script lang="ts">
  import type { ComponentProps } from 'svelte';
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
  import { exampleMemberDirectory, exampleNotificationPreferences } from './providers/accountDemo';
  import LazyDashboard from './components/LazyDashboard.svelte';
  import LazyResourcePage from './components/LazyResourcePage.svelte';
  import LazyBusinessAutoForm from './components/LazyBusinessAutoForm.svelte';
  import LazyBusinessShowPage from './components/LazyBusinessShowPage.svelte';
  import LazyRichTextEditor from './components/LazyRichTextEditor.svelte';
  import LazyChatDialog from './components/LazyChatDialog.svelte';
  import LazyOfficeWorkspace from './components/LazyOfficeWorkspace.svelte';

  // DesignPrinciplesPage and other showcase resources are lazy-loaded via LazyResourcePage
  registerExampleMenuTranslations();
  setRichTextEditor(LazyRichTextEditor);

  const i18n = useTranslation();
  // Keep the example's derived resources in sync with AdminApp's browser-detected locale.
  let currentLocale = $state(i18n.locale);
  const baseResources = $derived.by(() => createResources(currentLocale));
  const officeLabel = $derived(currentLocale === 'zh-CN' ? '智能辅助办公' : 'Health Office');
  const resources = $derived.by<ResourceDefinition[]>(() => [
    ...baseResources,
    { name: 'health_office', label: officeLabel, icon: 'file', fields: [], showInMenu: false, canCreate: false, canEdit: false, canDelete: false, canShow: false },
  ]);
  const menu = $derived.by<MenuItem[]>(() => [
    { name: 'health_office', label: officeLabel, icon: 'file', href: '/health_office' },
    ...createExampleMenu(currentLocale),
  ]);
  const appTitle = 'svadmin example';
  const loginHint = $derived(currentLocale === 'zh-CN' ? '已预填演示账号，方便快速测试。' : 'Demo credentials are prefilled for quick testing.');

  // 办公工作区不注册到库存 AI，避免业务数据意外进入无关助手的资源上下文。
  const chatProvider = $derived.by(() => createInventoryChatProvider(inMemoryDataProvider, baseResources));

  const resourcePages = $derived.by(() => {
    const pages: NonNullable<ComponentProps<typeof AdminApp>['resourcePages']> = {};
    for (const resource of baseResources) {
      pages[resource.name] = {
        list: LazyResourcePage, create: LazyBusinessAutoForm, edit: LazyBusinessAutoForm,
        clone: LazyBusinessAutoForm, show: LazyBusinessShowPage,
      };
    }
    pages['design_principles'] = { list: LazyResourcePage };
    // 仅暴露独立工作区，不为合成报告自动生成通用 CRUD 路由。
    pages['health_office'] = { list: LazyOfficeWorkspace };
    return pages;
  });
</script>

<AdminApp
  dataProvider={inMemoryDataProvider}
  {resources}
  authProvider={mockAuthProvider}
  memberDirectoryProvider={exampleMemberDirectory}
  notificationPreferencesProvider={exampleNotificationPreferences}
  {chatProvider}
  {resourcePages}
  {menu}
  title={appTitle}
  bind:locale={currentLocale}
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
