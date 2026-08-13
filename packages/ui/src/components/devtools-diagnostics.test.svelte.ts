import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DataProvider, ResourceDefinition, RouterProvider } from '@svadmin/core';
import { keys, resetContext } from '@svadmin/core';
import ContextHost from './admin-app.context.test-host.svelte';

function createDataProvider(instance: string): DataProvider {
  return {
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: { id: 'test' } }),
    create: async () => ({ data: { id: 'test' } }),
    update: async () => ({ data: { id: 'test' } }),
    deleteOne: async () => ({ data: { id: 'test' } }),
    getApiUrl: () => `https://${instance}.example.test`,
  } as DataProvider;
}

function createRouterProvider(): RouterProvider {
  return {
    go: () => {},
    back: () => {},
    parse: () => ({ pathname: '/', params: { instance: 'diagnostics' } }),
  };
}

const resources: ResourceDefinition[] = [{
  name: 'diagnostics-resource',
  label: 'Diagnostics resource',
  fields: [],
}];

beforeEach(() => {
  resetContext();
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

afterEach(() => {
  resetContext();
});

describe('DevTools diagnostics', () => {
  it('reports provider and cache health while redacting endpoints, keys, and payloads', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      keys({ provider: 'default', tenant: 'sensitive-tenant' }).data.list(
        'diagnostics-resource',
        { token: 'sensitive-query-key' },
      ),
      { data: [{ id: 1, token: 'sensitive-cache-record' }] },
    );
    queryClient.getMutationCache().build(queryClient, {
      mutationKey: ['sensitive-mutation-key'],
      mutationFn: async () => ({ token: 'sensitive-mutation-result' }),
    });

    const view = render(ContextHost, {
      instance: 'diagnostics',
      dataProvider: {
        default: createDataProvider('secret-token'),
        analytics: createDataProvider('analytics'),
      },
      routerProvider: createRouterProvider(),
      resources,
      queryClient,
    });

    const trigger = await waitFor(() => view.getByRole('button', { name: /DevTools|开发者工具/ }));
    await fireEvent.click(trigger);
    await fireEvent.click(view.getByRole('tab', { name: 'Providers' }));

    expect(view.getByText('Data providers (2)')).not.toBeNull();
    expect(view.getAllByText('Endpoint hidden')).toHaveLength(2);
    expect(view.container.textContent).not.toContain('secret-token.example.test');

    await fireEvent.click(view.getByRole('tab', { name: 'Cache' }));
    expect(view.getByTestId('devtools-query-total').textContent).toBe('1');
    expect(view.getByTestId('devtools-mutation-total').textContent).toBe('1');
    expect(view.getByText(/Query keys, variables, cached records/)).not.toBeNull();
    expect(view.getByTestId('devtools-query-operation').textContent).toContain('default');
    expect(view.getByTestId('devtools-query-operation').textContent).toContain('diagnostics-resource');
    expect(view.getByTestId('devtools-query-operation').textContent).toContain('data:list');
    expect(view.getByTestId('devtools-query-operation').textContent).toContain('success');
    expect(view.container.textContent).not.toContain('sensitive-query-key');
    expect(view.container.textContent).not.toContain('sensitive-tenant');
    expect(view.container.textContent).not.toContain('sensitive-cache-record');
    expect(view.container.textContent).not.toContain('sensitive-mutation-key');

    queryClient.setQueryData(['default', 'second-resource', 'list'], { data: [] });
    await waitFor(() => expect(view.getByTestId('devtools-query-total').textContent).toBe('2'));

    await queryClient.fetchQuery({
      queryKey: keys().data.one('timed-resource', 'hidden-record-id'),
      queryFn: async () => ({ data: { id: 'hidden-record-id' } }),
      staleTime: 0,
    });
    await waitFor(() => {
      const timedOperation = view.getAllByTestId('devtools-query-operation')
        .find((element) => element.textContent?.includes('timed-resource'));
      expect(timedOperation?.textContent).toMatch(/Duration\s*\d+ms/);
    });
    expect(view.container.textContent).not.toContain('hidden-record-id');
  });

  it('tracks resources from the scoped AdminContext after rerender', async () => {
    const queryClient = new QueryClient();
    const routerProvider = createRouterProvider();
    const dataProvider = { default: createDataProvider('scoped') };
    const view = render(ContextHost, {
      instance: 'resource-rerender',
      dataProvider,
      routerProvider,
      resources,
      queryClient,
    });

    await fireEvent.click(await view.findByRole('button', { name: /DevTools|开发者工具/ }));
    expect(view.getByText('Resources (1)')).not.toBeNull();

    await view.rerender({
      instance: 'resource-rerender',
      dataProvider,
      routerProvider,
      resources: [
        ...resources,
        { name: 'second-resource', label: 'Second resource', fields: [] },
      ],
      queryClient,
    });

    await waitFor(() => expect(view.getByText('Resources (2)')).not.toBeNull());
    expect(view.getByText('second-resource')).not.toBeNull();
  });
});
