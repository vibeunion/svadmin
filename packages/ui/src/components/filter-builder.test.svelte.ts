import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/svelte';
import FilterBuilder from './FilterBuilder.svelte';
import FilterBuilderLocale from './FilterBuilderLocale.test.svelte';
import type { FieldDefinition } from '@svadmin/core';

const testFields: FieldDefinition[] = [
  { key: 'title', label: '标题', type: 'text', filterable: true },
  { key: 'status', label: '状态', type: 'select', options: [{ label: '草稿', value: 'draft' }, { label: '已发布', value: 'published' }], filterable: true },
  { key: 'views', label: '浏览量', type: 'number', filterable: true },
];

describe('FilterBuilder component', () => {
  it('makes preserved filters editable when field metadata arrives', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: [],
      filters: [{ field: 'title', operator: 'contains', value: 'Svelte' }],
      onApply,
    });
    expect(view.container.querySelector('output')).toBeTruthy();
    await view.rerender({ fields: testFields });
    expect(view.container.querySelector('output')).toBeNull();
    const input = view.container.querySelector<HTMLInputElement>('input');
    if (!input) throw new Error('Expected editable filter');
    await fireEvent.input(input, { target: { value: 'Updated' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledWith([{ field: 'title', operator: 'contains', value: 'Updated' }]);
  });

  it('renders initial empty state and allows adding rules', async () => {
    const view = render(FilterBuilderLocale, {
      fields: testFields,
      locale: 'zh',
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

  it('preserves nested logical groups when applying', async () => {
    const onApply = vi.fn();
    const filters = [{
      operator: 'or' as const,
      value: [
        { field: 'title', operator: 'contains' as const, value: 'Svelte' },
        {
          operator: 'and' as const,
          value: [
            { field: 'status', operator: 'eq' as const, value: 'published' },
            { field: 'views', operator: 'gte' as const, value: 100 },
          ],
        },
      ],
    }];

    const view = render(FilterBuilder, { fields: testFields, filters, onApply });
    const applyBtn = view.container.querySelector('[data-testid="filter-builder-apply"]');
    expect(view.container.querySelectorAll('[data-testid="filter-builder-group"]')).toHaveLength(1);
    if (applyBtn) await fireEvent.click(applyBtn);

    expect(onApply).toHaveBeenCalledWith(filters);
  });

  it('preserves typed select values and blocks incomplete rules', async () => {
    const onApply = vi.fn();
    const fields: FieldDefinition[] = [{
      key: 'priority', label: '优先级', type: 'select',
      options: [{ label: '高', value: 2 }, { label: '低', value: 'low' }],
    }];
    const view = render(FilterBuilder, { fields, filters: [{ field: 'priority', operator: 'eq', value: 2 }], onApply });
    const initialApply = view.container.querySelector<HTMLButtonElement>('[data-testid="filter-builder-apply"]');
    if (!initialApply) throw new Error('Expected apply button');
    await fireEvent.click(initialApply);
    expect(onApply).toHaveBeenCalledWith([{ field: 'priority', operator: 'eq', value: 2 }]);

    const addRule = view.container.querySelector<HTMLButtonElement>('[data-testid="filter-builder-add-rule"]');
    const applyIncomplete = view.container.querySelector<HTMLButtonElement>('[data-testid="filter-builder-apply"]');
    if (!addRule || !applyIncomplete) throw new Error('Expected filter controls');
    await fireEvent.click(addRule);
    await fireEvent.click(applyIncomplete);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(view.getByRole('alert')).toBeTruthy();
  });

  it('keeps unsupported incoming conditions read-only instead of rewriting them', async () => {
    const onApply = vi.fn();
    const filters = [{ field: 'title', operator: 'in' as const, value: ['Svelte', 'SVAR'] }];
    const view = render(FilterBuilder, { fields: testFields, filters, onApply });
    const applyReadonly = view.container.querySelector<HTMLButtonElement>('[data-testid="filter-builder-apply"]');
    if (!applyReadonly) throw new Error('Expected apply button');
    await fireEvent.click(applyReadonly);
    expect(onApply).toHaveBeenCalledWith(filters);
    expect(view.getByRole('status', { name: /只读|read-only/i })).toBeTruthy();
  });

  it('distinguishes numeric and string enum values during actual edits', async () => {
    const onApply = vi.fn();
    const fields: FieldDefinition[] = [{
      key: 'priority', label: 'Priority', type: 'select',
      options: [{ label: 'Number', value: 2 }, { label: 'String', value: '2' }],
    }];
    const view = render(FilterBuilder, { fields, filters: [{ field: 'priority', operator: 'eq', value: 2 }], onApply });
    const selects = within(view.getByTestId('filter-builder-rule')).getAllByRole('combobox');
    const valueSelect = selects[2];
    if (!valueSelect) throw new Error('Missing enum value input');
    await fireEvent.change(valueSelect, { target: { value: '1' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'priority', operator: 'eq', value: '2' }]);
    await fireEvent.change(valueSelect, { target: { value: '0' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'priority', operator: 'eq', value: 2 }]);
  });

  it('blocks a cleared number without dropping it and accepts zero after correction', async () => {
    const onApply = vi.fn();
    const view = render(FilterBuilder, {
      fields: testFields, filters: [{ field: 'views', operator: 'gte', value: 100 }], onApply,
    });
    const input = view.getByRole('spinbutton');
    await fireEvent.input(input, { target: { value: '' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).not.toHaveBeenCalled();
    expect(view.getByRole('alert')).toBeTruthy();
    await fireEvent.input(input, { target: { value: '0' } });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenLastCalledWith([{ field: 'views', operator: 'gte', value: 0 }]);
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('preserves explicit AND, empty groups and empty-string equality on round trip', async () => {
    const onApply = vi.fn();
    const filters = [{
      operator: 'and' as const,
      value: [
        { operator: 'or' as const, value: [] },
        { field: 'title', operator: 'eq' as const, value: '' },
      ],
    }];
    const view = render(FilterBuilder, { fields: testFields, filters, onApply });
    await fireEvent.click(view.getByTestId('filter-builder-apply'));
    expect(onApply).toHaveBeenCalledWith(filters);
  });
});
