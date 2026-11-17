import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render as renderBare } from '@testing-library/svelte';
import ListPagination from './ListPagination.svelte';

describe('ListPagination Arco parity (size, disabled, showTotal, current)', () => {
  it('renders with size="mini", "small", "large", and "default"', () => {
    const { container, rerender } = renderBare(ListPagination, {
      props: { page: 1, totalPages: 5, total: 50, size: 'mini', onPageChange: vi.fn() },
    });
    const root = container.querySelector('.svadmin-list-pagination');
    expect(root?.getAttribute('data-size')).toBe('mini');
    expect(root?.classList.contains('svadmin-list-pagination--mini')).toBe(true);

    rerender({ page: 1, totalPages: 5, total: 50, size: 'small', onPageChange: vi.fn() });
    expect(root?.getAttribute('data-size')).toBe('small');
    expect(root?.classList.contains('svadmin-list-pagination--small')).toBe(true);

    rerender({ page: 1, totalPages: 5, total: 50, size: 'large', onPageChange: vi.fn() });
    expect(root?.getAttribute('data-size')).toBe('large');
    expect(root?.classList.contains('svadmin-list-pagination--large')).toBe(true);

    rerender({ page: 1, totalPages: 5, total: 50, size: 'default', onPageChange: vi.fn() });
    expect(root?.getAttribute('data-size')).toBe('default');
  });

  it('supports current as alias for page', () => {
    const onPageChange = vi.fn();
    const { container } = renderBare(ListPagination, {
      props: { current: 3, totalPages: 5, total: 50, onPageChange },
    });
    const active = container.querySelector('.svadmin-list-pagination__page--active');
    expect(active?.textContent?.trim()).toBe('3');
  });

  it('supports showTotal as alias for showSummary', () => {
    const { container, rerender } = renderBare(ListPagination, {
      props: { page: 1, totalPages: 5, total: 50, showTotal: false, onPageChange: vi.fn() },
    });
    expect(container.querySelector('.svadmin-list-pagination__info')).toBeNull();

    rerender({ page: 1, totalPages: 5, total: 50, showTotal: true, onPageChange: vi.fn() });
    expect(container.querySelector('.svadmin-list-pagination__info')).not.toBeNull();
  });

  it('disables all controls when disabled=true', async () => {
    const onPageChange = vi.fn();
    const { container } = renderBare(ListPagination, {
      props: { page: 2, totalPages: 5, total: 50, disabled: true, showJumper: true, onPageChange },
    });
    const root = container.querySelector('.svadmin-list-pagination');
    expect(root?.getAttribute('data-disabled')).toBe('true');
    expect(root?.classList.contains('svadmin-list-pagination--disabled')).toBe(true);

    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      expect(btn.hasAttribute('disabled')).toBe(true);
    }

    const jumperInput = container.querySelector('.svadmin-list-pagination__jumper input');
    expect(jumperInput?.hasAttribute('disabled')).toBe(true);

    // Clicking disabled button should not trigger onPageChange
    const nextBtn = container.querySelectorAll('.svadmin-list-pagination__control')[1];
    if (nextBtn) {
      await fireEvent.click(nextBtn);
      expect(onPageChange).not.toHaveBeenCalled();
    }
  });
});
