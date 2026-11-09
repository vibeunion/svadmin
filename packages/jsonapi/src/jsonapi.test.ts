import { describe, expect, it, mock } from 'bun:test';
import { createJsonApiDataProvider } from './jsonapi-data-provider.js';

describe('createJsonApiDataProvider', () => {
  it('unpacks getList compound documents with included relationships and pagination', async () => {
    const mockFetch = mock((url: string | URL | Request) => {
      const urlStr = String(url);
      expect(urlStr).toContain('/articles');
      expect(urlStr).toContain('page%5Bnumber%5D=1');
      expect(urlStr).toContain('page%5Bsize%5D=10');
      expect(urlStr).toContain('sort=-created_at');
      expect(urlStr).toContain('filter%5Bstatus%5D=published');

      const responseDoc = {
        data: [
          {
            id: '1',
            type: 'articles',
            attributes: {
              title: 'Getting Started with JSON:API',
              views: 120,
            },
            relationships: {
              author: {
                data: { id: '99', type: 'people' },
              },
            },
          },
        ],
        included: [
          {
            id: '99',
            type: 'people',
            attributes: {
              name: 'John Doe',
              email: 'john@example.com',
            },
          },
        ],
        meta: {
          total: 42,
        },
      };

      return Promise.resolve(
        new Response(JSON.stringify(responseDoc), {
          status: 200,
          headers: { 'Content-Type': 'application/vnd.api+json' },
        })
      );
    });

    const dataProvider = createJsonApiDataProvider({
      apiUrl: 'https://api.example.com/jsonapi',
      httpClient: mockFetch as unknown as typeof fetch,
    });

    const result = await dataProvider.getList({
      resource: 'articles',
      pagination: { current: 1, pageSize: 10 },
      sorters: [{ field: 'created_at', order: 'desc' }],
      filters: [{ field: 'status', operator: 'eq', value: 'published' }],
    });

    expect(result.total).toBe(42);
    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('1');
    expect(result.data[0].title).toBe('Getting Started with JSON:API');
    expect(result.data[0].views).toBe(120);
    expect(result.data[0].author).toEqual({
      id: '99',
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('retrieves single resource with getOne', async () => {
    const mockFetch = mock((url: string | URL | Request) => {
      expect(String(url)).toBe('https://api.example.com/jsonapi/articles/1');
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              id: '1',
              type: 'articles',
              attributes: {
                title: 'Deep Dive',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/vnd.api+json' } }
        )
      );
    });

    const dataProvider = createJsonApiDataProvider({
      apiUrl: 'https://api.example.com/jsonapi',
      httpClient: mockFetch as unknown as typeof fetch,
    });

    const result = await dataProvider.getOne({
      resource: 'articles',
      id: '1',
    });

    expect(result.data.id).toBe('1');
    expect(result.data.title).toBe('Deep Dive');
  });

  it('creates resource sending JSON:API envelope', async () => {
    const mockFetch = mock((url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe('https://api.example.com/jsonapi/articles');
      expect(init?.method).toBe('POST');
      const body = JSON.parse(init?.body as string);
      expect(body.data.type).toBe('articles');
      expect(body.data.attributes.title).toBe('New Post');

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              id: '101',
              type: 'articles',
              attributes: {
                title: 'New Post',
              },
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/vnd.api+json' } }
        )
      );
    });

    const dataProvider = createJsonApiDataProvider({
      apiUrl: 'https://api.example.com/jsonapi',
      httpClient: mockFetch as unknown as typeof fetch,
    });

    const result = await dataProvider.create({
      resource: 'articles',
      variables: { title: 'New Post' },
    });

    expect(result.data.id).toBe('101');
    expect(result.data.title).toBe('New Post');
  });

  it('handles deleteOne with 204 No Content', async () => {
    const mockFetch = mock((url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe('https://api.example.com/jsonapi/articles/55');
      expect(init?.method).toBe('DELETE');
      return Promise.resolve(new Response(null, { status: 204 }));
    });

    const dataProvider = createJsonApiDataProvider({
      apiUrl: 'https://api.example.com/jsonapi',
      httpClient: mockFetch as unknown as typeof fetch,
    });

    const result = await dataProvider.deleteOne({
      resource: 'articles',
      id: '55',
    });

    expect(result.data.id).toBe('55');
  });
});
