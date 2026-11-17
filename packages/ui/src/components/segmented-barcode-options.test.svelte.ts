import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SegmentedControl from './SegmentedControl.svelte';
import Barcode from './Barcode.svelte';

describe('SegmentedControl and Barcode option parity', () => {
  it('SegmentedControl supports string array options, defaultValue, and block layout', async () => {
    const onchange = vi.fn();
    const { container, getAllByRole } = render(SegmentedControl, {
      props: {
        options: ['Daily', 'Weekly', 'Monthly'],
        defaultValue: 'Weekly',
        block: true,
        ariaLabel: 'Period',
        onchange,
      },
    });

    const root = container.querySelector('.svadmin-segmented-control');
    expect(root?.getAttribute('data-block')).toBe('true');

    const items = getAllByRole('radio');
    expect(items.length).toBe(3);
    expect(items[1]?.getAttribute('aria-checked')).toBe('true');

    await fireEvent.click(items[2]!);
    expect(onchange).toHaveBeenCalledWith('Monthly');
    expect(items[2]?.getAttribute('aria-checked')).toBe('true');
  });

  it('Barcode supports bordered toggle and custom color', () => {
    const { container } = render(Barcode, {
      props: {
        value: 'CODE-999',
        bordered: false,
        color: 'var(--primary)',
      },
    });

    const root = container.querySelector('[data-svadmin-component="Barcode"]');
    expect(root?.getAttribute('data-bordered')).toBe('false');
    const rect = container.querySelector('svg rect:not([fill="transparent"])');
    expect(rect?.getAttribute('fill')).toBe('var(--primary)');
  });
});
