/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi } from 'vitest';
import { useGo, useBack, useNavigation } from './routing-hooks.svelte';
import { useParsed } from './useParsed.svelte';
import { flushSync } from 'svelte';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn(async () => {}) }));

vi.mock('./context.svelte', () => {
  const routerContext = {
    navigate: vi.fn(), 
    url: '/posts/1/edit',
    parsedParams: { resource: 'posts', action: 'edit', id: '1' },
    go: vi.fn(),
    back: vi.fn()
  };
  return {
    captureAdminContext: () => ({
      providers: null,
      authProvider: null,
      resources: [],
      routerProvider: undefined,
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

vi.mock('./useParsed.svelte', () => ({
  useParsed: () => ({
    resource: 'posts',
    resourcePath: 'posts',
    action: 'edit',
    id: '1',
    params: {
      page: '2', q: 'open', detail: '1', tenantId: 'tenant-a', token: 'secret',
    },
  })
}));

describe('routing-hooks - Headless Svelte 5 Compatibility', () => {

  it('safely extracts parses from url and binds to runes Context', () => {
    let parsedParams!: ReturnType<typeof useParsed>;

    const cleanup = $effect.root(() => {
        parsedParams = useParsed();
    });

    flushSync();
    
    expect(parsedParams!.action).toBe('edit');
    expect(parsedParams.resource).toBe('posts');
    expect(parsedParams.id).toBe('1');

    cleanup();
  });

  it('useGo and useBack return functional closures out of Context', () => {
    let go!: ReturnType<typeof useGo>;
    let back!: ReturnType<typeof useBack>;
    
    const cleanup = $effect.root(() => {
        go = useGo();
        back = useBack();
    });

    flushSync();
    
    expect(typeof go).toBe('function');
    expect(typeof back).toBe('function');

    cleanup();
  });

  it('preserves only safe list state across same-resource CRUD navigation', () => {
    navigate.mockClear();
    let navigation!: ReturnType<typeof useNavigation>;
    const cleanup = $effect.root(() => {
      navigation = useNavigation();
    });

    navigation.show('posts', '1');
    navigation.list('posts');
    navigation.show('users', '2');

    expect(navigate).toHaveBeenNthCalledWith(1, '/posts/show/1?page=2&q=open', undefined);
    expect(navigate).toHaveBeenNthCalledWith(2, '/posts?page=2&q=open', undefined);
    expect(navigate).toHaveBeenNthCalledWith(3, '/users/show/2', undefined);
    cleanup();
  });
});
