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
});
