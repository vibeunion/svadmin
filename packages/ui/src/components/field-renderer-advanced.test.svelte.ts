import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/svelte';
import FieldRenderer from './FieldRenderer.svelte';
import type { FieldDefinition } from '@svadmin/core';
import { requireValue } from '../../../../scripts/test-assertions';

const heterogeneousAssociationCases = [
  ['tags', { key: 'tags', label: 'Tags', type: 'tags' }, ['alpha'], ['input[aria-label="Tags"]']],
  ['rate', { key: 'rating', label: 'Rating', type: 'rate' }, 3, ['[role="radiogroup"]']],
  ['multiselect', {
    key: 'permissions', label: 'Permissions', type: 'multiselect',
    options: [{ label: 'Read', value: 'read' }, { label: 'Write', value: 'write' }],
  }, ['read'], ['[data-svadmin-field] > [role="group"]', '[role="checkbox"]']],
  ['images', { key: 'images', label: 'Images', type: 'images' }, ['a.png', 'b.png'], ['input[type="text"]']],
  ['array', {
    key: 'items', label: 'Items', type: 'array',
    subFields: [{ key: 'sku', label: 'SKU', type: 'text' }],
  }, [{ sku: 'SKU-1' }], ['[data-svadmin-field] > [role="group"]']],
] as const;

// 真实宿主错误节点：断言 IDREF 必须解析到页面内可访问节点，而不是只比较字符串。
function createHostErrorNode(token: string, message: string): HTMLElement {
  const node = document.createElement('p');
  node.id = `field-renderer-host-error-${token}`;
  node.textContent = message;
  document.body.append(node);
  return node;
}

function collectAssociationTargets(container: HTMLElement, selectors: readonly string[]): Element[] {
  // 每个选择器都必须实际命中，避免分组命中而 checkbox 覆盖落空。
  return selectors.flatMap(selector => {
    const matches = Array.from(container.querySelectorAll(selector));
    expect(matches.length).toBeGreaterThan(0);
    return matches;
  });
}

function idrefTokens(target: Element): string[] {
  return (target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
}

function resolveIdrefs(target: Element): Element[] {
  return idrefTokens(target).map(ref => {
    const resolved = document.getElementById(ref);
    if (!resolved) throw new Error(`IDREF "${ref}" does not resolve to a live node`);
    return resolved;
  });
}

function expectIsolatedAssociation(
  targets: Element[],
  description: Element,
  errorNode: Element,
  foreignNodes: readonly Element[],
) {
  expect(errorNode.textContent).not.toBe('');
  expect(targets.length).toBeGreaterThan(0);
  for (const target of targets) {
    const resolved = resolveIdrefs(target);
    expect(idrefTokens(target)).toHaveLength(2);
    expect(resolved).toContain(description);
    expect(resolved).toContain(errorNode);
    for (const foreign of foreignNodes) expect(resolved).not.toContain(foreign);
    expect(target.getAttribute('aria-invalid') ?? target.getAttribute('data-invalid')).toBeTruthy();
  }
}

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

  it.each(heterogeneousAssociationCases)('isolates generated description/error IDREFs for %s across same-key instances without explicit ids', async (type, baseField, value, selectors) => {
    const errorA = createHostErrorNode(`${type}-a`, `Host error A for ${type}`);
    const errorB = createHostErrorNode(`${type}-b`, `Host error B for ${type}`);
    const fieldA = { ...baseField, description: `Help A for ${baseField.label}` } as FieldDefinition;
    const fieldB = { ...baseField, description: `Help B for ${baseField.label}` } as FieldDefinition;
    // 同页两个同业务 key 实例，均不传显式 id，各自绑定独立的宿主错误节点。
    const viewA = render(FieldRenderer, { field: fieldA, value, onchange: vi.fn(), invalid: true, errorId: errorA.id });
    const viewB = render(FieldRenderer, { field: fieldB, value, onchange: vi.fn(), invalid: true, errorId: errorB.id });
    try {
      const descriptionA = requireValue(viewA.container.querySelector('[data-svadmin-field-description]'));
      const descriptionB = requireValue(viewB.container.querySelector('[data-svadmin-field-description]'));
      expect(descriptionA.id).not.toBe('');
      expect(descriptionB.id).not.toBe('');
      expect(descriptionA.id).not.toBe(descriptionB.id);
      expect(descriptionA.textContent).toBe(`Help A for ${baseField.label}`);
      expect(descriptionB.textContent).toBe(`Help B for ${baseField.label}`);

      expectIsolatedAssociation(collectAssociationTargets(viewA.container, selectors), descriptionA, errorA, [descriptionB, errorB]);
      expectIsolatedAssociation(collectAssociationTargets(viewB.container, selectors), descriptionB, errorB, [descriptionA, errorA]);

      // 更新说明：本实例关联指向同一个说明节点，另一实例不受影响。
      await viewA.rerender({ field: { ...fieldA, description: `Help A updated for ${baseField.label}` } as FieldDefinition });
      const updatedDescriptionA = requireValue(viewA.container.querySelector('[data-svadmin-field-description]'));
      expect(updatedDescriptionA).toBe(descriptionA);
      expect(updatedDescriptionA.textContent).toBe(`Help A updated for ${baseField.label}`);
      expectIsolatedAssociation(collectAssociationTargets(viewA.container, selectors), updatedDescriptionA, errorA, [descriptionB, errorB]);
      expectIsolatedAssociation(collectAssociationTargets(viewB.container, selectors), descriptionB, errorB, [updatedDescriptionA, errorA]);

      // 先移除错误：只剩说明 IDREF，invalid 收敛。
      await viewA.rerender({ errorId: undefined, invalid: false });
      for (const target of collectAssociationTargets(viewA.container, selectors)) {
        expect(resolveIdrefs(target)).toEqual([updatedDescriptionA]);
        expect(target.hasAttribute('aria-invalid')).toBe(false);
        expect(target.hasAttribute('data-invalid')).toBe(false);
      }

      // 再移除说明：本实例不再有说明/错误关联或 invalid 标记。
      await viewA.rerender({ field: baseField as FieldDefinition });
      expect(viewA.container.querySelector('[data-svadmin-field-description]')).toBeNull();
      for (const target of collectAssociationTargets(viewA.container, selectors)) {
        expect(idrefTokens(target)).toEqual([]);
        expect(target.hasAttribute('aria-invalid')).toBe(false);
        expect(target.hasAttribute('data-invalid')).toBe(false);
      }
      expect(collectAssociationTargets(viewA.container, selectors).length).toBeGreaterThan(0);

      // 移除 A 的说明/错误后，B 的说明、宿主错误与 invalid 仍完整。
      expectIsolatedAssociation(collectAssociationTargets(viewB.container, selectors), descriptionB, errorB, [updatedDescriptionA, errorA]);
    } finally {
      viewA.unmount();
      viewB.unmount();
      errorA.remove();
      errorB.remove();
    }
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

  it.each(['tree-select', 'treeselect'] as const)('serializes %s scalar values without losing zero or field names', async (type) => {
    const form = document.createElement('form');
    document.body.append(form);
    const onchange = vi.fn();
    const field: FieldDefinition = {
      key: 'departmentId', label: '所属部门', type,
      treeOptions: [{ label: '总经办', value: 0 }, { label: '架构组', value: 'arch' }],
    };
    const view = render(FieldRenderer, { target: form, props: { field, value: 0, onchange } });
    try {
      expect(Array.from(new FormData(form))).toEqual([['departmentId', '0']]);
      await view.rerender({ disabled: true });
      expect(Array.from(new FormData(form))).toEqual([]);
      await view.rerender({ value: 'arch' });
      expect(Array.from(new FormData(form))).toEqual([]);
      await view.rerender({ disabled: false });
      expect(Array.from(new FormData(form))).toEqual([['departmentId', 'arch']]);
      await view.rerender({ value: null });
      expect(Array.from(new FormData(form))).toEqual([['departmentId', '']]);
      expect(onchange).not.toHaveBeenCalled();
    } finally {
      view.unmount();
      form.remove();
    }
  });

  it.each(['tree-select', 'treeselect', 'transfer'] as const)('serializes %s lists and restores the latest host value after enablement', async (type) => {
    const form = document.createElement('form');
    document.body.append(form);
    const onchange = vi.fn();
    const field: FieldDefinition = {
      key: 'choices', label: '选项', type, multiple: true,
      treeOptions: [{ label: 'Zero', value: 0 }, { label: 'Member', value: 'member' }],
      transferData: [{ key: 0, title: 'Zero' }, { key: 'member', title: 'Member' }],
    };
    const view = render(FieldRenderer, { target: form, props: { field, value: [0, 'member'], onchange } });
    try {
      expect(Array.from(new FormData(form))).toEqual([['choices[]', '0'], ['choices[]', 'member']]);
      await view.rerender({ disabled: true });
      expect(Array.from(new FormData(form))).toEqual([]);
      await view.rerender({ value: ['member'] });
      expect(Array.from(new FormData(form))).toEqual([]);
      await view.rerender({ disabled: false });
      expect(Array.from(new FormData(form))).toEqual([['choices[]', 'member']]);
      await view.rerender({ value: [] });
      expect(Array.from(new FormData(form))).toEqual([]);
      expect(onchange).not.toHaveBeenCalled();
    } finally {
      view.unmount();
      form.remove();
    }
  });

  it('serializes cascader paths as one JSON field and restores them after enablement', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    const field: FieldDefinition = {
      key: 'region', label: '行政区划', type: 'cascader',
      cascaderOptions: [{ label: '浙江省', value: 'zj', children: [{ label: '杭州市', value: 'hz' }] }],
    };
    const value = ['zj', 'hz'];
    const onchange = vi.fn();
    const view = render(FieldRenderer, { target: form, props: { field, value, onchange, disabled: true } });
    try {
      expect(new FormData(form).get('region')).toBeNull();
      await view.rerender({ disabled: false });
      expect(Array.from(new FormData(form))).toEqual([['region', JSON.stringify(value)]]);
      await view.rerender({ disabled: true, value: ['zj'] });
      expect(Array.from(new FormData(form))).toEqual([]);
      await view.rerender({ disabled: false });
      expect(Array.from(new FormData(form))).toEqual([['region', '["zj"]']]);
      await view.rerender({ value: [] });
      expect(Array.from(new FormData(form))).toEqual([['region', '[]']]);
      expect(onchange).not.toHaveBeenCalled();
    } finally {
      view.unmount();
      form.remove();
    }
  });

  it.each([
    ['boolean', false, [['enabled', 'false']], true, [['enabled', 'true']]],
    ['images', ['a.png', 'b.png'], [['images[]', 'a.png'], ['images[]', 'b.png']], ['c.png'], [['images[]', 'c.png']]],
    ['tags', ['old', 'second'], [['tags[]', 'old'], ['tags[]', 'second']], ['new'], [['tags[]', 'new']]],
    ['rate', 0, [['rating', '0']], 3, [['rating', '3']]],
    ['rating', 0, [['rating', '0']], 3, [['rating', '3']]],
  ] as const)('excludes %s hidden values while disabled and restores them from the latest host value', async (type, value, expected, next, nextExpected) => {
    const form = document.createElement('form');
    document.body.append(form);
    const field: FieldDefinition = type === 'boolean'
      ? { key: 'enabled', label: 'Enabled', type }
      : type === 'images' || type === 'tags'
        ? { key: type, label: 'Items', type }
        : { key: 'rating', label: 'Rating', type };
    const onchange = vi.fn();
    const view = render(FieldRenderer, { target: form, props: { field, value, onchange, disabled: true } });
    try {
      expect(Array.from(new FormData(form))).toEqual([]);
      await view.rerender({ disabled: false });
      expect(Array.from(new FormData(form))).toEqual(expected);
      await view.rerender({ disabled: true, value: next });
      expect(Array.from(new FormData(form))).toEqual([]);
      await view.rerender({ disabled: false });
      expect(Array.from(new FormData(form))).toEqual(nextExpected);
      expect(onchange).not.toHaveBeenCalled();
    } finally {
      view.unmount();
      form.remove();
    }
  });
});
