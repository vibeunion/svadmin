import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { decodeFlowPaletteItem, FLOW_PALETTE_MIME_TYPE } from '../flow-dnd.js';
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
    const dataTransfer = { effectAllowed: 'none', setData: vi.fn() } as unknown as DataTransfer;
    render(FlowPalette, { items });

    await fireEvent.dragStart(screen.getByRole('button', { name: /review/i }), { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith(FLOW_PALETTE_MIME_TYPE, expect.any(String));
    expect(decodeFlowPaletteItem(vi.mocked(dataTransfer.setData).mock.calls[0]?.[1] ?? '')).toEqual(items[0]);
  });

  it('keeps click insertion host-controlled', async () => {
    const onitemselect = vi.fn();
    render(FlowPalette, { items, onitemselect });

    await fireEvent.click(screen.getByRole('button', { name: /review/i }));

    expect(onitemselect).toHaveBeenCalledWith(items[0]);
  });
});
