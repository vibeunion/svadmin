import { requireValue } from "../../../../scripts/test-assertions";
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DynamicFormList from './DynamicFormList.svelte';

describe('DynamicFormList component', () => {
  it('renders initial items and labels', () => {
    const items = [{ name: 'Item 1' }, { name: 'Item 2' }];
    const view = render(DynamicFormList, {
      items,
      label: '子项目列表',
      description: '可以动态增减的子列表',
      addButtonLabel: '新增子项',
    });

    expect(view.container.textContent).toContain('子项目列表');
    expect(view.container.textContent).toContain('可以动态增减的子列表');
    expect(view.container.textContent).toContain('新增子项');
    expect(view.container.textContent).toContain('Item 1');
    expect(view.container.textContent).toContain('Item 2');
  });

  it('renders empty text when items array is empty', () => {
    const view = render(DynamicFormList, {
      items: [],
      emptyText: '暂无明细数据',
    });
    expect(view.container.textContent).toContain('暂无明细数据');
  });

  it('calls onchange when adding a new item', async () => {
    const onchange = vi.fn();
    const view = render(DynamicFormList, {
      items: [{ name: 'First' }],
      defaultItem: { name: 'New Item' },
      addButtonLabel: '添加一项',
      onchange,
    });

    const addBtn = Array.from(view.container.querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('添加一项')
    );
    expect(addBtn).toBeDefined();
    if (addBtn) await fireEvent.click(addBtn);

    expect(onchange).toHaveBeenCalled();
    const updated = requireValue(onchange.mock.calls[0])[0];
    expect(updated).toHaveLength(2);
    expect(updated[1]).toEqual({ name: 'New Item' });
  });

  it('respects maxItems and disables or hides add button when reached', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const view = render(DynamicFormList, {
      items,
      maxItems: 2,
      addButtonLabel: '添加一项',
    });

    const addBtn = Array.from(view.container.querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('添加一项')
    );
    expect(addBtn).toBeUndefined();
  });

  it('moves and duplicates undefined elements without treating them as missing indices', () => {
    const onchange = vi.fn<(items: (number | undefined)[]) => void>();
    const view = render(DynamicFormList<number | undefined>, { items: [1, undefined, 3], onchange });
    view.component.moveUp(1);
    expect(onchange).toHaveBeenLastCalledWith([undefined, 1, 3]);
    view.component.moveDown(0);
    expect(onchange).toHaveBeenLastCalledWith([1, undefined, 3]);
    view.component.duplicate(1);
    expect(onchange).toHaveBeenLastCalledWith([1, undefined, undefined, 3]);
  });

  it('ignores out-of-range and non-integer indices', () => {
    const onchange = vi.fn();
    const view = render(DynamicFormList, { items: [1, 2], onchange });
    for (const index of [-1, 2, 0.5, Number.NaN, Infinity]) {
      view.component.moveUp(index);
      view.component.moveDown(index);
      view.component.duplicate(index);
      view.component.remove(index);
    }
    expect(onchange).not.toHaveBeenCalled();
  });

  it('requires an explicit factory instead of inventing an item of generic type', () => {
    const view = render(DynamicFormList, { items: [1] });
    expect(() => view.component.add()).toThrow('requires defaultItem or createItem');
    const onchange = vi.fn();
    const withFactory = render(DynamicFormList, { items: [1], createItem: () => 2, onchange });
    withFactory.component.add();
    expect(onchange).toHaveBeenCalledWith([1, 2]);
  });
});
