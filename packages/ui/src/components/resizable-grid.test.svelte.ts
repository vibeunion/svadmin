import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import ResizableGridHost from './ResizableGrid.test-host.svelte';

afterEach(() => cleanup());

function cellText(container: HTMLElement, id: string): string {
  return container.querySelector(`[data-testid="cell-${id}"]`)?.textContent ?? '';
}

describe('ResizableGrid', () => {
  it('renders grid items in absolute grid positions', () => {
    const view = render(ResizableGridHost);
    const grid = view.getByRole('group', { name: 'Dashboard grid' });
    expect(grid.querySelectorAll('.svadmin-resizable-grid__item')).toHaveLength(2);
    expect(cellText(view.container, 'a')).toBe('0,0,4,2');
  });

  it('moves an item on drag from the move handle and reports the change', async () => {
    const view = render(ResizableGridHost);
    const handle = view.getByRole('button', { name: 'Move a' });

    await fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
    await fireEvent.pointerMove(window, { pointerId: 1, clientX: 160, clientY: 92 });
    await fireEvent.pointerUp(window, { pointerId: 1 });

    expect(cellText(view.container, 'a')).toBe('2,1,4,2');
    expect(view.getByRole('status', { name: 'changes' }).textContent).toBe('1');
  });

  it('resizes an item with the keyboard resize handle', async () => {
    const view = render(ResizableGridHost);
    const handle = view.getByRole('button', { name: 'Resize a' });

    await fireEvent.keyDown(handle, { key: 'ArrowRight' });
    await fireEvent.keyDown(handle, { key: 'ArrowDown' });

    expect(cellText(view.container, 'a')).toBe('0,0,5,3');
  });

  it('moves an item with the keyboard move handle', async () => {
    const view = render(ResizableGridHost);
    const handle = view.getByRole('button', { name: 'Move b' });

    await fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(cellText(view.container, 'b')).toBe('5,0,4,2');

    await fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(cellText(view.container, 'b')).toBe('4,0,4,2');
  });
});