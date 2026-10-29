import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DataTableShellHarness from './data-table-shell.test-host.svelte';

describe('DataTableShell', () => {
  it('renders a title, count, toolbar, and table content', () => {
    render(DataTableShellHarness, {
      props: { title: '委托单', count: 12, caption: '委托单列表', toolbarText: '导出' },
    });
    expect(screen.getByRole('region', { name: '委托单列表' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: '委托单' })).not.toBeNull();
    expect(screen.getByText('12 条')).not.toBeNull();
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
});
