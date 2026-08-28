import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Cascader, { type CascaderOption } from './Cascader.svelte';

const testOptions: CascaderOption[] = [
  {
    value: 'zhejiang',
    label: '浙江省',
    children: [
      {
        value: 'hangzhou',
        label: '杭州市',
        children: [
          { value: 'xihu', label: '西湖区' },
          { value: 'binjiang', label: '滨江区' },
        ],
      },
    ],
  },
  {
    value: 'jiangsu',
    label: '江苏省',
    children: [
      {
        value: 'nanjing',
        label: '南京市',
        children: [
          { value: 'xuanwu', label: '玄武区' },
        ],
      },
    ],
  },
];

describe('Cascader component', () => {
  it('renders placeholder when no value is set', () => {
    const view = render(Cascader, {
      options: testOptions,
      placeholder: '请选择省市区',
    });

    expect(view.container.textContent).toContain('请选择省市区');
  });

  it('renders full path label when value is provided', () => {
    const view = render(Cascader, {
      options: testOptions,
      value: ['zhejiang', 'hangzhou', 'xihu'],
      separator: ' / ',
    });

    expect(view.container.textContent).toContain('浙江省 / 杭州市 / 西湖区');
  });

  it('opens panel on trigger click and shows top level options', async () => {
    const view = render(Cascader, {
      options: testOptions,
      placeholder: '选择',
    });

    const trigger = view.container.querySelector('button');
    if (trigger) await fireEvent.click(trigger);

    expect(document.body.textContent).toContain('浙江省');
    expect(document.body.textContent).toContain('江苏省');
  });
});
