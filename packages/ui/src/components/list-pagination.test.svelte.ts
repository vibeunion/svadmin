import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render as renderBare, screen, within } from '@testing-library/svelte';
import { renderWithI18n } from '../../test/fixtures/render-with-i18n';
import ListI18nProviderHost from '../../test/fixtures/ListI18nProviderHost.svelte';
import ListPagination from './ListPagination.svelte';
import ListFooter from './ListFooter.svelte';
import { listPaginationItems } from './list-pagination.js';

describe('listPaginationItems', () => {
  it('keeps short ranges complete and compacts long ranges around the current page', () => {
    expect(listPaginationItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(listPaginationItems(1, 10)).toEqual([1, 2, 'ellipsis', 10]);
    expect(listPaginationItems(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
    expect(listPaginationItems(10, 10)).toEqual([1, 'ellipsis', 9, 10]);
  });
});

describe('ListPagination', () => {
  it('uses list-friendly spacing and wrapping defaults with CSS token overrides', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(directory, 'ListPagination.svelte'), 'utf8');
    expect(source).toContain('gap: var(--svadmin-list-pagination-gap, .5rem)');
    expect(source).toContain('flex-wrap: var(--svadmin-list-pagination-wrap, wrap)');
    expect(source).toContain('min-width: 0; gap: var(--svadmin-list-pagination-gap, .5rem)');
  });

  it('keeps the current page disabled and emits page changes', async () => {
    const onPageChange = vi.fn();
    renderWithI18n(ListPagination, {
      props: { page: 2, totalPages: 4, total: 80, rangeStart: 21, rangeEnd: 40, label: '委托单', onPageChange },
    }, 'zh-CN');
    expect(screen.getByRole('button', { name: '委托单第 2 页' }).hasAttribute('disabled')).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: '委托单下一页' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(screen.getByText('第 21–40 条 / 共 80 条')).not.toBeNull();
  });

  it('renders a plain summary for a single page and can omit it inside a footer', () => {
    const onPageChange = vi.fn();
    const { rerender } = renderWithI18n(ListPagination, {
      props: { page: 1, totalPages: 1, total: 8, label: '记录', onPageChange },
    }, 'zh-CN');
    expect(screen.getByText('共 8 条')).not.toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
    rerender({ page: 1, totalPages: 1, total: 8, label: '记录', onPageChange, showSummary: false });
    expect(screen.queryByText('共 8 条')).toBeNull();
  });

  it('forwards data attributes and id to the navigation root', () => {
    const onPageChange = vi.fn();
    renderWithI18n(ListPagination, {
      props: {
        page: 2, totalPages: 4, total: 80, rangeStart: 21, rangeEnd: 40,
        label: '委托单', onPageChange, 'data-section': 'order-progress', id: 'order-progress-pagination',
      },
    }, 'zh-CN');
    const navigation = screen.getByRole('navigation', { name: '委托单分页导航' });
    expect(navigation.getAttribute('data-section')).toBe('order-progress');
    expect(navigation.id).toBe('order-progress-pagination');
  });

  it('forwards root attributes to the single-page summary too', () => {
    const onPageChange = vi.fn();
    renderWithI18n(ListPagination, {
      props: {
        page: 1, totalPages: 1, total: 8, label: '记录', onPageChange,
        'data-section': 'records-summary', id: 'records-summary-pagination',
      },
    }, 'zh-CN');
    const summary = screen.getByText('共 8 条');
    expect(summary.getAttribute('data-section')).toBe('records-summary');
    expect(summary.id).toBe('records-summary-pagination');
  });

  it('offers page-size changes when a handler is supplied', async () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    renderWithI18n(ListPagination, {
      props: {
        page: 1, totalPages: 5, total: 200, rangeStart: 1, rangeEnd: 20,
        pageSize: 20, label: '记录', onPageChange, onPageSizeChange,
      },
    }, 'zh-CN');
    await fireEvent.change(screen.getByRole('combobox', { name: '记录每页条数' }), { target: { value: '50' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});

describe('ListFooter', () => {
  it('shows truncation guidance once while keeping pagination in the footer', () => {
    renderWithI18n(ListFooter, {
      props: {
        label: '委托单', total: 5000, loadedCount: 2500, maxRecords: 2500, truncated: true,
        page: 1, totalPages: 50, rangeStart: 1, rangeEnd: 50, onPageChange: () => {},
      },
    }, 'zh-CN');
    expect(screen.getByText('共 2500 条')).not.toBeNull();
    expect(screen.getByText('结果较多，仅加载前 2500 条，请用筛选收窄范围。')).not.toBeNull();
    expect(screen.getByRole('navigation', { name: '委托单分页导航' })).not.toBeNull();
    expect(screen.queryByText('第 1–50 条 / 共 5000 条')).toBeNull();
  });

  it('does not duplicate the footer count when a summarized footer has one page', () => {
    renderWithI18n(ListFooter, {
      props: {
        label: '记录', total: 8, loadedCount: 8, page: 1, totalPages: 1,
        rangeStart: 1, rangeEnd: 8, onPageChange: () => {}, showSummary: true,
      },
    }, 'zh-CN');
    expect(screen.getAllByText('共 8 条')).toHaveLength(1);
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('can show the pagination range alongside truncation guidance', () => {
    renderWithI18n(ListFooter, {
      props: {
        label: '委托单', total: 5000, loadedCount: 2500, maxRecords: 2500, truncated: true,
        page: 1, totalPages: 50, rangeStart: 1, rangeEnd: 50, onPageChange: () => {},
        showSummary: true,
      },
    }, 'zh-CN');
    expect(screen.getByText('共 2500 条')).not.toBeNull();
    expect(screen.getByText('结果较多，仅加载前 2500 条，请用筛选收窄范围。')).not.toBeNull();
    expect(screen.getByText('第 1–50 条 / 共 5000 条')).not.toBeNull();
  });
});


describe('list component i18n', () => {
  it('updates system labels and accessibility text when its locale changes', async () => {
    const view = renderWithI18n(ListPagination, {
      page: 2, totalPages: 4, total: 80, rangeStart: 21, rangeEnd: 40,
      label: 'Orders', pageSize: 20, onPageChange: vi.fn(), onPageSizeChange: vi.fn(),
    });
    expect(view.getByRole('navigation', { name: 'Orders pagination' })).not.toBeNull();
    expect(view.getByText('21–40 of 80 records')).not.toBeNull();
    expect(view.getByRole('combobox', { name: 'Orders rows per page' })).not.toBeNull();
    expect(view.getByRole('option', { name: '50 rows' })).not.toBeNull();
    expect(view.getByRole('button', { name: 'Orders page 2' }).getAttribute('title')).toBe('Current page 2');
    await view.wrapper.setLocale('zh-CN');
    expect(view.getByRole('navigation', { name: 'Orders分页导航' })).not.toBeNull();
    expect(view.getByText('第 21–40 条 / 共 80 条')).not.toBeNull();
    expect(view.getByText('每页条数')).not.toBeNull();
    expect(view.getByRole('button', { name: 'Orders第 2 页' }).getAttribute('title')).toBe('当前第 2 页');
  });

  it('keeps parallel footer locales isolated and preserves host text', async () => {
    const props = {
      page: 1, totalPages: 4, total: 80, rangeStart: 1, rangeEnd: 20,
      label: 'Records', note: 'Host note', pageSize: 20, pageSizeLabel: 'Batch length',
      showSummary: true, onPageChange: vi.fn(), onPageSizeChange: vi.fn(),
    };
    const english = renderWithI18n(ListFooter, props, 'en');
    const chinese = renderWithI18n(ListFooter, props, 'zh-CN');
    const first = within(english.container);
    const second = within(chinese.container);
    expect(first.getByText('Total: 80')).not.toBeNull();
    expect(second.getByText('共 80 条')).not.toBeNull();
    expect(first.getByText('Batch length')).not.toBeNull();
    expect(second.getByText('Host note')).not.toBeNull();
    await english.wrapper.setLocale('zh-CN');
    await chinese.wrapper.setLocale('en');
    expect(first.getByText('共 80 条')).not.toBeNull();
    expect(second.getByText('Total: 80')).not.toBeNull();
    expect(first.getByText('Host note')).not.toBeNull();
    expect(second.getByText('Batch length')).not.toBeNull();
  });

  it('localizes truncation guidance and interpolates limits', async () => {
    const view = renderWithI18n(ListFooter, {
      label: 'Records', total: 5000, loadedCount: 2500, maxRecords: 2500,
      truncated: true, page: 1, totalPages: 50, rangeStart: 1, rangeEnd: 50,
      showSummary: true, onPageChange: vi.fn(),
    });
    expect(view.getByText('Only the first 2500 records are loaded. Narrow the results using filters.')).not.toBeNull();
    expect(view.getByText('1–50 of 5000 records')).not.toBeNull();
    await view.wrapper.setLocale('zh-CN');
    expect(view.getByText('结果较多，仅加载前 2500 条，请用筛选收窄范围。')).not.toBeNull();
  });

  it('uses host translations and falls back for keys missing from its provider', () => {
    const translate = vi.fn((key: string) => key === 'listPagination.navigation' ? 'Custom navigation' : key);
    const view = renderBare(ListFooter, {
      label: 'Records', total: 80, page: 1, totalPages: 4,
      rangeStart: 1, rangeEnd: 20, showSummary: true, onPageChange: vi.fn(),
    }, {
      wrapper: ListI18nProviderHost,
      wrapperProps: { provider: { getLocale: () => 'en', setLocale: () => {}, translate } },
    });
    expect(view.getByRole('navigation', { name: 'Custom navigation' })).not.toBeNull();
    expect(view.getByText('Total: 80')).not.toBeNull();
    expect(view.getByText('1–20 of 80 records')).not.toBeNull();
    expect(translate).toHaveBeenCalledWith('listPagination.navigation', { label: 'Records' });
  });
});
