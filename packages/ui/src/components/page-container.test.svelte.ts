import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import PageContainer from './PageContainer.svelte';

describe('PageContainer', () => {
  it('renders title, subtitle, breadcrumbs and status tags', () => {
    render(PageContainer, {
      title: '用户列表',
      subTitle: '管理系统中的所有用户账户',
      breadcrumbs: [
        { label: '首页', href: '/' },
        { label: '用户管理' },
      ],
      tags: [
        { label: 'PRO', tone: 'primary' },
        { label: 'RUNNING', tone: 'success' },
      ],
    });

    expect(screen.getByText('用户列表')).toBeTruthy();
    expect(screen.getByText('管理系统中的所有用户账户')).toBeTruthy();
    expect(screen.getByText('首页')).toBeTruthy();
    expect(screen.getByText('用户管理')).toBeTruthy();
    expect(screen.getByText('PRO')).toBeTruthy();
    expect(screen.getByText('RUNNING')).toBeTruthy();
  });

  it('renders tabs and fires ontabchange when a tab is clicked', async () => {
    const ontabchange = vi.fn();
    render(PageContainer, {
      title: '仪表盘',
      tabs: [
        { key: 'overview', label: '总览' },
        { key: 'analytics', label: '分析' },
        { key: 'disabled', label: '已停用', disabled: true },
      ],
      activeTab: 'overview',
      ontabchange,
    });

    const overviewTab = screen.getByRole('tab', { name: '总览' });
    expect(overviewTab.getAttribute('aria-selected')).toBe('true');

    const analyticsTab = screen.getByRole('tab', { name: '分析' });
    await fireEvent.click(analyticsTab);

    expect(ontabchange).toHaveBeenCalledWith('analytics');
  });

  it('handles back button navigation callback', async () => {
    const onback = vi.fn();
    render(PageContainer, {
      title: '详情页',
      backIcon: true,
      onback,
    });

    const backBtn = screen.getByRole('button', { name: '返回上一页' });
    await fireEvent.click(backBtn);

    expect(onback).toHaveBeenCalledTimes(1);
  });

  it('applies compact mobile spacing, wrapping badges, and horizontal touch-scroll tabs', () => {
    const { container } = render(PageContainer, {
      title: '移动端适配页面',
      breadcrumbs: [
        { label: '首页', href: '/' },
        { label: '监控中心', href: '/monitor' },
        { label: '实时席位' },
      ],
      tags: [
        { label: 'LIVE', tone: 'success' },
        { label: 'DELAYED', tone: 'warning' },
      ],
      tabs: [
        { key: 'tab1', label: '核心总览' },
        { key: 'tab2', label: '资金归因' },
        { key: 'tab3', label: '风险矩阵' },
        { key: 'tab4', label: '审计流水' },
      ],
      activeTab: 'tab1',
    });

    const header = container.querySelector('.svadmin-page-header');
    expect(header?.className).toContain('px-3.5');
    expect(header?.className).toContain('sm:px-6');

    const breadcrumbNav = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(breadcrumbNav?.className).toContain('flex-wrap');

    const tablist = screen.getByRole('tablist');
    expect(tablist.className).toContain('svadmin-page-container__tablist');
    expect(tablist.className).toContain('overflow-x-auto');

    const firstTab = screen.getByRole('tab', { name: '核心总览' });
    expect(firstTab.className).toContain('shrink-0');
    expect(firstTab.className).toContain('whitespace-nowrap');

    const main = container.querySelector('main');
    expect(main?.className).toContain('p-3');
    expect(main?.className).toContain('sm:p-6');
  });
});
