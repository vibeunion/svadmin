import { describe, expect, test } from 'bun:test';
import { normalizeSelectDefaultValue, orderSelectOptions, selectQueryFilters } from './select-options';

describe('useSelect option helpers', () => {
  test('accepts a scalar default and orders selected options first when asked', () => {
    expect(normalizeSelectDefaultValue('post-1')).toEqual(['post-1']);
    expect(normalizeSelectDefaultValue(0)).toEqual([0]);
    expect(normalizeSelectDefaultValue(['a', 2])).toEqual(['a', 2]);
    expect(normalizeSelectDefaultValue(undefined)).toEqual([]);

    const list = [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }];
    const selected = [{ label: 'B', value: 'b' }, { label: 'C', value: 'c' }];
    expect(orderSelectOptions(list, selected)).toEqual([
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
      { label: 'C', value: 'c' },
    ]);
    expect(orderSelectOptions(list, selected, 'selected-first')).toEqual([
      { label: 'B', value: 'b' },
      { label: 'C', value: 'c' },
      { label: 'A', value: 'a' },
    ]);
  });

  test('builds a contains filter from searchField unless onSearch already produced filters', () => {
    expect(selectQueryFilters({ text: 'ada', searchField: 'email' })).toEqual([
      { field: 'email', operator: 'contains', value: 'ada' },
    ]);
    expect(selectQueryFilters({
      text: 'ada',
      searchField: 'email',
      searched: [{ field: 'title', operator: 'eq', value: 'ada' }],
    })).toEqual([{ field: 'title', operator: 'eq', value: 'ada' }]);
    expect(selectQueryFilters({ text: '', searchField: 'email' })).toEqual([]);
  });
});
