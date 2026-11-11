import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import VirtualCardGrid from './VirtualCardGrid.svelte';

describe('VirtualCardGrid suite', () => {
  const items = Array.from({ length: 50 }, (_, i) => ({
    id: `item-${i + 1}`,
    title: `Commodity Card #${i + 1}`,
    subtitle: `Stock: ${100 + i}`,
  }));

  it('renders virtualized cards window and allows selection', async () => {
    const onSelectionChange = vi.fn();
    const view = render(VirtualCardGrid, {
      items,
      columns: 4,
      cardHeight: 180,
      onSelectionChange,
    });

    expect(view.container.textContent).toContain('50 items');
    expect(view.container.textContent).toContain('Commodity Card #1');

    const card = view.container.querySelector('[role="button"]');
    expect(card).toBeTruthy();
    if (card) {
      await fireEvent.click(card);
      expect(onSelectionChange).toHaveBeenCalled();
    }
  });
});
