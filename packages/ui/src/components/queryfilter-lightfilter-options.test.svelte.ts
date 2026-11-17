import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import QueryFilter from './QueryFilter.svelte';
import LightFilter from './LightFilter.svelte';

describe('QueryFilter and LightFilter option parity', () => {
  it('QueryFilter supports searchText, resetText, collapseText, expandText, and loading', () => {
    const { container } = render(QueryFilter, {
      props: {
        searchText: 'Apply',
        resetText: 'Clear',
        collapseText: 'Fold',
        expandText: 'Unfold',
        loading: true,
      },
    });

    const searchBtn = container.querySelector('.svadmin-btn-search');
    expect(searchBtn).not.toBeNull();
    expect(searchBtn?.textContent).toContain('Apply');
    expect(searchBtn?.getAttribute('aria-busy')).toBe('true');
    expect(searchBtn?.getAttribute('disabled')).not.toBeNull();

    const resetBtn = container.querySelector('.svadmin-btn-reset');
    expect(resetBtn?.textContent).toContain('Clear');

    const collapseBtn = container.querySelector('.svadmin-btn-collapse');
    expect(collapseBtn?.textContent).toContain('Unfold');
  });

  it('QueryFilter onSearch and onReset callbacks fire', async () => {
    const onSearch = vi.fn();
    const onReset = vi.fn();
    const { container } = render(QueryFilter, {
      props: { onSearch, onReset },
    });

    const searchBtn = container.querySelector('.svadmin-btn-search');
    if (searchBtn) await fireEvent.click(searchBtn);
    expect(onSearch).toHaveBeenCalled();

    const resetBtn = container.querySelector('.svadmin-btn-reset');
    if (resetBtn) await fireEvent.click(resetBtn);
    expect(onReset).toHaveBeenCalled();
  });

  it('LightFilter supports data and value aliases', () => {
    const testItems = [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Published', value: 'published' },
          { label: 'Draft', value: 'draft' },
        ],
      },
    ];

    const { container } = render(LightFilter, {
      props: {
        data: testItems,
        value: { status: 'published' },
      },
    });

    const root = container.querySelector('[data-svadmin-component="LightFilter"]');
    expect(root?.textContent).toContain('Status: Published');
  });
});
