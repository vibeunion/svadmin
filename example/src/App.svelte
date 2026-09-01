<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { AdminApp, setRichTextEditor } from '@svadmin/ui';
  import '@svadmin/ui/app.theme.css';
  import '@svadmin/ai-elements/ai.css';
  import { inMemoryDataProvider } from './providers/inMemoryDb';
  import { createInventoryChatProvider } from './providers/inventoryAssistant';
  import { createResources } from './resources';
  import { createExampleMenu, registerExampleMenuTranslations } from './exampleMenuCatalog';
  import { mockAuthProvider } from './providers/mockAuth';
  import Dashboard from './pages/Dashboard.svelte';
  import LazyResourcePage from './components/LazyResourcePage.svelte';
  import LazyRichTextEditor from './components/LazyRichTextEditor.svelte';
  import LazyChatDialog from './components/LazyChatDialog.svelte';

  // DesignPrinciplesPage and other showcase resources are lazy-loaded via LazyResourcePage
  registerExampleMenuTranslations();
  setRichTextEditor(LazyRichTextEditor);

  const i18n = useTranslation();
  // Keep the example's derived resources in sync with AdminApp's browser-detected locale.
  let currentLocale = $state(i18n.locale);
  const resources = $derived.by(() => createResources(currentLocale));
  const menu = $derived.by(() => createExampleMenu(currentLocale));
  const appTitle = 'svadmin example';
  const loginHint = $derived(currentLocale === 'zh-CN' ? '已预填演示账号，方便快速测试。' : 'Demo credentials are prefilled for quick testing.');

  const chatProvider = $derived.by(() => createInventoryChatProvider(inMemoryDataProvider, resources));

  const resourcePages = $derived.by(() => ({
    ...Object.fromEntries(resources.map((resource) => [resource.name, { list: LazyResourcePage }])),
    design_principles: { list: LazyResourcePage },
  }));
</script>

<AdminApp
  dataProvider={inMemoryDataProvider}
  {resources}
  authProvider={mockAuthProvider}
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
    <Dashboard />
  {/snippet}
</AdminApp>
