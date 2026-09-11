import { definedOptions } from './defined-options';
import { fireEvent,render,screen,waitFor } from '@testing-library/svelte';
import { beforeEach,describe,expect,it,vi } from 'vitest';
import AdminContextAsyncTestHost from './admin-context.async.test-host.svelte';
import type { AuthProvider,DataProvider,TaskProvider } from './types';
import type { RouterProvider } from './router-provider';
import {
  captureAdminContext,
  resetContext,
  setDataProvider,
  setResources,
  setRouterProvider,
} from './context.svelte';

function createDataProvider(instance: string): DataProvider {
  return {
    getList: vi.fn(async () => ({ data: [{ id: instance }],total: 1 })),
    getOne: vi.fn(async () => ({ data: { id: instance } })),
    create: vi.fn(async ({ variables }) => ({ data: { id: instance,...(variables as object) } })),
    update: vi.fn(async ({ variables }) => ({ data: { id: instance,...(variables as object) } })),
    deleteOne: vi.fn(async () => ({ data: { id: instance } })),
    getApiUrl: () => `/${instance}`,
  } as unknown as DataProvider;
}

function createAuthProvider(instance: string): AuthProvider {
  return {
    login: vi.fn(async () => ({ success: true })),
    logout: vi.fn(async () => ({ success: true,redirectTo: `/logout/${instance}` })),
    check: vi.fn(async () => ({ authenticated: true })),
    getIdentity: vi.fn(async () => null),
    onError: vi.fn(async () => ({ logout: true,redirectTo: `/expired/${instance}` })),
  };
}

function createTaskProvider(instance: string): TaskProvider {
  return {
    submit: vi.fn(async () => ({
      id: `task-${instance}`,
      wait: vi.fn(async () => ({ id: `task-${instance}`,status: 'done' })),
    })),
    get: vi.fn(async (id) => ({ id })),
  };
}

function createRouterProvider(initialPath='/posts'): RouterProvider {
  let pathname=initialPath;
  const go=vi.fn(({ to,query }: { to: string; query?: Record<string,string> }) => {
    const queryString=query? new URLSearchParams(query).toString():'';
    pathname=queryString? `${to}?${queryString}`:to;
  });
  return {
    go,
    back: vi.fn(),
    parse: () => {
      const [path='/',query='']=pathname.split('?');
      const segments=path.split('/').filter(Boolean);
      return {
        ...definedOptions({
          resource: segments[0],
          action: segments[1],
          id: segments[2],
        }),
        params: Object.fromEntries(new URLSearchParams(query)),
        pathname: path,
      };
    },
  };
}

beforeEach(() => {
  window.location.hash='';
});

describe('captured AdminContext',() => {
  it('keeps data-provider callbacks and TanStack mutations isolated across trees',async () => {
    const first=createDataProvider('first');
    const second=createDataProvider('second');
    const firstAuth=createAuthProvider('first');
    const secondAuth=createAuthProvider('second');
    const firstTasks=createTaskProvider('first');
    const secondTasks=createTaskProvider('second');
    const firstRouter=createRouterProvider();
    const secondRouter=createRouterProvider();

    const firstView=render(AdminContextAsyncTestHost,{
      props: {
        instance: 'first',
        dataProvider: first,
        authProvider: firstAuth,
        taskProvider: firstTasks,
        routerProvider: firstRouter,
      },
    });
    render(AdminContextAsyncTestHost,{
      props: {
        instance: 'second',
        dataProvider: second,
        authProvider: secondAuth,
        taskProvider: secondTasks,
        routerProvider: secondRouter,
      },
    });

    await fireEvent.click(screen.getByTestId('first-provider'));
    await fireEvent.click(screen.getByTestId('second-provider'));
    await fireEvent.click(screen.getByTestId('first-create'));
    await fireEvent.click(screen.getByTestId('second-create'));

    await waitFor(() => {
      expect(first.getList).toHaveBeenCalledTimes(1);
      expect(second.getList).toHaveBeenCalledTimes(1);
      expect(first.create).toHaveBeenCalledWith(expect.objectContaining({
        resource: 'posts',
        variables: { title: 'first' },
      }));
      expect(second.create).toHaveBeenCalledWith(expect.objectContaining({
        resource: 'posts',
        variables: { title: 'second' },
      }));
      expect(screen.getByTestId('first-menu').textContent).toBe('posts');
      expect(screen.getByTestId('second-menu').textContent).toBe('posts');
      expect(screen.getByTestId('first-breadcrumb').textContent).toBe('posts');
      expect(screen.getByTestId('second-breadcrumb').textContent).toBe('posts');
    });

    await firstView.rerender({
      instance: 'first',
      dataProvider: first,
      authProvider: firstAuth,
      taskProvider: firstTasks,
      routerProvider: firstRouter,
      resources: [
        { name: 'posts',label: 'Scoped Posts',fields: [],primaryKey: 'id' },
        { name: 'articles',label: 'articles',fields: [],primaryKey: 'id' },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('first-menu').textContent).toBe('Scoped Posts');
      expect(screen.getByTestId('first-breadcrumb').textContent).toBe('Scoped Posts');
      expect(screen.getByTestId('second-menu').textContent).toBe('posts');
      expect(screen.getByTestId('second-breadcrumb').textContent).toBe('posts');
    });
  });

  it('keeps task, auth, logout and router callbacks bound to their owning tree',async () => {
    const firstAuth=createAuthProvider('first');
    const secondAuth=createAuthProvider('second');
    const firstTasks=createTaskProvider('first');
    const secondTasks=createTaskProvider('second');
    const firstRouter=createRouterProvider();
    const secondRouter=createRouterProvider();

    render(AdminContextAsyncTestHost,{
      props: {
        instance: 'first',
        dataProvider: createDataProvider('first'),
        authProvider: firstAuth,
        taskProvider: firstTasks,
        routerProvider: firstRouter,
      },
    });
    render(AdminContextAsyncTestHost,{
      props: {
        instance: 'second',
        dataProvider: createDataProvider('second'),
        authProvider: secondAuth,
        taskProvider: secondTasks,
        routerProvider: secondRouter,
      },
    });

    await fireEvent.click(screen.getByTestId('first-task'));
    await fireEvent.click(screen.getByTestId('first-auth-error'));
    await fireEvent.click(screen.getByTestId('first-logout'));
    await fireEvent.click(screen.getByTestId('first-go'));
    await fireEvent.click(screen.getByTestId('first-back'));

    await waitFor(() => {
      expect(firstTasks.submit).toHaveBeenCalledWith('task.first',{ body: { instance: 'first' } });
      expect(secondTasks.submit).not.toHaveBeenCalled();
      expect(firstAuth.onError).toHaveBeenCalledWith(expect.any(Error));
      expect(firstAuth.logout).toHaveBeenCalledTimes(2);
      expect(secondAuth.onError).not.toHaveBeenCalled();
      expect(secondAuth.logout).not.toHaveBeenCalled();
      expect(firstRouter.go).toHaveBeenCalledWith({ to: '/expired/first',type: 'push' });
      expect(firstRouter.go).toHaveBeenCalledWith({ to: '/logout/first',type: 'push' });
      expect(firstRouter.go).toHaveBeenCalledWith({ to: '/custom/first',type: 'push' });
      expect(firstRouter.back).toHaveBeenCalledTimes(1);
      expect(secondRouter.go).not.toHaveBeenCalled();
      expect(secondRouter.back).not.toHaveBeenCalled();
      expect(screen.getByTestId('first-route').textContent).toBe('custom');
      expect(screen.getByTestId('second-route').textContent).toBe('posts');
    });
  });

  it('keeps import and export callbacks on the captured data provider',async () => {
    const provider=createDataProvider('transfer');

    render(AdminContextAsyncTestHost,{
      props: {
        instance: 'transfer',
        dataProvider: provider,
        authProvider: createAuthProvider('transfer'),
        taskProvider: createTaskProvider('transfer'),
        routerProvider: createRouterProvider(),
      },
    });

    await fireEvent.click(screen.getByTestId('transfer-export'));
    await fireEvent.click(screen.getByTestId('transfer-import'));

    await waitFor(() => {
      expect(provider.getList).toHaveBeenCalledWith(expect.objectContaining({
        resource: 'posts',
        pagination: { current: 1,pageSize: 20 },
      }));
      expect(provider.create).toHaveBeenCalledWith(expect.objectContaining({
        resource: 'posts',
        variables: { title: 'import:transfer' },
      }));
    });
  });

  it('keeps URL-synced table callbacks on the captured router',async () => {
    const firstRouter=createRouterProvider();
    const secondRouter=createRouterProvider();

    render(AdminContextAsyncTestHost,{
      props: {
        instance: 'first',
        dataProvider: createDataProvider('first'),
        authProvider: createAuthProvider('first'),
        taskProvider: createTaskProvider('first'),
        routerProvider: firstRouter,
      },
    });
    render(AdminContextAsyncTestHost,{
      props: {
        instance: 'second',
        dataProvider: createDataProvider('second'),
        authProvider: createAuthProvider('second'),
        taskProvider: createTaskProvider('second'),
        routerProvider: secondRouter,
      },
    });

    await fireEvent.click(screen.getByTestId('first-table-page'));

    await waitFor(() => {
      expect(firstRouter.go).toHaveBeenCalledWith({
        to: '/posts',
        query: { page: '2' },
        type: 'replace',
      });
      expect(secondRouter.go).not.toHaveBeenCalled();
    });

    firstRouter.go({ to: '/posts',query: { page: '3' },type: 'replace' });
    vi.mocked(firstRouter.go).mockClear();
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      expect(screen.getByTestId('first-table-current').textContent).toBe('3');
      expect(screen.getByTestId('second-table-current').textContent).toBe('1');
    });
  });

  it('keeps legacy accessors dynamically bound to compatibility setters',() => {
    resetContext();
    const accessor=captureAdminContext();
    const first=createDataProvider('legacy-first');
    const second=createDataProvider('legacy-second');
    const firstRouter=createRouterProvider('/first');
    const secondRouter=createRouterProvider('/second');

    setDataProvider(first);
    setResources([{ name: 'first',label: 'first',fields: [] }]);
    setRouterProvider(firstRouter);
    expect(accessor.getDataProvider().getApiUrl()).toBe('/legacy-first');
    expect(accessor.resources).toEqual([{ name: 'first',label: 'first',fields: [] }]);
    expect(accessor.routerProvider?.parse().pathname).toBe('/first');

    setDataProvider(second);
    setResources([{ name: 'second',label: 'second',fields: [] }]);
    setRouterProvider(secondRouter);
    expect(accessor.getDataProvider().getApiUrl()).toBe('/legacy-second');
    expect(accessor.resources).toEqual([{ name: 'second',label: 'second',fields: [] }]);
    expect(accessor.routerProvider?.parse().pathname).toBe('/second');

    resetContext();
  });
});
