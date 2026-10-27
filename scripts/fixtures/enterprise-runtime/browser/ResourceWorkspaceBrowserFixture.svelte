<script lang="ts">
  import { createClient } from '@supabase/supabase-js';
  import { defineResource, type ResourceDefinition, type RouterProvider } from '@svadmin/core';
  import { Type } from 'typebox';
  import AdminApp from '../../../../packages/ui/src/components/AdminApp.svelte';
  import ResourceOperationsPage from '../../../../packages/ui/src/components/ResourceOperationsPage.svelte';
  import { createSupabaseAuthProvider } from '../../../../packages/supabase/src/auth-provider';
  import { createSupabaseDataProvider } from '../../../../packages/supabase/src/data-provider';

  interface WorkspaceBrowserConfig {
    origin: string;
    anonKey: string;
    email: string;
    password: string;
  }

  const injected = (window as Window & { __SVADMIN_UPLOAD_BROWSER__?: WorkspaceBrowserConfig })
    .__SVADMIN_UPLOAD_BROWSER__;
  if (injected === undefined) throw new Error('Missing in-memory workspace browser acceptance config');
  const config: WorkspaceBrowserConfig = injected;
  const REQUEST_TIMEOUT_MS = 20_000;

  function guardedFetch(origin: string): typeof fetch {
    const guarded = async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ): Promise<Response> => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.origin !== origin) throw new Error('Workspace acceptance blocked a non-loopback request');
      if (url.username !== '' || url.password !== '') throw new Error('Workspace acceptance blocked URL credentials');
      const body = request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer();
      return fetch(url.href, {
        method: request.method,
        headers: request.headers,
        body,
        redirect: 'error',
        signal: AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT_MS), request.signal]),
      });
    };
    return guarded as typeof fetch;
  }

  function memoryStorage(): Storage {
    const values = new Map<string, string>();
    return {
      get length() { return values.size; },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => { values.delete(key); },
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
  }

  const authClient = createClient(config.origin, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: memoryStorage(),
      storageKey: 'svadmin-workspace-browser-acceptance',
    },
    global: { fetch: guardedFetch(config.origin) },
  });
  const provider = createSupabaseAuthProvider(authClient);
  const restClient = createClient(config.origin, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: 'enterprise_acceptance' },
    accessToken: async () => {
      const identity = await provider.getIdentity();
      const token = identity?.token;
      if (typeof token !== 'string' || token.length === 0) {
        throw new Error('Workspace acceptance has no authenticated session');
      }
      return token;
    },
    global: { fetch: guardedFetch(config.origin) },
  });
  const dataProvider = createSupabaseDataProvider(restClient);

  let authState = $state<'signed-out' | 'signed-in'>('signed-out');
  let authBusy = $state(false);
  let authError = $state('');

  async function signIn(): Promise<void> {
    if (authBusy) return;
    authBusy = true;
    authError = '';
    try {
      const result = await provider.login({ email: config.email, password: config.password });
      if (!result.success) {
        authError = result.error?.name ?? 'LOGIN_FAILED';
        return;
      }
      authState = 'signed-in';
    } finally {
      authBusy = false;
    }
  }

  async function signOut(): Promise<void> {
    if (authBusy) return;
    authBusy = true;
    authError = '';
    try {
      const result = await provider.logout();
      if (!result.success) {
        authError = result.error?.name ?? 'LOGOUT_FAILED';
        return;
      }
      authState = 'signed-out';
    } finally {
      authBusy = false;
    }
  }

  const attachment = Type.Object({ uploadId: Type.String() });
  const resources: ResourceDefinition[] = [{
    name: 'browser_records',
    label: 'Browser records',
    contract: defineResource('browser_records', {
      record: Type.Object({
        id: Type.String(),
        tenant_id: Type.String(),
        title: Type.String(),
        attachment: Type.Optional(Type.Union([attachment, Type.Null()])),
      }),
      update: Type.Object({ title: Type.String({ minLength: 1 }) }),
    }),
    canCreate: false,
    canEdit: true,
    canShow: true,
    canDelete: false,
    defaultSort: { field: 'title', order: 'asc' },
    fields: [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'title', label: 'Title', type: 'text', searchable: true },
    ],
  }];

  const routerProvider: RouterProvider = {
    parse: () => ({ pathname: '/', params: {} }),
    go: () => {},
    back: () => {},
    formatLink: path => path,
  };
</script>

{#snippet batchActions({ selectedIds }: { selectedIds: (string | number)[]; selection: unknown })}
  <span data-testid="workspace-selected-count">Selected {selectedIds.length}</span>
{/snippet}

{#snippet dashboard()}
  <main class="acceptance-workspace">
    <section aria-label="Authentication">
      <button type="button" data-testid="login" onclick={signIn} disabled={authBusy || authState === 'signed-in'}>Sign in</button>
      <button type="button" data-testid="logout" onclick={signOut} disabled={authBusy || authState === 'signed-out'}>Sign out</button>
      <output data-testid="auth-state">{authState}</output>
      {#if authError}<output data-testid="auth-error">{authError}</output>{/if}
    </section>
    {#if authState === 'signed-in'}
      <ResourceOperationsPage
        resourceName="browser_records"
        eyebrow="Operations"
        title="Resource workspace"
        description="Browser records for the current tenant."
        actionLabel="New record"
        tableProps={{ batchActions, syncWithLocation: false }}
      />
    {/if}
  </main>
{/snippet}

<AdminApp
  {dataProvider}
  {resources}
  {routerProvider}
  accessControlProvider={{ can: async () => ({ can: true }) }}
  locale="en"
  {dashboard}
/>

<style>
  :global(body) {
    margin: 0;
    color: var(--foreground);
    background: var(--background);
    font-family: var(--svadmin-font-sans, system-ui, sans-serif);
  }
  .acceptance-workspace {
    display: flex;
    flex-direction: column;
    gap: var(--svadmin-section-gap);
    min-width: 0;
  }
  section[aria-label="Authentication"] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--svadmin-space-2);
  }
  button {
    min-height: var(--svadmin-control-h);
    padding: 0 var(--svadmin-space-3);
    border: 1px solid var(--primary);
    border-radius: var(--radius-md);
    color: var(--primary-foreground);
    background: var(--primary);
    font: inherit;
    font-size: var(--svadmin-text-label);
    cursor: pointer;
  }
  button:disabled { cursor: not-allowed; opacity: 0.55; }
  output {
    display: block;
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-label);
    overflow-wrap: anywhere;
  }
</style>
