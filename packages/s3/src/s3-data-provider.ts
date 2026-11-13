import type { BaseRecord, DataProvider, Filter, GetListParams, Pagination, Sort } from '@svadmin/core';
import { awsUriEncode, canonicalQueryString, encodeObjectKey, signAwsV4 } from './sigv4.js';
import { parseListBucketResult, parseS3Error, type ListBucketPage, type ListedObject } from './xml.js';

const DEFAULT_RESOURCE = 'objects';
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_LIST_KEYS = 5_000;
const MAX_PAGE_SIZE = 1_000;

export interface FetchLike {
  (input: string, init?: FetchInit): Promise<FetchResponse>;
}

export interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  redirect?: 'error' | 'follow' | 'manual';
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
  headers: { get(name: string): string | null };
}

export type S3ObjectKind = 'object' | 'prefix';
export type S3BodyOmittedReason = 'disabled' | 'too-large' | 'unsupported-type';

/** One object or common prefix. `resource` is the configured object collection, not a dataset name. */
export interface S3ObjectRecord extends BaseRecord {
  id: string;
  key: string;
  name: string;
  kind: S3ObjectKind;
  size: number | null;
  lastModified: string | null;
  etag: string | null;
  contentType: string | null;
  storageClass: string | null;
  bucket: string;
  body?: string;
  bodyOmittedReason?: S3BodyOmittedReason;
}

export interface S3DataProviderOptions {
  /** S3-compatible origin, for example `https://s3.us-east-1.amazonaws.com` or `http://127.0.0.1:9000`. */
  endpoint?: string;
  region?: string;
  bucket?: string;
  /** Key prefix applied to every list and get. Folder prefixes should end with `/`. */
  prefix?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  /**
   * Path-style URLs (`/{bucket}/{key}`). Defaults to true for custom endpoints
   * such as MinIO, and false for the default AWS regional endpoint.
   */
  forcePathStyle?: boolean;
  /** DataProvider resource name. Defaults to `objects`. */
  resource?: string;
  /** Common-prefix delimiter. Defaults to `/`. Pass an empty string for a flat listing. */
  delimiter?: string;
  /**
   * Largest text/json/xml object body `getOne` may inline. `0` keeps responses metadata-only.
   * Callers cannot raise this ceiling through request meta.
   */
  maxInlineBodyBytes?: number;
  /**
   * Largest number of keys a non-cursor list may scan before failing closed.
   * Cursor pagination is the way to walk a large bucket.
   */
  maxListKeys?: number;
  /**
   * When true, missing credentials list a public bucket without signing.
   * A half-set key pair still fails closed. Defaults to false.
   */
  allowAnonymous?: boolean;
  fetch?: FetchLike;
  now?: () => Date;
  /**
   * Credential source used when an option is omitted.
   * Pass `{}` in tests so ambient process environment is ignored.
   * When omitted, `SVADMIN_S3_*` and the standard `AWS_*` variables are read.
   */
  env?: Readonly<Record<string, string | undefined>>;
}

interface ResolvedConfig {
  endpoint: string;
  region: string;
  bucket: string;
  prefix: string;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  sessionToken: string | undefined;
  forcePathStyle: boolean;
  resource: string;
  delimiter: string;
  maxInlineBodyBytes: number;
  maxListKeys: number;
  fetch: FetchLike;
  now: () => Date;
  protocol: string;
  host: string;
  basePath: string;
}

interface ObjectEntry {
  key: string;
  kind: S3ObjectKind;
  size: number | null;
  lastModified: string | null;
  etag: string | null;
  storageClass: string | null;
}

interface ListConstraints {
  prefix: string;
  kind: S3ObjectKind | null;
  exactKey: string | null;
}

/** HTTP failure from a read. `statusCode` is visible to svadmin query errors without importing the core runtime. */
export class S3RequestError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'S3RequestError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** 写操作一律在发出请求前拒绝，避免只读适配器变成上传或删除通道。 */
export class S3ReadOnlyError extends Error {
  readonly code = 'S3_READ_ONLY' as const;

  constructor() {
    super('@svadmin/s3 is a read-only object DataProvider. create, update, delete, upload, and copy are disabled; no request was sent.');
    this.name = 'S3ReadOnlyError';
  }
}

const ENV_KEYS = {
  endpoint: ['SVADMIN_S3_ENDPOINT', 'AWS_ENDPOINT_URL_S3'],
  region: ['SVADMIN_S3_REGION', 'AWS_REGION', 'AWS_DEFAULT_REGION'],
  bucket: ['SVADMIN_S3_BUCKET'],
  prefix: ['SVADMIN_S3_PREFIX'],
  accessKeyId: ['SVADMIN_S3_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID'],
  secretAccessKey: ['SVADMIN_S3_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY'],
  sessionToken: ['SVADMIN_S3_SESSION_TOKEN', 'AWS_SESSION_TOKEN'],
  forcePathStyle: ['SVADMIN_S3_FORCE_PATH_STYLE'],
} as const;

function readProcessEnv(): Readonly<Record<string, string | undefined>> | undefined {
  const runtime = globalThis as { process?: { env?: Readonly<Record<string, string | undefined>> } };
  return runtime.process?.env;
}

function environmentValue(options: S3DataProviderOptions, keys: readonly string[]): string | undefined {
  const source = options.env ?? readProcessEnv();
  if (source === undefined) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return undefined;
}

function optionOrEnv(explicit: string | undefined, options: S3DataProviderOptions, keys: readonly string[]): string | undefined {
  if (explicit !== undefined) {
    const trimmed = explicit.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return environmentValue(options, keys);
}

function normalizeKey(value: string, label: string): string {
  const key = value.replace(/\\/gu, '/').replace(/^\/+/u, '');
  if (key.includes('\0') || key.split('/').includes('..')) {
    throw new Error(`@svadmin/s3 rejected ${label} because it escapes the configured prefix`);
  }
  return key;
}

function joinPrefix(base: string, extra: string): string {
  const left = normalizeKey(base, 'prefix');
  const right = normalizeKey(extra, 'prefix');
  if (left === '') return right;
  if (right === '') return left;
  return `${left.replace(/\/$/u, '')}/${right.replace(/^\/+/u, '')}`;
}

function resolveObjectKey(prefix: string, id: string): string {
  const base = normalizeKey(prefix, 'prefix');
  const key = normalizeKey(id, 'object key');
  if (base === '') return key;
  const boundary = base.endsWith('/') ? base : `${base}/`;
  if (key === base || key.startsWith(boundary)) return key;
  return joinPrefix(base, key);
}

function assertResourceName(resource: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/u.test(resource)) {
    throw new Error('@svadmin/s3 resource name must be a short identifier such as "objects"');
  }
  return resource;
}

function assertBucket(bucket: string): string {
  if (bucket.length === 0 || bucket.length > 255 || /[\s/?#\\]/u.test(bucket) || bucket.includes('..')) {
    throw new Error('@svadmin/s3 bucket name is invalid');
  }
  return bucket;
}

function parseEndpoint(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('@svadmin/s3 endpoint must be an absolute http(s) URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('@svadmin/s3 endpoint must use http or https');
  }
  if (url.username !== '' || url.password !== '') {
    throw new Error('@svadmin/s3 endpoint must not embed credentials');
  }
  return url;
}

function isIpHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost') || /^[\d.]+$/u.test(hostname) || hostname.includes(':');
}

function defaultForcePathStyle(endpoint: string | undefined, hostname: string): boolean {
  if (endpoint === undefined) return false;
  if (isIpHost(hostname)) return true;
  return !hostname.endsWith('.amazonaws.com');
}

function parseForcePathStyle(explicit: boolean | undefined, raw: string | undefined, endpoint: string | undefined, hostname: string): boolean {
  if (explicit !== undefined) return explicit;
  if (raw === undefined) return defaultForcePathStyle(endpoint, hostname);
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  throw new Error('@svadmin/s3 forcePathStyle must be true or false');
}

function assertPositiveInteger(value: number, label: string, max: number): number {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`@svadmin/s3 ${label} must be an integer from 1 to ${max}`);
  }
  return value;
}

function defaultFetch(): FetchLike {
  const candidate = (globalThis as { fetch?: FetchLike }).fetch;
  if (candidate === undefined) throw new Error('@svadmin/s3 requires fetch. Pass options.fetch on this runtime.');
  return candidate;
}

function assertServerContext(): void {
  // 浏览器包里出现访问密钥就直接拒绝，避免宿主把 DataProvider 打进客户端。
  if ((globalThis as { window?: unknown }).window !== undefined) {
    throw new Error('@svadmin/s3 is for a trusted server. It refuses to start in a browser context, where access keys would ship in the bundle.');
  }
}

function resolveConfig(options: S3DataProviderOptions): ResolvedConfig {
  assertServerContext();
  const region = optionOrEnv(options.region, options, ENV_KEYS.region) ?? DEFAULT_REGION;
  const endpointOption = optionOrEnv(options.endpoint, options, ENV_KEYS.endpoint);
  const endpoint = (endpointOption ?? `https://s3.${region}.amazonaws.com`).replace(/\/$/u, '');
  const endpointUrl = parseEndpoint(endpoint);
  const bucket = assertBucket(optionOrEnv(options.bucket, options, ENV_KEYS.bucket) ?? '');
  const accessKeyId = optionOrEnv(options.accessKeyId, options, ENV_KEYS.accessKeyId);
  const secretAccessKey = optionOrEnv(options.secretAccessKey, options, ENV_KEYS.secretAccessKey);
  const sessionToken = optionOrEnv(options.sessionToken, options, ENV_KEYS.sessionToken);
  if ((accessKeyId === undefined) !== (secretAccessKey === undefined)) {
    throw new Error('@svadmin/s3 requires both an access key and a secret, or neither when allowAnonymous is true');
  }
  if (accessKeyId === undefined && options.allowAnonymous !== true) {
    throw new Error('@svadmin/s3 requires accessKeyId and secretAccessKey. Pass allowAnonymous only for a public bucket.');
  }
  if (sessionToken !== undefined && accessKeyId === undefined) {
    throw new Error('@svadmin/s3 session token requires an access key and secret');
  }
  const forcePathStyle = parseForcePathStyle(
    options.forcePathStyle,
    environmentValue(options, ENV_KEYS.forcePathStyle),
    endpointOption,
    endpointUrl.hostname,
  );
  if (!forcePathStyle && isIpHost(endpointUrl.hostname)) {
    throw new Error('@svadmin/s3 IP and localhost endpoints require forcePathStyle: true');
  }
  const basePath = endpointUrl.pathname.replace(/\/$/u, '');
  const host = forcePathStyle ? endpointUrl.host : `${bucket}.${endpointUrl.host}`;
  const maxInlineBodyBytes = options.maxInlineBodyBytes ?? 0;
  if (!Number.isInteger(maxInlineBodyBytes) || maxInlineBodyBytes < 0 || maxInlineBodyBytes > 1_048_576) {
    throw new Error('@svadmin/s3 maxInlineBodyBytes must be an integer from 0 to 1048576');
  }
  const maxListKeys = options.maxListKeys ?? DEFAULT_MAX_LIST_KEYS;
  if (!Number.isInteger(maxListKeys) || maxListKeys < 1) {
    throw new Error('@svadmin/s3 maxListKeys must be a positive integer');
  }
  return {
    endpoint,
    region,
    bucket,
    prefix: normalizeKey(optionOrEnv(options.prefix, options, ENV_KEYS.prefix) ?? '', 'prefix'),
    accessKeyId,
    secretAccessKey,
    sessionToken,
    forcePathStyle,
    resource: assertResourceName(options.resource ?? DEFAULT_RESOURCE),
    delimiter: options.delimiter ?? '/',
    maxInlineBodyBytes,
    maxListKeys,
    fetch: options.fetch ?? defaultFetch(),
    now: options.now ?? (() => new Date()),
    protocol: endpointUrl.protocol,
    host,
    basePath: basePath === '/' ? '' : basePath,
  };
}

function assertResource(resource: string, expected: string): void {
  if (resource !== expected) {
    throw new Error(`@svadmin/s3 only serves the configured resource "${expected}"`);
  }
}

function rejectWrite(): Promise<never> {
  return Promise.reject(new S3ReadOnlyError());
}

function redact(value: string, config: ResolvedConfig): string {
  let output = value;
  for (const secret of [config.secretAccessKey, config.sessionToken]) {
    if (secret === undefined || secret.length < 4) continue;
    output = output.split(secret).join('[redacted]');
  }
  return output;
}

function objectName(key: string): string {
  const segments = key.split('/').filter((part) => part.length > 0);
  return segments.length > 0 ? segments[segments.length - 1] ?? key : key;
}

function toRecord(bucket: string, entry: ObjectEntry, extra?: Pick<S3ObjectRecord, 'contentType' | 'body' | 'bodyOmittedReason'>): S3ObjectRecord {
  const record: S3ObjectRecord = {
    id: entry.key,
    key: entry.key,
    name: objectName(entry.key),
    kind: entry.kind,
    size: entry.size,
    lastModified: entry.lastModified,
    etag: entry.etag,
    contentType: extra?.contentType ?? null,
    storageClass: entry.storageClass,
    bucket,
  };
  if (extra?.body !== undefined) record.body = extra.body;
  if (extra?.bodyOmittedReason !== undefined) record.bodyOmittedReason = extra.bodyOmittedReason;
  return record;
}

function assertSort(sorters: readonly Sort[] | undefined): void {
  if (sorters === undefined || sorters.length === 0) return;
  const sorter = sorters[0];
  if (sorters.length === 1 && sorter?.field === 'key' && sorter.order === 'asc') return;
  throw new Error('@svadmin/s3 only supports key ascending order, which is the S3 listing order');
}

function stringFilter(value: unknown, operator: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`@svadmin/s3 filter ${operator} expects a non-empty string`);
  }
  return value;
}

function prefixFromMeta(basePrefix: string, meta: GetListParams['meta']): string {
  const metaPrefix = meta?.['prefix'];
  if (metaPrefix === undefined) return basePrefix;
  if (typeof metaPrefix !== 'string') throw new Error('@svadmin/s3 meta.prefix must be a string');
  return resolveObjectKey(basePrefix, metaPrefix);
}

function constraintsFrom(params: GetListParams, basePrefix: string): ListConstraints {
  let prefix = prefixFromMeta(basePrefix, params.meta);
  let kind: S3ObjectKind | null = null;
  let exactKey: string | null = null;
  for (const filter of params.filters ?? []) {
    if (!('field' in filter)) {
      throw new Error(`@svadmin/s3 does not support logical filter "${filter.operator}"`);
    }
    applyFieldFilter(filter, { prefix, kind, exactKey }, (next) => {
      prefix = next.prefix;
      kind = next.kind;
      exactKey = next.exactKey;
    });
  }
  if (exactKey !== null) prefix = exactKey;
  return { prefix, kind, exactKey };
}

function applyFieldFilter(
  filter: Extract<Filter, { field: string }>,
  current: ListConstraints,
  assign: (next: ListConstraints) => void,
): void {
  if (filter.field === 'kind') {
    if (filter.operator !== 'eq') throw new Error('@svadmin/s3 kind filters only support eq');
    if (filter.value !== 'object' && filter.value !== 'prefix') {
      throw new Error('@svadmin/s3 kind filter must be "object" or "prefix"');
    }
    assign({ ...current, kind: filter.value });
    return;
  }
  if (filter.field !== 'key' && filter.field !== 'prefix') {
    throw new Error(`@svadmin/s3 does not support filtering on "${filter.field}"`);
  }
  if (filter.operator !== 'eq' && filter.operator !== 'startswith' && filter.operator !== 'startswiths') {
    throw new Error(`@svadmin/s3 does not support ${filter.field} filter "${filter.operator}". Use eq or startswith, or narrow meta.prefix.`);
  }
  const resolved = resolveObjectKey(current.prefix, normalizeKey(stringFilter(filter.value, filter.operator), 'filter'));
  if (filter.operator === 'eq') {
    assign({ ...current, prefix: resolved, exactKey: resolved });
    return;
  }
  assign({ ...current, prefix: resolved });
}

function matches(entry: ObjectEntry, constraints: ListConstraints): boolean {
  if (constraints.kind !== null && entry.kind !== constraints.kind) return false;
  if (constraints.exactKey !== null && entry.key !== constraints.exactKey) return false;
  return entry.key.startsWith(constraints.prefix);
}

function mergePage(page: ListBucketPage): ObjectEntry[] {
  const entries: ObjectEntry[] = [
    ...page.prefixes.map((key) => ({
      key,
      kind: 'prefix' as const,
      size: null,
      lastModified: null,
      etag: null,
      storageClass: null,
    })),
    ...page.objects.map((object) => objectEntry(object)),
  ];
  entries.sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
  return entries;
}

function objectEntry(object: ListedObject): ObjectEntry {
  return {
    key: object.key,
    kind: 'object',
    size: object.size,
    lastModified: object.lastModified,
    etag: object.etag,
    storageClass: object.storageClass,
  };
}

function pageRequest(pagination: Pagination | undefined): { mode: string; pageSize: number; offset: number; cursor: string | undefined } {
  const mode = pagination?.mode ?? 'server';
  const pageSize = assertPositiveInteger(pagination?.pageSize ?? DEFAULT_PAGE_SIZE, 'pageSize', MAX_PAGE_SIZE);
  const current = pagination?.current ?? 1;
  if (!Number.isInteger(current) || current < 1) throw new Error('@svadmin/s3 pagination.current must be an integer starting at 1');
  const cursor = pagination?.cursor;
  return {
    mode,
    pageSize,
    offset: (current - 1) * pageSize,
    cursor: typeof cursor === 'string' && cursor.length > 0 ? cursor : undefined,
  };
}

function inlineLimit(config: ResolvedConfig, meta: GetListParams['meta']): number {
  if (meta?.['includeBody'] === false) return 0;
  const requested = meta?.['maxInlineBodyBytes'];
  if (typeof requested !== 'number' || !Number.isInteger(requested) || requested < 0) return config.maxInlineBodyBytes;
  return Math.min(config.maxInlineBodyBytes, requested);
}

function isInlineType(contentType: string): boolean {
  const type = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return type.startsWith('text/') || type === 'application/json' || type === 'application/xml' || type.endsWith('+json') || type.endsWith('+xml');
}

function toIso(value: string | null): string | null {
  if (value === null || value.length === 0) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

function listUri(config: ResolvedConfig): string {
  if (!config.forcePathStyle) return config.basePath === '' ? '/' : `${config.basePath}/`;
  return `${config.basePath}/${awsUriEncode(config.bucket)}`;
}

function objectUri(config: ResolvedConfig, key: string): string {
  const encodedKey = encodeObjectKey(key);
  if (!config.forcePathStyle) return `${config.basePath}/${encodedKey}`;
  return `${config.basePath}/${awsUriEncode(config.bucket)}/${encodedKey}`;
}

async function signedRequest(
  config: ResolvedConfig,
  method: 'GET' | 'HEAD',
  canonicalUri: string,
  query: readonly (readonly [string, string])[],
): Promise<FetchResponse> {
  const canonicalQuery = canonicalQueryString(query);
  const headers: Record<string, string> = {};
  if (config.accessKeyId !== undefined && config.secretAccessKey !== undefined) {
    const signed = signAwsV4({
      method,
      host: config.host,
      canonicalUri,
      query,
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      ...(config.sessionToken === undefined ? {} : { sessionToken: config.sessionToken }),
      now: config.now(),
    });
    Object.assign(headers, signed.headers);
  }
  const url = `${config.protocol}//${config.host}${canonicalUri}${canonicalQuery === '' ? '' : `?${canonicalQuery}`}`;
  try {
    return await config.fetch(url, { method, headers, redirect: 'error' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'request failed';
    throw new Error(`@svadmin/s3 request failed: ${redact(message, config)}`, { cause: error });
  }
}

async function requestText(config: ResolvedConfig, method: 'GET' | 'HEAD', canonicalUri: string, query: readonly (readonly [string, string])[]): Promise<FetchResponse> {
  const response = await signedRequest(config, method, canonicalUri, query);
  if (!response.ok) {
    const body = method === 'HEAD' ? '' : await response.text();
    const parsed = parseS3Error(body);
    const code = parsed.code ?? (response.status === 404 ? 'NoSuchKey' : 'S3Error');
    const fallback = response.status === 404 ? 'object was not found' : response.statusText || 'request failed';
    const message = redact(parsed.message ?? fallback, config);
    throw new S3RequestError(`@svadmin/s3 ${code}: ${message}`, response.status, code);
  }
  return response;
}

async function listPage(config: ResolvedConfig, prefix: string, continuationToken: string | undefined, maxKeys: number): Promise<ListBucketPage> {
  const query: (readonly [string, string])[] = [
    ['list-type', '2'],
    ['encoding-type', 'url'],
    ['max-keys', String(maxKeys)],
  ];
  if (prefix !== '') query.push(['prefix', prefix]);
  if (config.delimiter !== '') query.push(['delimiter', config.delimiter]);
  if (continuationToken !== undefined) query.push(['continuation-token', continuationToken]);
  const response = await requestText(config, 'GET', listUri(config), query);
  return parseListBucketResult(await response.text());
}

/**
 * Read-only DataProvider for one bucket prefix.
 * `getList` and `getOne` observe objects. Every mutation fails closed before any network call.
 */
export function createS3DataProvider(options: S3DataProviderOptions = {}): DataProvider {
  const config = resolveConfig(options);

  async function listEntries(constraints: ListConstraints, pagination: Pagination | undefined) {
    const request = pageRequest(pagination);
    const fullScan = request.mode === 'off' || request.mode === 'client';
    if (request.mode === 'cursor') {
      const page = await listPage(config, constraints.prefix, request.cursor, Math.min(request.pageSize, config.maxListKeys));
      const entries = mergePage(page).filter((entry) => matches(entry, constraints));
      return {
        entries,
        total: entries.length,
        cursor: {
          nextCursor: page.nextContinuationToken,
          hasNextPage: page.isTruncated,
          hasPreviousPage: request.cursor !== undefined,
        },
      };
    }

    const limit = fullScan ? config.maxListKeys : request.pageSize;
    const offset = fullScan ? 0 : request.offset;
    const selected: ObjectEntry[] = [];
    let matched = 0;
    let scanned = 0;
    let token: string | undefined;
    let truncated = true;
    while (truncated) {
      if (scanned >= config.maxListKeys) {
        throw new Error(`@svadmin/s3 stopped after scanning ${config.maxListKeys} keys. Narrow the prefix or use cursor pagination.`);
      }
      const page = await listPage(config, constraints.prefix, token, Math.min(MAX_PAGE_SIZE, config.maxListKeys - scanned));
      const rawCount = page.objects.length + page.prefixes.length;
      if (rawCount === 0) break;
      const entries = mergePage(page).filter((entry) => matches(entry, constraints));
      scanned += rawCount;
      for (const entry of entries) {
        if (matched >= offset && selected.length < limit) selected.push(entry);
        matched += 1;
      }
      truncated = page.isTruncated;
      if (!truncated) break;
      if (page.nextContinuationToken === null || page.nextContinuationToken === token) {
        throw new Error('@svadmin/s3 listing was truncated without a new continuation token');
      }
      token = page.nextContinuationToken;
    }
    return { entries: selected, total: matched, cursor: undefined };
  }

  return {
    getApiUrl: () => new URL(config.endpoint).origin,

    async getList(params) {
      assertResource(params.resource, config.resource);
      assertSort(params.sorters);
      const constraints = constraintsFrom(params, config.prefix);
      const listed = await listEntries(constraints, params.pagination);
      return {
        data: listed.entries.map((entry) => toRecord(config.bucket, entry)),
        total: listed.total,
        ...(listed.cursor === undefined ? {} : { cursor: listed.cursor }),
      };
    },

    async getOne(params) {
      assertResource(params.resource, config.resource);
      const key = resolveObjectKey(prefixFromMeta(config.prefix, params.meta), String(params.id));
      if (key === '') throw new Error('@svadmin/s3 object id is required');
      const folder = config.delimiter !== '' && key.endsWith(config.delimiter);
      if (folder) return { data: await prefixRecord(config, key) };
      return { data: await objectRecord(config, key, inlineLimit(config, params.meta)) };
    },

    async getMany(params) {
      assertResource(params.resource, config.resource);
      const data = [];
      for (const id of params.ids) {
        const one = await this.getOne({ resource: params.resource, id, ...(params.meta === undefined ? {} : { meta: params.meta }) });
        data.push(one.data);
      }
      return { data };
    },

    create: () => rejectWrite(),
    createMany: () => rejectWrite(),
    update: () => rejectWrite(),
    updateMany: () => rejectWrite(),
    deleteOne: () => rejectWrite(),
    deleteMany: () => rejectWrite(),
    custom: () => rejectWrite(),
  };
}

async function prefixRecord(config: ResolvedConfig, key: string): Promise<S3ObjectRecord> {
  const page = await listPage(config, key, undefined, 1);
  if (page.objects.length === 0 && page.prefixes.length === 0) {
    throw new S3RequestError(`@svadmin/s3 NoSuchKey: prefix ${key} was not found`, 404, 'NoSuchKey');
  }
  return toRecord(config.bucket, {
    key,
    kind: 'prefix',
    size: null,
    lastModified: null,
    etag: null,
    storageClass: null,
  });
}

async function objectRecord(config: ResolvedConfig, key: string, maxBytes: number): Promise<S3ObjectRecord> {
  const response = await requestText(config, 'HEAD', objectUri(config, key), []);
  const contentType = response.headers.get('content-type');
  const lengthHeader = response.headers.get('content-length');
  const size = lengthHeader === null ? null : Number(lengthHeader);
  const entry: ObjectEntry = {
    key,
    kind: 'object',
    size: size !== null && Number.isFinite(size) ? size : null,
    lastModified: toIso(response.headers.get('last-modified')),
    etag: stripHeaderEtag(response.headers.get('etag')),
    storageClass: response.headers.get('x-amz-storage-class'),
  };
  const inline = await inlineBody(config, key, contentType, entry.size, maxBytes);
  return toRecord(config.bucket, entry, {
    contentType,
    ...(inline.body === undefined ? {} : { body: inline.body }),
    ...(inline.bodyOmittedReason === undefined ? {} : { bodyOmittedReason: inline.bodyOmittedReason }),
  });
}

function stripHeaderEtag(value: string | null): string | null {
  if (value === null) return null;
  const unquoted = value.startsWith('W/') ? value.slice(2) : value;
  if (unquoted.startsWith('"') && unquoted.endsWith('"')) return unquoted.slice(1, -1);
  return unquoted;
}

async function inlineBody(
  config: ResolvedConfig,
  key: string,
  contentType: string | null,
  size: number | null,
  maxBytes: number,
): Promise<{ body?: string; bodyOmittedReason?: S3BodyOmittedReason }> {
  if (maxBytes <= 0) return { bodyOmittedReason: 'disabled' };
  if (contentType === null || !isInlineType(contentType)) return { bodyOmittedReason: 'unsupported-type' };
  if (size === null || size > maxBytes) return { bodyOmittedReason: 'too-large' };
  const response = await requestText(config, 'GET', objectUri(config, key), []);
  const body = await response.text();
  if (body.length > maxBytes) return { bodyOmittedReason: 'too-large' };
  return { body };
}
