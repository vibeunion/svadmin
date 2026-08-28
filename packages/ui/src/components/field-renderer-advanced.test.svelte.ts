import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import FieldRenderer from './FieldRenderer.svelte';
import type { FieldDefinition } from '@svadmin/core';

describe('FieldRenderer advanced controls', () => {
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
