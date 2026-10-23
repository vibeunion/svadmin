import { describe, expect, it, vi } from 'vitest';
import { act, render, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
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
  it('does not expand residual children of an explicit leaf in a controlled path', async () => {
    const onchange = vi.fn();
    const view = render(Cascader, { options: [
      { value: 'leaf', label: 'Leaf', isLeaf: true, children: [{ value: 'stale', label: 'Stale child' }] },
    ], value: ['leaf', 'stale'], onchange });
    const trigger = view.container.querySelector('button')!;
    expect(trigger.textContent).toContain('Leaf');
    expect(trigger.textContent).not.toContain('Stale child');
    await fireEvent.click(trigger);
    expect(view.queryByRole('button', { name: 'Stale child', exact: true })).toBeNull();
    const leaf = view.getAllByRole('button', { name: 'Leaf', exact: true }).at(-1)!;
    leaf.focus();
    await fireEvent.keyDown(leaf, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(leaf);
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(leaf);
    expect(onchange).toHaveBeenCalledExactlyOnceWith(['leaf'], [
      expect.objectContaining({ value: 'leaf' }),
    ]);
  });

  it('removes stale descendant columns when an expanded branch becomes a leaf', async () => {
    const onchange = vi.fn();
    const branch: CascaderOption = { value: 'parent', label: 'Parent', children: [
      { value: 'child', label: 'Child', children: [{ value: 'grandchild', label: 'Grandchild' }] },
    ] };
    const view = render(Cascader, { options: [branch], placeholder: 'Choose path', onchange });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Parent', exact: true }));
    await fireEvent.click(view.getByRole('button', { name: 'Child', exact: true }));
    expect(view.getByRole('button', { name: 'Grandchild', exact: true })).toBeTruthy();
    await view.rerender({ options: [{ ...branch, isLeaf: true }] });
    expect(view.queryByRole('button', { name: 'Child', exact: true })).toBeNull();
    expect(view.queryByRole('button', { name: 'Grandchild', exact: true })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(view.getByRole('button', { name: 'Parent', exact: true }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith(['parent'], [
      expect.objectContaining({ value: 'parent', isLeaf: true }),
    ]);
  });

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

  it('prevents committing from an already-open panel when the component becomes disabled', async () => {
    const onchange = vi.fn();
    const view = render(Cascader, { options: testOptions, placeholder: 'Choose path', onchange });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: '浙江省', exact: true }));
    await fireEvent.click(view.getByRole('button', { name: '杭州市', exact: true }));
    await view.rerender({ disabled: true });
    const leaf = view.getByRole('button', { name: '西湖区', exact: true });
    expect(leaf.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(leaf);
    expect(onchange).not.toHaveBeenCalled();
    await view.rerender({ disabled: false });
    await fireEvent.click(leaf);
    expect(onchange).toHaveBeenCalledExactlyOnceWith(
      ['zhejiang', 'hangzhou', 'xihu'],
      expect.arrayContaining([expect.objectContaining({ value: 'xihu' })]),
    );
  });

  it.each([false, true])('inherits ancestor disablement for an existing path with changeOnSelect=%s', async changeOnSelect => {
    const onchange = vi.fn();
    const options: CascaderOption[] = [
      { value: 'blocked', label: 'Blocked', disabled: true, children: [
        { value: 'nested', label: 'Nested', children: [{ value: 'leaf', label: 'Leaf' }] },
      ] },
      { value: 'allowed', label: 'Allowed' },
    ];
    const view = render(Cascader, { options, value: ['blocked', 'nested'], changeOnSelect, onchange });
    await fireEvent.click(view.getByRole('button', { name: 'Blocked / Nested', exact: true }));
    for (const name of ['Blocked', 'Nested', 'Leaf']) {
      const button = await view.findByRole('button', { name, exact: true });
      expect(button.hasAttribute('disabled')).toBe(true);
      await fireEvent.click(button);
    }
    expect(onchange).not.toHaveBeenCalled();
    const allowed = view.getByRole('button', { name: 'Allowed', exact: true });
    expect(allowed.hasAttribute('disabled')).toBe(false);
    await fireEvent.click(allowed);
    expect(onchange).toHaveBeenCalledExactlyOnceWith(['allowed'], [options[1]]);
  });

  it('disables an already-expanded branch after its ancestor is replaced with a disabled node', async () => {
    const onchange = vi.fn();
    const view = render(Cascader, { options: testOptions, placeholder: 'Choose path', onchange });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: '浙江省', exact: true }));
    await fireEvent.click(view.getByRole('button', { name: '杭州市', exact: true }));
    await view.rerender({ options: testOptions.map(option => ({ ...option, disabled: option.value === 'zhejiang' })) });
    const leaf = view.getByRole('button', { name: '西湖区', exact: true });
    expect(leaf.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(leaf);
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each([false, true])('navigates columns without committing with changeOnSelect=%s', async changeOnSelect => {
    const onchange = vi.fn();
    const view = render(Cascader, { options: testOptions, placeholder: 'Choose path', onchange, changeOnSelect });
    const trigger = view.getByRole('button', { name: 'Choose path' });
    await fireEvent.click(trigger);
    const zhejiang = view.getByRole('button', { name: '浙江省', exact: true });
    zhejiang.focus();
    await fireEvent.keyDown(zhejiang, { key: 'ArrowRight' });
    await waitFor(() => expect(document.activeElement?.textContent).toContain('杭州市'));
    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowRight' });
    await waitFor(() => expect(document.activeElement?.textContent).toContain('西湖区'));
    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowLeft' });
    await waitFor(() => expect(document.activeElement?.textContent).toContain('杭州市'));
    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowLeft' });
    await waitFor(() => expect(document.activeElement?.textContent).toContain('浙江省'));
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(trigger);
    expect(view.queryByRole('button', { name: '浙江省', exact: true })).toBeNull();
  });

  it('skips disabled options and supports Home/End within a cascader column', async () => {
    const options: CascaderOption[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
      { value: 'c', label: 'C' },
    ];
    const view = render(Cascader, { options, placeholder: 'Choose path' });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    const first = view.getByRole('button', { name: 'A', exact: true });
    first.focus();
    await fireEvent.keyDown(first, { key: 'End' });
    expect(document.activeElement?.textContent).toContain('C');
    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowUp' });
    expect(document.activeElement?.textContent).toContain('A');
    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toContain('C');
    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(first);
    await fireEvent.keyDown(first, { key: 'ArrowUp' });
    expect(document.activeElement?.textContent).toContain('C');
    await fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(first);
  });

  it('returns to the actual parent and preserves explicit leaf activation', async () => {
    const onchange = vi.fn();
    const view = render(Cascader, { options: testOptions, placeholder: 'Choose path', onchange });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    const parent = view.getByRole('button', { name: '江苏省', exact: true });
    parent.focus();
    await fireEvent.keyDown(parent, { key: 'ArrowRight' });
    const child = await view.findByRole('button', { name: '南京市', exact: true });
    await waitFor(() => expect(document.activeElement).toBe(child));
    await fireEvent.keyDown(child, { key: 'ArrowLeft' });
    await waitFor(() => expect(document.activeElement).toBe(parent));
    await fireEvent.keyDown(parent, { key: 'ArrowRight' });
    await fireEvent.keyDown(await view.findByRole('button', { name: '南京市', exact: true }), { key: 'ArrowRight' });
    const leaf = await view.findByRole('button', { name: '玄武区', exact: true });
    await waitFor(() => expect(document.activeElement).toBe(leaf));
    await fireEvent.keyDown(leaf, { key: 'ArrowRight' });
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(leaf);
    expect(onchange).toHaveBeenCalledExactlyOnceWith(
      ['jiangsu', 'nanjing', 'xuanwu'],
      expect.arrayContaining([expect.objectContaining({ value: 'xuanwu' })]),
    );
  });

  it('does not navigate through disabled parents or disabled open controls', async () => {
    const onchange = vi.fn();
    const view = render(Cascader, { options: [
      { value: 'blocked', label: 'Blocked', disabled: true, children: [{ value: 'child', label: 'Hidden child' }] },
      { value: 'allowed', label: 'Allowed', children: [{ value: 'child', label: 'Allowed child' }] },
    ], placeholder: 'Choose path', onchange });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.keyDown(view.getByRole('button', { name: 'Blocked', exact: true }), { key: 'ArrowRight' });
    expect(view.queryByText('Hidden child')).toBeNull();
    const allowed = view.getByRole('button', { name: 'Allowed', exact: true });
    allowed.focus();
    await view.rerender({ disabled: true });
    await fireEvent.keyDown(allowed, { key: 'ArrowRight' });
    expect(view.queryByText('Allowed child')).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(['click', 'Enter', ' '] as const)('clears exactly once using %s without opening the panel', async action => {
    const onchange = vi.fn();
    const view = render(Cascader, { options: testOptions, value: ['zhejiang', 'hangzhou', 'xihu'],
      placeholder: 'Choose path', onchange });
    const clear = view.getByRole('button', { name: 'Clear selection' });
    expect(clear).toBeInstanceOf(HTMLButtonElement);
    expect(clear.parentElement?.closest('button')).toBeNull();
    if (action !== 'click') {
      await fireEvent.keyDown(clear, { key: action });
      expect(onchange).not.toHaveBeenCalled();
    }
    // 模拟原生激活产生的 click；真实 Enter/Space 默认行为由浏览器验证。
    await fireEvent.click(clear);
    expect(onchange).toHaveBeenCalledExactlyOnceWith(undefined, []);
    const trigger = view.getByRole('button', { name: 'Choose path' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(view.queryByRole('button', { name: '浙江省', exact: true })).toBeNull();
  });

  it('allows the owner to update a disabled field without emitting changes', async () => {
    const onchange = vi.fn();
    const view = render(Cascader, { options: testOptions, value: ['zhejiang'], disabled: true, onchange });
    await view.rerender({ value: ['jiangsu', 'nanjing', 'xuanwu'] });
    await waitFor(() => expect(view.container.textContent).toContain('江苏省 / 南京市 / 玄武区'));
    expect(view.queryByRole('button', { name: 'Clear selection' })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });
});

describe('Cascader async child loading', () => {
  function deferredLoad() {
    let resolve!: (children: CascaderOption[]) => void;
    const promise = new Promise<CascaderOption[]>((done) => { resolve = done; });
    return { promise, resolve };
  }

  it('does not commit a declared branch that has no loaded children or loader', async () => {
    const onchange = vi.fn();
    const view = render(Cascader, {
      options: [{ value: 'region', label: 'Region', hasChildren: true }],
      placeholder: 'Choose path',
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());
    expect(onchange).not.toHaveBeenCalled();
  });

  it('loads children before committing a leaf path', async () => {
    let resolveChildren!: (children: CascaderOption[]) => void;
    const loadChildren = vi.fn(() => new Promise<CascaderOption[]>(resolve => {
      resolveChildren = resolve;
    }));
    const onchange = vi.fn();
    const view = render(Cascader, {
      options: [{ value: 'region', label: 'Region', hasChildren: true }],
      placeholder: 'Choose path',
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    expect(loadChildren).toHaveBeenCalledOnce();
    expect(view.getByRole('status').textContent).toContain('Loading');
    expect(onchange).not.toHaveBeenCalled();

    resolveChildren([{ value: 'east', label: 'East', children: [{ value: 'leaf', label: 'Leaf' }] }]);
    const east = await view.findByRole('button', { name: 'East', exact: true });
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(east);
    await fireEvent.click(await view.findByRole('button', { name: 'Leaf', exact: true }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith(
      ['region', 'east', 'leaf'],
      expect.arrayContaining([expect.objectContaining({ value: 'leaf' })]),
    );
  });

  it('surfaces a load failure and retries without a partial commit', async () => {
    let attempts = 0;
    const loadChildren = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('offline');
      return [{ value: 'child', label: 'Child' }];
    });
    const onchange = vi.fn();
    const view = render(Cascader, {
      options: [{ value: 'region', label: 'Region', hasChildren: true }],
      placeholder: 'Choose path',
      changeOnSelect: true,
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    const retry = await view.findByRole('button', { name: 'Retry', exact: true });
    expect(view.getByRole('alert').textContent).toContain('Failed to load child nodes');
    expect(onchange).not.toHaveBeenCalled();

    await fireEvent.click(retry);
    await waitFor(() => expect(loadChildren).toHaveBeenCalledTimes(2));
    expect(await view.findByRole('button', { name: 'Child', exact: true })).toBeTruthy();
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(view.getByRole('button', { name: 'Child', exact: true }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith(
      ['region', 'child'],
      expect.arrayContaining([expect.objectContaining({ value: 'child' })]),
    );
  });

  it('keeps a failed path uncommitted and blocks disabled children after retry', async () => {
    let attempts = 0;
    const loadChildren = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('offline');
      return [
        { value: 'blocked', label: 'Blocked child', disabled: true },
        { value: 'allowed', label: 'Allowed child' },
      ];
    });
    const onchange = vi.fn();
    const view = render(Cascader, {
      options: [{ value: 'region', label: 'Region', hasChildren: true }],
      placeholder: 'Choose path',
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    await view.findByRole('button', { name: 'Retry', exact: true });
    expect(onchange).not.toHaveBeenCalled();

    await fireEvent.click(view.getByRole('button', { name: 'Retry', exact: true }));
    const blocked = await view.findByRole('button', { name: 'Blocked child', exact: true });
    const allowed = view.getByRole('button', { name: 'Allowed child', exact: true });
    expect(blocked.hasAttribute('disabled')).toBe(true);
    expect(onchange).not.toHaveBeenCalled();

    await fireEvent.click(blocked);
    expect(onchange).not.toHaveBeenCalled();
    await fireEvent.click(allowed);
    expect(onchange).toHaveBeenCalledExactlyOnceWith(
      ['region', 'allowed'],
      expect.arrayContaining([expect.objectContaining({ value: 'allowed' })]),
    );
  });

  it('does not write children or commit after the field becomes disabled during a load', async () => {
    let resolveFirst!: (children: CascaderOption[]) => void;
    const loadChildren = vi.fn()
      .mockImplementationOnce(() => new Promise<CascaderOption[]>(resolve => {
        resolveFirst = resolve;
      }))
      .mockResolvedValueOnce([{ value: 'child', label: 'Child' }]);
    const onchange = vi.fn();
    const view = render(Cascader, {
      options: [{ value: 'region', label: 'Region', hasChildren: true }],
      placeholder: 'Choose path',
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    await view.rerender({ disabled: true });
    resolveFirst([{ value: 'stale', label: 'Stale child' }]);
    await waitFor(() => expect(loadChildren).toHaveBeenCalledOnce());
    expect(view.queryByRole('button', { name: 'Stale child', exact: true })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();

    await view.rerender({ disabled: false });
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    await waitFor(() => expect(loadChildren).toHaveBeenCalledTimes(2));
    await fireEvent.click(await view.findByRole('button', { name: 'Child', exact: true }));
    expect(onchange).toHaveBeenCalledExactlyOnceWith(
      ['region', 'child'],
      expect.arrayContaining([expect.objectContaining({ value: 'child' })]),
    );
  });

  it('loads a lazy branch with ArrowRight and focuses its first available child', async () => {
    let resolveChildren!: (children: CascaderOption[]) => void;
    const loadChildren = vi.fn(() => new Promise<CascaderOption[]>(resolve => {
      resolveChildren = resolve;
    }));
    const view = render(Cascader, {
      options: [{ value: 'region', label: 'Region', hasChildren: true }],
      placeholder: 'Choose path',
      loadChildren,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    const region = view.getByRole('button', { name: 'Region', exact: true });
    region.focus();
    await fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(loadChildren).toHaveBeenCalledOnce();
    expect(view.getByRole('status').textContent).toContain('Loading');
    resolveChildren([
      { value: 'blocked', label: 'Blocked child', disabled: true },
      { value: 'child', label: 'Child' },
    ]);
    await waitFor(() => expect(document.activeElement?.textContent).toContain('Child'));
  });

  it('isolates pending requests and children for equal values under different parents', async () => {
    const pending = new Map<string, (children: CascaderOption[]) => void>();
    const loadChildren = vi.fn((node: CascaderOption) => new Promise<CascaderOption[]>(resolve => {
      pending.set(node.label, resolve);
    }));
    const onchange = vi.fn();
    const view = render(Cascader, {
      options: [
        { value: 'p1', label: 'Parent 1', children: [{ value: 'shared', label: 'Shared 1', hasChildren: true }] },
        { value: 'p2', label: 'Parent 2', children: [{ value: 'shared', label: 'Shared 2', hasChildren: true }] },
      ],
      placeholder: 'Choose path',
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Parent 1', exact: true }));
    await fireEvent.click(view.getByRole('button', { name: 'Shared 1', exact: true }));
    expect(loadChildren).toHaveBeenCalledOnce();

    await fireEvent.click(view.getByRole('button', { name: 'Parent 2', exact: true }));
    await fireEvent.click(view.getByRole('button', { name: 'Shared 2', exact: true }));
    await waitFor(() => expect(loadChildren).toHaveBeenCalledTimes(2));
    expect(pending.size).toBe(2);

    pending.get('Shared 1')!([{ value: 'leaf1', label: 'Leaf 1' }]);
    pending.get('Shared 2')!([{ value: 'leaf2', label: 'Leaf 2' }]);
    const leaf2 = await view.findByRole('button', { name: 'Leaf 2', exact: true });
    expect(view.queryByRole('button', { name: 'Leaf 1', exact: true })).toBeNull();
    await fireEvent.click(leaf2);
    expect(onchange).toHaveBeenLastCalledWith(
      ['p2', 'shared', 'leaf2'],
      expect.arrayContaining([expect.objectContaining({ value: 'leaf2' })]),
    );

    await fireEvent.click(view.getByRole('button', { name: /Parent 2/ }));
    await fireEvent.click(view.getByRole('button', { name: 'Parent 1', exact: true }));
    await fireEvent.click(view.getByRole('button', { name: 'Shared 1', exact: true }));
    const leaf1 = await view.findByRole('button', { name: 'Leaf 1', exact: true });
    expect(view.queryByRole('button', { name: 'Leaf 2', exact: true })).toBeNull();
    await fireEvent.click(leaf1);
    expect(onchange).toHaveBeenLastCalledWith(
      ['p1', 'shared', 'leaf1'],
      expect.arrayContaining([expect.objectContaining({ value: 'leaf1' })]),
    );
  });

  it('keeps load errors scoped to the failed full path', async () => {
    const loadChildren = vi.fn(async (node: CascaderOption) => {
      if (node.label === 'Shared 1') throw new Error('offline');
      return [{ value: 'leaf2', label: 'Leaf 2' }];
    });
    const onchange = vi.fn();
    const view = render(Cascader, {
      options: [
        { value: 'p1', label: 'Parent 1', children: [{ value: 'shared', label: 'Shared 1', hasChildren: true }] },
        { value: 'p2', label: 'Parent 2', children: [{ value: 'shared', label: 'Shared 2', hasChildren: true }] },
      ],
      placeholder: 'Choose path',
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Parent 1', exact: true }));
    await fireEvent.click(view.getByRole('button', { name: 'Shared 1', exact: true }));
    await waitFor(() => expect(view.getByRole('alert')).toBeTruthy());

    await fireEvent.click(view.getByRole('button', { name: 'Parent 2', exact: true }));
    await fireEvent.click(view.getByRole('button', { name: 'Shared 2', exact: true }));
    expect(await view.findByRole('button', { name: 'Leaf 2', exact: true })).toBeTruthy();
    expect(view.queryByRole('alert')).toBeNull();

    // 回到失败的路径时不触发新请求，原错误仍应保留，不能被另一路径的成功清除。
    await view.rerender({ value: ['p1', 'shared'] });
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('Failed to load child nodes'));
    expect(onchange).not.toHaveBeenCalled();
  });

  it('commits once when the same loading branch is activated repeatedly', async () => {
    let resolveChildren!: (children: CascaderOption[]) => void;
    const loadChildren = vi.fn(() => new Promise<CascaderOption[]>(resolve => {
      resolveChildren = resolve;
    }));
    const onchange = vi.fn();
    const view = render(Cascader, {
      options: [{ value: 'region', label: 'Region', hasChildren: true }],
      placeholder: 'Choose path',
      changeOnSelect: true,
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    const region = view.getByRole('button', { name: 'Region', exact: true });
    await fireEvent.click(region);
    // 请求期间重复点击与右方向键激活都复用同一请求，不能重复提交。
    await fireEvent.click(region);
    await fireEvent.click(region);
    await fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(loadChildren).toHaveBeenCalledOnce();
    expect(onchange).not.toHaveBeenCalled();

    resolveChildren([{ value: 'child', label: 'Child' }]);
    await waitFor(() => expect(onchange).toHaveBeenCalled());
    expect(onchange).toHaveBeenCalledExactlyOnceWith(
      ['region'],
      expect.arrayContaining([expect.objectContaining({ value: 'region' })]),
    );
  });

  it('restores focus to the first available child after retrying a failed load', async () => {
    let attempts = 0;
    const loadChildren = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('offline');
      return [
        { value: 'blocked', label: 'Blocked child', disabled: true },
        { value: 'child', label: 'Child' },
      ];
    });
    const view = render(Cascader, {
      options: [{ value: 'region', label: 'Region', hasChildren: true }],
      placeholder: 'Choose path',
      loadChildren,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    const retry = await view.findByRole('button', { name: 'Retry', exact: true });
    await fireEvent.click(retry);
    const child = await view.findByRole('button', { name: 'Child', exact: true });
    await waitFor(() => expect(document.activeElement).toBe(child));
  });

  it('keeps retry focus intent when the loading state replaces the focused Retry button', async () => {
    let resolveRetry!: (children: CascaderOption[]) => void;
    const loadChildren = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(() => new Promise<CascaderOption[]>(resolve => { resolveRetry = resolve; }));
    const view = render(Cascader, {
      options: [{ value: 'region', label: 'Region', hasChildren: true }],
      placeholder: 'Choose path',
      loadChildren,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    const retry = await view.findByRole('button', { name: 'Retry', exact: true });
    retry.focus();
    expect(document.activeElement).toBe(retry);

    // 真实键盘 Enter 会让当前聚焦的 Retry 在加载态被替换；这一布局内焦点
    // 迁移不代表用户切换分支，必须仍归属于本次重试。
    await fireEvent.click(retry);
    await waitFor(() => expect(loadChildren).toHaveBeenCalledTimes(2));
    expect(view.getByRole('status').textContent).toContain('Loading');
    expect(document.activeElement).not.toBe(retry);

    resolveRetry([
      { value: 'blocked', label: 'Blocked child', disabled: true },
      { value: 'child', label: 'Child' },
    ]);
    const child = await view.findByRole('button', { name: 'Child', exact: true });
    await waitFor(() => expect(document.activeElement).toBe(child));
  });

  it('ignores a pending response after the host replaces options', async () => {
    let resolveFirst!: (children: CascaderOption[]) => void;
    const loadChildren = vi.fn()
      .mockImplementationOnce(() => new Promise<CascaderOption[]>(resolve => {
        resolveFirst = resolve;
      }))
      .mockResolvedValueOnce([{ value: 'fresh', label: 'Fresh child' }]);
    const onchange = vi.fn();
    const view = render(Cascader, {
      options: [{ value: 'region', label: 'Region', hasChildren: true }],
      placeholder: 'Choose path',
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    await view.rerender({ options: [{ value: 'region', label: 'Region', hasChildren: true }] });
    resolveFirst([{ value: 'stale', label: 'Stale child' }]);
    await waitFor(() => expect(loadChildren).toHaveBeenCalledOnce());
    expect(view.queryByRole('button', { name: 'Stale child', exact: true })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();

    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    expect(await view.findByRole('button', { name: 'Fresh child', exact: true })).toBeTruthy();
    expect(loadChildren).toHaveBeenCalledTimes(2);
  });

  it('ignores a pending response after the host replaces the loader', async () => {
    let resolveFirst!: (children: CascaderOption[]) => void;
    const firstLoader = vi.fn(() => new Promise<CascaderOption[]>(resolve => {
      resolveFirst = resolve;
    }));
    const secondLoader = vi.fn(async () => [{ value: 'fresh', label: 'Fresh child' }]);
    const onchange = vi.fn();
    const view = render(Cascader, {
      options: [{ value: 'region', label: 'Region', hasChildren: true }],
      placeholder: 'Choose path',
      loadChildren: firstLoader,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    await view.rerender({ loadChildren: secondLoader });
    resolveFirst([{ value: 'stale', label: 'Stale child' }]);
    await waitFor(() => expect(firstLoader).toHaveBeenCalledOnce());
    expect(view.queryByRole('button', { name: 'Stale child', exact: true })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();

    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    expect(await view.findByRole('button', { name: 'Fresh child', exact: true })).toBeTruthy();
    expect(secondLoader).toHaveBeenCalledOnce();
    expect(onchange).not.toHaveBeenCalled();
  });

  it('does not let an earlier internal write hide a later host tree replacement', async () => {
    const pending: Array<(children: CascaderOption[]) => void> = [];
    const loadChildren = vi.fn((node: CascaderOption) => new Promise<CascaderOption[]>(resolve => {
      pending.push(resolve);
    }));
    const makeTree = (): CascaderOption[] => [
      { value: 'alpha', label: 'Alpha', hasChildren: true },
      { value: 'beta', label: 'Beta', hasChildren: true },
    ];
    const onchange = vi.fn();
    const view = render(Cascader, {
      options: makeTree(),
      placeholder: 'Choose path',
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));

    // A 先成功，组件因此产生一次内部子级写回。
    await fireEvent.click(view.getByRole('button', { name: 'Alpha', exact: true }));
    expect(loadChildren).toHaveBeenCalledTimes(1);
    pending[0]([{ value: 'alpha-child', label: 'Alpha child' }]);
    expect(await view.findByRole('button', { name: 'Alpha child', exact: true })).toBeTruthy();

    // B 仍在途时宿主替换整棵树，即使值完全相同也必须让 B 的旧请求失效。
    await fireEvent.click(view.getByRole('button', { name: 'Beta', exact: true }));
    expect(loadChildren).toHaveBeenCalledTimes(2);
    await view.rerender({ options: makeTree() });

    await fireEvent.click(view.getByRole('button', { name: 'Beta', exact: true }));
    await waitFor(() => expect(loadChildren).toHaveBeenCalledTimes(3));

    pending[1]([{ value: 'stale-b', label: 'Stale B' }]);
    pending[2]([{ value: 'fresh-b', label: 'Fresh B' }]);
    expect(await view.findByRole('button', { name: 'Fresh B', exact: true })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Stale B', exact: true })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it('keeps an old request invalid after a host replacement disables then re-enables the path', async () => {
    const pending: Array<(children: CascaderOption[]) => void> = [];
    const loadChildren = vi.fn((node: CascaderOption) => new Promise<CascaderOption[]>(resolve => {
      pending.push(resolve);
    }));
    const makeTree = (): CascaderOption[] => [
      { value: 'alpha', label: 'Alpha', hasChildren: true },
      { value: 'beta', label: 'Beta', hasChildren: true },
    ];
    const onchange = vi.fn();
    const view = render(Cascader, {
      options: makeTree(),
      placeholder: 'Choose path',
      changeOnSelect: true,
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Alpha', exact: true }));
    pending[0]([{ value: 'alpha-child', label: 'Alpha child' }]);
    expect(await view.findByRole('button', { name: 'Alpha child', exact: true })).toBeTruthy();
    expect(onchange).toHaveBeenCalledExactlyOnceWith(
      ['alpha'],
      expect.arrayContaining([expect.objectContaining({ value: 'alpha' })]),
    );
    onchange.mockClear();

    await fireEvent.click(view.getByRole('button', { name: 'Beta', exact: true }));
    const replaced = makeTree();
    replaced[1].disabled = true;
    await view.rerender({ options: replaced });
    // 残留的内部写回标记不能让这次宿主替换被误判为内部写回。
    replaced[1].disabled = false;
    await view.rerender({ options: replaced });

    pending[1]([{ value: 'stale-b', label: 'Stale B' }]);
    await waitFor(() => expect(view.queryByRole('status')).toBeNull());
    expect(view.queryByRole('button', { name: 'Stale B', exact: true })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it('does not overwrite children the host supplies while a request is pending', async () => {
    let resolveLoad!: (children: CascaderOption[]) => void;
    const loadPromise = new Promise<CascaderOption[]>(resolve => { resolveLoad = resolve; });
    const loadChildren = vi.fn(() => loadPromise);
    const node: CascaderOption = { value: 'region', label: 'Region', hasChildren: true };
    const options: CascaderOption[] = [node];
    const view = render(Cascader, {
      options,
      placeholder: 'Choose path',
      loadChildren,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    expect(loadChildren).toHaveBeenCalledOnce();

    // 宿主在原对象上补齐 children，旧响应不得覆盖。
    node.children = [{ value: 'host-child', label: 'Host child' }];
    resolveLoad([{ value: 'stale-child', label: 'Stale child' }]);
    await loadPromise;
    await waitFor(() => expect(view.queryByRole('status')).toBeNull());
    expect(view.queryByRole('button', { name: 'Stale child', exact: true })).toBeNull();
  });

  it('does not write a response into a path node the host replaced in place', async () => {
    let resolveLoad!: (children: CascaderOption[]) => void;
    const loadPromise = new Promise<CascaderOption[]>(resolve => { resolveLoad = resolve; });
    const loadChildren = vi.fn(() => loadPromise);
    const options: CascaderOption[] = [{ value: 'region', label: 'Region', hasChildren: true }];
    const view = render(Cascader, {
      options,
      placeholder: 'Choose path',
      loadChildren,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    expect(loadChildren).toHaveBeenCalledOnce();

    options[0] = { value: 'region', label: 'Region', hasChildren: true };
    resolveLoad([{ value: 'stale-child', label: 'Stale child' }]);
    await loadPromise;
    await waitFor(() => expect(view.queryByRole('status')).toBeNull());
    expect(view.queryByRole('button', { name: 'Stale child', exact: true })).toBeNull();

    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    await waitFor(() => expect(loadChildren).toHaveBeenCalledTimes(2));
  });

  it('does not commit when a pending path node becomes a leaf in place', async () => {
    let resolveLoad!: (children: CascaderOption[]) => void;
    const loadPromise = new Promise<CascaderOption[]>(resolve => { resolveLoad = resolve; });
    const loadChildren = vi.fn(() => loadPromise);
    const onchange = vi.fn();
    const node: CascaderOption = { value: 'region', label: 'Region', hasChildren: true };
    const options: CascaderOption[] = [node];
    const view = render(Cascader, {
      options,
      placeholder: 'Choose path',
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Region', exact: true }));
    expect(loadChildren).toHaveBeenCalledOnce();

    node.isLeaf = true;
    resolveLoad([{ value: 'stale-child', label: 'Stale child' }]);
    await loadPromise;
    await waitFor(() => expect(view.queryByRole('status')).toBeNull());
    expect(onchange).not.toHaveBeenCalled();
    expect(view.queryByRole('button', { name: 'Stale child', exact: true })).toBeNull();
  });

  it('does not restore focus from a retry after the user switches branches', async () => {
    let resolveRetry!: (children: CascaderOption[]) => void;
    const loadChildren = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(() => new Promise<CascaderOption[]>(resolve => { resolveRetry = resolve; }));
    const view = render(Cascader, {
      options: [
        { value: 'alpha', label: 'Alpha', hasChildren: true },
        { value: 'beta', label: 'Beta', children: [{ value: 'beta-child', label: 'Beta child' }] },
      ],
      placeholder: 'Choose path',
      loadChildren,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Alpha', exact: true }));
    const retry = await view.findByRole('button', { name: 'Retry', exact: true });
    await fireEvent.click(retry);
    await waitFor(() => expect(loadChildren).toHaveBeenCalledTimes(2));

    const beta = view.getByRole('button', { name: 'Beta', exact: true });
    beta.focus();
    await fireEvent.click(beta);
    expect(document.activeElement).toBe(beta);

    resolveRetry([{ value: 'alpha-child', label: 'Alpha child' }]);
    await waitFor(() => expect(view.queryByRole('status')).toBeNull());
    await tick();
    expect(document.activeElement).toBe(beta);
  });

  it('does not restore ArrowRight focus after the user focuses a sibling option', async () => {
    let resolveLoad!: (children: CascaderOption[]) => void;
    const loadPromise = new Promise<CascaderOption[]>(resolve => { resolveLoad = resolve; });
    const loadChildren = vi.fn(() => loadPromise);
    const view = render(Cascader, {
      options: [
        { value: 'alpha', label: 'Alpha', hasChildren: true },
        { value: 'beta', label: 'Beta' },
      ],
      placeholder: 'Choose path',
      loadChildren,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    const alpha = view.getByRole('button', { name: 'Alpha', exact: true });
    alpha.focus();
    await fireEvent.keyDown(alpha, { key: 'ArrowRight' });
    expect(loadChildren).toHaveBeenCalledOnce();

    const beta = view.getByRole('button', { name: 'Beta', exact: true });
    beta.focus();
    expect(document.activeElement).toBe(beta);

    resolveLoad([{ value: 'alpha-child', label: 'Alpha child' }]);
    await loadPromise;
    await waitFor(() => expect(view.queryByRole('status')).toBeNull());
    await tick();
    expect(document.activeElement).toBe(beta);
  });

  it('does not restore ArrowRight focus after the panel is closed and reopened', async () => {
    let resolveLoad!: (children: CascaderOption[]) => void;
    const loadPromise = new Promise<CascaderOption[]>(resolve => { resolveLoad = resolve; });
    const loadChildren = vi.fn(() => loadPromise);
    const view = render(Cascader, {
      options: [{ value: 'alpha', label: 'Alpha', hasChildren: true }],
      placeholder: 'Choose path',
      loadChildren,
    });
    const trigger = view.getByRole('button', { name: 'Choose path' });
    await fireEvent.click(trigger);
    const alpha = view.getByRole('button', { name: 'Alpha', exact: true });
    alpha.focus();
    await fireEvent.keyDown(alpha, { key: 'ArrowRight' });
    expect(loadChildren).toHaveBeenCalledOnce();

    await fireEvent.click(trigger);
    await waitFor(() => expect(view.queryByRole('button', { name: 'Alpha', exact: true })).toBeNull());
    await fireEvent.click(trigger);
    const reopenedAlpha = await view.findByRole('button', { name: 'Alpha', exact: true });
    await waitFor(() => expect(document.activeElement).toBe(reopenedAlpha));

    resolveLoad([{ value: 'alpha-child', label: 'Alpha child' }]);
    await loadPromise;
    await waitFor(() => expect(view.queryByRole('status')).toBeNull());
    await tick();
    expect(document.activeElement).toBe(reopenedAlpha);
  });

  it('reads an in-place ancestor disable after lazy descendants are already shown', async () => {
    const pending = deferredLoad();
    const loadChildren = vi.fn(() => pending.promise);
    const onchange = vi.fn();
    const options = $state<CascaderOption[]>([
      { value: 'alpha', label: 'Alpha', hasChildren: true },
    ]);
    const view = render(Cascader, {
      options,
      placeholder: 'Choose path',
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Alpha', exact: true }));
    expect(loadChildren).toHaveBeenCalledOnce();
    await act(async () => {
      pending.resolve([
        { value: 'alpha-child', label: 'Alpha child', children: [
          { value: 'alpha-leaf', label: 'Alpha leaf' },
        ] },
      ]);
      await pending.promise;
    });
    await fireEvent.click(await view.findByRole('button', { name: 'Alpha child', exact: true }));
    expect(await view.findByRole('button', { name: 'Alpha leaf', exact: true })).toBeTruthy();

    // 真正的 $state 原地修改：已缓存的祖先不能继续提供旧的 disabled 快照。
    await act(() => { options[0]!.disabled = true; });

    const child = view.getByRole('button', { name: 'Alpha child', exact: true });
    const leaf = view.getByRole('button', { name: 'Alpha leaf', exact: true });
    expect(view.getByRole('button', { name: 'Alpha', exact: true }).hasAttribute('disabled')).toBe(true);
    expect(child.hasAttribute('disabled')).toBe(true);
    expect(leaf.hasAttribute('disabled')).toBe(true);
    await fireEvent.click(child);
    await fireEvent.click(leaf);
    await fireEvent.keyDown(leaf, { key: 'ArrowRight' });
    expect(onchange).not.toHaveBeenCalled();
  });

  it('removes cached descendant columns when the host turns the loaded branch into a leaf in place', async () => {
    const pending = deferredLoad();
    const loadChildren = vi.fn(() => pending.promise);
    const onchange = vi.fn();
    const options = $state<CascaderOption[]>([
      { value: 'alpha', label: 'Alpha', hasChildren: true },
    ]);
    const view = render(Cascader, {
      options,
      placeholder: 'Choose path',
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Alpha', exact: true }));
    await act(async () => {
      pending.resolve([
        { value: 'alpha-child', label: 'Alpha child', children: [
          { value: 'alpha-leaf', label: 'Alpha leaf' },
        ] },
      ]);
      await pending.promise;
    });
    await fireEvent.click(await view.findByRole('button', { name: 'Alpha child', exact: true }));
    expect(await view.findByRole('button', { name: 'Alpha leaf', exact: true })).toBeTruthy();

    await act(() => { options[0]!.isLeaf = true; });

    expect(view.queryByRole('button', { name: 'Alpha child', exact: true })).toBeNull();
    expect(view.queryByRole('button', { name: 'Alpha leaf', exact: true })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it('uses host children added or replaced in place instead of the loaded cache', async () => {
    const pending = deferredLoad();
    const loadChildren = vi.fn(() => pending.promise);
    const onchange = vi.fn();
    const options = $state<CascaderOption[]>([
      { value: 'alpha', label: 'Alpha', hasChildren: true },
    ]);
    const view = render(Cascader, {
      options,
      placeholder: 'Choose path',
      loadChildren,
      onchange,
    });
    await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
    await fireEvent.click(view.getByRole('button', { name: 'Alpha', exact: true }));
    await act(async () => {
      pending.resolve([{ value: 'loaded-child', label: 'Loaded child' }]);
      await pending.promise;
    });
    expect(await view.findByRole('button', { name: 'Loaded child', exact: true })).toBeTruthy();

    await act(() => {
      options[0]!.children = [{ value: 'host-child', label: 'Host child' }];
    });
    expect(await view.findByRole('button', { name: 'Host child', exact: true })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Loaded child', exact: true })).toBeNull();

    await act(() => {
      options[0]!.children = [{ value: 'host-replaced', label: 'Host replaced' }];
    });
    expect(await view.findByRole('button', { name: 'Host replaced', exact: true })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Host child', exact: true })).toBeNull();
    expect(view.queryByRole('button', { name: 'Loaded child', exact: true })).toBeNull();
    expect(onchange).not.toHaveBeenCalled();
  });

  it.each(['self', 'ancestor'] as const)(
    'does not revive an in-flight sibling load after an in-place %s disable then enable',
    async target => {
      const pending: Array<{ node: CascaderOption; promise: Promise<CascaderOption[]>; resolve: (children: CascaderOption[]) => void }> = [];
      const loadChildren = vi.fn((node: CascaderOption) => {
        const request = deferredLoad();
        pending.push({ node, ...request });
        return request.promise;
      });
      const onchange = vi.fn();
      const options = $state<CascaderOption[]>([
        { value: 'root', label: 'Root', children: [
          { value: 'alpha', label: 'Alpha', hasChildren: true },
          { value: 'beta', label: 'Beta', hasChildren: true },
        ] },
      ]);
      const view = render(Cascader, {
        options,
        placeholder: 'Choose path',
        loadChildren,
        onchange,
      });
      await fireEvent.click(view.getByRole('button', { name: 'Choose path' }));
      await fireEvent.click(view.getByRole('button', { name: 'Root', exact: true }));
      await fireEvent.click(view.getByRole('button', { name: 'Alpha', exact: true }));
      const alphaRequest = pending.find(request => request.node.value === 'alpha')!;
      await act(async () => {
        alphaRequest.resolve([{ value: 'alpha-child', label: 'Alpha child' }]);
        await alphaRequest.promise;
      });
      expect(await view.findByRole('button', { name: 'Alpha child', exact: true })).toBeTruthy();

      await fireEvent.click(view.getByRole('button', { name: 'Beta', exact: true }));
      const betaRequest = pending.find(request => request.node.value === 'beta')!;
      const disabledTarget = target === 'self' ? options[0]!.children![1]! : options[0]!;
      await act(async () => {
        disabledTarget.disabled = true;
        await tick();
      });
      await act(() => { disabledTarget.disabled = false; });
      await act(async () => {
        betaRequest.resolve([{ value: 'stale-beta', label: 'Stale beta' }]);
        await betaRequest.promise;
      });
      await waitFor(() => expect(view.queryByRole('status')).toBeNull());
      expect(view.queryByRole('button', { name: 'Stale beta', exact: true })).toBeNull();
      expect(onchange).not.toHaveBeenCalled();

      // 旧请求已失效，重新激活才允许开始新的请求。
      await fireEvent.click(view.getByRole('button', { name: 'Beta', exact: true }));
      await waitFor(() => expect(loadChildren).toHaveBeenCalledTimes(3));
      const freshRequest = pending.at(-1)!;
      await act(async () => {
        freshRequest.resolve([{ value: 'fresh-beta', label: 'Fresh beta' }]);
        await freshRequest.promise;
      });
      expect(await view.findByRole('button', { name: 'Fresh beta', exact: true })).toBeTruthy();
      expect(view.queryByRole('button', { name: 'Stale beta', exact: true })).toBeNull();
      expect(onchange).not.toHaveBeenCalled();
    },
  );
});
