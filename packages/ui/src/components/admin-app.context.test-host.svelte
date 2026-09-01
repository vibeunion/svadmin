<script lang="ts">
  import { untrack } from 'svelte';
  import type {
    AuthProvider,
    ChatMessage,
    ChatProvider,
    DataProviderInput,
    ResourceDefinition,
    RouterProvider,
    TaskProvider,
    TenantContext,
    ThemeConfig,
    ThemeMode,
    I18nProvider,
  } from '@svadmin/core';
  import { ChatDialog, InsightCard } from '@svadmin/ai-elements';
  import type { AdminProviderBundle } from '../types.js';
  import type { QueryClient } from '@tanstack/svelte-query';
  import AdminApp from './AdminApp.svelte';
  import AuditLogDrawer from './AuditLogDrawer.svelte';
  import ContextProbe from './admin-app.context.test-probe.svelte';
  import type { LayoutAIAssistantProps } from './Layout.svelte';

  interface Props {
    instance: string;
    dataProvider?: DataProviderInput;
    providers?: AdminProviderBundle;
    providerBundle?: AdminProviderBundle;
    authProvider?: AuthProvider;
    chatProvider?: ChatProvider;
    taskProvider?: TaskProvider;
    routerProvider: RouterProvider;
    resources: ResourceDefinition[];
    locale?: string;
    i18nProvider?: I18nProvider;
    nextLocale?: string;
    defaultTheme?: ThemeMode;
    themeConfig?: ThemeConfig;
    queryClient?: QueryClient;
    tenant?: TenantContext;
    consumerProbe?: boolean;
    explicitChatPersistKeys?: readonly [string, string];
    chatPersistProbe?: {
      key: string;
      onPersist?: (messages: ChatMessage[]) => void;
      onRestore?: () => ChatMessage[];
    };
  }

  let {
    instance,
    dataProvider,
    providers,
    providerBundle,
    authProvider,
    chatProvider,
    taskProvider,
    routerProvider,
    resources,
    locale: ownerLocale,
    i18nProvider,
    nextLocale = 'zh-CN',
    defaultTheme,
    themeConfig,
    queryClient,
    tenant,
    consumerProbe = false,
    explicitChatPersistKeys,
    chatPersistProbe,
  }: Props = $props();

  let boundLocale = $state<string | undefined>(untrack(() => ownerLocale));

  $effect.pre(() => {
    const nextOwnerLocale = ownerLocale;
    if (untrack(() => boundLocale) !== nextOwnerLocale) boundLocale = nextOwnerLocale;
  });
</script>

{#snippet dashboard()}
  <ContextProbe {instance} {nextLocale} />
  {#if consumerProbe}
    <section data-testid={`insight-${instance}`}>
      <InsightCard context={`${instance}-context`} autoFetch={false} />
    </section>
    <AuditLogDrawer
      open={true}
      resource={`${instance}-resource`}
      recordId={0}
    />
  {/if}
  {#if explicitChatPersistKeys}
    <section data-testid={`explicit-chat-${instance}-first`}>
      <ChatDialog persistKey={explicitChatPersistKeys[0]} />
    </section>
    <section data-testid={`explicit-chat-${instance}-second`}>
      <ChatDialog persistKey={explicitChatPersistKeys[1]} />
    </section>
  {/if}
  {#if chatPersistProbe}
    <section data-testid={`persist-callback-chat-${instance}`}>
      <ChatDialog
        persistKey={chatPersistProbe.key}
        onPersist={chatPersistProbe.onPersist}
        onRestore={chatPersistProbe.onRestore}
      />
    </section>
  {/if}
{/snippet}

{#snippet aiAssistant({ docked, scope, ownerScope }: LayoutAIAssistantProps)}
  <ChatDialog {docked} {scope} {ownerScope} persistKey={`${instance}-auth:assistant`} />
{/snippet}

<AdminApp
  {dataProvider}
  {providers}
  {providerBundle}
  {authProvider}
  {chatProvider}
  {taskProvider}
  {routerProvider}
  {resources}
  bind:locale={boundLocale}
  {i18nProvider}
  {defaultTheme}
  {themeConfig}
  {queryClient}
  {tenant}
  aiAssistant={aiAssistant as never}
  dashboard={dashboard as never}
/>

<output data-testid={`bound-locale-${instance}`}>{boundLocale ?? ''}</output>
