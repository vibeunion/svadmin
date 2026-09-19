import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TreeSelect, { type TreeSelectOption } from './TreeSelect.svelte';

const testOptions: TreeSelectOption[] = [
  {
    value: 'dept-1',
    label: '研发部',
    children: [
      { value: 'team-fe', label: '前端组' },
      { value: 'team-be', label: '后端组' },
    ],
  },
  {
    value: 'dept-2',
    label: '市场部',
    children: [
      { value: 'team-mkt', label: '营销组' },
    ],
  },
];

describe('TreeSelect component', () => {
  it('renders trigger with placeholder when no value is selected', () => {
    const view = render(TreeSelect, {
      options: testOptions,
      placeholder: '请选择部门',
    });

    expect(view.container.textContent).toContain('请选择部门');
  });

  it('renders selected label for single select value', () => {
    const view = render(TreeSelect, {
      options: testOptions,
      value: 'team-fe',
    });

    expect(view.container.textContent).toContain('前端组');
  });

  it('renders multiple badges for multiple select mode', () => {
    const view = render(TreeSelect, {
      options: testOptions,
      value: ['team-fe', 'team-be'],
      multiple: true,
    });

    expect(view.container.textContent).toContain('前端组');
    expect(view.container.textContent).toContain('后端组');
  });

  it('opens popup when clicked and renders tree nodes', async () => {
    const view = render(TreeSelect, {
      options: testOptions,
      placeholder: '选择',
    });

    const trigger = view.container.querySelector('button');
    if (trigger) await fireEvent.click(trigger);

    // Popover content rendered in body or container
    const content = document.body.textContent;
    expect(content).toContain('研发部');
    expect(content).toContain('市场部');
  });

  it('selects all descendant leaves and exposes a mixed parent state', async () => {
    const onchange = vi.fn();
    const view = render(TreeSelect, {
      options: testOptions,
      multiple: true,
      value: ['team-fe'],
      onchange,
    });

    const trigger = view.container.querySelector('button');
    if (trigger) await fireEvent.click(trigger);

    const parent = document.querySelector<HTMLElement>('[data-tree-value="dept-1"]');
    expect(parent?.getAttribute('aria-checked')).toBe('mixed');
    if (parent) await fireEvent.click(parent);

    expect(onchange).toHaveBeenCalledWith(['team-fe', 'team-be']);
  });

  it('supports tree keyboard navigation', async () => {
    const view = render(TreeSelect, { options: testOptions });
    const trigger = view.container.querySelector('button');
    if (trigger) await fireEvent.click(trigger);

    const first = document.querySelector<HTMLElement>('[data-tree-value="dept-1"]');
    const second = document.querySelector<HTMLElement>('[data-tree-value="dept-2"]');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (first && second) {
      first.focus();
      await fireEvent.keyDown(first, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(second);
      await fireEvent.keyDown(second, { key: 'Home' });
      expect(document.activeElement).toBe(first);
    }
  });

  it('loads lazy children before expanding', async () => {
    const loadChildren = vi.fn(async () => [{ value: 'lazy-child', label: '懒加载节点' }]);
    const view = render(TreeSelect, {
      options: [{ value: 'lazy', label: '懒加载部门', hasChildren: true }],
      loadChildren,
    });
    const trigger = view.container.querySelector('button');
    if (trigger) await fireEvent.click(trigger);

    const expand = document.querySelector<HTMLButtonElement>('[data-tree-value="lazy"] button');
    expect(expand).not.toBeNull();
    if (expand) await fireEvent.click(expand);

    expect(loadChildren).toHaveBeenCalledOnce();
    expect(document.body.textContent).toContain('懒加载节点');
  });
});
