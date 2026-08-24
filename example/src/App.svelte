<script lang="ts">
  import { setChatProvider } from '@svadmin/core';
  import { AdminApp, setRichTextEditor } from '@svadmin/ui';
  import '@svadmin/ui/app.theme.css';
  import { inMemoryDataProvider } from './providers/inMemoryDb';
  import { createInventoryChatProvider } from './providers/inventoryAssistant';
  import { createResources } from './resources';
  import { createExampleMenu, registerExampleMenuTranslations } from './exampleMenuCatalog';
  import { mockAuthProvider } from './providers/mockAuth';
  import Dashboard from './pages/Dashboard.svelte';
  import LazyResourcePage from './components/LazyResourcePage.svelte';
  import LazyRichTextEditor from './components/LazyRichTextEditor.svelte';

  // Register the optional Rich Text Editor plugin globally
  registerExampleMenuTranslations();
  setRichTextEditor(LazyRichTextEditor);

  let currentLocale = $state('en');
  const resources = $derived.by(() => createResources(currentLocale));
  const menu = $derived.by(() => createExampleMenu(currentLocale));
  const appTitle = 'svadmin example';
  const loginHint = $derived(currentLocale === 'zh-CN' ? '已预填演示账号，方便快速测试。' : 'Demo credentials are prefilled for quick testing.');

  $effect(() => {
    setChatProvider(createInventoryChatProvider(inMemoryDataProvider, resources));
  });

  const resourcePages = $derived.by(() => Object.fromEntries(
    resources.map((resource) => [resource.name, { list: LazyResourcePage }]),
  ));
</script>

<AdminApp
  dataProvider={inMemoryDataProvider}
  {resources}
  authProvider={mockAuthProvider}
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
  {#snippet dashboard()}
    <Dashboard />
  {/snippet}
</AdminApp>
