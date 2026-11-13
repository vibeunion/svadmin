import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'bun:test';
import { createS3DataProvider, S3ReadOnlyError, S3RequestError, type FetchLike, type FetchResponse, type S3DataProviderOptions } from './index.js';
import { signAwsV4 } from './sigv4.js';
import { parseListBucketResult } from './xml.js';

const ACCESS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
const NOW = new Date('2013-05-24T00:00:00.000Z');

interface FixtureObject {
  key: string;
  size: number;
  contentType: string;
  body: string;
  lastModified: string;
  etag: string;
  storageClass: string;
}

const FIXTURES: readonly FixtureObject[] = [
  { key: 'notes/archive/old.txt', size: 3, contentType: 'text/plain', body: 'old', lastModified: '2026-01-01T00:00:00.000Z', etag: 'old', storageClass: 'STANDARD' },
  { key: 'notes/blob.bin', size: 4, contentType: 'application/octet-stream', body: '....', lastModified: '2026-01-02T00:00:00.000Z', etag: 'blob', storageClass: 'STANDARD' },
  { key: 'notes/data.json', size: 11, contentType: 'application/json; charset=utf-8', body: '{"ok":true}', lastModified: '2026-01-03T00:00:00.000Z', etag: 'json', storageClass: 'STANDARD' },
  { key: 'notes/huge.txt', size: 999_999, contentType: 'text/plain', body: 'too-large', lastModified: '2026-01-04T00:00:00.000Z', etag: 'huge', storageClass: 'STANDARD' },
  { key: 'notes/readme.txt', size: 5, contentType: 'text/plain', body: 'hello', lastModified: '2026-01-05T00:00:00.000Z', etag: 'readme', storageClass: 'STANDARD' },
  { key: 'photos/cat.jpg', size: 8, contentType: 'image/jpeg', body: 'jpegdata', lastModified: '2026-01-06T00:00:00.000Z', etag: 'cat', storageClass: 'STANDARD' },
  { key: 'reports/a b.txt', size: 4, contentType: 'text/plain', body: 'a & b', lastModified: '2026-01-07T00:00:00.000Z', etag: 'space', storageClass: 'STANDARD' },
];

function xmlEscape(value: string): string {
  return value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
}

function parseQuery(url: string): Map<string, string> {
  const query = url.split('?')[1] ?? '';
  const params = new Map<string, string>();
  if (query === '') return params;
  for (const part of query.split('&')) {
    const [rawKey, rawValue = ''] = part.split('=');
    params.set(decodeURIComponent(rawKey ?? ''), decodeURIComponent(rawValue));
  }
  return params;
}

function listedEntries(prefix: string, delimiter: string): Array<{ kind: 'object' | 'prefix'; key: string; object?: FixtureObject }> {
  const entries: Array<{ kind: 'object' | 'prefix'; key: string; object?: FixtureObject }> = [];
  const seen = new Set<string>();
  for (const object of FIXTURES) {
    if (!object.key.startsWith(prefix)) continue;
    const rest = object.key.slice(prefix.length);
    if (delimiter !== '') {
      const splitAt = rest.indexOf(delimiter);
      if (splitAt >= 0) {
        const common = `${prefix}${rest.slice(0, splitAt)}${delimiter}`;
        if (!seen.has(common)) {
          seen.add(common);
          entries.push({ kind: 'prefix', key: common });
        }
        continue;
      }
    }
    entries.push({ kind: 'object', key: object.key, object });
  }
  entries.sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
  return entries;
}

function listXml(prefix: string, delimiter: string, maxKeys: number, token: string | undefined): string {
  const entries = listedEntries(prefix, delimiter);
  const start = token === undefined ? 0 : entries.findIndex((entry) => entry.key === token) + 1;
  const page = entries.slice(start, start + maxKeys);
  const truncated = start + maxKeys < entries.length;
  const objects = page.filter((entry) => entry.kind === 'object').map((entry) => {
    const object = entry.object;
    if (object === undefined) return '';
    return `<Contents><Key>${xmlEscape(encodeURIComponent(object.key))}</Key><LastModified>${object.lastModified}</LastModified><ETag>&quot;${object.etag}&quot;</ETag><Size>${object.size}</Size><StorageClass>${object.storageClass}</StorageClass></Contents>`;
  }).join('');
  const prefixes = page.filter((entry) => entry.kind === 'prefix').map((entry) =>
    `<CommonPrefixes><Prefix>${xmlEscape(encodeURIComponent(entry.key))}</Prefix></CommonPrefixes>`,
  ).join('');
  const next = truncated ? page[page.length - 1]?.key : undefined;
  return `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><EncodingType>url</EncodingType><IsTruncated>${truncated}</IsTruncated><KeyCount>${page.length}</KeyCount>${objects}${prefixes}${next === undefined ? '' : `<NextContinuationToken>${xmlEscape(encodeURIComponent(next))}</NextContinuationToken>`}</ListBucketResult>`;
}

function headerResponse(status: number, headers: Record<string, string>, body = ''): FetchResponse {
  const normalized = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? `missing ${SECRET}` : 'OK',
    headers: { get: (name: string) => normalized.get(name.toLowerCase()) ?? null },
    text: () => Promise.resolve(body),
  };
}

function createHarness(overrides: Partial<S3DataProviderOptions> = {}) {
  const calls: Array<{ method: string; url: string; headers: Record<string, string> }> = [];
  const fetchImpl: FetchLike = (url, init) => {
    const method = init?.method ?? 'GET';
    calls.push({ method, url, headers: init?.headers ?? {} });
    if (method !== 'GET' && method !== 'HEAD') {
      throw new Error(`unexpected write method ${method}`);
    }
    const parsed = new URL(url);
    const bucketName = overrides.bucket ?? 'fixtures';
    const parts = parsed.pathname.split('/').filter((part) => part.length > 0).map((part) => decodeURIComponent(part));
    const virtualHost = parsed.hostname.startsWith(`${bucketName}.`);
    const bucket = virtualHost ? bucketName : parts[0];
    const key = (virtualHost ? parts : parts.slice(1)).join('/');
    if (parsed.searchParams.has('list-type') || parsed.search.includes('list-type=2')) {
      const query = parseQuery(url);
      const prefix = query.get('prefix') ?? '';
      const delimiter = query.get('delimiter') ?? '';
      const maxKeys = Number(query.get('max-keys') ?? '1000');
      const token = query.get('continuation-token');
      return Promise.resolve(headerResponse(200, {}, listXml(prefix, delimiter, maxKeys, token)));
    }
    const object = FIXTURES.find((item) => item.key === key);
    if (bucket !== (overrides.bucket ?? 'fixtures') || object === undefined) {
      return Promise.resolve(headerResponse(404, {}, `<Error><Code>NoSuchKey</Code><Message>missing ${SECRET}</Message></Error>`));
    }
    if (method === 'HEAD') {
      return Promise.resolve(headerResponse(200, {
        'content-type': object.contentType,
        'content-length': String(object.size),
        'last-modified': 'Thu, 01 Jan 2026 00:00:00 GMT',
        etag: `W/"${object.etag}"`,
        'x-amz-storage-class': object.storageClass,
      }));
    }
    return Promise.resolve(headerResponse(200, {
      'content-type': object.contentType,
      'content-length': String(object.body.length),
    }, object.body));
  };
  const provider = createS3DataProvider({
    endpoint: 'http://127.0.0.1:9000',
    region: 'us-east-1',
    bucket: 'fixtures',
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET,
    forcePathStyle: true,
    env: {},
    now: () => NOW,
    fetch: fetchImpl,
    ...overrides,
  });
  return { provider, calls, fetchImpl };
}

describe('createS3DataProvider', () => {
  it('lists objects and common prefixes under a prefix', async () => {
    const { provider, calls } = createHarness();
    const result = await provider.getList({ resource: 'objects', meta: { prefix: 'notes/' } });
    expect(result.total).toBe(5);
    expect(result.data.map((row) => row['key'])).toEqual([
      'notes/archive/',
      'notes/blob.bin',
      'notes/data.json',
      'notes/huge.txt',
      'notes/readme.txt',
    ]);
    expect(result.data[0]).toMatchObject({ kind: 'prefix', size: null, bucket: 'fixtures' });
    expect(result.data[2]).toMatchObject({ kind: 'object', size: 11, etag: 'json', contentType: null });
    const url = calls[0]?.url ?? '';
    expect(url.startsWith('http://127.0.0.1:9000/fixtures?')).toBe(true);
    expect(url).toContain('list-type=2');
    expect(url).toContain('encoding-type=url');
    expect(url).toContain('prefix=notes%2F');
    expect(url).toContain('delimiter=%2F');
    expect(calls[0]?.method).toBe('GET');
    expect(calls[0]?.headers['authorization']).toContain(`Credential=${ACCESS_KEY}/20130524/us-east-1/s3/aws4_request`);
    expect(calls[0]?.headers['authorization']).not.toContain(SECRET);
    const listed = new URL(url);
    const signed = signAwsV4({
      method: 'GET',
      host: listed.host,
      canonicalUri: listed.pathname,
      query: [...parseQuery(url)],
      region: 'us-east-1',
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET,
      now: NOW,
    });
    expect(calls[0]?.headers['authorization']).toBe(signed.headers['authorization']);
    expect(signed.canonicalQuery).toBe(listed.search.slice(1));
    expect(calls.every((call) => call.method === 'GET' || call.method === 'HEAD')).toBe(true);
  });

  it('decodes URL-encoded keys that contain spaces', async () => {
    const { provider } = createHarness();
    const result = await provider.getList({ resource: 'objects', meta: { prefix: 'reports/' } });
    expect(result.data.map((row) => row['key'])).toEqual(['reports/a b.txt']);
  });

  it('paginates with continuation tokens and with offset pages', async () => {
    const { provider, calls } = createHarness();
    const first = await provider.getList({
      resource: 'objects',
      meta: { prefix: 'notes/' },
      pagination: { mode: 'cursor', pageSize: 2 },
    });
    expect(first.data.map((row) => row['key'])).toEqual(['notes/archive/', 'notes/blob.bin']);
    expect(first.cursor).toMatchObject({ hasNextPage: true });
    const nextCursor = typeof first.cursor === 'object' && first.cursor !== null ? first.cursor['nextCursor'] : undefined;
    expect(typeof nextCursor).toBe('string');
    const second = await provider.getList({
      resource: 'objects',
      meta: { prefix: 'notes/' },
      pagination: { mode: 'cursor', pageSize: 2, cursor: String(nextCursor) },
    });
    expect(second.data.map((row) => row['key'])).toEqual(['notes/data.json', 'notes/huge.txt']);
    expect(calls[1]?.url).toContain('continuation-token=');

    const page = await provider.getList({
      resource: 'objects',
      meta: { prefix: 'notes/' },
      pagination: { current: 2, pageSize: 2 },
      filters: [{ field: 'kind', operator: 'eq', value: 'object' }],
    });
    expect(page.total).toBe(4);
    expect(page.data.map((row) => row['key'])).toEqual(['notes/huge.txt', 'notes/readme.txt']);
  });

  it('reads object metadata and inlines only small text or json bodies', async () => {
    const { provider, calls } = createHarness({ maxInlineBodyBytes: 64 });
    const json = await provider.getOne({ resource: 'objects', id: 'data.json', meta: { prefix: 'notes/' } });
    expect(json.data).toMatchObject({
      id: 'notes/data.json',
      key: 'notes/data.json',
      kind: 'object',
      size: 11,
      etag: 'json',
      contentType: 'application/json; charset=utf-8',
      storageClass: 'STANDARD',
      body: '{"ok":true}',
      lastModified: '2026-01-01T00:00:00.000Z',
    });
    expect(calls.map((call) => call.method)).toEqual(['HEAD', 'GET']);

    calls.length = 0;
    const binary = await provider.getOne({ resource: 'objects', id: 'notes/blob.bin' });
    expect(binary.data['body']).toBeUndefined();
    expect(binary.data['bodyOmittedReason']).toBe('unsupported-type');
    expect(calls.map((call) => call.method)).toEqual(['HEAD']);

    calls.length = 0;
    const huge = await provider.getOne({ resource: 'objects', id: 'notes/huge.txt' });
    expect(huge.data['bodyOmittedReason']).toBe('too-large');
    expect(calls.map((call) => call.method)).toEqual(['HEAD']);

    calls.length = 0;
    const folder = await provider.getOne({ resource: 'objects', id: 'notes/archive/' });
    expect(folder.data).toMatchObject({ kind: 'prefix', key: 'notes/archive/' });
    expect(calls[0]?.method).toBe('GET');
  });

  it('keeps metadata-only reads when inline bodies are disabled', async () => {
    const { provider, calls } = createHarness();
    const result = await provider.getOne({ resource: 'objects', id: 'notes/readme.txt' });
    expect(result.data['body']).toBeUndefined();
    expect(result.data['bodyOmittedReason']).toBe('disabled');
    expect(calls.map((call) => call.method)).toEqual(['HEAD']);
  });

  it('does not let request meta raise the body ceiling', async () => {
    const { provider, calls } = createHarness({ maxInlineBodyBytes: 0 });
    const result = await provider.getOne({
      resource: 'objects',
      id: 'notes/readme.txt',
      meta: { maxInlineBodyBytes: 1_000_000, includeBody: true },
    });
    expect(result.data['bodyOmittedReason']).toBe('disabled');
    expect(calls.map((call) => call.method)).toEqual(['HEAD']);
  });

  it('fails closed for every write, upload, copy, and custom call without sending a request', async () => {
    const { provider, calls } = createHarness();
    const writes = [
      provider.create({ resource: 'objects', variables: { key: 'notes/new.txt' } }),
      provider.createMany?.({ resource: 'objects', variables: [{ key: 'notes/new.txt' }] }),
      provider.update({ resource: 'objects', id: 'notes/readme.txt', variables: { body: 'changed' } }),
      provider.updateMany?.({ resource: 'objects', ids: ['notes/readme.txt'], variables: { body: 'changed' } }),
      provider.deleteOne({ resource: 'objects', id: 'notes/readme.txt' }),
      provider.deleteMany?.({ resource: 'objects', ids: ['notes/readme.txt'] }),
      provider.custom?.({ url: 'notes/readme.txt', method: 'put', payload: { copy: true } }),
      provider.custom?.({ url: 'notes/readme.txt', method: 'get' }),
    ];
    for (const write of writes) {
      await expect(write).rejects.toBeInstanceOf(S3ReadOnlyError);
      await expect(write).rejects.toThrow(/read-only/);
    }
    expect(calls).toHaveLength(0);
  });

  it('rejects prefix escape, unknown resources, and unsupported query shapes before fetch', async () => {
    const { provider, calls } = createHarness();
    await expect(provider.getOne({ resource: 'objects', id: '../secret' })).rejects.toThrow(/escapes/);
    await expect(provider.getList({ resource: 'objects', meta: { prefix: 'notes/../secret' } })).rejects.toThrow(/escapes/);
    await expect(provider.getList({ resource: 'other' })).rejects.toThrow(/only serves/);
    await expect(provider.getList({
      resource: 'objects',
      filters: [{ field: 'key', operator: 'contains', value: 'readme' }],
    })).rejects.toThrow(/does not support key filter/);
    await expect(provider.getList({
      resource: 'objects',
      filters: [{ operator: 'or', value: [] }],
    })).rejects.toThrow(/logical filter/);
    await expect(provider.getList({
      resource: 'objects',
      sorters: [{ field: 'size', order: 'desc' }],
    })).rejects.toThrow(/key ascending/);
    expect(calls).toHaveLength(0);
  });

  it('fails closed when an offset listing exceeds the scan cap', async () => {
    const { provider } = createHarness({ maxListKeys: 1 });
    await expect(provider.getList({ resource: 'objects', meta: { prefix: 'notes/' } })).rejects.toThrow(/stopped after scanning 1 keys/);
  });

  it('returns an exact key and does not echo secrets on not-found', async () => {
    const { provider } = createHarness();
    const exact = await provider.getList({
      resource: 'objects',
      filters: [{ field: 'key', operator: 'eq', value: 'notes/readme.txt' }],
    });
    expect(exact.data.map((row) => row['key'])).toEqual(['notes/readme.txt']);
    try {
      await provider.getOne({ resource: 'objects', id: 'notes/missing.txt' });
      throw new Error('expected missing object to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(S3RequestError);
      expect(error instanceof S3RequestError ? error.statusCode : 0).toBe(404);
      expect(error instanceof Error ? error.message : '').toContain('NoSuchKey');
      expect(error instanceof Error ? error.message : '').not.toContain(SECRET);
    }
  });

  it('loads several objects by id', async () => {
    const { provider } = createHarness();
    const result = await provider.getMany?.({ resource: 'objects', ids: ['notes/readme.txt', 'photos/cat.jpg'] });
    expect(result?.data.map((row) => row['key'])).toEqual(['notes/readme.txt', 'photos/cat.jpg']);
  });

  it('uses virtual-hosted AWS URLs when path style is off', async () => {
    const { provider, calls } = createHarness({
      endpoint: 'https://s3.us-east-1.amazonaws.com',
      forcePathStyle: false,
    });
    await provider.getOne({ resource: 'objects', id: 'photos/cat.jpg' });
    expect(calls[0]?.url).toBe('https://fixtures.s3.us-east-1.amazonaws.com/photos/cat.jpg');
    expect(provider.getApiUrl()).toBe('https://s3.us-east-1.amazonaws.com');
  });

  it('signs session tokens and reads configuration from an explicit env map', async () => {
    const seen: string[] = [];
    const fetchImpl: FetchLike = (url, init) => {
      seen.push(url);
      expect(init?.headers?.['x-amz-security-token']).toBe('session-token');
      expect(init?.headers?.['authorization']).not.toContain(SECRET);
      const query = parseQuery(url);
      return Promise.resolve(headerResponse(200, {}, listXml(
        query.get('prefix') ?? '',
        query.get('delimiter') ?? '',
        Number(query.get('max-keys') ?? '10'),
        query.get('continuation-token'),
      )));
    };
    const provider = createS3DataProvider({
      env: {
        SVADMIN_S3_ENDPOINT: 'http://minio.internal:9000',
        SVADMIN_S3_REGION: 'eu-central-1',
        SVADMIN_S3_BUCKET: 'fixtures',
        SVADMIN_S3_PREFIX: 'photos/',
        SVADMIN_S3_ACCESS_KEY_ID: ACCESS_KEY,
        SVADMIN_S3_SECRET_ACCESS_KEY: SECRET,
        SVADMIN_S3_SESSION_TOKEN: 'session-token',
      },
      fetch: fetchImpl,
      now: () => NOW,
    });
    const result = await provider.getList({ resource: 'objects' });
    expect(result.data.map((row) => row['key'])).toEqual(['photos/cat.jpg']);
    expect(seen[0]).toContain('http://minio.internal:9000/fixtures?');
    expect(seen[0]).toContain('prefix=photos%2F');
  });

  it('omits signing for a public bucket only when anonymous access is explicit', async () => {
    const authorizations: string[] = [];
    const fetchImpl: FetchLike = (url, init) => {
      authorizations.push(init?.headers?.['authorization'] ?? '');
      const query = parseQuery(url);
      return Promise.resolve(headerResponse(200, {}, listXml(
        query.get('prefix') ?? '',
        query.get('delimiter') ?? '',
        Number(query.get('max-keys') ?? '10'),
        query.get('continuation-token'),
      )));
    };
    const provider = createS3DataProvider({
      endpoint: 'http://127.0.0.1:9000',
      bucket: 'fixtures',
      allowAnonymous: true,
      env: {},
      fetch: fetchImpl,
    });
    const result = await provider.getList({ resource: 'objects', pagination: { mode: 'cursor', pageSize: 10 } });
    expect(result.data.map((row) => row['kind'])).toEqual(['prefix', 'prefix', 'prefix']);
    expect(authorizations).toEqual(['']);
  });

  it('prefers constructor options over env and rejects incomplete or browser credentials', async () => {
    const { provider, calls } = createHarness({
      bucket: 'fixtures',
      env: { SVADMIN_S3_BUCKET: 'other-bucket', AWS_SECRET_ACCESS_KEY: 'ambient-secret' },
    });
    await provider.getList({ resource: 'objects', pagination: { mode: 'cursor', pageSize: 1 } });
    expect(calls[0]?.url).toContain('http://127.0.0.1:9000/fixtures?');
    expect(calls[0]?.url).not.toContain('other-bucket');
    expect(calls[0]?.headers['authorization']).not.toContain('ambient-secret');

    expect(() => createS3DataProvider({
      endpoint: 'http://127.0.0.1:9000',
      bucket: 'fixtures',
      accessKeyId: ACCESS_KEY,
      env: {},
    })).toThrow(/both an access key and a secret/);
    expect(() => createS3DataProvider({ bucket: 'fixtures', env: {} })).toThrow(/requires accessKeyId/);
    expect(() => createS3DataProvider({
      endpoint: 'http://user:pass@127.0.0.1:9000',
      bucket: 'fixtures',
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET,
      env: {},
    })).toThrow(/must not embed credentials/);

    const runtime = globalThis as { window?: unknown };
    runtime.window = {};
    try {
      expect(() => createS3DataProvider({
        bucket: 'fixtures',
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET,
        env: {},
      })).toThrow(/browser/);
    } finally {
      delete runtime.window;
    }
  });

  it('does not ship write or presign helpers', () => {
    const source = readFileSync(new URL('./s3-data-provider.ts', import.meta.url), 'utf8');
    expect(source.includes("method: 'PUT'")).toBe(false);
    expect(source.includes("method: 'POST'")).toBe(false);
    expect(source.includes("method: 'DELETE'")).toBe(false);
    expect(source.toLowerCase().includes('presign')).toBe(false);
    expect(source.includes('DeleteObject')).toBe(false);
  });
});

describe('signAwsV4', () => {
  it('matches the AWS Signature Version 4 GET Object example', () => {
    const signed = signAwsV4({
      method: 'GET',
      host: 'examplebucket.s3.amazonaws.com',
      canonicalUri: '/test.txt',
      query: [],
      region: 'us-east-1',
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET,
      now: NOW,
      extraHeaders: { range: 'bytes=0-9' },
    });
    expect(signed.canonicalRequest).toBe([
      'GET',
      '/test.txt',
      '',
      'host:examplebucket.s3.amazonaws.com',
      'range:bytes=0-9',
      'x-amz-content-sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'x-amz-date:20130524T000000Z',
      '',
      'host;range;x-amz-content-sha256;x-amz-date',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    ].join('\n'));
    expect(signed.signature).toBe('f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
    expect(signed.headers['authorization']).not.toContain(SECRET);
  });
});

describe('parseListBucketResult', () => {
  it('decodes xml entities when the listing is not url-encoded', () => {
    const page = parseListBucketResult('<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>a&amp;b.txt</Key><Size>2</Size><ETag>W/&quot;etag&quot;</ETag></Contents></ListBucketResult>');
    expect(page.objects).toEqual([{
      key: 'a&b.txt',
      size: 2,
      lastModified: null,
      etag: 'etag',
      storageClass: null,
    }]);
    expect(page.isTruncated).toBe(false);
  });
});
