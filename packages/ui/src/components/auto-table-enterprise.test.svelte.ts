import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AutoTableEnterpriseHarness from '../../test/fixtures/AutoTableEnterpriseHarness.svelte';
import DescriptionList from './content/DescriptionList.svelte';

beforeEach(() => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    } satisfies Partial<Storage>,
  });
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({ cancel: () => {}, finished: Promise.resolve() }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AutoTable enterprise enhancements', () => {
  it('renders table toolbar with density switcher and refresh button', async () => {
    const view = render(AutoTableEnterpriseHarness, {
      viewMode: 'table',
      showHeader: true,
    });

    expect(await view.findByRole('heading', { level: 1, name: '用户管理' })).toBeTruthy();
    expect(await view.findByPlaceholderText('搜索...')).toBeTruthy();
    expect(await view.findByRole('button', { name: '表格密度' })).toBeTruthy();
    expect(await view.findByRole('button', { name: '刷新' })).toBeTruthy();
    expect(await view.findByRole('button', { name: '列' })).toBeTruthy();
  });

  it('omits top h1 heading when showHeader is false', async () => {
    const view = render(AutoTableEnterpriseHarness, {
      viewMode: 'table',
      showHeader: false,
    });

    await waitFor(() => {
      expect(view.queryByRole('heading', { level: 1, name: '用户管理' })).toBeNull();
    });
    // Toolbar controls should still be present
    expect(await view.findByPlaceholderText('搜索...')).toBeTruthy();
    expect(await view.findByRole('button', { name: '表格密度' })).toBeTruthy();
    expect(await view.findByRole('button', { name: '刷新' })).toBeTruthy();
  });

  it('shows selection banner with count and clear button when rows are selected', async () => {
    const view = render(AutoTableEnterpriseHarness, {
      viewMode: 'table',
      selectable: true,
    });

    await view.findAllByText('user1@example.com');
    // Initially no selection banner
    expect(view.queryByText(/已选择/)).toBeNull();

    // Check the first row checkbox
    const checkboxes = view.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(1);
    await fireEvent.click(checkboxes[1]); // first row checkbox

    await waitFor(async () => {
      expect(await view.findByText(/已选择 1 项/)).toBeTruthy();
      expect(await view.findByRole('button', { name: /批量删除/ })).toBeTruthy();
      expect(await view.findByRole('button', { name: '取消选择' })).toBeTruthy();
    });

    // Clicking clear selection dismisses the banner
    await fireEvent.click(await view.findByRole('button', { name: '取消选择' }));
    await waitFor(() => {
      expect(view.queryByText(/已选择/)).toBeNull();
    });
  });

  it('ListPage integrates StatusTabs, FilterToolbar and AutoTable without duplicate h1', async () => {
    const view = render(AutoTableEnterpriseHarness, {
      viewMode: 'list-page',
    });

    // PageHeader h1
    expect(await view.findByRole('heading', { level: 1, name: '用户管理' })).toBeTruthy();
    // Only 1 heading with name '用户管理' (no duplicate from AutoTable)
    const headings = view.getAllByRole('heading', { name: '用户管理' });
    expect(headings).toHaveLength(1);

    // StatusTabs should be visible
    expect(await view.findAllByText('全部')).toBeTruthy();
    expect(await view.findAllByText('管理员')).toBeTruthy();

    // Table data should render
    expect(await view.findAllByText('user1@example.com')).toHaveLength(2);
    expect(await view.findAllByText('user2@example.com')).toHaveLength(2);
  });

  it('ShowPage renders in grid layout with multi-column descriptions', async () => {
    const view = render(AutoTableEnterpriseHarness, {
      viewMode: 'show-page-grid',
    });

    expect(await view.findByRole('heading', { name: /用户管理 详情 #user-1/ })).toBeTruthy();
    expect(await view.findByText('邮箱')).toBeTruthy();
    expect(await view.findByText('user1@example.com')).toBeTruthy();
    expect(await view.findByText('角色')).toBeTruthy();
  });

  it('DescriptionList supports bordered, multi-column and horizontal layouts', () => {
    const items = [
      { label: '单号', value: 'FA-2026-001' },
      { label: '客户', value: '西谷科技' },
      { label: '阶段', value: '分析中' },
      { label: '金额', value: '¥12,800' },
    ];

    const view = render(DescriptionList, {
      items,
      columns: 4,
      bordered: true,
      layout: 'horizontal',
      density: 'compact',
    });

    expect(view.getByText('FA-2026-001')).toBeTruthy();
    expect(view.getByText('西谷科技')).toBeTruthy();
    expect(view.getByText('分析中')).toBeTruthy();
    expect(view.getByText('¥12,800')).toBeTruthy();
  });
});
