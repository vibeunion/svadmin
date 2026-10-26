import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Type } from 'typebox';
import { defineResource, resetContext, type AccessControlProvider, type DataProvider, type ResourceDefinition } from '@svadmin/core';
import { getToastQueue } from '@svadmin/core/toast';
import Host from './svar-resource-table-error.test-host.svelte';
import GuardHost from './resource-permission-copy.test-host.svelte';

const posts = defineResource('posts', {
  record: Type.Object({ id: Type.Number(), title: Type.String() }),
});
const resources: ResourceDefinition[] = [{
  name: 'posts',
  label: '文章',
  contract: posts,
  fields: [{ key: 'title', label: '标题', type: 'text' }],
}];

function provider(): DataProvider {
  return {
    getApiUrl: () => '/api',
    getList: vi.fn<DataProvider['getList']>()
      .mockRejectedValueOnce(new Error('PRIVATE_DIAGNOSTIC'))
      .mockResolvedValueOnce({ data: [{ id: 1, title: 'Recovered' }], total: 1 }),
    getOne: vi.fn(async () => ({ data: { id: 1, title: 'Recovered' } })),
    create: vi.fn(async () => ({ data: {} })),
    update: vi.fn(async () => ({ data: {} })),
    deleteOne: vi.fn(async () => ({ data: {} })),
  };
}

function mount(source: DataProvider) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } },
  });
  const view = render(Host, { provider: source, resources, queryClient, resourceName: 'posts', locale: 'zh-CN' });
  return { view, queryClient };
}

beforeEach(() => {
  resetContext();
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

afterEach(() => {
  cleanup();
  resetContext();
  vi.restoreAllMocks();
});

describe('SvarResourceTableView query error feedback', () => {
  it('hides the provider diagnostic, shows the localized generic error, and recovers on refresh', async () => {
    const source = provider();
    const { view, queryClient } = mount(source);

    await waitFor(() => expect(view.getByRole('alert').textContent).toBe('数据加载失败'));
    expect(view.baseElement.textContent).not.toContain('PRIVATE_DIAGNOSTIC');
    expect(getToastQueue()).toHaveLength(0);

    await fireEvent.click(view.getByRole('button', { name: '刷新' }));
    await waitFor(() => {
      expect(source.getList).toHaveBeenCalledTimes(2);
      expect(queryClient.isFetching()).toBe(0);
      expect(view.getByText('Recovered')).toBeTruthy();
    });
    expect(view.queryByRole('alert')).toBeNull();
    expect(view.baseElement.textContent).not.toContain('PRIVATE_DIAGNOSTIC');
    expect(getToastQueue()).toHaveLength(0);
  });

  it('uses localized permission feedback instead of rendering the provider reason', async () => {
    const source = provider();
    const access = { can: vi.fn(async () => ({ can: false, reason: 'PRIVATE_PERMISSION_DIAGNOSTIC' })) };
    const view = render(Host, { provider: source, resources, queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } },
    }), resourceName: 'posts', locale: 'zh-CN', access });

    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('无权执行此操作'));
    expect(view.baseElement.textContent).not.toContain('PRIVATE_PERMISSION_DIAGNOSTIC');
    expect(source.getList).not.toHaveBeenCalled();
  });

  it('maps a failed permission query to the unavailable message, not the provider diagnostic', async () => {
    const source = provider();
    const access = { can: vi.fn<AccessControlProvider['can']>(async () => { throw new Error('PRIVATE_PERMISSION_DIAGNOSTIC'); }) };
    const view = render(Host, { provider: source, resources, queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } },
    }), resourceName: 'posts', locale: 'zh-CN', access });

    await waitFor(() => expect(view.getByRole('alert').textContent).toBe('权限校验暂不可用，请重试。'));
    expect(view.baseElement.textContent).not.toContain('PRIVATE_PERMISSION_DIAGNOSTIC');
    expect(source.getList).not.toHaveBeenCalled();
  });
});

function mountGuard(can: AccessControlProvider['can']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } },
  });
  return render(GuardHost, {
    provider: provider(), resources, queryClient, accessControlProvider: { can }, resourceName: 'posts', locale: 'zh-CN',
  });
}

describe('ResourceAccessGuard permission copy', () => {
  it('renders the localized denial instead of the policy reason', async () => {
    const can = vi.fn<AccessControlProvider['can']>(async () => ({ can: false, reason: 'PRIVATE_POLICY_REASON' }));
    const view = mountGuard(can);

    await waitFor(() => expect(view.getByText('无权执行此操作')).toBeTruthy());
    expect(view.queryByText('PROTECTED_CONTENT')).toBeNull();
    expect(view.baseElement.textContent).not.toContain('PRIVATE_POLICY_REASON');
  });

  it('renders the unavailable message instead of the provider diagnostic', async () => {
    const can = vi.fn<AccessControlProvider['can']>(async () => { throw new Error('PRIVATE_PERMISSION_DIAGNOSTIC'); });
    const view = mountGuard(can);

    await waitFor(() => expect(view.getByText('权限校验暂不可用，请重试。')).toBeTruthy());
    expect(view.queryByText('PROTECTED_CONTENT')).toBeNull();
    expect(view.baseElement.textContent).not.toContain('PRIVATE_PERMISSION_DIAGNOSTIC');
  });
});
