import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { renderWithI18n } from '../../test/fixtures/render-with-i18n';
import FilterTagBar, { type FilterTagItem } from './FilterTagBar.svelte';

describe('FilterTagBar Component', () => {
  const sampleFilters: FilterTagItem[] = [
    { id: 'f1', field: 'status', label: '状态', operatorLabel: '=', valueLabel: '进行中' },
    { id: 'f2', field: 'amount', label: '金额', operatorLabel: '>', valueLabel: '¥1,000' },
  ];

  it('renders active filter tag capsules and clear button', () => {
    const { container } = render(FilterTagBar, {
      props: {
        filters: sampleFilters,
      },
    });

    const root = container.querySelector('[data-svadmin-component="FilterTagBar"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('已生效筛选 (2)');
    expect(container.textContent).toContain('进行中');
    expect(container.textContent).toContain('¥1,000');
    expect(container.textContent).toContain('清空全部');
  });

  it('triggers onremove callback when remove button is clicked', async () => {
    const onRemove = vi.fn();
    const { container } = render(FilterTagBar, {
      props: {
        filters: sampleFilters,
        onremove: onRemove,
      },
    });

    const removeBtns = container.querySelectorAll('button[aria-label="Remove filter"]');
    expect(removeBtns.length).toBe(2);
    const firstRemoveBtn = removeBtns[0];
    if (firstRemoveBtn) {
      await fireEvent.click(firstRemoveBtn);
      expect(onRemove).toHaveBeenCalledWith('f1');
    }
  });

  it('localizes the remove filter accessible name', () => {
    const { container } = renderWithI18n(FilterTagBar, {
      props: {
        filters: sampleFilters,
      },
    }, 'zh-CN');

    const removeBtns = container.querySelectorAll('button[aria-label="移除筛选条件"]');
    expect(removeBtns.length).toBe(2);
  });

  it('triggers onclear callback when clear all is clicked', async () => {
    const onClear = vi.fn();
    const { container } = render(FilterTagBar, {
      props: {
        filters: sampleFilters,
        onclear: onClear,
      },
    });

    const clearBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('清空全部')
    );
    expect(clearBtn).toBeTruthy();
    if (clearBtn) {
      await fireEvent.click(clearBtn);
      expect(onClear).toHaveBeenCalled();
    }
  });
});
