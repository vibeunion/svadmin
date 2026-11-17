import { describe, it, expect, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import PageContainer from './PageContainer.svelte';
import PageHeader from './PageHeader.svelte';
import Breadcrumbs from './Breadcrumbs.svelte';
import Statistic from './Statistic.svelte';

const rawSnippet = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('PageContainer, PageHeader, Breadcrumbs, and Statistic option parity', () => {
  it('PageContainer supports tabList, defaultTabActiveKey, onTabChange, breadcrumb, and content', async () => {
    const onTabChange = vi.fn();
    const { getByRole, container } = render(PageContainer, {
      props: {
        title: '集群概览',
        breadcrumb: [
          { label: '首页', href: '/' },
          { label: '基础设施', href: '/infra' },
          { label: '集群' },
        ],
        content: rawSnippet('展示当前数据中心集群运行状态'),
        tabList: [
          { key: 'monitor', label: '实时监控' },
          { key: 'logs', label: '运行日志' },
        ],
        defaultTabActiveKey: 'logs',
        onTabChange,
      },
    });

    expect(container.textContent).toContain('展示当前数据中心集群运行状态');
    expect(container.textContent).toContain('基础设施');

    const logsTab = getByRole('tab', { name: '运行日志' });
    expect(logsTab.getAttribute('aria-selected')).toBe('true');

    const monitorTab = getByRole('tab', { name: '实时监控' });
    await fireEvent.click(monitorTab);
    expect(onTabChange).toHaveBeenCalledWith('monitor');
    expect(monitorTab.getAttribute('aria-selected')).toBe('true');
  });

  it('PageHeader supports backIcon snippet and headerStyle', () => {
    const onBack = vi.fn();
    const { container } = render(PageHeader, {
      props: {
        title: '详情页面',
        backIcon: rawSnippet('⬅返回'),
        onBack,
        headerStyle: 'background-color: rgb(245, 245, 245);',
      },
    });

    expect(container.querySelector('.svadmin-page-header')?.getAttribute('style')).toContain('background-color: rgb(245, 245, 245)');
    expect(container.textContent).toContain('⬅返回');
  });

  it('Breadcrumbs supports maxCount, breadcrumbName, and path aliases', () => {
    const { container } = render(Breadcrumbs, {
      props: {
        items: [
          { breadcrumbName: '系统', path: '/system' },
          { breadcrumbName: '用户管理', path: '/system/users' },
          { breadcrumbName: '权限策略', path: '/system/users/policies' },
          { breadcrumbName: '编辑' },
        ],
        maxCount: 3,
      },
    });

    expect(container.textContent).toContain('系统');
    expect(container.textContent).toContain('编辑');
  });

  it('Statistic applies valueStyle', () => {
    const { container } = render(Statistic, {
      props: {
        title: '活跃节点',
        value: 128,
        valueStyle: 'font-weight: 700;',
      },
    });

    const valEl = container.querySelector('.svadmin-statistic__value');
    expect(valEl?.getAttribute('style')).toContain('font-weight: 700');
  });
});
