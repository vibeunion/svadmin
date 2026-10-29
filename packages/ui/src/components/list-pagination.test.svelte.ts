import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
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
    render(ListPagination, {
      props: { page: 2, totalPages: 4, total: 80, rangeStart: 21, rangeEnd: 40, label: '委托单', onPageChange },
    });
    expect(screen.getByRole('button', { name: '委托单第 2 页' }).hasAttribute('disabled')).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: '委托单下一页' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(screen.getByText('第 21–40 条 / 共 80 条')).not.toBeNull();
  });

  it('renders a plain summary for a single page and can omit it inside a footer', () => {
    const onPageChange = vi.fn();
    const { rerender } = render(ListPagination, {
      props: { page: 1, totalPages: 1, total: 8, label: '记录', onPageChange },
    });
    expect(screen.getByText('共 8 条')).not.toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
    rerender({ page: 1, totalPages: 1, total: 8, label: '记录', onPageChange, showSummary: false });
    expect(screen.queryByText('共 8 条')).toBeNull();
  });

  it('offers page-size changes when a handler is supplied', async () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(ListPagination, {
      props: {
        page: 1, totalPages: 5, total: 200, rangeStart: 1, rangeEnd: 20,
        pageSize: 20, label: '记录', onPageChange, onPageSizeChange,
      },
    });
    await fireEvent.change(screen.getByRole('combobox', { name: '记录每页条数' }), { target: { value: '50' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});

describe('ListFooter', () => {
  it('shows truncation guidance once while keeping pagination in the footer', () => {
    render(ListFooter, {
      props: {
        label: '委托单', total: 5000, loadedCount: 2500, maxRecords: 2500, truncated: true,
        page: 1, totalPages: 50, rangeStart: 1, rangeEnd: 50, onPageChange: () => {},
      },
    });
    expect(screen.getByText('共 2500 条')).not.toBeNull();
    expect(screen.getByText('结果较多，仅加载前 2500 条，请用筛选收窄范围。')).not.toBeNull();
    expect(screen.getByRole('navigation', { name: '委托单分页导航' })).not.toBeNull();
    expect(screen.queryByText('第 1–50 条 / 共 5000 条')).toBeNull();
  });
});
