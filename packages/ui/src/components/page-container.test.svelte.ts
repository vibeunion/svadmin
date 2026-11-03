import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import PageContainer from './PageContainer.svelte';

describe('PageContainer', () => {
  it('renders title, subtitle, breadcrumbs and tags with Arco design classes', () => {
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
});
