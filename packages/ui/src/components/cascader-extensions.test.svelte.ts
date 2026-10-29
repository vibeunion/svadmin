import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Cascader from './Cascader.svelte';

afterEach(() => cleanup());

const options = [
  {
    value: 'zhejiang', label: 'Zhejiang',
    children: [
      { value: 'hangzhou', label: 'Hangzhou' },
      { value: 'ningbo', label: 'Ningbo' },
    ],
  },
  { value: 'jiangsu', label: 'Jiangsu', children: [{ value: 'nanjing', label: 'Nanjing' }] },
];

describe('Cascader extensions', () => {
  it('checks multiple paths and reports full paths', async () => {
    const onchange = vi.fn();
    const view = render(Cascader, { options, checkable: true, showSearch: true, onchange });
    await fireEvent.click(view.getByRole('button'));
    const checkbox = await view.findByRole('checkbox', { name: 'Select Hangzhou' });
    await fireEvent.click(checkbox);
    await waitFor(() => expect(onchange).toHaveBeenCalled());
    expect(onchange.mock.calls[0]?.[0]).toEqual([['zhejiang', 'hangzhou']]);
    expect(checkbox.getAttribute('aria-checked')).toBe('true');
  });

  it('filters single-select leaves through the search field', async () => {
    const onchange = vi.fn();
    const view = render(Cascader, { options, showSearch: true, onchange });
    await fireEvent.click(view.getByRole('button'));
    const search = await view.findByRole('searchbox');
    await fireEvent.input(search, { target: { value: 'Nanjing' } });
    const leaf = await view.findByRole('button', { name: 'Jiangsu / Nanjing' });
    await fireEvent.click(leaf);
    expect(onchange).toHaveBeenCalledWith(['jiangsu', 'nanjing'], expect.any(Array));
  });
});
