import { beforeEach, describe, expect, mock, test } from 'bun:test';

const gotoMock = mock((_url: string, _options?: {
  replaceState?: boolean;
  noScroll?: boolean;
  keepFocus?: boolean;
  invalidateAll?: boolean;
}) => Promise.resolve());
const pathsState = {
  base: '/admin',
  resolvedRoot: '../../',
};
const resolveMock = mock((path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized === '/' ? pathsState.resolvedRoot : `${pathsState.base}${normalized}`;
});
const pageState = {
  url: new URL('https://example.test/admin/posts?page=2'),
  params: { resource: 'posts', action: 'list' },
};

mock.module('$app/navigation', () => ({ goto: gotoMock }));
mock.module('$app/state', () => ({ page: pageState }));
mock.module('$app/paths', () => ({
  get base() {
    return pathsState.base;
  },
  resolve: resolveMock,
}));

const { createSvelteKitRouterProvider } = await import('../src/router-provider');

describe('createSvelteKitRouterProvider', () => {
  beforeEach(() => {
    gotoMock.mockClear();
    resolveMock.mockClear();
    pathsState.base = '/admin';
    pathsState.resolvedRoot = '../../';
    pageState.url = new URL('https://example.test/admin/posts?page=2');
  });

  test('resolves internal paths before navigation and link formatting', () => {
    const provider = createSvelteKitRouterProvider();

    provider.go({
      to: '/posts',
      query: { search: 'hello world' },
      hash: 'details',
      type: 'replace',
    });

    expect(gotoMock).toHaveBeenCalledWith(
      '/admin/posts?search=hello+world#details',
      {
        replaceState: true,
        noScroll: true,
        keepFocus: true,
        invalidateAll: false,
      },
    );
    expect(provider.formatLink?.('posts')).toBe('/admin/posts');
  });

  test('removes the configured base when SSR resolves the root relatively', () => {
    const provider = createSvelteKitRouterProvider();

    expect(provider.parse()).toMatchObject({
      resource: 'posts',
      action: 'list',
      pathname: '/posts',
      params: { page: '2' },
    });
  });

  test('maps the exact configured base to the router root', () => {
    pageState.url = new URL('https://example.test/admin');

    expect(createSvelteKitRouterProvider().parse().pathname).toBe('/');
  });

  test('does not strip a pathname that only shares the base prefix', () => {
    pageState.url = new URL('https://example.test/administrator/posts');

    expect(createSvelteKitRouterProvider().parse().pathname).toBe('/administrator/posts');
  });

  test('leaves absolute pathnames unchanged for an app at the root base', () => {
    pathsState.base = '';
    pageState.url = new URL('https://example.test/posts');

    expect(createSvelteKitRouterProvider().parse().pathname).toBe('/posts');
  });
});
