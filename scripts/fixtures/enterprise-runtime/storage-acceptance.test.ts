import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createServer, request as httpRequest, type ClientRequest, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { StorageApiError, StorageClient } from '@supabase/storage-js';
import type { AuthProvider, DataProvider } from '@svadmin/core';
import { createSupabaseDataProvider } from '../../../packages/supabase/src/data-provider';
import type { UploadCancelHandler, UploadHandler, UploadSession } from '../../../packages/ui/src/components/file-upload-types';
import { uploadReferenceFor } from '../../../packages/ui/src/components/file-upload-reference';
import { createSupabaseAuthProvider } from '../../../packages/supabase/src/auth-provider';
import {
  browserObjectPaths, requiredBrowserEngines, runBrowserAutoFormUploadAcceptance,
  runBrowserAutoFormRecordAcceptance, runBrowserResourceWorkspaceAcceptance, runBrowserUploadAcceptance,
} from './browser/upload-browser-acceptance';

// 验收专用 fixture：普通用户 A/B 只通过真实 GoTrue 注册登录取得会话。
// runner 传入的 anon/service 基础键由 runner 签发；本进程不接收 JWT 签名 secret。
const BUCKET = 'svadmin-acceptance';
const MARKER = 'SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE';
const RUN_DIR = 'owner/svadmin-storage-run';
// 已知精确 fixture 对象路径：清理只按这些路径删除，不依赖目录列举。
const A_OBJECT = `${RUN_DIR}/a.txt`;
const B_OBJECT = `${RUN_DIR}/b.txt`;
const ANON_OBJECT = `${RUN_DIR}/anon.txt`;
const CANCELLED_OBJECT = `${RUN_DIR}/cancelled.txt`;
const PRE_ABORTED_OBJECT = `${RUN_DIR}/pre-aborted.txt`;
const IN_FLIGHT_OBJECT = `${RUN_DIR}/in-flight-cancelled.txt`;
const REFRESHED_OBJECT = `${RUN_DIR}/refreshed.txt`;
const FIXTURE_PATHS = [
  A_OBJECT, B_OBJECT, ANON_OBJECT, CANCELLED_OBJECT, PRE_ABORTED_OBJECT, IN_FLIGHT_OBJECT,
  REFRESHED_OBJECT,
];
const BROWSER_FIXTURE_PATHS: string[] = [];

const storageUrl = process.env['SVADMIN_STORAGE_URL'];
const authUrl = process.env['SVADMIN_STORAGE_AUTH_URL'];
const restUrl = process.env['SVADMIN_STORAGE_REST_URL'];
const anonKey = process.env['SVADMIN_STORAGE_ANON_KEY'];
const serviceKey = process.env['SVADMIN_STORAGE_SERVICE_KEY'];
const runMarker = process.env['SVADMIN_STORAGE_RUN_MARKER'];

// 只接受严格 `http://127.0.0.1:<port>`：拒绝 localhost（可能被重解析）、
// userinfo、query、fragment 与任何路径。
function strictLoopback(value: string | undefined): URL | undefined {
  if (value === undefined) return undefined;
  if (!/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') return undefined;
    if (url.username !== '' || url.password !== '') return undefined;
    if (url.search !== '' || url.hash !== '') return undefined;
    if (url.pathname !== '/') return undefined;
    const port = Number(url.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return undefined;
    if (value !== `http://127.0.0.1:${url.port}`) return undefined;
    return url;
  } catch { return undefined; }
}

const storageTarget = strictLoopback(storageUrl);
const authTarget = strictLoopback(authUrl);
const restTarget = strictLoopback(restUrl);

// 入口守卫：任何一次显式调用都必须带正确标记、两个严格回环地址与全部基础键；
// 不满足即硬失败，避免被 runner 或直接调用当作通过。
const enabled = runMarker === MARKER && storageTarget !== undefined && authTarget !== undefined
  && restTarget !== undefined
  && Boolean(anonKey && serviceKey);
if (runMarker !== undefined || storageUrl !== undefined || authUrl !== undefined || restUrl !== undefined) {
  if (runMarker !== MARKER) throw new Error('Auth + Storage acceptance requires the run marker issued by its runner.');
  if (storageTarget === undefined) throw new Error('Auth + Storage acceptance refused a non-strict-loopback Storage target.');
  if (authTarget === undefined) throw new Error('Auth + Storage acceptance refused a non-strict-loopback GoTrue target.');
  if (restTarget === undefined) throw new Error('Auth + Storage acceptance refused a non-strict-loopback PostgREST target.');
  if (!enabled) throw new Error('Auth + Storage acceptance requires the full guarded fixture environment.');
}

// 本 fixture 必须解析到当前隔离工作树的源码，而不是共享 node_modules 指向的原工作区。
// 这些断言覆盖直接依赖与传递依赖（core/audit 由 supabase auth-provider 间接引入）。
const WORKSPACE_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const FIXTURE_MODULE_FILES = [
  ['@svadmin/core', 'packages/core/src/index.ts'],
  ['@svadmin/core/schema', 'packages/core/src/schema.ts'],
  ['@svadmin/core/options', 'packages/core/src/defined-options.ts'],
  ['@svadmin/core/audit', 'packages/core/src/audit.ts'],
  ['@svadmin/refine-adapter', 'packages/refine-adapter/src/index.ts'],
] as const;

function assertFixtureModuleIsolation(): void {
  for (const [specifier, expectedPath] of FIXTURE_MODULE_FILES) {
    const resolved = fileURLToPath(import.meta.resolve(specifier));
    expect(resolved).toBe(`${WORKSPACE_ROOT}${expectedPath}`);
    expect(resolved.startsWith(`${WORKSPACE_ROOT}packages/`)).toBe(true);
  }
}

const REQUEST_TIMEOUT_MS = 20_000;
// 取消完成期限必须严格短于固定传输超时，确保“因取消而失败”不会被 20s 超时冒充。
const CANCEL_DEADLINE_MS = 5_000;

// 只允许访问已授权的单机回环 origin，禁止重定向到外部主机。
// redirect 与超时在组合调用方信号后强制写入，init 无法覆盖。
// auth 客户端会请求 `<origin>/auth/v1/...`，这里把该前缀映射到 GoTrue 根路径。
function guardFetchFor(
  origin: string,
  options: {
    scopeSignal?: AbortSignal | undefined;
    authPrefix?: boolean | undefined;
    restPrefix?: boolean | undefined;
  } = {},
): typeof fetch {
  const guarded = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== origin) throw new Error('Auth + Storage acceptance blocked a non-loopback request');
    if (url.username !== '' || url.password !== '') throw new Error('Auth + Storage acceptance blocked URL credentials');
    let target = url;
    if (options.authPrefix) {
      const prefix = '/auth/v1';
      if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) {
        throw new Error('Auth + Storage acceptance blocked a non-auth request');
      }
      target = new URL(url.href);
      const suffix = url.pathname.slice(prefix.length);
      target.pathname = suffix.length > 0 ? suffix : '/';
    }
    if (options.restPrefix) {
      const prefix = '/rest/v1';
      if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) {
        throw new Error('Auth + Storage acceptance blocked a non-PostgREST request');
      }
      target = new URL(url.href);
      const suffix = url.pathname.slice(prefix.length);
      target.pathname = suffix.length > 0 ? suffix : '/';
    }
    // 调用前已中止时直接拒绝，绝不发出请求。
    if (options.scopeSignal?.aborted) throw new DOMException('Auth + Storage acceptance request aborted', 'AbortError');
    if (init?.signal?.aborted) throw new DOMException('Auth + Storage acceptance request aborted', 'AbortError');
    // 组合会话信号、调用方信号（SDK 的 FetchParameters.signal）与固定超时。
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const signals = [timeout, request.signal, ...(options.scopeSignal ? [options.scopeSignal] : [])];
    const response = await fetch(target.href, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'error',
      signal: AbortSignal.any(signals),
      ...(request.body === null ? {} : { duplex: 'half' as const }),
    });
    // 请求在途时被中止：丢弃已到达的响应，调用方不能把它当成功。
    if (options.scopeSignal?.aborted) {
      await response.body?.cancel();
      throw new DOMException('Auth + Storage acceptance request aborted', 'AbortError');
    }
    return response;
  };
  return Object.assign(guarded, { preconnect: fetch.preconnect }) as typeof fetch;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

interface InFlightProxySnapshot {
  readonly forwardedBytes: number;
  readonly bodyCompleteWhenPaused: boolean;
  readonly authorizationMatches: boolean;
  readonly method: string;
  readonly path: string;
}

interface InFlightUploadProxy {
  readonly origin: string;
  readonly barrier: Promise<InFlightProxySnapshot>;
  close: () => Promise<void>;
}

// 仅绑定 127.0.0.1 随机端口的受控在途代理：只接受指定 POST 路径，并固定转发到当前
// 真实 Storage origin。屏障表示首个请求体数据块已写入上游连接且客户端请求体尚未结束；
// 它不表示 Storage 已解析、提交或持久化该数据。
function startInFlightUploadProxy(
  upstreamOrigin: string,
  expectedPath: string,
  expectedAuthorization: string,
): Promise<InFlightUploadProxy> {
  const upstream = new URL(upstreamOrigin);
  if (upstream.protocol !== 'http:' || upstream.hostname !== '127.0.0.1'
    || upstream.username !== '' || upstream.password !== ''
    || upstream.pathname !== '/' || upstream.search !== '' || upstream.hash !== '') {
    return Promise.reject(new Error('In-flight proxy refused a non-loopback upstream Storage origin'));
  }

  const barrier = deferred<InFlightProxySnapshot>();
  // close 可能在测试提前失败时触发；提前标记处理，避免屏障拒绝变成未处理异常。
  void barrier.promise.catch(() => {});
  let barrierSettled = false;
  let barrierTimer: ReturnType<typeof setTimeout> | undefined;
  let incoming: IncomingMessage | undefined;
  let outgoing: ServerResponse | undefined;
  let upstreamRequest: ClientRequest | undefined;
  const sockets = new Set<Socket>();
  // 只接受首个完全合规的请求：方法、精确路径与预期 Authorization 全部匹配才转发。
  // 额外请求一律拒绝，且不覆盖当前在途句柄，避免 close 时漏清理。
  let accepted = false;
  const server: Server = createServer((request, response) => {
    if (accepted) {
      response.writeHead(409, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('blocked by in-flight acceptance proxy: a request is already in flight');
      return;
    }
    if (request.method !== 'POST' || request.url !== expectedPath
      || request.headers.authorization !== expectedAuthorization) {
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('blocked by in-flight acceptance proxy');
      return;
    }
    accepted = true;
    incoming = request;
    outgoing = response;

    const headers: Record<string, string | string[]> = {};
    for (const [name, value] of Object.entries(request.headers)) {
      if (value === undefined) continue;
      const lower = name.toLowerCase();
      if (['host', 'connection', 'proxy-connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'expect'].includes(lower)) {
        continue;
      }
      headers[name] = value;
    }

    const forwarded = httpRequest({
      hostname: upstream.hostname,
      port: upstream.port,
      method: 'POST',
      path: expectedPath,
      headers,
      agent: false,
    }, (upstreamResponse) => {
      if (response.destroyed || response.writableEnded) {
        upstreamResponse.destroy();
        return;
      }
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    upstreamRequest = forwarded;
    forwarded.on('error', (error: Error) => {
      failBarrier(error);
      if (!response.destroyed) response.destroy(error);
    });

    let firstChunkForwarded = false;
    request.on('data', (chunk: Buffer) => {
      if (firstChunkForwarded) return;
      firstChunkForwarded = true;
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      // 暂停读取客户端剩余请求体，保证取消发生在“首段已转发但请求体未完整发送”状态。
      request.pause();
      forwarded.write(bytes, (error?: Error | null) => {
        // 只有上游写入回调没有错误时，首段才算真正写入；失败不能冒充屏障成立。
        if (error !== undefined && error !== null) {
          failBarrier(error);
          return;
        }
        resolveBarrier({
          forwardedBytes: bytes.length,
          bodyCompleteWhenPaused: request.complete,
          authorizationMatches: request.headers.authorization === expectedAuthorization,
          method: request.method ?? '',
          path: request.url ?? '',
        });
      });
    });
    request.on('end', () => {
      if (!firstChunkForwarded) failBarrier(new Error('In-flight proxy saw the body end before its first chunk'));
    });
    request.on('error', (error: Error) => {
      failBarrier(error);
      forwarded.destroy();
    });
    request.on('aborted', () => {
      forwarded.destroy();
    });
    request.on('close', () => {
      forwarded.destroy();
    });
  });
  server.on('connection', (socket: Socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.on('clientError', (_error, socket) => {
    socket.destroy();
  });

  function clearBarrierTimer(): void {
    if (barrierTimer === undefined) return;
    clearTimeout(barrierTimer);
    barrierTimer = undefined;
  }

  function resolveBarrier(snapshot: InFlightProxySnapshot): void {
    if (barrierSettled) return;
    barrierSettled = true;
    clearBarrierTimer();
    barrier.resolve(snapshot);
  }

  function failBarrier(error: unknown): void {
    if (barrierSettled) return;
    barrierSettled = true;
    clearBarrierTimer();
    barrier.reject(error);
  }

  return new Promise<InFlightUploadProxy>((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off('error', onError);
      const address = server.address();
      if (address === null || typeof address === 'string') {
        server.close();
        reject(new Error('In-flight proxy did not expose a loopback TCP address'));
        return;
      }
      server.on('error', (error: Error) => failBarrier(error));
      barrierTimer = setTimeout(() => {
        failBarrier(new Error('In-flight proxy did not observe a forwarded first body chunk'));
      }, REQUEST_TIMEOUT_MS);
      barrierTimer.unref?.();
      resolve({
        origin: `http://127.0.0.1:${address.port}`,
        barrier: barrier.promise,
        close: async () => {
          clearBarrierTimer();
          failBarrier(new Error('In-flight proxy closed before its barrier'));
          for (const socket of sockets) socket.destroy();
          upstreamRequest?.destroy();
          incoming?.destroy();
          outgoing?.destroy();
          await new Promise<void>((finish) => {
            if (!server.listening) { finish(); return; }
            server.close(() => finish());
          });
        },
      });
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(0, '127.0.0.1');
  });
}

function storageClientFor(
  accessToken: string,
  scopeSignal?: AbortSignal,
  targetOrigin = storageTarget?.origin,
): StorageClient {
  if (targetOrigin === undefined || !anonKey) throw new Error('Storage acceptance URL or anon key missing');
  return new StorageClient(targetOrigin, {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
  }, guardFetchFor(targetOrigin, { scopeSignal }));
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

function authClientFor(storageKey: string): SupabaseClient {
  if (authTarget === undefined || !anonKey) throw new Error('GoTrue acceptance URL or anon key missing');
  return createClient(authTarget.origin, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: memoryStorage(),
      storageKey,
    },
    global: { fetch: guardFetchFor(authTarget.origin, { authPrefix: true }) },
  });
}

function bytesOf(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  return left.every((byte, index) => byte === right[index]);
}

// 只用于断言真实 GoTrue token 的 claim 形态；不校验签名、不打印 token。
function jwtPayload(token: string): Record<string, unknown> {
  const encoded = token.split('.')[1];
  if (encoded === undefined || encoded.length === 0) throw new Error('GoTrue token payload missing');
  const parsed: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('GoTrue token payload is not an object');
  }
  return parsed as Record<string, unknown>;
}

// 只对真实 Storage API 错误断言精确状态码与服务端错误码。
function expectApiError(error: unknown, statusCode: string, code: string): void {
  expect(error).toBeInstanceOf(StorageApiError);
  const apiError = error as StorageApiError;
  expect(apiError.statusCode).toBe(statusCode);
  expect(apiError.code).toBe(code);
}

describe.skipIf(!enabled)('OrbStack GoTrue + Storage acceptance', () => {
  interface LocalIdentity {
    client: SupabaseClient;
    provider: AuthProvider;
    id: string;
    email: string;
    password: string;
  }

  let userA!: LocalIdentity;
  let userB!: LocalIdentity;
  const service = () => storageClientFor(serviceKey ?? '');
  // 每次访问 A 的资源都先通过真实 Auth provider 重新验证当前身份，再取会话 token。
  // 不缓存登录时或刷新前的 token，避免登出/刷新后继续使用旧凭据。
  async function verifiedToken(identity: LocalIdentity): Promise<string> {
    const current = await identity.provider.getIdentity();
    if (current === null || current.id !== identity.id) {
      throw new Error('Auth + Storage acceptance has no verified current session');
    }
    const token = current['token'];
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error('Auth + Storage acceptance has no verified session token');
    }
    return token;
  }
  const asA = async (scopeSignal?: AbortSignal) => storageClientFor(await verifiedToken(userA), scopeSignal);
  const asB = async () => storageClientFor(await verifiedToken(userB));
  const asAnon = () => storageClientFor(anonKey ?? '');

  // PostgREST 客户端只允许精确回环 origin 与固定 /rest/v1 前缀。
  // 用户访问使用真实 GoTrue 会话 token（accessToken 回调每次取当前已验证会话），
  // 不使用 runner 手签 JWT，也不把 service_role 放进普通请求。
  function tenantProviderFor(identity: LocalIdentity | null): DataProvider {
    if (restTarget === undefined || !anonKey) throw new Error('PostgREST acceptance URL or anon key missing');
    const client = createClient(restTarget.origin, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      // PostgREST 只暴露 enterprise_acceptance；显式 schema 避免默认请求 public。
      db: { schema: 'enterprise_acceptance' },
      ...(identity === null ? {} : { accessToken: async () => verifiedToken(identity) }),
      global: { fetch: guardFetchFor(restTarget.origin, { restPrefix: true }) },
    });
    return createSupabaseDataProvider(client);
  }

  const bodies = {
    a: `svadmin-storage-a-${crypto.randomUUID()}`,
    b: `svadmin-storage-b-${crypto.randomUUID()}`,
    anon: `svadmin-storage-anon-${crypto.randomUUID()}`,
    cancelled: `svadmin-storage-cancelled-${crypto.randomUUID()}`,
    refreshed: `svadmin-storage-refreshed-${crypto.randomUUID()}`,
    loggedOut: `svadmin-storage-logged-out-${crypto.randomUUID()}`,
  };
  const state = { uploadId: '' };

  async function registerAndLogin(label: string): Promise<LocalIdentity> {
    const client = authClientFor(`svadmin-auth-storage-${label}-${crypto.randomUUID()}`);
    const provider = createSupabaseAuthProvider(client);
    const email = `storage-${label}-${crypto.randomUUID()}@example.test`;
    const password = `Pw-${crypto.randomUUID().replaceAll('-', '')}`;

    const register = provider.register;
    if (!register) throw new Error('GoTrue provider does not expose registration');
    const registered = await register({ email, password, name: `Storage ${label}` });
    expect(registered.success).toBe(true);
    const loggedIn = await provider.login({ email, password });
    expect(loggedIn.success).toBe(true);

    const identity = await provider.getIdentity();
    expect(identity?.email).toBe(email);
    expect(identity?.id).toEqual(expect.any(String));
    const user = identity?.id;
    if (!user) throw new Error('GoTrue identity did not return a user id');
    const session = await client.auth.getSession();
    if (session.data.session?.user.id !== user || !session.data.session?.access_token) {
      throw new Error('GoTrue login did not persist a usable session');
    }
    return { client, provider, id: user, email, password };
  }

  async function registerBrowserUser(): Promise<{ id: string; email: string; password: string }> {
    const client = authClientFor(`svadmin-auth-browser-register-${crypto.randomUUID()}`);
    const email = `browser-${crypto.randomUUID()}@example.test`;
    const password = `Pw-${crypto.randomUUID().replaceAll('-', '')}`;
    const registered = await client.auth.signUp({ email, password, options: { data: { name: 'Browser acceptance' } } });
    expect(registered.error).toBeNull();
    const user = registered.data.user?.id;
    if (!user) throw new Error('GoTrue browser registration did not return a user id');
    return { id: user, email, password };
  }

  async function loginBrowserOwner(email: string, password: string): Promise<LocalIdentity> {
    const client = authClientFor(`svadmin-auth-browser-owner-${crypto.randomUUID()}`);
    const provider = createSupabaseAuthProvider(client);
    const loggedIn = await provider.login({ email, password });
    expect(loggedIn.success).toBe(true);
    const identity = await provider.getIdentity();
    expect(identity?.email).toBe(email);
    const user = identity?.id;
    if (!user) throw new Error('Browser owner login did not return a user id');
    const session = await client.auth.getSession();
    if (session.data.session?.user.id !== user || !session.data.session?.access_token) {
      throw new Error('Browser owner login did not persist a usable session');
    }
    return { client, provider, id: user, email, password };
  }

  async function readAs(
    client: () => StorageClient | Promise<StorageClient>, path: string,
  ): Promise<Uint8Array<ArrayBuffer>> {
    const resolved = await client();
    const download = await resolved.from(BUCKET).download(path);
    if (download.error !== null) throw new Error('download failed');
    return new Uint8Array(await (download.data as Blob).arrayBuffer());
  }

  async function uploadAs(
    client: () => StorageClient | Promise<StorageClient>, path: string, text: string,
  ): Promise<string> {
    const resolved = await client();
    const result = await resolved.from(BUCKET).upload(path, bytesOf(text), { contentType: 'text/plain' });
    if (result.error !== null) throw new Error('upload failed');
    const id = result.data?.id ?? '';
    if (id.length === 0) throw new Error('upload returned an empty id');
    return id;
  }

  function uploadFor(path: string, targetOrigin?: string): UploadHandler {
    return async (file: File, session: UploadSession) => {
      if (session.signal.aborted) throw new DOMException('Auth + Storage acceptance upload aborted', 'AbortError');
      // 上传回调不持有登录时的会话 token：刷新后自动使用新 token，登出后立即拒绝。
      // upload 不透传 FileOptions.signal，必须使用该会话专属的 fetch。
      const client = storageClientFor(await verifiedToken(userA), session.signal, targetOrigin);
      const result = await client.from(BUCKET).upload(path, file, { contentType: 'text/plain' });
      if (result.error !== null) throw new Error('upload callback failed');
      const uploadId = result.data?.id ?? '';
      if (uploadId.length === 0) throw new Error('upload callback returned an empty id');
      session.setUploadId(uploadId);
      return { uploadId };
    };
  }

  beforeAll(async () => {
    // bucket 和策略均由 runner 以 postgres 初始化；service_role 只读预检。
    const buckets = await service().listBuckets();
    expect(buckets.error).toBeNull();
    const bucket = buckets.data?.find((entry) => entry.id === BUCKET || entry.name === BUCKET);
    expect(bucket).toBeDefined();
    expect(bucket?.public).toBe(false);

    // 两个普通用户都必须经过真实 GoTrue 注册与登录，测试进程不签发用户 JWT。
    userA = await registerAndLogin('a');
    userB = await registerAndLogin('b');
    expect(userA.id).not.toBe(userB.id);

    // B 先自证身份有效：能上传并读回自己的另一个对象。
    // 否则 B 对 A 对象的 404/403 也可能来自无效令牌或整体不可写。
    const bId = await uploadAs(asB, B_OBJECT, bodies.b);
    expect(bId.length).toBeGreaterThan(0);
    expect(sameBytes(await readAs(asB, B_OBJECT), bytesOf(bodies.b))).toBe(true);
  });

  it('上传回调返回可持久化引用，所有者读回相同字节', async () => {
    // fixture-only 上传回调：消费成功结果后只保留 uploadId，不保存文件或签名凭据。
    // 失败必须 throw：返回 undefined 会被队列当成“未产生引用”，静默吞掉错误。
    const controller = new AbortController();
    const upload = uploadFor(A_OBJECT);

    const file = new File([bodies.a], 'a.txt', { type: 'text/plain' });
    let uploadId = '';
    const outcome = await upload(file, {
      signal: controller.signal,
      idempotencyKey: crypto.randomUUID(),
      setUploadId: (value) => { uploadId = value; },
      onProgress: () => {},
    });
    const reference = uploadReferenceFor({ status: 'success', ...outcome });
    expect(reference?.uploadId).toBe(uploadId);
    expect(uploadId.length).toBeGreaterThan(0);
    expect(reference?.url).toBeUndefined();
    state.uploadId = uploadId;

    expect(sameBytes(await readAs(asA, A_OBJECT), bytesOf(bodies.a))).toBe(true);
  });

  it('预先中止的会话不产生对象，也不发布成功引用', async () => {
    // 只覆盖“请求前已中止”的边界；不声称等于传输途中的在途取消。
    const controller = new AbortController();
    controller.abort();
    let uploadId = '';
    await expect(uploadFor(PRE_ABORTED_OBJECT)(new File(['pre-aborted'], 'pre-aborted.txt'), {
      signal: controller.signal,
      idempotencyKey: crypto.randomUUID(),
      setUploadId: (id) => { uploadId = id; },
      onProgress: () => {},
    })).rejects.toThrow();
    expect(uploadId).toBe('');

    const reference = uploadReferenceFor({ status: 'success', uploadId });
    expect(reference).toBeUndefined();

    const gone = await (await asA()).from(BUCKET).download(PRE_ABORTED_OBJECT);
    expectApiError(gone.error, '404', 'NoSuchKey');
    expect(gone.data).toBeNull();
  });

  it('真实传输已开始但未完成时取消，客户端拒绝且服务端无最终对象', async () => {
    if (storageTarget === undefined) throw new Error('Storage acceptance target missing');
    const expectedPath = `/object/${BUCKET}/${IN_FLIGHT_OBJECT}`;
    // 取当前真实 GoTrue 会话 token 仅用于内存内比对代理是否转发了该令牌，不打印。
    const token = await verifiedToken(userA);
    const proxy = await startInFlightUploadProxy(storageTarget.origin, expectedPath, `Bearer ${token}`);
    const controller = new AbortController();
    const body = new Uint8Array(2 * 1024 * 1024).fill(0x61);
    const file = new File([body], 'in-flight-cancelled.txt', { type: 'text/plain' });
    let uploadId = '';
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
    // 先包装拒绝结果，避免在等待网络屏障期间出现未处理 rejection。
    const outcome = uploadFor(IN_FLIGHT_OBJECT, proxy.origin)(file, {
      signal: controller.signal,
      idempotencyKey: crypto.randomUUID(),
      setUploadId: (value) => { uploadId = value; },
      onProgress: () => {},
    }).then(
      (value) => ({ status: 'fulfilled' as const, value }),
      (error: unknown) => ({ status: 'rejected' as const, error }),
    );

    try {
      const snapshot = await proxy.barrier;
      // 屏障只代表首段已写入真实 Storage 上游连接且客户端请求体尚未结束；
      // 不代表 Storage 已解析或提交对象，也不依赖 sleep/超大文件。
      expect(snapshot.method).toBe('POST');
      expect(snapshot.path).toBe(expectedPath);
      expect(snapshot.authorizationMatches).toBe(true);
      expect(snapshot.forwardedBytes).toBeGreaterThan(0);
      expect(snapshot.forwardedBytes).toBeLessThan(file.size);
      expect(snapshot.bodyCompleteWhenPaused).toBe(false);
      expect(controller.signal.aborted).toBe(false);

      controller.abort();
      // 有界取消完成期限：严格短于固定 20s 传输超时。若取消信号未真正进入 fetch，
      // 这里必须失败，而不能靠 20s 固定超时让测试“看起来通过”。
      const cancellationDeadline = new Promise<never>((_resolve, reject) => {
        deadlineTimer = setTimeout(() => {
          reject(new Error(
            `In-flight cancellation did not settle within ${CANCEL_DEADLINE_MS}ms; `
            + `the fixed ${REQUEST_TIMEOUT_MS}ms transfer timeout must not stand in for cancellation`,
          ));
        }, CANCEL_DEADLINE_MS);
        deadlineTimer.unref?.();
      });
      const result = await Promise.race([outcome, cancellationDeadline]);
      expect(result.status).toBe('rejected');
      expect(controller.signal.aborted).toBe(true);
      expect(uploadId).toBe('');
      expect(uploadReferenceFor({ status: 'success', uploadId })).toBeUndefined();
    } finally {
      if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
      if (!controller.signal.aborted) controller.abort();
      // 收口：即使上面超时或断言失败，也必须等未决上传结算，不能让请求逃逸。
      await outcome;
      await proxy.close();
    }

    // service_role 独立回读：若真实 Storage 在连接中断后留下最终对象，必须如实报告
    // 并按最小已知 fixture 路径清理，不宣称原子回滚或所有失败均无残留。
    const remaining = await service().from(BUCKET).download(IN_FLIGHT_OBJECT);
    if (remaining.error === null) {
      const residualBytes = remaining.data === null
        ? 0
        : new Uint8Array(await (remaining.data as Blob).arrayBuffer()).byteLength;
      console.warn(`在途取消观察到服务端残留：${IN_FLIGHT_OBJECT}（${residualBytes} 字节），按精确 fixture 路径清理`);
      const removedResidual = await service().from(BUCKET).remove([IN_FLIGHT_OBJECT]);
      if (removedResidual.error !== null || removedResidual.data.length === 0) {
        throw new Error('In-flight cancellation residual cleanup failed');
      }
      throw new Error('在途取消后服务端仍留下最终对象；已如实报告并按精确 fixture 路径清理');
    }
    expectApiError(remaining.error, '404', 'NoSuchKey');
    expect(remaining.data).toBeNull();

    const listed = await service().from(BUCKET).list(RUN_DIR, { search: 'in-flight-cancelled.txt' });
    expect(listed.error).toBeNull();
    expect(listed.data ?? []).toEqual([]);
  });

  it('用户 B 与匿名身份不能读、覆盖或删除 A 的私有对象', async () => {
    // RLS 隐藏他人对象：读操作真实返回 NotFound，而不是泄露内容。
    const bRead = await (await asB()).from(BUCKET).download(A_OBJECT);
    expectApiError(bRead.error, '404', 'NoSuchKey');
    expect(bRead.data).toBeNull();

    const anonRead = await asAnon().from(BUCKET).download(A_OBJECT);
    expectApiError(anonRead.error, '404', 'NoSuchKey');
    expect(anonRead.data).toBeNull();

    // 覆盖被 RLS 拒绝：AccessDenied 而非静默成功。
    const bOverwrite = await (await asB()).from(BUCKET).upload(A_OBJECT, bytesOf('tampered-b'), { upsert: true });
    expectApiError(bOverwrite.error, '403', 'AccessDenied');
    const anonOverwrite = await asAnon().from(BUCKET).upload(A_OBJECT, bytesOf('tampered-anon'), { upsert: true });
    expectApiError(anonOverwrite.error, '403', 'AccessDenied');

    // 删除被 RLS 拦截：Storage API 对无权限删除返回空结果集而非错误，
    // 因此不能只看 error，必须确认没有对象被删除且 A 仍可读。
    const bRemove = await (await asB()).from(BUCKET).remove([A_OBJECT]);
    expect(bRemove.error).toBeNull();
    expect(bRemove.data).toEqual([]);
    const anonRemove = await asAnon().from(BUCKET).remove([A_OBJECT]);
    expect(anonRemove.error).toBeNull();
    expect(anonRemove.data).toEqual([]);

    // A 仍能读回原始字节，证明 B/anon 的操作未造成修改。
    expect(sameBytes(await readAs(asA, A_OBJECT), bytesOf(bodies.a))).toBe(true);
  });

  it('匿名身份不能为 A 的对象签发读取 URL，也不能创建任何对象', async () => {
    const anonSigned = await asAnon().from(BUCKET).createSignedUrl(A_OBJECT, 60);
    expect(anonSigned.error).not.toBeNull();
    expect(anonSigned.data ?? null).toBeNull();

    // 策略只授予 authenticated；anon 无匹配策略且没有用户 sub，因此不能新建对象。
    // 这是本栈的真实边界：不能拿“匿名能写自己的对象”当反向对照。
    const anonCreate = await asAnon().from(BUCKET).upload(ANON_OBJECT, bytesOf(bodies.anon), { contentType: 'text/plain' });
    expectApiError(anonCreate.error, '403', 'AccessDenied');
    expect(anonCreate.data).toBeNull();

    // 用 service_role 确认确实没有落库（而不是仅返回错误）。
    const listed = await service().from(BUCKET).list(RUN_DIR, { search: 'anon.txt' });
    expect(listed.error).toBeNull();
    expect(listed.data ?? []).toEqual([]);
  });

  it('B 不能为 A 的对象签发读取 URL，但能为自己的对象签发', async () => {
    const bSigned = await (await asB()).from(BUCKET).createSignedUrl(A_OBJECT, 60);
    expect(bSigned.error).not.toBeNull();
    expect(bSigned.data ?? null).toBeNull();

    const ownSigned = await (await asB()).from(BUCKET).createSignedUrl(B_OBJECT, 60);
    expect(ownSigned.error).toBeNull();
    expect((ownSigned.data?.signedUrl ?? '').length).toBeGreaterThan(0);
  });

  it('签名 URL 无 Authorization 可读回相同字节，且不进入持久化引用', async () => {
    const signed = await (await asA()).from(BUCKET).createSignedUrl(A_OBJECT, 60);
    expect(signed.error).toBeNull();
    const signedUrl = signed.data?.signedUrl ?? '';
    expect(signedUrl.length).toBeGreaterThan(0);

    // 真正用签名 URL 取字节：不带 Authorization，只断言布尔结果，失败不打印 URL。
    const loaded = await guardFetchFor(storageTarget?.origin ?? '')(signedUrl);
    expect(loaded.ok).toBe(true);
    const matchesOwner = sameBytes(new Uint8Array(await loaded.arrayBuffer()), bytesOf(bodies.a));
    expect(matchesOwner).toBe(true);

    // 引用只保留 uploadId：签名地址不得写入表单引用（失败只报告布尔值）。
    const serialized = JSON.stringify(uploadReferenceFor({ status: 'success', uploadId: state.uploadId }));
    expect(serialized.includes(signedUrl)).toBe(false);
    expect(serialized.includes('token=')).toBe(false);
  });

  it('取消回调先校验 uploadId 匹配再删除，未知 uploadId 不动原对象', async () => {
    const cancelledId = await uploadAs(asA, CANCELLED_OBJECT, bodies.cancelled);
    expect(cancelledId.length).toBeGreaterThan(0);

    // 回调只做真实操作：先用服务端列出的当前对象 id 校验目标，
    // 不匹配即失败且不删除；匹配时才删除并核对删除结果。
    const cancel: UploadCancelHandler = async (_file: File, cancellation) => {
      if (cancellation.uploadId !== cancelledId) throw new Error('cancel uploadId mismatch');
      const listed = await (await asA()).from(BUCKET).list(RUN_DIR, { search: 'cancelled.txt' });
      if (listed.error !== null) throw new Error('cancel list failed');
      const current = listed.data.find(entry => entry.name === 'cancelled.txt');
      // 同一已确认对象已经不存在时，重复清理是空操作；不接受其他 uploadId。
      if (current === undefined) return;
      if (current?.id !== cancellation.uploadId) throw new Error('cancel uploadId mismatch');
      const removed = await (await asA()).from(BUCKET).remove([CANCELLED_OBJECT]);
      if (removed.error !== null) throw new Error('cancel remove failed');
      if (removed.data.length !== 1) throw new Error('cancel removed no object');
      if ((removed.data[0]?.id ?? '') !== cancellation.uploadId) throw new Error('cancel removed another object');
    };

    // 未知 uploadId：拒绝且原对象仍可读。
    await expect(cancel(new File([bodies.cancelled], 'cancelled.txt'), {
      uploadId: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      reason: 'remove',
    })).rejects.toBeDefined();
    expect(sameBytes(await readAs(asA, CANCELLED_OBJECT), bytesOf(bodies.cancelled))).toBe(true);

    // 匹配 uploadId：真实删除。
    await cancel(new File([bodies.cancelled], 'cancelled.txt'), {
      uploadId: cancelledId,
      idempotencyKey: crypto.randomUUID(),
      reason: 'remove',
    });
    const gone = await (await asA()).from(BUCKET).download(CANCELLED_OBJECT);
    expectApiError(gone.error, '404', 'NoSuchKey');
    expect(gone.data).toBeNull();

    // 重复调用同一回调，并另外确认 Storage 的删除结果为空；不伪称 exactly-once。
    await cancel(new File([bodies.cancelled], 'cancelled.txt'), {
      uploadId: cancelledId,
      idempotencyKey: crypto.randomUUID(),
      reason: 'remove',
    });
    const again = await (await asA()).from(BUCKET).remove([CANCELLED_OBJECT]);
    expect(again.error).toBeNull();
    expect(again.data).toEqual([]);
  });

  it('真实刷新后上传回调使用新会话，退出后同一回调拒绝上传', async () => {
    const before = await userA.client.auth.getSession();
    const previousAccessToken = before.data.session?.access_token;
    if (!previousAccessToken || before.data.session?.refresh_token === undefined) {
      throw new Error('GoTrue session missing before refresh');
    }

    await Bun.sleep(1100);
    const refreshed = await userA.client.auth.refreshSession();
    expect(refreshed.error).toBeNull();
    expect(refreshed.data.session?.user.id).toBe(userA.id);
    const nextAccessToken = refreshed.data.session?.access_token ?? '';
    const nextRefreshToken = refreshed.data.session?.refresh_token;
    expect(nextAccessToken.length).toBeGreaterThan(0);
    expect(nextAccessToken).not.toBe(previousAccessToken);
    if (!nextRefreshToken) throw new Error('GoTrue refresh did not return a refresh token');

    const refreshedIdentity = await userA.provider.getIdentity();
    expect(refreshedIdentity?.id).toBe(userA.id);
    // 用布尔断言避免失败输出回显 token。
    expect(refreshedIdentity?.['token'] === nextAccessToken).toBe(true);

    // 不手动替换测试内缓存的 token：同一个回调实例每次从 Auth provider 取当前已验证会话。
    const uploadWithCurrentSession = uploadFor(REFRESHED_OBJECT);
    let refreshedUploadId = '';
    const refreshedOutcome = await uploadWithCurrentSession(new File([bodies.refreshed], 'refreshed.txt', {
      type: 'text/plain',
    }), {
      signal: new AbortController().signal,
      idempotencyKey: crypto.randomUUID(),
      setUploadId: (value) => { refreshedUploadId = value; },
      onProgress: () => {},
    });
    if (refreshedOutcome === undefined || typeof refreshedOutcome !== 'object') {
      throw new Error('refreshed upload callback returned no result object');
    }
    expect(refreshedOutcome.uploadId).toBe(refreshedUploadId);
    expect(refreshedUploadId.length).toBeGreaterThan(0);
    expect(sameBytes(await readAs(asA, REFRESHED_OBJECT), bytesOf(bodies.refreshed))).toBe(true);

    // 用刷新后的新会话访问刷新前上传的原对象。
    expect(sameBytes(await readAs(asA, A_OBJECT), bytesOf(bodies.a))).toBe(true);

    // 先移除刷新后上传的对象，确保登出后的拒绝断言针对“没有产生新对象”。
    const removedRefreshed = await service().from(BUCKET).remove([REFRESHED_OBJECT]);
    expect(removedRefreshed.error).toBeNull();
    expect(removedRefreshed.data).toHaveLength(1);

    const loggedOut = await userA.provider.logout();
    expect(loggedOut.success).toBe(true);
    expect((await userA.client.auth.getSession()).data.session).toBeNull();
    expect(await userA.provider.check()).toMatchObject({ authenticated: false, redirectTo: '/login' });

    // 登出后复用同一个回调实例：必须立即拒绝，不设置 uploadId，也不产生新对象。
    let loggedOutUploadId = '';
    await expect(uploadWithCurrentSession(new File([bodies.loggedOut], 'logged-out.txt', {
      type: 'text/plain',
    }), {
      signal: new AbortController().signal,
      idempotencyKey: crypto.randomUUID(),
      setUploadId: (value) => { loggedOutUploadId = value; },
      onProgress: () => {},
    })).rejects.toThrow();
    expect(loggedOutUploadId).toBe('');
    const loggedOutList = await service().from(BUCKET).list(RUN_DIR, { search: 'refreshed.txt' });
    expect(loggedOutList.error).toBeNull();
    expect(loggedOutList.data ?? []).toEqual([]);
    const loggedOutDownload = await service().from(BUCKET).download(REFRESHED_OBJECT);
    expectApiError(loggedOutDownload.error, '404', 'NoSuchKey');
    expect(loggedOutDownload.data).toBeNull();

    // 只证明旧 refresh token 不能重放、会话已不可用；旧 access token 仍可能在该
    // JWT 过期前被 Storage 接受，本轮不宣称登出会使旧 JWT 立即失效。
    const replay = authClientFor(`svadmin-auth-storage-replay-${crypto.randomUUID()}`);
    const restored = await replay.auth.refreshSession({ refresh_token: nextRefreshToken });
    expect(restored.data.session).toBeNull();
    expect(restored.error).not.toBeNull();
  });

  it('真实浏览器 FileUpload 经 GoTrue 会话完成上传、登出失败与重试', async () => {
    if (storageTarget === undefined || authTarget === undefined || !anonKey) {
      throw new Error('Browser acceptance target or anon key missing');
    }
    const browserUser = await registerBrowserUser();
    const objectRoot = `browser/${crypto.randomUUID()}`;
    const engines = requiredBrowserEngines();
    expect(engines).toEqual(['chromium', 'firefox', 'webkit']);
    for (const engine of engines) {
      const paths = browserObjectPaths(objectRoot, engine);
      BROWSER_FIXTURE_PATHS.push(paths.primary, paths.retry);
    }
    const primaryText = `svadmin-browser-primary-${crypto.randomUUID()}`;
    const retryText = `svadmin-browser-retry-${crypto.randomUUID()}`;
    const loggedOutChecks: string[] = [];

    const outcome = await runBrowserUploadAcceptance({
      authOrigin: authTarget.origin,
      storageOrigin: storageTarget.origin,
      anonKey,
      bucket: BUCKET,
      email: browserUser.email,
      password: browserUser.password,
      objectRoot,
      primaryText,
      retryText,
      // 在浏览器登出失败之后、重新登录之前，由 Node 侧 service role 独立确认 retry 不存在。
      afterLoggedOutFailure: async ({ engine, paths, uploadId }) => {
        expect(uploadId.length).toBeGreaterThan(0);
        const retryDir = paths.retry.slice(0, paths.retry.lastIndexOf('/'));
        const retryListed = await service().from(BUCKET).list(retryDir, { search: 'retry.txt' });
        expect(retryListed.error).toBeNull();
        expect(retryListed.data ?? []).toEqual([]);
        const retryDownload = await service().from(BUCKET).download(paths.retry);
        expectApiError(retryDownload.error, '404', 'NoSuchKey');
        expect(retryDownload.data).toBeNull();
        loggedOutChecks.push(engine);
      },
    });
    expect(outcome.engines.map(result => result.engine)).toEqual(engines);
    expect(loggedOutChecks).toEqual(engines);

    // 浏览器流程结束后，owner 重新登录取得独立会话，与 service role 分别回读对象字节。
    const browserOwner = await loginBrowserOwner(browserUser.email, browserUser.password);
    const ownerClient = storageClientFor(await verifiedToken(browserOwner));
    for (const result of outcome.engines) {
      const servicePrimary = await service().from(BUCKET).download(result.paths.primary);
      expect(servicePrimary.error).toBeNull();
      expect(sameBytes(
        new Uint8Array(await (servicePrimary.data as Blob).arrayBuffer()), bytesOf(primaryText),
      )).toBe(true);
      const serviceRetry = await service().from(BUCKET).download(result.paths.retry);
      expect(serviceRetry.error).toBeNull();
      expect(sameBytes(
        new Uint8Array(await (serviceRetry.data as Blob).arrayBuffer()), bytesOf(retryText),
      )).toBe(true);

      expect(sameBytes(await readAs(async () => ownerClient, result.paths.primary), bytesOf(primaryText))).toBe(true);
      expect(sameBytes(await readAs(async () => ownerClient, result.paths.retry), bytesOf(retryText))).toBe(true);

      const retryDir = result.paths.retry.slice(0, result.paths.retry.lastIndexOf('/'));
      const listed = await service().from(BUCKET).list(retryDir);
      expect(listed.error).toBeNull();
      const entries = listed.data ?? [];
      expect(entries.map(entry => entry.name).sort()).toEqual(['primary.txt', 'retry.txt']);
      const primaryEntry = entries.find(entry => entry.name === 'primary.txt');
      const retryEntry = entries.find(entry => entry.name === 'retry.txt');
      if (primaryEntry === undefined || retryEntry === undefined) {
        throw new Error('Browser acceptance directory is missing a final object');
      }
      const primaryUploadId = result.reference['uploadId'];
      const retryUploadId = result.retryReference['uploadId'];
      if (primaryUploadId === undefined || retryUploadId === undefined) {
        throw new Error('Browser acceptance reference is missing an uploadId');
      }
      // 实际对象 id 必须等于 UI JSON 引用中的 uploadId。
      expect(primaryEntry.id).toBe(primaryUploadId);
      expect(retryEntry.id).toBe(retryUploadId);
    }
  }, 120_000);

  it('真实浏览器 AutoForm/FileUploadField 提交精确引用、失败阻止保存且重新登录后可重试保存', async () => {
    if (storageTarget === undefined || authTarget === undefined || !anonKey) {
      throw new Error('AutoForm browser acceptance target or anon key missing');
    }
    const browserUser = await registerBrowserUser();
    const objectRoot = `autoform/${crypto.randomUUID()}`;
    const engines = requiredBrowserEngines();
    expect(engines).toEqual(['chromium', 'firefox', 'webkit']);
    for (const engine of engines) {
      const paths = browserObjectPaths(objectRoot, engine);
      BROWSER_FIXTURE_PATHS.push(paths.primary, paths.retry);
    }
    const primaryText = `svadmin-autoform-primary-${crypto.randomUUID()}`;
    const retryText = `svadmin-autoform-retry-${crypto.randomUUID()}`;
    const loggedOutChecks: string[] = [];

    const outcome = await runBrowserAutoFormUploadAcceptance({
      authOrigin: authTarget.origin,
      storageOrigin: storageTarget.origin,
      anonKey,
      bucket: BUCKET,
      email: browserUser.email,
      password: browserUser.password,
      objectRoot,
      primaryText,
      retryText,
      // 登出失败之后、重新登录之前，Node 侧用 service role 独立确认 retry 不存在。
      afterLoggedOutFailure: async ({ engine, paths, uploadId }) => {
        expect(uploadId.length).toBeGreaterThan(0);
        const retryDir = paths.retry.slice(0, paths.retry.lastIndexOf('/'));
        const retryListed = await service().from(BUCKET).list(retryDir, { search: 'retry.txt' });
        expect(retryListed.error).toBeNull();
        expect(retryListed.data ?? []).toEqual([]);
        const retryDownload = await service().from(BUCKET).download(paths.retry);
        expectApiError(retryDownload.error, '404', 'NoSuchKey');
        expect(retryDownload.data).toBeNull();
        loggedOutChecks.push(engine);
      },
    });
    expect(outcome.engines.map(result => result.engine)).toEqual(engines);
    expect(loggedOutChecks).toEqual(engines);

    // 浏览器流程结束后，owner 重新登录取得独立会话，与 service role 分别回读对象字节。
    const browserOwner = await loginBrowserOwner(browserUser.email, browserUser.password);
    const ownerClient = storageClientFor(await verifiedToken(browserOwner));
    for (const result of outcome.engines) {
      const servicePrimary = await service().from(BUCKET).download(result.paths.primary);
      expect(servicePrimary.error).toBeNull();
      expect(sameBytes(
        new Uint8Array(await (servicePrimary.data as Blob).arrayBuffer()), bytesOf(primaryText),
      )).toBe(true);
      const serviceRetry = await service().from(BUCKET).download(result.paths.retry);
      expect(serviceRetry.error).toBeNull();
      expect(sameBytes(
        new Uint8Array(await (serviceRetry.data as Blob).arrayBuffer()), bytesOf(retryText),
      )).toBe(true);

      expect(sameBytes(await readAs(async () => ownerClient, result.paths.primary), bytesOf(primaryText))).toBe(true);
      expect(sameBytes(await readAs(async () => ownerClient, result.paths.retry), bytesOf(retryText))).toBe(true);

      const retryDir = result.paths.retry.slice(0, result.paths.retry.lastIndexOf('/'));
      const listed = await service().from(BUCKET).list(retryDir);
      expect(listed.error).toBeNull();
      const entries = listed.data ?? [];
      expect(entries.map(entry => entry.name).sort()).toEqual(['primary.txt', 'retry.txt']);
      const primaryEntry = entries.find(entry => entry.name === 'primary.txt');
      const retryEntry = entries.find(entry => entry.name === 'retry.txt');
      if (primaryEntry === undefined || retryEntry === undefined) {
        throw new Error('AutoForm browser acceptance directory is missing a final object');
      }
      const primaryUploadId = result.reference['uploadId'];
      const retryUploadId = result.retryReference['uploadId'];
      if (primaryUploadId === undefined || retryUploadId === undefined) {
        throw new Error('AutoForm browser acceptance reference is missing an uploadId');
      }
      // 实际对象 id 必须等于 AutoForm 提交 JSON 中的 uploadId。
      expect(primaryEntry.id).toBe(primaryUploadId);
      expect(retryEntry.id).toBe(retryUploadId);
    }
  }, 180_000);

  it('真实 GoTrue 会话经 data provider 完成 PostgREST/PostgreSQL 租户 CRUD 与隔离', async () => {
    assertFixtureModuleIsolation();
    if (authTarget === undefined || !serviceKey) throw new Error('GoTrue admin target or service role key missing');
    const resource = 'tenant_records';

    // service_role 只用于 Node 侧可信种子：把租户写入 app_metadata。
    // 普通 CRUD 请求始终使用真实 GoTrue 会话，不使用 service_role。
    const admin = createClient(authTarget.origin, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: guardFetchFor(authTarget.origin, { authPrefix: true }) },
    });
    const assignTenant = async (identity: LocalIdentity, tenantId: string): Promise<void> => {
      const assigned = await admin.auth.admin.updateUserById(identity.id, {
        app_metadata: { tenant_id: tenantId },
      });
      if (assigned.error !== null) throw new Error('Trusted tenant assignment failed');
      if (assigned.data.user?.app_metadata?.['tenant_id'] !== tenantId) {
        throw new Error('Trusted tenant assignment did not persist');
      }
    };
    const relogin = async (identity: LocalIdentity): Promise<void> => {
      const result = await identity.provider.login({ email: identity.email, password: identity.password });
      expect(result.success).toBe(true);
    };

    await assignTenant(userA, 'tenant-a');
    await assignTenant(userB, 'tenant-b');
    // 重新登录以取得含最新 app_metadata 的真实 GoTrue token。
    await relogin(userA);
    await relogin(userB);

    const aTokenPayload = jwtPayload(await verifiedToken(userA));
    const bTokenPayload = jwtPayload(await verifiedToken(userB));
    expect(aTokenPayload['app_metadata']).toMatchObject({ tenant_id: 'tenant-a' });
    expect(bTokenPayload['app_metadata']).toMatchObject({ tenant_id: 'tenant-b' });

    const anonymous = tenantProviderFor(null);
    await expect(anonymous.getList({ resource })).rejects.toThrow();

    const a = tenantProviderFor(userA);
    const b = tenantProviderFor(userB);
    const title = `tenant-a-${crypto.randomUUID()}`;
    const updatedTitle = `tenant-a-updated-${crypto.randomUUID()}`;
    const created = await a.create({
      resource,
      variables: { tenant_id: 'tenant-a', title },
    });
    const createdId = created.data['id'];
    if (typeof createdId !== 'string') throw new Error('Tenant record create did not return a string id');
    expect(created.data['tenant_id']).toBe('tenant-a');
    expect(created.data['title']).toBe(title);
    expect(created.data['version']).toBe(1);

    // A 的独立 GoTrue 会话必须能读回 create 真实持久化值。
    const userAIndependent = await loginBrowserOwner(userA.email, userA.password);
    const independent = tenantProviderFor(userAIndependent);
    const createdReadBack = await independent.getOne({ resource, id: createdId });
    expect(createdReadBack.data['tenant_id']).toBe('tenant-a');
    expect(createdReadBack.data['title']).toBe(title);
    expect(createdReadBack.data['version']).toBe(1);

    const updated = await a.update({
      resource,
      id: createdId,
      variables: { title: updatedTitle, version: 2 },
    });
    expect(updated.data['title']).toBe(updatedTitle);
    expect(updated.data['version']).toBe(2);
    const updatedReadBack = await independent.getOne({ resource, id: createdId });
    expect(updatedReadBack.data['title']).toBe(updatedTitle);
    expect(updatedReadBack.data['version']).toBe(2);

    // 当前租户本人也不能把自己的记录改挂到另一租户；WITH CHECK 必须拒绝，
    // 且独立会话读回的原记录保持不变。
    await expect(a.update({
      resource,
      id: createdId,
      variables: { tenant_id: 'tenant-b' },
    })).rejects.toThrow();
    const afterOwnTenantChange = await independent.getOne({ resource, id: createdId });
    expect(afterOwnTenantChange.data['tenant_id']).toBe('tenant-a');
    expect(afterOwnTenantChange.data['title']).toBe(updatedTitle);
    expect(afterOwnTenantChange.data['version']).toBe(2);

    // B 在自己的租户可见自己的记录，但 A 看不到 B 的记录。
    const bTitle = `tenant-b-${crypto.randomUUID()}`;
    const bCreated = await b.create({
      resource,
      variables: { tenant_id: 'tenant-b', title: bTitle },
    });
    const bCreatedId = bCreated.data['id'];
    if (typeof bCreatedId !== 'string') throw new Error('Tenant B record create did not return a string id');
    expect(bCreated.data['tenant_id']).toBe('tenant-b');
    const aOnB = await a.getList({
      resource,
      filters: [{ field: 'id', operator: 'eq', value: bCreatedId }],
    });
    expect(aOnB.data).toEqual([]);
    await expect(a.getOne({ resource, id: bCreatedId })).rejects.toThrow();

    // B 对 A 记录的 get/insert/update/delete 全部拒绝。
    await expect(b.getOne({ resource, id: createdId })).rejects.toThrow();
    await expect(b.create({
      resource,
      variables: { tenant_id: 'tenant-a', title: 'cross-tenant insert' },
    })).rejects.toThrow();
    await expect(b.update({
      resource,
      id: createdId,
      variables: { title: 'cross-tenant update', version: 3 },
    })).rejects.toThrow();
    await expect(b.deleteOne({ resource, id: createdId })).rejects.toThrow();
    const bOnA = await b.getList({
      resource,
      filters: [{ field: 'id', operator: 'eq', value: createdId }],
    });
    expect(bOnA.data).toEqual([]);

    // A 的记录未被 B 的跨租户操作修改。
    const unchanged = await independent.getOne({ resource, id: createdId });
    expect(unchanged.data['title']).toBe(updatedTitle);
    expect(unchanged.data['version']).toBe(2);

    // 用户可自行编辑 user_metadata；RLS 必须继续只信任 app_metadata。
    const forged = await userB.client.auth.updateUser({ data: { tenant_id: 'tenant-a' } });
    expect(forged.error).toBeNull();
    const refreshedB = await userB.client.auth.refreshSession();
    expect(refreshedB.error).toBeNull();
    expect(refreshedB.data.session?.user.id).toBe(userB.id);
    const forgedPayload = jwtPayload(await verifiedToken(userB));
    expect(forgedPayload['app_metadata']).toMatchObject({ tenant_id: 'tenant-b' });
    expect(forgedPayload['user_metadata']).toMatchObject({ tenant_id: 'tenant-a' });

    await expect(b.getOne({ resource, id: createdId })).rejects.toThrow();
    await expect(b.create({
      resource,
      variables: { tenant_id: 'tenant-a', title: 'forged user_metadata insert' },
    })).rejects.toThrow();
    await expect(b.update({
      resource,
      id: createdId,
      variables: { title: 'forged user_metadata update', version: 3 },
    })).rejects.toThrow();
    await expect(b.deleteOne({ resource, id: createdId })).rejects.toThrow();
    const forgedOnA = await b.getList({
      resource,
      filters: [{ field: 'tenant_id', operator: 'eq', value: 'tenant-a' }],
    });
    expect(forgedOnA.data).toEqual([]);
    const forgedUnchanged = await independent.getOne({ resource, id: createdId });
    expect(forgedUnchanged.data['tenant_id']).toBe('tenant-a');
    expect(forgedUnchanged.data['title']).toBe(updatedTitle);
    expect(forgedUnchanged.data['version']).toBe(2);

    // 伪造 user_metadata 不影响 B 对自己租户记录的合法 CRUD。
    const bUpdatedTitle = `tenant-b-updated-${crypto.randomUUID()}`;
    const bUpdated = await b.update({
      resource,
      id: bCreatedId,
      variables: { title: bUpdatedTitle, version: 2 },
    });
    expect(bUpdated.data['tenant_id']).toBe('tenant-b');
    expect(bUpdated.data['title']).toBe(bUpdatedTitle);
    expect(bUpdated.data['version']).toBe(2);
    const bUpdatedReadBack = await b.getOne({ resource, id: bCreatedId });
    expect(bUpdatedReadBack.data['tenant_id']).toBe('tenant-b');
    expect(bUpdatedReadBack.data['title']).toBe(bUpdatedTitle);
    expect(bUpdatedReadBack.data['version']).toBe(2);

    // B 清理自己的记录后，A 删除自己的记录；独立会话必须读不到。
    await b.deleteOne({ resource, id: bCreatedId });
    await a.deleteOne({ resource, id: createdId });
    await expect(independent.getOne({ resource, id: createdId })).rejects.toThrow();
    const afterDelete = await independent.getList({
      resource,
      filters: [{ field: 'id', operator: 'eq', value: createdId }],
    });
    expect(afterDelete.data).toEqual([]);
  }, 120_000);

  it('真实浏览器 AutoForm 经 data provider 持久化、重新编辑并由独立会话读回，另一租户不可见', async () => {
    if (authTarget === undefined || restTarget === undefined || !anonKey || !serviceKey) {
      throw new Error('AutoForm record browser acceptance target or key missing');
    }
    const resource = 'browser_records';
    const browserUserA = await registerBrowserUser();
    const browserUserB = await registerBrowserUser();
    const tenantA = `browser-a-${crypto.randomUUID()}`;
    const tenantB = `browser-b-${crypto.randomUUID()}`;

    // service_role 只在 Node 侧把可信租户写进 app_metadata，永不进入浏览器。
    const admin = createClient(authTarget.origin, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: guardFetchFor(authTarget.origin, { authPrefix: true }) },
    });
    const assignTenant = async (userId: string, tenantId: string): Promise<void> => {
      const assigned = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { tenant_id: tenantId },
      });
      if (assigned.error !== null || assigned.data.user?.app_metadata?.['tenant_id'] !== tenantId) {
        throw new Error('Trusted browser tenant assignment failed');
      }
    };
    await assignTenant(browserUserA.id, tenantA);
    await assignTenant(browserUserB.id, tenantB);

    // 独立 GoTrue 会话用于 Node 侧读回；与浏览器 context 完全分离。
    const browserOwnerA = await loginBrowserOwner(browserUserA.email, browserUserA.password);
    const browserOwnerB = await loginBrowserOwner(browserUserB.email, browserUserB.password);
    const independentA = tenantProviderFor(browserOwnerA);
    const independentB = tenantProviderFor(browserOwnerB);
    const ownerClientA = storageClientFor(await verifiedToken(browserOwnerA));

    const objectRoot = `autoform-records/${crypto.randomUUID()}`;
    const primaryText = `svadmin-autoform-record-${crypto.randomUUID()}`;
    const titlePrefix = `browser-record-${crypto.randomUUID()}`;
    const updatedTitlePrefix = `browser-record-updated-${crypto.randomUUID()}`;
    const engines = requiredBrowserEngines();
    expect(engines).toEqual(['chromium', 'firefox', 'webkit']);
    for (const engine of engines) BROWSER_FIXTURE_PATHS.push(browserObjectPaths(objectRoot, engine).primary);

    const createdChecks: string[] = [];
    const updatedChecks: string[] = [];
    const attachmentUploadId = (row: Record<string, unknown>): string => {
      const attachment = row['attachment'];
      if (typeof attachment !== 'object' || attachment === null || Array.isArray(attachment)) {
        throw new Error('Persisted browser record attachment is not an object reference');
      }
      const uploadId = (attachment as Record<string, unknown>)['uploadId'];
      if (typeof uploadId !== 'string' || uploadId.length === 0) {
        throw new Error('Persisted browser record attachment is missing a non-empty uploadId');
      }
      return uploadId;
    };

    // 关联证明：持久化 attachment 必须精确为 { uploadId }，service role 列举该
    // 引擎目录只能看到 primary.txt 且实际对象 id 等于持久化 uploadId；owner 与
    // service_role 再分别读回同一文件真实字节。
    const assertPersistedAttachment = async (
      engine: string,
      paths: { primary: string; retry: string },
      row: Record<string, unknown>,
      uploadId: string,
    ): Promise<void> => {
      expect(row['attachment']).toEqual({ uploadId });
      expect(attachmentUploadId(row)).toBe(uploadId);
      const directory = paths.primary.slice(0, paths.primary.lastIndexOf('/'));
      const listed = await service().from(BUCKET).list(directory);
      expect(listed.error).toBeNull();
      const entries = listed.data ?? [];
      expect(entries.map(entry => entry.name).sort()).toEqual(['primary.txt']);
      const entry = entries[0];
      if (entry === undefined) throw new Error(`${engine} persisted attachment directory is empty`);
      expect(entry.name).toBe('primary.txt');
      expect(entry.id).toBe(uploadId);

      const servicePrimary = await service().from(BUCKET).download(paths.primary);
      expect(servicePrimary.error).toBeNull();
      expect(sameBytes(
        new Uint8Array(await (servicePrimary.data as Blob).arrayBuffer()), bytesOf(primaryText),
      )).toBe(true);
      expect(sameBytes(await readAs(async () => ownerClientA, paths.primary), bytesOf(primaryText))).toBe(true);
    };

    const outcome = await runBrowserAutoFormRecordAcceptance({
      authOrigin: authTarget.origin,
      storageOrigin: storageTarget?.origin ?? '',
      restOrigin: restTarget.origin,
      anonKey,
      bucket: BUCKET,
      email: browserUserA.email,
      password: browserUserA.password,
      otherEmail: browserUserB.email,
      otherPassword: browserUserB.password,
      objectRoot,
      titlePrefix,
      updatedTitlePrefix,
      primaryText,
      afterCreated: async ({ engine, paths, title }) => {
        const listed = await independentA.getList({
          resource,
          filters: [{ field: 'title', operator: 'eq', value: title }],
        });
        expect(listed.data).toHaveLength(1);
        const row = listed.data[0];
        if (row === undefined) throw new Error('Created browser record was not persisted');
        expect(row['tenant_id']).toBe(tenantA);
        expect(row['title']).toBe(title);
        const rowId = row['id'];
        if (typeof rowId !== 'string') throw new Error('Created browser record has no string id');
        const uploadId = attachmentUploadId(row);
        await assertPersistedAttachment(engine, paths, row, uploadId);
        createdChecks.push(engine);
        return { rowId, uploadId };
      },
      afterUpdated: async ({ engine, paths, title, rowId, uploadId }) => {
        const readBack = await independentA.getOne({ resource, id: rowId });
        expect(readBack.data['tenant_id']).toBe(tenantA);
        expect(readBack.data['title']).toBe(title);
        await assertPersistedAttachment(engine, paths, readBack.data, uploadId);
        updatedChecks.push(engine);
      },
    });
    expect(outcome.engines.map(result => result.engine)).toEqual(engines);
    expect(createdChecks).toEqual(engines);
    expect(updatedChecks).toEqual(engines);

    // B 的独立 Node 会话也不能读取 A 的行；随后 A 清理自己创建的验收行。
    for (const result of outcome.engines) {
      const bList = await independentB.getList({
        resource,
        filters: [{ field: 'id', operator: 'eq', value: result.rowId }],
      });
      expect(bList.data).toEqual([]);
      await expect(independentB.getOne({ resource, id: result.rowId })).rejects.toThrow();

      const finalRow = await independentA.getOne({ resource, id: result.rowId });
      expect(finalRow.data['title']).toBe(result.title);
      await assertPersistedAttachment(result.engine, result.paths, finalRow.data, result.uploadId);
      await independentA.deleteOne({ resource, id: result.rowId });
      await expect(independentA.getOne({ resource, id: result.rowId })).rejects.toThrow();
    }
  }, 240_000);

  it('真实 ResourceOperationsPage/AutoTable 查询、详情、快速编辑拒绝保留草稿并修正保存', async () => {
    if (authTarget === undefined || restTarget === undefined || storageTarget === undefined || !anonKey || !serviceKey) {
      throw new Error('Resource workspace browser acceptance target or key missing');
    }
    const resource = 'browser_records';
    const invalidTitle = 'svadmin-acceptance-invalid-title-sentinel';
    const browserUserA = await registerBrowserUser();
    const browserUserB = await registerBrowserUser();
    const tenantA = `workspace-a-${crypto.randomUUID()}`;
    const tenantB = `workspace-b-${crypto.randomUUID()}`;
    const admin = createClient(authTarget.origin, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: guardFetchFor(authTarget.origin, { authPrefix: true }) },
    });
    const assignTenant = async (userId: string, tenantId: string): Promise<void> => {
      const assigned = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { tenant_id: tenantId },
      });
      if (assigned.error !== null || assigned.data.user?.app_metadata?.['tenant_id'] !== tenantId) {
        throw new Error('Trusted workspace tenant assignment failed');
      }
    };
    await assignTenant(browserUserA.id, tenantA);
    await assignTenant(browserUserB.id, tenantB);

    // 播种与独立读回都使用真实用户会话；service role 只分配可信租户。
    const browserOwnerA = await loginBrowserOwner(browserUserA.email, browserUserA.password);
    const browserOwnerB = await loginBrowserOwner(browserUserB.email, browserUserB.password);
    const independentA = tenantProviderFor(browserOwnerA);
    const independentB = tenantProviderFor(browserOwnerB);
    const engines = requiredBrowserEngines();
    expect(engines).toEqual(['chromium', 'firefox', 'webkit']);
    const titlePrefix = `workspace-${crypto.randomUUID()}`;
    const seeded: Array<{ id: string; title: string; engine: string }> = [];
    for (const engine of engines) {
      const searchText = `${titlePrefix}-${engine}`;
      for (let index = 1; index <= 12; index += 1) {
        const title = `${searchText} item ${String(index).padStart(2, '0')}`;
        const created = await independentA.create({ resource, variables: { title } });
        const id = created.data['id'];
        if (typeof id !== 'string') throw new Error('Workspace seed did not return a string id');
        expect(created.data['tenant_id']).toBe(tenantA);
        expect(created.data['title']).toBe(title);
        seeded.push({ id, title, engine });
      }
    }

    const failedChecks: string[] = [];
    const savedChecks: string[] = [];
    const patchCode = (body: unknown): string | undefined => {
      if (typeof body !== 'object' || body === null || Array.isArray(body)) return undefined;
      const code = (body as Record<string, unknown>)['code'];
      return typeof code === 'string' ? code : undefined;
    };

    const outcome = await runBrowserResourceWorkspaceAcceptance({
      authOrigin: authTarget.origin,
      storageOrigin: storageTarget.origin,
      restOrigin: restTarget.origin,
      anonKey,
      bucket: BUCKET,
      email: browserUserA.email,
      password: browserUserA.password,
      otherEmail: browserUserB.email,
      otherPassword: browserUserB.password,
      objectRoot: `workspace/${crypto.randomUUID()}`,
      titlePrefix,
      invalidTitle,
      tenantId: tenantA,
      afterFailed: async ({ engine, rowId, originalTitle, tenantId, patch }) => {
        if (patch.status === null) throw new Error('Failed PATCH had no response');
        expect(patch.status < 200 || patch.status >= 300).toBe(true);
        expect(patchCode(patch.body)).toBe('23514');
        const unchanged = await independentA.getOne({ resource, id: rowId });
        expect(unchanged.data['tenant_id']).toBe(tenantId);
        expect(unchanged.data['title']).toBe(originalTitle);
        failedChecks.push(engine);
      },
      afterSaved: async ({ engine, rowId, updatedTitle, tenantId, patch }) => {
        if (patch.status === null) throw new Error('Saved PATCH had no response');
        expect(patch.status).toBeGreaterThanOrEqual(200);
        expect(patch.status).toBeLessThan(300);
        const saved = await independentA.getOne({ resource, id: rowId });
        expect(saved.data['tenant_id']).toBe(tenantId);
        expect(saved.data['title']).toBe(updatedTitle);
        savedChecks.push(engine);
      },
    });
    expect(outcome.engines.map(result => result.engine)).toEqual(engines);
    expect(failedChecks).toEqual(engines);
    expect(savedChecks).toEqual(engines);

    for (const result of outcome.engines) {
      expect(result.patches).toHaveLength(2);
      const failed = result.patches[0];
      const saved = result.patches[1];
      if (failed === undefined || saved === undefined) throw new Error('Workspace PATCH captures are incomplete');
      if (failed.status === null || saved.status === null) throw new Error('Workspace PATCH response missing');
      expect(failed.requestParseError).toBeNull();
      expect(saved.requestParseError).toBeNull();
      expect(new URL(failed.url).searchParams.get('id')).toBe(`eq.${result.rowId}`);
      expect(new URL(saved.url).searchParams.get('id')).toBe(`eq.${result.rowId}`);
      expect(failed.requestBody).toEqual({ title: invalidTitle });
      expect(saved.requestBody).toEqual({ title: result.updatedTitle });
      expect(failed.status < 200 || failed.status >= 300).toBe(true);
      expect(failed.responseParseError).toBeNull();
      expect(patchCode(failed.body)).toBe('23514');
      expect(saved.status).toBeGreaterThanOrEqual(200);
      expect(saved.status).toBeLessThan(300);
      expect(saved.responseParseError).toBeNull();
      if (!Array.isArray(saved.body) || saved.body.length !== 1) {
        throw new Error('Successful PATCH response is not exactly one JSON row');
      }
      const savedRow = saved.body[0];
      if (typeof savedRow !== 'object' || savedRow === null || Array.isArray(savedRow)) {
        throw new Error('Successful PATCH response row is not an object');
      }
      expect(savedRow['id']).toBe(result.rowId);
      expect(savedRow['title']).toBe(result.updatedTitle);
      expect(savedRow['tenant_id']).toBe(tenantA);
      expect(result.listCaptureErrors).toEqual([]);
      expect(result.unexpectedWrites).toBe(0);

      const pageTwoUrl = new URL(result.pageTwoList.url);
      expect(result.pageTwoList.parseError).toBeNull();
      expect(pageTwoUrl.searchParams.get('title')).toBe(`ilike.%${result.searchText}%`);
      expect(pageTwoUrl.searchParams.get('limit')).toBe('10');
      expect(pageTwoUrl.searchParams.get('offset')).toBe('10');
      expect(pageTwoUrl.searchParams.get('order')).toBe('title.asc');
      expect(result.pageTwoList.total).toBe(12);
      expect(result.pageTwoList.data).toHaveLength(2);
      const pageTwoTitles = result.pageTwoList.data.flatMap(row => (
        typeof row === 'object' && row !== null && typeof (row as Record<string, unknown>)['title'] === 'string'
          ? [(row as Record<string, unknown>)['title']] : []
      ));
      expect(pageTwoTitles).toContain(result.targetTitle);
      expect(pageTwoTitles).toContain(`${result.searchText} item 12`);

      const detailUrl = new URL(result.detail.url);
      expect(detailUrl.searchParams.get('id')).toBe(`eq.${result.rowId}`);
      expect(result.detail.status).toBeGreaterThanOrEqual(200);
      expect(result.detail.status).toBeLessThan(300);
      expect(result.detail.rowId).toBe(result.rowId);
      expect(result.detail.title).toBe(result.targetTitle);
      expect(result.detail.tenantId).toBe(tenantA);
      const refreshedUrl = new URL(result.refreshedList.url);
      expect(result.refreshedList.parseError).toBeNull();
      expect(refreshedUrl.searchParams.get('title')).toBe(`ilike.%${result.searchText}%`);
      expect(refreshedUrl.searchParams.get('limit')).toBe('10');
      expect(refreshedUrl.searchParams.get('offset')).toBe('10');
      expect(refreshedUrl.searchParams.get('order')).toBe('title.asc');
      const refreshedTitles = result.refreshedList.data.flatMap(row => (
        typeof row === 'object' && row !== null && typeof (row as Record<string, unknown>)['title'] === 'string'
          ? [(row as Record<string, unknown>)['title']] : []
      ));
      expect(refreshedTitles).toContain(result.updatedTitle);
      expect(result.otherTenantWrites).toBe(0);
      const otherList = result.otherTenantLists.at(-1);
      if (otherList === undefined) throw new Error('Other-tenant workspace list capture missing');
      expect(otherList.status).toBeGreaterThanOrEqual(200);
      expect(otherList.status).toBeLessThan(300);
      expect(otherList.parseError).toBeNull();
      expect(otherList.data).toEqual([]);
      expect(otherList.total).toBe(0);
      expect(result.otherListCaptureErrors).toEqual([]);
    }

    const bRows = await independentB.getList({ resource });
    expect(bRows.data).toEqual([]);

    // 正常路径由 A 的真实会话清理自己播种的行；runner down -v 仍是失败兜底。
    for (const row of seeded) {
      await independentA.deleteOne({ resource, id: row.id });
      await expect(independentA.getOne({ resource, id: row.id })).rejects.toThrow();
    }
  }, 300_000);

  afterAll(async () => {
    // service_role 只负责最终清理，不参与权限断言。
    // 只按已知精确 fixture 路径清理（list 根目录会漏掉 owner/ 子目录）；
    // 这里不注入清理失败；真正的兜底是 runner 的 down -v。
    const removed = await service().from(BUCKET).remove([...FIXTURE_PATHS, ...BROWSER_FIXTURE_PATHS]);
    if (removed.error !== null) throw new Error('fixture object cleanup incomplete');
    const deleted = await service().deleteBucket(BUCKET);
    if (deleted.error !== null) throw new Error('fixture bucket cleanup incomplete');
    console.info(MARKER);
  });
});
