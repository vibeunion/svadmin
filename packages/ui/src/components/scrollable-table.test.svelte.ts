import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import ScrollableTableHarness from './scrollable-table.test-host.svelte';

const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');

function makeOverflowing(): void {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 1200 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 300 });
}

afterEach(() => {
  if (originalScrollWidth) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', originalScrollWidth);
  if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
});

describe('ScrollableTable', () => {
  it('renders a mirrored horizontal scrollbar when the table overflows', async () => {
    makeOverflowing();
    render(ScrollableTableHarness);
    await tick();
    expect(screen.getByRole('scrollbar', { name: '列表横向滚动' })).not.toBeNull();
    expect(screen.getByText('FA-001')).not.toBeNull();
  });

  it('supports a top scrollbar and keyboard scrolling', async () => {
    makeOverflowing();
    render(ScrollableTableHarness, { props: { scrollbarPlacement: 'top' } });
    await tick();
    const scrollbar = screen.getByRole('scrollbar', { name: '列表上方横向滚动' });
    await fireEvent.keyDown(scrollbar, { key: 'End' });
    expect(scrollbar.getAttribute('aria-valuenow')).toBe('900');
  });

  it('keeps a contained viewport for long tables', async () => {
    makeOverflowing();
    render(ScrollableTableHarness, { props: { scrollMode: 'contained' } });
    await tick();
    expect(document.querySelector('[data-svadmin-scrollable-table]')?.classList)
      .toContain('svadmin-scrollable-table--contained');
  });
});
