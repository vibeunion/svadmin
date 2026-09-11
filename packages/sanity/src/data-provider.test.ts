import { requireValue } from "../../../scripts/test-assertions";
import { afterEach, describe, expect, it, mock } from 'bun:test';
import type { CustomParams, CustomResult, DataProvider, Filter } from '@svadmin/core';
import { createSanityDataProvider } from './data-provider';

const originalFetch = globalThis.fetch;
let mockFetchFn: ReturnType<typeof mock>;

function jsonResponse(body: unknown, status = 200): Response {
  const serialized = body === undefined ? '' : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(),
    json: mock(() => Promise.resolve(body)),
    text: mock(() => Promise.resolve(serialized)),
  } as unknown as Response;
}

function setupQueryFetch(): void {
  mockFetchFn = mock((input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const query = url.searchParams.get('query') ?? '';
    const result = query.startsWith('count(')
      ? 0
      : query.endsWith('[0]')
        ? { _id: 'doc-1', _type: 'post' }
        : [];
    return Promise.resolve(jsonResponse({ result }));
  });
  globalThis.fetch = mockFetchFn as unknown as typeof fetch;
}

function setupCustomFetch(body: unknown, status = 200, responseHeaders = new Headers()): void {
  mockFetchFn = mock(() => Promise.resolve({
    ...jsonResponse(body, status),
    headers: responseHeaders,
  } as Response));
  globalThis.fetch = mockFetchFn as unknown as typeof fetch;
}

function queryCalls(): URL[] {
  return mockFetchFn.mock.calls.map((call: unknown[]) => new URL(String((call as [RequestInfo | URL])[0])));
}

function customRequest(
  provider: DataProvider,
  params: CustomParams,
): Promise<CustomResult> {
  const custom = provider.custom;
  if (!custom) throw new Error('Expected Sanity provider to expose custom()');
  return custom(params);
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('createSanityDataProvider GROQ safety', () => {
  it('parameterizes resource and nested filter values while preserving logical grouping', async () => {
    setupQueryFetch();
    const provider = createSanityDataProvider('project', 'production', 'secret-token');
    const resource = 'post"] || true || [_type == "post';
    const injectedValue = 'active"] || true || [status == "active';

    await provider.getList({
      resource,
      sorters: [
        { field: 'profile.name', order: 'asc' },
        { field: '_createdAt', order: 'desc' },
      ],
      filters: [
        {
          operator: 'or',
          value: [
            { field: 'status', operator: 'eq', value: injectedValue },
            {
              operator: 'and',
              value: [
                { field: 'score', operator: 'gte', value: 10 },
                { field: 'score', operator: 'lte', value: 20 },
              ],
            },
          ],
        },
      ],
    });

    expect(mockFetchFn).toHaveBeenCalledTimes(2);
    for (const url of queryCalls()) {
      const groq = url.searchParams.get('query') ?? '';
      const parameterValues = [...url.searchParams.entries()]
        .filter(([name]) => name.startsWith('$'))
        .map(([, value]) => value);

      expect(groq).toContain('_type == $resource');
      expect(groq).toContain('status == $');
      expect(groq).toContain('score >= $');
      expect(groq).toContain('score <= $');
      expect(groq).toContain('||');
      expect(groq).toContain('&&');
      expect(groq).not.toContain(resource);
      expect(groq).not.toContain(injectedValue);
      expect(parameterValues).toContain(JSON.stringify(resource));
      expect(parameterValues).toContain(JSON.stringify(injectedValue));
      expect(parameterValues).toContain('10');
      expect(parameterValues).toContain('20');
    }

    const listQuery = requireValue(queryCalls()[0]).searchParams.get('query') ?? '';
    expect(listQuery).toContain('order(profile.name asc, _createdAt desc)');
  });

  it('supports every CrudOperator with parameterized values', async () => {
    setupQueryFetch();
    const provider = createSanityDataProvider('project', 'production');
    const filters: Filter[] = [
      { field: 'eqField', operator: 'eq', value: 'eq-value' },
      { field: 'neField', operator: 'ne', value: 'ne-value' },
      { field: 'ltField', operator: 'lt', value: 1 },
      { field: 'gtField', operator: 'gt', value: 2 },
      { field: 'lteField', operator: 'lte', value: 3 },
      { field: 'gteField', operator: 'gte', value: 4 },
      { field: 'containsField', operator: 'contains', value: 'needle' },
      { field: 'ncontainsField', operator: 'ncontains', value: 'draft' },
      { field: 'startswithField', operator: 'startswith', value: 'prefix' },
      { field: 'endswithField', operator: 'endswith', value: 'suffix' },
      { field: 'inField', operator: 'in', value: ['one', 'two'] },
      { field: 'ninField', operator: 'nin', value: [5, 6] },
      { field: 'nullField', operator: 'null', value: 'ignored' },
      { field: 'nnullField', operator: 'nnull', value: 'ignored' },
      { field: 'betweenField', operator: 'between', value: [10, 20] },
      { field: 'nbetweenField', operator: 'nbetween', value: [30, 40] },
    ];

    await provider.getList({ resource: 'post', filters });

    const url = queryCalls()[0];
    const groq = requireValue(url).searchParams.get('query') ?? '';
    const parameterValues = [...requireValue(url).searchParams.entries()]
      .filter(([name]) => name.startsWith('$'))
      .map(([, value]) => value);

    expect(groq).toMatch(/eqField == \$[A-Za-z0-9_]+/);
    expect(groq).toMatch(/neField != \$[A-Za-z0-9_]+/);
    expect(groq).toMatch(/ltField < \$[A-Za-z0-9_]+/);
    expect(groq).toMatch(/gtField > \$[A-Za-z0-9_]+/);
    expect(groq).toMatch(/lteField <= \$[A-Za-z0-9_]+/);
    expect(groq).toMatch(/gteField >= \$[A-Za-z0-9_]+/);
    expect(groq).toMatch(/containsField match \$[A-Za-z0-9_]+/);
    expect(groq).toMatch(/!\(ncontainsField match \$[A-Za-z0-9_]+\)/);
    expect(groq).toMatch(/startswithField match \$[A-Za-z0-9_]+/);
    expect(groq).toMatch(/endswithField match \$[A-Za-z0-9_]+/);
    expect(groq).toMatch(/inField in \$[A-Za-z0-9_]+/);
    expect(groq).toMatch(/!\(ninField in \$[A-Za-z0-9_]+\)/);
    expect(groq).toContain('!defined(nullField)');
    expect(groq).toContain('defined(nnullField)');
    expect(groq).toMatch(/betweenField >= \$[A-Za-z0-9_]+ && betweenField <= \$[A-Za-z0-9_]+/);
    expect(groq).toMatch(/!\(nbetweenField >= \$[A-Za-z0-9_]+ && nbetweenField <= \$[A-Za-z0-9_]+\)/);

    for (const value of [
      '"eq-value"', '"ne-value"', '1', '2', '3', '4', '"*needle*"', '"*draft*"',
      '"prefix*"', '"*suffix"', '["one","two"]', '[5,6]', '10', '20', '30', '40',
    ]) {
      expect(parameterValues).toContain(value);
    }
  });

  it('parameterizes resource values in getOne and getMany queries', async () => {
    setupQueryFetch();
    const provider = createSanityDataProvider('project', 'production');
    const resource = 'post"] || true || [_type == "post';

    await provider.getOne({ resource, id: 'doc-1' });
    const getMany = provider.getMany;
    if (!getMany) throw new Error('Expected Sanity provider to expose getMany()');
    await getMany({ resource, ids: ['doc-1', 'doc-2'] });

    for (const url of queryCalls()) {
      const groq = url.searchParams.get('query') ?? '';
      expect(groq).toContain('_type == $resource');
      expect(groq).not.toContain(resource);
      expect(url.searchParams.get('$resource')).toBe(JSON.stringify(resource));
    }
  });

  it('rejects unsafe field and sorter paths before fetching', async () => {
    setupQueryFetch();
    const provider = createSanityDataProvider('project', 'production');

    await expect(provider.getList({
      resource: 'post',
      filters: [{ field: 'name] || true', operator: 'eq', value: 'x' }],
    })).rejects.toThrow('Invalid GROQ field path');

    await expect(provider.getList({
      resource: 'post',
      sorters: [{ field: 'title desc) | *', order: 'asc' }],
    })).rejects.toThrow('Invalid GROQ sort path');

    await expect(provider.getList({
      resource: 'post',
      sorters: [{ field: 'title', order: 'sideways' } as unknown as { field: string; order: 'asc' }],
    })).rejects.toThrow('Invalid GROQ sort order');

    expect(mockFetchFn).not.toHaveBeenCalled();
  });

  it('fails closed for unknown runtime operators and invalid operator values', async () => {
    setupQueryFetch();
    const provider = createSanityDataProvider('project', 'production');
    const unknownOperator = [
      { field: 'status', operator: 'unknown', value: 'active' },
    ] as unknown as Filter[];

    await expect(provider.getList({ resource: 'post', filters: unknownOperator }))
      .rejects.toThrow('Unsupported GROQ filter operator');
    await expect(provider.getList({
      resource: 'post',
      filters: [{ field: 'tags', operator: 'in', value: 'not-an-array' }],
    })).rejects.toThrow('requires an array value');
    await expect(provider.getList({
      resource: 'post',
      filters: [{ field: 'price', operator: 'between', value: [10] }],
    })).rejects.toThrow('requires a two-item array value');

    expect(mockFetchFn).not.toHaveBeenCalled();
  });
});

describe('createSanityDataProvider custom requests', () => {
  it('inherits provider authorization only for same-origin requests and allows explicit overrides', async () => {
    const provider = createSanityDataProvider('project', 'production', 'provider-token');

    setupCustomFetch({ ok: true });
    await customRequest(provider, {
      url: 'https://project.api.sanity.io/v2023-05-03/data/export/production',
      method: 'get',
    });
    let [, init] = mockFetchFn.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer provider-token');

    setupCustomFetch({ ok: true });
    await customRequest(provider, {
      url: 'https://analytics.example.net/report',
      method: 'get',
      headers: { 'X-Request-ID': 'request-1' },
    });
    [, init] = mockFetchFn.mock.calls[0] as [string, RequestInit];
    let requestHeaders = init.headers as Record<string, string>;
    expect(requestHeaders['Authorization']).toBeUndefined();
    expect(requestHeaders['Content-Type']).toBe('application/json');
    expect(requestHeaders['X-Request-ID']).toBe('request-1');

    setupCustomFetch({ ok: true });
    await customRequest(provider, {
      url: 'https://analytics.example.net/report',
      method: 'get',
      headers: { Authorization: 'Bearer explicit-token' },
    });
    [, init] = mockFetchFn.mock.calls[0] as [string, RequestInit];
    requestHeaders = init.headers as Record<string, string>;
    expect(requestHeaders['Authorization']).toBe('Bearer explicit-token');
  });

  it('serializes query, sorters, and nested filters without losing values', async () => {
    setupCustomFetch({ ok: true });
    const provider = createSanityDataProvider('project', 'production');
    const sorters = [
      { field: 'createdAt', order: 'desc' as const },
      { field: 'name', order: 'asc' as const },
    ];
    const filters: Filter[] = [
      { field: 'tenantId', operator: 'eq', value: 0 },
      {
        operator: 'or',
        value: [
          { field: 'enabled', operator: 'eq', value: false },
          { field: 'status', operator: 'in', value: ['active', 'draft'] },
        ],
      },
    ];

    await customRequest(provider, {
      url: 'https://project.api.sanity.io/v2023-05-03/custom/report?existing=yes',
      method: 'post',
      query: {
        page: 0,
        enabled: false,
        search: '',
        nullable: null,
        tags: ['one', 'two'],
        options: { exact: true },
      },
      sorters,
      filters,
    });

    const [rawUrl] = mockFetchFn.mock.calls[0] as [string, RequestInit];
    const params = new URL(rawUrl).searchParams;
    expect(params.get('existing')).toBe('yes');
    expect(params.get('page')).toBe('0');
    expect(params.get('enabled')).toBe('false');
    expect(params.get('search')).toBe('');
    expect(params.get('nullable')).toBe('null');
    expect(params.getAll('tags')).toEqual(['one', 'two']);
    expect(params.get('options')).toBe('{"exact":true}');
    expect(JSON.parse(params.get('_sorters') ?? 'null')).toEqual(sorters);
    expect(JSON.parse(params.get('_filters') ?? 'null')).toEqual(filters);
  });

  for (const [name, payload, expectedBody] of [
    ['zero', 0, '0'],
    ['false', false, 'false'],
    ['empty string', '', '""'],
    ['null', null, 'null'],
  ] as const) {
    it(`preserves a ${name} payload`, async () => {
      setupCustomFetch({ ok: true });
      const provider = createSanityDataProvider('project', 'production');

      await customRequest(provider, {
        url: 'https://project.api.sanity.io/v2023-05-03/custom/echo',
        method: 'post',
        payload,
      });

      const [, init] = mockFetchFn.mock.calls[0] as [string, RequestInit];
      expect(init.body).toBe(expectedBody);
    });
  }

  for (const [name, status, responseHeaders] of [
    ['204 response', 204, new Headers()],
    ['205 response', 205, new Headers()],
    ['zero content-length response', 200, new Headers({ 'Content-Length': '0' })],
  ] as const) {
    it(`returns undefined for a ${name} without parsing JSON`, async () => {
      const json = mock(() => Promise.reject(new Error('json() must not be called')));
      const text = mock(() => Promise.reject(new Error('text() must not be called')));
      mockFetchFn = mock(() => Promise.resolve({
        ok: true,
        status,
        statusText: 'OK',
        headers: responseHeaders,
        json,
        text,
      } as unknown as Response));
      globalThis.fetch = mockFetchFn as unknown as typeof fetch;
      const provider = createSanityDataProvider('project', 'production');

      const result = await customRequest(provider, {
        url: 'https://project.api.sanity.io/v2023-05-03/custom/empty',
        method: 'get',
      });

      expect(result.data).toBeUndefined();
      expect(json).not.toHaveBeenCalled();
      expect(text).not.toHaveBeenCalled();
    });
  }

  it('returns undefined when a successful response body is actually empty', async () => {
    const json = mock(() => Promise.reject(new Error('json() must not be called')));
    const text = mock(() => Promise.resolve(''));
    mockFetchFn = mock(() => Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json,
      text,
    } as unknown as Response));
    globalThis.fetch = mockFetchFn as unknown as typeof fetch;
    const provider = createSanityDataProvider('project', 'production');

    const result = await customRequest(provider, {
      url: 'https://project.api.sanity.io/v2023-05-03/custom/empty',
      method: 'get',
    });

    expect(result.data).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
    expect(text).toHaveBeenCalledTimes(1);
  });
});
