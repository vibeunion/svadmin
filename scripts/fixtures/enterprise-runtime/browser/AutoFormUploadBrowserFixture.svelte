<script lang="ts">
  import { createClient } from '@supabase/supabase-js';
  import { StorageClient } from '@supabase/storage-js';
  import { defineResource, type DataProvider, type ResourceDefinition, type RouterProvider } from '@svadmin/core';
  import { Type } from 'typebox';
  import AdminApp from '../../../../packages/ui/src/components/AdminApp.svelte';
  import AutoForm from '../../../../packages/ui/src/components/AutoForm.svelte';
  import type { UploadSession } from '../../../../packages/ui/src/components/FileUpload.svelte';
  import { createSupabaseAuthProvider } from '../../../../packages/supabase/src/auth-provider';

  interface BrowserAcceptanceConfig {
    authOrigin: string;
    storageOrigin: string;
    anonKey: string;
    email: string;
    password: string;
    bucket: string;
    objectPrefix: string;
  }

  const injected = (window as Window & { __SVADMIN_UPLOAD_BROWSER__?: BrowserAcceptanceConfig })
    .__SVADMIN_UPLOAD_BROWSER__;
  if (injected === undefined) throw new Error('Missing in-memory AutoForm browser acceptance config');
  const config: BrowserAcceptanceConfig = injected;

  const REQUEST_TIMEOUT_MS = 20_000;

  // 只允许访问本轮注入的单个 fixture 回环 origin；同源 runner 代理再转发到
  // Auth/Storage。固定超时与 redirect:error 不能被调用方 init 覆盖。
  function guardedFetch(origin: string, scopeSignal?: AbortSignal): typeof fetch {
    const guarded = async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ): Promise<Response> => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.origin !== origin) throw new Error('AutoForm browser acceptance blocked a non-loopback request');
      if (url.username !== '' || url.password !== '') throw new Error('AutoForm browser acceptance blocked URL credentials');
      if (scopeSignal?.aborted || init?.signal?.aborted) {
        throw new DOMException('AutoForm browser acceptance request aborted', 'AbortError');
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
        throw new DOMException('AutoForm browser acceptance request aborted', 'AbortError');
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

  const authClient = createClient(config.authOrigin, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: memoryStorage(),
      storageKey: 'svadmin-autoform-upload-browser-acceptance',
    },
    global: { fetch: guardedFetch(config.authOrigin) },
  });
  const provider = createSupabaseAuthProvider(authClient);

  let authState = $state<'signed-out' | 'signed-in'>('signed-out');
  let authBusy = $state(false);
  let authError = $state('');
  let uploadCalls = $state(0);
  let submits = $state<Record<string, unknown>[]>([]);
  let target = $state<'primary' | 'retry'>('primary');

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
      target = 'retry';
      authState = 'signed-out';
    } finally {
      authBusy = false;
    }
  }

  const upload = async (file: File, session: UploadSession): Promise<{ uploadId: string }> => {
    uploadCalls += 1;
    if (session.signal.aborted) throw new DOMException('AutoForm browser acceptance upload aborted', 'AbortError');
    // 每次上传都从真实 Auth provider 重新读取当前已验证会话，不缓存登录时的 token。
    const identity = await provider.getIdentity();
    const token = identity?.token;
    if (typeof token !== 'string' || token.length === 0) throw new Error('AutoForm browser acceptance has no authenticated session');
    const path = `${config.objectPrefix}/${target}.txt`;
    const client = new StorageClient(config.storageOrigin, {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`,
    }, guardedFetch(config.storageOrigin, session.signal));
    const result = await client.from(config.bucket).upload(path, file, {
      contentType: file.type || 'text/plain',
    });
    if (result.error !== null) throw new Error('AutoForm browser acceptance upload failed');
    const uploadId = result.data?.id ?? '';
    if (uploadId.length === 0) throw new Error('AutoForm browser acceptance upload returned an empty id');
    session.setUploadId(uploadId);
    return { uploadId };
  };

  const reference = Type.Object({
    url: Type.Optional(Type.String()),
    uploadId: Type.Optional(Type.String()),
  });
  const attachment = Type.Union([Type.String(), reference]);
  const shape = { attachment: Type.Optional(Type.Union([attachment, Type.Null()])) };
  const resources: ResourceDefinition[] = [{
    name: 'records',
    label: 'Records',
    contract: defineResource('records', {
      record: Type.Object({ id: Type.String(), ...shape }),
      create: Type.Object(shape),
    }),
    fields: [{ key: 'attachment', label: 'Attachment', type: 'file', accept: '.txt', maxSize: 1024 * 1024 }],
  }];

  function submittedVariables(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('AutoForm browser acceptance received a non-object submit payload');
    }
    return value as Record<string, unknown>;
  }

  // 这是验收提交回调捕获，不是业务持久化服务；只记录 AutoForm 实际提交的 JSON 快照。
  const dataProvider: DataProvider = {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async ({ id }) => ({ data: { id } }),
    create: async ({ variables }) => {
      // 原样记录 AutoForm 实际提交的 JSON；这是验收捕获，不是业务持久化。
      const submitted = submittedVariables(variables);
      submits = [...submits, submitted];
      return { data: { id: 'record-1', ...submitted } };
    },
    update: async ({ id }) => ({ data: { id } }),
    deleteOne: async ({ id }) => ({ data: { id } }),
    getApiUrl: () => 'https://example.test',
  };
  const routerProvider: RouterProvider = {
    go: () => {},
    back: () => {},
    parse: () => ({ pathname: '/', params: {} }),
  };
  const latestSubmit = $derived(submits.length === 0 ? '' : JSON.stringify(submits[submits.length - 1]));
</script>

{#snippet dashboard()}
  <div class="acceptance-dashboard">
    <section aria-label="Authentication">
      <button type="button" data-testid="login" onclick={signIn} disabled={authBusy || authState === 'signed-in'}>Sign in</button>
      <button type="button" data-testid="logout" onclick={signOut} disabled={authBusy || authState === 'signed-out'}>Sign out</button>
      <output data-testid="auth-state">{authState}</output>
      {#if authError}<output data-testid="auth-error">{authError}</output>{/if}
    </section>

    <section aria-label="AutoForm upload">
      <AutoForm
        resourceName="records"
        mode="create"
        showHeader={false}
        redirect={false}
        {upload}
      />
      <output data-testid="upload-calls">{uploadCalls}</output>
      <output data-testid="autoform-submit-count">{submits.length}</output>
      <output data-testid="autoform-submit-json">{latestSubmit}</output>
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
