import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/svelte';
import FieldRenderer from './FieldRenderer.svelte';
import type { FieldDefinition } from '@svadmin/core';
import { requireValue } from '../../../../scripts/test-assertions';

describe('FieldRenderer advanced controls', () => {
  it.each([false, true])('keeps typed select values and disabled choices (large=%s)', async large => {
    const onchange = vi.fn();
    const view = render(FieldRenderer, {
      field: {
        key: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '草稿', value: 2 },
          { label: '已发布', value: 'published', disabled: true },
          { label: '文本编号', value: '2' },
          ...(large ? Array.from({ length: 7 }, (_, index) => ({
            label: `Extra ${index}`, value: `extra-${index}`,
          })) : []),
        ],
      },
      value: 2,
      onchange,
    });

    const select = view.container.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('option:0');
    expect(view.container.querySelector('input[type="hidden"]')?.getAttribute('value')).toBe('2');
    expect(select.querySelector('option[value="option:1"]')?.hasAttribute('disabled')).toBe(true);

    await fireEvent.change(select, { target: { value: 'option:1' } });
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.change(select, { target: { value: 'option:0' } });
    expect(onchange).toHaveBeenCalledWith(2);
    await fireEvent.change(select, { target: { value: 'option:2' } });
    expect(onchange).toHaveBeenLastCalledWith('2');
    await view.rerender({ value: '2' });
    expect(select.value).toBe('option:2');
    await fireEvent.change(select, { target: { value: '' } });
    expect(onchange).toHaveBeenLastCalledWith(null);
    onchange.mockClear();
    await view.rerender({ disabled: true });
    await fireEvent.change(select, { target: { value: 'option:0' } });
    expect(onchange).not.toHaveBeenCalled();
    expect(view.container.querySelector('input[type="hidden"]')?.hasAttribute('disabled')).toBe(true);
  });

  it('keeps disabled multi-select values visible and blocks toggles', async () => {
    const onchange = vi.fn();
    const view = render(FieldRenderer, {
      field: {
        key: 'permissions',
        label: '权限',
        type: 'multiselect',
        options: [
          { label: '读取', value: 'read', disabled: true },
          { label: '写入', value: 'write' },
        ],
      },
      value: ['read'],
      onchange,
    });

    const checkboxes = view.getAllByRole('checkbox');
    const readCheckbox = requireValue(checkboxes[0]);
    const writeCheckbox = requireValue(checkboxes[1]);
    expect(readCheckbox.getAttribute('aria-checked')).toBe('true');
    expect(readCheckbox.hasAttribute('disabled')).toBe(true);
    expect(view.container.textContent).toContain('读取');

    await fireEvent.click(readCheckbox);
    expect(onchange).not.toHaveBeenCalled();
    const remove = view.getByRole('button');
    expect(remove.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(remove);
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(writeCheckbox);
    expect(onchange).toHaveBeenLastCalledWith(['read', 'write']);
    onchange.mockClear();
    await view.rerender({ disabled: true });
    await fireEvent.click(writeCheckbox);
    expect(onchange).not.toHaveBeenCalled();
  });

  it('renders TreeSelect component when field.type is tree-select', () => {
    const field: FieldDefinition = {
      key: 'departmentId',
      label: '所属部门',
      type: 'tree-select',
      treeOptions: [
        { label: '总经办', value: 'gm' },
        { label: '技术中心', value: 'tech', children: [{ label: '架构组', value: 'arch' }] },
      ],
    };

    const view = render(FieldRenderer, {
      field,
      value: 'arch',
      onchange: vi.fn(),
    });

    expect(view.container.textContent).toContain('所属部门');
    expect(view.container.textContent).toContain('架构组');
  });

  it('renders Cascader component when field.type is cascader', () => {
    const field: FieldDefinition = {
      key: 'region',
      label: '行政区划',
      type: 'cascader',
      cascaderOptions: [
        {
          label: '浙江省',
          value: 'zj',
          children: [{ label: '杭州市', value: 'hz' }],
        },
      ],
    };

    const view = render(FieldRenderer, {
      field,
      value: ['zj', 'hz'],
      onchange: vi.fn(),
    });

    expect(view.container.textContent).toContain('行政区划');
    expect(view.container.textContent).toContain('浙江省 / 杭州市');
  });

  it('renders Transfer component when field.type is transfer', () => {
    const field: FieldDefinition = {
      key: 'roles',
      label: '用户角色',
      type: 'transfer',
      transferData: [
        { key: 'admin', title: '管理员' },
        { key: 'member', title: '普通成员' },
      ],
    };

    const view = render(FieldRenderer, {
      field,
      value: ['admin'],
      onchange: vi.fn(),
    });

    expect(view.container.textContent).toContain('用户角色');
    expect(view.container.textContent).toContain('管理员');
    expect(view.container.textContent).toContain('普通成员');
  });
});
