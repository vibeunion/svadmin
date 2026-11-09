import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LightFilter from './LightFilter.svelte';

afterEach(() => cleanup());

describe('LightFilter', () => {
  const testItems = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
    {
      key: 'role',
      label: 'Role',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Member', value: 'member' },
      ],
    },
  ];

  it('renders capsule filter items with default labels', () => {
    const { container } = render(LightFilter, {
      items: testItems,
      values: {},
    });

    const root = container.querySelector('[data-svadmin-component="LightFilter"]');
    expect(root).not.toBeNull();
    expect(root?.textContent).toContain('Status');
    expect(root?.textContent).toContain('Role');
  });

  it('displays active value in pill when selected', () => {
    const { container } = render(LightFilter, {
      items: testItems,
      values: { status: 'active' },
    });

    const root = container.querySelector('[data-svadmin-component="LightFilter"]');
    expect(root?.textContent).toContain('Status: Active');
  });

  it('clears filter value when clear button is clicked', async () => {
    const onchange = vi.fn();
    const { container } = render(LightFilter, {
      items: testItems,
      values: { status: 'active' },
      onchange,
    });

    const clearBtn = container.querySelector('[aria-label="Clear filter"]');
    expect(clearBtn).not.toBeNull();

    if (clearBtn) {
      await fireEvent.click(clearBtn);
    }
    expect(onchange).toHaveBeenCalledWith({});
  });

  it('resets all filters when reset button is clicked', async () => {
    const onreset = vi.fn();
    const onchange = vi.fn();
    const { getByTitle } = render(LightFilter, {
      items: testItems,
      values: { status: 'active', role: 'admin' },
      onreset,
      onchange,
    });

    const resetBtn = getByTitle('Reset');
    await fireEvent.click(resetBtn);
    expect(onreset).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledWith({});
  });
});
