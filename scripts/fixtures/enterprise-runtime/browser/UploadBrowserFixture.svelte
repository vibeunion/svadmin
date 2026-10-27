<script lang="ts">
  import { createClient } from '@supabase/supabase-js';
  import { StorageClient } from '@supabase/storage-js';
  import FileUpload, { type UploadItem, type UploadSession } from '../../../../packages/ui/src/components/FileUpload.svelte';
  import { uploadReferenceFor } from '../../../../packages/ui/src/components/file-upload-reference';
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
  if (injected === undefined) throw new Error('Missing in-memory browser acceptance config');
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
      if (url.origin !== origin) throw new Error('Browser acceptance blocked a non-loopback request');
      if (url.username !== '' || url.password !== '') throw new Error('Browser acceptance blocked URL credentials');
      if (scopeSignal?.aborted || init?.signal?.aborted) {
        throw new DOMException('Browser acceptance request aborted', 'AbortError');
      }
      const signals = [
        AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        request.signal,
        ...(scopeSignal === undefined ? [] : [scopeSignal]),
      ];
      // 验收文件很小；缓冲请求体避免 Chromium 对本地 HTTP 流式请求体的协议兼容问题。
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
        throw new DOMException('Browser acceptance request aborted', 'AbortError');
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
      storageKey: 'svadmin-upload-browser-acceptance',
    },
    global: { fetch: guardedFetch(config.authOrigin) },
  });
  const provider = createSupabaseAuthProvider(authClient);

  let authState = $state<'signed-out' | 'signed-in'>('signed-out');
  let authBusy = $state(false);
  let authError = $state('');
  let uploadCalls = $state(0);
  let referenceJson = $state('');
  let referenceUploadId = $state('');
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
      // 登出后的失败尝试与重新登录后的 retry 使用独立对象路径。
      target = 'retry';
      authState = 'signed-out';
    } finally {
      authBusy = false;
    }
  }

  const upload = async (file: File, session: UploadSession): Promise<{ uploadId: string }> => {
    uploadCalls += 1;
    if (session.signal.aborted) throw new DOMException('Browser acceptance upload aborted', 'AbortError');
    // 每次上传都从真实 Auth provider 重新读取当前已验证会话，不缓存登录时的 token。
    const identity = await provider.getIdentity();
    const token = identity?.token;
    if (typeof token !== 'string' || token.length === 0) throw new Error('Browser acceptance has no authenticated session');
    const path = `${config.objectPrefix}/${target}.txt`;
    const client = new StorageClient(config.storageOrigin, {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`,
    }, guardedFetch(config.storageOrigin, session.signal));
    const result = await client.from(config.bucket).upload(path, file, {
      contentType: file.type || 'text/plain',
    });
    if (result.error !== null) throw new Error('Browser acceptance upload failed');
    const uploadId = result.data?.id ?? '';
    if (uploadId.length === 0) throw new Error('Browser acceptance upload returned an empty id');
    session.setUploadId(uploadId);
    return { uploadId };
  };

  function changed(items: UploadItem[]): void {
    const success = items.find(item => item.status === 'success');
    const reference = success === undefined ? undefined : uploadReferenceFor(success);
    referenceJson = reference === undefined ? '' : JSON.stringify(reference);
    referenceUploadId = reference?.uploadId ?? '';
  }
</script>

<main>
  <header>
    <h1>Enterprise upload acceptance</h1>
  </header>

  <section aria-label="Authentication">
    <button type="button" data-testid="login" onclick={signIn} disabled={authBusy || authState === 'signed-in'}>Sign in</button>
    <button type="button" data-testid="logout" onclick={signOut} disabled={authBusy || authState === 'signed-out'}>Sign out</button>
    <output data-testid="auth-state">{authState}</output>
    {#if authError}<output data-testid="auth-error">{authError}</output>{/if}
  </section>

  <section aria-label="File upload">
    <div data-testid="file-upload">
      <FileUpload accept=".txt" maxSize={1024 * 1024} upload={upload} onChange={changed} />
    </div>
    <output data-testid="upload-calls">{uploadCalls}</output>
    <output data-testid="upload-reference">{referenceJson}</output>
    <output data-testid="upload-id">{referenceUploadId}</output>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    color: var(--foreground);
    background: var(--background);
    font-family: var(--svadmin-font-sans, system-ui, sans-serif);
  }
  main {
    max-width: var(--svadmin-shell-max);
    margin: 0 auto;
    padding: var(--svadmin-space-6);
    display: flex;
    flex-direction: column;
    gap: var(--svadmin-section-gap);
  }
  header { margin: 0; }
  h1 {
    margin: 0;
    font-size: var(--svadmin-text-title);
    line-height: var(--svadmin-leading-tight);
  }
  section {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--svadmin-space-2);
    padding: 0;
    border: 0;
    background: transparent;
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
    color: var(--muted-foreground);
    font-size: var(--svadmin-text-label);
  }
  section[aria-label="File upload"] {
    display: block;
  }
  section[aria-label="File upload"] output {
    display: block;
    margin-block-start: var(--svadmin-space-2);
    overflow-wrap: anywhere;
  }
</style>
