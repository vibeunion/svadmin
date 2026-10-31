import { requireValue } from '../test/assertions';

import { describe,it,expect,vi } from 'vitest';
import { useGo,useBack,useGetToPath,useNavigation } from './routing-hooks.svelte';
import { useParsed } from './useParsed.svelte';
import { flushSync } from 'svelte';

const { navigate, toPath }=vi.hoisted(() => ({
  navigate: vi.fn(async () => { }),
  toPath: vi.fn((options: { path: string }) => options.path),
}));

vi.mock('./context.svelte',() => {
  const routerContext={
    navigate: vi.fn(),
    url: '/posts/1/edit',
    parsedParams: { resource: 'posts',action: 'edit',id: '1' },
    go: vi.fn(),
    back: vi.fn()
  };
  return {
    captureAdminContext: () => ({
      providers: null,
      authProvider: null,
      resources: [],
      routerProvider: {
        go: () => {},
        back: () => {},
        parse: () => ({ pathname: '/posts/1/edit', params: {} }),
        toPath,
      },
      liveProvider: undefined,
      taskProvider: undefined,
      getDataProvider: vi.fn(),
      getDataProviderNames: () => [],
      getDataProviderForResource: vi.fn(),
      getResource: vi.fn(),
      currentPath: () => '/posts/1/edit',
      formatLink: (path: string) => path,
      navigate,
      back: vi.fn(),
    }),
    useRouterContext: () => routerContext,
    getRouterProvider: () => undefined
  };
});

vi.mock('./useParsed.svelte',() => ({
  useParsed: () => ({
    resource: 'posts',
    resourcePath: 'posts',
    action: 'edit',
    id: '1',
    params: {
      page: '2',q: 'open',detail: '1',tenantId: 'tenant-a',token: 'secret',
    },
  })
}));

describe('routing-hooks - Headless Svelte 5 Compatibility',() => {

  it('safely extracts parses from url and binds to runes Context',() => {
    let parsedParams!: ReturnType<typeof useParsed>|undefined;

    const cleanup=$effect.root(() => {
      parsedParams=useParsed();
    });

    flushSync();

    expect(requireValue(parsedParams).action).toBe('edit');
    expect(requireValue(parsedParams).resource).toBe('posts');
    expect(requireValue(parsedParams).id).toBe('1');

    cleanup();
  });

  it('useGo and useBack return functional closures out of Context',() => {
    let go!: ReturnType<typeof useGo>|undefined;
    let back!: ReturnType<typeof useBack>|undefined;

    const cleanup=$effect.root(() => {
      go=useGo();
      back=useBack();
    });

    flushSync();

    expect(typeof go).toBe('function');
    expect(typeof back).toBe('function');

    cleanup();
  });

  it('preserves only safe list state across same-resource CRUD navigation',() => {
    navigate.mockClear();
    let navigation!: ReturnType<typeof useNavigation>|undefined;
    const cleanup=$effect.root(() => {
      navigation=useNavigation();
    });

    requireValue(navigation).show('posts','1');
    requireValue(navigation).list('posts');
    requireValue(navigation).show('users','2');

    expect(navigate).toHaveBeenNthCalledWith(1,'/posts/show/1?page=2&q=open',undefined);
    expect(navigate).toHaveBeenNthCalledWith(2,'/posts?page=2&q=open',undefined);
    expect(navigate).toHaveBeenNthCalledWith(3,'/users/show/2',undefined);
    expect(toPath).toHaveBeenCalled();
    cleanup();
  });

  it('useGetToPath delegates to a custom router provider', () => {
    toPath.mockClear();
    toPath.mockImplementation((options: { path: string }) => `/kit${options.path}`);
    let getToPath: ReturnType<typeof useGetToPath> | undefined;
    const cleanup = $effect.root(() => {
      getToPath = useGetToPath();
    });
    flushSync();
    expect(getToPath?.({ resource: 'posts', action: 'show', id: 9 })).toBe('/kit/posts/show/9');
    expect(toPath).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'posts',
      action: 'show',
      id: 9,
      path: '/posts/show/9',
    }));
    toPath.mockImplementation((options: { path: string }) => options.path);
    cleanup();
  });
});
