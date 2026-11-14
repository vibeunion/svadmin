import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ResizableSplitter from './ResizableSplitter.svelte';

describe('ResizableSplitter Component', () => {
  it('renders root splitter and gutter', () => {
    const { container } = render(ResizableSplitter, {
      props: {
        direction: 'horizontal',
        initialSizes: [40, 60],
      },
    });

    const root = container.querySelector('[data-svadmin-component="ResizableSplitter"]');
    expect(root).toBeTruthy();

    const gutter = container.querySelector('[role="separator"]');
    expect(gutter).toBeTruthy();
    expect(gutter?.getAttribute('aria-orientation')).toBe('vertical');
    expect(gutter?.getAttribute('aria-valuenow')).toBe('40');
  });

  it('renders vertical orientation correctly', () => {
    const { container } = render(ResizableSplitter, {
      props: {
        direction: 'vertical',
        initialSizes: [30, 70],
      },
    });

    const gutter = container.querySelector('[role="separator"]');
    expect(gutter?.getAttribute('aria-orientation')).toBe('horizontal');
    expect(gutter?.getAttribute('aria-valuenow')).toBe('30');
  });

  it('double click centers the allocation', async () => {
    const onResize = vi.fn();
    const { container } = render(ResizableSplitter, {
      props: {
        initialSizes: [30, 70],
        onResize,
      },
    });

    const gutter = container.querySelector('[role="separator"]');
    expect(gutter).toBeTruthy();

    if (gutter) {
      await fireEvent.dblClick(gutter);
    }
    expect(onResize).toHaveBeenCalledWith([50, 50]);
  });

  it('supports keyboard adjustment via arrow keys', async () => {
    const onResize = vi.fn();
    const { container } = render(ResizableSplitter, {
      props: {
        initialSizes: [50, 50],
        onResize,
      },
    });

    const gutter = container.querySelector('[role="separator"]') as HTMLElement;
    expect(gutter).toBeTruthy();

    await fireEvent.keyDown(gutter, { key: 'ArrowLeft' });
    expect(onResize).toHaveBeenCalledWith([48, 52]);

    await fireEvent.keyDown(gutter, { key: 'ArrowRight' });
    expect(onResize).toHaveBeenCalledWith([50, 50]);
  });

  it('supports one-click collapse and restore', async () => {
    const onCollapse = vi.fn();
    const { container } = render(ResizableSplitter, {
      props: {
        collapsible: true,
        onCollapse,
      },
    });

    const collapseFirstBtn = container.querySelector('button[title="折叠左/上方"]');
    expect(collapseFirstBtn).toBeTruthy();

    if (collapseFirstBtn) {
      await fireEvent.click(collapseFirstBtn);
    }
    expect(onCollapse).toHaveBeenCalledWith('first');

    const restoreBtn = container.querySelector('button');
    expect(restoreBtn?.textContent).toContain('恢复面板');

    if (restoreBtn) {
      await fireEvent.click(restoreBtn);
    }
    expect(onCollapse).toHaveBeenCalledWith(null);
  });
  it('clamps both panes together for asymmetric keyboard limits', async () => {
    const onResize = vi.fn();
    const { getByRole } = render(ResizableSplitter, { props: { initialSizes: [60, 40], minSizes: [20, 40], maxSizes: [80, 70], onResize } });
    const separator = getByRole('separator');
    await fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(onResize).toHaveBeenLastCalledWith([60, 40]);
    await fireEvent.keyDown(separator, { key: 'Home' });
    expect(onResize).toHaveBeenLastCalledWith([30, 70]);
    await fireEvent.keyDown(separator, { key: 'End' });
    expect(onResize).toHaveBeenLastCalledWith([60, 40]);
  });
  it('restores the last allocation after collapse and ignores unrelated axis keys', async () => {
    const onResize = vi.fn();
    const { getByRole, getByTitle } = render(ResizableSplitter, { props: { initialSizes: [30, 70], onResize } });
    await fireEvent.keyDown(getByRole('separator'), { key: 'ArrowDown' });
    expect(onResize).not.toHaveBeenCalled();
    await fireEvent.click(getByTitle('折叠左/上方'));
    await fireEvent.click(getByRole('button', { name: /恢复面板/ }));
    expect(getByRole('separator').getAttribute('aria-valuenow')).toBe('30');
  });
  it('rejects malformed persisted values and clamps old valid values', async () => {
    localStorage.setItem('svadmin_splitter_malformed', '[null,"70"]');
    localStorage.setItem('svadmin_splitter_valid', '[95,5]');
    const { getByRole, rerender } = render(ResizableSplitter, { props: { storageKey: 'malformed', initialSizes: [30, 70] } });
    expect(getByRole('separator').getAttribute('aria-valuenow')).toBe('30');
    await rerender({ storageKey: 'valid' });
    expect(getByRole('separator').getAttribute('aria-valuenow')).toBe('85');
    localStorage.removeItem('svadmin_splitter_malformed'); localStorage.removeItem('svadmin_splitter_valid');
  });
  it('cleans up active pointer listeners when unmounted', async () => {
    const onResize = vi.fn();
    const { container, getByRole, unmount } = render(ResizableSplitter, { props: { onResize } });
    const root = container.querySelector<HTMLElement>('[data-svadmin-component="ResizableSplitter"]');
    if (!root) throw new Error('missing splitter');
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1000, 500));
    await fireEvent.pointerDown(getByRole('separator'), { button: 0, clientX: 500, pointerId: 1 });
    await fireEvent.pointerMove(window, { clientX: 700, pointerId: 1 });
    expect(onResize).toHaveBeenLastCalledWith([70, 30]);
    unmount(); onResize.mockClear();
    await fireEvent.pointerMove(window, { clientX: 800, pointerId: 1 });
    expect(onResize).not.toHaveBeenCalled();
  });

  it('keeps recentering inside asymmetric limits', async () => {
    const onResize = vi.fn();
    const { getByRole } = render(ResizableSplitter, { props: { initialSizes: [80, 20], minSizes: [70, 10], maxSizes: [90, 30], onResize } });
    await fireEvent.dblClick(getByRole('separator'));
    expect(onResize).toHaveBeenLastCalledWith([70, 30]);
  });

  it('allows an already collapsed pane to recover after collapse is disabled', async () => {
    const { getByTitle, getByRole, rerender } = render(ResizableSplitter);
    await fireEvent.click(getByTitle('折叠左/上方'));
    await rerender({ collapsible: false });
    await fireEvent.click(getByRole('button', { name: /恢复面板/ }));
    expect(getByRole('separator')).toBeTruthy();
  });
  it('cancels an old drag when layout configuration changes', async () => {
    const onResize = vi.fn();
    const { container, getByRole, rerender } = render(ResizableSplitter, { props: { storageKey: 'old-layout', onResize } });
    const root = container.querySelector<HTMLElement>('[data-svadmin-component="ResizableSplitter"]');
    if (!root) throw new Error('missing splitter');
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1000, 500));
    await fireEvent.pointerDown(getByRole('separator'), { button: 0, clientX: 500, pointerId: 1 });
    await rerender({ storageKey: 'new-layout', direction: 'vertical' });
    await fireEvent.pointerMove(window, { clientX: 700, pointerId: 1 });
    expect(onResize).not.toHaveBeenCalled();
    expect(localStorage.getItem('svadmin_splitter_new-layout')).toBeNull();
  });

});
