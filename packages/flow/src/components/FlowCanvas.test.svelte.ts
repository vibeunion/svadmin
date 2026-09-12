import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { encodeFlowPaletteItem, FLOW_PALETTE_MIME_TYPE } from '../flow-dnd.js';
import type { FlowCanvasApi, FlowItemDropDetail } from '../types.js';
import FlowCanvas from './FlowCanvas.svelte';

describe('FlowCanvas', () => {
  it('renders the interactive Svelte Flow canvas and exposes a host control surface', async () => {
    const onready = vi.fn<(api: FlowCanvasApi) => void>();
    const { container } = render(FlowCanvas, {
      nodes: [{ id: 'start', type: 'input', position: { x: 24, y: 24 }, data: { label: 'Start' } }],
      edges: [],
      showMiniMap: true,
      onready,
    });

    expect(container.querySelector('[data-testid="svelte-flow__wrapper"]')).not.toBeNull();
    expect(container.querySelector('.svelte-flow__controls')).not.toBeNull();
    expect(container.querySelector('.svelte-flow__minimap')).not.toBeNull();
    await waitFor(() => expect(onready).toHaveBeenCalledTimes(1));
    expect(onready.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      fitView: expect.any(Function),
      screenToFlowPosition: expect.any(Function),
    }));
  });

  it('forwards a palette drop in flow coordinates without creating the host node itself', async () => {
    const onitemdrop = vi.fn<(detail: FlowItemDropDetail) => void>();
    const { container } = render(FlowCanvas, { nodes: [], edges: [], onitemdrop });
    const dataTransfer = new DataTransfer();
    dataTransfer.setData(FLOW_PALETTE_MIME_TYPE,
      encodeFlowPaletteItem({ id: 'review', type: 'default', label: 'Review', data: { kind: 'review' } }));

    const canvas = container.querySelector<HTMLElement>('[data-testid="svelte-flow__wrapper"]');
    if (!canvas) throw new Error('Expected the Svelte Flow canvas');

    await waitFor(() => expect(canvas.querySelector('.svelte-flow__pane')).not.toBeNull());
    await fireEvent.drop(canvas, { clientX: 120, clientY: 80, dataTransfer });

    expect(onitemdrop).toHaveBeenCalledWith(expect.objectContaining({
      template: { id: 'review', type: 'default', label: 'Review', data: { kind: 'review' } },
      position: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    }));
  });

  it('completes view fitting without a native Promise.withResolvers implementation', async () => {
    let api: FlowCanvasApi | undefined;
    render(FlowCanvas, {
      nodes: [{
        id: 'start',
        position: { x: 24, y: 24 },
        data: { label: 'Start' },
        measured: { width: 120, height: 40 },
      }],
      edges: [],
      fitView: false,
      onready: value => { api = value; },
    });
    await waitFor(() => expect(api).toBeDefined());
    if (!api) throw new Error('Expected the canvas API');

    const descriptor = Object.getOwnPropertyDescriptor(Promise, 'withResolvers');
    Object.defineProperty(Promise, 'withResolvers', { configurable: true, value: undefined });
    try {
      await expect(api.fitView()).resolves.toBe(true);
    } finally {
      if (descriptor) Object.defineProperty(Promise, 'withResolvers', descriptor);
      else Reflect.deleteProperty(Promise, 'withResolvers');
    }
  });

  it('settles empty-canvas fitting and uses current nodes after they are added', async () => {
    const onready = vi.fn<(api: FlowCanvasApi) => void>();
    const { rerender } = render(FlowCanvas, { nodes: [], edges: [], fitView: false, onready });
    await waitFor(() => expect(onready).toHaveBeenCalledTimes(1));
    const api = onready.mock.calls[0]?.[0];
    if (!api) throw new Error('Expected the canvas API');
    await expect(api.fitView()).resolves.toBe(false);

    await rerender({
      nodes: [{
        id: 'start',
        position: { x: 24, y: 24 },
        data: { label: 'Start' },
        measured: { width: 120, height: 40 },
      }],
    });
    await expect(api.fitView()).resolves.toBe(true);
  });
});
