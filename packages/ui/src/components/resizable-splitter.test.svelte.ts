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
    expect(gutter?.getAttribute('aria-orientation')).toBe('horizontal');
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
    expect(gutter?.getAttribute('aria-orientation')).toBe('vertical');
    expect(gutter?.getAttribute('aria-valuenow')).toBe('30');
  });

  it('handles double click to reset sizes to 50/50', async () => {
    const onResize = vi.fn();
    const { container } = render(ResizableSplitter, {
      props: {
        initialSizes: [30, 70],
        onResize,
      },
    });

    const gutter = container.querySelector('[role="separator"]');
    expect(gutter).toBeTruthy();

    await fireEvent.dblClick(gutter!);
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

    await fireEvent.click(collapseFirstBtn!);
    expect(onCollapse).toHaveBeenCalledWith('first');

    const restoreBtn = container.querySelector('button');
    expect(restoreBtn?.textContent).toContain('恢复面板');

    await fireEvent.click(restoreBtn!);
    expect(onCollapse).toHaveBeenCalledWith(null);
  });
});
