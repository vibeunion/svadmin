import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import ScrollableTableHarness from './scrollable-table.test-host.svelte';
import { renderWithI18n } from '../../test/fixtures/render-with-i18n';

const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');

function makeOverflowing(): void {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 1200 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 300 });
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalScrollWidth) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', originalScrollWidth);
  else delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
  if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
  else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

describe('ScrollableTable', () => {
  it('renders a mirrored horizontal scrollbar when the table overflows', async () => {
    makeOverflowing();
    renderWithI18n(ScrollableTableHarness, {}, 'zh-CN');
    await tick();
    expect(screen.getByRole('scrollbar', { name: '列表横向滚动' })).not.toBeNull();
    expect(screen.getByText('FA-001')).not.toBeNull();
  });

  it('supports a top scrollbar and keyboard scrolling', async () => {
    makeOverflowing();
    renderWithI18n(ScrollableTableHarness, { props: { scrollbarPlacement: 'top' } }, 'zh-CN');
    await tick();
    const scrollbar = screen.getByRole('scrollbar', { name: '列表上方横向滚动' });
    await fireEvent.keyDown(scrollbar, { key: 'End' });
    expect(scrollbar.getAttribute('aria-valuenow')).toBe('900');
  });

  it('rebinds size observation when asynchronous content replaces the table', async () => {
    makeOverflowing();
    const observe = vi.spyOn(ResizeObserver.prototype, 'observe');
    const unobserve = vi.spyOn(ResizeObserver.prototype, 'unobserve');
    const { container } = renderWithI18n(ScrollableTableHarness, {}, 'zh-CN');
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
    const { container } = renderWithI18n(ScrollableTableHarness, {}, 'zh-CN');
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

  it('translates the scrollbar label in an English scope', async () => {
    makeOverflowing();
    renderWithI18n(ScrollableTableHarness, {}, 'en');
    await tick();
    expect(screen.getByRole('scrollbar', { name: 'Scroll table horizontally' })).not.toBeNull();
  });

  it('keeps a contained viewport for long tables', async () => {
    makeOverflowing();
    renderWithI18n(ScrollableTableHarness, { props: { scrollMode: 'contained' } }, 'zh-CN');
    await tick();
    expect(document.querySelector('[data-svadmin-scrollable-table]')?.classList)
      .toContain('svadmin-scrollable-table--contained');
  });
});
