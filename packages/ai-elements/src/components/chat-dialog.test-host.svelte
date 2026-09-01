<script lang="ts">
  import {
    provideAdminContext,
    type AgentProvider,
    type ChatMessage,
    type ChatProvider,
    type DataProvider,
    type RouterProvider,
    type TenantContext,
  } from '@svadmin/core';
  import ChatDialog from './ChatDialog.svelte';
  import type { ChatPersistenceErrorDetail } from './ChatDialog.svelte';
  import type { GeneratedComponentRegistry } from '../generated-components.js';

  interface Props {
    chatProvider?: ChatProvider | null;
    agentProvider?: AgentProvider | null;
    tenant?: TenantContext;
    persistKey?: string;
    onPersist?: (messages: ChatMessage[]) => void;
    onRestore?: () => ChatMessage[];
    onPersistenceError?: (detail: ChatPersistenceErrorDetail) => void;
    componentRegistry?: GeneratedComponentRegistry;
  }

  let {
    chatProvider = null,
    agentProvider = null,
    tenant,
    persistKey,
    onPersist,
    onRestore,
    onPersistenceError,
    componentRegistry = {},
  }: Props = $props();

  const dataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => 'https://ai-elements.example.test',
  } as DataProvider;
  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({
      resource: 'products',
      action: 'edit',
      id: '42',
      pathname: '/products/42/edit',
      params: {},
    }),
  };

  provideAdminContext({
    dataProvider,
    resources: [{ name: 'products', label: 'Products', fields: [] }],
    routerProvider,
    get chatProvider() { return chatProvider ?? undefined; },
    get agentProvider() { return agentProvider ?? undefined; },
    get tenant() { return tenant; },
  });
</script>

<ChatDialog {persistKey} {onPersist} {onRestore} {onPersistenceError} {componentRegistry} />
