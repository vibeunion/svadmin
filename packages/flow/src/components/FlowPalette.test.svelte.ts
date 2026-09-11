import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { decodeFlowPaletteItem, FLOW_PALETTE_MIME_TYPE } from '../flow-dnd.js';
import type { FlowPaletteItem } from '../types.js';
import FlowPalette from './FlowPalette.svelte';

const items = [
  {
    id: 'review',
    type: 'default',
    label: 'Review',
    description: 'A manual review step',
    data: { kind: 'review' },
  },
];

describe('FlowPalette', () => {
  it('renders accessible, text-only palette templates', () => {
    render(FlowPalette, { items, label: 'Workflow steps' });

    expect(screen.getByRole('complementary', { name: 'Workflow steps' })).not.toBeNull();
    expect(screen.getByRole('button', { name: /review/i })).not.toBeNull();
  });

  it('serializes a template into its package-specific drag payload', async () => {
    const dataTransfer = new DataTransfer();
    render(FlowPalette, { items });

    const event = new DragEvent('dragstart', { bubbles: true, cancelable: true });
    // Happy DOM currently aliases DragEvent to Event and drops dataTransfer.
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
    await fireEvent(screen.getByRole('button', { name: /review/i }), event);

    expect(dataTransfer.effectAllowed).toBe('copy');
    expect(decodeFlowPaletteItem(dataTransfer.getData(FLOW_PALETTE_MIME_TYPE))).toEqual(items[0]);
  });

  it('keeps click insertion host-controlled', async () => {
    const onitemselect = vi.fn<(item: FlowPaletteItem) => void>();
    render(FlowPalette, { items, onitemselect });

    await fireEvent.click(screen.getByRole('button', { name: /review/i }));

    expect(onitemselect).toHaveBeenCalledWith(items[0]);
  });
});
