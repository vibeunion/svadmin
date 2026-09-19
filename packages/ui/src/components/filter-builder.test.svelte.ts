import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FilterBuilder from './FilterBuilder.svelte';
import FilterBuilderLocale from './FilterBuilderLocale.test.svelte';
import type { FieldDefinition } from '@svadmin/core';

const testFields: FieldDefinition[] = [
  { key: 'title', label: '标题', type: 'text', filterable: true },
  { key: 'status', label: '状态', type: 'select', options: [{ label: '草稿', value: 'draft' }, { label: '已发布', value: 'published' }], filterable: true },
  { key: 'views', label: '浏览量', type: 'number', filterable: true },
];

describe('FilterBuilder component', () => {
  it.each([['en', 'No filters yet.'], ['zh', '暂无筛选条件']])('renders %s empty state and allows adding rules', async (locale, emptyText) => {
    const view = render(FilterBuilderLocale, { locale, fields: testFields });
    expect(view.container.textContent).toContain(emptyText);
    await fireEvent.click(view.getByTestId('filter-builder-add-rule'));
    expect(view.container.textContent).not.toContain(emptyText);
    expect(view.container.querySelectorAll('[data-filter-rule]')).toHaveLength(1);
  });

  it('keeps simultaneous form-tree locales isolated', () => {
    const english = render(FilterBuilderLocale, { locale: 'en', fields: testFields });
    const chinese = render(FilterBuilderLocale, { locale: 'zh', fields: testFields });
    expect(english.container.textContent).toContain('No filters yet.');
    expect(english.container.textContent).not.toContain('暂无筛选条件');
    expect(chinese.container.textContent).toContain('暂无筛选条件');
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
