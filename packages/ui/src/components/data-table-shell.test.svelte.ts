import { describe, expect, it, vi } from 'vitest';
import { render as renderBare, screen, within } from '@testing-library/svelte';
import { renderWithI18n as render } from '../../test/fixtures/render-with-i18n';
import ListI18nProviderHost from '../../test/fixtures/ListI18nProviderHost.svelte';
import DataTableShellHarness from './data-table-shell.test-host.svelte';

describe('DataTableShell', () => {
  it('renders a title, count, toolbar, and table content', () => {
    render(DataTableShellHarness, {
      props: { title: '委托单', count: 12, caption: '委托单列表', toolbarText: '导出' },
    }, 'zh-CN');
    expect(screen.getByRole('region', { name: '委托单列表' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '委托单' })).not.toBeNull();
    expect(screen.getByText('共 12 条')).not.toBeNull();
    expect(screen.getByRole('button', { name: '导出' })).not.toBeNull();
    expect(screen.getByText('FA-001')).not.toBeNull();
  });

  it('supports an untitled table and omits the header entirely', () => {
    render(DataTableShellHarness, { props: { caption: '无标题列表' } });
    expect(screen.getByRole('region', { name: '无标题列表' })).not.toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(document.querySelector('[data-slot="data-table-shell-header"]')).toBeNull();
  });

  it('marks the shell when the last column stays sticky', () => {
    render(DataTableShellHarness, { props: { caption: '带操作列表', stickyActions: true } });
    expect(document.querySelector('[data-svadmin-data-table-shell]')?.classList)
      .toContain('svadmin-data-table-shell--sticky-actions');
  });

  it('updates the count in its own locale scope without changing host text', async () => {
    const english = render(DataTableShellHarness, {
      title: 'Orders', caption: 'Order list', count: 12, toolbarText: 'Export',
    }, 'en');
    const chinese = render(DataTableShellHarness, {
      title: '订单', caption: '订单列表', count: 0,
    }, 'zh-CN');
    const first = within(english.container);
    const second = within(chinese.container);

    expect(first.getByText('Total: 12')).not.toBeNull();
    expect(second.getByText('共 0 条')).not.toBeNull();
    await english.wrapper.setLocale('zh-CN');
    expect(first.getByText('共 12 条')).not.toBeNull();
    expect(second.getByText('共 0 条')).not.toBeNull();
    expect(first.getByRole('heading', { name: 'Orders' })).not.toBeNull();
    expect(first.getByRole('button', { name: 'Export' })).not.toBeNull();
  });

  it.each([
    ['Custom count', 'Custom count'],
    ['common.total', 'Total: 12'],
  ])('respects the host count translation %s', (translation, expected) => {
    const translate = vi.fn(() => translation);
    const view = renderBare(DataTableShellHarness, {
      title: 'Orders', caption: 'Order list', count: 12,
    }, {
      wrapper: ListI18nProviderHost,
      wrapperProps: { provider: { getLocale: () => 'en', setLocale: () => {}, translate } },
    });

    expect(view.getByText(expected)).not.toBeNull();
    expect(translate).toHaveBeenCalledWith('common.total', { total: 12 });
  });
});
