import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ActionPalette from './ActionPalette.svelte';

describe('ActionPalette suite', () => {
  it('renders ActionPalette modal when open', () => {
    const view = render(ActionPalette, {
      open: true,
      selectedRecords: [{ id: 1 }, { id: 2 }],
    });

    expect(view.container.textContent).toContain('批量指派负责人');
    expect(view.container.textContent).toContain('标记加急处理');
  });

  it('executes action callback on selection', async () => {
    const onExecuteAction = vi.fn();
    const view = render(ActionPalette, {
      open: true,
      onExecuteAction,
    });

    const expediteBtn = Array.from(view.container.querySelectorAll('[role="button"]')).find((b) =>
      b.textContent?.includes('标记加急处理'),
    );
    expect(expediteBtn).toBeTruthy();
    if (expediteBtn) {
      await fireEvent.click(expediteBtn);
      expect(onExecuteAction).toHaveBeenCalledWith('expedite', undefined);
    }
  });
});
