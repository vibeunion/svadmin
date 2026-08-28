import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FilterBuilder from './FilterBuilder.svelte';
import type { FieldDefinition } from '@svadmin/core';

const testFields: FieldDefinition[] = [
  { key: 'title', label: '标题', type: 'text', filterable: true },
  { key: 'status', label: '状态', type: 'select', options: [{ label: '草稿', value: 'draft' }, { label: '已发布', value: 'published' }], filterable: true },
  { key: 'views', label: '浏览量', type: 'number', filterable: true },
];

describe('FilterBuilder component', () => {
  it('renders initial empty state and allows adding rules', async () => {
    const view = render(FilterBuilder, {
      fields: testFields,
      filters: [],
    });

    expect(view.container.textContent).toContain('暂无筛选条件');

    const addBtn = view.container.querySelector('[data-testid="filter-builder-add-rule"]');
    expect(addBtn).not.toBeNull();
    if (addBtn) await fireEvent.click(addBtn);

    expect(view.container.textContent).not.toContain('暂无筛选条件');
  });

  it('compiles rules into filters and triggers onApply', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: testFields,
      filters: [{ field: 'title', operator: 'contains', value: 'Svelte' }],
      onApply,
    });

    const applyBtn = view.container.querySelector('[data-testid="filter-builder-apply"]');
    expect(applyBtn).not.toBeNull();
    if (applyBtn) await fireEvent.click(applyBtn);

    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith([
      { field: 'title', operator: 'contains', value: 'Svelte' },
    ]);
  });
});
