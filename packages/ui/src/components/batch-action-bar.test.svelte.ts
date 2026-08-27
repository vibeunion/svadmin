import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import BatchActionBar from './BatchActionBar.svelte';

describe('BatchActionBar component', () => {
  it('does not render when selectedCount is 0', () => {
    const view = render(BatchActionBar, { selectedCount: 0 });
    expect(view.container.querySelector('[role="region"]')).toBeNull();
  });

  it('renders inline batch bar when items are selected', () => {
    const view = render(BatchActionBar, {
      selectedCount: 5,
      totalCount: 20,
    });
    const region = view.container.querySelector('[role="region"]');
    expect(region).not.toBeNull();
    expect(view.container.textContent).toContain('5 of 20 selected');
  });

  it('handles custom selectedLabel template', () => {
    const view = render(BatchActionBar, {
      selectedCount: 8,
      selectedLabel: '已选择 {count} 项数据',
    });
    expect(view.container.textContent).toContain('已选择 8 项数据');
  });

  it('triggers onclear callback when clear button is clicked', async () => {
    const onclear = vi.fn();
    const view = render(BatchActionBar, {
      selectedCount: 3,
      clearLabel: '取消选择',
      onclear,
    });
    const clearBtn = view.container.querySelector('button');
    expect(clearBtn?.textContent).toContain('取消选择');
    if (clearBtn) await fireEvent.click(clearBtn);
    expect(onclear).toHaveBeenCalledOnce();
  });

  it('renders floating variant with distinct styling', () => {
    const view = render(BatchActionBar, {
      selectedCount: 2,
      variant: 'floating',
    });
    const region = view.container.querySelector('[role="region"]');
    expect(region?.className).toContain('fixed');
    expect(region?.className).toContain('bottom-6');
  });
});
