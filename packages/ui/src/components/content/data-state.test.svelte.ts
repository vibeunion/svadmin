import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import DataState from './DataState.svelte';

afterEach(cleanup);

describe('DataState contract', () => {
  it.each(['empty', 'filtered-empty'] as const)('keeps %s distinct and exposes a recovery action', (state) => {
    const action = createRawSnippet(() => ({ render: () => '<button type="button">调整筛选</button>' }));
    const view = render(DataState, {
      state,
      title: state === 'empty' ? '暂无项目' : '没有匹配项目',
      description: state === 'empty' ? '创建或导入第一条项目。' : '清除筛选后重试。',
      action,
    });

    const surface = view.container.querySelector(`[data-svadmin-data-state="${state}"]`);
    expect(surface).toBeTruthy();
    expect(surface?.getAttribute('role')).toBe('status');
    expect(view.getByRole('heading', { name: state === 'empty' ? '暂无项目' : '没有匹配项目' })).toBeTruthy();
    expect(view.getByRole('button', { name: '调整筛选' })).toBeTruthy();
  });

  it('renders loading as a live busy status without an action', () => {
    const view = render(DataState, { state: 'loading', loadingLabel: '正在加载项目' });
    const surface = view.container.querySelector('[data-svadmin-data-state="loading"]');

    expect(surface?.getAttribute('role')).toBe('status');
    expect(surface?.getAttribute('aria-live')).toBe('polite');
    expect(surface?.getAttribute('aria-busy')).toBe('true');
    expect(view.queryByRole('button')).toBeNull();
  });

  it('renders a non-blocking refreshing status distinct from loading', () => {
    const view = render(DataState, { state: 'refreshing', loadingLabel: '正在刷新项目' });
    const surface = view.container.querySelector('[data-svadmin-data-state="refreshing"]');

    expect(surface?.getAttribute('role')).toBe('status');
    expect(surface?.getAttribute('aria-live')).toBe('polite');
    expect(surface?.getAttribute('aria-busy')).toBe('true');
    expect(surface?.getAttribute('aria-label')).toBe('Refreshing…');
    expect(view.getByText('Refreshing…')).toBeTruthy();
    expect(view.container.querySelector('[data-svadmin-data-state="loading"]')).toBeNull();
    expect(view.queryByRole('button')).toBeNull();
  });

  it('offers retry only for a recoverable error', async () => {
    let retries = 0;
    const view = render(DataState, {
      state: 'error',
      title: '加载失败',
      description: '请稍后重试。',
      retry: () => { retries += 1; },
      retryLabel: '重新加载',
    });

    const surface = view.container.querySelector('[data-svadmin-data-state="error"]');
    expect(surface?.getAttribute('role')).toBe('alert');
    await fireEvent.click(view.getByRole('button', { name: '重新加载' }));
    expect(retries).toBe(1);
  });

  it('uses a failure description instead of repeating the retry action by default', () => {
    const view = render(DataState, { state: 'error' });

    expect(view.getByText('Operation failed')).toBeTruthy();
    expect(view.queryByRole('button')).toBeNull();
  });

  it('keeps forbidden state actionable without pretending it is an error', () => {
    const view = render(DataState, {
      state: 'forbidden',
      title: '无权访问',
      description: '请联系管理员申请权限。',
    });

    const surface = view.container.querySelector('[data-svadmin-data-state="forbidden"]');
    expect(surface?.getAttribute('role')).toBe('alert');
    expect(view.queryByRole('button')).toBeNull();
    expect(view.getByText('请联系管理员申请权限。')).toBeTruthy();
  });
});
