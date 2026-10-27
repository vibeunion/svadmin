<script lang="ts">
  import { createClient } from '@supabase/supabase-js';
  import { StorageClient } from '@supabase/storage-js';
  import { defineResource, type ResourceDefinition, type RouterProvider } from '@svadmin/core';
  import { Type } from 'typebox';
  import AdminApp from '../../../../packages/ui/src/components/AdminApp.svelte';
  import AutoForm from '../../../../packages/ui/src/components/AutoForm.svelte';
  import type { UploadSession } from '../../../../packages/ui/src/components/FileUpload.svelte';
  import { createSupabaseAuthProvider } from '../../../../packages/supabase/src/auth-provider';
  import { createSupabaseDataProvider } from '../../../../packages/supabase/src/data-provider';

  interface BrowserRecordConfig {
    origin: string;
    anonKey: string;
    email: string;
    password: string;
    bucket: string;
    objectPrefix: string;
  }

  const injected = (window as Window & { __SVADMIN_UPLOAD_BROWSER__?: BrowserRecordConfig })
    .__SVADMIN_UPLOAD_BROWSER__;
  if (injected === undefined) throw new Error('Missing in-memory AutoForm record acceptance config');
  const config: BrowserRecordConfig = injected;
  const requestedId = new URL(window.location.href).searchParams.get('id') ?? undefined;
  const REQUEST_TIMEOUT_MS = 20_000;

  // 只允许本轮 fixture 回环 origin；同源 runner 代理再转发到 Auth/REST/Storage。
  function guardedFetch(origin: string, scopeSignal?: AbortSignal): typeof fetch {
    const guarded = async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ): Promise<Response> => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.origin !== origin) throw new Error('AutoForm record acceptance blocked a non-loopback request');
      if (url.username !== '' || url.password !== '') throw new Error('AutoForm record acceptance blocked URL credentials');
      if (scopeSignal?.aborted || init?.signal?.aborted) {
        throw new DOMException('AutoForm record acceptance request aborted', 'AbortError');
      }
      const signals = [
        AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        request.signal,
        ...(scopeSignal === undefined ? [] : [scopeSignal]),
      ];
      const body = request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer();
      const response = await fetch(url.href, {
        method: request.method,
        headers: request.headers,
        body,
        redirect: 'error',
        signal: AbortSignal.any(signals),
      });
      if (scopeSignal?.aborted) {
        await response.body?.cancel();
        throw new DOMException('AutoForm record acceptance request aborted', 'AbortError');
      }
      return response;
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
      storageKey: 'svadmin-autoform-record-browser-acceptance',
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
        throw new Error('AutoForm record acceptance has no authenticated session');
      }
      return token;
    },
    global: { fetch: guardedFetch(config.origin) },
  });
  const dataProvider = createSupabaseDataProvider(restClient);

  let authState = $state<'signed-out' | 'signed-in'>('signed-out');
  let authBusy = $state(false);
  let authError = $state('');
  let saveCount = $state(0);

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

  const upload = async (file: File, session: UploadSession): Promise<{ uploadId: string }> => {
    if (session.signal.aborted) throw new DOMException('AutoForm record acceptance upload aborted', 'AbortError');
    const identity = await provider.getIdentity();
    const token = identity?.token;
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error('AutoForm record acceptance has no authenticated session');
    }
    const path = `${config.objectPrefix}/primary.txt`;
    const client = new StorageClient(config.origin, {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`,
    }, guardedFetch(config.origin, session.signal));
    const result = await client.from(config.bucket).upload(path, file, {
      contentType: file.type || 'text/plain',
    });
    if (result.error !== null) throw new Error('AutoForm record acceptance upload failed');
    const uploadId = result.data?.id ?? '';
    if (uploadId.length === 0) throw new Error('AutoForm record acceptance upload returned an empty id');
    session.setUploadId(uploadId);
    return { uploadId };
  };

  const reference = Type.Object({ uploadId: Type.String() });
  const resources: ResourceDefinition[] = [{
    name: 'browser_records',
    label: 'Browser records',
    contract: defineResource('browser_records', {
      record: Type.Object({
        id: Type.String(),
        tenant_id: Type.String(),
        title: Type.String(),
        attachment: Type.Optional(reference),
      }),
      create: Type.Object({ title: Type.String({ minLength: 1 }), attachment: reference }),
      update: Type.Object({ title: Type.String({ minLength: 1 }), attachment: reference }),
    }),
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'attachment', label: 'Attachment', type: 'file', required: true, accept: '.txt', maxSize: 1024 * 1024 },
    ],
  }];

  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };

  function onSaved(): void {
    saveCount += 1;
  }
</script>

{#snippet dashboard()}
  <div class="acceptance-dashboard">
    <section aria-label="Authentication">
      <button type="button" data-testid="login" onclick={signIn} disabled={authBusy || authState === 'signed-in'}>Sign in</button>
      <button type="button" data-testid="logout" onclick={signOut} disabled={authBusy || authState === 'signed-out'}>Sign out</button>
      <output data-testid="auth-state">{authState}</output>
      {#if authError}<output data-testid="auth-error">{authError}</output>{/if}
    </section>

    <section aria-label="AutoForm record">
      {#if authState === 'signed-in'}
        {#if requestedId === undefined}
          <AutoForm
            resourceName="browser_records"
            mode="create"
            showHeader={false}
            redirect={false}
            {upload}
            onSuccess={onSaved}
          />
        {:else}
          <AutoForm
            resourceName="browser_records"
            mode="edit"
            id={requestedId}
            showHeader={false}
            redirect={false}
            {upload}
            onSuccess={onSaved}
          />
        {/if}
      {/if}
      <output data-testid="autoform-record-save-count">{saveCount}</output>
    </section>
  </div>
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
  .acceptance-dashboard {
    display: flex;
    flex-direction: column;
    gap: var(--svadmin-section-gap);
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
