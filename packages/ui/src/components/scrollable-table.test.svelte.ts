import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import ScrollableTableHarness from './scrollable-table.test-host.svelte';

const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');

function makeOverflowing(): void {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 1200 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 300 });
}

afterEach(() => {
  vi.restoreAllMocks();
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

  it('rebinds size observation when asynchronous content replaces the table', async () => {
    makeOverflowing();
    const observe = vi.spyOn(ResizeObserver.prototype, 'observe');
    const unobserve = vi.spyOn(ResizeObserver.prototype, 'unobserve');
    const { container } = render(ScrollableTableHarness);
    await tick();
    const original = container.querySelector('table');
    if (!original) throw new Error('Missing table');
    const replacement = document.createElement('table');
    original.replaceWith(replacement);
    await waitFor(() => {
      expect(unobserve).toHaveBeenCalledWith(original);
      expect(observe).toHaveBeenCalledWith(replacement);
    });
  });

  it('synchronizes scrolling in both directions', async () => {
    makeOverflowing();
    const { container } = render(ScrollableTableHarness);
    await tick();
    const viewport = container.querySelector<HTMLElement>('[data-svadmin-scrollable-table]');
    if (!viewport) throw new Error('Missing viewport');
    const scrollbar = screen.getByRole('scrollbar');
    viewport.scrollLeft = 200;
    await fireEvent.scroll(viewport);
    expect(scrollbar.scrollLeft).toBe(200);
    scrollbar.scrollLeft = 400;
    await fireEvent.scroll(scrollbar);
    expect(viewport.scrollLeft).toBe(400);
  });

  it('keeps a contained viewport for long tables', async () => {
    makeOverflowing();
    render(ScrollableTableHarness, { props: { scrollMode: 'contained' } });
    await tick();
    expect(document.querySelector('[data-svadmin-scrollable-table]')?.classList)
      .toContain('svadmin-scrollable-table--contained');
  });
});
