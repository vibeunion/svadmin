import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { getLocale, setLocale } from '@svadmin/core/i18n';
import FilterBuilder from './FilterBuilder.svelte';
import type { FieldDefinition } from '@svadmin/core';

const testFields: FieldDefinition[] = [
  { key: 'title', label: '标题', type: 'text', filterable: true },
  { key: 'status', label: '状态', type: 'select', options: [{ label: '草稿', value: 'draft' }, { label: '已发布', value: 'published' }], filterable: true },
  { key: 'views', label: '浏览量', type: 'number', filterable: true },
];

describe('FilterBuilder component', () => {
  it.each([['en', 'No filters yet.'], ['zh', '暂无筛选条件']])('renders %s empty state and allows adding rules', async (locale, emptyText) => {
    const previousLocale = getLocale();
    setLocale(locale);
    const view = render(FilterBuilder, { fields: testFields, filters: [] });
    try {
      expect(view.container.textContent).toContain(emptyText);
      await fireEvent.click(view.getByTestId('filter-builder-add-rule'));
      expect(view.container.textContent).not.toContain(emptyText);
      expect(view.container.querySelectorAll('[data-filter-rule]')).toHaveLength(1);
    } finally {
      view.unmount();
      setLocale(previousLocale);
    }
  });

  it('compiles rules into filters and triggers onApply', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: testFields,
      filters: [{ field: 'title', operator: 'contains', value: 'Svelte' }],
      onApply,
    });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith([{ field: 'title', operator: 'contains', value: 'Svelte' }]);
  });
});
