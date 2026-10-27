import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import type { IncomingMessage } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'bun:test';
import { chromium, firefox, webkit, type Browser, type BrowserType, type Locator } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const browserRoot = fileURLToPath(new URL('.', import.meta.url));
const WAIT_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 50;
const PROXY_TIMEOUT_MS = 20_000;
const PROXY_BODY_TIMEOUT_MS = 10_000;
// fixture 的 FileUpload maxSize 为 1 MiB；为 multipart 边界、缓存字段与小请求头留固定裕量。
const MAX_PROXY_BODY_BYTES = 1024 * 1024 + 64 * 1024;

export type BrowserEngine = 'chromium' | 'firefox' | 'webkit';

const ENGINE_TYPES: Array<{ name: BrowserEngine; type: BrowserType }> = [
  { name: 'chromium', type: chromium },
  { name: 'firefox', type: firefox },
  { name: 'webkit', type: webkit },
];
const REQUIRED_BROWSER_ENGINES: readonly BrowserEngine[] = ['chromium', 'firefox', 'webkit'];

// 本机三种引擎均已具备时，本轮 contract 要求全部运行，不动态缩减。
export function requiredBrowserEngines(): BrowserEngine[] {
  return [...REQUIRED_BROWSER_ENGINES];
}

// 只报告本机已经安装、且 executablePath 实际存在的浏览器；不下载、不修改系统。
export function availableBrowserEngines(): BrowserEngine[] {
  return ENGINE_TYPES.filter(entry => {
    try { return existsSync(entry.type.executablePath()); } catch { return false; }
  }).map(entry => entry.name);
}

export interface BrowserObjectPaths {
  primary: string;
  retry: string;
}

export function browserObjectPaths(objectRoot: string, engine: BrowserEngine): BrowserObjectPaths {
  return {
    primary: `${objectRoot}/${engine}/primary.txt`,
    retry: `${objectRoot}/${engine}/retry.txt`,
  };
}

export interface BrowserAcceptanceInput {
  authOrigin: string;
  storageOrigin: string;
  anonKey: string;
  bucket: string;
  email: string;
  password: string;
  objectRoot: string;
  primaryText: string;
  retryText: string;
  afterLoggedOutFailure?: (checkpoint: BrowserLoggedOutCheckpoint) => Promise<void>;
}

export interface BrowserLoggedOutCheckpoint {
  engine: BrowserEngine;
  paths: BrowserObjectPaths;
  uploadId: string;
  reference: Record<string, string>;
}

export interface BrowserEngineResult {
  engine: BrowserEngine;
  paths: BrowserObjectPaths;
  uploadId: string;
  retryUploadId: string;
  reference: Record<string, string>;
  retryReference: Record<string, string>;
}

export interface BrowserAcceptanceResult {
  engines: BrowserEngineResult[];
}

export interface AutoFormBrowserEngineResult {
  engine: BrowserEngine;
  paths: BrowserObjectPaths;
  reference: Record<string, string>;
  retryReference: Record<string, string>;
}

export interface AutoFormBrowserAcceptanceResult {
  engines: AutoFormBrowserEngineResult[];
}

export interface AutoFormRecordCreatedCheckpoint {
  engine: BrowserEngine;
  paths: BrowserObjectPaths;
  title: string;
}

export interface AutoFormRecordUpdatedCheckpoint {
  engine: BrowserEngine;
  paths: BrowserObjectPaths;
  title: string;
  rowId: string;
  uploadId: string;
}

export interface AutoFormRecordBrowserAcceptanceInput {
  authOrigin: string;
  storageOrigin: string;
  restOrigin: string;
  anonKey: string;
  bucket: string;
  email: string;
  password: string;
  otherEmail: string;
  otherPassword: string;
  objectRoot: string;
  titlePrefix: string;
  updatedTitlePrefix: string;
  primaryText: string;
  afterCreated: (checkpoint: AutoFormRecordCreatedCheckpoint) => Promise<{ rowId: string; uploadId: string }>;
  afterUpdated: (checkpoint: AutoFormRecordUpdatedCheckpoint) => Promise<void>;
}

export interface AutoFormRecordEngineResult {
  engine: BrowserEngine;
  paths: BrowserObjectPaths;
  rowId: string;
  uploadId: string;
  title: string;
}

export interface AutoFormRecordBrowserAcceptanceResult {
  engines: AutoFormRecordEngineResult[];
}

export interface WorkspaceListCapture {
  url: string;
  status: number;
  data: unknown[];
  total: number | null;
  parseError: string | null;
}

export interface WorkspacePatchCapture {
  method: 'PATCH';
  url: string;
  requestBody: unknown;
  requestParseError: string | null;
  status: number | null;
  body: unknown;
  responseParseError: string | null;
  settled: boolean;
}

export interface WorkspaceDetailCapture {
  url: string;
  status: number;
  rowId: string;
  title: string;
  tenantId: string;
}

export interface WorkspaceFailedCheckpoint {
  engine: BrowserEngine;
  rowId: string;
  originalTitle: string;
  invalidTitle: string;
  tenantId: string;
  patch: WorkspacePatchCapture;
}

export interface WorkspaceSavedCheckpoint {
  engine: BrowserEngine;
  rowId: string;
  updatedTitle: string;
  tenantId: string;
  patch: WorkspacePatchCapture;
}

export interface WorkspaceBrowserAcceptanceInput {
  authOrigin: string;
  storageOrigin: string;
  restOrigin: string;
  anonKey: string;
  bucket: string;
  email: string;
  password: string;
  otherEmail: string;
  otherPassword: string;
  objectRoot: string;
  titlePrefix: string;
  invalidTitle: string;
  tenantId: string;
  afterFailed: (checkpoint: WorkspaceFailedCheckpoint) => Promise<void>;
  afterSaved: (checkpoint: WorkspaceSavedCheckpoint) => Promise<void>;
}

export interface WorkspaceEngineResult {
  engine: BrowserEngine;
  searchText: string;
  targetTitle: string;
  updatedTitle: string;
  rowId: string;
  detail: WorkspaceDetailCapture;
  pageTwoList: WorkspaceListCapture;
  refreshedList: WorkspaceListCapture;
  patches: WorkspacePatchCapture[];
  listCaptureErrors: string[];
  unexpectedWrites: number;
  otherTenantLists: WorkspaceListCapture[];
  otherListCaptureErrors: string[];
  otherTenantWrites: number;
}

export interface WorkspaceBrowserAcceptanceResult {
  engines: WorkspaceEngineResult[];
}

function browserTypeFor(engine: BrowserEngine): BrowserType {
  const entry = ENGINE_TYPES.find(candidate => candidate.name === engine);
  if (entry === undefined) throw new Error(`Unsupported browser engine: ${engine}`);
  return entry.type;
}

async function waitForText(locator: Locator, expected: string, label: string): Promise<void> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const latest = (await locator.textContent())?.trim() ?? '';
    if (latest === expected) return;
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${label}; expected ${JSON.stringify(expected)}`);
}

async function waitForTextContaining(locator: Locator, expected: string, label: string): Promise<void> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const text = (await locator.textContent()) ?? '';
    if (text.includes(expected)) return;
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${label}; expected text containing ${JSON.stringify(expected)}`);
}

async function waitForNonEmpty(locator: Locator, label: string): Promise<string> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const text = (await locator.textContent())?.trim() ?? '';
    if (text.length > 0) return text;
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function waitForAuthState(page: import('playwright').Page, expected: string, label: string): Promise<void> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  let state = '';
  while (Date.now() < deadline) {
    state = (await page.getByTestId('auth-state').textContent())?.trim() ?? '';
    if (state === expected) return;
    const errorLocator = page.getByTestId('auth-error');
    const error = await errorLocator.isVisible() ? (await errorLocator.textContent())?.trim() ?? '' : '';
    if (error.length > 0) throw new Error(`${label} failed with ${error}`);
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${label}; expected ${JSON.stringify(expected)} state=${JSON.stringify(state)}`);
}

// 在 B 点击登录前注册，严格匹配真实 AutoForm edit 读取：
// GET /rest/v1/browser_records?id=eq.<rowId>。只读取状态与 JSON 集合，不读取或
// 打印 Authorization/token/header。
function waitForRecordReadResponse(
  page: import('playwright').Page,
  rowId: string,
): Promise<import('playwright').Response> {
  return page.waitForResponse(response => {
    const request = response.request();
    if (request.method() !== 'GET') return false;
    const url = new URL(response.url());
    if (url.pathname !== '/rest/v1/browser_records') return false;
    return url.searchParams.get('id') === `eq.${rowId}`;
  }, { timeout: WAIT_TIMEOUT_MS });
}

// 当前 SDK 的 refine getOne 使用集合读取而非 .single()：RLS 过滤掉目标行后，
// PostgREST 实际返回 200 + 空数组，随后 data provider 因缺少记录报
// INVALID_PROVIDER_RESPONSE。这里断言这个真实服务端结果；不回显 header 或 token，
// 也不把任意网络错误当作 RLS 拒绝。
async function expectRecordReadDenied(
  response: import('playwright').Response,
  rowId: string,
): Promise<void> {
  expect(response.request().method()).toBe('GET');
  const url = new URL(response.url());
  expect(url.pathname).toBe('/rest/v1/browser_records');
  expect(url.searchParams.get('id')).toBe(`eq.${rowId}`);
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual([]);
}

function parseReference(text: string): Record<string, string> {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Upload reference is not a plain object');
  }
  const reference: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'string') throw new Error('Upload reference contains a non-string value');
    reference[key] = value;
  }
  return reference;
}

function parsePlainObject(text: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Submitted AutoForm JSON is not a plain object');
  }
  return parsed as Record<string, unknown>;
}

// AutoForm 的托管 file 字段提交值必须恰好是 { attachment: { uploadId } }；
// 该断言只读 JSON，不把捕获回调当作业务持久化。
function submittedAttachmentReference(text: string): Record<string, string> {
  const submitted = parsePlainObject(text);
  expect(Object.keys(submitted)).toEqual(['attachment']);
  const attachment = submitted['attachment'];
  if (typeof attachment !== 'object' || attachment === null || Array.isArray(attachment)) {
    throw new Error('Submitted AutoForm attachment is not a plain reference object');
  }
  const reference = attachment as Record<string, unknown>;
  expect(Object.keys(reference)).toEqual(['uploadId']);
  const uploadId = reference['uploadId'];
  if (typeof uploadId !== 'string' || uploadId.length === 0) {
    throw new Error('Submitted AutoForm reference is missing a non-empty uploadId');
  }
  return { uploadId };
}

async function waitForEnabled(locator: Locator, label: string): Promise<void> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await locator.isEnabled()) return;
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${label} to be enabled`);
}

async function waitForInputValue(locator: Locator, expected: string, label: string): Promise<void> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await locator.inputValue() === expected) return;
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

// 只报告布尔值，失败时不回显邮箱、密码或 token 原文。
async function assertNoBrowserCredentialLeak(
  page: import('playwright').Page,
  email: string,
  password: string,
): Promise<void> {
  const body = await page.locator('body').innerText();
  expect(body.includes(email)).toBe(false);
  expect(body.includes(password)).toBe(false);
  expect(body.toLowerCase().includes('access_token')).toBe(false);
  expect(body.toLowerCase().includes('bearer ')).toBe(false);
  expect(body.toLowerCase().includes('service_role')).toBe(false);
}

async function setTextFile(input: Locator, name: string, text: string): Promise<void> {
  await input.setInputFiles({ name, mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });
}

interface LoopbackNegativeProbe {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
}

// 同一个浏览器场景内验证回环代理拒绝 scheme-relative 逃逸路径与不允许的方法；
// 期望响应来自本机 fixture，不产生任何外部请求。
async function runLoopbackNegativeProbes(
  page: import('playwright').Page,
  fixtureOrigin: string,
  input: BrowserAcceptanceInput,
  engine: BrowserEngine,
): Promise<void> {
  const objectPath = `/object/${input.bucket}/${input.objectRoot}/${engine}/primary.txt`;
  // scheme-relative 负面 probe 使用本机 fixture host，即使代理回归也不会解析到外网 DNS。
  const fixtureHost = new URL(fixtureOrigin).host;
  const probes: LoopbackNegativeProbe[] = [
    { method: 'POST', path: `/auth/v1//${fixtureHost}/token?grant_type=password` },
    { method: 'GET', path: '/auth/v1/token?grant_type=password' },
    { method: 'DELETE', path: objectPath },
  ];
  const statuses = await page.evaluate(async ({ origin, cases }) => {
    const results: number[] = [];
    for (const probe of cases) {
      const response = await fetch(new URL(probe.path, origin), {
        method: probe.method,
        redirect: 'error',
      });
      results.push(response.status);
      await response.body?.cancel();
    }
    return results;
  }, { origin: fixtureOrigin, cases: probes });
  expect(statuses).toEqual([403, 403, 403]);
}

// 只由新增的 browser_records 场景调用：验证新增 REST allowlist 仍拒绝未列出的
// 方法、其它 resource 与 scheme-relative 逃逸路径。代理只按 method+path 匹配，
// 不检查 PostgREST schema 选择头；schema 暴露范围由 PostgREST 自身负责。
async function runRestLoopbackNegativeProbes(
  page: import('playwright').Page,
  fixtureOrigin: string,
): Promise<void> {
  const fixtureHost = new URL(fixtureOrigin).host;
  const probes: LoopbackNegativeProbe[] = [
    { method: 'DELETE', path: '/rest/v1/browser_records' },
    { method: 'POST', path: '/rest/v1/tenant_records' },
    { method: 'GET', path: `/rest/v1//${fixtureHost}/browser_records` },
  ];
  const statuses = await page.evaluate(async ({ origin, cases }) => {
    const results: number[] = [];
    for (const probe of cases) {
      const response = await fetch(new URL(probe.path, origin), {
        method: probe.method,
        redirect: 'error',
      });
      results.push(response.status);
      await response.body?.cancel();
    }
    return results;
  }, { origin: fixtureOrigin, cases: probes });
  expect(statuses).toEqual([403, 403, 403]);
}

async function runEngine(
  engine: BrowserEngine,
  fixtureOrigin: string,
  input: BrowserAcceptanceInput,
): Promise<BrowserEngineResult> {
  const paths = browserObjectPaths(input.objectRoot, engine);
  const allowedOrigins = new Set([fixtureOrigin]);
  let browser: Browser | undefined;
  try {
    browser = await browserTypeFor(engine).launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: 'en-US',
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    // 只保留安全计数，不保留或打印原始页面错误。
    let pageErrorCount = 0;
    let externalRequestCount = 0;
    page.on('pageerror', () => { pageErrorCount += 1; });

    let storagePosts = 0;
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== fixtureOrigin) return;
      if (!url.pathname.startsWith(`/object/${input.bucket}/`)) return;
      if (request.method() === 'POST') storagePosts += 1;
    });

    // 浏览器网络只允许本轮 fixture 回环 origin；runner 同源代理转发到 Auth/Storage。
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.protocol === 'http:' && allowedOrigins.has(url.origin)) {
        await route.continue();
        return;
      }
      if (url.protocol === 'http:' || url.protocol === 'https:') externalRequestCount += 1;
      await route.abort('blockedbyclient');
    });

    const config = {
      authOrigin: fixtureOrigin,
      storageOrigin: fixtureOrigin,
      anonKey: input.anonKey,
      email: input.email,
      password: input.password,
      bucket: input.bucket,
      objectPrefix: `${input.objectRoot}/${engine}`,
    };
    // 动态凭据只经内存注入；不进入 URL query、Vite env 或任何仓库文件。
    await context.addInitScript(({ origins, payload }) => {
      const allowed = new Set(origins);
      const originalFetch = window.fetch.bind(window);
      window.fetch = ((requestInput: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        let url: URL;
        try {
          const raw = requestInput instanceof Request ? requestInput.url : requestInput;
          url = new URL(typeof raw === 'string' ? raw : raw.toString(), window.location.href);
        } catch {
          return Promise.reject(new TypeError('Browser acceptance blocked an invalid request URL'));
        }
        if (url.protocol !== 'http:' || !allowed.has(url.origin) || url.username !== '' || url.password !== '') {
          return Promise.reject(new TypeError('Browser acceptance blocked a non-loopback request'));
        }
        return originalFetch(requestInput, init);
      }) as typeof fetch;
      Object.defineProperty(window, '__SVADMIN_UPLOAD_BROWSER__', {
        value: payload, configurable: false, writable: false,
      });
    }, { origins: [...allowedOrigins], payload: config });

    await page.goto(fixtureOrigin, { waitUntil: 'domcontentloaded', timeout: WAIT_TIMEOUT_MS });
    await runLoopbackNegativeProbes(page, fixtureOrigin, input, engine);

    const upload = page.getByTestId('file-upload');
    const inputElement = upload.locator('input[type="file"]');
    const status = upload.locator('.svadmin-file-upload-status');
    const referenceOutput = page.getByTestId('upload-reference');
    const uploadIdOutput = page.getByTestId('upload-id');
    const uploadCallsOutput = page.getByTestId('upload-calls');

    await page.getByTestId('login').click();
    await waitForAuthState(page, 'signed-in', `${engine} signed-in state`);
    await expect(await inputElement.getAttribute('accept')).toBe('.txt');

    await setTextFile(inputElement, 'acceptance.txt', input.primaryText);
    await waitForText(status, 'success', `${engine} primary upload success`);
    await waitForNonEmpty(referenceOutput, `${engine} primary upload reference`);
    const primaryReference = parseReference((await referenceOutput.textContent()) ?? '');
    const uploadId = (await uploadIdOutput.textContent())?.trim() ?? '';
    expect(Object.keys(primaryReference)).toEqual(['uploadId']);
    expect(primaryReference['uploadId']).toBe(uploadId);
    expect(uploadId.length).toBeGreaterThan(0);
    expect(storagePosts).toBe(1);
    expect(await uploadCallsOutput.textContent()).toBe('1');

    const bodyText = await page.locator('body').innerText();
    // 布尔值断言避免失败时把邮箱、密码或 token 原文打印到测试输出。
    expect(bodyText.includes(input.email)).toBe(false);
    expect(bodyText.includes(input.password)).toBe(false);
    expect(bodyText.toLowerCase().includes('access_token')).toBe(false);
    expect(bodyText.toLowerCase().includes('bearer ')).toBe(false);
    expect(bodyText.toLowerCase().includes('service_role')).toBe(false);

    const screenshotDir = join(repoRoot, 'output', 'playwright', 'enterprise-upload-service');
    await mkdir(screenshotDir, { recursive: true });
    await page.screenshot({ path: join(screenshotDir, `upload-success-${engine}.png`), fullPage: true });

    await page.getByTestId('logout').click();
    await waitForAuthState(page, 'signed-out', `${engine} signed-out state`);
    const postsBeforeLoggedOutUpload = storagePosts;
    await setTextFile(inputElement, 'retry.txt', input.retryText);
    await waitForText(status, 'error', `${engine} logged-out upload failure`);
    await waitForText(upload.getByRole('alert'), 'Upload failed.', `${engine} logged-out failure alert`);
    const retryButton = upload.getByRole('button', { name: 'Retry upload', exact: true });
    await retryButton.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
    expect(await retryButton.isEnabled()).toBe(true);
    expect(storagePosts).toBe(postsBeforeLoggedOutUpload);
    expect((await referenceOutput.textContent())?.trim() ?? '').toBe('');
    await page.screenshot({ path: join(screenshotDir, `upload-logged-out-failure-${engine}.png`), fullPage: true });

    // Node 侧在重新登录前用 service role 独立确认 retry 对象尚不存在；该客户端不进入浏览器。
    if (input.afterLoggedOutFailure !== undefined) {
      await input.afterLoggedOutFailure({
        engine,
        paths,
        uploadId,
        reference: primaryReference,
      });
    }

    await page.getByTestId('login').click();
    await waitForAuthState(page, 'signed-in', `${engine} re-signed-in state`);
    const postsBeforeRetry = storagePosts;
    await retryButton.click();
    await waitForText(status, 'success', `${engine} retry upload success`);
    await waitForNonEmpty(referenceOutput, `${engine} retry upload reference`);
    const retryReference = parseReference((await referenceOutput.textContent()) ?? '');
    const retryUploadId = (await uploadIdOutput.textContent())?.trim() ?? '';
    expect(Object.keys(retryReference)).toEqual(['uploadId']);
    expect(retryReference['uploadId']).toBe(retryUploadId);
    expect(retryUploadId.length).toBeGreaterThan(0);
    expect(retryUploadId).not.toBe(uploadId);
    expect(storagePosts).toBe(postsBeforeRetry + 1);
    expect(await uploadCallsOutput.textContent()).toBe('3');

    const callsBeforeRejectedType = await uploadCallsOutput.textContent();
    const postsBeforeRejectedType = storagePosts;
    await inputElement.setInputFiles({
      name: 'rejected.csv', mimeType: 'text/csv', buffer: Buffer.from('rejected,type', 'utf8'),
    });
    await waitForTextContaining(
      upload.getByRole('list', { name: 'Rejected files', exact: true }),
      'File type is not accepted.',
      `${engine} rejected type`,
    );
    expect(await uploadCallsOutput.textContent()).toBe(callsBeforeRejectedType);
    expect(storagePosts).toBe(postsBeforeRejectedType);
    await page.screenshot({ path: join(screenshotDir, `upload-rejected-type-${engine}.png`), fullPage: true });

    expect(pageErrorCount).toBe(0);
    expect(externalRequestCount).toBe(0);
    return {
      engine,
      paths,
      uploadId,
      retryUploadId,
      reference: primaryReference,
      retryReference,
    };
  } finally {
    await browser?.close();
  }
}

async function runAutoFormEngine(
  engine: BrowserEngine,
  fixtureOrigin: string,
  input: BrowserAcceptanceInput,
): Promise<AutoFormBrowserEngineResult> {
  const paths = browserObjectPaths(input.objectRoot, engine);
  const allowedOrigins = new Set([fixtureOrigin]);
  let browser: Browser | undefined;
  try {
    browser = await browserTypeFor(engine).launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1200 },
      locale: 'en-US',
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    let pageErrorCount = 0;
    let externalRequestCount = 0;
    page.on('pageerror', () => { pageErrorCount += 1; });

    let storagePosts = 0;
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== fixtureOrigin) return;
      if (!url.pathname.startsWith(`/object/${input.bucket}/`)) return;
      if (request.method() === 'POST') storagePosts += 1;
    });

    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.protocol === 'http:' && allowedOrigins.has(url.origin)) {
        await route.continue();
        return;
      }
      if (url.protocol === 'http:' || url.protocol === 'https:') externalRequestCount += 1;
      await route.abort('blockedbyclient');
    });

    const config = {
      authOrigin: fixtureOrigin,
      storageOrigin: fixtureOrigin,
      anonKey: input.anonKey,
      email: input.email,
      password: input.password,
      bucket: input.bucket,
      objectPrefix: `${input.objectRoot}/${engine}`,
    };
    await context.addInitScript(({ origins, payload }) => {
      const allowed = new Set(origins);
      const originalFetch = window.fetch.bind(window);
      window.fetch = ((requestInput: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        let url: URL;
        try {
          const raw = requestInput instanceof Request ? requestInput.url : requestInput;
          url = new URL(typeof raw === 'string' ? raw : raw.toString(), window.location.href);
        } catch {
          return Promise.reject(new TypeError('AutoForm browser acceptance blocked an invalid request URL'));
        }
        if (url.protocol !== 'http:' || !allowed.has(url.origin) || url.username !== '' || url.password !== '') {
          return Promise.reject(new TypeError('AutoForm browser acceptance blocked a non-loopback request'));
        }
        return originalFetch(requestInput, init);
      }) as typeof fetch;
      Object.defineProperty(window, '__SVADMIN_UPLOAD_BROWSER__', {
        value: payload, configurable: false, writable: false,
      });
    }, { origins: [...allowedOrigins], payload: config });

    await page.goto(`${fixtureOrigin}/autoform.html`, { waitUntil: 'domcontentloaded', timeout: WAIT_TIMEOUT_MS });
    await runLoopbackNegativeProbes(page, fixtureOrigin, input, engine);

    const field = page.locator('[data-svadmin-field-key="attachment"]');
    const inputElement = field.locator('input[type="file"]');
    const status = field.locator('.svadmin-file-upload-status');
    const submitCount = page.getByTestId('autoform-submit-count');
    const submitJson = page.getByTestId('autoform-submit-json');
    const uploadCallsOutput = page.getByTestId('upload-calls');
    const saveButton = page.getByRole('button', { name: 'Save', exact: true });

    await page.getByTestId('login').click();
    await waitForAuthState(page, 'signed-in', `${engine} AutoForm signed-in state`);
    await expect(await inputElement.getAttribute('accept')).toBe('.txt');

    await setTextFile(inputElement, 'autoform-primary.txt', input.primaryText);
    await waitForText(status, 'success', `${engine} AutoForm primary upload success`);
    await waitForEnabled(saveButton, `${engine} AutoForm save after primary upload`);
    expect(await submitCount.textContent()).toBe('0');
    expect(await submitJson.textContent()).toBe('');
    expect(storagePosts).toBe(1);
    expect(await uploadCallsOutput.textContent()).toBe('1');

    await saveButton.click();
    await waitForText(submitCount, '1', `${engine} AutoForm primary submit`);
    const primaryReference = submittedAttachmentReference((await submitJson.textContent()) ?? '');
    expect(storagePosts).toBe(1);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.includes(input.email)).toBe(false);
    expect(bodyText.includes(input.password)).toBe(false);
    expect(bodyText.toLowerCase().includes('access_token')).toBe(false);
    expect(bodyText.toLowerCase().includes('bearer ')).toBe(false);
    expect(bodyText.toLowerCase().includes('service_role')).toBe(false);

    const screenshotDir = join(repoRoot, 'output', 'playwright', 'enterprise-autoform-upload-service');
    await mkdir(screenshotDir, { recursive: true });
    await page.screenshot({ path: join(screenshotDir, `autoform-success-${engine}.png`), fullPage: true });

    await page.getByTestId('logout').click();
    await waitForAuthState(page, 'signed-out', `${engine} AutoForm signed-out state`);
    const postsBeforeLoggedOutUpload = storagePosts;
    const submitsBeforeLoggedOutUpload = await submitCount.textContent();
    const jsonBeforeLoggedOutUpload = await submitJson.textContent();
    await setTextFile(inputElement, 'autoform-retry.txt', input.retryText);
    await waitForText(status, 'error', `${engine} AutoForm logged-out upload failure`);
    await waitForText(field.getByRole('alert'), 'Upload failed.', `${engine} AutoForm logged-out failure alert`);
    const retryButton = field.getByRole('button', { name: 'Retry upload', exact: true });
    await retryButton.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
    expect(await retryButton.isEnabled()).toBe(true);
    // 失败未解决时默认 Save 必须禁用，且不能向提交回调写入任何新 JSON。
    expect(await saveButton.isEnabled()).toBe(false);
    expect(storagePosts).toBe(postsBeforeLoggedOutUpload);
    expect(await submitCount.textContent()).toBe(submitsBeforeLoggedOutUpload);
    expect(await submitJson.textContent()).toBe(jsonBeforeLoggedOutUpload);
    expect(await uploadCallsOutput.textContent()).toBe('2');
    await page.screenshot({ path: join(screenshotDir, `autoform-logged-out-failure-${engine}.png`), fullPage: true });

    // Node 侧在重新登录前用 service role 独立确认 retry 对象尚不存在；该客户端不进入浏览器。
    if (input.afterLoggedOutFailure !== undefined) {
      await input.afterLoggedOutFailure({
        engine,
        paths,
        uploadId: primaryReference['uploadId'] ?? '',
        reference: primaryReference,
      });
    }

    await page.getByTestId('login').click();
    await waitForAuthState(page, 'signed-in', `${engine} AutoForm re-signed-in state`);
    const postsBeforeRetry = storagePosts;
    await retryButton.click();
    await waitForText(status, 'success', `${engine} AutoForm retry upload success`);
    await waitForEnabled(saveButton, `${engine} AutoForm save after retry upload`);
    expect(storagePosts).toBe(postsBeforeRetry + 1);
    expect(await uploadCallsOutput.textContent()).toBe('3');

    await saveButton.click();
    await waitForText(submitCount, '2', `${engine} AutoForm retry submit`);
    const retryReference = submittedAttachmentReference((await submitJson.textContent()) ?? '');
    expect(retryReference['uploadId']).not.toBe(primaryReference['uploadId']);

    expect(pageErrorCount).toBe(0);
    expect(externalRequestCount).toBe(0);
    return { engine, paths, reference: primaryReference, retryReference };
  } finally {
    await browser?.close();
  }
}

interface RecordBrowserConfig {
  origin: string;
  anonKey: string;
  email: string;
  password: string;
  bucket: string;
  objectPrefix: string;
}

async function installRecordBrowserConfig(
  context: import('playwright').BrowserContext,
  origins: readonly string[],
  payload: RecordBrowserConfig,
): Promise<void> {
  const allowed = new Set(origins);
  await context.addInitScript(({ allowedOrigins, config }) => {
    const allowedSet = new Set(allowedOrigins);
    const originalFetch = window.fetch.bind(window);
    window.fetch = ((requestInput: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let url: URL;
      try {
        const raw = requestInput instanceof Request ? requestInput.url : requestInput;
        url = new URL(typeof raw === 'string' ? raw : raw.toString(), window.location.href);
      } catch {
        return Promise.reject(new TypeError('AutoForm record acceptance blocked an invalid request URL'));
      }
      if (url.protocol !== 'http:' || !allowedSet.has(url.origin) || url.username !== '' || url.password !== '') {
        return Promise.reject(new TypeError('AutoForm record acceptance blocked a non-loopback request'));
      }
      return originalFetch(requestInput, init);
    }) as typeof fetch;
    Object.defineProperty(window, '__SVADMIN_UPLOAD_BROWSER__', {
      value: config, configurable: false, writable: false,
    });
  }, { allowedOrigins: [...allowed], config: payload });
}

// 三引擎真实浏览器闭环：A 创建真实行、重新打开编辑并更新，B 在独立 context
// 打开同一行并安全失败。上传、AutoForm Save 与 B 的读取尝试都由真实用户会话发起。
async function runAutoFormRecordEngine(
  engine: BrowserEngine,
  fixtureOrigin: string,
  input: AutoFormRecordBrowserAcceptanceInput,
): Promise<AutoFormRecordEngineResult> {
  const paths = browserObjectPaths(input.objectRoot, engine);
  const title = `${input.titlePrefix}-${engine}`;
  const updatedTitle = `${input.updatedTitlePrefix}-${engine}`;
  const allowedOrigins = new Set([fixtureOrigin]);
  let browserA: Browser | undefined;
  let browserB: Browser | undefined;
  try {
    browserA = await browserTypeFor(engine).launch({ headless: true });
    const contextA = await browserA.newContext({
      viewport: { width: 1440, height: 1200 },
      locale: 'en-US',
      serviceWorkers: 'block',
    });
    const pageA = await contextA.newPage();
    let pageErrorCountA = 0;
    let externalRequestCountA = 0;
    let storagePostsA = 0;
    let recordWritesA = 0;
    pageA.on('pageerror', () => { pageErrorCountA += 1; });
    pageA.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== fixtureOrigin) return;
      if (url.pathname === '/rest/v1/browser_records' && (request.method() === 'POST' || request.method() === 'PATCH')) {
        recordWritesA += 1;
      }
      if (url.pathname.startsWith(`/object/${input.bucket}/`) && request.method() === 'POST') storagePostsA += 1;
    });
    await contextA.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.protocol === 'http:' && allowedOrigins.has(url.origin)) {
        await route.continue();
        return;
      }
      if (url.protocol === 'http:' || url.protocol === 'https:') externalRequestCountA += 1;
      await route.abort('blockedbyclient');
    });
    const configA: RecordBrowserConfig = {
      origin: fixtureOrigin,
      anonKey: input.anonKey,
      email: input.email,
      password: input.password,
      bucket: input.bucket,
      objectPrefix: `${input.objectRoot}/${engine}`,
    };
    await installRecordBrowserConfig(contextA, [...allowedOrigins], configA);

    await pageA.goto(`${fixtureOrigin}/autoform-records.html`, { waitUntil: 'domcontentloaded', timeout: WAIT_TIMEOUT_MS });
    await runLoopbackNegativeProbes(pageA, fixtureOrigin, {
      authOrigin: input.authOrigin,
      storageOrigin: input.storageOrigin,
      anonKey: input.anonKey,
      bucket: input.bucket,
      email: input.email,
      password: input.password,
      objectRoot: input.objectRoot,
      primaryText: input.primaryText,
      retryText: input.primaryText,
    }, engine);
    await runRestLoopbackNegativeProbes(pageA, fixtureOrigin);

    await pageA.getByTestId('login').click();
    await waitForAuthState(pageA, 'signed-in', `${engine} record create signed-in state`);
    const titleInput = pageA.locator('[data-svadmin-field-key="title"] input').first();
    await titleInput.fill(title);
    const attachmentField = pageA.locator('[data-svadmin-field-key="attachment"]');
    const inputElement = attachmentField.locator('input[type="file"]');
    const status = attachmentField.locator('.svadmin-file-upload-status');
    await expect(await inputElement.getAttribute('accept')).toBe('.txt');
    await setTextFile(inputElement, 'primary.txt', input.primaryText);
    await waitForText(status, 'success', `${engine} record primary upload success`);
    const saveButton = pageA.getByRole('button', { name: 'Save', exact: true });
    await waitForEnabled(saveButton, `${engine} record save after upload`);
    await saveButton.click();
    await waitForText(pageA.getByTestId('autoform-record-save-count'), '1', `${engine} record create save`);
    expect(storagePostsA).toBe(1);
    expect(recordWritesA).toBe(1);
    await assertNoBrowserCredentialLeak(pageA, input.email, input.password);

    const screenshotDir = join(repoRoot, 'output', 'playwright', 'enterprise-autoform-record-service');
    await mkdir(screenshotDir, { recursive: true });
    await pageA.screenshot({ path: join(screenshotDir, `autoform-record-created-${engine}.png`), fullPage: true });

    // Node 独立会话在浏览器创建后读回真实行与对象字节；返回真实 rowId 供重新打开。
    const created = await input.afterCreated({ engine, paths, title });

    const editUrl = `${fixtureOrigin}/autoform-records.html?id=${encodeURIComponent(created.rowId)}`;
    await pageA.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: WAIT_TIMEOUT_MS });
    await pageA.getByTestId('login').click();
    await waitForAuthState(pageA, 'signed-in', `${engine} record edit signed-in state`);
    const editTitleInput = pageA.locator('[data-svadmin-field-key="title"] input').first();
    await waitForInputValue(editTitleInput, title, `${engine} edit title hydration`);
    const editAttachmentField = pageA.locator('[data-svadmin-field-key="attachment"]');
    await waitForTextContaining(
      editAttachmentField.locator('.svadmin-upload-reference-list'),
      created.uploadId,
      `${engine} edit attachment reference`,
    );

    // 真正 reload 后内存会话清空；重新登录并再次读回同一行的 title 与引用，
    // 然后才修改 title 保存。
    await pageA.reload({ waitUntil: 'domcontentloaded', timeout: WAIT_TIMEOUT_MS });
    await waitForAuthState(pageA, 'signed-out', `${engine} record reload signed-out state`);
    await pageA.getByTestId('login').click();
    await waitForAuthState(pageA, 'signed-in', `${engine} record reload signed-in state`);
    const reloadedTitleInput = pageA.locator('[data-svadmin-field-key="title"] input').first();
    await waitForInputValue(reloadedTitleInput, title, `${engine} reload title hydration`);
    const reloadedAttachmentField = pageA.locator('[data-svadmin-field-key="attachment"]');
    await waitForTextContaining(
      reloadedAttachmentField.locator('.svadmin-upload-reference-list'),
      created.uploadId,
      `${engine} reload attachment reference`,
    );
    await reloadedTitleInput.fill(updatedTitle);
    const editSaveButton = pageA.getByRole('button', { name: 'Save', exact: true });
    await waitForEnabled(editSaveButton, `${engine} record edit save`);
    await editSaveButton.click();
    await waitForText(pageA.getByTestId('autoform-record-save-count'), '1', `${engine} record edit save`);
    expect(recordWritesA).toBe(2);
    await assertNoBrowserCredentialLeak(pageA, input.email, input.password);
    await pageA.screenshot({ path: join(screenshotDir, `autoform-record-updated-${engine}.png`), fullPage: true });
    await input.afterUpdated({
      engine, paths, title: updatedTitle, rowId: created.rowId, uploadId: created.uploadId,
    });

    // B 使用完全独立的浏览器 context 与凭据，只尝试真实 AutoForm edit 读取。
    browserB = await browserTypeFor(engine).launch({ headless: true });
    const contextB = await browserB.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: 'en-US',
      serviceWorkers: 'block',
    });
    const pageB = await contextB.newPage();
    let pageErrorCountB = 0;
    let externalRequestCountB = 0;
    let storagePostsB = 0;
    let recordWritesB = 0;
    let recordReadsB = 0;
    pageB.on('pageerror', () => { pageErrorCountB += 1; });
    pageB.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== fixtureOrigin) return;
      if (url.pathname === '/rest/v1/browser_records' && request.method() === 'GET') {
        recordReadsB += 1;
      }
      if (url.pathname === '/rest/v1/browser_records' && (request.method() === 'POST' || request.method() === 'PATCH')) {
        recordWritesB += 1;
      }
      if (url.pathname.startsWith(`/object/${input.bucket}/`) && request.method() === 'POST') storagePostsB += 1;
    });
    await contextB.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.protocol === 'http:' && allowedOrigins.has(url.origin)) {
        await route.continue();
        return;
      }
      if (url.protocol === 'http:' || url.protocol === 'https:') externalRequestCountB += 1;
      await route.abort('blockedbyclient');
    });
    const configB: RecordBrowserConfig = {
      origin: fixtureOrigin,
      anonKey: input.anonKey,
      email: input.otherEmail,
      password: input.otherPassword,
      bucket: input.bucket,
      objectPrefix: `${input.objectRoot}/${engine}`,
    };
    await installRecordBrowserConfig(contextB, [...allowedOrigins], configB);
    await pageB.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: WAIT_TIMEOUT_MS });
    await runLoopbackNegativeProbes(pageB, fixtureOrigin, {
      authOrigin: input.authOrigin,
      storageOrigin: input.storageOrigin,
      anonKey: input.anonKey,
      bucket: input.bucket,
      email: input.otherEmail,
      password: input.otherPassword,
      objectRoot: input.objectRoot,
      primaryText: input.primaryText,
      retryText: input.primaryText,
    }, engine);
    await runRestLoopbackNegativeProbes(pageB, fixtureOrigin);
    // 响应等待必须在登录前注册；fixture 只在 signed-in 时挂载 AutoForm，避免
    // 登录前无会话读取产生误导性旧错误。
    const recordRead = waitForRecordReadResponse(pageB, created.rowId);
    await pageB.getByTestId('login').click();
    await waitForAuthState(pageB, 'signed-in', `${engine} other-tenant signed-in state`);
    await expectRecordReadDenied(await recordRead, created.rowId);
    await pageB.getByText('Operation failed', { exact: true }).first().waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
    expect(recordReadsB).toBe(1);
    const bodyB = await pageB.locator('body').innerText();
    expect(bodyB.includes(title)).toBe(false);
    expect(bodyB.includes(updatedTitle)).toBe(false);
    expect(bodyB.includes(created.uploadId)).toBe(false);
    expect(await pageB.locator('[data-svadmin-field-key="title"] input').count()).toBe(0);
    expect(await pageB.locator('.svadmin-upload-reference').count()).toBe(0);
    expect(await pageB.getByRole('button', { name: 'Save', exact: true }).count()).toBe(0);
    expect(recordWritesB).toBe(0);
    expect(storagePostsB).toBe(0);
    expect(pageErrorCountB).toBe(0);
    expect(externalRequestCountB).toBe(0);
    await assertNoBrowserCredentialLeak(pageB, input.otherEmail, input.otherPassword);
    await pageB.screenshot({ path: join(screenshotDir, `autoform-record-other-tenant-failure-${engine}.png`), fullPage: true });

    expect(pageErrorCountA).toBe(0);
    expect(externalRequestCountA).toBe(0);
    return {
      engine, paths, rowId: created.rowId, uploadId: created.uploadId, title: updatedTitle,
    };
  } finally {
    // 即使 B 关闭失败，也必须继续关闭 A，避免残留浏览器进程。
    try {
      await browserB?.close();
    } finally {
      await browserA?.close();
    }
  }
}

interface CaptureSettlement {
  captures: WorkspaceListCapture[];
  errors: string[];
}

async function settleListCaptures(
  promises: Promise<WorkspaceListCapture>[],
): Promise<CaptureSettlement> {
  const values = await Promise.allSettled(promises);
  const captures: WorkspaceListCapture[] = [];
  const errors: string[] = [];
  values.forEach((value, index) => {
    if (value.status === 'fulfilled') captures.push(value.value);
    else errors.push(`list capture ${index} failed`);
  });
  return { captures, errors };
}

function captureParam(capture: WorkspaceListCapture, name: string): string | null {
  try {
    return new URL(capture.url).searchParams.get(name);
  } catch {
    return null;
  }
}

function successfulStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function patchRequestId(capture: WorkspacePatchCapture): string | null {
  try {
    return new URL(capture.url).searchParams.get('id');
  } catch {
    return null;
  }
}

function patchRequestTitle(capture: WorkspacePatchCapture): unknown {
  if (typeof capture.requestBody !== 'object' || capture.requestBody === null
    || Array.isArray(capture.requestBody)) return undefined;
  return (capture.requestBody as Record<string, unknown>)['title'];
}

function patchResponseRow(capture: WorkspacePatchCapture): Record<string, unknown> | undefined {
  if (!Array.isArray(capture.body) || capture.body.length !== 1) return undefined;
  const row = capture.body[0];
  if (typeof row !== 'object' || row === null || Array.isArray(row)) return undefined;
  return row as Record<string, unknown>;
}

async function waitForListCapture(
  promises: Promise<WorkspaceListCapture>[],
  predicate: (capture: WorkspaceListCapture) => boolean,
  label: string,
): Promise<CaptureSettlement> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const settlement = await settleListCaptures(promises);
    if (settlement.captures.some(predicate)) return settlement;
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function waitForWorkspaceTitle(page: import('playwright').Page, title: string): Promise<Locator> {
  const locator = page.getByText(title, { exact: true }).filter({ visible: true }).first();
  await locator.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
  return locator.locator('xpath=ancestor::tr[1]');
}

async function waitForSettledAnimations(locator: Locator): Promise<void> {
  await locator.evaluate(async element => {
    await Promise.all(element.getAnimations({ subtree: true }).map(animation =>
      animation.finished.catch(() => undefined)));
  });
}

async function assertWorkspaceControlStable(
  page: import('playwright').Page,
  locator: Locator,
  label: string,
): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
  await waitForSettledAnimations(locator);
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  if (box === null || viewport === null) throw new Error(`${label} has no measurable viewport box`);
  expect(box.width > 0).toBe(true);
  expect(box.height > 0).toBe(true);
  expect(box.x >= 0).toBe(true);
  expect(box.y >= 0).toBe(true);
  expect(box.x + box.width <= viewport.width).toBe(true);
  expect(box.y + box.height <= viewport.height).toBe(true);
  const hit = await locator.evaluate((element, engine) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const target = document.elementFromPoint(x, y);
    const ok = target !== null && (target === element || element.contains(target));
    if (!ok) {
      const describe = (node: Element): Record<string, unknown> => {
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        return {
          tag: node.tagName,
          role: node.getAttribute('role'),
          pointerEvents: style.pointerEvents,
          visibility: style.visibility,
          opacity: style.opacity,
          zIndex: style.zIndex,
          box: [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)],
        };
      };
      throw new Error('SVADMIN_HIT_DIAG:' + JSON.stringify({
        engine,
        point: [Math.round(x), Math.round(y)],
        viewport: [window.innerWidth, window.innerHeight],
        source: describe(element),
        stack: document.elementsFromPoint(x, y).slice(0, 8).map(describe),
      }));
    }
    return ok;
  }, label.slice(0, label.indexOf(' ') === -1 ? label.length : label.indexOf(' ')));
  expect(hit).toBe(true);
}

function listSettlementFailures(settlement: CaptureSettlement): string[] {
  return [
    ...settlement.errors,
    ...settlement.captures.flatMap(capture => capture.parseError === null
      ? []
      : [`list capture parse error: ${capture.parseError}`]),
  ];
}

function expectWorkspaceDetailResponse(
  page: import('playwright').Page,
  rowId: string,
  expectedTitle: string,
  tenantId: string,
): Promise<WorkspaceDetailCapture> {
  return page.waitForResponse(response => {
    const request = response.request();
    const url = new URL(request.url());
    return request.method() === 'GET'
      && url.pathname === '/rest/v1/browser_records'
      && url.searchParams.get('id') === `eq.${rowId}`;
  }, { timeout: WAIT_TIMEOUT_MS }).then(async response => {
    expect(successfulStatus(response.status())).toBe(true);
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new Error('Detail response is not valid JSON');
    }
    if (!Array.isArray(parsed) || parsed.length !== 1) {
      throw new Error('Detail response is not a single JSON row');
    }
    const row = parsed[0];
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      throw new Error('Detail response row is not a JSON object');
    }
    const record = row as Record<string, unknown>;
    expect(record['id']).toBe(rowId);
    expect(record['title']).toBe(expectedTitle);
    expect(record['tenant_id']).toBe(tenantId);
    return {
      url: response.request().url(), status: response.status(), rowId,
      title: expectedTitle, tenantId,
    };
  });
}

async function waitForPatchCaptures(
  captures: WorkspacePatchCapture[],
  expected: number,
  label: string,
): Promise<WorkspacePatchCapture[]> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (captures.length === expected && captures.every(capture => capture.settled)) return captures;
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function runWorkspaceEngine(
  engine: BrowserEngine,
  fixtureOrigin: string,
  input: WorkspaceBrowserAcceptanceInput,
): Promise<WorkspaceEngineResult> {
  const searchText = `${input.titlePrefix}-${engine}`;
  const firstTitle = `${searchText} item 01`;
  const targetTitle = `${searchText} item 11`;
  const updatedTitle = `${searchText} item 11 updated`;
  const allowedOrigins = new Set([fixtureOrigin]);
  const screenshotDir = join(repoRoot, 'output', 'playwright', 'enterprise-resource-workspace-service');
  await mkdir(screenshotDir, { recursive: true });
  let browserA: Browser | undefined;
  let browserB: Browser | undefined;
  try {
    browserA = await browserTypeFor(engine).launch({ headless: true });
    const contextA = await browserA.newContext({
      viewport: { width: 1440, height: 1100 },
      locale: 'en-US',
      serviceWorkers: 'block',
    });
    const pageA = await contextA.newPage();
    let pageErrorCountA = 0;
    let externalRequestCountA = 0;
    let businessWritesStarted = false;
    let unexpectedWrites = 0;
    const listPromises: Promise<WorkspaceListCapture>[] = [];
    const patchCaptures: WorkspacePatchCapture[] = [];
    const patchByRequest = new Map<import('playwright').Request, WorkspacePatchCapture>();
    pageA.on('pageerror', () => { pageErrorCountA += 1; });
    pageA.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== fixtureOrigin || url.pathname !== '/rest/v1/browser_records') return;
      if (!businessWritesStarted) return;
      const method = request.method();
      if (method !== 'PATCH') {
        if (method === 'POST' || method === 'PUT' || method === 'DELETE') unexpectedWrites += 1;
        return;
      }
      let requestBody: unknown;
      let requestParseError: string | null = null;
      try { requestBody = request.postDataJSON(); } catch { requestParseError = 'invalid-json'; }
      const capture: WorkspacePatchCapture = {
        method: 'PATCH', url: request.url(), requestBody, requestParseError,
        status: null, body: undefined, responseParseError: null, settled: false,
      };
      patchCaptures.push(capture);
      patchByRequest.set(request, capture);
    });
    pageA.on('response', async response => {
      const request = response.request();
      const url = new URL(request.url());
      if (url.origin !== fixtureOrigin || url.pathname !== '/rest/v1/browser_records') return;
      if (request.method() === 'GET') {
        listPromises.push((async () => {
          let data: unknown[] = [];
          let parseError: string | null = null;
          try {
            const body: unknown = await response.json();
            if (Array.isArray(body)) data = body;
            else parseError = 'non-array-json';
          } catch {
            parseError = 'invalid-json';
          }
          const contentRange = response.headers()['content-range'];
          const total = contentRange === undefined ? Number.NaN : Number(contentRange.split('/')[1]);
          return {
            url: request.url(), status: response.status(), data,
            total: Number.isFinite(total) ? total : null,
            parseError,
          };
        })());
      } else if (request.method() === 'PATCH') {
        const capture = patchByRequest.get(request);
        if (capture === undefined) return;
        capture.status = response.status();
        try {
          capture.body = await response.json();
        } catch {
          capture.responseParseError = 'invalid-json';
        }
        capture.settled = true;
      }
    });
    pageA.on('requestfailed', request => {
      const capture = patchByRequest.get(request);
      if (capture === undefined || capture.settled) return;
      capture.settled = true;
      capture.responseParseError = 'no-response';
    });
    await contextA.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.protocol === 'http:' && allowedOrigins.has(url.origin)) {
        await route.continue();
        return;
      }
      if (url.protocol === 'http:' || url.protocol === 'https:') externalRequestCountA += 1;
      await route.abort('blockedbyclient');
    });
    const configA: RecordBrowserConfig = {
      origin: fixtureOrigin,
      anonKey: input.anonKey,
      email: input.email,
      password: input.password,
      bucket: input.bucket,
      objectPrefix: `${input.objectRoot}/${engine}`,
    };
    await installRecordBrowserConfig(contextA, [...allowedOrigins], configA);
    await pageA.goto(`${fixtureOrigin}/resource-workspace.html`, { waitUntil: 'domcontentloaded', timeout: WAIT_TIMEOUT_MS });
    await runLoopbackNegativeProbes(pageA, fixtureOrigin, {
      authOrigin: input.authOrigin,
      storageOrigin: input.storageOrigin,
      anonKey: input.anonKey,
      bucket: input.bucket,
      email: input.email,
      password: input.password,
      objectRoot: input.objectRoot,
      primaryText: 'workspace',
      retryText: 'workspace',
    }, engine);
    await runRestLoopbackNegativeProbes(pageA, fixtureOrigin);
    businessWritesStarted = true;
    await pageA.getByTestId('login').click();
    await waitForAuthState(pageA, 'signed-in', `${engine} workspace signed-in state`);

    const search = pageA.locator(
      '[data-svadmin-resource-operations="browser_records"] input[placeholder="Search..."]',
    ).first();
    await search.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
    await search.fill(searchText);
    await waitForListCapture(
      listPromises,
      capture => successfulStatus(capture.status) && capture.parseError === null
        && decodeURIComponent(capture.url).includes(searchText),
      `${engine} real searched list response`,
    );
    await waitForWorkspaceTitle(pageA, firstTitle);
    await pageA.getByRole('button', { name: /^(Go to next page|下一页)$/ }).click();
    const targetRow = await waitForWorkspaceTitle(pageA, targetTitle);
    const pageTwoSettlement = await waitForListCapture(
      listPromises,
      capture => successfulStatus(capture.status) && capture.parseError === null
        && captureParam(capture, 'offset') === '10'
        && decodeURIComponent(capture.url).includes(searchText)
        && capture.data.some(row => typeof row === 'object' && row !== null
          && (row as Record<string, unknown>)['title'] === targetTitle),
      `${engine} real page-two list response`,
    );
    const pageTwoList = pageTwoSettlement.captures.find(capture => successfulStatus(capture.status)
      && capture.parseError === null
      && captureParam(capture, 'offset') === '10'
      && decodeURIComponent(capture.url).includes(searchText)
      && capture.data.some(row => typeof row === 'object' && row !== null
        && (row as Record<string, unknown>)['title'] === targetTitle));
    if (pageTwoList === undefined) throw new Error('Workspace page-two list capture missing');

    const selected = targetRow.getByRole('checkbox', { name: /^(Select record|选择记录)/ });
    await selected.check();
    expect(await selected.isChecked()).toBe(true);
    const selectedLabel = await selected.getAttribute('aria-label');
    const selectedMatch = /^(?:(?:Select record)|(?:选择记录))\s+(.+)$/.exec(selectedLabel ?? '');
    const rowId = selectedMatch?.[1];
    if (rowId === undefined) throw new Error('Workspace selection did not expose the real row id');
    // 更新 title 后旧标题行定位会失效；选择保持必须按真实行 id 重新定位 checkbox。
    const selectedByRowId = pageA.getByRole('checkbox', {
      name: new RegExp(`^(?:(?:Select record)|(?:选择记录)) ${rowId}$`),
    });

    // 点击前注册严格 GET response，证明详情不是来自缓存或旧请求。
    const detailResponse = expectWorkspaceDetailResponse(pageA, rowId, targetTitle, input.tenantId);
    await targetRow.getByRole('button', { name: /^(Detail|详情)$/ }).click();
    const detail = await detailResponse;
    const detailDrawer = pageA.getByRole('dialog', { name: /Browser records/ });
    await detailDrawer.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
    await waitForTextContaining(detailDrawer, targetTitle, `${engine} detail title`);
    await pageA.screenshot({ path: join(screenshotDir, `workspace-detail-${engine}.png`), fullPage: true });
    await detailDrawer.getByRole('button', { name: /^(Close|关闭)$/ }).click();
    await detailDrawer.waitFor({ state: 'hidden', timeout: WAIT_TIMEOUT_MS });
    expect(await search.inputValue()).toBe(searchText);
    expect((await pageA.locator('[data-slot="pagination-link"][aria-current="page"]').textContent())?.trim()).toBe('2');
    expect(await selectedByRowId.isChecked()).toBe(true);

    await targetRow.getByRole('button', { name: /^(More actions|更多操作)$/ }).click();
    const menu = pageA.getByRole('menu', { name: /^(More actions|更多操作)$/ });
    await menu.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
    await menu.getByRole('menuitem', { name: /^(Quick edit|快速编辑)$/ }).click();
    const editDrawer = pageA.getByRole('dialog', { name: /Browser records/ });
    await editDrawer.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
    const titleInput = editDrawer.getByRole('textbox', { name: /^(Title|标题)$/ });
    await waitForInputValue(titleInput, targetTitle, `${engine} quick-edit title hydration`);
    const saveButton = editDrawer.getByRole('button', { name: /^(Save|保存)$/ });
    await waitForEnabled(saveButton, `${engine} quick-edit save`);

    await titleInput.fill(input.invalidTitle);
    await saveButton.click();
    const failureAlert = editDrawer.getByRole('alert').first();
    await waitForTextContaining(
      failureAlert,
      'Operation failed',
      `${engine} real constraint failure alert`,
    );
    await waitForSettledAnimations(editDrawer);
    await assertWorkspaceControlStable(pageA, failureAlert, `${engine} failure alert`);
    const failureAlertText = (await failureAlert.innerText()).trim();
    expect(failureAlertText.length > 0).toBe(true);
    expect(failureAlertText).toContain('Operation failed');
    await assertWorkspaceControlStable(pageA, titleInput, `${engine} failed title input`);
    await assertWorkspaceControlStable(pageA, saveButton, `${engine} failed save button`);
    expect(await titleInput.isEditable()).toBe(true);
    expect(await saveButton.isEnabled()).toBe(true);
    const failedCaptures = await waitForPatchCaptures(patchCaptures, 1, `${engine} failed PATCH request`);
    const failedPatch = failedCaptures[0];
    if (failedPatch === undefined) throw new Error('Workspace failed PATCH response unavailable');
    expect(failedPatch.requestParseError).toBeNull();
    expect(patchRequestId(failedPatch)).toBe(`eq.${rowId}`);
    expect(patchRequestTitle(failedPatch)).toBe(input.invalidTitle);
    expect(failedPatch.status).not.toBeNull();
    expect(failedPatch.status !== null && successfulStatus(failedPatch.status)).toBe(false);
    expect(failedPatch.responseParseError).toBeNull();
    expect(await titleInput.inputValue()).toBe(input.invalidTitle);
    expect(await saveButton.isEnabled()).toBe(true);
    expect(await search.inputValue()).toBe(searchText);
    expect((await pageA.locator('[data-slot="pagination-link"][aria-current="page"]').textContent())?.trim()).toBe('2');
    expect(await selectedByRowId.isChecked()).toBe(true);
    const failureBody = await pageA.locator('body').innerText();
    expect(failureBody).not.toContain('browser_records_acceptance_title_check');
    expect(failureBody).not.toContain('23514');
    expect(failureBody.toLowerCase()).not.toContain('violates check constraint');
    await pageA.screenshot({
      path: join(screenshotDir, `workspace-quick-edit-failed-${engine}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await input.afterFailed({
      engine, rowId, originalTitle: targetTitle, invalidTitle: input.invalidTitle,
      tenantId: input.tenantId, patch: failedPatch,
    });

    await titleInput.fill(updatedTitle);
    await saveButton.click();
    await editDrawer.waitFor({ state: 'hidden', timeout: WAIT_TIMEOUT_MS });
    await waitForWorkspaceTitle(pageA, updatedTitle);
    const savedCaptures = await waitForPatchCaptures(patchCaptures, 2, `${engine} successful PATCH request`);
    const savedPatch = savedCaptures[1];
    if (savedPatch === undefined) throw new Error('Workspace successful PATCH response unavailable');
    expect(savedPatch.requestParseError).toBeNull();
    expect(patchRequestId(savedPatch)).toBe(`eq.${rowId}`);
    expect(patchRequestTitle(savedPatch)).toBe(updatedTitle);
    expect(savedPatch.status).not.toBeNull();
    expect(savedPatch.status !== null && successfulStatus(savedPatch.status)).toBe(true);
    expect(savedPatch.responseParseError).toBeNull();
    const savedRow = patchResponseRow(savedPatch);
    if (savedRow === undefined) throw new Error('Successful PATCH response is not exactly one JSON row');
    expect(savedRow['id']).toBe(rowId);
    expect(savedRow['title']).toBe(updatedTitle);
    expect(savedRow['tenant_id']).toBe(input.tenantId);
    const refreshedSettlement = await waitForListCapture(
      listPromises,
      capture => successfulStatus(capture.status) && capture.parseError === null
        && captureParam(capture, 'offset') === '10'
        && decodeURIComponent(capture.url).includes(searchText)
        && capture.data.some(row => typeof row === 'object' && row !== null
          && (row as Record<string, unknown>)['title'] === updatedTitle),
      `${engine} refreshed real list response`,
    );
    const refreshedList = refreshedSettlement.captures.find(capture => successfulStatus(capture.status)
      && capture.parseError === null
      && captureParam(capture, 'offset') === '10'
      && decodeURIComponent(capture.url).includes(searchText)
      && capture.data.some(row => typeof row === 'object' && row !== null
        && (row as Record<string, unknown>)['title'] === updatedTitle));
    if (refreshedList === undefined) throw new Error('Workspace refreshed list capture missing');
    expect(await search.inputValue()).toBe(searchText);
    expect((await pageA.locator('[data-slot="pagination-link"][aria-current="page"]').textContent())?.trim()).toBe('2');
    expect(await selectedByRowId.isChecked()).toBe(true);
    await assertNoBrowserCredentialLeak(pageA, input.email, input.password);
    await pageA.screenshot({ path: join(screenshotDir, `workspace-quick-edit-saved-${engine}.png`), fullPage: true });
    await input.afterSaved({ engine, rowId, updatedTitle, tenantId: input.tenantId, patch: savedPatch });

    browserB = await browserTypeFor(engine).launch({ headless: true });
    const contextB = await browserB.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: 'en-US',
      serviceWorkers: 'block',
    });
    const pageB = await contextB.newPage();
    let pageErrorCountB = 0;
    let externalRequestCountB = 0;
    let otherTenantWrites = 0;
    let otherTenantBusinessStarted = false;
    const otherListPromises: Promise<WorkspaceListCapture>[] = [];
    pageB.on('pageerror', () => { pageErrorCountB += 1; });
    pageB.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== fixtureOrigin || url.pathname !== '/rest/v1/browser_records') return;
      if (!otherTenantBusinessStarted) return;
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) otherTenantWrites += 1;
    });
    pageB.on('response', response => {
      const request = response.request();
      const url = new URL(request.url());
      if (url.origin !== fixtureOrigin || url.pathname !== '/rest/v1/browser_records') return;
      if (request.method() !== 'GET') return;
      otherListPromises.push((async () => {
        let data: unknown[] = [];
        let parseError: string | null = null;
        try {
          const body: unknown = await response.json();
          if (Array.isArray(body)) data = body;
          else parseError = 'non-array-json';
        } catch {
          parseError = 'invalid-json';
        }
        const contentRange = response.headers()['content-range'];
        const total = contentRange === undefined ? Number.NaN : Number(contentRange.split('/')[1]);
        return {
          url: request.url(), status: response.status(), data,
          total: Number.isFinite(total) ? total : null,
          parseError,
        };
      })());
    });
    await contextB.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.protocol === 'http:' && allowedOrigins.has(url.origin)) {
        await route.continue();
        return;
      }
      if (url.protocol === 'http:' || url.protocol === 'https:') externalRequestCountB += 1;
      await route.abort('blockedbyclient');
    });
    const configB: RecordBrowserConfig = {
      origin: fixtureOrigin,
      anonKey: input.anonKey,
      email: input.otherEmail,
      password: input.otherPassword,
      bucket: input.bucket,
      objectPrefix: `${input.objectRoot}/${engine}`,
    };
    await installRecordBrowserConfig(contextB, [...allowedOrigins], configB);
    await pageB.goto(`${fixtureOrigin}/resource-workspace.html`, { waitUntil: 'domcontentloaded', timeout: WAIT_TIMEOUT_MS });
    await runLoopbackNegativeProbes(pageB, fixtureOrigin, {
      authOrigin: input.authOrigin,
      storageOrigin: input.storageOrigin,
      anonKey: input.anonKey,
      bucket: input.bucket,
      email: input.otherEmail,
      password: input.otherPassword,
      objectRoot: input.objectRoot,
      primaryText: 'workspace',
      retryText: 'workspace',
    }, engine);
    await runRestLoopbackNegativeProbes(pageB, fixtureOrigin);
    otherTenantBusinessStarted = true;
    await pageB.getByTestId('login').click();
    await waitForAuthState(pageB, 'signed-in', `${engine} other-tenant workspace signed-in state`);
    const otherSettlement = await waitForListCapture(
      otherListPromises,
      capture => successfulStatus(capture.status) && capture.parseError === null
        && capture.data.length === 0 && capture.total === 0,
      `${engine} other-tenant real empty list response`,
    );
    const otherEmptyList = otherSettlement.captures.find(capture =>
      successfulStatus(capture.status) && capture.parseError === null
      && capture.data.length === 0 && capture.total === 0);
    if (otherEmptyList === undefined) throw new Error('Other-tenant workspace empty list capture missing');
    const otherBody = await pageB.locator('body').innerText();
    expect(otherBody.includes(targetTitle)).toBe(false);
    expect(otherBody.includes(updatedTitle)).toBe(false);
    const emptyState = pageB.locator('[data-svadmin-data-state="empty"]').first();
    await waitForTextContaining(emptyState, 'No data', `${engine} other-tenant empty state`);
    await assertWorkspaceControlStable(pageB, emptyState, `${engine} other-tenant empty state`);
    const emptyText = (await emptyState.innerText()).trim();
    expect(emptyText.length > 0).toBe(true);
    expect(emptyText).toContain('No data');
    expect(otherTenantWrites).toBe(0);
    expect(pageErrorCountB).toBe(0);
    expect(externalRequestCountB).toBe(0);
    await assertNoBrowserCredentialLeak(pageB, input.otherEmail, input.otherPassword);
    await pageB.screenshot({
      path: join(screenshotDir, `workspace-other-tenant-empty-${engine}.png`),
      fullPage: true,
      animations: 'disabled',
    });

    expect(pageErrorCountA).toBe(0);
    expect(externalRequestCountA).toBe(0);
    const finalListSettlement = await settleListCaptures(listPromises);
    const finalOtherSettlement = await settleListCaptures(otherListPromises);
    const finalListFailures = listSettlementFailures(finalListSettlement);
    const finalOtherFailures = listSettlementFailures(finalOtherSettlement);
    expect(finalListFailures).toEqual([]);
    expect(finalOtherFailures).toEqual([]);
    expect(unexpectedWrites).toBe(0);
    return {
      engine, searchText, targetTitle, updatedTitle, rowId, detail,
      pageTwoList, refreshedList, patches: [...patchCaptures],
      listCaptureErrors: finalListFailures, unexpectedWrites,
      otherTenantLists: finalOtherSettlement.captures,
      otherListCaptureErrors: finalOtherFailures, otherTenantWrites,
    };
  } finally {
    try {
      await browserB?.close();
    } finally {
      await browserA?.close();
    }
  }
}

function aliasFor(relativePath: string): string {
  return fileURLToPath(new URL(`../../../../packages/core/src/${relativePath}`, import.meta.url));
}

function exactArrayBuffer(buffer: Buffer): ArrayBuffer {
  const copy = new Uint8Array(buffer.byteLength);
  copy.set(buffer);
  return copy.buffer;
}

class ProxyBodyError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ProxyBodyError';
    this.statusCode = statusCode;
  }
}

// 有界读取：超过 fixture 上限或超时都拒绝；handler 负责回写状态并销毁入站请求。
function readBoundedProxyBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const declaredLength = Number(request.headers['content-length']);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_PROXY_BODY_BYTES) {
      request.pause();
      reject(new ProxyBodyError(413, 'request body too large'));
      return;
    }

    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    const cleanup = (): void => {
      clearTimeout(timer);
      request.off('data', onData);
      request.off('end', onEnd);
      request.off('error', onError);
      request.off('aborted', onAborted);
      request.off('close', onClose);
    };
    const fail = (error: ProxyBodyError): void => {
      if (settled) return;
      settled = true;
      cleanup();
      request.pause();
      reject(error);
    };
    const onData = (value: Buffer | string): void => {
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      total += chunk.byteLength;
      if (total > MAX_PROXY_BODY_BYTES) {
        fail(new ProxyBodyError(413, 'request body too large'));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = (): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(Buffer.concat(chunks, total));
    };
    const onError = (): void => { fail(new ProxyBodyError(400, 'request body failed')); };
    const onAborted = (): void => { fail(new ProxyBodyError(499, 'request aborted')); };
    const onClose = (): void => {
      if (!request.complete) fail(new ProxyBodyError(499, 'request closed before completion'));
    };
    const timer = setTimeout(() => {
      fail(new ProxyBodyError(408, 'request body timeout'));
    }, PROXY_BODY_TIMEOUT_MS);
    timer.unref?.();
    request.on('data', onData);
    request.on('end', onEnd);
    request.on('error', onError);
    request.on('aborted', onAborted);
    request.on('close', onClose);
  });
}

interface ProxyOperation {
  readonly method: 'GET' | 'POST' | 'PATCH';
  readonly upstreamOrigin: string;
  readonly upstreamPath: string;
}

function isProxySurface(pathname: string): boolean {
  return pathname === '/auth/v1' || pathname.startsWith('/auth/v1/')
    || pathname === '/object' || pathname.startsWith('/object/')
    || pathname === '/rest/v1' || pathname.startsWith('/rest/v1/');
}

function strictLoopbackOrigin(value: string, label: string): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1'
    || url.username !== '' || url.password !== ''
    || url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    throw new Error(`Acceptance proxy refused a non-strict-loopback ${label} origin`);
  }
  return url.origin;
}

// 只把映射表中的确切方法 + 路径转发到固定的 127.0.0.1 origin；请求路径不能改变
// 目标 origin。Auth 仅 token POST、user GET、logout POST，Object 仅本轮三种引擎的
// primary/retry 精确 POST；PostgREST 仅 browser_records 的 GET/POST/PATCH。
function proxyAllowlist(
  authOrigin: string,
  storageOrigin: string,
  restOrigin: string | undefined,
  bucket: string,
  objectRoot: string,
  engines: readonly BrowserEngine[],
): Map<string, ProxyOperation> {
  const auth = strictLoopbackOrigin(authOrigin, 'Auth');
  const storage = strictLoopbackOrigin(storageOrigin, 'Storage');
  const allowlist = new Map<string, ProxyOperation>();
  allowlist.set('POST /auth/v1/token', { method: 'POST', upstreamOrigin: auth, upstreamPath: '/token' });
  allowlist.set('GET /auth/v1/user', { method: 'GET', upstreamOrigin: auth, upstreamPath: '/user' });
  allowlist.set('POST /auth/v1/logout', { method: 'POST', upstreamOrigin: auth, upstreamPath: '/logout' });
  for (const engine of engines) {
    for (const name of ['primary.txt', 'retry.txt'] as const) {
      const pathname = `/object/${bucket}/${objectRoot}/${engine}/${name}`;
      allowlist.set(`POST ${pathname}`, { method: 'POST', upstreamOrigin: storage, upstreamPath: pathname });
    }
  }
  if (restOrigin !== undefined) {
    const rest = strictLoopbackOrigin(restOrigin, 'PostgREST');
    for (const method of ['GET', 'POST', 'PATCH'] as const) {
      allowlist.set(`${method} /rest/v1/browser_records`, {
        method, upstreamOrigin: rest, upstreamPath: '/browser_records',
      });
    }
  }
  return allowlist;
}

// 浏览器只访问 fixture 回环 origin；这个同源中间件把 Auth/Storage 路径转发到本轮
// 真实服务，避免跨源 CORS 或外部请求改变被测边界。
function loopbackProxyPlugin(
  authOrigin: string,
  storageOrigin: string,
  restOrigin: string | undefined,
  bucket: string,
  objectRoot: string,
  engines: readonly BrowserEngine[],
) {
  const allowlist = proxyAllowlist(authOrigin, storageOrigin, restOrigin, bucket, objectRoot, engines);
  return {
    name: 'acceptance-loopback-proxy',
    configureServer(server: ViteDevServer): void {
      const active = new Set<AbortController>();
      const abortAll = (): void => {
        for (const controller of active) controller.abort();
        active.clear();
      };
      server.httpServer?.once('close', abortAll);
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://127.0.0.1');
        const method = request.method ?? 'GET';
        const operation = allowlist.get(`${method} ${url.pathname}`);
        if (operation === undefined) {
          if (isProxySurface(url.pathname)) {
            response.statusCode = 403;
            response.setHeader('content-type', 'text/plain; charset=utf-8');
            response.end('Acceptance proxy rejected an unlisted Auth/Object request');
            return;
          }
          next();
          return;
        }
        const controller = new AbortController();
        active.add(controller);
        response.on('close', () => {
          if (!response.writableEnded) controller.abort();
        });
        request.on('aborted', () => controller.abort());
        void (async () => {
          try {
            const headers = new Headers();
            for (const [name, value] of Object.entries(request.headers)) {
              if (value === undefined) continue;
              const lower = name.toLowerCase();
              if (['host', 'connection', 'content-length', 'transfer-encoding', 'keep-alive',
                'proxy-connection', 'upgrade', 'expect'].includes(lower)) continue;
              if (Array.isArray(value)) for (const item of value) headers.append(name, item);
              else headers.set(name, value);
            }
            const body = operation.method === 'GET' ? undefined : await readBoundedProxyBody(request);
            const target = new URL(operation.upstreamPath, operation.upstreamOrigin);
            // 查询串仅用于 Auth grant_type/scope；origin 与 pathname 来自固定映射。
            target.search = url.search;
            const upstream = await fetch(target, {
              method: operation.method,
              headers,
              redirect: 'error',
              signal: AbortSignal.any([controller.signal, AbortSignal.timeout(PROXY_TIMEOUT_MS)]),
              ...(body === undefined ? {} : { body: exactArrayBuffer(body) }),
            });
            if (controller.signal.aborted) {
              await upstream.body?.cancel();
              return;
            }
            response.statusCode = upstream.status;
            upstream.headers.forEach((value, name) => {
              if (['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(name)) return;
              response.setHeader(name, value);
            });
            const data = Buffer.from(await upstream.arrayBuffer());
            response.setHeader('content-length', data.byteLength);
            response.end(data);
          } catch (error) {
            const statusCode = error instanceof ProxyBodyError ? error.statusCode : 502;
            if (!response.destroyed && !response.headersSent && !response.writableEnded) {
              response.statusCode = statusCode;
              response.setHeader('content-type', 'text/plain; charset=utf-8');
              response.end('Acceptance loopback proxy failed');
            } else if (!response.destroyed && !response.writableEnded) {
              response.destroy();
            }
            request.destroy();
          } finally {
            active.delete(controller);
          }
        })();
      });
    },
  };
}

interface FixtureServer {
  server: ViteDevServer;
  fixtureOrigin: string;
  cacheDir: string;
}

async function startFixtureServer(
  authOrigin: string,
  storageOrigin: string,
  restOrigin: string | undefined,
  bucket: string,
  objectRoot: string,
  engines: readonly BrowserEngine[],
): Promise<FixtureServer> {
  const cacheDir = await mkdtemp(join(tmpdir(), 'svadmin-upload-vite-'));
  let server: ViteDevServer | undefined;
  try {
    server = await createServer({
      root: browserRoot,
      configFile: false,
      cacheDir,
      logLevel: 'silent',
      plugins: [svelte(), loopbackProxyPlugin(authOrigin, storageOrigin, restOrigin, bucket, objectRoot, engines)],
      // 根 node_modules 指向原工作区，被测 @svadmin 源码必须显式解析到当前 worktree。
      resolve: {
        alias: [
          { find: /^@svadmin\/core$/, replacement: aliasFor('index.ts') },
          { find: /^@svadmin\/core\/i18n$/, replacement: aliasFor('i18n.svelte.ts') },
          { find: /^@svadmin\/core\/options$/, replacement: aliasFor('defined-options.ts') },
          { find: /^@svadmin\/core\/schema$/, replacement: aliasFor('schema.ts') },
          { find: /^@svadmin\/core\/audit$/, replacement: aliasFor('audit.ts') },
          // AutoForm/AdminApp 额外使用的子路径也必须解析到当前 worktree，不能落回
          // 共享 node_modules 指向的原工作区。
          { find: /^@svadmin\/core\/schema-form$/, replacement: aliasFor('schema-form.ts') },
          { find: /^@svadmin\/core\/resource-contract$/, replacement: aliasFor('resource-contract.ts') },
          { find: /^@svadmin\/core\/router$/, replacement: aliasFor('router.ts') },
          { find: /^@svadmin\/core\/date-time$/, replacement: aliasFor('date-time.ts') },
          { find: /^@svadmin\/core\/gantt$/, replacement: aliasFor('gantt.ts') },
          { find: /^@svadmin\/core\/pivot$/, replacement: aliasFor('pivot.ts') },
          { find: /^@svadmin\/core\/unsafe$/, replacement: aliasFor('unsafe.ts') },
          { find: /^@svadmin\/core\/permissions$/, replacement: aliasFor('permissions.svelte.ts') },
          { find: /^@svadmin\/core\/toast$/, replacement: aliasFor('toast.svelte.ts') },
          // 新增 data provider 路径也必须使用当前 worktree 的 refine adapter，
          // 不能回落到共享 node_modules 指向的原工作区。
          {
            find: /^@svadmin\/refine-adapter$/,
            replacement: fileURLToPath(new URL('../../../../packages/refine-adapter/src/index.ts', import.meta.url)),
          },
        ],
      },
      server: {
        host: '127.0.0.1',
        port: 0,
        strictPort: false,
        hmr: false,
        fs: { allow: [repoRoot] },
      },
    });
    await server.listen();
    const address = server.httpServer?.address();
    if (address === null || address === undefined || typeof address === 'string') {
      throw new Error('Vite did not expose a loopback port');
    }
    return { server, fixtureOrigin: `http://127.0.0.1:${address.port}`, cacheDir };
  } catch (error) {
    try {
      if (server !== undefined) await server.close();
    } finally {
      await rm(cacheDir, { recursive: true, force: true });
    }
    throw error;
  }
}

async function closeFixtureServer(fixture: FixtureServer): Promise<void> {
  try {
    await fixture.server.close();
  } finally {
    await rm(fixture.cacheDir, { recursive: true, force: true });
  }
}

export async function runBrowserUploadAcceptance(input: BrowserAcceptanceInput): Promise<BrowserAcceptanceResult> {
  const engines = requiredBrowserEngines();
  const available = new Set(availableBrowserEngines());
  const missing = engines.filter(engine => !available.has(engine));
  if (missing.length > 0) {
    throw new Error(`Upload browser acceptance requires all engines; missing: ${missing.join(', ')}`);
  }
  let fixture: FixtureServer | undefined;
  try {
    fixture = await startFixtureServer(
      input.authOrigin, input.storageOrigin, undefined, input.bucket, input.objectRoot, engines,
    );
    const results: BrowserEngineResult[] = [];
    for (const engine of engines) {
      results.push(await runEngine(engine, fixture.fixtureOrigin, input));
    }
    return { engines: results };
  } finally {
    if (fixture !== undefined) await closeFixtureServer(fixture);
  }
}

export async function runBrowserAutoFormUploadAcceptance(
  input: BrowserAcceptanceInput,
): Promise<AutoFormBrowserAcceptanceResult> {
  const engines = requiredBrowserEngines();
  const available = new Set(availableBrowserEngines());
  const missing = engines.filter(engine => !available.has(engine));
  if (missing.length > 0) {
    throw new Error(`AutoForm upload browser acceptance requires all engines; missing: ${missing.join(', ')}`);
  }
  let fixture: FixtureServer | undefined;
  try {
    fixture = await startFixtureServer(
      input.authOrigin, input.storageOrigin, undefined, input.bucket, input.objectRoot, engines,
    );
    const results: AutoFormBrowserEngineResult[] = [];
    for (const engine of engines) {
      results.push(await runAutoFormEngine(engine, fixture.fixtureOrigin, input));
    }
    return { engines: results };
  } finally {
    if (fixture !== undefined) await closeFixtureServer(fixture);
  }
}

export async function runBrowserAutoFormRecordAcceptance(
  input: AutoFormRecordBrowserAcceptanceInput,
): Promise<AutoFormRecordBrowserAcceptanceResult> {
  const engines = requiredBrowserEngines();
  const available = new Set(availableBrowserEngines());
  const missing = engines.filter(engine => !available.has(engine));
  if (missing.length > 0) {
    throw new Error(`AutoForm record browser acceptance requires all engines; missing: ${missing.join(', ')}`);
  }
  let fixture: FixtureServer | undefined;
  try {
    fixture = await startFixtureServer(
      input.authOrigin, input.storageOrigin, input.restOrigin, input.bucket, input.objectRoot, engines,
    );
    const results: AutoFormRecordEngineResult[] = [];
    for (const engine of engines) {
      results.push(await runAutoFormRecordEngine(engine, fixture.fixtureOrigin, input));
    }
    return { engines: results };
  } finally {
    if (fixture !== undefined) await closeFixtureServer(fixture);
  }
}

export async function runBrowserResourceWorkspaceAcceptance(
  input: WorkspaceBrowserAcceptanceInput,
): Promise<WorkspaceBrowserAcceptanceResult> {
  const engines = requiredBrowserEngines();
  const available = new Set(availableBrowserEngines());
  const missing = engines.filter(engine => !available.has(engine));
  if (missing.length > 0) {
    throw new Error(`Resource workspace browser acceptance requires all engines; missing: ${missing.join(', ')}`);
  }
  let fixture: FixtureServer | undefined;
  try {
    fixture = await startFixtureServer(
      input.authOrigin, input.storageOrigin, input.restOrigin, input.bucket, input.objectRoot, engines,
    );
    const results: WorkspaceEngineResult[] = [];
    for (const engine of engines) {
      results.push(await runWorkspaceEngine(engine, fixture.fixtureOrigin, input));
    }
    return { engines: results };
  } finally {
    if (fixture !== undefined) await closeFixtureServer(fixture);
  }
}
